import { describe, expect, mock, test } from "bun:test";
import { existsSync, readFileSync } from "node:fs";

mock.module("next/server", () => ({
  NextResponse: class MockNextResponse extends Response {
    static next() {
      return new MockNextResponse(null, { status: 200 });
    }
    static redirect(url: URL | string, status = 307) {
      return new MockNextResponse(null, { status, headers: { Location: String(url) } });
    }
  },
}));

const { middleware } = await import("../../apps/web/middleware");
import { isEdgeCacheEligible } from "../../workers/api/src/edgeCache";
import { withSecurityBoundary } from "../../workers/api/src/security";
import {
  formatCveSqlInList,
  loadLinkedThreatCves,
  sitemapCountQuery,
  sitemapRowsQuery,
} from "../../workers/api/src/sitemap";
import {
  breadcrumbListNode,
  buildLinkedJsonLdGraph,
  organizationNode,
  websiteNode,
} from "../../apps/web/app/lib/seo";
import { articleJsonLd } from "../../apps/web/app/lib/jsonLd";
import { NAMED_CRAWLERS, robotsText, STATIC_PATHS } from "../../apps/web/app/lib/sitemap";
import { GET as rssAliasGet } from "../../apps/web/app/rss.xml/route";
import { GET as shardGet } from "../../apps/web/app/sitemaps/[shard]/route";
import { pingWebSub, WEBSUB_HUB_URL } from "../../workers/ingest/src/newsIngest";

