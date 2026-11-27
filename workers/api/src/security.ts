/**
 * ZAYRON-X API security boundary.
 *
 * Pure, dependency-free logic for:
 *   - explicit CORS origin policy (no wildcard)
 *   - trust classification per endpoint
 *   - fail-closed token authorization (admin / internal / webhook)
 *   - per-class rate limiting
 *
 * Kept free of `cloudflare:workers` / wasm imports so it can be unit-tested in
 * plain bun. The worker (`index.ts`) imports these functions.
 */

import {
  buildCacheableCopy,
  defaultEdgeCache,
  EDGE_CACHE_STATUS_HEADER,
  edgeCacheRequest,
  isEdgeCacheEligible,
  resolveEdgeCacheTtlSeconds,
  type EdgeCacheLike,
} from "./edgeCache";

export interface D1PreparedStatementLike {
  bind(...values: any[]): D1PreparedStatementLike;
  first<T = unknown>(colName?: string): Promise<T | null>;
  run<T = unknown>(): Promise<{ success: boolean; meta?: any }>;
  all<T = unknown>(): Promise<{ results: T[] }>;
}

export interface D1DatabaseLike {
  prepare(query: string): D1PreparedStatementLike;
  batch?<T = unknown>(statements: D1PreparedStatementLike[]): Promise<any[]>;
}

export interface SecurityEnv {
  ADMIN_API_TOKEN?: string;
  /**
   * ZX-06: named admin principals, as a JSON object of `{"<name>":"<token>"}`.
   * Each caller gets its own credential for attribution and selective rotation.
   */
  ADMIN_TOKENS_JSON?: string;
  KNOWLEDGE_INTERNAL_TOKEN?: string;
  TELEGRAM_WEBHOOK_SECRET?: string;
  ALLOWED_ORIGINS?: string;
  ENVIRONMENT?: string;
  DB?: D1DatabaseLike;
}

/** Origins trusted by the PRODUCTION default policy. Nothing else is implicit. */
const PRODUCTION_ALLOWED_ORIGINS = [
  "https://zayron-x.co",
  "https://www.zayron-x.co",
];

/**
 * Local development and the Preview web worker. These are NEVER part of the
 * production default policy (ZX-05): an operator must opt in through
 * ALLOWED_ORIGINS when a production deployment needs another origin.
 */
const NON_PRODUCTION_ALLOWED_ORIGINS = [
  "https://zayron-x-web-preview.aabusabih.workers.dev",
  "http://localhost:3000",
  "http://127.0.0.1:3000",
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  "http://localhost:8799",
  "http://127.0.0.1:8799",
  "http://localhost:8801",
  "http://127.0.0.1:8801",
];

function defaultAllowedOrigins(env: SecurityEnv): string[] {
  return env.ENVIRONMENT === "production"
    ? [...PRODUCTION_ALLOWED_ORIGINS]
    : [...PRODUCTION_ALLOWED_ORIGINS, ...NON_PRODUCTION_ALLOWED_ORIGINS];
}

export function allowedOrigins(env: SecurityEnv): string[] {
  const configured = (env.ALLOWED_ORIGINS || "")
    .split(",")
    .map((o) => o.trim())
    .filter(Boolean);
  return configured.length ? configured : defaultAllowedOrigins(env);
}

/**
 * Baseline response hardening for every API response, including errors
 * (ZX-12). The API only ever emits JSON, so a `default-src 'none'` policy is
 * safe here and cannot affect the Next.js web application.
 */
export const SECURITY_HEADERS: Record<string, string> = {
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Strict-Transport-Security": "max-age=31536000; includeSubDomains",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=(), payment=()",
  "Content-Security-Policy": "default-src 'none'; frame-ancestors 'none'; base-uri 'self';",
};

function applySecurityHeaders(headers: Headers): void {
  for (const [name, value] of Object.entries(SECURITY_HEADERS)) {
    if (!headers.has(name)) headers.set(name, value);
  }
}

/** Returns the request Origin only if it is explicitly allowed; otherwise null. */
export function resolveOrigin(origin: string | null, env: SecurityEnv): string | null {
  if (!origin) return null;
  return allowedOrigins(env).includes(origin) ? origin : null;
}

export function corsHeaders(origin: string | null): Record<string, string> {
  const headers: Record<string, string> = {
    ...SECURITY_HEADERS,
    Vary: "Origin",
    "Access-Control-Allow-Methods": "GET, POST, PATCH, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Admin-Token, X-Knowledge-Internal-Token, X-Telegram-Bot-Api-Secret-Token",
    "Access-Control-Max-Age": "600",
  };
  // Never emit `*`. If the origin is not explicitly allowed, omit ACAO entirely.
  if (origin) headers["Access-Control-Allow-Origin"] = origin;
  return headers;
}

/**
 * Merge `Origin` into an existing `Vary` instead of replacing it.
 *
 * ACAO is derived from the request Origin, so a cacheable public response MUST
 * carry `Vary: Origin` or an edge cache can hand one origin's CORS header to a
 * different origin. It must not, however, discard a Vary the handler already
 * published (`Accept-Encoding`, ...): `set()` did exactly that.
 */
function mergeVaryOrigin(headers: Headers): void {
  const existing = headers.get("Vary");
  if (!existing) {
    headers.set("Vary", "Origin");
    return;
  }
  const values = existing.split(",").map((v) => v.trim()).filter(Boolean);
  if (!values.some((v) => v.toLowerCase() === "origin")) values.push("Origin");
  headers.set("Vary", values.join(", "));
}

/** Copy a response, replacing any wildcard CORS header with the resolved policy. */
export function applyCors(response: Response, origin: string | null): Response {
  const headers = new Headers(response.headers);
  applySecurityHeaders(headers);
  headers.delete("Access-Control-Allow-Origin");
  mergeVaryOrigin(headers);
  if (origin) headers.set("Access-Control-Allow-Origin", origin);
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
}

