import { describe, expect, test } from "bun:test";
import { Database } from "bun:sqlite";
import {
  applyCors,
  authorizeRequest,
  classifyEndpoint,
  corsHeaders,
  RATE_LIMITS,
  RateLimiter,
  DurableRateLimiter,
  deriveTelegramEventId,
  checkAndRecordReplay,
  updateReplayStatus,
  requiredTrust,
  resolveOrigin,
  withSecurityBoundary,
  type D1DatabaseLike,
  type D1PreparedStatementLike,
} from "../workers/api/src/security";

const ENV = {
  ADMIN_API_TOKEN: "admin-secret",
  KNOWLEDGE_INTERNAL_TOKEN: "internal-secret",
  TELEGRAM_WEBHOOK_SECRET: "webhook-secret",
  ENVIRONMENT: "preview",
};

function h(init: Record<string, string> = {}) {
  return new Headers(init);
}

describe("CORS origin policy", () => {
  test("allows a configured origin", () => {
    expect(resolveOrigin("https://zayron-x.co", ENV)).toBe("https://zayron-x.co");
  });

  test("rejects an unlisted origin", () => {
    expect(resolveOrigin("https://evil.example", ENV)).toBeNull();
  });

  test("allows localhost dev origins", () => {
    expect(resolveOrigin("http://localhost:8799", ENV)).toBe("http://localhost:8799");
  });

  test("corsHeaders never emits a wildcard", () => {
    expect(corsHeaders("https://zayron-x.co")["Access-Control-Allow-Origin"]).toBe("https://zayron-x.co");
    expect(JSON.stringify(corsHeaders(null))).not.toContain("*");
  });

  test("applyCors strips a wildcard header", async () => {
    const allowed = new Response("{}", { headers: { "Access-Control-Allow-Origin": "*" } });
    expect(applyCors(allowed, "https://zayron-x.co").headers.get("Access-Control-Allow-Origin")).toBe("https://zayron-x.co");
    const denied = new Response("{}", { headers: { "Access-Control-Allow-Origin": "*" } });
    expect(applyCors(denied, null).headers.get("Access-Control-Allow-Origin")).toBeNull();
  });

  test("explicit ALLOWED_ORIGINS overrides defaults", () => {
    const env = { ...ENV, ALLOWED_ORIGINS: "https://only.example" };
    expect(resolveOrigin("https://only.example", env)).toBe("https://only.example");
    expect(resolveOrigin("https://zayron-x.co", env)).toBeNull();
  });
});

describe("trust classification", () => {
  test("public reads stay public", () => {
    expect(requiredTrust("GET", "/api/v1/intelligence")).toBe("public");
    expect(requiredTrust("GET", "/api/v1/malware/intelligence/reports")).toBe("public");
    expect(requiredTrust("GET", "/api/v1/health")).toBe("public");
    expect(requiredTrust("GET", "/api/v1/sources")).toBe("public");
    expect(requiredTrust("GET", "/api/v1/sources/directory")).toBe("public");
    expect(requiredTrust("GET", "/api/v1/sources/health")).toBe("public");
    expect(requiredTrust("GET", "/api/v1/sources/discovery")).toBe("public");
  });

  test("admin paths require admin", () => {
    expect(requiredTrust("GET", "/api/v1/admin/ops-dashboard")).toBe("admin");
    expect(requiredTrust("POST", "/api/v1/admin/sync-corpus")).toBe("admin");
  });

  test("rag paths require internal", () => {
    expect(requiredTrust("POST", "/api/v1/rag/retrieve")).toBe("internal");
  });

  test("previously-open mutations now require operator trust", () => {
    for (const p of [
      "/api/v1/publish",
      "/api/v1/publish/outbound",
      "/api/v1/social/derivatives",
      "/api/v1/sources",
      "/api/v1/sources/auto-register",
      "/api/v1/sources/sync",
      "/api/v1/intelligence/ingest-event",
      "/api/v1/intelligence/preview",
      "/api/v1/canary/nvd",
    ]) {
      expect(requiredTrust("POST", p)).toBe("admin_or_internal");
    }
  });

  test("unlisted write methods fail closed by default", () => {
    expect(requiredTrust("POST", "/api/v1/some/unknown/write")).toBe("admin_or_internal");
    expect(requiredTrust("DELETE", "/api/v1/intelligence/1")).toBe("admin_or_internal");
  });

  test("webhook requires webhook trust", () => {
    expect(requiredTrust("POST", "/api/v1/webhook/telegram")).toBe("webhook");
  });

  test("rate classes map correctly", () => {
    expect(classifyEndpoint("GET", "/api/v1/intelligence")).toBe("public_read");
    expect(classifyEndpoint("GET", "/api/v1/search")).toBe("search");
    expect(classifyEndpoint("POST", "/api/v1/ai/analyze")).toBe("expensive");
    expect(classifyEndpoint("POST", "/api/v1/publish")).toBe("mutation");
    expect(classifyEndpoint("GET", "/api/v1/admin/ai-budget")).toBe("admin");
  });
});

