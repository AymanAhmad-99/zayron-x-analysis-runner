/**
 * Wave 4C — FREE-TIER SURVIVAL MODE ($0 launch protection).
 *
 * Deterministic, local-only. Proves the three budget-saving mechanisms and the
 * two Gate 1 config fixes:
 *
 *   1. EDGE CACHE FAST PATH — a HIT is served BEFORE the DurableRateLimiter and
 *      BEFORE the route handler, so it costs ZERO D1 reads and ZERO D1 writes;
 *      authenticated traffic, `?q=` searches and non-GET methods are bypassed;
 *      only public 200s are ever stored; per-request CORS survives a shared
 *      object (no cross-origin poisoning).
 *   2. INGEST CRON THROTTLE — preview is dormant, production runs every 4h.
 *   3. SITEMAP_MAX_SHARDS — caps the advertised/served shard inventory, while
 *      leaving every detail page reachable.
 *   4. Gate 1 config — `migrations_dir` on both `DB` bindings and the
 *      `PUBLIC_EDGE_CACHE_TTL_SECONDS` var.
 */
import { afterEach, describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";

import {
  buildCacheableCopy,
  DEFAULT_PUBLIC_EDGE_CACHE_TTL_SECONDS,
  EDGE_CACHE_STATUS_HEADER,
  edgeCacheRequest,
  isEdgeCacheEligible,
  resolveEdgeCacheTtlSeconds,
  type EdgeCacheLike,
} from "../../workers/api/src/edgeCache";
import {
  requiredTrust,
  withSecurityBoundary,
  type BoundaryEnv,
  type RateLimitPolicy,
  type RateLimitResult,
} from "../../workers/api/src/security";
import {
  capSitemapShardCounts,
  isSitemapPageWithinCap,
} from "../../apps/web/app/lib/sitemap";
import { resolveSitemapMaxShards } from "../../apps/web/app/lib/siteConfig";
import { GET as sitemapIndexGET } from "../../apps/web/app/sitemap.xml/route";
import { GET as sitemapShardGET } from "../../apps/web/app/sitemaps/[shard]/route";

const API = "https://api.zayron-x.co";
const SITE = "https://zayron-x.co";

const ENV: BoundaryEnv = {
  ENVIRONMENT: "production",
  ALLOWED_ORIGINS: "https://zayron-x.co,https://www.zayron-x.co",
  PUBLIC_EDGE_CACHE_TTL_SECONDS: "14400",
};

const PUBLIC_CACHE_CONTROL = "public, max-age=30, s-maxage=60, stale-while-revalidate=120";

const ORIGINAL_FETCH = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = ORIGINAL_FETCH;
  delete process.env.SITEMAP_MAX_SHARDS;
});

// ── harness ─────────────────────────────────────────────────────────────

interface CacheHarness {
  cache: EdgeCacheLike;
  store: Map<string, Response>;
  stats: { match: number; put: number };
}

/** A Map-backed Cache API double that counts every call. */
function memoryCache(seed?: Record<string, Response>): CacheHarness {
  const store = new Map<string, Response>(Object.entries(seed ?? {}));
  const stats = { match: 0, put: 0 };
  return {
    store,
    stats,
    cache: {
      async match(request: Request) {
        stats.match += 1;
        const hit = store.get(request.url);
        return hit ? hit.clone() : undefined;
      },
      async put(request: Request, response: Response) {
        stats.put += 1;
        store.set(request.url, response.clone());
      },
    },
  };
}

interface LimiterHarness {
  limiter: {
    check(key: string, policy: RateLimitPolicy): RateLimitResult;
  };
  calls: () => number;
}

function countingLimiter(): LimiterHarness {
  let calls = 0;
  return {
    calls: () => calls,
    limiter: {
      check(): RateLimitResult {
        calls += 1;
        return { allowed: true, retryAfterSeconds: 0, remaining: 99, source: "memory" };
      },
    },
  };
}

/** A D1 double that throws the moment anything touches it. */
function forbiddenDb() {
  const state = { prepares: 0 };
  return {
    state,
    db: {
      prepare(): never {
        state.prepares += 1;
        throw new Error("D1 must not be touched on an edge-cache HIT");
      },
    },
  };
}

