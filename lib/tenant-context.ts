import { headers } from 'next/headers';
import type { TenantContext, TenantFeatures, TenantStatus, TenantTier } from './types';

// Header names (must match middleware.ts)
const TENANT_HEADERS = {
  TENANT_ID: 'x-tenant-id',
  TENANT_SLUG: 'x-tenant-slug',
  TENANT_STATUS: 'x-tenant-status',
  TENANT_TIER: 'x-tenant-tier',
  TENANT_FEATURES: 'x-tenant-features',
} as const;

/**
 * Get the current tenant context from middleware-injected headers
 * For use in Server Components and Server Actions
 *
 * @throws Error if tenant context is not available
 */
export async function getTenantContext(): Promise<TenantContext> {
  const headersList = await headers();

  const id = headersList.get(TENANT_HEADERS.TENANT_ID);
  const slug = headersList.get(TENANT_HEADERS.TENANT_SLUG);
  const status = headersList.get(TENANT_HEADERS.TENANT_STATUS) as TenantStatus;
  const tier = headersList.get(TENANT_HEADERS.TENANT_TIER) as TenantTier;
  const featuresJson = headersList.get(TENANT_HEADERS.TENANT_FEATURES);

  if (!id || !slug) {
    throw new Error('Tenant context not available. Ensure this is called within a tenant-scoped route.');
  }

  let features: TenantFeatures = {};
  if (featuresJson) {
    try {
      features = JSON.parse(featuresJson);
    } catch {
      console.warn('Failed to parse tenant features JSON');
    }
  }

  return {
    id,
    slug,
    status: status || 'active',
    tier: tier || 'free',
    features,
  };
}

/**
 * Get the current tenant context, or null if not in a tenant-scoped route
 * For use in Server Components and Server Actions
 */
export async function getTenantContextOrNull(): Promise<TenantContext | null> {
  try {
    return await getTenantContext();
  } catch {
    return null;
  }
}

/**
 * Check if a tenant has a specific feature enabled
 */
export function hasFeature(context: TenantContext, feature: keyof TenantFeatures): boolean {
  return context.features[feature] === true;
}

/**
 * Check if the current tenant tier meets a minimum requirement
 */
export function meetsTierRequirement(
  context: TenantContext,
  requiredTier: TenantTier
): boolean {
  const tierOrder: TenantTier[] = ['free', 'starter', 'professional', 'enterprise'];
  const currentIndex = tierOrder.indexOf(context.tier);
  const requiredIndex = tierOrder.indexOf(requiredTier);
  return currentIndex >= requiredIndex;
}

/**
 * Get tenant context from request headers (for API routes)
 * @param request - The incoming request object
 */
export function getTenantContextFromRequest(request: Request): TenantContext | null {
  const id = request.headers.get(TENANT_HEADERS.TENANT_ID);
  const slug = request.headers.get(TENANT_HEADERS.TENANT_SLUG);
  const status = request.headers.get(TENANT_HEADERS.TENANT_STATUS) as TenantStatus;
  const tier = request.headers.get(TENANT_HEADERS.TENANT_TIER) as TenantTier;
  const featuresJson = request.headers.get(TENANT_HEADERS.TENANT_FEATURES);

  if (!id || !slug) {
    return null;
  }

  let features: TenantFeatures = {};
  if (featuresJson) {
    try {
      features = JSON.parse(featuresJson);
    } catch {
      console.warn('Failed to parse tenant features JSON');
    }
  }

  return {
    id,
    slug,
    status: status || 'active',
    tier: tier || 'free',
    features,
  };
}
