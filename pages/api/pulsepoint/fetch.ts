// pages/api/pulsepoint/fetch.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { getSession } from 'next-auth/react';
import { fetchTenantPulsepoint } from '../../../services/pulsepoint';
import { getTenantBySlug } from '../../../services/tenant';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getSession({ req });
  if (!session?.tenantId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { slug } = req.query;
  if (!slug || typeof slug !== 'string') {
    return res.status(400).json({ error: 'Tenant slug required' });
  }

  const tenant = await getTenantBySlug(slug);
  if (!tenant) {
    return res.status(404).json({ error: 'Tenant not found' });
  }

  try {
    const data = await fetchTenantPulsepoint(tenant.id, tenant.pulsepointId || '', req.query);
    return res.status(200).json(data);
  } catch (e: any) {
    if (e.statusCode === 429) {
      return res
        .status(429)
        .setHeader('Retry-After', e.retryAfter?.toString() ?? '120')
        .json({ error: 'Rate limit exceeded' });
    }
    console.error('[pulsepoint/fetch] error', e);
    return res.status(500).json({ error: e.message || 'Internal Server Error' });
  }
}