function publicJsonResponse(body: unknown = { ok: true }, cacheControl = PUBLIC_CACHE_CONTROL): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "Content-Type": "application/json", "Cache-Control": cacheControl },
  });
}

/** Run the boundary and await every deferred cache write before returning. */
async function runBoundary(
  request: Request,
  options: {
    cache: EdgeCacheLike | null;
    limiter?: LimiterHarness["limiter"];
    dispatch?: (request: Request) => Promise<Response>;
    db?: unknown;
  },
) {
  const pending: Array<Promise<unknown>> = [];
  const dispatchCalls = { count: 0 };
  const dispatch = async (req: Request) => {
    dispatchCalls.count += 1;
    return options.dispatch ? options.dispatch(req) : publicJsonResponse();
  };
  const response = await withSecurityBoundary(
    request,
    options.db ? ({ ...ENV, DB: options.db } as BoundaryEnv) : ENV,
    dispatch,
    options.limiter as never,
    { cache: options.cache, waitUntil: (promise) => pending.push(promise) },
  );
  await Promise.all(pending);
  return { response, dispatchCalls: dispatchCalls.count };
}

function seedCachedResponse(body: unknown, headers: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "public, max-age=30, s-maxage=14400",
      Vary: "Origin",
      ...headers,
    },
  });
}

// ── 1. edge cache fast path ─────────────────────────────────────────────

describe("Wave 4C — edge cache eligibility (fail-closed allowlist)", () => {
  test("every anonymous public read surface is eligible", () => {
    const eligible = [
      "/api/v1/sitemap/manifest",
      "/api/v1/sitemap/vulnerabilities?page=1&limit=2000",
      "/api/v1/intelligence",
      "/api/v1/intelligence/CVE-2026-0001",
      "/api/v1/vulnerabilities",
      "/api/v1/vulnerabilities/CVE-2026-0001",
      "/api/v1/malware/intelligence/reports",
      "/api/v1/malware/intelligence/reports/report-1",
      "/api/v1/feed",
    ];
    for (const path of eligible) {
      const request = new Request(`${API}${path}`);
      expect({ path, eligible: isEdgeCacheEligible(request) }).toEqual({ path, eligible: true });
      // Belt and braces: each must also be an explicitly public read for the
      // security boundary, so the cache can never front an operator surface.
      expect({ path, trust: requiredTrust("GET", new URL(request.url).pathname) }).toEqual({
        path,
        trust: "public",
      });
    }
  });

  test("operator, uncatalogued and search surfaces are NOT eligible", () => {
    const ineligible = [
      "/api/v1/health",
      "/api/v1/admin/status",
      "/api/v1/search?q=cve",
      "/api/v1/malware",
      "/api/v1/knowledge",
      "/api/v1/intelligence/process",
      "/api/v1/intelligence/backfill",
      "/api/v1/intelligence/shadow-vectorize",
    ];
    for (const path of ineligible) {
      expect({ path, eligible: isEdgeCacheEligible(new Request(`${API}${path}`)) }).toEqual({
        path,
        eligible: false,
      });
    }
  });

  test("non-GET methods are never eligible", () => {
    for (const method of ["POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS"]) {
      const request = new Request(`${API}/api/v1/vulnerabilities`, { method });
      expect({ method, eligible: isEdgeCacheEligible(request) }).toEqual({ method, eligible: false });
    }
  });

  test("Authorization, Cookie and X-API-Key each disqualify the request", () => {
    for (const header of ["Authorization", "Cookie", "X-API-Key"]) {
      const request = new Request(`${API}/api/v1/vulnerabilities`, {
        headers: { [header]: "synthetic-credential" },
      });
      expect({ header, eligible: isEdgeCacheEligible(request) }).toEqual({ header, eligible: false });
    }
  });

  test("any non-empty q search term bypasses the cache (rate limit stays enforced)", () => {
    for (const suffix of ["?q=cve-2026", "?page=2&q=x", "?q=%20cve%20"]) {
      const request = new Request(`${API}/api/v1/feed${suffix}`);
      expect({ suffix, eligible: isEdgeCacheEligible(request) }).toEqual({ suffix, eligible: false });
    }
    // A blank q is not a search: nothing is scanned, so the strict search
    // limiter is not being bypassed by caching it.
    expect(isEdgeCacheEligible(new Request(`${API}/api/v1/feed?q=`))).toBe(true);
    expect(isEdgeCacheEligible(new Request(`${API}/api/v1/feed?q=%20`))).toBe(true);
  });

  test("the cache key is URL-only and fragment-free", () => {
    const request = new Request(`${API}/api/v1/vulnerabilities?page=2#frag`, {
      headers: { Accept: "application/json" },
    });
    const key = edgeCacheRequest(request);
    expect(key.url).toBe(`${API}/api/v1/vulnerabilities?page=2`);
    expect(key.method).toBe("GET");
    expect(key.headers.get("Accept")).toBeNull();
  });

  test("the TTL is configurable and clamps to a safe window", () => {
    expect(DEFAULT_PUBLIC_EDGE_CACHE_TTL_SECONDS).toBe(14400);
    expect(resolveEdgeCacheTtlSeconds({ PUBLIC_EDGE_CACHE_TTL_SECONDS: "14400" })).toBe(14400);
    expect(resolveEdgeCacheTtlSeconds({ PUBLIC_EDGE_CACHE_TTL_SECONDS: "600" })).toBe(600);
    expect(resolveEdgeCacheTtlSeconds({ PUBLIC_EDGE_CACHE_TTL_SECONDS: "1" })).toBe(60);
    expect(resolveEdgeCacheTtlSeconds({ PUBLIC_EDGE_CACHE_TTL_SECONDS: "999999" })).toBe(86400);
    for (const bad of [undefined, "", "abc", "0", "-5", "1.5"]) {
      expect({ bad, ttl: resolveEdgeCacheTtlSeconds({ PUBLIC_EDGE_CACHE_TTL_SECONDS: bad }) }).toEqual({
        bad,
        ttl: DEFAULT_PUBLIC_EDGE_CACHE_TTL_SECONDS,
      });
    }
  });
});

