import { v } from "convex/values";
import { action, internalAction } from "./_generated/server";
import { internal, api } from "./_generated/api";
import { Id, Doc } from "./_generated/dataModel";

// ===================
// Rate Limiting & Locks
// ===================

// In-memory locks to prevent concurrent fetches per tenant
// Map of tenantId -> { inProgress: boolean, lastFetchTime: number }
const pulsepointLocks = new Map<string, { inProgress: boolean; lastFetchTime: number }>();
const weatherLocks = new Map<string, { inProgress: boolean; lastFetchTime: number }>();

// Minimum time between fetches (15 seconds)
const MIN_FETCH_INTERVAL_MS = 15_000;

/**
 * Check if we can fetch for a tenant (not locked and not rate limited)
 */
function canFetch(locks: Map<string, { inProgress: boolean; lastFetchTime: number }>, tenantId: string): { allowed: boolean; reason?: string } {
  const lock = locks.get(tenantId);

  if (lock?.inProgress) {
    return { allowed: false, reason: "concurrent_fetch_in_progress" };
  }

  if (lock?.lastFetchTime) {
    const timeSinceLastFetch = Date.now() - lock.lastFetchTime;
    if (timeSinceLastFetch < MIN_FETCH_INTERVAL_MS) {
      return { allowed: false, reason: `rate_limited (${timeSinceLastFetch}ms since last)` };
    }
  }

  return { allowed: true };
}

/**
 * Acquire lock for fetching
 */
function acquireLock(locks: Map<string, { inProgress: boolean; lastFetchTime: number }>, tenantId: string): void {
  locks.set(tenantId, { inProgress: true, lastFetchTime: Date.now() });
}

/**
 * Release lock after fetching
 */
function releaseLock(locks: Map<string, { inProgress: boolean; lastFetchTime: number }>, tenantId: string): void {
  const lock = locks.get(tenantId);
  if (lock) {
    lock.inProgress = false;
  }
}

// ===================
// PulsePoint Types
// ===================

interface PulsePointIncident {
  ID: string;
  Call: string;
  CallType?: string;
  FullAddress: string;
  Latitude?: string;
  Longitude?: string;
  Unit?: string[];
  UnitStatus?: Array<{
    Unit: string;
    Status: string;
    Timestamp: string;
  }>;
  CallReceivedTime: string;
  ClosedTime?: string;
  Status?: string;
}

interface PulsePointResponse {
  incidents?: {
    active?: PulsePointIncident[];
    recent?: PulsePointIncident[];
  };
}

// ===================
// NWS Types
// ===================

interface NWSAlert {
  id: string;
  properties: {
    id: string;
    event: string;
    headline: string;
    description?: string;
    instruction?: string;
    severity: string;
    urgency: string;
    certainty: string;
    category?: string;
    onset?: string;
    expires: string;
    ends?: string;
    affectedZones?: string[];
  };
}

interface NWSResponse {
  features?: NWSAlert[];
}

// ===================
// Call Type Mapping
// ===================

function mapCallTypeToCategory(
  callType: string
): "fire" | "medical" | "rescue" | "traffic" | "hazmat" | "other" {
  const lower = callType.toLowerCase();

  if (lower.includes("fire") || lower.includes("smoke") || lower.includes("alarm")) {
    return "fire";
  }
  if (lower.includes("medical") || lower.includes("ems") || lower.includes("cardiac") || lower.includes("breathing")) {
    return "medical";
  }
  if (lower.includes("rescue") || lower.includes("water") || lower.includes("rope")) {
    return "rescue";
  }
  if (lower.includes("traffic") || lower.includes("accident") || lower.includes("mvc") || lower.includes("vehicle")) {
    return "traffic";
  }
  if (lower.includes("hazmat") || lower.includes("chemical") || lower.includes("gas leak")) {
    return "hazmat";
  }

  return "other";
}

function mapNWSSeverity(
  severity: string
): "Extreme" | "Severe" | "Moderate" | "Minor" | "Unknown" {
  switch (severity) {
    case "Extreme":
      return "Extreme";
    case "Severe":
      return "Severe";
    case "Moderate":
      return "Moderate";
    case "Minor":
      return "Minor";
    default:
      return "Unknown";
  }
}

function mapNWSUrgency(
  urgency: string
): "Immediate" | "Expected" | "Future" | "Unknown" {
  switch (urgency) {
    case "Immediate":
      return "Immediate";
    case "Expected":
      return "Expected";
    case "Future":
      return "Future";
    default:
      return "Unknown";
  }
}

