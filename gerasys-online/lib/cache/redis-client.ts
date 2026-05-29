import { Redis } from "@upstash/redis";

// Initialize Upstash Redis client with credentials from environment variables
const redisUrl = process.env.REDIS_URL;
const redisToken = process.env.REDIS_TOKEN;

let redis: Redis | null = null;

const isValidUrl = redisUrl && redisUrl.startsWith("https://") && !redisUrl.includes("YOUR_UPSTASH_REDIS_URL");
const isValidToken = redisToken && !redisToken.includes("YOUR_UPSTASH_REDIS_TOKEN") && !redisToken.includes("PLACEHOLDER");

if (isValidUrl && isValidToken) {
  redis = new Redis({
    url: redisUrl!,
    token: redisToken!,
  });
}

/**
 * Executes a promise with a strictly enforced timeout circuit breaker.
 */
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

/**
 * 3-TIER CACHE LAYER 1: Redis Circuit Breaker Wrapper.
 * 
 * Attempts to retrieve data from Upstash Redis cache. If Redis is unavailable,
 * throws connection errors, or times out (> 1000ms), it fails gracefully,
 * executes the primary database retrieval function, and logs the incident without
 * crashing the user request pipeline.
 * 
 * @param key The unique cache identifier string.
 * @param fetchFn The fallback asynchronous database retrieval query.
 * @param ttlSeconds Time-to-live cache duration in seconds.
 */
export async function getCachedOrFetch<T>(
  key: string,
  fetchFn: () => Promise<T>,
  ttlSeconds: number = 60
): Promise<T> {
  const TIMEOUT_LIMIT_MS = 1000;

  // Gracefully fallback to database if Redis is not configured
  if (!redis) {
    console.warn(`[CACHE WARNING] Redis client unconfigured. Fetching directly from source for key: ${key}`);
    return fetchFn();
  }

  try {
    // Layer 1.1: Attempt cache read with strict timeout enforcement
    const cachedData = await withTimeout<T | null>(
      redis.get<T>(key),
      TIMEOUT_LIMIT_MS
    );

    if (cachedData !== null) {
      console.log(`[CACHE HIT] Key: ${key}`);
      return cachedData;
    }

    console.log(`[CACHE MISS] Key: ${key}. Fetching fresh source data...`);
  } catch (error: any) {
    // Layer 1.2: Graceful Circuit Breaker Trigger on Failure/Timeout
    console.error(
      `[CACHE CIRCUIT BREAKER ENGAGED] Fail-safe read engaged for key: ${key}. Reason: ${error.message || error}`
    );
    // Proceed directly to primary datasource retrieval to prevent user-facing failure
    return fetchFn();
  }

  // Layer 1.3: Fetch fresh data and asynchronously write back to cache
  const freshData = await fetchFn();

  try {
    // Write back asynchronously to avoid blocking the user response path
    await withTimeout(
      redis.set(key, JSON.stringify(freshData), { ex: ttlSeconds }),
      TIMEOUT_LIMIT_MS
    );
    console.log(`[CACHE WRITE SUCCESS] Key: ${key} populated with TTL: ${ttlSeconds}s`);
  } catch (error: any) {
    console.warn(`[CACHE WRITE FAILURE] Failed to write back key: ${key}. Reason: ${error.message || error}`);
  }

  return freshData;
}
