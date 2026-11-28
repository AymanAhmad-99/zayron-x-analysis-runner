import { describe, expect, mock, test } from "bun:test";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

mock.module("next/server", () => ({
  NextResponse: {
    next() {
      return new Response(null, { status: 200 });
    },
    redirect(url: URL | string, status = 307) {
      return new Response(null, { status, headers: { Location: String(url) } });
    },
  },
}));

const { middleware } = await import("../../apps/web/middleware");
import {
  buildSitemapIndex,
  buildSitemapIndexEntries,
  buildUrlset,
  NAMED_CRAWLERS,
  robotsText,
} from "../../apps/web/app/lib/sitemap";
import { buildLinkedJsonLdGraph, buildOpenGraph } from "../../apps/web/app/lib/seo";

function walkPages(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const stat = statSync(full);
    if (stat.isDirectory()) out.push(...walkPages(full));
    else if (entry === "page.tsx") out.push(full);
  }
  return out;
}

describe("PHASE 10-SEO-FORENSICS — Edge & SSR SEO hardening", () => {
  test("workers.dev preview/staging hosts always emit X-Robots-Tag: noindex, nofollow", () => {
    const req = new Request("https://zayron-x-web-preview.aabusabih.workers.dev/news", {
      headers: { host: "zayron-x-web-preview.aabusabih.workers.dev" },
    }) as any;
    const res = middleware(req);
    expect(res.headers.get("X-Robots-Tag")).toBe("noindex, nofollow");
    expect(res.headers.get("Cache-Control")).toBe("private, no-store");
  });

  test("www.zayron-x.co redirects 301 directly to apex https://zayron-x.co with query intact", () => {
    const req = new Request("https://www.zayron-x.co/intelligence/vulnerabilities/CVE-2026-132165?tab=poc", {
      headers: { host: "www.zayron-x.co" },
    }) as any;
    const res = middleware(req);
    expect(res.status).toBe(301);
    expect(res.headers.get("Location")).toBe(
      "https://zayron-x.co/intelligence/vulnerabilities/CVE-2026-132165?tab=poc",
    );
  });

  test("/news stays edge-cacheable and indexable while /news?view=wire is noindex, follow and private, no-store", () => {
    const newsRes = middleware(new Request("https://zayron-x.co/news", { headers: { host: "zayron-x.co" } }) as any);
    expect(newsRes.headers.get("Cache-Control")).toBe("public, s-maxage=300, stale-while-revalidate=600");
    expect(newsRes.headers.get("X-Robots-Tag")).toBeNull();

    const wireRes = middleware(
      new Request("https://zayron-x.co/news?view=wire", { headers: { host: "zayron-x.co" } }) as any,
    );
    expect(wireRes.headers.get("X-Robots-Tag")).toBe("noindex, follow");
    expect(wireRes.headers.get("Cache-Control")).toBe("private, no-store");
  });

  test("/about and /intelligence/vulnerabilities/* emit public s-maxage cache headers", () => {
    for (const path of ["/about", "/intelligence/vulnerabilities/CVE-2026-132165", "/news/sample-briefing"]) {
      const res = middleware(new Request(`https://zayron-x.co${path}`, { headers: { host: "zayron-x.co" } }) as any);
      expect(res.headers.get("Cache-Control")).toBe("public, s-maxage=300, stale-while-revalidate=600");
    }
  });

  test("robots.txt explicitly allows Googlebot and AI search crawlers without blocking _next/static", () => {
    const robots = robotsText(false, "https://zayron-x.co");
    for (const bot of ["Googlebot", "OAI-SearchBot", "PerplexityBot", "ClaudeBot"]) {
      expect(NAMED_CRAWLERS).toContain(bot as (typeof NAMED_CRAWLERS)[number]);
      expect(robots).toContain(`User-agent: ${bot}`);
    }
    expect(robots).not.toContain("_next/static");
    expect(robots).toContain("Sitemap: https://zayron-x.co/sitemap.xml");
    expect(robots).toContain("Sitemap: https://zayron-x.co/sitemaps/news.xml");
  });

  test("sitemap generators produce valid XML without query leaks or invalid dates", () => {
    const entries = buildSitemapIndexEntries("https://zayron-x.co", { vulnerabilities: 2, malware: 1 });
    const indexXml = buildSitemapIndex(entries);
    expect(indexXml).toContain('<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">');
    expect(indexXml).toContain("https://zayron-x.co/sitemaps/static.xml");
    expect(indexXml).toContain("https://zayron-x.co/sitemaps/news.xml");
    expect(indexXml).not.toContain("view=wire");

    const urlset = buildUrlset([
      { loc: "https://zayron-x.co/about", lastmod: "2026-11-28 00:00:00" },
      { loc: "https://zayron-x.co/news", lastmod: "not-a-valid-date" },
    ]);
    expect(urlset).toContain("<lastmod>2026-11-28T00:00:00Z</lastmod>");
    expect(urlset).not.toContain("Invalid Date");
    expect(urlset).not.toContain("not-a-valid-date");
  });

  test("no page top-level Metadata title duplicates the root template suffix | ZAYRON-X", () => {
    const pages = walkPages("apps/web/app");
    const offenders: string[] = [];
    for (const file of pages) {
      const content = readFileSync(file, "utf8");
      const lines = content.split(/\r?\n/);
      for (const [idx, line] of lines.entries()) {
        if (/^\s*title\s*:/.test(line) && /(?:\||—)\s*ZAYRON-X(?: Newsroom)?[`"]\s*,/.test(line)) {
          const prev = idx > 0 ? lines[idx - 1] : "";
          const prev2 = idx > 1 ? lines[idx - 2] : "";
          const context = `${prev2}\n${prev}\n${line}`;
          if (!/openGraph|twitter|buildOpenGraph/.test(context)) {
            offenders.push(`${file}:${idx + 1}: ${line.trim()}`);
          }
        }
      }
    }
    expect(offenders).toEqual([]);
  });

  test("NewsArticle JSON-LD carries image and /about uses buildOpenGraph", () => {
    const newsPage = readFileSync("apps/web/app/news/[slug]/page.tsx", "utf8");
    expect(newsPage).toContain('"@type": "NewsArticle"');
    expect(newsPage).toContain("image: [imageUrl]");
    const aboutPage = readFileSync("apps/web/app/about/page.tsx", "utf8");
    expect(aboutPage).toContain("buildOpenGraph(");
    const og = buildOpenGraph({ title: "About ZAYRON-X", description: "Desc", path: "/about", type: "website" });
    expect(og.images[0].url).toBe("/og-image.png");
    const graph = buildLinkedJsonLdGraph({
      path: "/news/test",
      primary: { "@type": "NewsArticle", headline: "Test", image: ["https://zayron-x.co/api/news-cover/test"] },
    }) as any;
    expect(graph["@graph"][2].image).toEqual(["https://zayron-x.co/api/news-cover/test"]);
  });
});
