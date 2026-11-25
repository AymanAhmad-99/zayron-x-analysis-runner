/**
 * Wave 4C — Free-Tier Survival Mode: edge cache fast path for API public reads.
 *
 * Cloudflare's $0 plan meters D1 row reads and row writes. Every anonymous read
 * of a public surface (vulnerability lists, malware reports, the sitemap feed)
 * currently costs a durable rate-limit row write plus the handler's own reads,
 * even though the answer is byte-identical for every visitor. Caching those
 * responses at the edge makes a repeat read cost ZERO D1 reads and ZERO D1
 * writes, which is the only way to survive a crawler on the free tier.
 *
 * Eligibility is FAIL-CLOSED. A request is only edge-cacheable when EVERY check
 * below passes:
 *
 *   1. method is exactly `GET`;
 *   2. it carries none of `Authorization`, `Cookie`, `X-API-Key` — authenticated
 *      or personalized traffic NEVER touches the shared cache;
 *   3. the path is on the explicit anonymous public-read allowlist (a strict
 *      subset of the security boundary's own public-read policy);
 *   4. it has no non-empty `q` search parameter, so the enforced search rate
 *      limiter is never bypassed by a cache hit.
 *
 * This module is pure and dependency-free (no `cloudflare:workers`, no wasm) so
 * both branches are unit-testable in plain bun. The Cache API is reached through
 * an injected {@link EdgeCacheLike}; {@link defaultEdgeCache} guards the runtime
 * global so a local bun test without `caches` never crashes.
 */

/** The only env input this module needs. Absent ⇒ the Free-Tier default. */
export interface EdgeCacheEnv {
  PUBLIC_EDGE_CACHE_TTL_SECONDS?: string;
  PUBLIC_EDGE_CACHE_EPOCH?: string;
}

/** Minimal, injectable surface of the Cloudflare Cache API. */
export interface EdgeCacheLike {
  match(request: Request): Promise<Response | undefined>;
  put(request: Request, response: Response): Promise<void>;
}

/** Response header that tells operators whether the edge cache answered. */
export const EDGE_CACHE_STATUS_HEADER = "X-Zayron-Cache";

/**
 * 4 hours. Free-Tier Survival Mode: content changes on an hourly (not second)
 * cadence, so a 4h edge TTL collapses the D1 read count of public traffic to
 * near zero while keeping stale data bounded. Overridable per environment via
 * `PUBLIC_EDGE_CACHE_TTL_SECONDS` with no code change.
 */
export const DEFAULT_PUBLIC_EDGE_CACHE_TTL_SECONDS = 14400;

/** Lower bound: a shorter TTL cannot protect the daily row budget. */
const MIN_EDGE_CACHE_TTL_SECONDS = 60;
/** Upper bound: 24h, so a bad value cannot pin stale content for days. */
const MAX_EDGE_CACHE_TTL_SECONDS = 86400;

/**
 * Headers that make a request caller-specific. Any one of them disqualifies the
 * request from the shared cache, because a shared object keyed only by URL would
 * hand one caller another caller's response.
 */
const AUTH_SENSITIVE_HEADERS = ["authorization", "cookie", "x-api-key"] as const;

/**
 * Anonymous public reads that are safe to serve from a shared edge object.
 * Every entry maps to a real route in `workers/api/src/index.ts`:
 *
 *   GET /api/v1/sitemap/manifest, /api/v1/sitemap/:kind
 *   GET /api/v1/intelligence                 (list)
 *   GET /api/v1/intelligence/:id             (single report view)
 *   GET /api/v1/vulnerabilities              (list)
 *   GET /api/v1/vulnerabilities/:id          (detail)
 *   GET /api/v1/malware/intelligence/reports (list)
 *   GET /api/v1/malware/intelligence/reports/:id (detail)
 *   GET /api/v1/feed
 */
const PUBLIC_READ_CACHE_EXACT = new Set<string>([
  // PHASE 7A — the versioned developer specification is a static public read.
  "/api/v1/openapi.json",
  // PHASE 7B — the IOC fleet rollup is byte-identical for every caller, so a
  // repeat read costs zero D1 reads. Per-indicator lookups carry `q` and are
  // therefore never cached; the feed and EDL are credentialed.
  "/api/v1/iocs/stats",
  // PHASE 7D — pipeline health: a 60s badge read, cached like any public read.
  "/api/v1/health/pipeline",
  "/api/v1/intelligence",
  "/api/v1/vulnerabilities",
  "/api/v1/malware/intelligence/reports",
  // PHASE 7C — the OpenSSF dossier list is an anonymous catalog read.
  "/api/v1/malware/supply-chain/reports",
  "/api/v1/feed",
]);

const PUBLIC_READ_CACHE_PREFIXES = [
  "/api/v1/sitemap/",
  "/api/v1/intelligence/",
  "/api/v1/vulnerabilities/",
  "/api/v1/malware/intelligence/reports/",
];

/**
 * Operator surfaces that live under a public read PREFIX but are not public
 * reads themselves. Listed explicitly so a GET to one of them can never be
 * cached (and therefore never answered without its authorization path).
 */
const NON_CACHEABLE_PATHS = new Set<string>([
  "/api/v1/intelligence/process",
  "/api/v1/intelligence/backfill",
  "/api/v1/intelligence/shadow-vectorize",
  "/api/v1/intelligence/ingest-event",
  "/api/v1/intelligence/preview",
]);