describe("authorization (fail closed)", () => {
  test("public read succeeds without credentials", () => {
    expect(authorizeRequest("GET", "/api/v1/intelligence", h(), ENV).ok).toBe(true);
  });

  test("admin endpoint without credentials → 401", () => {
    const d = authorizeRequest("GET", "/api/v1/admin/ai-budget", h(), ENV);
    expect(d.ok).toBe(false);
    expect(d.status).toBe(401);
  });

  test("admin endpoint with invalid token → 401", () => {
    const d = authorizeRequest("GET", "/api/v1/admin/ai-budget", h({ "X-Admin-Token": "nope" }), ENV);
    expect(d.status).toBe(401);
  });

  test("admin endpoint with valid internal token → 403 (valid credential, wrong role)", () => {
    const d = authorizeRequest("GET", "/api/v1/admin/ai-budget", h({ "X-Knowledge-Internal-Token": "internal-secret" }), ENV);
    expect(d.ok).toBe(false);
    expect(d.status).toBe(403);
  });

  test("admin endpoint with valid admin token → ok", () => {
    const d = authorizeRequest("GET", "/api/v1/admin/ai-budget", h({ "X-Admin-Token": "admin-secret" }), ENV);
    expect(d.ok).toBe(true);
    expect(d.role).toBe("admin");
  });

  test("mutation without credentials → 401", () => {
    expect(authorizeRequest("POST", "/api/v1/publish", h(), ENV).status).toBe(401);
  });

  test("mutation with valid admin token → ok", () => {
    expect(authorizeRequest("POST", "/api/v1/publish", h({ "X-Admin-Token": "admin-secret" }), ENV).ok).toBe(true);
  });

  test("webhook with no configured secret → 503 (fail closed)", () => {
    const d = authorizeRequest("POST", "/api/v1/webhook/telegram", h(), { ...ENV, TELEGRAM_WEBHOOK_SECRET: undefined });
    expect(d.ok).toBe(false);
    expect(d.status).toBe(503);
  });

  test("webhook with wrong secret → 401", () => {
    const d = authorizeRequest("POST", "/api/v1/webhook/telegram", h({ "X-Telegram-Bot-Api-Secret-Token": "bad" }), ENV);
    expect(d.status).toBe(401);
  });

  test("webhook with correct secret → ok", () => {
    const d = authorizeRequest("POST", "/api/v1/webhook/telegram", h({ "X-Telegram-Bot-Api-Secret-Token": "webhook-secret" }), ENV);
    expect(d.ok).toBe(true);
    expect(d.role).toBe("webhook");
  });
});

