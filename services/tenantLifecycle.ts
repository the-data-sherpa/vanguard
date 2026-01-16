// services/tenantLifecycle.ts
import PocketBase from "pocketbase";
import { deactivateTenant, hardDeleteTenant } from "./tenant";
import { logAudit } from "./audit";

const pb = new PocketBase(process.env.POCKETBASE_URL || "http://localhost:8090");
const GRACE_PERIOD_DAYS = 30;

/**
 * Scan for tenants that have been deactivated >= GRACE_PERIOD_DAYS ago
 * and mark them as `pending_deletion`. Returns an array of tenant IDs processed.
 */
export async function markTenantsForDeletion(): Promise<string[]> {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - GRACE_PERIOD_DAYS);

  const deactivated = await pb.collection("tenants").getList(1, 200, {
    filter: `status = "deactivated" && deactivatedAt < "${cutoff.toISOString()}"`,
  });

  const processed: string[] = [];
  for (const tenant of deactivated.items) {
    await pb.collection("tenants").update(tenant.id, {
      status: "pending_deletion",
    });
    await logAudit("system", "mark_pending_deletion", tenant.id, {
      deactivatedAt: tenant.deactivatedAt,
    });
    processed.push(tenant.id);
  }

  return processed;
}

/**
 * Perform hard deletion for all tenants with status `pending_deletion`.
 * This can be called from a scheduled job or manually.
 */
export async function deletePendingTenants(): Promise<string[]> {
  const pending = await pb.collection("tenants").getList(1, 200, {
    filter: `status = "pending_deletion"`,
  });

  const deleted: string[] = [];
  for (const tenant of pending.items) {
    await hardDeleteTenant(tenant.id);
    await logAudit("system", "hard_delete_tenant", tenant.id);
    deleted.push(tenant.id);
  }

  return deleted;
}

/**
 * Convenience wrapper that runs both steps in order:
 * 1) Mark grace‑period‑expired tenants as pending deletion
 * 2) Delete any already‑pending tenants
 * Returns an object with the IDs processed in each step.
 */
export async function runLifecycleJob(): Promise<{ marked: string[]; deleted: string[] }> {
  const marked = await markTenantsForDeletion();
  const deleted = await deletePendingTenants();
  return { marked, deleted };
}