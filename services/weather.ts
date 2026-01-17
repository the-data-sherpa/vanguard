/**
 * Weather Service
 * Fetches and manages NWS weather alerts for tenants
 */

import type {
  WeatherAlert,
  AlertSeverity,
  AlertUrgency,
  AlertCertainty,
  AlertStatus,
  TenantContext,
  Tenant,
} from '../lib/types';
import type { WeatherSyncResult } from '../types/pulsepoint';
import {
  getClient,
  createWithTenant,
  listWithTenant,
  updateWithTenant,
  getFirstWithTenant,
} from '../lib/pocketbase';

const NWS_API_BASE = 'https://api.weather.gov';

// ===================
// NWS API Types
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

interface NWSAlertResponse {
  features: NWSAlert[];
}

// ===================
// API Functions
// ===================

/**
 * Fetch active alerts from NWS API for given zones
 */
export async function fetchNWSAlerts(zones: string[]): Promise<NWSAlert[]> {
  if (zones.length === 0) {
    return [];
  }

  const userAgent = process.env.NWS_USER_AGENT || 'Vanguard/1.0 (admin@example.com)';

  try {
    // NWS API accepts comma-separated zones
    const zoneParam = zones.join(',');
    const url = `${NWS_API_BASE}/alerts/active?zone=${encodeURIComponent(zoneParam)}`;

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        Accept: 'application/geo+json',
        'User-Agent': userAgent,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`NWS API error: HTTP ${response.status} - ${errorText}`);
    }

    const data: NWSAlertResponse = await response.json();
    return data.features || [];
  } catch (error) {
    console.error('Failed to fetch NWS alerts:', error);
    throw error;
  }
}

/**
 * Fetch weather alerts for a specific tenant
 */
export async function fetchTenantWeatherAlerts(
  ctx: TenantContext
): Promise<NWSAlert[]> {
  const pb = getClient();

  // Get tenant to retrieve weather zones
  let tenant: Tenant;
  try {
    tenant = await pb.collection('tenants').getOne(ctx.id);
  } catch {
    console.error(`Failed to fetch tenant ${ctx.id}`);
    return [];
  }

  const zones = tenant.weatherZones ?? [];
  if (zones.length === 0) {
    return [];
  }

  return await fetchNWSAlerts(zones);
}

// ===================
// Sync Functions
// ===================

/**
 * Sync weather alerts for a tenant
 * Creates new alerts, updates existing ones, expires old ones
 */
