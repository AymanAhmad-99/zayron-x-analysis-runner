import { Ratelimit } from "@upstash/ratelimit";
import { getRedis } from "./redis";

/**
 * Rate limiter factory — returns separate limiters per window/endpoint.
 * Falls back to a no-op passthrough when Redis is not configured.
 */

function createLimiter(maxRequests: number, windowSeconds: number, label: string) {
  try {
    const redis = getRedis();
    return new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(maxRequests, `${windowSeconds} s`),
      analytics: true,
      prefix: `zayron-x:ratelimit:${label}`,
    });
  } catch {
    // Redis not configured — return null so callers short-circuit
    return null;
  }
}

/** 3 requests per 60s — newsletter subscription */
export const subscribeLimiter = createLimiter(3, 60, "subscribe");

/** 20 requests per 60s — search endpoint */
export const searchLimiter = createLimiter(20, 60, "search");

/** 30 requests per 60s — article view increment */
export const viewsLimiter = createLimiter(30, 60, "views");


export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  reset: number;
}

export async function checkRateLimit(
  limiter: ReturnType<typeof createLimiter>,
  identifier: string,
): Promise<RateLimitResult> {
  if (!limiter) {
    // Redis not configured — FAIL CLOSED to prevent abuse
    console.error("[SECURITY] Rate limiter unavailable — denying request for:", identifier);
    return { allowed: false, remaining: 0, reset: 60 };
  }

  const result = await limiter.limit(identifier);
  return {
    allowed: result.success,
    remaining: result.remaining,
    reset: result.reset,
  };
}