function mapNWSCertainty(
  certainty: string
): "Observed" | "Likely" | "Possible" | "Unlikely" | "Unknown" {
  switch (certainty) {
    case "Observed":
      return "Observed";
    case "Likely":
      return "Likely";
    case "Possible":
      return "Possible";
    case "Unlikely":
      return "Unlikely";
    default:
      return "Unknown";
  }
}

// ===================
// PulsePoint Sync Action
// ===================

/**
 * Fetch incidents from PulsePoint API and sync to database
 * Actions can make external HTTP calls
 */
export const syncPulsePointForTenant = internalAction({
  args: {
    tenantId: v.id("tenants"),
    agencyIds: v.array(v.string()),
  },
  returns: v.object({
    success: v.boolean(),
    fetched: v.number(),
    created: v.number(),
    updated: v.number(),
  }),
  handler: async (ctx, { tenantId, agencyIds }): Promise<{
    success: boolean;
    fetched: number;
    created: number;
    updated: number;
  }> => {
    // Check if we can fetch (not locked or rate limited)
    const canFetchResult = canFetch(pulsepointLocks, tenantId);
    if (!canFetchResult.allowed) {
      console.log(`[PulsePoint] Skipping fetch for tenant ${tenantId}: ${canFetchResult.reason}`);
      return { success: true, fetched: 0, created: 0, updated: 0 };
    }

    // Acquire lock
    acquireLock(pulsepointLocks, tenantId);
    console.log(`[PulsePoint] Starting fetch for tenant ${tenantId}`);

    try {
      const allIncidents: Array<{
        externalId: string;
        callType: string;
        callTypeCategory: "fire" | "medical" | "rescue" | "traffic" | "hazmat" | "other";
        fullAddress: string;
        latitude?: number;
        longitude?: number;
        units?: string[];
        unitStatuses?: Record<string, { unit: string; status: string; timestamp: number }>;
        status: "active" | "closed";
        callReceivedTime: number;
        callClosedTime?: number;
      }> = [];

      // Fetch from all agencies in parallel
    const fetchPromises = agencyIds.map(async (agencyId) => {
      try {
        // Note: Replace with actual PulsePoint API endpoint
        // This is a placeholder - you'll need to add your PulsePoint credentials
        const response = await fetch(
          `https://api.pulsepoint.org/v1/agencies/${agencyId}/incidents`,
          {
            headers: {
              // Add your PulsePoint API key here
              // "Authorization": `Bearer ${process.env.PULSEPOINT_API_KEY}`,
              "Content-Type": "application/json",
            },
          }
        );

        if (!response.ok) {
          console.error(`PulsePoint API error for agency ${agencyId}: ${response.status}`);
          return [];
        }

        const data: PulsePointResponse = await response.json();
        const incidents: PulsePointIncident[] = [
          ...(data.incidents?.active || []),
          ...(data.incidents?.recent || []),
        ];

        return incidents;
      } catch (error) {
        console.error(`Error fetching from PulsePoint agency ${agencyId}:`, error);
        return [];
      }
    });

    const results = await Promise.all(fetchPromises);
    const rawIncidents = results.flat();

    // Transform PulsePoint incidents to our format
    for (const incident of rawIncidents) {
      const callType = incident.Call || incident.CallType || "Unknown";
      const isActive = !incident.ClosedTime && incident.Status !== "closed";

      const transformed = {
        externalId: incident.ID,
        callType,
        callTypeCategory: mapCallTypeToCategory(callType),
        fullAddress: incident.FullAddress,
        latitude: incident.Latitude ? parseFloat(incident.Latitude) : undefined,
        longitude: incident.Longitude ? parseFloat(incident.Longitude) : undefined,
        units: incident.Unit,
        unitStatuses: incident.UnitStatus?.reduce(
          (acc, us) => ({
            ...acc,
            [us.Unit]: {
              unit: us.Unit,
              status: us.Status,
              timestamp: new Date(us.Timestamp).getTime(),
            },
          }),
          {} as Record<string, { unit: string; status: string; timestamp: number }>
        ),
        status: isActive ? ("active" as const) : ("closed" as const),
        callReceivedTime: new Date(incident.CallReceivedTime).getTime(),
        callClosedTime: incident.ClosedTime
          ? new Date(incident.ClosedTime).getTime()
          : undefined,
      };

      allIncidents.push(transformed);
    }

      // Batch upsert to database
      if (allIncidents.length > 0) {
        const result = await ctx.runMutation(internal.incidents.batchUpsertFromPulsePoint, {
          tenantId,
          incidents: allIncidents,
        });

        // Update sync timestamp
        await ctx.runMutation(internal.tenants.updateSyncTimestamp, {
          tenantId,
          type: "incident",
        });

        console.log(`[PulsePoint] Sync complete for tenant ${tenantId}: ${result.created} created, ${result.updated} updated`);
        return {
          success: true,
          fetched: allIncidents.length,
          created: result.created,
          updated: result.updated,
        };
      }

      return { success: true, fetched: 0, created: 0, updated: 0 };
    } catch (error) {
      console.error(`[PulsePoint] Error syncing for tenant ${tenantId}:`, error);
      throw error;
    } finally {
      // Always release the lock
      releaseLock(pulsepointLocks, tenantId);
      console.log(`[PulsePoint] Lock released for tenant ${tenantId}`);
    }
  },
});

