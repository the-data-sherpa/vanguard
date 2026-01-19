"use node";

import { v } from "convex/values";
import { action, internalAction } from "./_generated/server";
import { internal, api } from "./_generated/api";
import { Id, Doc } from "./_generated/dataModel";
import { createHash, createDecipheriv } from "crypto";
import {
  normalizeAddress,
  filterAndLimitIncidents,
  transformUnitStatuses,
  mapCallTypeToCategory,
  UnitStatus,
} from "./syncHelpers";

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
// PulsePoint Decryption
// ===================

const PULSEPOINT_HASH_PASSWORD = "tombrady5rings";

interface PulsePointEncryptedResponse {
  ct: string; // Cipher text (base64)
  iv: string; // Initialization vector (hex)
  s: string;  // Salt (hex)
}

/**
 * Decrypt PulsePoint API response
 */
function decryptPulsePointData(data: PulsePointEncryptedResponse): any {
  const cipherText = Buffer.from(data.ct, "base64");
  const initVector = Buffer.from(data.iv, "hex");
  const salt = Buffer.from(data.s, "hex");

  let hash = createHash("md5");
  let intermediateHash: Buffer | null = null;
  let key = Buffer.alloc(0);

  while (key.length < 32) {
    if (intermediateHash) hash.update(intermediateHash);
    hash.update(PULSEPOINT_HASH_PASSWORD);
    hash.update(salt);
    intermediateHash = hash.digest();
    hash = createHash("md5");
    key = Buffer.concat([key, intermediateHash]);
  }

  const decipher = createDecipheriv("aes-256-cbc", key, initVector);
  let output = decipher.update(cipherText);
  output = Buffer.concat([output, decipher.final()]);
  let result = output.toString().slice(1, -1);
  result = result.replace(/\\"/g, '"').replace(/\n/g, "");

  return JSON.parse(result);
}

// ===================
// PulsePoint Types
// ===================

interface PulsePointUnit {
  UnitID: string;
  PulsePointDispatchStatus: string;
  TimeDispatched?: string;
  TimeAcknowledged?: string;
  TimeEnroute?: string;
  TimeOnScene?: string;
  TimeCleared?: string;
  UnitClearedDateTime?: string; // Alternate field name for cleared time
}

// API endpoints for PulsePoint
const PULSEPOINT_PRIMARY_URL = "https://api.pulsepoint.org/v1/webapp";
const PULSEPOINT_FALLBACK_URL = "https://web.pulsepoint.org/DB/giba.php";
const FETCH_TIMEOUT_MS = 10_000; // 10 second timeout

/**
 * Fetch with timeout
 */
async function fetchWithTimeout(
  url: string,
  options: RequestInit,
  timeoutMs: number
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    return response;
  } finally {
    clearTimeout(timeoutId);
  }
}

// PulsePoint incident format varies by agency, so we use a flexible type
// eslint-disable-next-line @typescript-eslint/no-explicit-any
interface PulsePointIncident {
  // Standard fields (some agencies use these)
  PulsePointIncidentID?: string;
  PulsePointIncidentCallType?: string;
  FullDisplayAddress?: string;
  CrossStreet1?: string;
  CrossStreet2?: string;
  Latitude?: number | string;
  Longitude?: number | string;
  TimeCallOpened?: string;
  TimeCallClosed?: string;
  Unit?: PulsePointUnit[];
  AgencyID?: string;
  CallNumber?: string;
  Priority?: string;
  Description?: string;
  // Alternative field names used by some agencies
  ID?: string;
  id?: string;
  IncidentID?: string;
  CallType?: string;
  CallTypeDescription?: string;
  Address?: string;
  DisplayAddress?: string;
  CallTime?: string;
  CallReceivedDateTime?: string;
  IncidentTime?: string;
  CloseTime?: string;
  ClosedDateTime?: string;
  // Allow additional fields
  [key: string]: unknown;
}

