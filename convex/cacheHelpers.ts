// Simple in-memory cache for query results
// Used to reduce database bandwidth for frequently-called queries

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

const cache = new Map<string, CacheEntry<unknown>>();

/**
 * Get cached value if it exists and hasn't expired
 * @param key Cache key
 * @param ttlMs Time to live in milliseconds
 * @returns Cached value or null if expired/missing
 */
export function getCached<T>(key: string, ttlMs: number): T | null {
  const entry = cache.get(key);
  if (!entry) return null;

  const age = Date.now() - entry.timestamp;
  if (age > ttlMs) {
    cache.delete(key);
    return null;
  }

  return entry.data as T;
}

/**
 * Set a value in the cache
 * @param key Cache key
 * @param data Data to cache
 */
export function setCached<T>(key: string, data: T): void {
  cache.set(key, {
    data,
    timestamp: Date.now(),
  });
}

/**
 * Clear a specific cache entry
 * @param key Cache key
 */
export function clearCache(key: string): void {
  cache.delete(key);
}

/**
 * Clear all cache entries
 */
export function clearAllCache(): void {
  cache.clear();
}

/**
 * Generate a tenant-scoped cache key
 * @param tenantId Tenant ID
 * @param suffix Key suffix
 */
export function tenantCacheKey(tenantId: string, suffix: string): string {
  return `${tenantId}:${suffix}`;
}
