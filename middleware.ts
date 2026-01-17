import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Tenant context header names
export const TENANT_HEADERS = {
  TENANT_ID: 'x-tenant-id',
  TENANT_SLUG: 'x-tenant-slug',
  TENANT_STATUS: 'x-tenant-status',
  TENANT_TIER: 'x-tenant-tier',
  TENANT_FEATURES: 'x-tenant-features',
} as const;

// Routes that don't require tenant validation
const PUBLIC_ROUTES = [
  '/',
  '/login',
  '/register',
  '/api/auth',
  '/api/health',
  '/_next',
  '/favicon.ico',
];

// Platform admin routes (require platform_admin role, not tenant context)
const PLATFORM_ADMIN_ROUTES = ['/platform', '/api/platform'];

/**
 * Middleware for tenant context injection and validation
 *
 * For tenant-scoped routes (/tenant/[slug]/*):
 * 1. Extract tenant slug from URL
 * 2. Validate tenant exists and is active
 * 3. Inject tenant context headers for downstream use
 * 4. Block access to suspended/deactivated tenants
 */
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip middleware for public routes
  if (PUBLIC_ROUTES.some((route) => pathname.startsWith(route))) {
    return NextResponse.next();
  }

  // Skip middleware for platform admin routes (handled separately)
  if (PLATFORM_ADMIN_ROUTES.some((route) => pathname.startsWith(route))) {
    return NextResponse.next();
  }

  // Handle tenant-scoped routes
  if (pathname.startsWith('/tenant/')) {
    return handleTenantRoute(request, pathname);
  }

  // Handle tenant API routes
  if (pathname.startsWith('/api/tenant/')) {
    return handleTenantApiRoute(request, pathname);
  }

  return NextResponse.next();
}

/**
 * Handle tenant page routes: /tenant/[slug]/*
 */
async function handleTenantRoute(
  request: NextRequest,
  pathname: string
): Promise<NextResponse> {
  // Extract slug from /tenant/[slug]/...
  const segments = pathname.split('/');
  const slug = segments[2];

  if (!slug) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  // Validate tenant
  const tenant = await fetchTenant(slug);

  if (!tenant) {
    return NextResponse.redirect(new URL('/tenant-not-found', request.url));
  }

  // Check tenant status
  if (tenant.status === 'suspended') {
    return NextResponse.redirect(
      new URL(`/tenant-suspended?slug=${slug}`, request.url)
    );
  }

  if (tenant.status === 'deactivated' || tenant.status === 'pending_deletion') {
    return NextResponse.redirect(
      new URL(`/tenant-deactivated?slug=${slug}`, request.url)
    );
  }

  if (tenant.status === 'pending') {
    return NextResponse.redirect(
      new URL(`/tenant-pending?slug=${slug}`, request.url)
    );
  }

  // Inject tenant context headers
  const response = NextResponse.next();
  response.headers.set(TENANT_HEADERS.TENANT_ID, tenant.id);
  response.headers.set(TENANT_HEADERS.TENANT_SLUG, tenant.slug);
  response.headers.set(TENANT_HEADERS.TENANT_STATUS, tenant.status);
  response.headers.set(TENANT_HEADERS.TENANT_TIER, tenant.tier || 'free');
  response.headers.set(
    TENANT_HEADERS.TENANT_FEATURES,
    JSON.stringify(tenant.features || {})
  );

  return response;
}

/**
 * Handle tenant API routes: /api/tenant/[slug]/*
 */
