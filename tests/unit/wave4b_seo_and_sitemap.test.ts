/**
 * Wave 4B — SEO, metadata and sitemap contracts.
 *
 * Deterministic, local-only. Covers:
 *   1. JSON-LD serialization safety (`</script>` breakout) and zero fabrication;
 *   2. site/API URL resolution never defaulting production to the preview API;
 *   3. sitemap XML builders, shard parsing/404 and robots policy;
 *   4. the API sitemap contract (PUBLISHED gate, clamping, cache headers,
 *      public-read registration);
 *   5. primary navigation no longer advertising placeholder surfaces.
 */
import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";

import {
  articleJsonLd,
  compactJsonLd,
  organizationJsonLd,
  serializeJsonLd,
  webSiteJsonLd,
} from "../../apps/web/app/lib/jsonLd";
import {
  getApiBaseUrl,
  isPreviewDeployment,
  PREVIEW_API_BASE_URL,
  PRODUCTION_API_BASE_URL,
  PRODUCTION_SERVER_API_BASE_URL,
  resolveSiteConfig,
} from "../../apps/web/app/lib/siteConfig";
import {
  buildSitemapIndex,
  buildSitemapIndexEntries,
  buildUrlset,
  escapeXml,
  parseSitemapShard,
  robotsText,
  STATIC_PATHS,
  staticSitemapEntries,
  SITEMAP_CACHE_CONTROL as WEB_SITEMAP_CACHE_CONTROL,
  SITEMAP_XML_CONTENT_TYPE,
} from "../../apps/web/app/lib/sitemap";
import { intelligenceRoutes } from "../../apps/web/app/lib/routes";
import {
  buildSitemapManifest,
  clampSitemapLimit,
  clampSitemapPage,
  projectSitemapItems,
  sitemapCountQuery,
  sitemapOffset,
  sitemapRowsQuery,
  SITEMAP_CACHE_CONTROL,
  SITEMAP_MAX_LIMIT,
  SITEMAP_PAGE_SIZE,
} from "../../workers/api/src/sitemap";
import { classifyEndpoint, requiredTrust } from "../../workers/api/src/security";

const TOKENS = ["vulnerability", "vulnerabilities"];

describe("Wave 4B — JSON-LD safety and zero fabrication", () => {
  test("serializeJsonLd neutralizes a </script> breakout", () => {
    const payload = serializeJsonLd({ headline: "x</script><script>alert(1)</script>" });
    expect(payload).not.toContain("</script>");
    expect(payload).toContain("\\u003c");
    // Still valid JSON that round-trips to the original string.
    expect(JSON.parse(payload).headline).toBe("x</script><script>alert(1)</script>");
  });

  test("compactJsonLd drops absent, null and empty-string properties", () => {
    expect(compactJsonLd({ a: "", b: null, c: undefined, d: [], e: "x" })).toEqual({ e: "x" });
  });

  test("a vulnerability node omits every unavailable fact (no invented dates/scores)", () => {
    const node = articleJsonLd({
      url: "https://zayron-x.co/intelligence/vulnerabilities/CVE-2026-0001",
      siteUrl: "https://zayron-x.co",
      identifier: "CVE-2026-0001",
      headline: "Remote code execution",
      description: null,
      datePublished: null,
      dateModified: null,
    });
    expect(node["@type"]).toBe("TechArticle");
    expect(node.identifier).toBe("CVE-2026-0001");
    expect("datePublished" in node).toBe(false);
    expect("dateModified" in node).toBe(false);
    expect("description" in node).toBe(false);
  });

  test("a malware node carries only supplied facts and real timestamps", () => {
    const node = articleJsonLd({
      type: "Report",
      url: "https://zayron-x.co/malware/intelligence/reports/r1",
      siteUrl: "https://zayron-x.co",
      identifier: "r1",
      headline: null,
      description: "grounded statement",
      datePublished: "2026-01-02T03:04:05Z",
      additionalProperty: [{ name: "severity", value: "HIGH" }],
    });
    expect(node["@type"]).toBe("Report");
    expect(node.datePublished).toBe("2026-01-02T03:04:05Z");
    expect("headline" in node).toBe(false);
    expect(node.additionalProperty).toEqual([
      { "@type": "PropertyValue", name: "severity", value: "HIGH" },
    ]);
  });

  test("organization and website nodes describe the real site and search route", () => {
    const org = organizationJsonLd("https://zayron-x.co");
    expect(org["@type"]).toBe("Organization");
    expect(org.url).toBe("https://zayron-x.co");
    const site = webSiteJsonLd("https://zayron-x.co") as any;
    expect(site["@type"]).toBe("WebSite");
    expect(site.potentialAction.target.urlTemplate).toBe("https://zayron-x.co/search?q={search_term_string}");
  });
});