describe("Wave 4C — a cache HIT costs ZERO D1", () => {
  test("a HIT skips the DurableRateLimiter, the handler, and every D1 prepare", async () => {
    const request = new Request(`${API}/api/v1/vulnerabilities`);
    const { cache, store } = memoryCache({
      [edgeCacheRequest(request).url]: seedCachedResponse({ items: ["cached"] }),
    });
    const limiter = countingLimiter();
    const { state: dbState, db } = forbiddenDb();

    const { response, dispatchCalls } = await runBoundary(request, {
      cache,
      limiter: limiter.limiter,
      db,
    });

    expect(response.status).toBe(200);
    expect(response.headers.get(EDGE_CACHE_STATUS_HEADER)).toBe("HIT");
    expect(await response.json()).toEqual({ items: ["cached"] });
    // The whole point of the fast path:
    expect(limiter.calls()).toBe(0);
    expect(dispatchCalls).toBe(0);
    expect(dbState.prepares).toBe(0);
    expect(store.size).toBe(1);
  });

  test("a MISS runs the limiter and the handler exactly once, then stores one object", async () => {
    const { cache, store, stats } = memoryCache();
    const limiter = countingLimiter();
    const { response, dispatchCalls } = await runBoundary(
      new Request(`${API}/api/v1/vulnerabilities`),
      { cache, limiter: limiter.limiter },
    );

    expect(response.headers.get(EDGE_CACHE_STATUS_HEADER)).toBe("MISS");
    expect(limiter.calls()).toBe(1);
    expect(dispatchCalls).toBe(1);
    expect(stats.put).toBe(1);
    expect(store.size).toBe(1);

    // The second identical request is a HIT with no limiter and no handler.
    const second = await runBoundary(new Request(`${API}/api/v1/vulnerabilities`), {
      cache,
      limiter: limiter.limiter,
    });
    expect(second.response.headers.get(EDGE_CACHE_STATUS_HEADER)).toBe("HIT");
    expect(limiter.calls()).toBe(1);
    expect(second.dispatchCalls).toBe(0);
  });

  test("a broken cache is transparent: the live response is still served", async () => {
    const broken: EdgeCacheLike = {
      async match() {
        throw new Error("cache unavailable");
      },
      async put() {
        throw new Error("cache unavailable");
      },
    };
    const limiter = countingLimiter();
    const { response, dispatchCalls } = await runBoundary(
      new Request(`${API}/api/v1/vulnerabilities`),
      { cache: broken, limiter: limiter.limiter },
    );
    expect(response.status).toBe(200);
    expect(response.headers.get(EDGE_CACHE_STATUS_HEADER)).toBe("MISS");
    expect(dispatchCalls).toBe(1);
    expect(limiter.calls()).toBe(1);
  });
});