/**
 * Wave 4A — response cache policy at the trust boundary.
 *
 * `jsonResponse()` in the API sets `public, max-age=...` on every 200 so the
 * edge can cache anonymous reads. That default must never apply to an
 * authenticated/admin/internal/webhook response or to any non-200 status, so
 * the boundary rewrites the header here, after dispatch, where the resolved
 * role is known. A public 200 keeps its cacheability; everything else is
 * `private, no-store`.
 */
export function applyResponseCachePolicy(response: Response, isPublicRead: boolean): Response {
  const headers = new Headers(response.headers);
  const cacheable = isPublicRead && response.status === 200;
  if (!cacheable) {
    headers.set("Cache-Control", "private, no-store");
    headers.set("Pragma", "no-cache");
  }
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
}

// ── trust classification ────────────────────────────────────────────────

export type TrustRequirement = "public" | "admin" | "internal" | "webhook" | "admin_or_internal";

const INTERNAL_PREFIXES = ["/api/v1/rag/"];
const ADMIN_PREFIXES = ["/api/v1/admin/"];
const EXPENSIVE_PATHS = new Set([
  "/api/v1/analyze",
  "/api/v1/ai/analyze",
  "/api/v1/intelligence/process",
  "/api/v1/intelligence/backfill",
  "/api/v1/intelligence/shadow-vectorize",
]);

/**
 * Explicit allowlist of anonymous READ surfaces (ZX-05).
 *
 * Default is deny. A GET/HEAD path that is not listed here (or covered by one
 * of PUBLIC_READ_PREFIXES) is treated as an operator surface, exactly like a
 * mutation. Every entry below corresponds to a real public route in
 * `workers/api/src/index.ts`; nothing is public by accident.
 */
const PUBLIC_READ_EXACT = new Set<string>([
  "/api/v1/health",
  // PHASE 7D — public pipeline health (status badge on /developers & /security).
  "/api/v1/health/pipeline",
  // PHASE 7A — developer specification and self-serve catalog roots.
  "/api/v1/openapi.json",
  "/api/v1/intelligence",
  "/api/v1/intelligence/latest",
  "/api/v1/intelligence/stats",
  "/api/v1/intelligence/trending",
  "/api/v1/knowledge",
  "/api/v1/knowledge/list",
  "/api/v1/knowledge/corpus",
  "/api/v1/sources",
  "/api/v1/sources/directory",
  "/api/v1/sources/discovery",
  "/api/v1/sources/health",
  "/api/v1/vulnerabilities",
  "/api/v1/malware",
  "/api/v1/malware/intelligence/reports",
  // PHASE 7C — OpenSSF/OSV supply-chain dossiers (a distinct, non-canonical kind).
  "/api/v1/malware/supply-chain/reports",
  "/api/v1/actors",
  "/api/v1/alerts",
  "/api/v1/articles",
  "/api/v1/campaigns",
  "/api/v1/feed",
  "/api/v1/graph",
  "/api/v1/graph/edges",
  "/api/v1/iocs",
  // PHASE 7C — read-only detection coverage and the malware family index.
  "/api/v1/detection/rules",
  "/api/v1/iocs/families",
  "/api/v1/regulations",
  "/api/v1/reports",
  "/api/v1/search",
  "/api/v1/threats",
  "/api/v1/ai/runs",
  // PHASE 8B — the Exploit & Weaponization Radar is a public, derived read.
  "/api/v1/exploits",
  // PHASE 8C — the canonical MITRE ATT&CK threat graph is a public catalog.
  "/api/v1/threat-actors",
  "/api/v1/campaigns",
  // PHASE 9A — the ATT&CK technique backbone is a public catalog.
  "/api/v1/techniques",
  // PHASE 9B — the neural newsroom, programmatic hubs and AI discovery files.
  "/api/v1/news",
  "/api/v1/news/telemetry",
  "/api/v1/vendors",
  "/api/v1/regions",
  "/api/v1/llms.txt",
  "/api/v1/llms-full.txt",
  // PHASE 9C — one-click email briefing unsubscribe link.
  "/api/v1/briefings/unsubscribe",
]);

/** Collection-detail prefixes that are public for READ methods only. */
const PUBLIC_READ_PREFIXES = [
  // Wave 4B: the sitemap feed is an anonymous, read-only URL inventory.
  "/api/v1/sitemap/",
  "/api/v1/sources/",
  "/api/v1/intelligence/",
  "/api/v1/knowledge/",
  "/api/v1/vulnerabilities/",
  "/api/v1/malware/",
  "/api/v1/actors/",
  "/api/v1/articles/",
  "/api/v1/campaigns/",
  "/api/v1/iocs/",
  "/api/v1/detection/",
  "/api/v1/reports/",
  "/api/v1/threats/",
  // PHASE 8C — actor/campaign dossiers and Navigator exports.
  "/api/v1/threat-actors/",
  "/api/v1/campaigns/",
  // PHASE 9A — technique index and `/techniques/:id` dossiers are public.
  "/api/v1/techniques/",
  // PHASE 9B — briefings, vendor hubs and regional posture hubs are public reads.
  "/api/v1/news/",
  "/api/v1/vendors/",
  "/api/v1/regions/",
];

/**
 * PHASE 9A — top-level route families the API actually serves. Used only to
 * distinguish "unknown path" (404) from "known but protected" (401).
 */
const KNOWN_API_SEGMENTS = new Set<string>([
  "health", "openapi.json", "intelligence", "knowledge", "sources", "vulnerabilities",
  "malware", "actors", "alerts", "articles", "campaigns", "feed", "graph", "iocs",
  "detection", "regulations", "reports", "search", "threats", "ai", "exploits",
  "threat-actors", "techniques", "keys", "leads", "sitemap", "canary", "publish",
  "social", "research", "analyze", "admin", "webhook", "news", "vendors", "regions", "llms.txt", "llms-full.txt", "briefings",
  "inquiries",
]);