describe("Wave 4B — site/API configuration", () => {
  test("production never defaults the API base to the preview worker", () => {
    for (const env of [
      {},
      { ENVIRONMENT: "production", NEXT_PUBLIC_SITE_URL: "https://zayron-x.co" },
      { APP_ENV: "production" },
    ]) {
      const config = resolveSiteConfig(env);
      // Server default is the DEDICATED API hostname (Error 1042 fix).
      expect(config.apiBaseUrl).toBe(PRODUCTION_SERVER_API_BASE_URL);
      expect(config.apiBaseUrl).not.toContain("zayron-x-api-preview");
      expect(config.isPreview).toBe(false);
      expect(config.siteUrl).toBe("https://zayron-x.co");
    }
  });

  test("a production host beats a stale preview-ish env default", () => {
    const config = resolveSiteConfig({ NEXT_PUBLIC_SITE_URL: "https://zayron-x.co" }, "zayron-x.co");
    expect(config.isPreview).toBe(false);
    expect(config.apiBaseUrl).toBe(PRODUCTION_SERVER_API_BASE_URL);
  });

  test("preview is detected from env, site URL or request host", () => {
    expect(resolveSiteConfig({ ENVIRONMENT: "preview" }).isPreview).toBe(true);
    expect(
      resolveSiteConfig({ NEXT_PUBLIC_SITE_URL: "https://zayron-x-web-preview.aabusabih.workers.dev" }).isPreview,
    ).toBe(true);
    expect(resolveSiteConfig({}, "zayron-x-web-preview.aabusabih.workers.dev").isPreview).toBe(true);
    expect(resolveSiteConfig({}, "localhost").isPreview).toBe(true);
    expect(resolveSiteConfig({ ENVIRONMENT: "preview" }).apiBaseUrl).toBe(PREVIEW_API_BASE_URL);
  });

  test("an explicit API base always wins over the environment default", () => {
    const config = resolveSiteConfig({ NEXT_PUBLIC_API_BASE_URL: "https://api.example.test/api/v1/" });
    expect(config.apiBaseUrl).toBe("https://api.example.test/api/v1");
  });

  test("resolution happens per call, not at module import time", () => {
    const savedAppEnv = process.env.NEXT_PUBLIC_APP_ENV;
    const savedApiBase = process.env.NEXT_PUBLIC_API_BASE_URL;
    try {
      delete process.env.NEXT_PUBLIC_API_BASE_URL;
      delete process.env.NEXT_PUBLIC_APP_ENV;
      delete process.env.ENVIRONMENT;
      expect(isPreviewDeployment()).toBe(false);
      expect(getApiBaseUrl()).toBe(PRODUCTION_SERVER_API_BASE_URL);

      // A later env change in the same process must be observed by the next call.
      process.env.NEXT_PUBLIC_APP_ENV = "preview";
      expect(isPreviewDeployment()).toBe(true);
      expect(getApiBaseUrl()).toBe(PREVIEW_API_BASE_URL);
    } finally {
      if (savedAppEnv === undefined) delete process.env.NEXT_PUBLIC_APP_ENV;
      else process.env.NEXT_PUBLIC_APP_ENV = savedAppEnv;
      if (savedApiBase !== undefined) process.env.NEXT_PUBLIC_API_BASE_URL = savedApiBase;
    }
  });
});