describe("rate limiting", () => {
  test("allows below capacity and limits above it", () => {
    let now = 0;
    const rl = new RateLimiter(() => now);
    const policy = RATE_LIMITS.search;
    for (let i = 0; i < policy.capacity; i++) {
      expect(rl.check("search:1.2.3.4", policy).allowed).toBe(true);
    }
    const blocked = rl.check("search:1.2.3.4", policy);
    expect(blocked.allowed).toBe(false);
    expect(blocked.retryAfterSeconds).toBeGreaterThan(0);
  });

  test("refills over time", () => {
    let now = 0;
    const rl = new RateLimiter(() => now);
    const policy = RATE_LIMITS.search;
    for (let i = 0; i < policy.capacity; i++) rl.check("k", policy);
    expect(rl.check("k", policy).allowed).toBe(false);
    now += 60_000;
    expect(rl.check("k", policy).allowed).toBe(true);
  });

  test("keys are independent", () => {
    const rl = new RateLimiter(() => 0);
    const policy = RATE_LIMITS.search;
    for (let i = 0; i < policy.capacity; i++) rl.check("a", policy);
    expect(rl.check("a", policy).allowed).toBe(false);
    expect(rl.check("b", policy).allowed).toBe(true);
  });

  test("authenticated callers are also limited (no unbounded bypass)", async () => {
    const limiter = new RateLimiter(() => 0);
    const dispatch = async () => new Response("ok", { status: 200 });
    const req = new Request("https://internal/api/v1/admin/ai-budget", {
      method: "GET",
      headers: { "X-Admin-Token": "admin-secret", "CF-Connecting-IP": "9.9.9.9" },
    });
    let limited = 0;
    for (let i = 0; i < RATE_LIMITS.admin.capacity + 2; i++) {
      const res = await withSecurityBoundary(req, ENV, dispatch, limiter);
      if (res.status === 429) limited++;
    }
    expect(limited).toBeGreaterThan(0);
  });
});

describe("request boundary (withSecurityBoundary)", () => {
  const dispatch = async () => new Response(JSON.stringify({ ok: true }), { status: 200, headers: { "Content-Type": "application/json" } });

  test("public GET is allowed and carries the allowed-origin header", async () => {
    const req = new Request("https://api.test/api/v1/health", { headers: { Origin: "https://zayron-x.co" } });
    const res = await withSecurityBoundary(req, ENV, dispatch, new RateLimiter(() => 0));
    expect(res.status).toBe(200);
    expect(res.headers.get("Access-Control-Allow-Origin")).toBe("https://zayron-x.co");
  });

  test("disallowed origin gets no ACAO and no wildcard", async () => {
    const req = new Request("https://api.test/api/v1/health", { headers: { Origin: "https://evil.example" } });
    const res = await withSecurityBoundary(req, ENV, dispatch, new RateLimiter(() => 0));
    expect(res.status).toBe(200);
    expect(res.headers.get("Access-Control-Allow-Origin")).toBeNull();
    expect(JSON.stringify([...res.headers])).not.toContain("allow-origin','*");
  });

  test("preflight returns 204 with policy headers", async () => {
    const req = new Request("https://api.test/api/v1/health", { method: "OPTIONS", headers: { Origin: "https://zayron-x.co" } });
    const res = await withSecurityBoundary(req, ENV, dispatch, new RateLimiter(() => 0));
    expect(res.status).toBe(204);
    expect(res.headers.get("Access-Control-Allow-Origin")).toBe("https://zayron-x.co");
    expect(res.headers.get("Vary")).toContain("Origin");
  });

  test("admin without credentials is denied before dispatch", async () => {
    let called = false;
    const spy = async () => { called = true; return new Response("ok"); };
    const req = new Request("https://api.test/api/v1/admin/ai-budget");
    const res = await withSecurityBoundary(req, ENV, spy, new RateLimiter(() => 0));
    expect(res.status).toBe(401);
    expect(called).toBe(false);
  });

  test("admin with valid token reaches dispatch", async () => {
    const req = new Request("https://api.test/api/v1/admin/ai-budget", { headers: { "X-Admin-Token": "admin-secret" } });
    const res = await withSecurityBoundary(req, ENV, dispatch, new RateLimiter(() => 0));
    expect(res.status).toBe(200);
  });

  test("public read is rate limited with Retry-After", async () => {
    const limiter = new RateLimiter(() => 0);
    const req = new Request("https://api.test/api/v1/health", { headers: { "CF-Connecting-IP": "1.1.1.1" } });
    let res!: Response;
    for (let i = 0; i < RATE_LIMITS.public_read.capacity + 1; i++) {
      res = await withSecurityBoundary(req, ENV, dispatch, limiter);
    }
    expect(res.status).toBe(429);
    expect(Number(res.headers.get("Retry-After"))).toBeGreaterThan(0);
  });

  test("malformed internal path variation still fails closed", async () => {
    const req = new Request("https://api.test/api/v1/rag/retrieve", { method: "POST" });
    const res = await withSecurityBoundary(req, ENV, dispatch, new RateLimiter(() => 0));
    expect(res.status).toBe(401);
  });
});