function isPublicRead(method: string, path: string): boolean {
  const m = method.toUpperCase();
  if (m !== "GET" && m !== "HEAD" && m !== "OPTIONS") return false;
  if (PUBLIC_READ_EXACT.has(path)) return true;
  return PUBLIC_READ_PREFIXES.some((p) => path.startsWith(p));
}

/** Classify the trust boundary required for an endpoint. Default is fail-closed. */
export function requiredTrust(method: string, path: string): TrustRequirement {
  const m = method.toUpperCase();

  if (path.startsWith("/api/v1/webhook/")) return "webhook";
  if (ADMIN_PREFIXES.some((p) => path.startsWith(p))) return "admin";
  if (INTERNAL_PREFIXES.some((p) => path.startsWith(p))) return "internal";

  const isRead = m === "GET" || m === "HEAD" || m === "OPTIONS";

  // Operator mutations: publish, canary, research workflow, and source writes.
  if (
    path === "/api/v1/publish" ||
    path === "/api/v1/publish/outbound" ||
    path === "/api/v1/social/derivatives" ||
    path.startsWith("/api/v1/canary/") ||
    path === "/api/v1/research/workflow" ||
    (!isRead && path.startsWith("/api/v1/sources")) ||
    path === "/api/v1/intelligence/ingest-event" ||
    path === "/api/v1/intelligence/preview"
  ) {
    return "admin_or_internal";
  }

  // Expensive / analysis writes.
  if (!isRead && EXPENSIVE_PATHS.has(path)) return "admin_or_internal";

  // PHASE 7A — anonymous developer acquisition writes. These are the only
  // public non-GET surfaces: self-serve key issuance, procurement intake, and briefings.
  // Both are rate limited by client IP in the `public_write` class.
  if (
    path === "/api/v1/keys/self-serve" ||
    path === "/api/v1/leads" ||
    path === "/api/v1/briefings/subscribe" ||
    path === "/api/v1/briefings/unsubscribe" ||
    path === "/api/v1/inquiries"
  ) return "public";

  // Explicit anonymous read allowlist.
  if (isPublicRead(m, path)) return "public";

  // PHASE 9A (F9) — an unknown READ path is a plain 404, not an auth challenge.
  // Only paths whose first segment matches no real route family reach this
  // branch, and only for GET/HEAD/OPTIONS. Operator surfaces are matched above,
  // so admin routes keep their 401 and writes keep their own rules.
  if (isRead && path.startsWith("/api/v1/")) {
    const segment = path.slice("/api/v1/".length).split("/")[0]?.toLowerCase() ?? "";
    if (segment && !KNOWN_API_SEGMENTS.has(segment)) return "public";
  }

  // Anything else — including an unlisted GET — fails closed to operator trust.
  return "admin_or_internal";
}

export type EndpointClass = "public_read" | "public_write" | "search" | "mutation" | "expensive" | "admin" | "internal" | "webhook";

export function classifyEndpoint(method: string, path: string, hasSearchQuery = false): EndpointClass {
  const trust = requiredTrust(method, path);
  if (trust === "webhook") return "webhook";
  if (trust === "admin") return "admin";
  if (trust === "internal") return "internal";
  if (
    path === "/api/v1/keys/self-serve" ||
    path === "/api/v1/leads" ||
    path === "/api/v1/briefings/subscribe" ||
    path === "/api/v1/inquiries"
  ) return "public_write";
  if (path === "/api/v1/search" || path === "/api/v1/knowledge/search") return "search";
  // Wave 4A: `/feed?q=...` runs an unindexed LIKE scan, so a search-bearing
  // feed request is rate-limited as `search`, not as a cheap public list read.
  if (hasSearchQuery && path === "/api/v1/feed") return "search";
  if (EXPENSIVE_PATHS.has(path)) return "expensive";
  if (trust === "admin_or_internal") return "mutation";
  return "public_read";
}

// ── authorization ───────────────────────────────────────────────────────

export interface AuthDecision {
  ok: boolean;
  status?: 401 | 403 | 503;
  code?: string;
  message?: string;
  role?: "public" | "admin" | "internal" | "webhook";
  /** ZX-06: the authenticated admin principal, for audit attribution. */
  principal?: string;
}

export interface AdminPrincipal {
  name: string;
  token: string;
}

/**
 * ZX-06 — resolve the admin principals configured for this environment.
 *
 * `ADMIN_TOKENS_JSON` (`{"ops":"<token>","ingest":"<token>"}`) gives each
 * caller its own named credential, so one token can be rotated or revoked
 * without invalidating the others and every admin action is attributable to a
 * principal. The legacy single `ADMIN_API_TOKEN` stays supported as the
 * principal `legacy-admin` so existing deployments keep working until it is
 * rotated out.
 */
export function adminPrincipals(env: SecurityEnv): AdminPrincipal[] {
  const principals: AdminPrincipal[] = [];
  const raw = (env.ADMIN_TOKENS_JSON || "").trim();
  if (raw) {
    try {
      const parsed: unknown = JSON.parse(raw);
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        for (const [name, token] of Object.entries(parsed as Record<string, unknown>)) {
          if (typeof token === "string" && token.trim() && name.trim()) {
            principals.push({ name: name.trim(), token: token.trim() });
          }
        }
      } else {
        console.error("[SECURITY] ADMIN_TOKENS_JSON must be a JSON object of name -> token; ignoring it");
      }
    } catch {
      console.error("[SECURITY] ADMIN_TOKENS_JSON is not valid JSON; ignoring it");
    }
  }
  const legacy = (env.ADMIN_API_TOKEN || "").trim();
  if (legacy) principals.push({ name: "legacy-admin", token: legacy });
  return principals;
}

/** Length-independent constant-time string comparison (no early exit on a byte). */
function constantTimeStringEqual(a: string, b: string): boolean {
  if (!a || !b || a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

async function sha256Bytes(value: string): Promise<Uint8Array> {
  return new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value)));
}

function constantTimeBytesEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
  return diff === 0;
}

