import { describe, expect, mock, test } from "bun:test";
import { readFileSync } from "node:fs";

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
import { STATIC_PATHS, robotsText } from "../../apps/web/app/lib/sitemap";
import { cveHuntingQueries } from "../../apps/web/app/lib/detectionAsCode";
import { sitemapCountQuery, sitemapRowsQuery } from "../../workers/api/src/sitemap";

describe("PHASE 11-SEO-RECOVERY (v2) — legacy purge, curation, hubs & hydration safety", () => {
  test("410 Gone for /threats/* (including colon/encoded suffixes) and /intelligence/intel_*; robots keeps /threats crawlable", async () => {
    for (const path of ["/threats", "/threats/evt_foo:1mmy3jm", "/threats/evt_foo%3A1mmy3jm", "/intelligence/intel_abc"]) {
      const res = middleware(new Request(`https://zayron-x.co${path}`, { headers: { host: "zayron-x.co" } }) as any);
      expect(res.status).toBe(410);
      expect(res.headers.get("X-Robots-Tag")).toBe("noindex, nofollow");
      expect(res.headers.get("Cache-Control")).toBe("public, max-age=86400");

      const headRes = middleware(
        new Request(`https://zayron-x.co${path}`, { method: "HEAD", headers: { host: "zayron-x.co" } }) as any,
      );
      expect(headRes.status).toBe(410);
      expect(await headRes.text()).toBe("");
    }
    expect(robotsText(false, "https://zayron-x.co")).not.toContain("Disallow: /threats");
  });

  test("single-hop 301 redirects from /actors/:slug and /vulnerabilities/:slug to canonical intelligence routes", () => {
    const actorRes = middleware(
      new Request("https://zayron-x.co/actors/blackcat", { headers: { host: "zayron-x.co" } }) as any,
    );
    expect(actorRes.status).toBe(301);
    expect(actorRes.headers.get("Location")).toBe("https://zayron-x.co/intelligence/threat-actors/blackcat");

    const vulnRes = middleware(
      new Request("https://zayron-x.co/vulnerabilities/CVE-2026-15003?tab=matrix", {
        headers: { host: "zayron-x.co" },
      }) as any,
    );
    expect(vulnRes.status).toBe(301);
    expect(vulnRes.headers.get("Location")).toBe("https://zayron-x.co/intelligence/vulnerabilities/CVE-2026-15003?tab=matrix");

    const wwwActorRes = middleware(
      new Request("https://www.zayron-x.co/actors/blackcat", { headers: { host: "www.zayron-x.co" } }) as any,
    );
    expect(wwwActorRes.status).toBe(301);
    expect(wwwActorRes.headers.get("Location")).toBe("https://zayron-x.co/intelligence/threat-actors/blackcat");
  });

  test("utility-only noindex on /search and /intelligence-disclaimer; absent from STATIC_PATHS; CVEs stay indexable", () => {
    expect([...STATIC_PATHS]).not.toContain("/search");
    expect([...STATIC_PATHS]).not.toContain("/intelligence-disclaimer");
    expect([...STATIC_PATHS]).not.toContain("/legal/intelligence-disclaimer");

    const searchPage = readFileSync("apps/web/app/search/page.tsx", "utf8");
    expect(searchPage).toContain("indexable: false");
    const disclaimerPage = readFileSync("apps/web/app/intelligence-disclaimer/page.tsx", "utf8");
    expect(disclaimerPage).toContain("indexable: false");
    const cvePage = readFileSync("apps/web/app/intelligence/vulnerabilities/[id]/page.tsx", "utf8");
    expect(cvePage).toContain("indexable: true");
  });

  test("generic ProcessCommandLine CVE KQL boilerplate is deleted and unenriched CVEs omit hunting", () => {
    const src = readFileSync("apps/web/app/lib/detectionAsCode.ts", "utf8");
    expect(src).not.toContain('ProcessCommandLine has "${id}"');
    expect(cveHuntingQueries("CVE-2026-120542", { vendor: "Foo", product: "Bar" })).toBeNull();
  });

  test("/intelligence SSR hub, paginated vulnerabilities/vendors/techniques render crawlable links", () => {
    const intelHub = readFileSync("apps/web/app/intelligence/page.tsx", "utf8");
    expect(intelHub).not.toContain("NO CURRENT INTELLIGENCE");
    expect(intelHub).toContain("getVulnerabilities");
    expect(intelHub).toContain("/intelligence/vendors");
    expect(intelHub).toContain("/intelligence/techniques");

    const vulnPage = readFileSync("apps/web/app/intelligence/vulnerabilities/page.tsx", "utf8");
    const vulnList = readFileSync("apps/web/app/components/VulnerabilityList.tsx", "utf8");
    expect(vulnPage).toContain('rel="next"');
    expect(vulnList).toContain("vulnPageHref");

    const vendorsPage = readFileSync("apps/web/app/intelligence/vendors/page.tsx", "utf8");
    const techniquesPage = readFileSync("apps/web/app/intelligence/techniques/page.tsx", "utf8");
    expect(vendorsPage).toContain("vendorPageUrl(");
    expect(techniquesPage).toContain("techniquePageUrl(");
  });

  test("curated vulnerabilities sitemap omits cron updated_at, and static.xml drops advisories & 2026-07-31 stamps", () => {
    const rows = sitemapRowsQuery("vulnerabilities", [], 2000, 0, ["CVE-2024-1234"]);
    const count = sitemapCountQuery("vulnerabilities", [], ["CVE-2024-1234"]);
    expect(rows.sql).toContain("is_exploited_in_wild = 1");
    expect(rows.sql).toContain("cve_pocs");
    expect(rows.sql).toContain("detection_rules");
    expect(rows.sql).toContain("CVE-2024-1234");
    expect(rows.sql).not.toContain("json_each");
    expect(rows.sql).toContain("modified_at");
    expect(rows.sql).not.toMatch(/SELECT cve_id AS id,\s*updated_at FROM vulnerabilities/);
    expect(count.sql).toContain("is_exploited_in_wild = 1");

    const shardRoute = readFileSync("apps/web/app/sitemaps/[shard]/route.ts", "utf8");
    expect(shardRoute).not.toContain("advisoryEntries");
    expect(shardRoute).not.toContain("actor.last_seen");
    expect(shardRoute).not.toContain("campaign.last_seen");
  });

  test("CSP drops stale preview origin and CVE components normalize UTC dates cleanly", () => {
    const mw = readFileSync("apps/web/middleware.ts", "utf8");
    const nextCfg = readFileSync("apps/web/next.config.ts", "utf8");
    expect(mw).not.toContain("zayron-x-api-preview");
    expect(nextCfg).not.toContain("zayron-x-api-preview");

    const detail = readFileSync("apps/web/app/components/VulnerabilityDetail.tsx", "utf8");
    expect(detail).toContain("parseUtcDate");
    expect(detail).toContain("useKevCompliance");
  });
});