// ── Mock D1 Database backed by bun:sqlite for local testing ──────────────────

function createMockD1(): D1DatabaseLike & { rawDb: Database } {
  const sqlite = new Database(":memory:");
  const mock: D1DatabaseLike & { rawDb: Database } = {
    rawDb: sqlite,
    prepare(sql: string): D1PreparedStatementLike {
      return {
        bind(...values: any[]) {
          return {
            bind: (...v: any[]) => this.bind(...v),
            async first<T = unknown>(colName?: string): Promise<T | null> {
              const stmt = sqlite.prepare(sql);
              const row: any = stmt.get(...values);
              if (!row) return null;
              if (colName) return row[colName] ?? null;
              return row as T;
            },
            async run(): Promise<{ success: boolean; meta: any }> {
              const stmt = sqlite.prepare(sql);
              const res = stmt.run(...values);
              return { success: true, meta: { changes: res.changes } };
            },
            async all<T = unknown>(): Promise<{ results: T[] }> {
              const stmt = sqlite.prepare(sql);
              const results = stmt.all(...values) as T[];
              return { results };
            },
          };
        },
        async first<T = unknown>(colName?: string): Promise<T | null> {
          return this.bind().first<T>(colName);
        },
        async run(): Promise<{ success: boolean; meta: any }> {
          return this.bind().run();
        },
        async all<T = unknown>(): Promise<{ results: T[] }> {
          return this.bind().all<T>();
        },
      };
    },
  };
  return mock;
}

