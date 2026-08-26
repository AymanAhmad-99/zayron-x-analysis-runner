import { checkRateLimit, getClientIp, searchLimiter } from '@/lib/cache/ratelimit';
import { NextResponse } from 'next/server';

// ═══════════════════════════════════════════════════════════════
// ZAYRON-X — Platform Health Endpoint
//
// Checks the health of every critical dependency and returns
// a unified status response.  Called by the /status page and
// can be wired into external monitoring (BetterStack, UptimeRobot).
//
// Compatible with Cloudflare Workers (OpenNext) and Node.js.
// ═══════════════════════════════════════════════════════════════

export const dynamic = 'force-dynamic';

// ── Types ────────────────────────────────────────────────────

type HealthStatus = 'healthy' | 'degraded' | 'unhealthy' | 'unknown';

interface HealthCheck {
  status: HealthStatus;
  latencyMs: number;
  message?: string;
}

interface HealthResponse {
  timestamp: string;
  overall: HealthStatus;
  uptime_seconds: number;
  checks: {
    worker: HealthCheck;
    kv: HealthCheck;
    gemini: HealthCheck;
  };
}

type PublicHealthStatus = 'ok' | 'degraded' | 'error';

interface PublicHealthResponse {
  status: PublicHealthStatus;
  timestamp: string;
}

interface ErrorResponse {
  error: string;
}

// ── Helpers ──────────────────────────────────────────────────

/** Cross-runtime high-resolution timing (works on Workers + Node.js). */
function nowMs(): number {
  // performance.now() exists on Workers; Date.now() is the fallback.
  return typeof performance !== 'undefined' ? performance.now() : Date.now();
}

function elapsedMs(startMs: number): number {
  return Math.round((nowMs() - startMs) * 100) / 100;
}

function worst(a: HealthStatus, b: HealthStatus): HealthStatus {
  const severity: Record<HealthStatus, number> = {
    healthy: 0,
    degraded: 1,
    unhealthy: 2,
    unknown: 3,
  };
  return severity[a] >= severity[b] ? a : b;
}

// ── Individual Checks ────────────────────────────────────────

async function checkKV(): Promise<HealthCheck> {
  const start = nowMs();
  try {
    // The KV binding is injected into the Worker global scope by
    // Cloudflare, matching the `binding` name in wrangler.toml.
    // In local dev / non-Worker runtimes, it won't exist.
    const kvBinding =
      (globalThis as any).ZAYRON_CACHE ??
      (globalThis as any).__env__?.ZAYRON_CACHE ??
      (globalThis as any).env?.ZAYRON_CACHE;

    if (!kvBinding) {
      const isWorkerEnv = !!(process.env.CF_PAGES || (globalThis as any).addEventListener);
      return {
        status: isWorkerEnv ? 'degraded' : 'unknown',
        latencyMs: 0,
        message: isWorkerEnv
          ? 'KV binding ZAYRON_CACHE not found in Worker context'
          : 'KV not available in local dev — deploy to Cloudflare to verify',
      };
    }

    // Write + read a health-check key to verify the binding is functional.
    const healthKey = '__health_check__';
    await kvBinding.put(healthKey, String(Date.now()), { expirationTtl: 60 });
    await kvBinding.get(healthKey);

    const latencyMs = elapsedMs(start);
    return { status: 'healthy', latencyMs };
  } catch (error: any) {
    const latencyMs = elapsedMs(start);
    return { status: 'unhealthy', latencyMs, message: error.message ?? 'Unknown error' };
  }
}

async function checkGemini(): Promise<HealthCheck> {
  const start = nowMs();
  try {
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return { status: 'unknown', latencyMs: 0, message: 'GEMINI_API_KEY not configured' };
    }

    // Lightweight: list available models (does not consume LLM quota).
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`,
      { signal: controller.signal },
    );
    clearTimeout(timeout);

    const latencyMs = elapsedMs(start);

    if (res.ok) {
      return { status: 'healthy', latencyMs };
    }
    const body = await res.json().catch(() => ({}));
    return {
      status: 'degraded',
      latencyMs,
      message: (body as any).error?.message ?? `HTTP ${res.status}`,
    };
  } catch (error: any) {
    const latencyMs = elapsedMs(start);
    return { status: 'unhealthy', latencyMs, message: error.message ?? 'Unknown error' };
  }
}

// ── Uptime counter (in-memory, resets on cold start) ──────────

const startTime = Date.now();

// ── Route Handler ────────────────────────────────────────────

export async function GET(
  request: Request,
): Promise<NextResponse<HealthResponse | PublicHealthResponse | ErrorResponse>> {
  const ip = getClientIp(request);
  const { allowed, remaining } = await checkRateLimit(searchLimiter, `status:${ip}`);

  if (!allowed) {
    return NextResponse.json(
      { error: 'Too many requests. Please wait a moment.' },
      {
        status: 429,
        headers: {
          'Cache-Control': 'no-store',
          'Retry-After': '60',
          'X-RateLimit-Remaining': String(remaining),
        },
      },
    );
  }

  const worker: HealthCheck = { status: 'healthy', latencyMs: 0, message: 'Responding' };

  // Fan-out all dependency checks concurrently
  const [kv, gemini] = await Promise.all([checkKV(), checkGemini()]);

  const overall = [worker, kv, gemini].reduce<HealthStatus>(
    (acc, c) => worst(acc, c.status),
    'healthy',
  );

  const uptimeSeconds = Math.floor((Date.now() - startTime) / 1000);

  const response: HealthResponse = {
    timestamp: new Date().toISOString(),
    overall,
    uptime_seconds: uptimeSeconds,
    checks: { worker, kv, gemini },
  };

  const hasValidSecret =
    !!process.env.STATUS_SECRET &&
    request.headers.get('X-Status-Secret') === process.env.STATUS_SECRET;

  if (!hasValidSecret) {
    const publicResponse: PublicHealthResponse = {
      status: overall === 'healthy' ? 'ok' : overall === 'degraded' ? 'degraded' : 'error',
      timestamp: response.timestamp,
    };

    return NextResponse.json(publicResponse, {
      status: overall === 'unhealthy' ? 503 : 200,
      headers: {
        'Cache-Control': 'no-store',
        'X-RateLimit-Remaining': String(remaining),
      },
    });
  }

    return NextResponse.json(response, {
      status: overall === 'healthy' ? 200 : overall === 'degraded' ? 200 : 503,
      headers: {
        'Cache-Control': 'no-store',
        'X-RateLimit-Remaining': String(remaining),
        'X-Health-Overall': overall,
        'X-Health-KV': kv.status,
        'X-Health-Gemini': gemini.status,
      },
  });
}
