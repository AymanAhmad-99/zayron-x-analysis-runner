import { describe, expect, it } from "bun:test";
import { buildCanonicalFamilySummary, listCanonicalFamilyHubs } from "../../workers/api/src/iocs";
import { CATALOG_CVE_IDS_SQL } from "../../workers/api/src/threatGraph";
import { isEdgeCacheEligible } from "../../workers/api/src/edgeCache";
import {
  NEWS_MAX_ARTICLES_PER_FEED,
  allocateAcrossFeeds,
  parseFeed,
  type NewsItem,
} from "../../workers/ingest/src/newsIngest";
import { categoryLabel } from "../../apps/web/app/lib/news";
import {
  buildNewsSitemap,
  buildSitemapIndexEntries,
  buildUrlset,
  parseSitemapShard,
} from "../../apps/web/app/lib/sitemap";

/**
 * PHASE 9C — release-candidate hardening gate.
 *
 * Every assertion below pins the exact defect that the Phase 9B forensic audit
 * found in production, so a regression re-opens a failing test instead of a
 * broken live page.
 */

/** Minimal D1 double: routes a statement by the SQL it was given. */
function makeDb(handlers: Array<{ match: RegExp; rows?: unknown[]; first?: unknown }>): any {
  return {
    prepare(sql: string) {
      const handler = handlers.find((entry) => entry.match.test(sql));
      const statement = {
        bind() {
          return statement;
        },
        async first() {
          return handler?.first ?? null;
        },
        async all() {
          return { results: handler?.rows ?? [] };
        },
      };
      return statement;
    },
  };
}

const CANONICAL_DB = () =>
  makeDb([
    {
      match: /SELECT slug, name, updated_at FROM malware/,
      rows: [
        { slug: "lumma", name: "Lumma Stealer", updated_at: "2026-11-20T00:00:00Z" },
        { slug: "asyncrat", name: "AsyncRAT", updated_at: "2026-11-19T00:00:00Z" },
      ],
    },
    {
      match: /SELECT entity_slug, COUNT\(\*\) AS edges FROM technique_edges/,
      rows: [
        { entity_slug: "lumma", edges: 4 },
        { entity_slug: "asyncrat", edges: 2 },
      ],
    },
    {
      match: /FROM malware\s+WHERE LOWER\(slug\)/,
      first: {
        name: "Lumma Stealer",
        slug: "lumma",
        description: "Infostealer distributed through cracked-software lures.",
        created_at: "2026-01-04T00:00:00Z",
        updated_at: "2026-11-20T00:00:00Z",
      },
    },
    {
      match: /SELECT technique_id, technique_name, tactic FROM technique_edges/,
      rows: [
        { technique_id: "T1059.001", technique_name: "PowerShell", tactic: "execution" },
        { technique_id: "T1555.003", technique_name: "Credentials from Web Browsers", tactic: "credential-access" },
      ],
    },
  ]);

describe("P0-2 — unified malware family resolution", () => {
  it("lists canonical catalog families with an honestly empty indicator set", async () => {
    const hubs = await listCanonicalFamilyHubs(CANONICAL_DB());
    expect(hubs.map((hub) => hub.slug)).toEqual(["lumma", "asyncrat"]);
    for (const hub of hubs) {
      expect(hub.canonical).toBe(true);
      expect(hub.active_count).toBe(0);
      expect(hub.sources).toEqual([]);
    }
    // The technique-edge count travels in the sigma_rules slot so the index can
    // order canonical hubs without a second read.
    expect(hubs[0].sigma_rules).toBe(4);
  });

  it("resolves a canonical family with its stored ATT&CK edges and zero indicators", async () => {
    const summary = await buildCanonicalFamilySummary(CANONICAL_DB(), "lumma");
    expect(summary).not.toBeNull();
    expect(summary!.slug).toBe("lumma");
    expect(summary!.family).toBe("Lumma Stealer");
    expect(summary!.canonical).toBe(true);
    expect(summary!.active_count).toBe(0);
    expect(summary!.edl_ready).toBe(0);
    expect(summary!.iocs).toEqual([]);
    expect(summary!.techniques.map((technique) => technique.id)).toEqual(["T1059.001", "T1555.003"]);
    expect(summary!.description).toContain("Infostealer");
  });

  it("answers null for a family in neither namespace, so the route can 404", async () => {
    const summary = await buildCanonicalFamilySummary(
      makeDb([{ match: /FROM malware\s+WHERE LOWER\(slug\)/, first: null }]),
      "not-a-real-family",
    );
    expect(summary).toBeNull();
  });
});