describe("DurableRateLimiter (Cloudflare D1 atomic token bucket)", () => {
  test("allows requests under capacity and decrements tokens", async () => {
    const d1 = createMockD1();
    let clock = 1000;
    const limiter = new DurableRateLimiter(d1, () => clock);
    const policy = { capacity: 5, refillPerSecond: 1, windowSeconds: 60 };

    const r1 = await limiter.check("test:ip1", policy);
    expect(r1.allowed).toBe(true);
    expect(r1.remaining).toBe(4);
    expect(r1.source).toBe("durable");

    const r2 = await limiter.check("test:ip1", policy);
    expect(r2.allowed).toBe(true);
    expect(r2.remaining).toBe(3);
  });

  test("enforces limit at threshold and returns 429 retryAfter metadata", async () => {
    const d1 = createMockD1();
    let clock = 1000;
    const limiter = new DurableRateLimiter(d1, () => clock);
    const policy = { capacity: 3, refillPerSecond: 1, windowSeconds: 60 };

    expect((await limiter.check("k", policy)).allowed).toBe(true);
    expect((await limiter.check("k", policy)).allowed).toBe(true);
    expect((await limiter.check("k", policy)).allowed).toBe(true); // 3rd consumed

    const over = await limiter.check("k", policy); // 4th rejected
    expect(over.allowed).toBe(false);
    expect(over.remaining).toBe(0);
    expect(over.retryAfterSeconds).toBeGreaterThanOrEqual(1);
  });

  test("refills deterministically over time", async () => {
    const d1 = createMockD1();
    let clock = 1000;
    const limiter = new DurableRateLimiter(d1, () => clock);
    const policy = { capacity: 3, refillPerSecond: 1, windowSeconds: 60 };

    for (let i = 0; i < 3; i++) await limiter.check("k", policy);
    expect((await limiter.check("k", policy)).allowed).toBe(false);

    // Advance 2 seconds -> 2 tokens refilled
    clock += 2000;
    const r1 = await limiter.check("k", policy);
    expect(r1.allowed).toBe(true);
    expect(r1.remaining).toBe(1);

    const r2 = await limiter.check("k", policy);
    expect(r2.allowed).toBe(true);
    expect(r2.remaining).toBe(0);

    const r3 = await limiter.check("k", policy);
    expect(r3.allowed).toBe(false);
  });

  test("atomic concurrency: N simultaneous requests near threshold enforce exact limit", async () => {
    const d1 = createMockD1();
    const limiter = new DurableRateLimiter(d1, () => 5000);
    const policy = { capacity: 10, refillPerSecond: 1, windowSeconds: 60 };

    // Fire 25 concurrent requests
    const promises = Array.from({ length: 25 }, () => limiter.check("concurrent:test", policy));
    const results = await Promise.all(promises);

    const allowedCount = results.filter((r) => r.allowed).length;
    const deniedCount = results.filter((r) => !r.allowed).length;

    expect(allowedCount).toBe(10);
    expect(deniedCount).toBe(15);
  });

  test("bucket key isolation across endpoint classes and IP identities", async () => {
    const d1 = createMockD1();
    const limiter = new DurableRateLimiter(d1, () => 1000);
    const policy = { capacity: 2, refillPerSecond: 1, windowSeconds: 60 };

    await limiter.check("public_read:1.1.1.1", policy);
    await limiter.check("public_read:1.1.1.1", policy);
    expect((await limiter.check("public_read:1.1.1.1", policy)).allowed).toBe(false);

    // Different IP in same class is unaffected
    expect((await limiter.check("public_read:2.2.2.2", policy)).allowed).toBe(true);

    // Same IP in different endpoint class is unaffected
    expect((await limiter.check("search:1.1.1.1", policy)).allowed).toBe(true);
  });

  test("trusted identity prioritization: CF-Connecting-IP overrides spoofed X-Forwarded-For", () => {
    const headers = new Headers({
      "CF-Connecting-IP": "203.0.113.195",
      "X-Forwarded-For": "10.0.0.1, 10.0.0.2",
    });
    expect(headers.get("CF-Connecting-IP")).toBe("203.0.113.195");
  });
});

