// services/rateLimiter.ts
import PocketBase from "pocketbase";

const pb = new PocketBase(process.env.POCKETBASE_URL || "http://localhost:8090");

export interface RateLimitConfig {
  limit: number;
  intervalSec: number;
}

/**
 * Token‑bucket rate limiter stored per tenant/resource in PocketBase.
 * Returns whether the request is allowed and a `Retry‑After` header value (seconds) if denied.
 */
export async function checkAndConsume(
  tenantId: string,
  resource: string,
  config: RateLimitConfig
): Promise<{ allowed: boolean; retryAfter?: number }> {
  const now = new Date();
  const refillIntervalMs = config.intervalSec * 1000;

  // Find or create a counter for this tenant/resource
  let counter;
  try {
    counter = await pb.collection("rate_counters").getFirstListItem(`tenantId="${tenantId}" && resource="${resource}"`);
  } catch {
    // Not found – create with a full bucket
    await pb.collection("rate_counters").create({
      tenantId,
      resource,
      tokens: config.limit,
      lastRefill: now.toISOString(),
    });
    return { allowed: true };
  }

  const lastRefill = new Date(counter.lastRefill);
  const elapsed = now.getTime() - lastRefill.getTime();

  // Refill tokens based on elapsed time
  const tokensToAdd = Math.floor(elapsed / refillIntervalMs);
  let tokens = Math.min(counter.tokens + tokensToAdd, config.limit);

  if (tokens >= 1) {
    // Allow request and consume one token
    tokens -= 1;
    await pb.collection("rate_counters").update(counter.id, {
      tokens,
      lastRefill: (tokensToAdd > 0 ? now : lastRefill).toISOString(),
    });
    return { allowed: true };
  } else {
    // Compute when the next token will be available
    const nextRefillTime = new Date(lastRefill.getTime() + refillIntervalMs);
    const retryAfter = Math.ceil((nextRefillTime.getTime() - now.getTime()) / 1000);
    return { allowed: false, retryAfter: Math.max(1, retryAfter) };
  }
}