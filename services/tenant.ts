import PocketBase from 'pocketbase';

const pb = new PocketBase(process.env.POCKETBASE_URL || 'http://localhost:8090');

/** Create a new tenant (admin user will be invited separately) */
export async function createTenant(slug: string, name: string, pulsepointId = '') {
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

/** Retrieve a tenant by its slug */
export async function getTenantBySlug(slug: string) {
  try {
    return await pb.collection('tenants').getFirstListItem(`slug="${slug}"`);
  } catch {
    return null;
  }
}

/** Deactivate a tenant – sets status and timestamp */
export async function deactivateTenant(id: string) {
  await pb.collection('tenants').update(id, {
    status: 'deactivated',
    deactivatedAt: new Date().toISOString(),
  });
}

/** Restore a deactivated tenant */
export async function restoreTenant(id: string) {
  await pb.collection('tenants').update(id, {
    status: 'active',
    deactivatedAt: null,
  });
}

/** Hard‑delete a tenant and all related data (should be called after the grace period) */
export async function hardDeleteTenant(id: string) {
  const social = await pb.collection('social_accounts').list({ filter: `tenantId="${id}"` });
  for (const rec of social.items) await pb.collection('social_accounts').delete(rec.id);

  const counters = await pb.collection('rate_counters').list({ filter: `tenantId="${id}"` });
  for (const rec of counters.items) await pb.collection('rate_counters').delete(rec.id);

  await pb.collection('tenants').delete(id);
}