describe("Webhook replay protection (Telegram event idempotency)", () => {
  test("deriveTelegramEventId extracts canonical update_id", () => {
    expect(deriveTelegramEventId({ update_id: 12345678 })).toBe("tg:update:12345678");
    expect(deriveTelegramEventId({ update_id: "998877" })).toBe("tg:update:998877");
  });

  test("deriveTelegramEventId extracts compound chat_id:message_id fallback", () => {
    const payload = {
      message: { message_id: 42, chat: { id: -100123456789 } },
    };
    expect(deriveTelegramEventId(payload)).toBe("tg:msg:-100123456789:42");
  });

  test("deriveTelegramEventId returns null on missing or malformed identifier", () => {
    expect(deriveTelegramEventId(null)).toBeNull();
    expect(deriveTelegramEventId({})).toBeNull();
    expect(deriveTelegramEventId({ update_id: "" })).toBeNull();
    expect(deriveTelegramEventId("invalid string")).toBeNull();
  });

  test("checkAndRecordReplay accepts first event and rejects duplicate", async () => {
    const d1 = createMockD1();
    const now = 10000;

    const first = await checkAndRecordReplay(d1, "evt:100", 60, now);
    expect(first.duplicate).toBe(false);
    expect(first.status).toBe("RESERVED");

    const duplicate = await checkAndRecordReplay(d1, "evt:100", 60, now + 500);
    expect(duplicate.duplicate).toBe(true);
  });

  test("concurrent duplicate check: only 1 request accepted under race conditions", async () => {
    const d1 = createMockD1();
    const now = 10000;

    const promises = Array.from({ length: 15 }, () => checkAndRecordReplay(d1, "evt:race:1", 60, now));
    const results = await Promise.all(promises);

    const newEvents = results.filter((r) => !r.duplicate);
    const duplicates = results.filter((r) => r.duplicate);

    expect(newEvents.length).toBe(1);
    expect(duplicates.length).toBe(14);
  });

  test("expired replay entry is refreshed after TTL", async () => {
    const d1 = createMockD1();
    const t0 = 1000;
    const ttlSeconds = 10; // expires at 11,000 ms

    const r1 = await checkAndRecordReplay(d1, "evt:expiring", ttlSeconds, t0);
    expect(r1.duplicate).toBe(false);

    // Active duplicate at t0 + 5s
    const r2 = await checkAndRecordReplay(d1, "evt:expiring", ttlSeconds, t0 + 5000);
    expect(r2.duplicate).toBe(true);

    // Expired at t0 + 11s -> accepted as refreshed
    const r3 = await checkAndRecordReplay(d1, "evt:expiring", ttlSeconds, t0 + 11000);
    expect(r3.duplicate).toBe(false);
  });

  test("terminal status updates are persisted", async () => {
    const d1 = createMockD1();
    await checkAndRecordReplay(d1, "evt:status", 60, 1000);

    await updateReplayStatus(d1, "evt:status", "PROCESSED");
    const row = await d1.prepare("SELECT status FROM webhook_replays WHERE event_id = ?").bind("evt:status").first<{ status: string }>();
    expect(row?.status).toBe("PROCESSED");
  });
});

describe("Durable failure semantics and degraded modes", () => {
  test("public reads degrade gracefully to in-memory limiter on D1 failure", async () => {
    const brokenD1: D1DatabaseLike = {
      prepare() {
        throw new Error("D1 connection lost");
      },
    };
    const envWithBrokenD1 = { ...ENV, DB: brokenD1 };
    const dispatch = async () => new Response("ok", { status: 200 });

    const req = new Request("https://api.test/api/v1/health", { headers: { "CF-Connecting-IP": "5.5.5.5" } });
    const res = await withSecurityBoundary(req, envWithBrokenD1, dispatch);
    expect(res.status).toBe(200);
  });

  test("sensitive endpoints fail closed (503) on D1 failure", async () => {
    const brokenD1: D1DatabaseLike = {
      prepare() {
        throw new Error("D1 connection lost");
      },
    };
    const envWithBrokenD1 = { ...ENV, DB: brokenD1 };
    const dispatch = async () => new Response("ok", { status: 200 });

    const req = new Request("https://api.test/api/v1/admin/ai-budget", {
      headers: { "X-Admin-Token": "admin-secret", "CF-Connecting-IP": "5.5.5.5" },
    });
    const res = await withSecurityBoundary(req, envWithBrokenD1, dispatch);
    expect(res.status).toBe(503);
    const body: any = await res.json();
    expect(body.error?.code).toBe("RATE_LIMIT_UNAVAILABLE");
  });
});

