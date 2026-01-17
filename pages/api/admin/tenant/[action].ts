// pages/api/admin/tenant/[action].ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { getSession } from 'next-auth/react';
import {
  createTenant,
  getTenantBySlug,
  deactivateTenant,
  restoreTenant,
  hardDeleteTenant,
} from '../../../../services/tenant';
import { logAudit } from '../../../../services/audit';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getSession({ req });
  const role = session?.user?.role;
  if (role !== 'platform_admin') {
    return res.status(403).json({ error: 'Forbidden' });
  }

  const { action } = req.query;
  const { slug, name, pulsepointId } = req.body;

  try {
    switch (action) {
      case 'list':
        const records = await import('../../../../services/tenant').then((m) => m.listTenants?.() ?? []);
        return res.status(200).json(records);
      case 'create':
        if (!slug || !name) {
          return res.status(400).json({ error: 'slug and name are required' });
        }
        const newTenant = await createTenant(slug as string, name as string, pulsepointId);
        await logAudit(session?.user?.email || 'unknown', 'create_tenant', newTenant.id, { slug, name });
        return res.status(201).json(newTenant);
      case 'deactivate':
        if (!slug) return res.status(400).json({ error: 'slug required' });
        const toDeactivate = await getTenantBySlug(slug as string);
        if (!toDeactivate) return res.status(404).json({ error: 'Tenant not found' });
        await deactivateTenant(toDeactivate.id);
        await logAudit(session?.user?.email || 'unknown', 'deactivate_tenant', toDeactivate.id, { slug });
        return res.status(200).json({ ok: true });
      case 'restore':
        if (!slug) return res.status(400).json({ error: 'slug required' });
        const toRestore = await getTenantBySlug(slug as string);
        if (!toRestore) return res.status(404).json({ error: 'Tenant not found' });
        await restoreTenant(toRestore.id);
        await logAudit(session?.user?.email || 'unknown', 'restore_tenant', toRestore.id, { slug });
        return res.status(200).json({ ok: true });
      case 'hardDelete':
        if (!slug) return res.status(400).json({ error: 'slug required' });
        const toDelete = await getTenantBySlug(slug as string);
        if (!toDelete) return res.status(404).json({ error: 'Tenant not found' });
        await hardDeleteTenant(toDelete.id);
        await logAudit(session?.user?.email || 'unknown', 'hard_delete_tenant', toDelete.id, { slug });
        return res.status(200).json({ ok: true });
      default:
        return res.status(400).json({ error: 'Invalid action' });
    }
  } catch (e: any) {
    console.error('[tenant action] error', e);
    return res.status(500).json({ error: e.message || 'Internal Server Error' });
  }
}