describe("P1-11 — source-fair newsroom allocation", () => {
  const item = (sourceName: string, minutesAgo: number): NewsItem => ({
    title: `${sourceName} story ${minutesAgo}`,
    link: `https://example.test/${sourceName}/${minutesAgo}`,
    publishedAt: new Date(Date.UTC(2026, 10, 26, 12, 0, 0) - minutesAgo * 60_000).toISOString(),
    description: "desc",
    sourceName,
  });

  it("caps each feed so one prolific publisher cannot take every slot", () => {
    const items = [
      ...Array.from({ length: 10 }, (_, index) => item("The Hacker News", index)),
      item("CISA Advisories", 30),
      item("SANS ISC", 40),
      item("CISA News", 50),
    ];
    const allocated = allocateAcrossFeeds(items, 5);
    expect(allocated.length).toBe(5);
    const perFeed = new Map<string, number>();
    for (const entry of allocated) perFeed.set(entry.sourceName, (perFeed.get(entry.sourceName) ?? 0) + 1);
    expect(new Set(allocated.map((entry) => entry.sourceName)).size).toBeGreaterThanOrEqual(3);
    for (const count of perFeed.values()) expect(count).toBeLessThanOrEqual(NEWS_MAX_ARTICLES_PER_FEED);
  });

  it("keeps the newest item of each feed", () => {
    const allocated = allocateAcrossFeeds([item("A", 100), item("A", 1), item("B", 5)], 2);
    expect(allocated[0].publishedAt >= allocated[1].publishedAt).toBe(true);
    expect(allocated.map((entry) => entry.title)).toContain("A story 1");
  });

  it("parses both RSS <item> and Atom <entry> feeds", () => {
    const rss = `<rss><channel>
      <item><title>RSS one</title><link>https://example.test/rss-1</link><pubDate>2026-11-26T10:00:00Z</pubDate><description>rss body</description></item>
    </channel></rss>`;
    const atom = `<feed>
      <entry><title>Atom one</title><link href="https://example.test/atom-1"/><updated>2026-11-26T11:00:00Z</updated><summary>atom body</summary></entry>
    </feed>`;
    const rssItems = parseFeed(rss, "RSS Feed");
    const atomItems = parseFeed(atom, "Atom Feed");
    expect(rssItems).toHaveLength(1);
    expect(rssItems[0].link).toBe("https://example.test/rss-1");
    expect(rssItems[0].sourceName).toBe("RSS Feed");
    expect(atomItems).toHaveLength(1);
    expect(atomItems[0].link).toBe("https://example.test/atom-1");
    expect(atomItems[0].sourceName).toBe("Atom Feed");
  });
});

describe("P1-5 — newsroom category labels", () => {
  it("renders the stored enum as a human label", () => {
    expect(categoryLabel("SUPPLY_CHAIN")).toBe("Supply Chain");
    expect(categoryLabel("THREAT_ACTOR")).toBe("Threat Actor");
    expect(categoryLabel("VULNERABILITY")).toBe("Vulnerability");
    expect(categoryLabel("MALWARE")).toBe("Malware");
    expect(categoryLabel("EXPLOITATION")).toBe("Exploitation");
    expect(categoryLabel("ADVISORY")).toBe("Advisory");
  });

  it("never returns a raw screaming-snake value for an unmapped enum", () => {
    expect(categoryLabel("SOMETHING_NEW")).toBe("Something New");
    expect(categoryLabel("")).toBe("Advisory");
  });
});