describe("Wave 4B — sitemap XML builders", () => {
  test("XML metacharacters in a loc or lastmod are escaped", () => {
    expect(escapeXml("a&b<c>d\"e'f")).toBe("a&amp;b&lt;c&gt;d&quot;e&apos;f");
    const xml = buildUrlset([{ loc: "https://zayron-x.co/x?a=1&b=2", lastmod: "2026-01-01" }]);
    expect(xml).toContain("https://zayron-x.co/x?a=1&amp;b=2");
    expect(xml).toContain("<lastmod>2026-01-01</lastmod>");
  });

  test("lastmod is omitted when the source had no real timestamp", () => {
    const xml = buildUrlset([{ loc: "https://zayron-x.co/a", lastmod: null }]);
    expect(xml).not.toContain("<lastmod>");
  });

  test("the index is never empty and expands shards 1..N per kind", () => {
    const entries = buildSitemapIndexEntries("https://zayron-x.co", {
      vulnerabilities: 2,
      malware: 1,
    });
    expect(entries[0].loc).toBe("https://zayron-x.co/sitemaps/static.xml");
    // PHASE 9C — `/sitemaps/news.xml` is a fixed, always-served shard and is
    // listed unconditionally, so it sits between the static shard and the
    // dynamic ones.
    expect(entries.map((e) => e.loc)).toEqual([
      "https://zayron-x.co/sitemaps/static.xml",
      "https://zayron-x.co/sitemaps/news.xml",
      "https://zayron-x.co/sitemaps/vulnerabilities-1.xml",
      "https://zayron-x.co/sitemaps/vulnerabilities-2.xml",
      "https://zayron-x.co/sitemaps/malware-1.xml",
    ]);
    const xml = buildSitemapIndex(entries);
    expect(xml).toContain("<sitemapindex");
    expect(xml).not.toContain("<urlset");
  });

  test("an unreachable API degrades the index to the fixed shards only", () => {
    // PHASE 9C — the fixed set is `static.xml` + `news.xml`; only the DYNAMIC
    // shards depend on the API manifest.
    const entries = buildSitemapIndexEntries("https://zayron-x.co", null);
    expect(entries).toEqual([
      { loc: "https://zayron-x.co/sitemaps/static.xml" },
      { loc: "https://zayron-x.co/sitemaps/news.xml" },
    ]);
  });

  test("shard names are strictly validated (invalid ⇒ 404 path)", () => {
    expect(parseSitemapShard("static.xml")).toEqual({ kind: "static" });
    expect(parseSitemapShard("vulnerabilities-1.xml")).toEqual({ kind: "vulnerabilities", page: 1 });
    expect(parseSitemapShard("malware-12.xml")).toEqual({ kind: "malware", page: 12 });
    for (const invalid of [
      "vulnerabilities-0.xml",
      "vulnerabilities-01.xml",
      "news-1.xml",
      "../vulnerabilities-1.xml",
      "vulnerabilities-1.xm",
      "static-1.xml",
      "",
    ]) {
      expect(parseSitemapShard(invalid)).toBeNull();
    }
  });

  test("articles shards are rejected (no /articles route ⇒ they would 404)", () => {
    expect(parseSitemapShard("articles-1.xml")).toBeNull();
    expect(parseSitemapShard("articles-9.xml")).toBeNull();
    // And the index can never advertise one, even if the API reports articles.
    const entries = buildSitemapIndexEntries("https://zayron-x.co", {
      vulnerabilities: 1,
      malware: 1,
      articles: 50,
    } as unknown as Partial<Record<"vulnerabilities" | "malware", number>>);
    expect(entries.map((entry) => entry.loc).filter((loc) => loc.includes("articles"))).toEqual([]);
    expect(buildSitemapIndex(entries)).not.toContain("/sitemaps/articles-");
  });

  test("static entries exist and exclude placeholder surfaces", () => {
    const paths = STATIC_PATHS as readonly string[];
    expect(paths).toContain("/intelligence/vulnerabilities");
    // PHASE 9B — `/news` and the programmatic hubs are real indexable surfaces now.
    for (const live of ["/news", "/intelligence/vendors", "/intelligence/regions", "/intelligence/techniques"]) {
      expect(paths).toContain(live);
    }
    for (const placeholder of ["/research", "/intelligence/graph"]) {
      expect(paths).not.toContain(placeholder);
    }
    expect(staticSitemapEntries("https://zayron-x.co")[0].loc).toBe("https://zayron-x.co/");
    expect(WEB_SITEMAP_CACHE_CONTROL).toContain("s-maxage=300");
  });

  test("sitemap response headers are explicit and cacheable", () => {
    expect(SITEMAP_XML_CONTENT_TYPE).toBe("application/xml; charset=utf-8");
    expect(WEB_SITEMAP_CACHE_CONTROL).toBe("public, s-maxage=300, stale-while-revalidate=600");
    const robotsRoute = readFileSync("apps/web/app/robots.txt/route.ts", "utf8");
    expect(robotsRoute).toContain("text/plain; charset=utf-8");
    expect(robotsRoute).toContain("public, max-age=300, s-maxage=3600");
  });

  test("robots.txt denies everything on preview and advertises the index in production", () => {
    expect(robotsText(true, "https://zayron-x-web-preview.aabusabih.workers.dev")).toBe(
      "User-agent: *\nDisallow: /\n",
    );
    const prod = robotsText(false, "https://zayron-x.co");
    expect(prod).toContain("Allow: /");
    expect(prod).toContain("Disallow: /api/");
    expect(prod).toContain("Disallow: /search?*");
    expect(prod).toContain("Sitemap: https://zayron-x.co/sitemap.xml");
    expect(prod).toContain("Sitemap: https://zayron-x.co/sitemaps/news.xml");
  });
});

