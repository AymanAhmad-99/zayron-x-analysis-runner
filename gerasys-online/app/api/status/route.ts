import { NextResponse } from "next/server";

// ═══════════════════════════════════════════════════════════════
// ZAYRON-X — Platform Health Endpoint
//
// Checks the health of every critical dependency and returns
// a unified status response.  Called by the /status page and
// can be wired into external monitoring (BetterStack, UptimeRobot).
//
// Compatible with Cloudflare Workers (OpenNext) and Node.js.
// ═══════════════════════════════════════════════════════════════

export const dynamic = "force-dynamic";

// ── Types ────────────────────────────────────────────────────

type HealthStatus = "healthy" | "degraded" | "unhealthy" | "unknown";

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
    supabase: HealthCheck;
    redis: HealthCheck;
    kv: HealthCheck;
    gemini: HealthCheck;
  };
}

// ── Helpers ──────────────────────────────────────────────────

/** Cross-runtime high-resolution timing (works on Workers + Node.js). */
function nowMs(): number {
  // performance.now() exists on Workers; Date.now() is the fallback.
  return typeof performance !== "undefined" ? performance.now() : Date.now();
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

async function checkSupabase(): Promise<HealthCheck> {
  const start = nowMs();
  try {
    const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_ANON_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!url || !key) {
      return { status: "unhealthy", latencyMs: 0, message: "Missing SUPABASE_URL or SUPABASE_ANON_KEY" };
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3000);

    const res = await fetch(`${url}/rest/v1/`, {
      headers: { apikey: key, Authorization: `Bearer ${key}` },
      signal: controller.signal,
    });
    clearTimeout(timeout);

    const latencyMs = elapsedMs(start);

    if (res.ok || res.status === 200) {
      return { status: "healthy", latencyMs };
    }
    return { status: "degraded", latencyMs, message: `HTTP ${res.status}` };
  } catch (error: any) {
    const latencyMs = elapsedMs(start);
    return { status: "unhealthy", latencyMs, message: error.message ?? "Unknown error" };
  }
}

async function checkRedis(): Promise<HealthCheck> {
  const start = nowMs();
  try {
    const redisUrl = process.env.REDIS_URL;
    const redisToken = process.env.REDIS_TOKEN;

    if (!redisUrl || !redisToken) {
      return { status: "unknown", latencyMs: 0, message: "REDIS_URL or REDIS_TOKEN not configured" };
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 2000);

    const res = await fetch(`${redisUrl}/ping`, {
      headers: { Authorization: `Bearer ${redisToken}` },
      signal: controller.signal,
    });
    clearTimeout(timeout);

    const latencyMs = elapsedMs(start);
    const body = await res.text();

    if (res.ok && body.includes("PONG")) {
      return { status: "healthy", latencyMs };
    }
    return { status: "degraded", latencyMs, message: `Unexpected response: ${body.slice(0, 80)}` };
  } catch (error: any) {
    const latencyMs = elapsedMs(start);
    return { status: "unhealthy", latencyMs, message: error.message ?? "Unknown error" };
  }
}

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
        status: isWorkerEnv ? "degraded" : "unknown",
        latencyMs: 0,
        message: isWorkerEnv
          ? "KV binding ZAYRON_CACHE not found in Worker context"
          : "KV not available in local dev — deploy to Cloudflare to verify",
      };
    }

    // Write + read a health-check key to verify the binding is functional.
    const healthKey = "__health_check__";
    await kvBinding.put(healthKey, String(Date.now()), { expirationTtl: 60 });
    await kvBinding.get(healthKey);

    const latencyMs = elapsedMs(start);
    return { status: "healthy", latencyMs };
  } catch (error: any) {
    const latencyMs = elapsedMs(start);
    return { status: "unhealthy", latencyMs, message: error.message ?? "Unknown error" };
  }
}

async function checkGemini(): Promise<HealthCheck> {
  const start = nowMs();
  try {
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return { status: "unknown", latencyMs: 0, message: "GEMINI_API_KEY not configured" };
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
      return { status: "healthy", latencyMs };
    }
    const body = await res.json().catch(() => ({}));
    return { status: "degraded", latencyMs, message: (body as any).error?.message ?? `HTTP ${res.status}` };
  } catch (error: any) {
    const latencyMs = elapsedMs(start);
    return { status: "unhealthy", latencyMs, message: error.message ?? "Unknown error" };
  }
}

// ── Uptime counter (in-memory, resets on cold start) ──────────

const startTime = Date.now();

// ── Route Handler ────────────────────────────────────────────

export async function GET(): Promise<NextResponse<HealthResponse>> {
  const worker: HealthCheck = { status: "healthy", latencyMs: 0, message: "Responding" };

  // Fan-out all dependency checks concurrently
  const [supabase, redis, kv, gemini] = await Promise.all([
    checkSupabase(),
    checkRedis(),
    checkKV(),
    checkGemini(),
  ]);

  const overall = [worker, supabase, redis, kv, gemini].reduce<HealthStatus>(
    (acc, c) => worst(acc, c.status),
    "healthy",
  );

  const uptimeSeconds = Math.floor((Date.now() - startTime) / 1000);

  const response: HealthResponse = {
    timestamp: new Date().toISOString(),
    overall,
    uptime_seconds: uptimeSeconds,
    checks: { worker, supabase, redis, kv, gemini },
  };

  return NextResponse.json(response, {
    status: overall === "healthy" ? 200 : overall === "degraded" ? 200 : 503,
    headers: {
      "Cache-Control": "no-store",
      "X-Health-Overall": overall,
      "X-Health-Supabase": supabase.status,
      "X-Health-Redis": redis.status,
      "X-Health-KV": kv.status,
      "X-Health-Gemini": gemini.status,
    },
  });
}