describe("P1-3 / P1-4 — sitemap completeness", () => {
  it("advertises the Google News shard from the index", () => {
    const entries = buildSitemapIndexEntries("https://zayron-x.co", { vulnerabilities: 1, malware: 1 });
    const locs = entries.map((entry) => entry.loc);
    expect(locs).toContain("https://zayron-x.co/sitemaps/static.xml");
    expect(locs).toContain("https://zayron-x.co/sitemaps/news.xml");
    expect(locs).toContain("https://zayron-x.co/sitemaps/vulnerabilities-1.xml");
    expect(locs).toContain("https://zayron-x.co/sitemaps/malware-1.xml");
  });

  it("still advertises news.xml when the API shard manifest is unavailable", () => {
    const locs = buildSitemapIndexEntries("https://zayron-x.co", null).map((entry) => entry.loc);
    expect(locs).toEqual([
      "https://zayron-x.co/sitemaps/static.xml",
      "https://zayron-x.co/sitemaps/news.xml",
    ]);
  });

  it("emits a valid news sitemap and drops entries that do not belong to the site", () => {
    const xml = buildNewsSitemap(
      [
        {
          loc: "https://zayron-x.co/news/example-briefing",
          title: "Example briefing",
          publishedAt: "2026-11-26T10:00:00Z",
        },
        {
          loc: "https://elsewhere.example/news/foreign",
          title: "Foreign story",
          publishedAt: "2026-11-26T10:00:00Z",
        },
      ],
      "https://zayron-x.co",
    );
    expect(xml).toContain("<news:news>");
    expect(xml).toContain("<news:title>Example briefing</news:title>");
    expect(xml).not.toContain("elsewhere.example");
  });

  it("keeps the shard parser closed to unknown shards", () => {
    expect(parseSitemapShard("static.xml")).toEqual({ kind: "static" });
    expect(parseSitemapShard("malware-1.xml")).toEqual({ kind: "malware", page: 1 });
    expect(parseSitemapShard("articles-1.xml")).toBeNull();
    expect(parseSitemapShard("../secrets.xml")).toBeNull();
  });

  it("escapes XML in a urlset", () => {
    const xml = buildUrlset([{ loc: "https://zayron-x.co/a?b=1&c=2" }]);
    expect(xml).toContain("&amp;");
    expect(xml).toContain("<loc>https://zayron-x.co/a?b=1&amp;c=2</loc>");
  });
});

describe("P1-10 — internal CVE links are gated on the same provenance as the detail route", () => {
  it("only treats AUTHORITATIVE_VERIFIED rows as catalog entries", () => {
    expect(CATALOG_CVE_IDS_SQL).toContain("provenance_state = 'AUTHORITATIVE_VERIFIED'");
    expect(CATALOG_CVE_IDS_SQL).not.toMatch(/FROM vulnerabilities\s+LIMIT/i);
  });
});

describe("P1-6 — edge cache coverage and safety", () => {
  const eligible = (path: string, headers: Record<string, string> = {}) =>
    isEdgeCacheEligible(
      new Request(`https://api.zayron-x.co${path}`, { headers }),
      new URL(`https://api.zayron-x.co${path}`),
    );

  it("caches the AI-discovery files and the programmatic hubs", () => {
    expect(eligible("/api/v1/llms.txt")).toBe(true);
    expect(eligible("/api/v1/llms-full.txt")).toBe(true);
    expect(eligible("/api/v1/news")).toBe(true);
    expect(eligible("/api/v1/vendors")).toBe(true);
    expect(eligible("/api/v1/techniques")).toBe(true);
    expect(eligible("/api/v1/iocs/families")).toBe(true);
  });

  it("never shares a caller-specific response", () => {
    expect(eligible("/api/v1/llms.txt", { authorization: "Bearer zx_live_x" })).toBe(false);
    expect(eligible("/api/v1/news?q=apt29")).toBe(false);
  });
});
