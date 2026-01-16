// pages/api/tenant/cron.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { runLifecycleJob } from '../../../services/tenantLifecycle';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).end('Method Not Allowed');
  }

  try {
    const result = await runLifecycleJob();
    return res.status(200).json(result);
  } catch (e: any) {
    console.error('[tenant/cron] error', e);
    return res.status(500).json({ error: e.message || 'Internal Server Error' });
  }
}