describe("Wave 4C — nothing caller-specific is ever cached or served", () => {
  test("a request carrying credentials never reads the cache and is never stored", async () => {
    const base = new Request(`${API}/api/v1/vulnerabilities`);
    const seeded = seedCachedResponse({ items: ["shared"] });
    for (const [header, value] of [
      ["Authorization", "Bearer synthetic"],
      ["Cookie", "session=synthetic"],
      ["X-API-Key", "synthetic"],
    ] as const) {
      const { cache, stats } = memoryCache({ [edgeCacheRequest(base).url]: seeded.clone() });
      const limiter = countingLimiter();
      const { response, dispatchCalls } = await runBoundary(
        new Request(`${API}/api/v1/vulnerabilities`, { headers: { [header]: value } }),
        { cache, limiter: limiter.limiter },
      );
      expect({ header, match: stats.match }).toEqual({ header, match: 0 });
      expect({ header, put: stats.put }).toEqual({ header, put: 0 });
      expect({ header, hit: response.headers.get(EDGE_CACHE_STATUS_HEADER) }).toEqual({
        header,
        hit: null,
      });
      expect({ header, dispatchCalls }).toEqual({ header, dispatchCalls: 1 });
    }
  });

  test("a ?q= search never reads the cache and is never stored", async () => {
    const base = new Request(`${API}/api/v1/feed`);
    const { cache, stats } = memoryCache({
      [edgeCacheRequest(base).url]: seedCachedResponse({ items: ["shared"] }),
    });
    const limiter = countingLimiter();
    const { response } = await runBoundary(new Request(`${API}/api/v1/feed?q=ransomware`), {
      cache,
      limiter: limiter.limiter,
    });
    expect(stats.match).toBe(0);
    expect(stats.put).toBe(0);
    expect(response.headers.get(EDGE_CACHE_STATUS_HEADER)).toBeNull();
  });

  test("non-200 and private/no-store responses are never stored", () => {
    expect(buildCacheableCopy(publicJsonResponse(), 14400)).not.toBeNull();
    expect(buildCacheableCopy(publicJsonResponse({}, "public, max-age=30"), 14400)).not.toBeNull();

    for (const [label, response] of [
      ["500", new Response("boom", { status: 500, headers: { "Cache-Control": "public, max-age=30" } })],
      ["503", new Response("boom", { status: 503, headers: { "Cache-Control": "public" } })],
      ["404", new Response("gone", { status: 404, headers: { "Cache-Control": "public" } })],
      ["201", new Response("created", { status: 201, headers: { "Cache-Control": "public" } })],
      ["private", publicJsonResponse({}, "private, max-age=0")],
      ["no-store", publicJsonResponse({}, "no-store")],
      ["absent", new Response("{}", { status: 200 })],
      ["non-public", new Response("{}", { status: 200, headers: { "Cache-Control": "max-age=30" } })],
    ] as const) {
      expect({ label, cacheable: buildCacheableCopy(response, 14400) }).toEqual({
        label,
        cacheable: null,
      });
    }
  });

  test("the boundary never stores a private or failing response", async () => {
    for (const dispatch of [
      async () => new Response("boom", { status: 500 }),
      async () => publicJsonResponse({}, "private, no-store"),
      async () => new Response("{}", { status: 200, headers: { "Cache-Control": "no-store" } }),
    ]) {
      const { cache, stats } = memoryCache();
      await runBoundary(new Request(`${API}/api/v1/vulnerabilities`), {
        cache,
        limiter: countingLimiter().limiter,
        dispatch,
      });
      expect(stats.put).toBe(0);
    }
  });
});

