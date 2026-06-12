import { Redis } from '@upstash/redis/cloudflare';

let redisInstance: Redis | null = null;

export function getRedis(env: any) {
  if (!redisInstance) {
    const url = env?.UPSTASH_REDIS_REST_URL || env?.REDIS_URL || process.env.UPSTASH_REDIS_REST_URL || process.env.REDIS_URL!;
    const token = env?.UPSTASH_REDIS_REST_TOKEN || env?.REDIS_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN || process.env.REDIS_TOKEN!;
    redisInstance = new Redis({ url, token });
  }
  return redisInstance;
}


export async function getCached<T>(
  env: any,
  key: string,
  fetcher: () => Promise<T>,
  ttl = 300,
): Promise<T> {
  try {
    const redis = getRedis(env);
    const cached = await redis.get<T>(key);
    if (cached !== null && cached !== undefined) return cached;
    const fresh = await fetcher();
    await redis.set(key, JSON.stringify(fresh), { ex: ttl });
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