/**
 * Sync incidents for all active tenants
 */
export const syncAllTenantIncidents = internalAction({
  args: {},
  handler: async (ctx) => {
    // Get all active tenants with PulsePoint enabled
    const tenants = await ctx.runQuery(api.tenants.listActive, {});

    const results: Array<{
      tenantId: Id<"tenants">;
      success: boolean;
      fetched?: number;
      error?: string;
    }> = [];

    // Process tenants in parallel (with concurrency limit)
    const CONCURRENCY = 5;
    for (let i = 0; i < tenants.length; i += CONCURRENCY) {
      const batch = tenants.slice(i, i + CONCURRENCY);

      const batchResults = await Promise.all(
        batch.map(async (tenant: Doc<"tenants">) => {
          if (!tenant.pulsepointConfig?.enabled || !tenant.pulsepointConfig?.agencyIds?.length) {
            return { tenantId: tenant._id, success: true, fetched: 0, created: 0, updated: 0 };
          }

          try {
            const result = await ctx.runAction(internal.sync.syncPulsePointForTenant, {
              tenantId: tenant._id,
              agencyIds: tenant.pulsepointConfig.agencyIds,
            });
            return { tenantId: tenant._id, ...result };
          } catch (error) {
            return {
              tenantId: tenant._id,
              success: false,
              fetched: 0,
              created: 0,
              updated: 0,
              error: error instanceof Error ? error.message : "Unknown error",
            };
          }
        })
      );

      results.push(...batchResults);
    }

    return results;
  },
});

// ===================
// Weather Sync Action
// ===================

/**
 * Fetch weather alerts from NWS API and sync to database
 */
type WeatherSyncResult =
  | { success: true; fetched: number; created: number; updated: number }
  | { success: false; error: string; fetched?: number; created?: number; updated?: number };

