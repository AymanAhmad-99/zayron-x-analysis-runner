import { describe, expect, test } from "bun:test";
import {
  DurableRateLimiter,
  RateLimiter,
  allowedOrigins,
  requiredTrust,
  withSecurityBoundary,
  type D1DatabaseLike,
} from "../../workers/api/src/security";

const ENV = {
  ADMIN_API_TOKEN: "admin-secret",
  KNOWLEDGE_INTERNAL_TOKEN: "internal-secret",
  TELEGRAM_WEBHOOK_SECRET: "webhook-secret",
  ENVIRONMENT: "preview",
};

const brokenD1: D1DatabaseLike = {
  prepare() {
    throw new Error("D1 connection lost");
  },
};

describe("ZX-05 explicit public read allowlist", () => {
  test("known public reads remain anonymous", () => {
    for (const p of [
      "/api/v1/health",
      "/api/v1/intelligence",
      "/api/v1/intelligence/latest",
      "/api/v1/sources",
      "/api/v1/sources/directory",
      "/api/v1/sources/health",
      "/api/v1/sources/discovery",
      "/api/v1/vulnerabilities",
      "/api/v1/vulnerabilities/CVE-2026-1234",
      "/api/v1/malware/intelligence/reports",
      "/api/v1/search",
    ]) {
      expect(requiredTrust("GET", p)).toBe("public");
    }
  });

  test("unlisted reads default-deny to operator trust", () => {
    // PHASE 9A (F9) — a READ whose route family does not exist is a 404, so it
    // is routed as public and the router answers NOT_FOUND.
    expect(requiredTrust("GET", "/api/v1/something/unlisted")).toBe("public");
    expect(requiredTrust("GET", "/api/v1/nope")).toBe("public");
    // Known-but-protected surfaces keep their fail-closed trust.
    expect(requiredTrust("GET", "/api/v1/admin/whatever")).toBe("admin");
    expect(requiredTrust("GET", "/api/v1/iocs/feed")).toBe("public");
    expect(requiredTrust("POST", "/api/v1/knowledge/search")).toBe("admin_or_internal");
    expect(requiredTrust("POST", "/api/v1/iocs/bulk")).toBe("admin_or_internal");
  });

  test("production default origins exclude localhost and the preview host", () => {
    const prod = allowedOrigins({ ENVIRONMENT: "production" });
    expect(prod).toEqual(["https://zayron-x.co", "https://www.zayron-x.co"]);
    expect(prod.some((o) => o.includes("localhost"))).toBe(false);
    expect(prod.some((o) => o.includes("127.0.0.1"))).toBe(false);

    const preview = allowedOrigins({ ENVIRONMENT: "preview" });
    expect(preview).toContain("http://localhost:8799");
  });

  test("ALLOWED_ORIGINS still overrides both defaults", () => {
    expect(allowedOrigins({ ENVIRONMENT: "production", ALLOWED_ORIGINS: "https://only.example" })).toEqual([
      "https://only.example",
    ]);
  });
});

describe("ZX-14 durable limiter degraded semantics", () => {
  test("fails open with an explicit degraded marker on storage outage", async () => {
    const limiter = new DurableRateLimiter(brokenD1, () => 1000);
    const result = await limiter.check("public_read:1.1.1.1", {
      capacity: 10,
      refillPerSecond: 1,
      windowSeconds: 60,
    });
    expect(result.allowed).toBe(true);
    expect(result.degraded).toBe(true);
  });

  test("anonymous reads survive a degraded limiter", async () => {
    const dispatch = async () => new Response("ok", { status: 200 });
    const req = new Request("https://api.test/api/v1/health", {
      headers: { "CF-Connecting-IP": "5.5.5.5" },
    });
    const res = await withSecurityBoundary(req, { ...ENV, DB: brokenD1 }, dispatch);
    expect(res.status).toBe(200);
  });

  test("sensitive classes still fail closed when degraded", async () => {
    const dispatch = async () => new Response("ok", { status: 200 });
    const req = new Request("https://api.test/api/v1/admin/ai-budget", {
      headers: { "X-Admin-Token": "admin-secret", "CF-Connecting-IP": "5.5.5.5" },
    });
    const res = await withSecurityBoundary(req, { ...ENV, DB: brokenD1 }, dispatch);
    expect(res.status).toBe(503);
    const body: any = await res.json();
    expect(body.error?.code).toBe("RATE_LIMIT_UNAVAILABLE");
  });

  test("security headers are present on dispatched responses", async () => {
    const dispatch = async () => new Response("ok", { status: 200 });
    const req = new Request("https://api.test/api/v1/health");
    const res = await withSecurityBoundary(req, ENV, dispatch, new RateLimiter(() => 0));
    expect(res.headers.get("X-Content-Type-Options")).toBe("nosniff");
    expect(res.headers.get("X-Frame-Options")).toBe("DENY");
    expect(res.headers.get("Strict-Transport-Security")).toContain("max-age=31536000");
    expect(res.headers.get("Permissions-Policy")).toContain("camera=()");
  });
});
