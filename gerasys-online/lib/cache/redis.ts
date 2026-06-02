import { Redis } from '@upstash/redis';

// ═══════════════════════════════════════════════════════════════
// ZAYRON-X — Unified Redis Layer
//
// Merged from redis.ts + redis-client.ts (DeepTrace-2027 Audit).
// Provides:
//   - getRedis()          → raw Redis client (used by ratelimit.ts)
//   - getCachedOrFetch<T>() → Circuit-breaker read-through cache
//   - cacheInvalidate()   → wildcard key invalidation
//   - CACHE_TTL constants → canonical TTL values for all layers
// ═══════════════════════════════════════════════════════════════

const redisUrl = process.env.REDIS_URL;
const redisToken = process.env.REDIS_TOKEN;

let redis: Redis | null = null;

const isValidUrl =
  redisUrl &&
  redisUrl.startsWith('https://') &&
  !redisUrl.includes('YOUR_UPSTASH_REDIS_URL');
const isValidToken =
  redisToken &&
  !redisToken.includes('YOUR_UPSTASH_REDIS_TOKEN') &&
  !redisToken.includes('PLACEHOLDER');

if (isValidUrl && isValidToken) {
  redis = new Redis({
    url: redisUrl!,
    token: redisToken!,
  });
}

/** Raw Redis client — for rate-limiters and direct access. */
export function getRedis(): Redis {
  if (!redis) {
    throw new Error(
      'Redis not configured. Set REDIS_URL and REDIS_TOKEN environment variables.',
    );
  }
  return redis;
}

// ═══════════════════════════════════════════════════════════════
// Canonical TTL Constants (seconds)
// ═══════════════════════════════════════════════════════════════

export const CACHE_TTL = {
  HOMEPAGE: 60,
  ARTICLE_LIST: 300,
  ARTICLE_DETAIL: 120,
  CVE_FEED: 60,
  TRENDING: 3600,
  RSS_FEED: 3600,
  SEARCH: 30,
  CATEGORY: 300,
} as const;

// ═══════════════════════════════════════════════════════════════
// Circuit Breaker — Timeout Wrapper
// ═══════════════════════════════════════════════════════════════

const REDIS_TIMEOUT_MS = 1000;

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`Redis operation timed out after ${ms}ms`));
    }, ms);

    promise
      .then((res) => {
        clearTimeout(timer);
        resolve(res);
      })
      .catch((err) => {
        clearTimeout(timer);
        reject(err);
      });
  });
}

// ═══════════════════════════════════════════════════════════════
// Read-Through Cache with Circuit Breaker
// ═══════════════════════════════════════════════════════════════

export async function getCachedOrFetch<T>(
  key: string,
  fetchFn: () => Promise<T>,
  ttlSeconds: number = 60,
): Promise<T> {
  if (!redis) {
    console.warn(
      `[CACHE] Redis unconfigured — fetching directly for key: ${key}`,
    );
    return fetchFn();
  }

  // Layer 1: Attempt cache read with strict timeout
  try {
    const cachedData = await withTimeout<T | null>(
      redis.get<T>(key),
      REDIS_TIMEOUT_MS,
    );

    if (cachedData !== null) {
      return cachedData;
    }
  } catch (error: any) {
    console.error(
      `[CACHE CIRCUIT BREAKER] Read failed for key: ${key}. Reason: ${error.message || error}`,
    );
    return fetchFn();
  }

  // Layer 2: Fetch fresh data from source
  const freshData = await fetchFn();

  // Layer 3: Write back to cache (fire-and-forget — failure is non-fatal)
  try {
    await withTimeout(
      redis.set(key, JSON.stringify(freshData), { ex: ttlSeconds }),
      REDIS_TIMEOUT_MS,
    );
  } catch (error: any) {
    console.warn(
      `[CACHE WRITE FAILURE] Key: ${key}. Reason: ${error.message || error}`,
    );
  }

  return freshData;
}

// ═══════════════════════════════════════════════════════════════
// Simple cache-get (no circuit breaker — for non-critical reads)
// ═══════════════════════════════════════════════════════════════

export async function cacheGet<T>(
  key: string,
  fetchFn: () => Promise<T>,
  ttl: number = CACHE_TTL.ARTICLE_LIST,
): Promise<T> {
  if (!redis) return fetchFn();

  const cached = await redis.get<T>(key);
  if (cached !== null) return cached;

  const data = await fetchFn();
  await redis.set(key, JSON.stringify(data), { ex: ttl });
  return data;
}

// ═══════════════════════════════════════════════════════════════
// Key Invalidation (wildcard pattern)
// ═══════════════════════════════════════════════════════════════

export async function cacheInvalidate(pattern: string): Promise<void> {
  if (!redis) return;
  const keys = await redis.keys(pattern);
  if (keys.length > 0) {
    await redis.del(...keys);
  }
}