/**
 * ZX-06 — safe timing-equal on Workers.
 *
 * `crypto.subtle.timingSafeEqual` throws `TypeError` when the two buffers differ
 * in length, so a raw string comparison would either throw or leak the secret's
 * length. Both tokens are hashed to a fixed 32-byte SHA-256 digest first, then
 * compared. The native primitive is a Workers extension (absent from Node's
 * WebCrypto), so it is used when present and the equal-length digest comparison
 * is the fallback.
 */
export async function timingSafeTokenEqual(supplied: string, expected: string): Promise<boolean> {
  if (!supplied || !expected) return false;
  const [a, b] = await Promise.all([sha256Bytes(supplied), sha256Bytes(expected)]);
  const native = (crypto.subtle as unknown as {
    timingSafeEqual?: (x: ArrayBufferView, y: ArrayBufferView) => boolean;
  }).timingSafeEqual;
  if (typeof native === "function") {
    try {
      return native.call(crypto.subtle, a, b);
    } catch {
      /* fall through to the digest comparison */
    }
  }
  return constantTimeBytesEqual(a, b);
}

interface AdminMatch {
  ok: boolean;
  principal?: string;
}

/** Single decision point shared by the synchronous and digest-based paths. */
function decideTrust(
  requirement: TrustRequirement,
  adminMatch: AdminMatch,
  internalOk: boolean,
  webhookConfigured: boolean,
  webhookOk: boolean,
): AuthDecision {
  // 401 = no valid credential presented; 403 = a valid credential lacks the role.
  const deny = (status: 401 | 403 | 503, code: string, message: string): AuthDecision => ({ ok: false, status, code, message });
  const admin: AuthDecision = { ok: true, role: "admin", principal: adminMatch.principal };

  switch (requirement) {
    case "admin":
      if (adminMatch.ok) return admin;
      return internalOk
        ? deny(403, "FORBIDDEN", "Credential is valid but lacks the required role")
        : deny(401, "UNAUTHORIZED", "Administrative authentication required");
    case "internal":
      if (internalOk) return { ok: true, role: "internal" };
      if (adminMatch.ok) return admin;
      return deny(401, "UNAUTHORIZED", "Internal service authentication required");
    case "admin_or_internal":
      if (adminMatch.ok) return admin;
      if (internalOk) return { ok: true, role: "internal" };
      return deny(401, "UNAUTHORIZED", "Operator authentication required");
    case "webhook": {
      // Fail closed: a webhook endpoint with no configured secret cannot be authenticated.
      if (!webhookConfigured) {
        return deny(503, "WEBHOOK_UNCONFIGURED", "Webhook secret is not configured; endpoint disabled");
      }
      return webhookOk ? { ok: true, role: "webhook" } : deny(401, "UNAUTHORIZED", "Invalid webhook signature");
    }
    default:
      return deny(401, "UNAUTHORIZED", "Authentication required");
  }
}

/**
 * Synchronous authorization (kept for callers that cannot await, and for the
 * pure security tests). The request boundary uses {@link authorizeRequestSecure}.
 */
export function authorizeRequest(
  method: string,
  path: string,
  headers: Headers,
  env: SecurityEnv,
): AuthDecision {
  const requirement = requiredTrust(method, path);
  if (requirement === "public") return { ok: true, role: "public" };

  const suppliedAdmin = (headers.get("X-Admin-Token") || "").trim();
  const match = adminPrincipals(env).find((p) => constantTimeStringEqual(suppliedAdmin, p.token));
  const internalOk = constantTimeStringEqual(
    (headers.get("X-Knowledge-Internal-Token") || "").trim(),
    (env.KNOWLEDGE_INTERNAL_TOKEN || "").trim(),
  );
  const webhookSecret = (env.TELEGRAM_WEBHOOK_SECRET || "").trim();
  const webhookOk = constantTimeStringEqual(
    (headers.get("X-Telegram-Bot-Api-Secret-Token") || "").trim(),
    webhookSecret,
  );

  return decideTrust(requirement, { ok: !!match, principal: match?.name }, internalOk, !!webhookSecret, webhookOk);
}

let legacyAdminDeprecationLogged = false;

/**
 * Authorization with SHA-256 digest comparison (ZX-06).
 *
 * Used by the request boundary on Workers, where `crypto.subtle` is available.
 * A successful `legacy-admin` match from the single `ADMIN_API_TOKEN` emits one
 * structured deprecation record per isolate so the migration to named
 * principals is observable rather than silent.
 */
export async function authorizeRequestSecure(
  method: string,
  path: string,
  headers: Headers,
  env: SecurityEnv,
): Promise<AuthDecision> {
  const requirement = requiredTrust(method, path);
  if (requirement === "public") return { ok: true, role: "public" };

  const suppliedAdmin = (headers.get("X-Admin-Token") || "").trim();
  let match: AdminPrincipal | undefined;
  for (const principal of adminPrincipals(env)) {
    if (await timingSafeTokenEqual(suppliedAdmin, principal.token)) {
      match = principal;
      break;
    }
  }

  const internalOk = await timingSafeTokenEqual(
    (headers.get("X-Knowledge-Internal-Token") || "").trim(),
    (env.KNOWLEDGE_INTERNAL_TOKEN || "").trim(),
  );
  const webhookSecret = (env.TELEGRAM_WEBHOOK_SECRET || "").trim();
  const webhookOk = await timingSafeTokenEqual(
    (headers.get("X-Telegram-Bot-Api-Secret-Token") || "").trim(),
    webhookSecret,
  );

  if (match?.name === "legacy-admin" && !(env.ADMIN_TOKENS_JSON || "").trim() && !legacyAdminDeprecationLogged) {
    legacyAdminDeprecationLogged = true;
    console.warn("[SECURITY] DEPRECATION: ADMIN_API_TOKEN authenticated as legacy-admin; configure ADMIN_TOKENS_JSON for named principals");
  }

  return decideTrust(requirement, { ok: !!match, principal: match?.name }, internalOk, !!webhookSecret, webhookOk);
}