export async function syncWeatherAlerts(
  ctx: TenantContext
): Promise<WeatherSyncResult> {
  const timestamp = new Date().toISOString();
  const errors: string[] = [];
  let created = 0;
  let updated = 0;
  let expired = 0;

  try {
    // Fetch current alerts from NWS
    const nwsAlerts = await fetchTenantWeatherAlerts(ctx);

    // Get existing active alerts from database
    const existingAlerts = await listWithTenant<WeatherAlert>('weather_alerts', ctx, {
      filter: 'status="active"',
      perPage: 100,
    });

    const existingNwsIds = new Set(existingAlerts.items.map((a) => a.nwsId));
    const incomingNwsIds = new Set(nwsAlerts.map((a) => a.properties.id));

    // Process incoming alerts
    for (const nwsAlert of nwsAlerts) {
      try {
        const existing = await findExistingAlert(ctx, nwsAlert.properties.id);

        if (existing) {
          // Update existing alert
          const hasChanges = checkAlertChanges(existing, nwsAlert);
          if (hasChanges) {
            await updateAlertFromNWS(ctx, existing.id, nwsAlert);
            updated++;
          }
        } else {
          // Create new alert
          await createAlertFromNWS(ctx, nwsAlert);
          created++;
        }
      } catch (error) {
        errors.push(
          `Alert ${nwsAlert.properties.id}: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
      }
    }

    // Expire alerts that are no longer active
    for (const alert of existingAlerts.items) {
      if (!incomingNwsIds.has(alert.nwsId)) {
        try {
          await expireAlert(ctx, alert.id);
          expired++;
        } catch (error) {
          errors.push(
            `Failed to expire ${alert.id}: ${error instanceof Error ? error.message : 'Unknown error'}`
          );
        }
      }
    }

    // Also expire alerts that have passed their expiration time
    const now = new Date();
    for (const alert of existingAlerts.items) {
      if (new Date(alert.expires) < now && alert.status === 'active') {
        try {
          await expireAlert(ctx, alert.id);
          expired++;
        } catch (error) {
          errors.push(
            `Failed to expire ${alert.id}: ${error instanceof Error ? error.message : 'Unknown error'}`
          );
        }
      }
    }

    return {
      success: errors.length === 0,
      tenantId: ctx.id,
      timestamp,
      created,
      updated,
      expired,
      errors,
    };
  } catch (error) {
    return {
      success: false,
      tenantId: ctx.id,
      timestamp,
      created,
      updated,
      expired,
      errors: [error instanceof Error ? error.message : 'Unknown error'],
    };
  }
}

// ===================
// CRUD Operations
// ===================

/**
 * Find an existing alert by NWS ID
 */
async function findExistingAlert(
  ctx: TenantContext,
  nwsId: string
): Promise<WeatherAlert | null> {
  return await getFirstWithTenant<WeatherAlert>(
    'weather_alerts',
    ctx,
    `nwsId="${nwsId}"`
  );
}

/**
 * Create an alert from NWS data
 */
async function createAlertFromNWS(
  ctx: TenantContext,
  nwsAlert: NWSAlert
): Promise<WeatherAlert> {
  const props = nwsAlert.properties;

  const alertData = {
    nwsId: props.id,
    event: props.event,
    headline: props.headline,
    description: props.description,
    instruction: props.instruction,
    severity: mapSeverity(props.severity),
    urgency: mapUrgency(props.urgency),
    certainty: mapCertainty(props.certainty),
    category: props.category,
    onset: props.onset,
    expires: props.expires,
    ends: props.ends,
    affectedZones: props.affectedZones ?? [],
    status: 'active' as AlertStatus,
  };

  // PocketBase adds id, created, updated automatically
  return await createWithTenant('weather_alerts', ctx, alertData) as unknown as WeatherAlert;
}

/**
 * Update an existing alert from NWS data
 */
async function updateAlertFromNWS(
  ctx: TenantContext,
  alertId: string,
  nwsAlert: NWSAlert
): Promise<WeatherAlert | null> {
  const props = nwsAlert.properties;

  return await updateWithTenant('weather_alerts', ctx, alertId, {
    headline: props.headline,
    description: props.description,
    instruction: props.instruction,
    severity: mapSeverity(props.severity),
    urgency: mapUrgency(props.urgency),
    certainty: mapCertainty(props.certainty),
    expires: props.expires,
    ends: props.ends,
    affectedZones: props.affectedZones ?? [],
  }) as WeatherAlert | null;
}

/**
 * Check if alert has meaningful changes
 */
function checkAlertChanges(existing: WeatherAlert, incoming: NWSAlert): boolean {
  const props = incoming.properties;

  if (existing.headline !== props.headline) return true;
  if (existing.description !== props.description) return true;
  if (existing.instruction !== props.instruction) return true;
  if (existing.expires !== props.expires) return true;
  if (existing.ends !== props.ends) return true;

  return false;
}

/**
 * Expire an alert
 */
async function expireAlert(ctx: TenantContext, alertId: string): Promise<WeatherAlert | null> {
  return await updateWithTenant('weather_alerts', ctx, alertId, {
    status: 'expired' as AlertStatus,
  }) as WeatherAlert | null;
}

/**
 * Get active weather alerts for a tenant
 */
export async function getActiveAlerts(ctx: TenantContext): Promise<WeatherAlert[]> {
  const isDev = process.env.NODE_ENV === 'development';

  try {
    const result = await listWithTenant<WeatherAlert>('weather_alerts', ctx, {
      filter: 'status="active"',
      sort: '-created',
      perPage: 50,
    });
    return result.items;
  } catch (error) {
    if (isDev) {
      console.warn('[weather] Dev mode: returning empty weather alerts');
      return [];
    }
    throw error;
  }
}

/**
 * List all weather alerts with pagination
 */
export async function listAlerts(
  ctx: TenantContext,
  options?: {
    page?: number;
    perPage?: number;
    status?: AlertStatus;
    severity?: AlertSeverity;
  }
): Promise<{ items: WeatherAlert[]; totalItems: number; totalPages: number }> {
  const isDev = process.env.NODE_ENV === 'development';
  const filters: string[] = [];

  if (options?.status) {
    filters.push(`status="${options.status}"`);
  }
  if (options?.severity) {
    filters.push(`severity="${options.severity}"`);
  }

  try {
    return await listWithTenant<WeatherAlert>('weather_alerts', ctx, {
      page: options?.page ?? 1,
      perPage: options?.perPage ?? 50,
      filter: filters.length > 0 ? filters.join(' && ') : undefined,
      sort: '-created',
    });
  } catch (error) {
    if (isDev) {
      console.warn('[weather] Dev mode: returning empty alerts list');
      return { items: [], totalItems: 0, totalPages: 0 };
    }
    throw error;
  }
}

// ===================
// Utility Functions
// ===================

/**
 * Map NWS severity string to our enum
 */
function mapSeverity(severity: string): AlertSeverity {
  const normalized = severity.toLowerCase();
  switch (normalized) {
    case 'extreme':
      return 'Extreme';
    case 'severe':
      return 'Severe';
    case 'moderate':
      return 'Moderate';
    case 'minor':
      return 'Minor';
    default:
      return 'Unknown';
  }
}

/**
 * Map NWS urgency string to our enum
 */
function mapUrgency(urgency: string): AlertUrgency {
  const normalized = urgency.toLowerCase();
  switch (normalized) {
    case 'immediate':
      return 'Immediate';
    case 'expected':
      return 'Expected';
    case 'future':
      return 'Future';
    default:
      return 'Unknown';
  }
}

/**
 * Map NWS certainty string to our enum
 */
function mapCertainty(certainty: string): AlertCertainty {
  const normalized = certainty.toLowerCase();
  switch (normalized) {
    case 'observed':
      return 'Observed';
    case 'likely':
      return 'Likely';
    case 'possible':
      return 'Possible';
    case 'unlikely':
      return 'Unlikely';
    default:
      return 'Unknown';
  }
}

/**
 * Get severity badge color class
 */
export function getSeverityColor(severity: AlertSeverity): string {
  switch (severity) {
    case 'Extreme':
      return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200';
    case 'Severe':
      return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
    case 'Moderate':
      return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200';
    case 'Minor':
      return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
    default:
      return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200';
  }
}