/** True only when EVERY fail-closed eligibility check passes. */
export function isEdgeCacheEligible(request: Request, url: URL = new URL(request.url)): boolean {
  if (request.method.toUpperCase() !== "GET") return false;

  for (const header of AUTH_SENSITIVE_HEADERS) {
    if (request.headers.has(header)) return false;
  }

  // A search term keeps the strict, enforced search rate limit in the path.
  if ((url.searchParams.get("q") ?? "").trim() !== "") return false;

  const path = url.pathname;
  if (NON_CACHEABLE_PATHS.has(path)) return false;
  if (PUBLIC_READ_CACHE_EXACT.has(path)) return true;
  return PUBLIC_READ_CACHE_PREFIXES.some((prefix) => path.startsWith(prefix));
}

/**
 * The cache key. Built from the URL only: an eligible request is by definition
 * origin- and credential-independent, and per-request CORS headers are re-applied
 * on every hit by `applyCors()` instead of being stored (see
 * {@link buildCacheableCopy}). The fragment is dropped because it is never sent
 * to a server.
 */
export function edgeCacheRequest(request: Request, url: URL = new URL(request.url), env: EdgeCacheEnv = {}): Request {
  const key = new URL(url.toString());
  key.hash = "";
  const epoch = resolveEdgeCacheEpoch(env);
  if (epoch) key.searchParams.set(EDGE_CACHE_EPOCH_PARAM, epoch);
  return new Request(key.toString(), { method: "GET" });
}

/** Cache-key parameter that carries the cache generation. */
export const EDGE_CACHE_EPOCH_PARAM = "__edge_epoch";

/**
 * Resolve `PUBLIC_EDGE_CACHE_EPOCH` — the cache generation.
 *
 * A public read is cached for hours, so a release that changes the SHAPE or the
 * MEANING of a stored record (a schema migration, a re-enrichment, a brief
 * contract bump) would otherwise keep serving the previous payload until the TTL
 * expired. Changing this value moves every public read to a new cache key, which
 * invalidates the whole generation at once without a purge API. Anything outside
 * a conservative token charset is ignored rather than trusted into the key.
 */
export function resolveEdgeCacheEpoch(env: EdgeCacheEnv = {}): string {
  const raw = (env.PUBLIC_EDGE_CACHE_EPOCH ?? "").trim();
  return /^[A-Za-z0-9._-]{1,32}$/.test(raw) ? raw : "";
}

/**
 * Resolve `PUBLIC_EDGE_CACHE_TTL_SECONDS`, clamping it into a sane window.
 * Absent, empty, non-numeric or out-of-range input falls back to the Free-Tier
 * default rather than disabling protection by accident.
 */
export function resolveEdgeCacheTtlSeconds(env: EdgeCacheEnv = {}): number {
  const raw = (env.PUBLIC_EDGE_CACHE_TTL_SECONDS ?? "").trim();
  if (!/^\d+$/.test(raw)) return DEFAULT_PUBLIC_EDGE_CACHE_TTL_SECONDS;
  const seconds = Number(raw);
  if (!Number.isSafeInteger(seconds) || seconds <= 0) return DEFAULT_PUBLIC_EDGE_CACHE_TTL_SECONDS;
  return Math.min(MAX_EDGE_CACHE_TTL_SECONDS, Math.max(MIN_EDGE_CACHE_TTL_SECONDS, seconds));
}

/** The runtime cache, or `null` when this isolate has none (local bun tests). */
export function defaultEdgeCache(): EdgeCacheLike | null {
  try {
    if (typeof globalThis.caches === "undefined" || !globalThis.caches) return null;
    const runtime = globalThis.caches as unknown as { default?: EdgeCacheLike };
    return runtime.default ?? null;
  } catch {
    return null;
  }
}

/** Replace `s-maxage` in a Cache-Control value, preserving every other directive. */
function withEdgeTtl(cacheControl: string, ttlSeconds: number): string {
  const directives = cacheControl
    .split(",")
    .map((directive) => directive.trim())
    .filter((directive) => directive !== "" && !/^s-maxage\s*=/i.test(directive));
  directives.push(`s-maxage=${ttlSeconds}`);
  return directives.join(", ");
}

/**
 * Build the object to STORE, or `null` when the response must never be cached.
 *
 * Refuses anything that is not an explicitly public 200 (`private`/`no-store`
 * or a missing/`public`-less Cache-Control is a refusal), strips every header
 * that could leak one caller's identity or origin to another, and applies the
 * Free-Tier edge TTL.
 */
export function buildCacheableCopy(response: Response, ttlSeconds: number): Response | null {
  if (response.status !== 200) return null;

  const cacheControl = (response.headers.get("Cache-Control") ?? "").trim();
  const normalized = cacheControl.toLowerCase();
  if (!normalized || !normalized.includes("public")) return null;
  if (normalized.includes("private") || normalized.includes("no-store")) return null;

  const headers = new Headers(response.headers);
  // CORS is resolved per request by `applyCors()` on the way out, so the stored
  // object must not carry one origin's `Access-Control-Allow-Origin` (that is
  // the cross-origin poisoning bug this strip exists to prevent).
  headers.delete("Access-Control-Allow-Origin");
  headers.delete("Access-Control-Allow-Credentials");
  headers.delete("Set-Cookie");
  // PHASE 7A — per-request correlation and allowance values must never be
  // replayed from a shared object to a different caller.
  headers.delete("X-Request-Id");
  headers.delete("X-RateLimit-Limit");
  headers.delete("X-Zayron-Tier");
  headers.set("Cache-Control", withEdgeTtl(cacheControl, ttlSeconds));

  // CLONE first: `new Response(response.body, ...)` would lock the live body's
  // stream, and the caller still has to return that same live response. Cloning
  // tees the stream so the object handed to `cache.put` and the object handed
  // to the client each own an independent body.
  const copy = response.clone();
  return new Response(copy.body, {
    status: copy.status,
    statusText: copy.statusText,
    headers,
  });
}