describe("Wave 4C — CORS is per-request, never cached cross-origin", () => {
  test("the stored object carries no ACAO, no credentials flag and no Set-Cookie", () => {
    const live = new Response("{}", {
      status: 200,
      headers: {
        "Cache-Control": "public, max-age=30, s-maxage=60",
        "Access-Control-Allow-Origin": "https://zayron-x.co",
        "Access-Control-Allow-Credentials": "true",
        "Set-Cookie": "session=abc",
        Vary: "Accept-Encoding",
      },
    });
    const copy = buildCacheableCopy(live, 14400);
    expect(copy).not.toBeNull();
    const headers = copy!.headers;
    expect(headers.get("Access-Control-Allow-Origin")).toBeNull();
    expect(headers.get("Access-Control-Allow-Credentials")).toBeNull();
    expect(headers.get("Set-Cookie")).toBeNull();
    // Every other Vary is preserved; the router's TTL replaces only s-maxage.
    expect(headers.get("Vary")).toContain("Accept-Encoding");
    expect(headers.get("Cache-Control")).toBe("public, max-age=30, s-maxage=14400");
  });

  test("two different allowed origins each receive their own ACAO on a HIT", async () => {
    // A bare stored object: no ACAO at all, proving the header is re-derived.
    const request = new Request(`${API}/api/v1/vulnerabilities`);
    const harness = memoryCache({
      [edgeCacheRequest(request).url]: new Response(JSON.stringify({ items: [] }), {
        status: 200,
        headers: { "Content-Type": "application/json", "Cache-Control": "public, s-maxage=14400" },
      }),
    });

    const first = await runBoundary(
      new Request(`${API}/api/v1/vulnerabilities`, { headers: { Origin: "https://zayron-x.co" } }),
      { cache: harness.cache, limiter: countingLimiter().limiter },
    );
    const second = await runBoundary(
      new Request(`${API}/api/v1/vulnerabilities`, { headers: { Origin: "https://www.zayron-x.co" } }),
      { cache: harness.cache, limiter: countingLimiter().limiter },
    );

    for (const [expected, result] of [
      ["https://zayron-x.co", first],
      ["https://www.zayron-x.co", second],
    ] as const) {
      expect(result.response.headers.get(EDGE_CACHE_STATUS_HEADER)).toBe("HIT");
      expect(result.response.headers.get("Access-Control-Allow-Origin")).toBe(expected);
      expect(result.response.headers.get("Vary")).toContain("Origin");
    }
    // Neither request hit the handler.
    expect(first.dispatchCalls).toBe(0);
    expect(second.dispatchCalls).toBe(0);
  });

  test("a disallowed origin gets no ACAO even on a HIT", async () => {
    const request = new Request(`${API}/api/v1/vulnerabilities`);
    const harness = memoryCache({
      [edgeCacheRequest(request).url]: seedCachedResponse({ items: [] }),
    });
    const { response } = await runBoundary(
      new Request(`${API}/api/v1/vulnerabilities`, { headers: { Origin: "https://evil.example" } }),
      { cache: harness.cache, limiter: countingLimiter().limiter },
    );
    expect(response.headers.get("Access-Control-Allow-Origin")).toBeNull();
  });
});

// ── 2. sitemap rollout cap ──────────────────────────────────────────────

function stubApiFetch(payload: unknown): void {
  globalThis.fetch = (async () =>
    new Response(JSON.stringify(payload), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    })) as unknown as typeof fetch;
}

