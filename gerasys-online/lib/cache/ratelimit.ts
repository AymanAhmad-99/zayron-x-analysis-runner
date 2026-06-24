import { Ratelimit } from '@upstash/ratelimit';
import { getRedis } from './redis';

function createLimiter(maxRequests: number, windowSeconds: number, label: string) {
  try {
    const env = process.env;
    const redis = getRedis(env);
    if (!redis) {
      return null;
    }

    return new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(maxRequests, `${windowSeconds} s`),
      analytics: true,
      prefix: `zayron-x:ratelimit:${label}`,
    });
  } catch {
    return null;
  }
}

/** 3 requests per 60s — newsletter subscription */
export const subscribeLimiter = createLimiter(3, 60, 'subscribe');

/** 5 requests per 60s — login (brute-force protection) */
export const loginLimiter = createLimiter(5, 60, 'login');

/** 3 requests per 60s — registration */
export const registerLimiter = createLimiter(3, 60, 'register');

/** 20 requests per 60s — search endpoint */
export const searchLimiter = createLimiter(20, 60, 'search');

/** 30 requests per 60s — article view increment */
export const viewsLimiter = createLimiter(30, 60, 'views');

/** 60 requests per 60s — public article list */
export const articlesLimiter = createLimiter(60, 60, 'articles');

/** 120 requests per 60s — public CVE feed */
export const cvesLimiter = createLimiter(120, 60, 'cves');

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  reset: number;
}

/**
 * Reusable rate-limit checker.
 * Fails CLOSED: if the limiter is unavailable, the request is denied.
 */
export async function checkRateLimit(
  limiter: ReturnType<typeof createLimiter>,
  identifier: string,
): Promise<RateLimitResult> {
  if (!limiter) {
    console.error('[SECURITY] Rate limiter unavailable — denying request for:', identifier);
    return { allowed: false, remaining: 0, reset: 60 };
  }

  const result = await limiter.limit(identifier);
  return {
    allowed: result.success,
    remaining: result.remaining,
    reset: result.reset,
  };
}

/**
 * Extracts a stable client identifier from a Request.
 * Prefers CF-Connecting-IP, falls back to X-Forwarded-For (split-parsed),
 * then X-Real-IP, then 'unknown'. Supports CHAOS_STRIP_CF_HEADERS simulation.
 */
export function getClientIp(request: Request): string {
  const stripCf = process.env.CHAOS_STRIP_CF_HEADERS === 'true';
  const cfConnectingIp = stripCf ? null : request.headers.get('CF-Connecting-IP');

  if (cfConnectingIp) {
    return cfConnectingIp.trim();
  }

  const xForwardedFor = request.headers.get('x-forwarded-for');
  if (xForwardedFor) {
    const parts = xForwardedFor.split(',');
    const ip = parts[0]?.trim();
    if (ip) return ip;
  }

  return request.headers.get('x-real-ip')?.trim() ?? 'unknown';
}
