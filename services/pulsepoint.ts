/**
 * PulsePoint Service
 * Real implementation for fetching and decrypting PulsePoint incident data
 */

import crypto from 'crypto';
import type { Tenant, TenantContext } from '../lib/types';
import type {
  PulsePointEncryptedData,
  PulsePointDecryptedData,
  PulsePointFetchResult,
  TenantIncidentFetchResult,
} from '../types/pulsepoint';
import { checkAndConsume, type RateLimitConfig } from './rateLimiter';
import { getConfig } from './config';
import { getClient } from '../lib/pocketbase';

// Debug logging helper - only logs when DEBUG=true in .env
const debug = (...args: unknown[]) => {
  if (process.env.DEBUG === 'true') {
    console.log(...args);
  }
};

const PULSEPOINT_API_BASE = 'https://api.pulsepoint.org/v1';
const PULSEPOINT_LEGACY_API = 'https://web.pulsepoint.org/DB/giba.php';
const PULSEPOINT_DECRYPT_KEY = 'tombrady5rings';

/**
 * EVP_BytesToKey key derivation function (OpenSSL compatible)
 * Used by PulsePoint's CryptoJS-based encryption
 */
function evpBytesToKey(
  password: string,
  salt: Buffer,
  keyLen: number,
  ivLen: number
): { key: Buffer; iv: Buffer } {
  const data = Buffer.concat([Buffer.from(password, 'utf8'), salt]);
  const blocks: Buffer[] = [];
  let lastHash = Buffer.alloc(0);

  while (Buffer.concat(blocks).length < keyLen + ivLen) {
    lastHash = crypto
      .createHash('md5')
      .update(Buffer.concat([lastHash, data]))
      .digest();
    blocks.push(lastHash);
  }

  const derived = Buffer.concat(blocks);
  return {
    key: derived.subarray(0, keyLen),
    iv: derived.subarray(keyLen, keyLen + ivLen),
  };
}

/**
 * Decrypt PulsePoint encrypted response
 * Uses AES-256-CBC with EVP_BytesToKey derivation (CryptoJS compatible)
 * Note: PulsePoint returns double-encoded JSON (JSON string inside JSON)
 */
export function decryptPulsePointResponse(
  encryptedData: PulsePointEncryptedData
): PulsePointDecryptedData {
  const salt = Buffer.from(encryptedData.s, 'hex');
  const iv = Buffer.from(encryptedData.iv, 'hex');
  const ciphertext = Buffer.from(encryptedData.ct, 'base64');

  // Derive key using EVP_BytesToKey (32 bytes for AES-256, 16 for IV but we use provided IV)
  const { key } = evpBytesToKey(PULSEPOINT_DECRYPT_KEY, salt, 32, 16);

  const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
  let decrypted = decipher.update(ciphertext);
  decrypted = Buffer.concat([decrypted, decipher.final()]);

  // First parse may return a JSON string, second parse gets the actual object
  let result = JSON.parse(decrypted.toString('utf8'));
  if (typeof result === 'string') {
    result = JSON.parse(result);
  }

  return result;
}

/**
 * Fetch incidents from PulsePoint API for a single agency
 */
