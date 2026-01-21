import { httpAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { RunMutationCtx } from "@convex-dev/rate-limiter";
import {
  rateLimiter,
  getClientIP,
  rateLimitedResponse,
  jsonResponse,
  errorResponse,
} from "./rateLimiter";
import { getCached, setCached } from "./cacheHelpers";

// Cache TTL in milliseconds (30 seconds)
const CACHE_TTL_MS = 30_000;

// ===================
// Helper Functions
// ===================

/**
 * Check both IP and tenant rate limits.
 * Returns a 429 response if either limit is exceeded, or null if allowed.
 */
async function checkRateLimits(
  ctx: RunMutationCtx,
  clientIP: string,
  slug: string
): Promise<Response | null> {
  // Check per-IP rate limit
  const ipLimit = await rateLimiter.limit(ctx, "publicApiPerIP", {
    key: clientIP,
  });

  if (!ipLimit.ok) {
    return rateLimitedResponse(ipLimit.retryAfter ?? 60_000);
  }

  // Check per-tenant rate limit
  const tenantLimit = await rateLimiter.limit(ctx, "publicApiPerTenant", {
    key: slug,
  });

  if (!tenantLimit.ok) {
    return rateLimitedResponse(tenantLimit.retryAfter ?? 60_000);
  }

  return null;
}

/**
 * Extract slug from URL query parameters.
 */
function getSlugFromUrl(request: Request): string | null {
  const url = new URL(request.url);
  return url.searchParams.get("slug");
}

// ===================
// Public API Handlers
// ===================

/**
 * GET /api/public/status/info?slug=X
 * Returns tenant branding information for the public status page.
 */
export const getPublicTenantInfoHandler = httpAction(async (ctx, request) => {
  const slug = getSlugFromUrl(request);
  if (!slug) {
    return errorResponse("Missing required parameter: slug");
  }

  const clientIP = getClientIP(request);

  // Check rate limits
  const rateLimitResponse = await checkRateLimits(ctx, clientIP, slug);
  if (rateLimitResponse) {
    return rateLimitResponse;
  }

  // Check cache
  const cacheKey = `public:${slug}:info`;
  const cached = getCached<unknown>(cacheKey, CACHE_TTL_MS);
  if (cached !== null) {
    return jsonResponse(cached, { cacheHit: true });
  }

  // Fetch from database
  const result = await ctx.runQuery(internal.status.getPublicTenantInfoInternal, {
    slug,
  });

  if (result === null) {
    return errorResponse("Tenant not found or status page disabled", 404);
  }

  // Cache the result
  setCached(cacheKey, result);

  return jsonResponse(result, { cacheHit: false });
});

/**
 * GET /api/public/status/stats?slug=X
 * Returns incident and alert counts for the public status page.
 */
export const getPublicStatsHandler = httpAction(async (ctx, request) => {
  const slug = getSlugFromUrl(request);
  if (!slug) {
    return errorResponse("Missing required parameter: slug");
  }

  const clientIP = getClientIP(request);

  // Check rate limits
  const rateLimitResponse = await checkRateLimits(ctx, clientIP, slug);
  if (rateLimitResponse) {
    return rateLimitResponse;
  }

  // Check cache
  const cacheKey = `public:${slug}:stats`;
  const cached = getCached<unknown>(cacheKey, CACHE_TTL_MS);
  if (cached !== null) {
    return jsonResponse(cached, { cacheHit: true });
  }

  // Fetch from database
  const result = await ctx.runQuery(internal.status.getPublicStatsInternal, {
    slug,
  });

  if (result === null) {
    return errorResponse("Tenant not found or status page disabled", 404);
  }

  // Cache the result
  setCached(cacheKey, result);

  return jsonResponse(result, { cacheHit: false });
});

/**
 * GET /api/public/status/incidents?slug=X
 * Returns active incidents for the public status page.
 */
export const getPublicIncidentsHandler = httpAction(async (ctx, request) => {
  const slug = getSlugFromUrl(request);
  if (!slug) {
    return errorResponse("Missing required parameter: slug");
  }

  const clientIP = getClientIP(request);

  // Check rate limits
  const rateLimitResponse = await checkRateLimits(ctx, clientIP, slug);
  if (rateLimitResponse) {
    return rateLimitResponse;
  }

  // Check cache
  const cacheKey = `public:${slug}:incidents`;
  const cached = getCached<unknown>(cacheKey, CACHE_TTL_MS);
  if (cached !== null) {
    return jsonResponse(cached, { cacheHit: true });
  }

  // Fetch from database
  const result = await ctx.runQuery(
    internal.status.getPublicIncidentsInternal,
    { slug }
  );

  if (result === null) {
    return errorResponse("Tenant not found or status page disabled", 404);
  }

  // Cache the result
  setCached(cacheKey, result);

  return jsonResponse(result, { cacheHit: false });
});

/**
 * GET /api/public/status/weather?slug=X
 * Returns active weather alerts for the public status page.
 */
export const getPublicWeatherAlertsHandler = httpAction(async (ctx, request) => {
  const slug = getSlugFromUrl(request);
  if (!slug) {
    return errorResponse("Missing required parameter: slug");
  }

  const clientIP = getClientIP(request);

  // Check rate limits
  const rateLimitResponse = await checkRateLimits(ctx, clientIP, slug);
  if (rateLimitResponse) {
    return rateLimitResponse;
  }

  // Check cache
  const cacheKey = `public:${slug}:weather`;
  const cached = getCached<unknown>(cacheKey, CACHE_TTL_MS);
  if (cached !== null) {
    return jsonResponse(cached, { cacheHit: true });
  }

  // Fetch from database
  const result = await ctx.runQuery(
    internal.status.getPublicWeatherAlertsInternal,
    { slug }
  );

  if (result === null) {
    return errorResponse("Tenant not found or status page disabled", 404);
  }

  // Cache the result
  setCached(cacheKey, result);

  return jsonResponse(result, { cacheHit: false });
});

/**
 * GET /api/public/status/history?slug=X&days=30
 * Returns incident history for the timeline on the public status page.
 */
export const getIncidentHistoryHandler = httpAction(async (ctx, request) => {
  const url = new URL(request.url);
  const slug = url.searchParams.get("slug");
  const daysParam = url.searchParams.get("days");

  if (!slug) {
    return errorResponse("Missing required parameter: slug");
  }

  // Parse days parameter (default to 30)
  const days = daysParam ? parseInt(daysParam, 10) : 30;
  if (isNaN(days) || days < 1 || days > 365) {
    return errorResponse("Invalid days parameter: must be between 1 and 365");
  }

  const clientIP = getClientIP(request);

  // Check rate limits
  const rateLimitResponse = await checkRateLimits(ctx, clientIP, slug);
  if (rateLimitResponse) {
    return rateLimitResponse;
  }

  // Check cache (include days in cache key)
  const cacheKey = `public:${slug}:history:${days}`;
  const cached = getCached<unknown>(cacheKey, CACHE_TTL_MS);
  if (cached !== null) {
    return jsonResponse(cached, { cacheHit: true });
  }

  // Fetch from database
  const result = await ctx.runQuery(
    internal.status.getIncidentHistoryInternal,
    { slug, days }
  );

  if (result === null) {
    return errorResponse("Tenant not found or status page disabled", 404);
  }

  // Cache the result
  setCached(cacheKey, result);

  return jsonResponse(result, { cacheHit: false });
});

/**
 * Rate-limited tenant lookup handler.
 * Wraps the existing tenant lookup with rate limiting.
 */
export const getTenantByIdHandler = httpAction(async (ctx, request) => {
  const url = new URL(request.url);
  const pathParts = url.pathname.split("/");
  const tenantId = pathParts[pathParts.length - 1];

  if (!tenantId) {
    return errorResponse("Tenant ID required");
  }

  const clientIP = getClientIP(request);

  // Check per-IP rate limit (stricter for tenant lookup due to enumeration risk)
  const ipLimit = await rateLimiter.limit(ctx, "tenantLookupPerIP", {
    key: clientIP,
  });

  if (!ipLimit.ok) {
    return rateLimitedResponse(ipLimit.retryAfter ?? 60_000);
  }

  // Proceed with tenant lookup
  try {
    const tenant = await ctx.runQuery(internal.tenants.getByIdInternal, {
      tenantId: tenantId as any,
    });

    if (!tenant) {
      return errorResponse("Tenant not found", 404);
    }

    return jsonResponse({ slug: tenant.slug });
  } catch (error) {
    console.error("[Tenant Lookup] Error:", error);
    return new Response("Internal server error", { status: 500 });
  }
});
