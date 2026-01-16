// pages/api/config/route.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { getSession } from 'next-auth/react';
import { getConfig, updateConfig } from '../../../services/config';
import { logAudit } from '../../../services/audit';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getSession({ req });
  const role = session?.user?.role;

  if (req.method === 'GET') {
    const cfg = await getConfig();
    return res.status(200).json(cfg);
  }

  if (req.method === 'POST') {
    if (role !== 'platform_admin') {
      return res.status(403).json({ error: 'Forbidden' });
    }
    const patch = req.body;
    const updated = await updateConfig(patch);
    await logAudit(session?.user?.email || 'unknown', 'update_config', undefined, { patch });
    return res.status(200).json(updated);
  }

  res.setHeader('Allow', ['GET', 'POST']);
  return res.status(405).end(`Method ${req.method} Not Allowed`);
}