describe("Wave 4B — API sitemap contract", () => {
  test("vulnerability rows and counts share the AUTHORITATIVE_VERIFIED gate and projection", () => {
    const rows = sitemapRowsQuery("vulnerabilities", TOKENS, 10, 20);
    const count = sitemapCountQuery("vulnerabilities", TOKENS);
    // Gate 3A.3 — the sitemap and the public detail route share ONE corpus
    // (`vulnerabilities`) and ONE gate (`provenance_state`). The old projection
    // read `intelligence_reports.publication_status`, which is why vendor
    // advertised 0 CVE URLs while detail pages existed.
    expect(rows.sql).toContain("provenance_state = 'AUTHORITATIVE_VERIFIED'");
    expect(count.sql).toContain("provenance_state = 'AUTHORITATIVE_VERIFIED'");
    expect(rows.sql).not.toContain("intelligence_reports");
    expect(count.sql).not.toContain("intelligence_reports");
    expect(rows.sql).not.toContain("SELECT *");
    expect(count.sql).not.toContain("SELECT *");
    expect(rows.sql).toContain("LIMIT ? OFFSET ?");
    expect(count.sql).not.toContain("LIMIT");
    expect(rows.params).toEqual([10, 20]);
    expect(count.params).toEqual([]);
  });

  test("articles use the is_published gate; malware reads the gated store", () => {
    expect(sitemapRowsQuery("articles", TOKENS, 5, 0).sql).toContain("is_published = 1");
    expect(sitemapCountQuery("articles", TOKENS).sql).toContain("is_published = 1");
    const malware = sitemapRowsQuery("malware", TOKENS, 5, 0);
    expect(malware.sql).toContain("FROM malware_reports");
    expect(malware.sql).not.toContain("SELECT *");
  });

  test("limit is clamped to [1, 5000] with the page size as the default", () => {
    expect(clampSitemapLimit("999999")).toBe(SITEMAP_MAX_LIMIT);
    expect(clampSitemapLimit("0")).toBe(SITEMAP_PAGE_SIZE);
    expect(clampSitemapLimit("-5")).toBe(SITEMAP_PAGE_SIZE);
    expect(clampSitemapLimit(null)).toBe(SITEMAP_PAGE_SIZE);
    expect(clampSitemapLimit("17")).toBe(17);
    expect(clampSitemapPage("0")).toBe(1);
    expect(clampSitemapPage("3")).toBe(3);
    expect(sitemapOffset(3, 2000)).toBe(4000);
  });

  test("manifest reports page size and per-kind shard counts", () => {
    const manifest = buildSitemapManifest({ vulnerabilities: 4001, malware: 0, articles: 1 });
    expect(manifest.page_size).toBe(SITEMAP_PAGE_SIZE);
    expect(manifest.shards.vulnerabilities).toBe(3);
    expect(manifest.shards.malware).toBe(0);
    expect(manifest.shards.articles).toBe(1);
    expect(manifest.counts.vulnerabilities).toBe(4001);
  });

  test("rows without an identifier are dropped; lastmod stays null when absent", () => {
    const items = projectSitemapItems([
      { id: "CVE-2026-0001", updated_at: "2026-01-01T00:00:00Z" },
      { id: "", updated_at: "2026-01-01T00:00:00Z" },
      { id: "CVE-2026-0002", updated_at: null },
    ]);
    expect(items).toEqual([
      { id: "CVE-2026-0001", updated_at: "2026-01-01T00:00:00Z" },
      { id: "CVE-2026-0002", updated_at: null },
    ]);
  });

  test("sitemap responses are long-lived public cache objects", () => {
    expect(SITEMAP_CACHE_CONTROL).toContain("public");
    expect(SITEMAP_CACHE_CONTROL).toContain("s-maxage=3600");
    expect(SITEMAP_CACHE_CONTROL).toContain("stale-while-revalidate=86400");
  });

  test("the sitemap feed is a registered anonymous read surface", () => {
    expect(requiredTrust("GET", "/api/v1/sitemap/manifest")).toBe("public");
    expect(requiredTrust("GET", "/api/v1/sitemap/vulnerabilities")).toBe("public");
    expect(classifyEndpoint("GET", "/api/v1/sitemap/manifest")).toBe("public_read");
    // Method hygiene: a write to the same path is NOT public.
    expect(requiredTrust("POST", "/api/v1/sitemap/manifest")).not.toBe("public");
  });
});

