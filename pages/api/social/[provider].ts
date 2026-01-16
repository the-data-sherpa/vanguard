// pages/api/social/[provider].ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { getSession } from 'next-auth/react';
import { upsertSocialAccount, getSocialAccount, deleteSocialAccount, type Provider } from '../../../services/social';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getSession({ req });
  if (!session?.tenantId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { provider } = req.query;
  if (!provider || typeof provider !== 'string' || !['facebook', 'twitter', 'instagram', 'discord'].includes(provider)) {
    return res.status(400).json({ error: 'Invalid provider' });
  }

  const tenantId = session.tenantId;
  const providerKey = provider as Provider;

  if (req.method === 'GET') {
    const account = await getSocialAccount(tenantId, providerKey);
    return res.status(200).json({ connected: !!account, provider });
  }

  if (req.method === 'POST') {
    const { accessToken, refreshToken, expiresAt, scope, providerUserId } = req.body;
    if (!accessToken || !providerUserId) {
      return res.status(400).json({ error: 'accessToken and providerUserId required' });
    }
    await upsertSocialAccount(tenantId, providerKey, {
      accessToken,
      refreshToken,
      expiresAt: expiresAt ? new Date(expiresAt) : undefined,
      scope,
      providerUserId,
    });
    return res.status(200).json({ ok: true });
  }

  if (req.method === 'DELETE') {
    await deleteSocialAccount(tenantId, providerKey);
    return res.status(200).json({ ok: true });
  }

  res.setHeader('Allow', ['GET', 'POST', 'DELETE']);
  return res.status(405).end(`Method ${req.method} Not Allowed`);
}