// ── rate limiting (durable D1 + in-memory fallback) ─────────────────────

export interface RateLimitPolicy {
  capacity: number;
  refillPerSecond: number;
  windowSeconds: number;
}

export const RATE_LIMITS: Record<EndpointClass, RateLimitPolicy> = {
  public_read: { capacity: 300, refillPerSecond: 5, windowSeconds: 60 },
  /** PHASE 7A — 15 acquisitions per minute per client IP (key issuance, leads). */
  public_write: { capacity: 15, refillPerSecond: 0.25, windowSeconds: 60 },
  search: { capacity: 60, refillPerSecond: 1, windowSeconds: 60 },
  mutation: { capacity: 30, refillPerSecond: 0.5, windowSeconds: 60 },
  expensive: { capacity: 20, refillPerSecond: 0.33, windowSeconds: 60 },
  admin: { capacity: 60, refillPerSecond: 1, windowSeconds: 60 },
  internal: { capacity: 300, refillPerSecond: 5, windowSeconds: 60 },
  webhook: { capacity: 240, refillPerSecond: 4, windowSeconds: 60 },
};

export interface RateLimitResult {
  allowed: boolean;
  retryAfterSeconds: number;
  remaining: number;
  source?: "durable" | "fallback" | "memory";
  /**
   * True when the durable decision could not be made and the limiter failed
   * open. The boundary still fails closed for sensitive endpoint classes.
   */
  degraded?: boolean;
}

export interface RateLimiterInterface {
  check(key: string, policy: RateLimitPolicy): Promise<RateLimitResult> | RateLimitResult;
  reset?(): Promise<void> | void;
}

interface Bucket {
  tokens: number;
  updatedAt: number;
}

/** In-memory token-bucket limiter for local tests, benchmarks, and degraded-mode fallback. */
export class RateLimiter implements RateLimiterInterface {
  private buckets = new Map<string, Bucket>();
  private now: () => number;

  constructor(now: () => number = () => Date.now()) {
    this.now = now;
  }

  check(key: string, policy: RateLimitPolicy): RateLimitResult {
    const t = this.now();
    const bucket = this.buckets.get(key) ?? { tokens: policy.capacity, updatedAt: t };
    const elapsed = Math.max(0, (t - bucket.updatedAt) / 1000);
    const tokens = Math.min(policy.capacity, bucket.tokens + elapsed * policy.refillPerSecond);

    if (tokens < 1) {
      const deficit = 1 - tokens;
      const retryAfter = Math.max(1, Math.ceil(deficit / policy.refillPerSecond));
      this.buckets.set(key, { tokens, updatedAt: t });
      return { allowed: false, retryAfterSeconds: retryAfter, remaining: 0, source: "memory" };
    }

    this.buckets.set(key, { tokens: tokens - 1, updatedAt: t });
    return { allowed: true, retryAfterSeconds: 0, remaining: Math.floor(tokens - 1), source: "memory" };
  }

  reset(): void {
    this.buckets.clear();
  }
}

/**
 * Shared, durable token-bucket rate limiter backed by Cloudflare D1.
 * Atomic check-and-consume executes in a single SQLite statement to prevent race conditions.
 */
export class DurableRateLimiter implements RateLimiterInterface {
  private db: D1DatabaseLike;
  private now: () => number;
  private fallbackLimiter?: RateLimiter;
  private schemaReady = false;
  private schemaRetryAfter = 0;
  private static readonly SCHEMA_RETRY_COOLDOWN_MS = 60_000;

  constructor(db: D1DatabaseLike, now: () => number = () => Date.now(), fallback?: RateLimiter) {
    this.db = db;
    this.now = now;
    this.fallbackLimiter = fallback;
  }

  /**
   * Creates the durable bucket table once, at most once per cooldown window.
   * A failure is logged and NEVER sets `schemaReady`, so a broken schema is not
   * falsely reported as ready and is not retried on every single request.
   */
  async ensureSchema(): Promise<void> {
    if (this.schemaReady) return;
    if (this.now() < this.schemaRetryAfter) return;
    try {
      await this.db.prepare(`
        CREATE TABLE IF NOT EXISTS api_rate_limits (
          key TEXT PRIMARY KEY,
          tokens REAL NOT NULL,
          last_refill INTEGER NOT NULL,
          granted INTEGER NOT NULL
        )
      `).run();
      this.schemaReady = true;
      this.schemaRetryAfter = 0;
    } catch (err: any) {
      this.schemaRetryAfter = this.now() + DurableRateLimiter.SCHEMA_RETRY_COOLDOWN_MS;
      console.error("[RATE_LIMITER] schema init failed; durable limiting degraded", {
        site: "rate_limiter.ensure_schema",
        error: err?.message ?? String(err),
        cooldown_ms: DurableRateLimiter.SCHEMA_RETRY_COOLDOWN_MS,
      });
    }
  }

