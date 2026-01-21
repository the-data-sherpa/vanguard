import { RateLimiter, MINUTE } from "@convex-dev/rate-limiter";
import { components } from "./_generated/api";

// ===================
// Rate Limiter Configuration
// ===================

export const rateLimiter = new RateLimiter(components.rateLimiter, {
  // Public API rate limits - per IP address
  // Allows 60 requests per minute with burst of 15
  publicApiPerIP: {
    kind: "token bucket",
    rate: 60,
    period: MINUTE,
    capacity: 15,
  },
  // Public API rate limits - per tenant slug
  // Allows 200 requests per minute with burst of 50
  publicApiPerTenant: {
    kind: "token bucket",
    rate: 200,
    period: MINUTE,
    capacity: 50,
  },
  // Tenant lookup endpoint - stricter due to enumeration risk
  // 20 requests per minute with burst of 5
  tenantLookupPerIP: {
    kind: "token bucket",
    rate: 20,
    period: MINUTE,
    capacity: 5,
  },
});

// ===================
// Helper Functions
// ===================

/**
 * Extract client IP address from request headers.
 * Checks X-Forwarded-For (for proxies/load balancers) and X-Real-IP.
 */
export function getClientIP(request: Request): string {
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) {
    // X-Forwarded-For can contain multiple IPs: client, proxy1, proxy2, ...
    // The first one is the original client IP
    return forwardedFor.split(",")[0].trim();
  }

  const realIP = request.headers.get("x-real-ip");
  if (realIP) {
    return realIP.trim();
  }

  return "unknown";
}

/**
 * Generate a 429 Too Many Requests response with proper headers.
 */
export function rateLimitedResponse(retryAfterMs: number): Response {
  const retryAfterSeconds = Math.ceil(retryAfterMs / 1000);

  return new Response(
    JSON.stringify({
      error: "Too Many Requests",
      message: "Rate limit exceeded. Please try again later.",
      retryAfter: retryAfterSeconds,
    }),
    {
      status: 429,
      headers: {
        "Content-Type": "application/json",
        "Retry-After": String(retryAfterSeconds),
      },
    }
  );
}

/**
 * Generate a JSON response with optional cache headers.
 */
export function jsonResponse(
  data: unknown,
  options: {
    status?: number;
    cacheHit?: boolean;
    maxAge?: number;
  } = {}
): Response {
  const { status = 200, cacheHit, maxAge = 30 } = options;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  // Add cache debugging header
  if (cacheHit !== undefined) {
    headers["X-Cache"] = cacheHit ? "HIT" : "MISS";
  }

  // Add cache control header for successful responses
  if (status === 200 && maxAge > 0) {
    headers["Cache-Control"] = `public, max-age=${maxAge}`;
  }

  return new Response(JSON.stringify(data), { status, headers });
}

/**
 * Generate an error response.
 */
export function errorResponse(
  message: string,
  status: number = 400
): Response {
  return new Response(
    JSON.stringify({
      error: status === 404 ? "Not Found" : "Bad Request",
      message,
    }),
    {
      status,
      headers: { "Content-Type": "application/json" },
    }
  );
}
