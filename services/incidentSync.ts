/**
 * Incident Sync Service
 * Orchestrates syncing incidents and weather for all tenants
 */

import type { Tenant, TenantContext } from '../lib/types';
import type { SyncResult, MultiTenantSyncResult, WeatherSyncResult } from '../types/pulsepoint';
import { getClient } from '../lib/pocketbase';
import { fetchTenantIncidents, isPulsePointEnabled, syncTenantUnitLegend, needsLegendRefresh } from './pulsepoint';
import { processIncomingIncidents } from './incident';
import { syncWeatherAlerts } from './weather';

/**
 * Get all tenants that should be included in sync
 * Returns active tenants with PulsePoint enabled
 */
export async function getTenantsForSync(): Promise<Tenant[]> {
  const pb = getClient();

  try {
    const tenants = await pb.collection('tenants').getFullList<Tenant>({
      filter: 'status="active"',
    });

    // Filter to only tenants with PulsePoint enabled
    return tenants.filter(isPulsePointEnabled);
  } catch (error) {
    console.error('Failed to fetch tenants for sync:', error);
    return [];
  }
}

/**
 * Get all tenants with weather alerts enabled
 */
export async function getTenantsForWeatherSync(): Promise<Tenant[]> {
  const pb = getClient();

  try {
    const tenants = await pb.collection('tenants').getFullList<Tenant>({
      filter: 'status="active"',
    });

    // Filter to tenants with weather zones configured
    return tenants.filter((t) => t.weatherZones && t.weatherZones.length > 0);
  } catch (error) {
    console.error('Failed to fetch tenants for weather sync:', error);
    return [];
  }
}

/**
 * Build a TenantContext from a Tenant record
 */
function buildTenantContext(tenant: Tenant): TenantContext {
  return {
    id: tenant.id,
    slug: tenant.slug,
    status: tenant.status,
    tier: tenant.tier,
    features: tenant.features ?? {},
  };
}

/**
 * Run incident sync for a single tenant
 */
export async function runIncidentSync(tenantId: string): Promise<SyncResult> {
  const timestamp = new Date().toISOString();
  const pb = getClient();

  // Get tenant
  let tenant: Tenant;
  try {
    tenant = await pb.collection('tenants').getOne<Tenant>(tenantId);
  } catch {
    return {
      success: false,
      tenantId,
      tenantSlug: 'unknown',
      timestamp,
      created: 0,
      updated: 0,
      closed: 0,
      errors: [{ incidentId: '', message: 'Tenant not found', timestamp }],
    };
  }

  const ctx = buildTenantContext(tenant);

  try {
    // Sync unit legend if needed (every 24 hours, or on first run)
    // This is done before incident fetch to ensure legend is available
    if (needsLegendRefresh(tenant)) {
      const legendResult = await syncTenantUnitLegend(tenantId);
      if (legendResult.success && !legendResult.skipped) {
        console.log(`[Sync] ${tenant.slug}: ${legendResult.message}`);
      }
    }

    // Fetch incidents from PulsePoint
    const fetchResult = await fetchTenantIncidents(tenantId);

    if (!fetchResult.success) {
      // Check if it was just rate limited
      const rateLimited = fetchResult.agencies.some((a) =>
        a.error?.includes('Rate limited')
      );

      if (rateLimited) {
        return {
          success: true,
          tenantId,
          tenantSlug: tenant.slug,
          timestamp,
          created: 0,
          updated: 0,
          closed: 0,
          errors: [],
          skippedRateLimited: true,
        };
      }

      return {
        success: false,
        tenantId,
        tenantSlug: tenant.slug,
        timestamp,
        created: 0,
        updated: 0,
        closed: 0,
        errors: fetchResult.agencies
          .filter((a) => a.error)
          .map((a) => ({
            incidentId: '',
            message: `Agency ${a.agencyId}: ${a.error}`,
            timestamp,
          })),
      };
    }

    // Collect all incidents from all agencies
    const allIncidents = fetchResult.agencies.flatMap((agency) => {
      if (!agency.data?.incidents) return [];
      const active = agency.data.incidents.active ?? [];
      const recent = agency.data.incidents.recent ?? [];
      return [...active, ...recent];
    });

    // Process incidents
    const processResult = await processIncomingIncidents(ctx, allIncidents);

    return {
      success: processResult.success,
      tenantId,
      tenantSlug: tenant.slug,
      timestamp,
      created: processResult.created,
      updated: processResult.updated,
      closed: processResult.closed,
      errors: processResult.errors,
    };
  } catch (error) {
    return {
      success: false,
      tenantId,
      tenantSlug: tenant.slug,
      timestamp,
      created: 0,
      updated: 0,
      closed: 0,
      errors: [
        {
          incidentId: '',
          message: error instanceof Error ? error.message : 'Unknown error',
          timestamp,
        },
      ],
    };
  }
}

/**
 * Run weather sync for a single tenant
 */
export async function runWeatherSync(tenantId: string): Promise<WeatherSyncResult> {
  const timestamp = new Date().toISOString();
  const pb = getClient();

  // Get tenant
  let tenant: Tenant;
  try {
    tenant = await pb.collection('tenants').getOne<Tenant>(tenantId);
  } catch {
    return {
      success: false,
      tenantId,
      timestamp,
      created: 0,
      updated: 0,
      expired: 0,
      errors: ['Tenant not found'],
    };
  }

  const ctx = buildTenantContext(tenant);

  return await syncWeatherAlerts(ctx);
}

/**
 * Run incident sync for all eligible tenants
 */
export async function runAllTenantsIncidentSync(): Promise<MultiTenantSyncResult> {
  const timestamp = new Date().toISOString();
  const tenants = await getTenantsForSync();

  const results: SyncResult[] = [];
  let tenantsProcessed = 0;
  let tenantsSkipped = 0;
  let totalCreated = 0;
  let totalUpdated = 0;
  let totalClosed = 0;

  for (const tenant of tenants) {
    const result = await runIncidentSync(tenant.id);
    results.push(result);

    if (result.skippedRateLimited) {
      tenantsSkipped++;
    } else {
      tenantsProcessed++;
      totalCreated += result.created;
      totalUpdated += result.updated;
      totalClosed += result.closed;
    }
  }

  const allSucceeded = results.every((r) => r.success);

  return {
    success: allSucceeded,
    timestamp,
    tenantsProcessed,
    tenantsSkipped,
    totalCreated,
    totalUpdated,
    totalClosed,
    results,
  };
}

/**
 * Run weather sync for all eligible tenants
 */
export async function runAllTenantsWeatherSync(): Promise<{
  success: boolean;
  timestamp: string;
  tenantsProcessed: number;
  totalCreated: number;
  totalUpdated: number;
  totalExpired: number;
  results: WeatherSyncResult[];
}> {
  const timestamp = new Date().toISOString();
  const tenants = await getTenantsForWeatherSync();

  const results: WeatherSyncResult[] = [];
  let tenantsProcessed = 0;
  let totalCreated = 0;
  let totalUpdated = 0;
  let totalExpired = 0;

  for (const tenant of tenants) {
    const ctx = buildTenantContext(tenant);
    const result = await syncWeatherAlerts(ctx);
    results.push(result);

    tenantsProcessed++;
    totalCreated += result.created;
    totalUpdated += result.updated;
    totalExpired += result.expired;
  }

  const allSucceeded = results.every((r) => r.success);

  return {
    success: allSucceeded,
    timestamp,
    tenantsProcessed,
    totalCreated,
    totalUpdated,
    totalExpired,
    results,
  };
}