  async check(key: string, policy: RateLimitPolicy): Promise<RateLimitResult> {
    if (!this.schemaReady) {
      await this.ensureSchema();
    }

    const t = this.now();
    try {
      const row = await this.db.prepare(`
        INSERT INTO api_rate_limits (key, tokens, last_refill, granted)
        VALUES (?1, ?2 - 1.0, ?3, 1)
        ON CONFLICT(key) DO UPDATE SET
          tokens = CASE
            WHEN MIN(?2, tokens + MAX(0, (?3 - last_refill) * (?4 / 1000.0))) >= 1.0
            THEN MIN(?2, tokens + MAX(0, (?3 - last_refill) * (?4 / 1000.0))) - 1.0
            ELSE MIN(?2, tokens + MAX(0, (?3 - last_refill) * (?4 / 1000.0)))
          END,
          granted = CASE
            WHEN MIN(?2, tokens + MAX(0, (?3 - last_refill) * (?4 / 1000.0))) >= 1.0
            THEN 1
            ELSE 0
          END,
          last_refill = ?3
        RETURNING tokens, granted;
      `).bind(key, policy.capacity, t, policy.refillPerSecond).first<{ tokens: number; granted: number }>();

      if (!row) {
        throw new Error("D1 rate limit statement returned no row");
      }

      if (row.granted === 1) {
        return {
          allowed: true,
          retryAfterSeconds: 0,
          remaining: Math.max(0, Math.floor(row.tokens)),
          source: "durable",
        };
      }

      const deficit = 1.0 - row.tokens;
      const retryAfter = Math.max(1, Math.ceil(deficit / policy.refillPerSecond));
      return {
        allowed: false,
        retryAfterSeconds: retryAfter,
        remaining: 0,
        source: "durable",
      };
    } catch (err: any) {
      // Storage outage: fail OPEN with an explicit degraded marker. The request
      // boundary still returns 503 for sensitive endpoint classes, so a durable
      // store failure can never silently disable protection on a mutation.
      console.error("[RATE_LIMITER] durable check failed; failing open (degraded)", {
        site: "rate_limiter.check",
        key,
        error: err?.message ?? String(err),
      });
      return { allowed: true, retryAfterSeconds: 0, remaining: 0, source: "fallback", degraded: true };
    }
  }

  async reset(): Promise<void> {
    try {
      await this.db.prepare("DELETE FROM api_rate_limits").run();
    } catch {
      // ignore
    }
  }
}

// ── Webhook Replay Protection ───────────────────────────────────────────

export interface ReplayCheckResult {
  duplicate: boolean;
  status: string;
}

/**
 * Derives stable event identity from Telegram Bot API update payload.
 * Prioritizes canonical top-level update_id; falls back to chat_id:message_id.
 */
export function deriveTelegramEventId(body: unknown): string | null {
  if (!body || typeof body !== "object") return null;
  const b = body as Record<string, any>;
  if (b.update_id !== undefined && b.update_id !== null && String(b.update_id).trim() !== "") {
    return `tg:update:${String(b.update_id).trim()}`;
  }
  const msg = b.message || b.channel_post || b.edited_message || b.edited_channel_post;
  if (msg && msg.chat?.id && msg.message_id) {
    return `tg:msg:${msg.chat.id}:${msg.message_id}`;
  }
  return null;
}

/**
 * Atomically checks and records webhook event identity in D1 with bounded TTL.
 * Uses atomic INSERT OR IGNORE followed by TTL expiration check.
 * Returns duplicate: false for first arrival or expired entries; duplicate: true for active duplicates.
 */
export async function checkAndRecordReplay(
  db: D1DatabaseLike,
  eventId: string,
  ttlSeconds = 86400,
  nowMs: number = Date.now(),
): Promise<ReplayCheckResult> {
  const expiresAt = nowMs + ttlSeconds * 1000;

  try {
    await db.prepare(`
      CREATE TABLE IF NOT EXISTS webhook_replays (
        event_id TEXT PRIMARY KEY,
        received_at INTEGER NOT NULL,
        expires_at INTEGER NOT NULL,
        status TEXT NOT NULL
      )
    `).run();
  } catch {
    // schema creation may be concurrent
  }

  // 1. Attempt atomic initial insertion
  const insertRes = await db.prepare(`
    INSERT OR IGNORE INTO webhook_replays (event_id, received_at, expires_at, status)
    VALUES (?1, ?2, ?3, 'RESERVED')
  `).bind(eventId, nowMs, expiresAt).run();

  const changes = insertRes?.meta?.changes ?? 0;
  if (changes > 0) {
    return { duplicate: false, status: "RESERVED" };
  }

  // 2. Row exists: check if existing record has expired.
  //
  // Bonus A — affinity normalization. Migration 0024 declared `received_at` and
  // `expires_at` as TEXT, while this code writes epoch-ms INTEGERs. Under TEXT
  // affinity the bound integer is stored as text, and SQLite orders every TEXT
  // value ABOVE every INTEGER one, so a plain `expires_at <= ?` comparison was
  // always false against a 0024-created database: expired rows could never be
  // reclaimed and a replayed event stayed a duplicate forever. Reading and
  // comparing through `CAST(... AS INTEGER)` makes both storage layouts behave
  // identically.
  const row = await db.prepare(`
    SELECT CAST(received_at AS INTEGER) AS received_at, CAST(expires_at AS INTEGER) AS expires_at, status
    FROM webhook_replays WHERE event_id = ?
  `).bind(eventId).first<{ received_at: number; expires_at: number; status: string }>();

  if (!row) {
    return { duplicate: true, status: "UNKNOWN" };
  }

  if (Number(row.expires_at) <= nowMs) {
    // Expired entry: atomically claim the expired record
    const updateRes = await db.prepare(`
      UPDATE webhook_replays
      SET received_at = ?2, expires_at = ?3, status = 'RESERVED'
      WHERE event_id = ?1 AND CAST(expires_at AS INTEGER) <= ?2
    `).bind(eventId, nowMs, expiresAt).run();

    if ((updateRes?.meta?.changes ?? 0) > 0) {
      return { duplicate: false, status: "RESERVED" };
    }
  }

  return { duplicate: true, status: row.status };
}

/** Updates the terminal processing status of a webhook event in D1. */
export async function updateReplayStatus(
  db: D1DatabaseLike,
  eventId: string,
  status: "PROCESSED" | "FAILED" | "UNSUPPORTED",
): Promise<void> {
  try {
    await db.prepare(`
      UPDATE webhook_replays SET status = ? WHERE event_id = ?
    `).bind(status, eventId).run();
  } catch (err) {
    console.warn("[WEBHOOK_REPLAY] Failed to update replay status:", err);
  }
}

// ── Client Identity Keying ──────────────────────────────────────────────

/**
 * Extracts trusted client IP (ZX-24).
 *
 * `CF-Connecting-IP` is set by Cloudflare's edge and is the only header a client
 * cannot choose, so it is authoritative and consulted FIRST. `X-Forwarded-For`
 * is caller-controlled and must never outrank it: it is only a local-development
 * fallback for when the request did not pass through the edge (no CF header).
 */