describe("Wave 4B.2 — server vs browser API base (Error 1042 closure)", () => {
  const PROD_ENV = {
    ENVIRONMENT: "production",
    NEXT_PUBLIC_SITE_URL: "https://zayron-x.co",
    NEXT_PUBLIC_API_BASE_URL: "https://zayron-x.co/api/v1",
    API_BASE_URL: "https://api.zayron-x.co/api/v1",
  };

  test("server runtime prefers API_BASE_URL over the same-origin public var", () => {
    const config = resolveSiteConfig(PROD_ENV, "zayron-x.co", "server");
    expect(config.apiBaseUrl).toBe("https://api.zayron-x.co/api/v1");
    // The same-zone hostname must NOT be used server-side (Error 1042).
    expect(config.apiBaseUrl).not.toBe("https://zayron-x.co/api/v1");
    expect(config.runtime).toBe("server");
  });

  test("browser runtime uses NEXT_PUBLIC_API_BASE_URL (same-origin, no preflight)", () => {
    const config = resolveSiteConfig(PROD_ENV, "zayron-x.co", "browser");
    expect(config.apiBaseUrl).toBe("https://zayron-x.co/api/v1");
    expect(config.runtime).toBe("browser");
  });

  test("browser falls back to the site origin when the public var is absent", () => {
    const config = resolveSiteConfig(
      { NEXT_PUBLIC_SITE_URL: "https://zayron-x.co" },
      "zayron-x.co",
      "browser",
    );
    expect(config.apiBaseUrl).toBe("https://zayron-x.co/api/v1");
  });

  test("preview isolation holds in both runtimes", () => {
    const previewEnv = {
      ENVIRONMENT: "preview",
      NEXT_PUBLIC_SITE_URL: "https://zayron-x-web-preview.aabusabih.workers.dev",
      NEXT_PUBLIC_API_BASE_URL: PREVIEW_API_BASE_URL,
      API_BASE_URL: PREVIEW_API_BASE_URL,
    };
    for (const runtime of ["server", "browser"] as const) {
      const config = resolveSiteConfig(
        previewEnv,
        "zayron-x-web-preview.aabusabih.workers.dev",
        runtime,
      );
      expect(config.isPreview).toBe(true);
      expect(config.apiBaseUrl).toBe(PREVIEW_API_BASE_URL);
      expect(config.apiBaseUrl).not.toContain("api.zayron-x.co");
      expect(config.apiBaseUrl).not.toContain("zayron-x.co/api");
    }
    // Production never falls back to a preview host in either runtime.
    for (const runtime of ["server", "browser"] as const) {
      const config = resolveSiteConfig({ ENVIRONMENT: "production" }, "zayron-x.co", runtime);
      expect(config.apiBaseUrl).not.toContain("preview");
      expect(config.apiBaseUrl).not.toContain("workers.dev");
    }
  });

  test("wrangler configs declare the dedicated API host and the server-side var", () => {
    const toml = readFileSync("workers/api/wrangler.toml", "utf8").replace(/\r\n/g, "\n");
    const rulesIndex = toml.indexOf("[[rules]]");
    const routesIndex = toml.indexOf("routes = [");
    // `routes` must be a TOP-LEVEL key: after `[[rules]]` it would be parsed as
    // rules[0].routes and the worker would have no production routes at all.
    expect(routesIndex).toBeGreaterThan(-1);
    expect(routesIndex).toBeLessThan(rulesIndex);
    const routesBlock = toml.slice(routesIndex, rulesIndex);
    expect(routesBlock).toContain('pattern = "api.zayron-x.co", custom_domain = true');
    // PHASE 7D narrowed the public pattern to /api/v1 — everything this worker
    // serves lives there, and /api/og/* must reach the web worker's card routes.
    expect(routesBlock).toContain('pattern = "zayron-x.co/api/v1/*"');
    expect(routesBlock).toContain('pattern = "www.zayron-x.co/api/v1/*"');

    const web = JSON.parse(readFileSync("apps/web/wrangler.jsonc", "utf8"));
    expect(web.env.production.vars.API_BASE_URL).toBe("https://api.zayron-x.co/api/v1");
    expect(web.env.production.vars.NEXT_PUBLIC_API_BASE_URL).toBe("https://zayron-x.co/api/v1");
    expect(web.env.preview.vars.API_BASE_URL).toBe(PREVIEW_API_BASE_URL);
    expect(web.vars.API_BASE_URL).toBe(PREVIEW_API_BASE_URL);
    // Preview must never point at the production API host.
    expect(web.env.preview.vars.API_BASE_URL).not.toContain("api.zayron-x.co");
    expect(web.vars.API_BASE_URL).not.toContain("api.zayron-x.co");
  });
});