export const syncWeatherForTenant = internalAction({
  args: {
    tenantId: v.id("tenants"),
    zones: v.array(v.string()),
  },
  handler: async (ctx, { tenantId, zones }): Promise<WeatherSyncResult> => {
    // Check if we can fetch (not locked or rate limited)
    const canFetchResult = canFetch(weatherLocks, tenantId);
    if (!canFetchResult.allowed) {
      console.log(`[Weather] Skipping fetch for tenant ${tenantId}: ${canFetchResult.reason}`);
      return { success: true, fetched: 0, created: 0, updated: 0 };
    }

    // Acquire lock
    acquireLock(weatherLocks, tenantId);
    console.log(`[Weather] Starting fetch for tenant ${tenantId}`);

    const allAlerts: Array<{
      nwsId: string;
      event: string;
      headline: string;
      description?: string;
      instruction?: string;
      severity: "Extreme" | "Severe" | "Moderate" | "Minor" | "Unknown";
      urgency?: "Immediate" | "Expected" | "Future" | "Unknown";
      certainty?: "Observed" | "Likely" | "Possible" | "Unlikely" | "Unknown";
      category?: string;
      onset?: number;
      expires: number;
      ends?: number;
      affectedZones?: string[];
    }> = [];

    try {
      // NWS API allows fetching alerts for multiple zones
      const zoneParam = zones.join(",");
      const response = await fetch(
        `https://api.weather.gov/alerts/active?zone=${zoneParam}`,
        {
          headers: {
            "User-Agent": "Vanguard Emergency Platform (contact@example.com)",
            Accept: "application/geo+json",
          },
        }
      );

      if (!response.ok) {
        console.error(`NWS API error: ${response.status}`);
        return { success: false, error: `NWS API returned ${response.status}` };
      }

      const data: NWSResponse = await response.json();
      const alerts = data.features || [];

      // Transform NWS alerts to our format
      for (const alert of alerts) {
        const props = alert.properties;

        allAlerts.push({
          nwsId: props.id,
          event: props.event,
          headline: props.headline,
          description: props.description,
          instruction: props.instruction,
          severity: mapNWSSeverity(props.severity),
          urgency: mapNWSUrgency(props.urgency),
          certainty: mapNWSCertainty(props.certainty),
          category: props.category,
          onset: props.onset ? new Date(props.onset).getTime() : undefined,
          expires: new Date(props.expires).getTime(),
          ends: props.ends ? new Date(props.ends).getTime() : undefined,
          affectedZones: props.affectedZones,
        });
      }

      // Batch upsert to database
      if (allAlerts.length > 0) {
        const result = await ctx.runMutation(internal.weather.batchUpsertFromNWS, {
          tenantId,
          alerts: allAlerts,
        });

        // Expire old alerts
        await ctx.runMutation(internal.weather.expireOldAlerts, { tenantId });

        // Update sync timestamp
        await ctx.runMutation(internal.tenants.updateSyncTimestamp, {
          tenantId,
          type: "weather",
        });

        return {
          success: true,
          fetched: allAlerts.length,
          created: result.created,
          updated: result.updated,
        };
      }

      return { success: true, fetched: 0, created: 0, updated: 0 };
    } catch (error) {
      console.error(`[Weather] Error fetching for tenant ${tenantId}:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    } finally {
      // Always release the lock
      releaseLock(weatherLocks, tenantId);
      console.log(`[Weather] Lock released for tenant ${tenantId}`);
    }
  },
});

/**
 * Sync weather for all active tenants
 */
export const syncAllTenantWeather = internalAction({
  args: {},
  handler: async (ctx) => {
    const tenants = await ctx.runQuery(api.tenants.listActive, {});

    const results: Array<{
      tenantId: Id<"tenants">;
      success: boolean;
      fetched?: number;
      error?: string;
    }> = [];

    // Process tenants in parallel
    const CONCURRENCY = 5;
    for (let i = 0; i < tenants.length; i += CONCURRENCY) {
      const batch = tenants.slice(i, i + CONCURRENCY);

      const batchResults = await Promise.all(
        batch.map(async (tenant: Doc<"tenants">) => {
          if (!tenant.features?.weatherAlerts || !tenant.weatherZones?.length) {
            return { tenantId: tenant._id, success: true, fetched: 0 };
          }

          try {
            const result = await ctx.runAction(internal.sync.syncWeatherForTenant, {
              tenantId: tenant._id,
              zones: tenant.weatherZones,
            });
            return { tenantId: tenant._id, ...result };
          } catch (error) {
            return {
              tenantId: tenant._id,
              success: false,
              error: error instanceof Error ? error.message : "Unknown error",
            };
          }
        })
      );

      results.push(...batchResults);
    }

    return results;
  },
});

// ===================
// Manual Sync Triggers (for UI buttons)
// ===================

/**
 * Manually trigger incident sync for a tenant
 */
type SyncResult = {
  success: boolean;
  fetched?: number;
  created?: number;
  updated?: number;
  error?: string;
};

export const triggerIncidentSync = action({
  args: { tenantId: v.id("tenants") },
  handler: async (ctx, { tenantId }): Promise<SyncResult> => {
    const tenant = await ctx.runQuery(api.tenants.get, { id: tenantId });

    if (!tenant) {
      throw new Error("Tenant not found");
    }

    if (!tenant.pulsepointConfig?.enabled || !tenant.pulsepointConfig?.agencyIds?.length) {
      return { success: false, error: "PulsePoint not configured" };
    }

    return await ctx.runAction(internal.sync.syncPulsePointForTenant, {
      tenantId,
      agencyIds: tenant.pulsepointConfig.agencyIds,
    });
  },
});

/**
 * Manually trigger weather sync for a tenant
 */
export const triggerWeatherSync = action({
  args: { tenantId: v.id("tenants") },
  handler: async (ctx, { tenantId }): Promise<SyncResult> => {
    const tenant = await ctx.runQuery(api.tenants.get, { id: tenantId });

    if (!tenant) {
      throw new Error("Tenant not found");
    }

    if (!tenant.weatherZones?.length) {
      return { success: false, error: "Weather zones not configured" };
    }

    return await ctx.runAction(internal.sync.syncWeatherForTenant, {
      tenantId,
      zones: tenant.weatherZones,
    });
  },
});
