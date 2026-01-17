import PocketBase from 'pocketbase';
import type { TenantContext } from './types';

/**
 * Global PocketBase client instance
 * Use getClient() to get the singleton instance
 */
let pbInstance: PocketBase | null = null;
let authPromise: Promise<void> | null = null;

/**
 * Get the PocketBase client instance
 * Uses singleton pattern to avoid creating multiple connections
 * Automatically authenticates as admin if credentials are available
 */
export function getClient(): PocketBase {
  if (!pbInstance) {
    pbInstance = new PocketBase(process.env.POCKETBASE_URL || 'http://localhost:8090');

    // Authenticate as admin if credentials are available
    const adminEmail = process.env.POCKETBASE_ADMIN_EMAIL;
    const adminPassword = process.env.POCKETBASE_ADMIN_PASSWORD;

    if (adminEmail && adminPassword && !pbInstance.authStore.isValid) {
      authPromise = pbInstance.admins.authWithPassword(adminEmail, adminPassword)
        .then(() => {
          console.log('[PocketBase] Authenticated as admin');
        })
        .catch((err) => {
          console.warn('[PocketBase] Admin auth failed:', err.message);
        });
    }
  }
  return pbInstance;
}

/**
 * Ensure the PocketBase client is authenticated before performing operations
 * Call this before any operation that requires admin access
 */
export async function ensureAuth(): Promise<void> {
  getClient(); // Initialize if needed
  if (authPromise) {
    await authPromise;
  }
}

/**
 * Create a tenant-scoped filter string
 * Automatically adds tenantId to the filter
 *
 * @example
 * const filter = tenantFilter(ctx, 'status="active"');
 * // Returns: 'tenantId="abc123" && status="active"'
 */
export function tenantFilter(ctx: TenantContext, filter?: string): string {
  const tenantCondition = `tenantId="${ctx.id}"`;
  if (!filter) {
    return tenantCondition;
  }
  return `${tenantCondition} && (${filter})`;
}

/**
 * Create a new record with tenant context automatically injected
 */
export async function createWithTenant<T extends Record<string, unknown>>(
  collection: string,
  ctx: TenantContext,
  data: T
): Promise<T & { id: string; tenantId: string }> {
  const pb = getClient();
  return await pb.collection(collection).create(
    {
      ...data,
      tenantId: ctx.id,
    },
    { requestKey: null }  // Disable auto-cancellation
  );
}

/**
 * List records scoped to a tenant
 */
export async function listWithTenant<T>(
  collection: string,
  ctx: TenantContext,
  options?: {
    filter?: string;
    sort?: string;
    page?: number;
    perPage?: number;
    expand?: string;
  }
): Promise<{ items: T[]; totalItems: number; totalPages: number }> {
  const pb = getClient();
  const result = await pb.collection(collection).getList(
    options?.page || 1,
    options?.perPage || 50,
    {
      filter: tenantFilter(ctx, options?.filter),
      sort: options?.sort,
      expand: options?.expand,
      requestKey: null,  // Disable auto-cancellation
    }
  );
  return {
    items: result.items as T[],
    totalItems: result.totalItems,
    totalPages: result.totalPages,
  };
}

/**
 * Get a single record, ensuring it belongs to the tenant
 */
export async function getWithTenant<T>(
  collection: string,
  ctx: TenantContext,
  id: string,
  options?: { expand?: string }
): Promise<T | null> {
  const pb = getClient();
  try {
    const record = await pb.collection(collection).getOne(id, {
      expand: options?.expand,
      requestKey: null,  // Disable auto-cancellation
    });

    // Verify tenant ownership
    if (record.tenantId !== ctx.id) {
      console.warn(`Access denied: Record ${id} does not belong to tenant ${ctx.id}`);
      return null;
    }

    return record as T;
  } catch {
    return null;
  }
}

/**
 * Update a record, ensuring it belongs to the tenant
 */
export async function updateWithTenant<T extends Record<string, unknown>>(
  collection: string,
  ctx: TenantContext,
  id: string,
  data: Partial<T>
): Promise<T | null> {
  const pb = getClient();

  // First verify ownership
  try {
    const existing = await pb.collection(collection).getOne(id, { requestKey: null });
    if (existing.tenantId !== ctx.id) {
      console.warn(`Access denied: Cannot update record ${id} - belongs to different tenant`);
      return null;
    }
  } catch {
    return null;
  }

  // Perform update (don't allow changing tenantId)
  const { tenantId: _, ...safeData } = data as Record<string, unknown>;
  return await pb.collection(collection).update(id, safeData, { requestKey: null });
}

/**
 * Delete a record, ensuring it belongs to the tenant
 */
export async function deleteWithTenant(
  collection: string,
  ctx: TenantContext,
  id: string
): Promise<boolean> {
  const pb = getClient();

  // First verify ownership
  try {
    const existing = await pb.collection(collection).getOne(id, { requestKey: null });
    if (existing.tenantId !== ctx.id) {
      console.warn(`Access denied: Cannot delete record ${id} - belongs to different tenant`);
      return false;
    }
  } catch {
    return false;
  }

  await pb.collection(collection).delete(id, { requestKey: null });
  return true;
}

/**
 * Get the first record matching a filter, scoped to tenant
 */
export async function getFirstWithTenant<T>(
  collection: string,
  ctx: TenantContext,
  filter: string,
  options?: { expand?: string }
): Promise<T | null> {
  const pb = getClient();
  try {
    return await pb.collection(collection).getFirstListItem(
      tenantFilter(ctx, filter),
      { expand: options?.expand, requestKey: null }
    );
  } catch {
    return null;
  }
}

/**
 * Count records matching a filter, scoped to tenant
 */
export async function countWithTenant(
  collection: string,
  ctx: TenantContext,
  filter?: string
): Promise<number> {
  const pb = getClient();
  const result = await pb.collection(collection).getList(1, 1, {
    filter: tenantFilter(ctx, filter),
    requestKey: null,  // Disable auto-cancellation
  });
  return result.totalItems;
}
