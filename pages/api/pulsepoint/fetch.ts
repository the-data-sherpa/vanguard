// pages/api/pulsepoint/fetch.ts
// Legacy API route - prefer using /api/tenant/[slug]/incidents endpoints
import type { NextApiRequest, NextApiResponse } from 'next';
import { getSession } from 'next-auth/react';
import { fetchTenantIncidents } from '../../../services/pulsepoint';
import { getTenantBySlug } from '../../../services/tenant';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getSession({ req });
  if (!session?.user) {
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
    const result = await fetchTenantIncidents(tenant.id);

    if (!result.success) {
      // Check for rate limiting
      const rateLimited = result.agencies.some((a) =>
        a.error?.includes('Rate limited')
      );

      if (rateLimited) {
        return res
          .status(429)
          .setHeader('Retry-After', '120')
          .json({ error: 'Rate limit exceeded' });
      }

      return res.status(500).json({
        error: 'Failed to fetch incidents',
        details: result.agencies.filter(a => a.error).map(a => a.error)
      });
    }

    return res.status(200).json(result);
  } catch (e: any) {
    console.error('[pulsepoint/fetch] error', e);
    return res.status(500).json({ error: e.message || 'Internal Server Error' });
  }
}
