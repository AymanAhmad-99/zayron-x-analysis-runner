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

async function delayIfChaos(): Promise<void> {
  const latencyStr = process.env.CHAOS_REDIS_LATENCY_MS;
  if (latencyStr) {
    const latency = parseInt(latencyStr, 10);
    if (!isNaN(latency) && latency > 0) {
      await new Promise((resolve) => setTimeout(resolve, latency));
    }
  }
}

async function redisGet<T>(key: string): Promise<T | null> {
  if (!redis) return null;
  await delayIfChaos();
  return redis.get<T>(key);
}

async function redisSet<T>(
  key: string,
  value: T,
  options?: { ex?: number; nx?: boolean }
): Promise<"OK" | null> {
  if (!redis) return null;
  await delayIfChaos();
  return redis.set(key, value as any, options as any);
}

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
// Read-Through Cache with Circuit Breaker & Request Coalescing
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
      redisGet<T>(key),
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

  // Cache miss: request coalescing lock to prevent cache stampede
  const lockKey = `lock:${key}`;
  try {
    const acquired = await withTimeout(
      redisSet(lockKey, 'locked', { nx: true, ex: 5 }),
      REDIS_TIMEOUT_MS
    );

    if (acquired) {
      // First request (Lock owner): Fetch, populate cache, release lock
      try {
        const freshData = await fetchFn();
        try {
          await withTimeout(
            redisSet(key, freshData, { ex: ttlSeconds }),
            REDIS_TIMEOUT_MS
          );
        } catch (writeError: any) {
          console.warn(
            `[CACHE WRITE FAILURE] Key: ${key}. Reason: ${writeError.message || writeError}`
          );
        }
        return freshData;
      } finally {
        try {
          await withTimeout(redis.del(lockKey), REDIS_TIMEOUT_MS);
        } catch (delError) {
          // Ignore lock deletion failures to prevent blocking execution
        }
      }
    } else {
      // Concurrent requests (Contenders): Poll cache key every 100ms
      const pollInterval = 100;
      const maxRetries = 15; // 1.5 seconds max wait
      for (let i = 0; i < maxRetries; i++) {
        await new Promise((resolve) => setTimeout(resolve, pollInterval));
        try {
          const cachedData = await withTimeout<T | null>(
            redisGet<T>(key),
            REDIS_TIMEOUT_MS
          );
          if (cachedData !== null) {
            return cachedData;
          }
        } catch (pollError) {
          break;
        }
      }
      return fetchFn();
    }
  } catch (lockError: any) {
    console.warn(
      `[CACHE LOCK FAILURE] Key: ${key}. Reason: ${lockError.message || lockError}`
    );
    return fetchFn();
  }
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

  const cached = await redisGet<T>(key);
  if (cached !== null) return cached;

  const data = await fetchFn();
  await redisSet(key, data, { ex: ttl });
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
