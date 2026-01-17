import type { Tenant } from '../lib/types';
import { getClient } from '../lib/pocketbase';

// Debug logging helper - only logs when DEBUG=true in .env
const debug = (...args: unknown[]) => {
  if (process.env.DEBUG === 'true') {
    console.log(...args);
  }
};

/** Create a new tenant (admin user will be invited separately) */
export async function createTenant(slug: string, name: string, pulsepointId = '') {
  const pb = getClient();
  const tenant = await pb.collection('tenants').create({
    slug,
    name,
    pulsepointId,
    status: 'active',
    features: JSON.stringify({
      facebook: true,
      twitter: false,
      instagram: false,
      discord: false,
    }),
  });
  return tenant;
}

/** List all tenants (admin only) */
export async function listTenants() {
  const pb = getClient();
  const result = await pb.collection('tenants').getFullList();
  return result;
}

/** Retrieve a tenant by its slug */
export async function getTenantBySlug(slug: string): Promise<Tenant | null> {
  const pb = getClient();
  const isDev = process.env.NODE_ENV === 'development';
  const pbUrl = process.env.POCKETBASE_URL || 'http://localhost:8090';

  debug(`[tenant] Fetching tenant "${slug}" from ${pbUrl}`);

  try {
    // Disable auto-cancellation to prevent race conditions when middleware and page both fetch
    const tenant = await pb.collection('tenants').getFirstListItem(
      `slug="${slug}"`,
      { requestKey: null }  // Disables auto-cancellation for this request
    );
    debug(`[tenant] Found tenant: ${tenant.id}, unitLegendAvailable: ${tenant.unitLegendAvailable}, unitLegendUpdatedAt: ${tenant.unitLegendUpdatedAt}`);
    return tenant as unknown as Tenant;
  } catch (error: any) {
    // Log the actual error for debugging
    debug(`[tenant] Error fetching tenant "${slug}":`, {
      message: error?.message,
      status: error?.status,
      data: error?.data,
      url: error?.url,
    });

    // In development, return a mock tenant for UI testing
    if (isDev) {
      debug(`[tenant] Dev mode: returning mock tenant for "${slug}"`);
      return {
        id: `dev-${slug}`,
        slug: slug,
        name: `Dev Tenant (${slug})`,
        displayName: `Development - ${slug}`,
        status: 'active',
        tier: 'professional',
        features: {
          weatherAlerts: true,
          userSubmissions: true,
        },
        pulsepointAgencyId: 'EMS1681', // Demo agency ID
        weatherZones: ['WAC033', 'WAZ558'], // Demo zones
        created: new Date().toISOString(),
        updated: new Date().toISOString(),
        unitLegend: undefined,
        unitLegendUpdatedAt: undefined,
        unitLegendAvailable: undefined,
      };
    }
    return null;
  }
}

/** Deactivate a tenant – sets status and timestamp */
export async function deactivateTenant(id: string) {
  const pb = getClient();
  await pb.collection('tenants').update(id, {
    status: 'deactivated',
    deactivatedAt: new Date().toISOString(),
  });
}

/** Restore a deactivated tenant */
export async function restoreTenant(id: string) {
  const pb = getClient();
  await pb.collection('tenants').update(id, {
    status: 'active',
    deactivatedAt: null,
  });
}

/** Hard‑delete a tenant and all related data (should be called after the grace period) */
export async function hardDeleteTenant(id: string) {
  const pb = getClient();
  const social = await pb.collection('social_accounts').getFullList({ filter: `tenantId="${id}"` });
  for (const rec of social) await pb.collection('social_accounts').delete(rec.id);

  const counters = await pb.collection('rate_counters').getFullList({ filter: `tenantId="${id}"` });
  for (const rec of counters) await pb.collection('rate_counters').delete(rec.id);

  await pb.collection('tenants').delete(id);
}
