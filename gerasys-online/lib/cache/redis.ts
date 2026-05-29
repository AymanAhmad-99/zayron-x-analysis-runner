import { Redis } from "@upstash/redis";

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

export function getRedis(): Redis {
  if (!redis) {
    throw new Error(
      "Redis not configured. Set REDIS_URL and REDIS_TOKEN environment variables."
    );
  }
  return redis;
}

export const CACHE_TTL = {
  HOMEPAGE: 60,
  ARTICLE_LIST: 300,
  CVE_COUNTS: 60,
  TRENDING: 3600,
  CATEGORY: 300,
} as const;

/* ---- Typed cache helpers ---- */
export async function cacheGet<T>(
  key: string,
  fetchFn: () => Promise<T>,
  ttl: number = CACHE_TTL.ARTICLE_LIST
): Promise<T> {
  if (!redis) return fetchFn();

  const cached = await redis.get<T>(key);
  if (cached !== null) return cached;

  const data = await fetchFn();
  await redis.set(key, JSON.stringify(data), { ex: ttl });
  return data;
}

export async function cacheInvalidate(pattern: string): Promise<void> {
  if (!redis) return;
  const keys = await redis.keys(pattern);
  if (keys.length > 0) {
    await redis.del(...keys);
  }
}
