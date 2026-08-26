type CacheBinding = {
  get(key: string): Promise<string | null>;
  put(key: string, value: string, options?: { expirationTtl?: number }): Promise<void>;
};

type Limiter = {
  limit(identifier: string): Promise<{ success: boolean; remaining: number; reset: number }>;
};

function resolveCacheBinding(): CacheBinding | null {
  const binding =
    (globalThis as any).ZAYRON_CACHE ??
    (globalThis as any).NEXT_INC_CACHE_KV ??
    (globalThis as any).__env__?.ZAYRON_CACHE ??
    (globalThis as any).env?.ZAYRON_CACHE ??
    null;

  return binding ?? null;
}

function getWindowKey(label: string, identifier: string, windowSeconds: number, now = Date.now()) {
  const windowStart = Math.floor(now / (windowSeconds * 1000)) * windowSeconds * 1000;
  return `zayron-x:ratelimit:${label}:${windowStart}:${identifier}`;
}

function createLimiter(maxRequests: number, windowSeconds: number, label: string): Limiter | null {
  const cache = resolveCacheBinding();
  if (!cache) {
    return null;
  }

  return {
    async limit(identifier: string) {
      const now = Date.now();
      const key = getWindowKey(label, identifier, windowSeconds, now);
      const raw = await cache.get(key);
      const current = raw ? Number.parseInt(raw, 10) : 0;
      const next = Number.isFinite(current) ? current + 1 : 1;
      const remaining = Math.max(maxRequests - next, 0);
      const reset = Math.ceil((Math.floor(now / (windowSeconds * 1000)) * windowSeconds * 1000 + windowSeconds * 1000 - now) / 1000);

      if (next > maxRequests) {
        return { success: false, remaining: 0, reset };
      }

      await cache.put(key, String(next), { expirationTtl: windowSeconds });
      return { success: true, remaining, reset };
    },
  };
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

export async function checkRateLimit(
  limiter: Limiter | null,
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