export async function fetchPulsePointIncidents(
  tenantId: string,
  agencyId: string
): Promise<PulsePointFetchResult> {
  const timestamp = new Date().toISOString();

  try {
    // Check rate limit
    const cfg = await getConfig();
    const limitCfg: RateLimitConfig = cfg.rateLimits?.pulsepoint ?? {
      limit: 1,
      intervalSec: 120,
    };

    const { allowed, retryAfter } = await checkAndConsume(tenantId, 'pulsepoint', limitCfg);
    if (!allowed) {
      return {
        success: false,
        timestamp,
        agencyId,
        error: `Rate limited. Retry after ${retryAfter} seconds.`,
      };
    }

    // Fetch from PulsePoint API
    const url = `${PULSEPOINT_API_BASE}/webapp?resource=incidents&agencyid=${encodeURIComponent(agencyId)}`;
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json, text/plain, */*',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Referer': 'https://web.pulsepoint.org/',
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      return {
        success: false,
        timestamp,
        agencyId,
        error: `HTTP ${response.status}: ${errorText}`,
      };
    }

    const encryptedData: PulsePointEncryptedData = await response.json();

    // Decrypt the response
    const decryptedData = decryptPulsePointResponse(encryptedData);

    return {
      success: true,
      timestamp,
      agencyId,
      data: decryptedData,
    };
  } catch (error) {
    return {
      success: false,
      timestamp,
      agencyId,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Fetch incidents for a tenant (may have multiple PulsePoint agencies)
 */
export async function fetchTenantIncidents(
  tenantId: string
): Promise<TenantIncidentFetchResult> {
  const timestamp = new Date().toISOString();
  const pb = getClient();

  // Get tenant configuration
  let tenant: Tenant;
  try {
    tenant = await pb.collection('tenants').getOne(tenantId);
  } catch {
    return {
      success: false,
      timestamp,
      tenantId,
      agencies: [],
      totalIncidents: 0,
    };
  }

  // Collect agency IDs from both legacy field and config
  const agencyIds: string[] = [];

  if (tenant.pulsepointAgencyId) {
    agencyIds.push(tenant.pulsepointAgencyId);
  }

  if (tenant.pulsepointConfig?.enabled && tenant.pulsepointConfig.agencyIds?.length) {
    for (const id of tenant.pulsepointConfig.agencyIds) {
      if (!agencyIds.includes(id)) {
        agencyIds.push(id);
      }
    }
  }

  if (agencyIds.length === 0) {
    return {
      success: true,
      timestamp,
      tenantId,
      agencies: [],
      totalIncidents: 0,
    };
  }

  // Fetch from each agency
  const results: PulsePointFetchResult[] = [];
  let totalIncidents = 0;

  for (const agencyId of agencyIds) {
    const result = await fetchPulsePointIncidents(tenantId, agencyId);
    results.push(result);

    if (result.success && result.data?.incidents) {
      const active = result.data.incidents.active?.length ?? 0;
      const recent = result.data.incidents.recent?.length ?? 0;
      totalIncidents += active + recent;
    }
  }

  const allSucceeded = results.every((r) => r.success);
  const someSucceeded = results.some((r) => r.success);

  return {
    success: someSucceeded,
    timestamp,
    tenantId,
    agencies: results,
    totalIncidents,
  };
}

/**
 * Check if a tenant has PulsePoint integration enabled
 */
export function isPulsePointEnabled(tenant: Tenant): boolean {
  // Check explicit config flag
  if (tenant.pulsepointConfig?.enabled === false) {
    return false;
  }

  // Must have at least one agency ID
  const hasLegacyId = Boolean(tenant.pulsepointAgencyId);
  const hasConfigIds = Boolean(tenant.pulsepointConfig?.agencyIds?.length);

  return hasLegacyId || hasConfigIds;
}

/**
 * Get the list of agency IDs for a tenant
 */
export function getTenantAgencyIds(tenant: Tenant): string[] {
  const agencyIds: string[] = [];

  if (tenant.pulsepointAgencyId) {
    agencyIds.push(tenant.pulsepointAgencyId);
  }

  if (tenant.pulsepointConfig?.agencyIds?.length) {
    for (const id of tenant.pulsepointConfig.agencyIds) {
      if (!agencyIds.includes(id)) {
        agencyIds.push(id);
      }
    }
  }

  return agencyIds;
}

// ===================
// Unit Legend
// ===================

export interface UnitLegendResponse {
  UnitLegend: Array<{
    UnitKey: string;
    Description: string;
  }>;
}

export interface UnitLegendFetchResult {
  success: boolean;
  timestamp: string;
  agencyId: string;
  data?: UnitLegendResponse;
  error?: string;
  notFound?: boolean; // True if 400/404 - agency doesn't have a legend
}

/**
 * Fetch unit legend from PulsePoint API for an agency
 * The legend maps unit IDs to human-readable descriptions
 */
export async function fetchUnitLegend(agencyId: string): Promise<UnitLegendFetchResult> {
  const timestamp = new Date().toISOString();

  try {
    const url = `${PULSEPOINT_API_BASE}/webapp?resource=unitlegend&agencyid=${encodeURIComponent(agencyId)}`;
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json, text/plain, */*',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Referer': 'https://web.pulsepoint.org/',
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache',
      },
    });

    // 400/404 typically means no legend available for this agency
    if (!response.ok) {
      const isNotFound = response.status === 400 || response.status === 404;
      return {
        success: false,
        timestamp,
        agencyId,
        error: `HTTP ${response.status}`,
        notFound: isNotFound,
      };
    }

    const encryptedData: PulsePointEncryptedData = await response.json();

    // Decrypt the response (same encryption as incidents)
    let decryptedData: UnitLegendResponse;
    try {
      decryptedData = decryptPulsePointResponse(encryptedData) as unknown as UnitLegendResponse;
    } catch {
      // Decryption failure might indicate error response
      return {
        success: false,
        timestamp,
        agencyId,
        error: 'Failed to decrypt response',
        notFound: true,
      };
    }

    // Check if we got a valid legend
    if (!decryptedData?.UnitLegend || !Array.isArray(decryptedData.UnitLegend)) {
      return {
        success: false,
        timestamp,
        agencyId,
        error: 'No unit legend in response',
        notFound: true,
      };
    }

    return {
      success: true,
      timestamp,
      agencyId,
      data: decryptedData,
    };
  } catch (error) {
    return {
      success: false,
      timestamp,
      agencyId,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

const LEGEND_REFRESH_HOURS = 24;

/**
 * Check if unit legend needs refresh (older than 24 hours or never synced)
 */
export function needsLegendRefresh(tenant: Tenant): boolean {
  // If explicitly marked as unavailable, don't refresh
  if (tenant.unitLegendAvailable === false) {
    return false;
  }

  // If never synced, needs refresh
  if (!tenant.unitLegendUpdatedAt) {
    return true;
  }

  // Check if older than 24 hours
  const lastUpdate = new Date(tenant.unitLegendUpdatedAt);
  const hoursSinceUpdate = (Date.now() - lastUpdate.getTime()) / (1000 * 60 * 60);
  return hoursSinceUpdate >= LEGEND_REFRESH_HOURS;
}

/**
 * Fetch and store unit legend for a tenant
 * - Skips if unitLegendAvailable === false (404 was returned previously)
 * - Skips if updated within the last 24 hours
 * - On 404/400, marks unitLegendAvailable = false to prevent future attempts
 */
export async function syncTenantUnitLegend(tenantId: string, force = false): Promise<{
  success: boolean;
  message: string;
  unitCount?: number;
  skipped?: boolean;
}> {
  const pb = getClient();

  // Get tenant configuration
  let tenant: Tenant;
  try {
    tenant = await pb.collection('tenants').getOne(tenantId) as unknown as Tenant;
  } catch {
    return {
      success: false,
      message: 'Tenant not found',
    };
  }

  debug('[syncTenantUnitLegend] Tenant state:', {
    tenantId,
    force,
    unitLegendAvailable: tenant.unitLegendAvailable,
    unitLegendUpdatedAt: tenant.unitLegendUpdatedAt,
    hasUnitLegend: !!tenant.unitLegend,
  });

  // Check if legend is known to be unavailable (explicitly false, not just null/undefined)
  if (!force && tenant.unitLegendAvailable === false) {
    return {
      success: true,
      message: 'Unit legend not available for this agency (previously returned 404)',
      skipped: true,
    };
  }

  // Check if refresh is needed (unless forced)
  if (!force && !needsLegendRefresh(tenant)) {
    return {
      success: true,
      message: 'Unit legend is up to date (less than 24 hours old)',
      skipped: true,
      unitCount: tenant.unitLegend?.length || 0,
    };
  }

  // Get agency IDs
  const agencyIds = getTenantAgencyIds(tenant);
  if (agencyIds.length === 0) {
    return {
      success: false,
      message: 'No PulsePoint agency configured for this tenant',
    };
  }

  // Fetch legend from first agency (legends are typically per-county, so first is fine)
  const result = await fetchUnitLegend(agencyIds[0]);

  // Handle not found - mark as unavailable and don't try again
  if (result.notFound) {
    try {
      await pb.collection('tenants').update(tenantId, {
        unitLegendAvailable: false,
        unitLegendUpdatedAt: new Date().toISOString(),
      });
    } catch {
      // Ignore update errors
    }
    return {
      success: true,
      message: 'Unit legend not available for this agency (marked as unavailable)',
      unitCount: 0,
    };
  }

  if (!result.success || !result.data?.UnitLegend) {
    return {
      success: false,
      message: result.error || 'Failed to fetch unit legend',
    };
  }

  // Store in tenant record
  try {
    debug('[syncTenantUnitLegend] Updating tenant with unit legend:', {
      tenantId,
      unitCount: result.data.UnitLegend.length,
    });
    const updated = await pb.collection('tenants').update(tenantId, {
      unitLegend: result.data.UnitLegend,
      unitLegendUpdatedAt: new Date().toISOString(),
      unitLegendAvailable: true,
    });
    debug('[syncTenantUnitLegend] Update result - fields present:', {
      unitLegend: updated.unitLegend !== undefined ? `${updated.unitLegend?.length} units` : 'MISSING',
      unitLegendAvailable: updated.unitLegendAvailable,
      unitLegendUpdatedAt: updated.unitLegendUpdatedAt,
      allKeys: Object.keys(updated),
    });

    return {
      success: true,
      message: `Updated unit legend with ${result.data.UnitLegend.length} units`,
      unitCount: result.data.UnitLegend.length,
    };
  } catch (error) {
    console.error('[syncTenantUnitLegend] Update failed:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to update tenant',
    };
  }
}