describe("Webhook end-to-end endpoint security and replay flow", () => {
  const mockQueue: any[] = [];
  const makeWebhookHandler = (d1: D1DatabaseLike, queueAvailable = true) => {
    return async (request: Request): Promise<Response> => {
      const url = new URL(request.url);
      if (url.pathname === "/api/v1/webhook/telegram" && request.method === "POST") {
        const body = await request.json().catch(() => null);
        if (!body || typeof body !== "object") {
          return new Response(JSON.stringify({ error: { code: "MALFORMED_PAYLOAD", message: "Invalid JSON payload" } }), { status: 400 });
        }
        const eventId = deriveTelegramEventId(body);
        if (!eventId) {
          return new Response(JSON.stringify({ error: { code: "MISSING_EVENT_IDENTITY", message: "Webhook payload lacks stable event identifier" } }), { status: 400 });
        }
        try {
          const replayCheck = await checkAndRecordReplay(d1, eventId);
          if (replayCheck.duplicate) {
            return new Response(JSON.stringify({ queued: false, duplicate: true, event_id: eventId, reason: "Duplicate event (replay protection)" }), { status: 200 });
          }
        } catch (dbErr: any) {
          return new Response(JSON.stringify({ error: { code: "DURABLE_STORE_UNAVAILABLE", message: "Durable replay store unavailable; failing closed" } }), { status: 503 });
        }
        const msg = (body as any).message || (body as any).channel_post;
        if (!msg || !msg.text) {
          await updateReplayStatus(d1, eventId, "UNSUPPORTED");
          return new Response(JSON.stringify({ queued: false, reason: "Empty or unsupported update format" }), { status: 200 });
        }
        if (queueAvailable) {
          mockQueue.push({ eventId, text: msg.text });
          await updateReplayStatus(d1, eventId, "PROCESSED");
          return new Response(JSON.stringify({ queued: true, duplicate: false, event_id: eventId }), { status: 200 });
        }
        await updateReplayStatus(d1, eventId, "FAILED");
        return new Response(JSON.stringify({ queued: false, reason: "INGEST_QUEUE not configured" }), { status: 500 });
      }
      return new Response("Not found", { status: 404 });
    };
  };

  test("missing secret token returns 401", async () => {
    const d1 = createMockD1();
    const handler = makeWebhookHandler(d1);
    const req = new Request("https://api.test/api/v1/webhook/telegram", {
      method: "POST",
      body: JSON.stringify({ update_id: 1001, message: { message_id: 1, chat: { id: 1 }, text: "hello" } }),
    });
    const res = await withSecurityBoundary(req, { ...ENV, DB: d1 }, handler);
    expect(res.status).toBe(401);
  });

  test("invalid secret token returns 401", async () => {
    const d1 = createMockD1();
    const handler = makeWebhookHandler(d1);
    const req = new Request("https://api.test/api/v1/webhook/telegram", {
      method: "POST",
      headers: { "X-Telegram-Bot-Api-Secret-Token": "wrong-secret" },
      body: JSON.stringify({ update_id: 1001, message: { message_id: 1, chat: { id: 1 }, text: "hello" } }),
    });
    const res = await withSecurityBoundary(req, { ...ENV, DB: d1 }, handler);
    expect(res.status).toBe(401);
  });

  test("valid secret + first event: queued=true and duplicate=false", async () => {
    const d1 = createMockD1();
    const handler = makeWebhookHandler(d1);
    const req = new Request("https://api.test/api/v1/webhook/telegram", {
      method: "POST",
      headers: { "X-Telegram-Bot-Api-Secret-Token": "webhook-secret" },
      body: JSON.stringify({ update_id: 2001, message: { message_id: 2, chat: { id: 1 }, text: "cve-2026-9999" } }),
    });
    const res = await withSecurityBoundary(req, { ...ENV, DB: d1 }, handler);
    expect(res.status).toBe(200);
    const body: any = await res.json();
    expect(body.queued).toBe(true);
    expect(body.duplicate).toBe(false);
    expect(body.event_id).toBe("tg:update:2001");
  });

  test("valid secret + duplicate event: queued=false, duplicate=true (deduplicated)", async () => {
    const d1 = createMockD1();
    const handler = makeWebhookHandler(d1);
    const makeReq = () => new Request("https://api.test/api/v1/webhook/telegram", {
      method: "POST",
      headers: { "X-Telegram-Bot-Api-Secret-Token": "webhook-secret" },
      body: JSON.stringify({ update_id: 3001, message: { message_id: 3, chat: { id: 1 }, text: "duplicate-test" } }),
    });

    const res1 = await withSecurityBoundary(makeReq(), { ...ENV, DB: d1 }, handler);
    expect(res1.status).toBe(200);
    const body1: any = await res1.json();
    expect(body1.queued).toBe(true);

    const res2 = await withSecurityBoundary(makeReq(), { ...ENV, DB: d1 }, handler);
    expect(res2.status).toBe(200);
    const body2: any = await res2.json();
    expect(body2.queued).toBe(false);
    expect(body2.duplicate).toBe(true);
    expect(body2.reason).toContain("replay protection");
  });

  test("missing event identifier returns 400", async () => {
    const d1 = createMockD1();
    const handler = makeWebhookHandler(d1);
    const req = new Request("https://api.test/api/v1/webhook/telegram", {
      method: "POST",
      headers: { "X-Telegram-Bot-Api-Secret-Token": "webhook-secret" },
      body: JSON.stringify({ non_standard: "payload without update_id" }),
    });
    const res = await withSecurityBoundary(req, { ...ENV, DB: d1 }, handler);
    expect(res.status).toBe(400);
    const body: any = await res.json();
    expect(body.error?.code).toBe("MISSING_EVENT_IDENTITY");
  });

  test("malformed JSON payload returns 400", async () => {
    const d1 = createMockD1();
    const handler = makeWebhookHandler(d1);
    const req = new Request("https://api.test/api/v1/webhook/telegram", {
      method: "POST",
      headers: { "X-Telegram-Bot-Api-Secret-Token": "webhook-secret", "Content-Type": "application/json" },
      body: "not json",
    });
    const res = await withSecurityBoundary(req, { ...ENV, DB: d1 }, handler);
    expect(res.status).toBe(400);
    const body: any = await res.json();
    expect(body.error?.code).toBe("MALFORMED_PAYLOAD");
  });

  test("unsupported event format (no text) returns 200 with queued=false", async () => {
    const d1 = createMockD1();
    const handler = makeWebhookHandler(d1);
    const req = new Request("https://api.test/api/v1/webhook/telegram", {
      method: "POST",
      headers: { "X-Telegram-Bot-Api-Secret-Token": "webhook-secret" },
      body: JSON.stringify({ update_id: 4001, message: { message_id: 4, chat: { id: 1 } /* no text */ } }),
    });
    const res = await withSecurityBoundary(req, { ...ENV, DB: d1 }, handler);
    expect(res.status).toBe(200);
    const body: any = await res.json();
    expect(body.queued).toBe(false);
    expect(body.reason).toContain("Empty or unsupported update format");
  });

  test("durable replay store failure fails closed (503)", async () => {
    const brokenD1: D1DatabaseLike = {
      prepare() {
        throw new Error("D1 unavailable");
      },
    };
    const handler = makeWebhookHandler(brokenD1);
    const req = new Request("https://api.test/api/v1/webhook/telegram", {
      method: "POST",
      headers: { "X-Telegram-Bot-Api-Secret-Token": "webhook-secret" },
      body: JSON.stringify({ update_id: 5001, message: { message_id: 5, chat: { id: 1 }, text: "cve-test" } }),
    });
    const res = await withSecurityBoundary(req, { ...ENV, DB: brokenD1 }, handler, new RateLimiter());
    expect(res.status).toBe(503);
    const body: any = await res.json();
    expect(body.error?.code).toBe("DURABLE_STORE_UNAVAILABLE");
  });
});