async function handleTenantApiRoute(
  request: NextRequest,
  pathname: string
): Promise<NextResponse> {
  // For API routes, tenant slug can come from:
  // 1. URL path: /api/tenant/[slug]/...
  // 2. Query parameter: ?tenant=slug
  // 3. Request header: x-tenant-slug

  const segments = pathname.split('/');
  let slug = segments[3]; // /api/tenant/[slug]/...

  // Fall back to query param or header
  if (!slug || slug === 'create') {
    slug =
      request.nextUrl.searchParams.get('tenant') ||
      request.headers.get(TENANT_HEADERS.TENANT_SLUG) ||
      '';
  }

  // Some API routes don't need tenant context (e.g., /api/tenant/create)
  if (!slug || pathname === '/api/tenant/create') {
    return NextResponse.next();
  }

  // Validate tenant
  const tenant = await fetchTenant(slug);

  if (!tenant) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 404 });
  }

  // Check tenant status for API access
  if (tenant.status !== 'active') {
    return NextResponse.json(
      {
        error: 'Tenant not active',
        status: tenant.status,
      },
      { status: 403 }
    );
  }

  // Inject tenant context headers
  const response = NextResponse.next();
  response.headers.set(TENANT_HEADERS.TENANT_ID, tenant.id);
  response.headers.set(TENANT_HEADERS.TENANT_SLUG, tenant.slug);
  response.headers.set(TENANT_HEADERS.TENANT_STATUS, tenant.status);
  response.headers.set(TENANT_HEADERS.TENANT_TIER, tenant.tier || 'free');
  response.headers.set(
    TENANT_HEADERS.TENANT_FEATURES,
    JSON.stringify(tenant.features || {})
  );

  return response;
}

/**
 * Fetch tenant from PocketBase
 * Uses edge-compatible fetch instead of PocketBase SDK
 */
async function fetchTenant(
  slug: string
): Promise<TenantResponse | null> {
  const pbUrl = process.env.POCKETBASE_URL || 'http://localhost:8090';
  const isDev = process.env.NODE_ENV === 'development';

  try {
    const response = await fetch(
      `${pbUrl}/api/collections/tenants/records?filter=(slug='${encodeURIComponent(slug)}')&perPage=1`,
      {
        headers: {
          'Content-Type': 'application/json',
        },
        // Cache tenant lookups for 60 seconds to reduce DB load
        next: { revalidate: 60 },
      }
    );

    if (!response.ok) {
      // In development, if PocketBase returns 403/404, create a mock tenant
      // This allows development without full DB setup
      if (isDev && (response.status === 403 || response.status === 404)) {
        console.warn(`[middleware] Dev mode: PocketBase returned ${response.status}, using mock tenant for "${slug}"`);
        return {
          id: `dev-${slug}`,
          slug: slug,
          name: `Dev Tenant (${slug})`,
          status: 'active',
          tier: 'professional',
          features: {
            weatherAlerts: true,
            userSubmissions: true,
          },
          created: new Date().toISOString(),
          updated: new Date().toISOString(),
        };
      }
      console.error('Failed to fetch tenant:', response.statusText);
      return null;
    }

    const data = await response.json();

    if (!data.items || data.items.length === 0) {
      // In development, return mock tenant if no tenant found
      if (isDev) {
        console.warn(`[middleware] Dev mode: No tenant found for "${slug}", using mock tenant`);
        return {
          id: `dev-${slug}`,
          slug: slug,
          name: `Dev Tenant (${slug})`,
          status: 'active',
          tier: 'professional',
          features: {
            weatherAlerts: true,
            userSubmissions: true,
          },
          created: new Date().toISOString(),
          updated: new Date().toISOString(),
        };
      }
      return null;
    }

    return data.items[0] as TenantResponse;
  } catch (error) {
    console.error('Error fetching tenant:', error);
    // In development, return mock tenant on error
    if (isDev) {
      console.warn(`[middleware] Dev mode: Error fetching tenant, using mock for "${slug}"`);
      return {
        id: `dev-${slug}`,
        slug: slug,
        name: `Dev Tenant (${slug})`,
        status: 'active',
        tier: 'professional',
        features: {
          weatherAlerts: true,
          userSubmissions: true,
        },
        created: new Date().toISOString(),
        updated: new Date().toISOString(),
      };
    }
    return null;
  }
}

/**
 * Tenant response type from PocketBase
 */
interface TenantResponse {
  id: string;
  slug: string;
  name: string;
  displayName?: string;
  status: 'pending' | 'active' | 'suspended' | 'deactivated' | 'pending_deletion';
  tier: 'free' | 'starter' | 'professional' | 'enterprise';
  features?: Record<string, boolean>;
  limits?: Record<string, number>;
  created: string;
  updated: string;
}

/**
 * Middleware config - specify which routes to run middleware on
 */
export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|public/).*)',
  ],
};