describe("Wave 4B — sitemap id parity and D1 row-read safety", () => {
  test("vulnerability ids are the exact route parameter the detail page resolves", () => {
    const rows = sitemapRowsQuery("vulnerabilities", TOKENS, 10, 0);
    // `/intelligence/vulnerabilities/[id]` → GET /api/v1/intelligence/:id arrives
    // at the CANONICAL CVE row (`WHERE cve_id = ?`) after the verified-corpus
    // cross-resolution. The shard must emit that same identifier.
    expect(rows.sql).toContain("SELECT cve_id AS id,");
    const detailRoute = readFileSync("workers/api/src/index.ts", "utf8");
    expect(detailRoute).toContain("FROM vulnerabilities WHERE cve_id = ?");
    const detailPage = readFileSync("apps/web/app/intelligence/vulnerabilities/[id]/page.tsx", "utf8");
    expect(detailPage).toContain("getVulnerabilityDetail");
  });

  test("malware ids match the canonical report detail route", () => {
    const rows = sitemapRowsQuery("malware", TOKENS, 10, 0);
    expect(rows.sql).toContain("SELECT id, updated_at FROM malware_reports");
    // The page path uses the report id, and the API detail query binds `id`.
    const gate = readFileSync("workers/api/src/malwareReportReadGate.ts", "utf8");
    expect(gate).toContain("FROM malware_reports WHERE id = ?");
    const shardRoute = readFileSync("apps/web/app/sitemaps/[shard]/route.ts", "utf8");
    expect(shardRoute).toContain("/malware/intelligence/reports/");
  });

  test("the sitemap malware seam uses a bounded, minimal projection", () => {
    const gate = readFileSync("workers/api/src/malwareReportReadGate.ts", "utf8");
    const sqlLine = gate
      .split("\n")
      .find((line) => line.includes("report_json FROM malware_reports") && line.includes("MALWARE_REPORT_SITEMAP_SCAN_LIMIT"));
    expect(sqlLine).toBeDefined();
    // Gate 3A.4 adds `published_at` so the shard can keep the LATEST validated
    // report per sha256; the projection stays minimal (no presentation columns).
    expect(sqlLine).toContain("SELECT id, sha256, published_at, updated_at, report_json FROM malware_reports");
    expect(sqlLine).toContain("LIMIT ${MALWARE_REPORT_SITEMAP_SCAN_LIMIT}");
    expect(sqlLine).not.toContain("SELECT *");
    // Presentation columns are NOT read by the sitemap seam.
    expect(sqlLine).not.toContain("title");
    expect(sqlLine).not.toContain("family");
    expect(sqlLine).not.toContain("severity");
    expect(gate).toContain("export const MALWARE_REPORT_SITEMAP_SCAN_LIMIT = 500");
    // Both sitemap endpoints go through the index loader, not the heavy list.
    const api = readFileSync("workers/api/src/index.ts", "utf8");
    const blockStart = api.indexOf("Wave 4B: sitemap feed");
    const sitemapBlock = api.slice(blockStart, api.indexOf("GET /api/v1/vulnerabilities", blockStart));
    expect(sitemapBlock).toContain("loadServableMalwareReportIndex(");
    expect(sitemapBlock).not.toContain("loadServableMalwareReports(");
  });
});