describe("Wave 4C — SITEMAP_MAX_SHARDS rollout cap", () => {
  test("the resolver treats unset/empty/0/junk as uncapped", () => {
    expect(resolveSitemapMaxShards("1")).toBe(1);
    expect(resolveSitemapMaxShards(" 3 ")).toBe(3);
    for (const raw of [undefined, "", "0", "-1", "abc", "1.5", "0x2"]) {
      expect({ raw, max: resolveSitemapMaxShards(raw) }).toEqual({ raw, max: null });
    }
  });

  test("shard counts are capped per kind, and null is uncapped", () => {
    const counts = { vulnerabilities: 5, malware: 3 };
    expect(capSitemapShardCounts(counts, 1)).toEqual({ vulnerabilities: 1, malware: 1 });
    expect(capSitemapShardCounts(counts, 2)).toEqual({ vulnerabilities: 2, malware: 2 });
    expect(capSitemapShardCounts(counts, null)).toEqual({ vulnerabilities: 5, malware: 3 });
    expect(capSitemapShardCounts(null, 1)).toBeNull();
    expect(isSitemapPageWithinCap(1, 1)).toBe(true);
    expect(isSitemapPageWithinCap(2, 1)).toBe(false);
    expect(isSitemapPageWithinCap(900, null)).toBe(true);
  });

  test("SITEMAP_MAX_SHARDS=1 advertises exactly one shard per dynamic kind", async () => {
    process.env.SITEMAP_MAX_SHARDS = "1";
    stubApiFetch({ shards: { vulnerabilities: 5, malware: 3, articles: 2 } });

    const response = await sitemapIndexGET();
    const xml = await response.text();
    expect(xml).toContain(`${SITE}/sitemaps/static.xml`);
    expect(xml).toContain(`${SITE}/sitemaps/vulnerabilities-1.xml`);
    expect(xml).toContain(`${SITE}/sitemaps/malware-1.xml`);
    expect(xml).not.toContain("vulnerabilities-2.xml");
    expect(xml).not.toContain("malware-2.xml");
    expect(xml).not.toContain("articles-");
  });

  test("unsetting SITEMAP_MAX_SHARDS exposes every shard again", async () => {
    stubApiFetch({ shards: { vulnerabilities: 5, malware: 3 } });
    const xml = await (await sitemapIndexGET()).text();
    expect(xml).toContain("vulnerabilities-5.xml");
    expect(xml).toContain("malware-3.xml");
  });

  test("a shard beyond the cap is a 404; inside the cap it is served", async () => {
    const shard = (name: string) =>
      sitemapShardGET(new Request(`${SITE}/sitemaps/${name}`), {
        params: Promise.resolve({ shard: name }),
      });

    process.env.SITEMAP_MAX_SHARDS = "1";
    const capped = await shard("vulnerabilities-2.xml");
    expect(capped.status).toBe(404);
    expect(await capped.text()).toBe("Not Found");

    stubApiFetch({ items: [{ id: "CVE-2026-0001", updated_at: null }] });
    const served = await shard("vulnerabilities-1.xml");
    expect(served.status).toBe(200);
    expect(await served.text()).toContain(`${SITE}/intelligence/vulnerabilities/CVE-2026-0001`);

    // Uncapped: the previously rejected page exists again.
    delete process.env.SITEMAP_MAX_SHARDS;
    expect((await shard("vulnerabilities-2.xml")).status).toBe(200);

    // static.xml is never capped: the launch surface must always be complete.
    expect((await shard("static.xml")).status).toBe(200);
  });
});

// ── 3. Gate 1 config fixes + Free-Tier config assertions ────────────────

function normalized(file: string): string {
  return readFileSync(file, "utf8").replace(/\r\n/g, "\n");
}

/** The body of one `[section]`, from its header to the next section header. */
function tomlSection(text: string, header: string): string {
  const start = text.indexOf(`${header}\n`);
  if (start === -1) return "";
  const rest = text.slice(start + header.length);
  const next = rest.indexOf("\n[");
  return next === -1 ? rest : rest.slice(0, next);
}

