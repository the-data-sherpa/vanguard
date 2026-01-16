import PocketBase from 'pocketbase';

const pb = new PocketBase(process.env.POCKETBASE_URL || 'http://localhost:8090');

/**
 * Record an audit event. Each event is stored in the `audit_logs` collection.
 * Fields: `actorId` (user performing the action), `action` (string),
 * `targetId` (optional, e.g., tenant id), `details` (JSON blob), `timestamp`.
 */
export async function logAudit(
  actorId: string,
  action: string,
  targetId?: string,
  details?: Record<string, any>
) {
  try {
    await pb.collection('audit_logs').create({
      actorId,
      action,
      targetId: targetId ?? null,
      details: details ? JSON.stringify(details) : null,
      timestamp: new Date().toISOString(),
    });
  } catch (e) {
    console.error('Failed to write audit log', e);
  }
}