export function clientIdentity(headers: Headers): string {
  const cfIp = headers.get("CF-Connecting-IP");
  if (cfIp) return cfIp.trim();
  const xff = headers.get("X-Forwarded-For");
  if (xff) return xff.split(",")[0].trim();
  return "unknown";
}

// ── Request Boundary ────────────────────────────────────────────────────

export interface BoundaryEnv extends SecurityEnv {
  LEGACY_FREEZE?: string;
  /** Wave 4C: public-read edge cache TTL in seconds (see `edgeCache.ts`). */
  PUBLIC_EDGE_CACHE_TTL_SECONDS?: string;
}

/**
 * Wave 4C — injectable edge-cache wiring for the request boundary.
 *
 * `cache: undefined` uses the runtime's `caches.default`; `cache: null` disables
 * the fast path outright (unit tests, non-Workers runtimes).
 */
export interface BoundaryOptions {
  cache?: EdgeCacheLike | null;
  /** Workers `ctx.waitUntil`, so a cache write never delays the response. */
  waitUntil?: (promise: Promise<unknown>) => void;
}

export type Dispatcher = (request: Request) => Promise<Response>;

function jsonError(status: number, code?: string, message?: string): Response {
  return new Response(JSON.stringify({ error: { code: code ?? "ERROR", message: message ?? "Request denied" } }), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

const DEFAULT_LIMITER = new RateLimiter();
const DB_LIMITERS = new WeakMap<object, DurableRateLimiter>();

/**
 * Full API request boundary:
 * 1. OPTIONS preflight
 * 2. Fail-closed authentication & authorization
 * 3. Durable rate limiting with graceful fallback
 * 4. Dispatch & CORS application
 */
async function runSecurityBoundary(
  request: Request,
  env: BoundaryEnv,
  dispatch: Dispatcher,
  limiter?: RateLimiterInterface,
  options: BoundaryOptions = {},
): Promise<Response> {
  const url = new URL(request.url);
  const origin = resolveOrigin(request.headers.get("Origin"), env);

  if (request.method === "OPTIONS") {
    return applyResponseCachePolicy(new Response(null, { status: 204, headers: corsHeaders(origin) }), false);
  }

  const auth = await authorizeRequestSecure(request.method, url.pathname, request.headers, env);
  if (!auth.ok) {
    return applyResponseCachePolicy(applyCors(jsonError(auth.status ?? 401, auth.code, auth.message), origin), false);
  }

  // ── Wave 4C — edge cache fast path (Free-Tier Survival Mode) ──────────────
  //
  // Runs after authorization (which is pure: no D1, no network) but BEFORE the
  // DurableRateLimiter and BEFORE dispatch, so a cached public read costs ZERO
  // D1 reads and ZERO D1 writes. Only an anonymous public GET on the explicit
  // allowlist is ever considered; everything else falls through untouched.
  const edgeCacheKey =
    auth.role === "public" && isEdgeCacheEligible(request, url) ? edgeCacheRequest(request, url, env) : null;
  const edgeCache = edgeCacheKey
    ? options.cache === undefined
      ? defaultEdgeCache()
      : options.cache
    : null;

  if (edgeCacheKey && edgeCache) {
    let cached: Response | undefined;
    try {
      cached = await edgeCache.match(edgeCacheKey);
    } catch (err: any) {
      console.warn("[EDGE_CACHE] lookup failed; serving live", {
        site: "edge_cache.match",
        path: url.pathname,
        error: err?.message ?? String(err),
      });
      cached = undefined;
    }
    if (cached) {
      // The stored object deliberately carries no CORS header, so the current
      // requester's policy (and `Vary: Origin`) is applied here, per request.
      const headers = new Headers(cached.headers);
      headers.set(EDGE_CACHE_STATUS_HEADER, "HIT");
      return applyCors(
        new Response(cached.body, { status: cached.status, statusText: cached.statusText, headers }),
        origin,
      );
    }
  }

  // Rate limiter selection: explicit parameter > cached DurableRateLimiter(env.DB) > in-memory DEFAULT_LIMITER
  let activeLimiter: RateLimiterInterface = limiter ?? DEFAULT_LIMITER;
  if (!limiter && env.DB) {
    let dLimiter = DB_LIMITERS.get(env.DB as object);
    if (!dLimiter) {
      dLimiter = new DurableRateLimiter(env.DB, () => Date.now(), DEFAULT_LIMITER);
      DB_LIMITERS.set(env.DB as object, dLimiter);
    }
    activeLimiter = dLimiter;
  }

  // Wave 4A: a feed request carrying a search term uses the stricter tier.
  const hasSearchQuery = (url.searchParams.get("q") ?? "").trim().length > 0;
  const endpointClass = classifyEndpoint(request.method, url.pathname, hasSearchQuery);
  const ip = clientIdentity(request.headers);
  const identity = auth.role === "public" ? ip : `${auth.role}:${ip}`;

  let decision: RateLimitResult;
  try {
    decision = await activeLimiter.check(`${endpointClass}:${identity}`, RATE_LIMITS[endpointClass]);
  } catch (err: any) {
    // Durable store failure policy:
    // Sensitive endpoints fail closed (503 Service Unavailable).
    // Public reads degrade to in-memory limiter.
    if (endpointClass !== "public_read") {
      const headers = new Headers(corsHeaders(origin));
      headers.set("Content-Type", "application/json");
      headers.set("Cache-Control", "private, no-store");
      return new Response(JSON.stringify({ error: { code: "RATE_LIMIT_UNAVAILABLE", message: "Rate limit service unavailable" } }), {
        status: 503,
        headers,
      });
    }
    decision = DEFAULT_LIMITER.check(`${endpointClass}:${identity}`, RATE_LIMITS[endpointClass]);
  }

  // A degraded durable decision is only acceptable for anonymous reads. Any
  // sensitive class keeps the fail-closed contract even though the limiter
  // itself failed open (ZX-14).
  if (decision.degraded && endpointClass !== "public_read") {
    console.error("[SECURITY_BOUNDARY] rate limiter degraded; failing closed", {
      site: "security_boundary.rate_limit_degraded",
      path: url.pathname,
      endpoint_class: endpointClass,
      cf_ray: request.headers.get("cf-ray"),
    });
    const headers = new Headers(corsHeaders(origin));
    headers.set("Content-Type", "application/json");
    headers.set("Cache-Control", "private, no-store");
    return new Response(JSON.stringify({ error: { code: "RATE_LIMIT_UNAVAILABLE", message: "Rate limit service unavailable" } }), {
      status: 503,
      headers,
    });
  }

  if (!decision.allowed) {
    // ZX-25: a 429 must be a complete backoff contract — an integer Retry-After of
    // at least 1 second, an explicitly uncacheable response, and the same value in
    // the JSON body for clients that cannot read the header.
    // PHASE 7A — acquisition writes are a fixed 60-second window, so the
    // advertised backoff is the whole window rather than the refill interval.
    const retryAfterSeconds =
      endpointClass === "public_write"
        ? RATE_LIMITS.public_write.windowSeconds
        : Math.max(1, Math.ceil(Number(decision.retryAfterSeconds) || 1));
    const headers = new Headers(corsHeaders(origin));
    headers.set("Content-Type", "application/json");
    headers.set("Retry-After", String(retryAfterSeconds));
    headers.set("Cache-Control", "no-store");
    return new Response(
      JSON.stringify({ error: { code: "RATE_LIMITED", message: "Rate limit exceeded" }, retryAfter: retryAfterSeconds }),
      { status: 429, headers },
    );
  }

  try {
    const response = applyCors(await dispatch(request), origin);
    const live = applyResponseCachePolicy(response, auth.role === "public");

    if (edgeCacheKey && edgeCache) {
      const copy = buildCacheableCopy(live, resolveEdgeCacheTtlSeconds(env));
      if (copy) {
        const store = edgeCache.put(edgeCacheKey, copy).catch((err: any) => {
          console.warn("[EDGE_CACHE] store failed", {
            site: "edge_cache.put",
            path: url.pathname,
            error: err?.message ?? String(err),
          });
        });
        if (options.waitUntil) options.waitUntil(store);
        const headers = new Headers(live.headers);
        headers.set(EDGE_CACHE_STATUS_HEADER, "MISS");
        return new Response(live.body, { status: live.status, statusText: live.statusText, headers });
      }
    }

    return live;
  } catch (err: any) {
    console.error("[SECURITY_BOUNDARY] unhandled dispatch failure", {
      site: "security_boundary.dispatch",
      path: url.pathname,
      method: request.method,
      cf_ray: request.headers.get("cf-ray"),
      error: err?.stack ?? err?.message ?? String(err),
    });
    return applyResponseCachePolicy(applyCors(jsonError(500, "INTERNAL_ERROR", "Internal server error"), origin), false);
  }
}

// ── PHASE 7A — enterprise rate-limit / correlation headers ───────────────

/** Correlation identifier, unique per invocation and never cached. */
export const REQUEST_ID_HEADER = "X-Request-Id";
/** Allowance for the resolved endpoint class and credential tier, per 60s. */
export const RATE_LIMIT_HEADER = "X-RateLimit-Limit";
/** Resolved credential tier: anonymous | free | pro | enterprise. */
export const TIER_HEADER = "X-Zayron-Tier";

/** JSON 429 with the complete backoff contract. */
export function rateLimitedResponse(origin: string | null, limit: number, tier: string, retryAfterSeconds = 60): Response {
  const headers = new Headers(corsHeaders(origin));
  headers.set("Content-Type", "application/json");
  headers.set("Retry-After", String(retryAfterSeconds));
  headers.set("Cache-Control", "private, no-store");
  headers.set(RATE_LIMIT_HEADER, String(limit));
  headers.set(TIER_HEADER, tier);
  return new Response(
    JSON.stringify({
      error: { code: "RATE_LIMITED", message: `Rate limit exceeded for the ${tier} tier` },
      retryAfter: retryAfterSeconds,
    }),
    { status: 429, headers },
  );
}

/**
 * Attach the correlation and allowance headers to an API response.
 *
 * A tier/limit set by the dispatcher (an authenticated API-key request) wins;
 * otherwise the anonymous allowance for the endpoint class is reported. The
 * values are per-request, so the edge cache strips them before storing a copy.
 */
function decorateApiResponse(response: Response, request: Request, url: URL): Response {
  const headers = new Headers(response.headers);
  headers.delete(REQUEST_ID_HEADER);
  headers.set(REQUEST_ID_HEADER, crypto.randomUUID());
  if (!headers.has(TIER_HEADER)) headers.set(TIER_HEADER, "anonymous");
  if (!headers.has(RATE_LIMIT_HEADER)) {
    const hasSearchQuery = (url.searchParams.get("q") ?? "").trim().length > 0;
    const endpointClass = classifyEndpoint(request.method, url.pathname, hasSearchQuery);
    headers.set(RATE_LIMIT_HEADER, String(RATE_LIMITS[endpointClass].capacity));
  }
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
}

/**
 * Full API request boundary: OPTIONS → auth → edge cache → rate limit → CORS,
 * plus the Phase 7A correlation/allowance headers on every `/api/v1/*` reply.
 */
export async function withSecurityBoundary(
  request: Request,
  env: BoundaryEnv,
  dispatch: Dispatcher,
  limiter?: RateLimiterInterface,
  options: BoundaryOptions = {},
): Promise<Response> {
  const response = await runSecurityBoundary(request, env, dispatch, limiter, options);
  const url = new URL(request.url);
  if (!url.pathname.startsWith("/api/v1/")) return response;
  return decorateApiResponse(response, request, url);
}