describe("Wave 4C — ingest cron throttle", () => {
  const ingest = normalized("workers/ingest/wrangler.toml");

  test("preview runs no cron at all (144 wasted runs/day eliminated)", () => {
    const preview = tomlSection(ingest, "[env.preview.triggers]");
    expect(preview).toMatch(/^crons = \[\]$/m);
    // No schedule directive may survive (comments may still name the old one).
    expect(preview).not.toMatch(/^crons = \[.+\]$/m);
    expect(preview).not.toMatch(/^crons = \[.*\*\/10.*\]$/m);
  });

  test("production runs every 4 hours, not every 10 minutes", () => {
    // Phase 4A — the schedule must sit on the TOP-LEVEL worker, because that is
    // the name `wrangler deploy` publishes. A schedule under [env.production]
    // targets `<name>-production`, which is never deployed, so the live loop had
    // no cron at all while this assertion passed.
    const production = tomlSection(ingest, "[triggers]");
    expect(production).toMatch(/^crons = \["0 \*\/4 \* \* \*"\]$/m);
    expect(production).not.toMatch(/^crons = \[.*\*\/10.*\]$/m);
    expect(ingest).toContain("Free-Tier Survival Mode (every 4h)");
    // 6 runs/day instead of 144.
    expect(production).not.toContain('"*/30 * * * *"');
    expect(tomlSection(ingest, "[env.production.triggers]")).toBe("");
  });

  test("the deployment-guard preview fixture mirrors the dormant preview", () => {
    const fixture = normalized("tests/fixtures/deployment-guard/ingest_preview_valid.toml");
    expect(tomlSection(fixture, "[env.preview.triggers]")).toMatch(/^crons = \[\]$/m);
  });
});

describe("Wave 4C — API worker config", () => {
  const api = normalized("workers/api/wrangler.toml");

  test("both DB bindings point wrangler at the repo-root migrations", () => {
    expect(api.match(/migrations_dir = "\.\.\/\.\.\/db\/migrations"/g)?.length).toBe(2);

    const productionD1 = api.slice(api.indexOf("[[d1_databases]]"));
    const productionDb = productionD1.slice(0, productionD1.indexOf("[[d1_databases]]", 1));
    expect(productionDb).toContain('binding = "DB"');
    expect(productionDb).toContain('database_id = "c19c8f45-801b-4034-bd76-402e5e5389b5"');
    expect(productionDb).toContain('migrations_dir = "../../db/migrations"');

    const previewD1 = api.slice(api.indexOf("[[env.preview.d1_databases]]"));
    const previewDb = previewD1.slice(0, previewD1.indexOf("[[env.preview.d1_databases]]", 1));
    expect(previewDb).toContain('binding = "DB"');
    expect(previewDb).toContain('database_id = "34962f8f-abd1-4b0b-8bd7-b4eab59bd902"');
    expect(previewDb).toContain('migrations_dir = "../../db/migrations"');
  });

  test("the edge cache TTL is declared as configuration, not code", () => {
    const vars = tomlSection(api, "[vars]");
    expect(vars).toContain('PUBLIC_EDGE_CACHE_TTL_SECONDS = "14400"');
    expect(vars).toContain("Free-Tier Survival Mode (4h)");
    expect(vars).toContain('ENVIRONMENT = "production"');
  });

  test("top-level routes stay above [[rules]] (Wave 4B.2 regression guard)", () => {
    expect(api.indexOf("routes = [")).toBeGreaterThan(-1);
    expect(api.indexOf("routes = [")).toBeLessThan(api.indexOf("[[rules]]"));
    expect(api.slice(api.indexOf("routes = ["), api.indexOf("[[rules]]"))).toContain(
      'pattern = "api.zayron-x.co", custom_domain = true',
    );
  });

  test("the web worker advertises the capped sitemap inventory", () => {
    const web = JSON.parse(readFileSync("apps/web/wrangler.jsonc", "utf8"));
    // Gate 3A.2: raised from "1" to "10" — a cap of 1 silently drops every URL
    // past 2,000 per kind without an error. 10 gives 20,000 URLs of headroom.
    expect(web.env.production.vars.SITEMAP_MAX_SHARDS).toBe("10");
    // Preview keeps the full inventory: it is robots-disallowed, so no crawler
    // can walk it, and preview debugging must not be capped.
    expect(web.env.preview.vars.SITEMAP_MAX_SHARDS).toBeUndefined();
  });

  test("the secret-scan fixture no longer contains a contiguous JWT literal", () => {
    const source = readFileSync("tests/unit/m16_3_7c_secret_scan_failclosed.test.ts", "utf8");
    expect(source).not.toMatch(/eyJhbGciOi[A-Za-z0-9_-]{20,}/);
    expect(source).toContain("'eyJhbGciOi' + 'JIUzI1NiIsInR5cCI6IkpXVCJ9.c3ludGhldGlj'");
  });
});