interface PulsePointDecryptedResponse {
  incidents?: {
    active?: PulsePointIncident[];
    recent?: PulsePointIncident[];
    closed?: PulsePointIncident[];
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
    skipped: v.number(),
  }),
  handler: async (ctx, { tenantId, agencyIds }): Promise<{
    success: boolean;
    fetched: number;
    created: number;
    updated: number;
    skipped: number;
  }> => {
    // Check if we can fetch (not locked or rate limited)
    const canFetchResult = canFetch(pulsepointLocks, tenantId);
    if (!canFetchResult.allowed) {
      console.log(`[PulsePoint] Skipping fetch for tenant ${tenantId}: ${canFetchResult.reason}`);
      return { success: true, fetched: 0, created: 0, updated: 0, skipped: 0 };
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
        normalizedAddress: string;
        latitude?: number;
        longitude?: number;
        units?: string[];
        unitStatuses?: UnitStatus[];
        status: "active" | "closed";
        callReceivedTime: number;
        callClosedTime?: number;
      }> = [];

      // Fetch from all agencies in parallel using PulsePoint API with fallback
      const fetchPromises = agencyIds.map(async (agencyId) => {
        const headers = {
          "Accept": "application/json, text/plain, */*",
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
          "Referer": "https://web.pulsepoint.org/",
          "Cache-Control": "no-cache",
          "Pragma": "no-cache",
        };

        // Try primary endpoint first, then fallback
        let response: Response | null = null;
        let usedEndpoint = "primary";

        try {
          // Try primary endpoint with timeout
          const primaryUrl = new URL(PULSEPOINT_PRIMARY_URL);
          primaryUrl.searchParams.set("resource", "incidents");
          primaryUrl.searchParams.set("agencyid", agencyId);

          response = await fetchWithTimeout(primaryUrl.toString(), { headers }, FETCH_TIMEOUT_MS);

          if (!response.ok) {
            throw new Error(`Primary endpoint returned ${response.status}`);
          }
        } catch (primaryError) {
          // Primary failed, try fallback
          console.log(`[PulsePoint] Primary endpoint failed for agency ${agencyId}, trying fallback: ${primaryError instanceof Error ? primaryError.message : "Unknown error"}`);

          try {
            const fallbackUrl = new URL(PULSEPOINT_FALLBACK_URL);
            fallbackUrl.searchParams.set("resource", "incidents");
            fallbackUrl.searchParams.set("agencyid", agencyId);

            response = await fetchWithTimeout(fallbackUrl.toString(), { headers }, FETCH_TIMEOUT_MS);
            usedEndpoint = "fallback";

            if (!response.ok) {
              console.error(`[PulsePoint] Both endpoints failed for agency ${agencyId}: fallback returned ${response.status}`);
              return [];
            }
          } catch (fallbackError) {
            console.error(`[PulsePoint] Both endpoints failed for agency ${agencyId}:`, fallbackError);
            return [];
          }
        }

        try {
          // Response is encrypted, need to decrypt it
          const encryptedData: PulsePointEncryptedResponse = await response.json();
          const decryptedData: PulsePointDecryptedResponse = decryptPulsePointData(encryptedData);

          // Collect active and recent incidents
          const activeIncidents = decryptedData?.incidents?.active || [];
          const recentIncidents = decryptedData?.incidents?.recent || [];
          const closedIncidents = decryptedData?.incidents?.closed || [];

          const incidents: PulsePointIncident[] = [
            ...activeIncidents,
            ...recentIncidents,
            ...closedIncidents,
          ];

          console.log(`[PulsePoint] Fetched ${incidents.length} incidents from agency ${agencyId} using ${usedEndpoint} endpoint (${activeIncidents.length} active, ${recentIncidents.length} recent, ${closedIncidents.length} closed)`);
          return incidents;
        } catch (error) {
          console.error(`[PulsePoint] Error decrypting data from agency ${agencyId}:`, error);
          return [];
        }
      });

      const results = await Promise.all(fetchPromises);
      const rawIncidents = results.flat();

      console.log(`[PulsePoint] Total raw incidents fetched: ${rawIncidents.length}`);
      if (rawIncidents.length > 0) {
        // Log the first incident's keys to help debug API response format
        console.log(`[PulsePoint] Sample incident keys: ${Object.keys(rawIncidents[0]).join(", ")}`);
      }

      // Transform PulsePoint incidents to our format
      for (const incident of rawIncidents) {
        // Handle different API response formats - some agencies use different property names
        const incidentId = incident.PulsePointIncidentID || incident.ID || incident.id || incident.IncidentID;
        const callType = incident.PulsePointIncidentCallType || incident.CallType || incident.CallTypeDescription || "Unknown";
        const address = incident.FullDisplayAddress || incident.Address || incident.DisplayAddress || "Unknown Address";
        // ICAW uses CallReceivedDateTime as primary (most accurate), TimeCallOpened as fallback
        const timeOpened = incident.CallReceivedDateTime || incident.TimeCallOpened || incident.CallTime || incident.IncidentTime;
        const timeClosed = incident.TimeCallClosed || incident.CloseTime || incident.ClosedDateTime;

        // Skip incidents without a valid ID
        if (!incidentId) {
          console.log(`[PulsePoint] Skipping incident without ID: ${JSON.stringify(incident).substring(0, 200)}`);
          continue;
        }

        const isActive = !timeClosed;

        // Parse latitude/longitude (might be strings)
        let lat = incident.Latitude;
        let lng = incident.Longitude;
        if (typeof lat === "string") lat = parseFloat(lat);
        if (typeof lng === "string") lng = parseFloat(lng);
        // Treat 0,0 as unknown location
        if (lat === 0 && lng === 0) {
          lat = undefined;
          lng = undefined;
        }

        // Transform unit data using helper function (filters VTAC, extracts all timestamps)
        const units = incident.Unit
          ?.filter((u: PulsePointUnit) => !u.UnitID.toUpperCase().includes("VTAC"))
          .map((u: PulsePointUnit) => u.UnitID) || [];
        const unitStatuses = transformUnitStatuses(incident.Unit);

        // Parse timestamp
        let callReceivedTime: number;
        if (timeOpened) {
          const parsed = new Date(timeOpened).getTime();
          callReceivedTime = isNaN(parsed) ? Date.now() : parsed;
        } else {
          // If no timestamp, use current time
          callReceivedTime = Date.now();
        }

        const transformed = {
          externalId: String(incidentId),
          callType,
          callTypeCategory: mapCallTypeToCategory(callType),
          fullAddress: address,
          normalizedAddress: normalizeAddress(address),
          latitude: lat,
          longitude: lng,
          units,
          unitStatuses,
          status: isActive ? ("active" as const) : ("closed" as const),
          callReceivedTime,
          callClosedTime: timeClosed
            ? new Date(timeClosed).getTime()
            : undefined,
        };

        allIncidents.push(transformed);
      }

      console.log(`[PulsePoint] Transformed ${allIncidents.length} incidents`);
      if (allIncidents.length > 0) {
        const sample = allIncidents[0];
        console.log(`[PulsePoint] Sample transformed: callReceivedTime=${sample.callReceivedTime}, status=${sample.status}`);
      }

      // Apply incident limit and 6-hour filter to minimize conflicts
      const filteredIncidents = filterAndLimitIncidents(allIncidents, 200, 6 * 60 * 60 * 1000);
      console.log(`[PulsePoint] After filter: ${filteredIncidents.length} incidents (6hr window, max 200)`);
      // Replace allIncidents with filtered list
      allIncidents.length = 0;
      allIncidents.push(...filteredIncidents);

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

        console.log(`[PulsePoint] Sync complete for tenant ${tenantId}: ${result.created} created, ${result.updated} updated, ${result.skipped} skipped`);
        return {
          success: true,
          fetched: allIncidents.length,
          created: result.created,
          updated: result.updated,
          skipped: result.skipped,
        };
      }

      return { success: true, fetched: 0, created: 0, updated: 0, skipped: 0 };
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
      // Use URL constructor for safe URL building (prevents parameter injection)
      const nwsUrl = new URL("https://api.weather.gov/alerts/active");
      nwsUrl.searchParams.set("zone", zones.join(","));

      const response = await fetch(nwsUrl.toString(), {
        headers: {
          "User-Agent": "Vanguard Emergency Platform (contact@example.com)",
          Accept: "application/geo+json",
        },
      });

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