describe("PHASE 12-EXECUTE — D1 row-read rescue, Kill List, canonicals & 2028 GEO lockdown", () => {
  test("1. loadLinkedThreatCves caches actor/campaign CVEs in isolate memory (0 correlated json_each SQL)", async () => {
    let dbCalls = 0;
    const fakeDb = {
      prepare(sql: string) {
        expect(sql).not.toContain("json_each");
        return {
          async all() {
            dbCalls += 1;
            if (sql.includes("threat_actors")) {
              return { results: [{ cves_json: '["CVE-2026-1001", "CVE-2025-9999"]' }] };
            }
            return { results: [{ cves_json: '["CVE-2026-2002"]' }] };
          },
        };
      },
    } as any;

    const first = await loadLinkedThreatCves(fakeDb, 1_000_000);
    const second = await loadLinkedThreatCves(fakeDb, 1_000_000 + 60_000);
    expect(dbCalls).toBe(2); // 2 queries on first load, 0 on warm read inside 10m TTL
    expect([...first.allCves].sort()).toEqual(["CVE-2025-9999", "CVE-2026-1001", "CVE-2026-2002"]);
    expect([...second.actorCves].sort()).toEqual(["CVE-2025-9999", "CVE-2026-1001"]);

    const rows = sitemapRowsQuery("vulnerabilities", [], 100, 0, first.allCves);
    const count = sitemapCountQuery("vulnerabilities", [], first.allCves);
    expect(rows.sql).not.toContain("json_each");
    expect(count.sql).not.toContain("json_each");
    expect(rows.sql).toContain("vulnerabilities.cve_id IN ('CVE-2026-1001', 'CVE-2025-9999', 'CVE-2026-2002')");
    expect(formatCveSqlInList(["CVE-2026-1; DROP TABLE", "CVE-2026-12345"])).toBe("'CVE-2026-12345'");

    const apiIndex = readFileSync("workers/api/src/index.ts", "utf8");
    expect(apiIndex).toContain("STORE_UNAVAILABLE");
    expect(apiIndex).not.toContain("JSON_EACH_BROKEN");
    const vulnListStart = apiIndex.indexOf("if (path === '/api/v1/vulnerabilities')");
    const vulnDetailStart = apiIndex.indexOf("if (path.startsWith('/api/v1/vulnerabilities/'))");
    const vulnListBlock = apiIndex.slice(vulnListStart, vulnDetailStart);
    expect(vulnListBlock).not.toContain("json_each(a.cves_json)");
  });

  test("2. edgeCache covers detail hubs and withSecurityBoundary emits X-Robots-Tag on api/workers.dev hosts", async () => {
    for (const p of [
      "/api/v1/vendors/microsoft",
      "/api/v1/regions/us",
      "/api/v1/techniques/T1059.001",
      "/api/v1/threat-actors/apt29",
      "/api/v1/campaigns/solarwinds",
      "/api/v1/news/briefing-1",
      "/api/v1/malware/supply-chain/reports/MAL-2026-1",
    ]) {
      expect({ p, ok: isEdgeCacheEligible(new Request(`https://zayron-x.co${p}`)) }).toEqual({ p, ok: true });
    }

    const okDispatch = async () =>
      new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { "Content-Type": "application/json", "Cache-Control": "public, s-maxage=300" },
      });

    const apiHostRes = await withSecurityBoundary(
      new Request("https://api.zayron-x.co/api/v1/vulnerabilities", { headers: { host: "api.zayron-x.co" } }),
      {},
      okDispatch,
      undefined,
      { cache: null },
    );
    expect(apiHostRes.headers.get("X-Robots-Tag")).toBe("noindex, nofollow");

    const workersDevRes = await withSecurityBoundary(
      new Request("https://zayron-x-api.aabusabih.workers.dev/api/v1/vendors", {
        headers: { host: "zayron-x-api.aabusabih.workers.dev" },
      }),
      {},
      okDispatch,
      undefined,
      { cache: null },
    );
    expect(workersDevRes.headers.get("X-Robots-Tag")).toBe("noindex, nofollow");

    const apexApiRes = await withSecurityBoundary(
      new Request("https://zayron-x.co/api/v1/vendors", { headers: { host: "zayron-x.co" } }),
      {},
      okDispatch,
      undefined,
      { cache: null },
    );
    expect(apexApiRes.headers.get("X-Robots-Tag")).toBeNull();
  });

  test("3. middleware enforces Kill List 410s, single-hop 301s, non-prod X-Robots-Tag & safe cache isolation", () => {
    // 410 Gone zombies
    for (const gone of ["/research", "/intelligence/graph", "/intelligence/relationships"]) {
      const res = middleware(new Request(`https://zayron-x.co${gone}`, { headers: { host: "zayron-x.co" } }) as any);
      expect(res.status).toBe(410);
      expect(res.headers.get("X-Robots-Tag")).toBe("noindex, nofollow");
      expect(res.headers.get("Cache-Control")).toBe("public, max-age=86400");
    }

    // 301 consolidations + single-hop normalization
    const cases: Array<[string, string]> = [
      ["https://zayron-x.co/company/trust", "https://zayron-x.co/security"],
      ["https://zayron-x.co/intelligence/actors", "https://zayron-x.co/intelligence/threat-actors"],
      ["https://zayron-x.co/intelligence/actors/apt29", "https://zayron-x.co/intelligence/threat-actors/apt29"],
      ["https://zayron-x.co/intelligence/malware/mir_66cd231d1563b12f", "https://zayron-x.co/malware/intelligence/reports/mir_66cd231d1563b12f"],
      ["https://zayron-x.co/news/", "https://zayron-x.co/news"],
      ["https://zayron-x.co/intelligence/vulnerabilities/cve-2026-132165", "https://zayron-x.co/intelligence/vulnerabilities/CVE-2026-132165"],
      ["https://www.zayron-x.co/vulnerabilities/cve-2026-132165/?tab=poc", "https://zayron-x.co/intelligence/vulnerabilities/CVE-2026-132165?tab=poc"],
      ["https://zayron-x.co/intelligence/vulnerabilities?page=1", "https://zayron-x.co/intelligence/vulnerabilities"],
      ["https://zayron-x.co/intelligence/vendors?page=0", "https://zayron-x.co/intelligence/vendors"],
      ["https://zayron-x.co/intelligence/techniques?page=1", "https://zayron-x.co/intelligence/techniques"],
    ];
    for (const [input, expected] of cases) {
      const u = new URL(input);
      const res = middleware(new Request(input, { headers: { host: u.host } }) as any);
      expect({ input, status: res.status, loc: res.headers.get("Location") }).toEqual({
        input,
        status: 301,
        loc: expected,
      });
    }

    // Preserve active malware subtrees
    for (const pass of [
      "https://zayron-x.co/intelligence/malware",
      "https://zayron-x.co/intelligence/malware/advisories/MAL-2026-500",
      "https://zayron-x.co/intelligence/malware/families/cobalt-strike",
    ]) {
      const res = middleware(new Request(pass, { headers: { host: "zayron-x.co" } }) as any);
      expect(res.status).toBe(200);
    }

    // Non-apex hosts get X-Robots-Tag: noindex, nofollow
    for (const host of ["staging.zayron-x.co", "localhost:3000", "zayron-x-web-preview.aabusabih.workers.dev"]) {
      const res = middleware(new Request(`https://${host}/about`, { headers: { host } }) as any);
      expect(res.headers.get("X-Robots-Tag")).toBe("noindex, nofollow");
      expect(res.headers.get("Cache-Control")).toBe("private, no-store");
    }
  });

  test("4. canonicals, not-found.tsx, pagination 404 guards, Kill List file deletions & SSR homepage", () => {
    const layout = readFileSync("apps/web/app/layout.tsx", "utf8");
    expect(layout).not.toContain('canonical: "/"');

    const notFound = readFileSync("apps/web/app/not-found.tsx", "utf8");
    expect(notFound).toContain("index: false");
    expect(notFound).toContain("follow: false");
    expect(notFound).not.toContain("canonical");

    const homePage = readFileSync("apps/web/app/page.tsx", "utf8");
    expect(homePage).toContain('canonical: "/"');
    expect(homePage).toContain("export const revalidate = 300");

    const latestIntel = readFileSync("apps/web/app/components/LatestIntelligence.tsx", "utf8");
    expect(latestIntel).not.toContain('"use client"');
    expect(latestIntel).not.toContain("useEffect");
    expect(latestIntel).toContain("getNewsIndex");
    expect(latestIntel).toContain("getVulnerabilities");

    const footer = readFileSync("apps/web/app/components/SiteFooter.tsx", "utf8");
    expect(footer).not.toContain('href: "/malware"');
    expect(footer).toContain('href: "/intelligence/malware"');

    for (const path of ["/company/trust", "/company/contact", "/company/careers"]) {
      expect([...STATIC_PATHS]).not.toContain(path as any);
    }
    expect(readFileSync("apps/web/app/company/careers/page.tsx", "utf8")).toContain("index: false, follow: true");
    expect(readFileSync("apps/web/app/company/contact/page.tsx", "utf8")).toContain("index: false, follow: true");

    for (const deadFile of [
      "apps/web/app/company/about/page.tsx",
      "apps/web/app/threats/[id]/route.ts",
      "apps/web/app/components/IntelligenceShell.tsx",
      "apps/web/app/components/LiveIntelligence.tsx",
      "apps/web/app/research/page.tsx",
      "apps/web/app/intelligence/graph/page.tsx",
      "apps/web/app/intelligence/relationships/page.tsx",
      "apps/web/app/intelligence/actors/page.tsx",
      "apps/web/app/intelligence/malware/[id]/page.tsx",
    ]) {
      expect(existsSync(deadFile)).toBe(false);
    }

    for (const pagedFile of [
      "apps/web/app/intelligence/vulnerabilities/page.tsx",
      "apps/web/app/intelligence/vendors/page.tsx",
      "apps/web/app/intelligence/techniques/page.tsx",
    ]) {
      const src = readFileSync(pagedFile, "utf8");
      expect(src).toContain("if (page > totalPages) notFound()");
    }
  });

  test("5. 2028 GEO/JSON-LD, BreadcrumbList, robots crawlers, /rss.xml 301 & active WebSub push", async () => {
    const ws = websiteNode("https://zayron-x.co") as any;
    expect(ws.potentialAction["query-input"]).toBe("required name=search_term_string");
    expect(ws.potentialAction.input).toBeUndefined();

    const org = organizationNode("https://zayron-x.co", ["https://t.me/zayronxai"]) as any;
    expect(org.logo).toEqual({
      "@type": "ImageObject",
      url: "https://zayron-x.co/icon-512x512.png",
      width: 512,
      height: 512,
    });

    const bc = breadcrumbListNode("https://zayron-x.co", "/news/a", [
      { name: "Home", path: "/" },
      { name: "News", path: "/news" },
    ]) as any;
    expect(bc["@type"]).toBe("BreadcrumbList");
    expect(bc.itemListElement).toHaveLength(2);

    const graph = buildLinkedJsonLdGraph({
      path: "/news/a",
      breadcrumbs: [
        { name: "Home", path: "/" },
        { name: "News", path: "/news" },
      ],
      primary: { "@type": "NewsArticle", headline: "Test", author: { "@type": "Organization", name: "ZAYRON-X Research Desk" } },
    }) as any;
    expect(graph["@graph"].map((n: any) => n["@type"])).toEqual(["NewsArticle", "BreadcrumbList"]);

    const cveJsonLd = articleJsonLd({
      url: "https://zayron-x.co/intelligence/vulnerabilities/CVE-2026-1",
      siteUrl: "https://zayron-x.co",
      identifier: "CVE-2026-1",
      headline: "CVE-2026-1",
      breadcrumbs: [
        { name: "Home", path: "/" },
        { name: "Intelligence", path: "/intelligence" },
        { name: "Vulnerabilities", path: "/intelligence/vulnerabilities" },
        { name: "CVE-2026-1", path: "/intelligence/vulnerabilities/CVE-2026-1" },
      ],
    }) as any;
    expect(cveJsonLd["@graph"].map((n: any) => n["@type"])).toEqual(["TechArticle", "BreadcrumbList"]);

    const robots = robotsText(false, "https://zayron-x.co");
    expect(NAMED_CRAWLERS).toContain("Claude-SearchBot");
    expect(NAMED_CRAWLERS).toContain("Applebot");
    expect(robots).toContain("User-agent: Claude-SearchBot");
    expect(robots).toContain("User-agent: Applebot");

    const rssRes = rssAliasGet(new Request("https://zayron-x.co/rss.xml"));
    expect(rssRes.status).toBe(301);
    expect(rssRes.headers.get("Location")).toBe("https://zayron-x.co/news/rss.xml");

    let postedUrl = "";
    let postedBody = "";
    const status = await pingWebSub("https://zayron-x.co/news/rss.xml", {
      fetchImpl: (async (url: string, init?: RequestInit) => {
        postedUrl = url;
        postedBody = String(init?.body ?? "");
        return new Response(null, { status: 204 });
      }) as unknown as typeof fetch,
    });
    expect(status).toBe("HTTP_204");
    expect(postedUrl).toBe(WEBSUB_HUB_URL);
    expect(postedBody).toContain("hub.mode=publish");
    expect(postedBody).toContain(encodeURIComponent("https://zayron-x.co/news/rss.xml"));
  });

  test("6. static.xml fails closed with 503 + Retry-After on API outage and prunes low-signal hubs", async () => {
    const originalFetch = globalThis.fetch;
    try {
      globalThis.fetch = (async (input: RequestInfo | URL) => {
        const u = String(input);
        if (u.includes("/vendors")) return new Response("down", { status: 503 });
        return new Response(
          JSON.stringify({ items: [], data: [], summary: { total_actors: 0 } }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        );
      }) as unknown as typeof fetch;

      const failRes = await shardGet(new Request("https://zayron-x.co/sitemaps/static.xml"), {
        params: Promise.resolve({ shard: "static.xml" }),
      });
      expect(failRes.status).toBe(503);
      expect(failRes.headers.get("Retry-After")).toBe("300");
      expect(failRes.headers.get("Cache-Control")).toBe("no-store");

      globalThis.fetch = (async (input: RequestInfo | URL) => {
        const u = String(input);
        if (u.includes("/iocs/families")) {
          return new Response(JSON.stringify({ data: [{ slug: "cobalt-strike", name: "Cobalt Strike" }] }), {
            status: 200,
          });
        }
        if (u.includes("/threat-actors")) {
          return new Response(
            JSON.stringify({
              summary: { total_actors: 2 },
              items: [
                { slug: "keep-actor", linked_cve_count: 1, live_c2_count: 0 },
                { slug: "drop-actor", linked_cve_count: 0, live_c2_count: 0 },
              ],
            }),
            { status: 200 },
          );
        }
        if (u.includes("/campaigns")) {
          return new Response(
            JSON.stringify({
              items: [
                { slug: "keep-camp", cves: ["CVE-2026-1"], linked_kev_count: 0, activity_tier: "CANONICAL_PROFILE" },
                { slug: "drop-camp", cves: [], linked_kev_count: 0, activity_tier: "CANONICAL_PROFILE" },
              ],
            }),
            { status: 200 },
          );
        }
        if (u.includes("/techniques")) {
          return new Response(
            JSON.stringify({
              items: [
                { id: "T1059.001", entity_count: 5, actor_count: 4, campaign_count: 1 },
                { id: "T0000", entity_count: 1, actor_count: 1, campaign_count: 0 },
              ],
            }),
            { status: 200 },
          );
        }
        if (u.includes("/vendors")) {
          return new Response(
            JSON.stringify({
              items: [
                { slug: "microsoft", verified_cves: 12, kev_count: 1, poc_count: 2 },
                { slug: "tiny-vendor", verified_cves: 1, kev_count: 0, poc_count: 0 },
              ],
            }),
            { status: 200 },
          );
        }
        return new Response(JSON.stringify({ items: [] }), { status: 200 });
      }) as unknown as typeof fetch;

      const okRes = await shardGet(new Request("https://zayron-x.co/sitemaps/static.xml"), {
        params: Promise.resolve({ shard: "static.xml" }),
      });
      expect(okRes.status).toBe(200);
      const xml = await okRes.text();
      expect(xml).toContain("/intelligence/vendors/microsoft");
      expect(xml).not.toContain("/intelligence/vendors/tiny-vendor");
      expect(xml).toContain("/intelligence/techniques/T1059.001");
      expect(xml).not.toContain("/intelligence/techniques/T0000");
      expect(xml).toContain("/intelligence/threat-actors/keep-actor");
      expect(xml).not.toContain("/intelligence/threat-actors/drop-actor");
      expect(xml).toContain("/intelligence/campaigns/keep-camp");
      expect(xml).not.toContain("/intelligence/campaigns/drop-camp");
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});