describe("Wave 4B — SSR single-fetch and route hygiene", () => {
  test("both detail pages share one per-request loader via React cache", () => {
    const vuln = readFileSync("apps/web/app/intelligence/vulnerabilities/[id]/page.tsx", "utf8");
    expect(vuln).toContain("const loadVulnerability = cache(");
    expect(vuln.match(/await getVulnerabilityDetail\(/g)).toBeNull();
    const malware = readFileSync("apps/web/app/malware/intelligence/reports/[id]/page.tsx", "utf8");
    expect(malware).toContain("const loadMalwareReport = cache(");
    expect(malware.match(/await getCanonicalMalwareReport\(/g)).toBeNull();
  });

  test("the orphan relationships route is noindexed", () => {
    const source = readFileSync("apps/web/app/intelligence/relationships/page.tsx", "utf8");
    expect(source).toContain("index: false");
    expect(source).toContain("follow: false");
  });

  test("root metadata is per-request (generateMetadata, not a frozen const)", () => {
    const layout = readFileSync("apps/web/app/layout.tsx", "utf8");
    expect(layout).toContain("export async function generateMetadata()");
    expect(layout).not.toContain("export const metadata");
    expect(layout).toContain("isPreviewDeployment()");
  });
});

describe("Wave 4B — clean launch navigation", () => {
  test("primary intelligence navigation has no graph placeholder", () => {
    const hrefs = intelligenceRoutes.map((route) => route.href);
    expect(hrefs).not.toContain("/intelligence/graph");
    // PHASE 9B — `/news` is a live indexable surface and is now advertised.
    expect(hrefs).toContain("/news");
    for (const placeholder of ["/research", "/graph"]) {
      expect(hrefs).not.toContain(placeholder);
    }
  });

  test("the navbar links the institutional surfaces — and no unbuilt surface", () => {
    // Phase 6: placeholder editorial surfaces left the primary navigation; the
    // institutional routes (methodology, pricing, about) carry it instead.
    const navbar = readFileSync("apps/web/app/components/Navbar.tsx", "utf8");
    expect(navbar).not.toContain("routes.news");
    expect(navbar).not.toContain("routes.research");
    expect(navbar).not.toContain("routes.graph");
    expect(navbar).toContain('href="/methodology"');
    expect(navbar).toContain('href="/about"');
    expect(navbar).toContain("routes.pricing");
  });

  test("placeholder routes are noindex but still built", () => {
    for (const file of [
      "apps/web/app/research/page.tsx",
      "apps/web/app/intelligence/graph/page.tsx",
    ]) {
      const source = readFileSync(file, "utf8");
      expect(source).toContain("index: false");
      expect(source).toContain("follow: false");
    }
  });

  test("PHASE 9B — the newsroom is indexable and canonical", () => {
    const source = readFileSync("apps/web/app/news/page.tsx", "utf8");
    expect(source).toContain("canonical: \"/news\"");
    expect(source).not.toContain("index: false");
  });
});
