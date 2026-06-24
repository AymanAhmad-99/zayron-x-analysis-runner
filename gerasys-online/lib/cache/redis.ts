import { Redis } from '@upstash/redis/cloudflare';

let redisInstance: Redis | null = null;

const CACHE_OPERATION_TIMEOUT_MS = 1500;

function getRedisConfig(env: any) {
  const url =
    env?.UPSTASH_REDIS_REST_URL ||
    env?.REDIS_URL ||
    process.env.UPSTASH_REDIS_REST_URL ||
    process.env.REDIS_URL ||
    null;
  const token =
    env?.UPSTASH_REDIS_REST_TOKEN ||
    env?.REDIS_TOKEN ||
    process.env.UPSTASH_REDIS_REST_TOKEN ||
    process.env.REDIS_TOKEN ||
    null;

  if (!url || !token) {
    return null;
  }

  return { url, token };
}

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error(`${label} timed out after ${ms}ms`));
    }, ms);

    promise.then(
      (value) => {
        clearTimeout(timeout);
        resolve(value);
      },
      (error) => {
        clearTimeout(timeout);
        reject(error);
      },
    );
  });
}

function normalizeCachedValue<T>(value: T): T {
  if (typeof value !== 'string') {
    return value;
  }

  try {
    return JSON.parse(value) as T;
  } catch {
    return value;
  }
}

export function getRedis(env: any) {
  const config = getRedisConfig(env);
  if (!config) {
    return null;
  }

  if (!redisInstance) {
    redisInstance = new Redis(config);
  }

  return redisInstance;
}

export async function getCached<T>(
  env: any,
  key: string,
  fetcher: () => Promise<T>,
  ttl = 300,
): Promise<T> {
  const redis = getRedis(env);
  if (!redis) {
    return fetcher();
  }

  try {
    const cached = await withTimeout(
      redis.get<T>(key),
      CACHE_OPERATION_TIMEOUT_MS,
      `Redis GET ${key}`,
    );
    if (cached !== null && cached !== undefined) return normalizeCachedValue(cached);

    const fresh = await fetcher();
    void withTimeout(
      redis.set(key, fresh, { ex: ttl }),
      CACHE_OPERATION_TIMEOUT_MS,
      `Redis SET ${key}`,
    ).catch((error) => {
      console.error(`[REDIS FALLBACK] Error writing key "${key}" to cache:`, error);
    });

    return fresh;
  } catch (error) {
    console.error(
      `[REDIS FALLBACK] Error accessing key "${key}", falling back directly to DB:`,
      error,
    );
    return fetcher();
  }
}

export const getCachedOrFetch = getCached;
