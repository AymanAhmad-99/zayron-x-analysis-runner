import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import path from "node:path";

import { extractSoftwareTechniqueEdges, matchSoftwareForFamily, normalizeName } from "../../tools/lib/mitre-software-edges.mjs";
import {
  NewsBudget,
  NEWS_MAX_SUBREQUESTS,
  buildBriefing,
  buildHuntingSnippet,
  clampVerdict,
  extractMentions,
  extractTechniqueIds,
  fingerprintOf,
  isNewsIngestSlot,
  normalizeUrl,
  parseFeed,
  pingIndexNow,
  runNewsIngestPass,
  verdictWordCount,
} from "../../workers/ingest/src/newsIngest";
import { mentionHref, normalizeNewsCategory, parseNewsLimit } from "../../workers/api/src/newsroom";
import {
  isRealVendor,
  isRegionCode,
  summarizeRegion,
  vendorSlug,
  REGION_DEFINITIONS,
} from "../../workers/api/src/programmaticHubs";
import { buildLlmsFullTxt, buildLlmsTxt } from "../../workers/api/src/llmsTxt";
import { buildLinkedJsonLdGraph, socialProfiles } from "../../apps/web/app/lib/seo";
import { buildNewsSitemap, isNewsSitemapFresh } from "../../apps/web/app/lib/sitemap";
import { buildOpenGraph } from "../../apps/web/app/lib/seo";
import { formatNewsDate } from "../../apps/web/app/lib/news";

/* ─────────────────── MITRE software → technique extractor ────────────────── */

const STIX = {
  objects: [
    {
      id: "malware--cobalt",
      type: "malware",
      name: "Cobalt Strike",
      x_mitre_aliases: ["CobaltStrike"],
    },
    {
      id: "malware--lumma",
      type: "malware",
      name: "Lumma Stealer",
    },
    {
      id: "tool--mimikatz",
      type: "tool",
      name: "Mimikatz",
    },
    {
      id: "attack-pattern--t1055",
      type: "attack-pattern",
      name: "Process Injection",
      external_references: [{ source_name: "mitre-attack", external_id: "T1055" }],
      kill_chain_phases: [{ kill_chain_name: "mitre-attack", phase_name: "defense-evasion" }],
    },
    {
      id: "attack-pattern--t1003",
      type: "attack-pattern",
      name: "OS Credential Dumping",
      external_references: [{ source_name: "mitre-attack", external_id: "T1003" }],
      kill_chain_phases: [{ kill_chain_name: "mitre-attack", phase_name: "credential-access" }],
    },
    { id: "rel-1", type: "relationship", relationship_type: "uses", source_ref: "malware--cobalt", target_ref: "attack-pattern--t1055" },
    { id: "rel-2", type: "relationship", relationship_type: "uses", source_ref: "malware--lumma", target_ref: "attack-pattern--t1055" },
    { id: "rel-3", type: "relationship", relationship_type: "uses", source_ref: "tool--mimikatz", target_ref: "attack-pattern--t1003" },
    // A non-`uses` relationship must never become an edge.
    { id: "rel-4", type: "relationship", relationship_type: "targets", source_ref: "malware--cobalt", target_ref: "attack-pattern--t1003" },
  ],
};

describe("PHASE 9B — MITRE malware → technique extractor", () => {
  test("extracts only documented `uses` relationships for catalogued families", () => {
    const families = [
      { slug: "cobalt-strike", name: "Cobalt Strike" },
      { slug: "mimikatz", name: "Mimikatz" },
      { slug: "lumma", name: "Lumma" },
    ];
    const result = extractSoftwareTechniqueEdges(STIX.objects, families);
    expect(result.edges.length).toBe(3);
    expect(result.edges.every((edge: any) => edge.entity_type === "malware")).toBe(true);
    const cobalt = result.edges.find((edge: any) => edge.entity_slug === "cobalt-strike");
    expect(cobalt.technique_id).toBe("T1055");
    expect(cobalt.tactic).toBe("defense-evasion");
    expect(result.unmatched).toEqual([]);
  });

  test("maps a family stem onto the documented product name, and rejects ambiguity", () => {
    const software = STIX.objects.filter((object: any) => object.type === "malware" || object.type === "tool");
    expect((matchSoftwareForFamily(software, { slug: "lumma", name: "Lumma" }) as any).name).toBe("Lumma Stealer");
    // An exact normalized match beats a longer product name.
    const near = [
      { name: "MEDUSA", type: "malware" },
      { name: "Medusa Ransomware", type: "malware" },
    ];
    expect(normalizeName("MEDUSA")).toBe("medusa");
    expect((matchSoftwareForFamily(near, { slug: "medusa", name: "Medusa" }) as any).name).toBe("MEDUSA");
    // Two equally exact candidates ⇒ no attribution at all.
    const ambiguous = [
      { name: "MEDUSA", type: "malware" },
      { name: "medusa", type: "tool" },
    ];
    expect(matchSoftwareForFamily(ambiguous, { slug: "medusa", name: "Medusa" })).toBeNull();
  });

  test("unmatched families are reported, never invented", () => {
    const result = extractSoftwareTechniqueEdges(STIX.objects, [{ slug: "ghost", name: "Ghost Family" }]);
    expect(result.edges).toEqual([]);
    expect(result.unmatched).toEqual([{ slug: "ghost", name: "Ghost Family" }]);
  });
});

/* ───────────────────────── slot isolation & budget ──────────────────────── */

describe("PHASE 9B — news ingest scheduling", () => {
  test("only 00:40, 08:40, 12:40, 16:40 and 20:40 UTC are news slots", () => {
    const active: number[] = [];
    for (let hour = 0; hour < 24; hour += 1) {
      if (isNewsIngestSlot(new Date(Date.UTC(2026, 10, 26, hour, 40)))) active.push(hour);
    }
    expect(active).toEqual([0, 8, 12, 16, 20]);
  });

  test("no overlap with pulse (:00), IOC (:20), Radar/PoC/KEV (:40 quiet) or wire", () => {
    const reserved = [0, 2, 4, 6, 10, 14, 18];
    for (const hour of reserved) {
      expect(isNewsIngestSlot(new Date(Date.UTC(2026, 10, 26, hour, 0)))).toBe(false);
      expect(isNewsIngestSlot(new Date(Date.UTC(2026, 10, 26, hour, 20)))).toBe(false);
    }
    // 01:40 / 03:40 / 05:40 belong to Radar only.
    for (const hour of [1, 3, 5]) {
      expect(isNewsIngestSlot(new Date(Date.UTC(2026, 10, 26, hour, 40)))).toBe(false);
    }
  });

  test("the budget guard hard-caps external requests", () => {
    const budget = new NewsBudget();
    expect(NEWS_MAX_SUBREQUESTS).toBe(6);
    let taken = 0;
    while (budget.take()) taken += 1;
    expect(taken).toBe(6);
    expect(budget.remaining).toBe(0);
  });
});

/* ───────────────────────────── feed parsing ─────────────────────────────── */

describe("PHASE 9B — feed parsing and dedupe", () => {
  const RSS = `<?xml version="1.0"?><rss><channel>
    <item><title><![CDATA[CISA adds Fortinet flaw to KEV]]></title>
      <link>https://example.test/a?utm_source=x</link>
      <pubDate>Wed, 25 Nov 2026 12:00:00 GMT</pubDate>
      <description><![CDATA[<p>Active <b>exploitation</b> reported.</p>]]></description></item>
    <item><title>No link story</title><description>x</description></item>
  </channel></rss>`;

  test("parses RSS items, strips tags and rejects linkless entries", () => {
    const items = parseFeed(RSS, "Example");
    expect(items.length).toBe(1);
    expect(items[0].title).toBe("CISA adds Fortinet flaw to KEV");
    expect(items[0].description).toBe("Active exploitation reported.");
    expect(items[0].publishedAt).toBe("2026-11-25T12:00:00.000Z");
    expect(items[0].sourceName).toBe("Example");
  });

  test("fingerprint ignores tracking parameters and is stable", async () => {
    expect(normalizeUrl("https://Example.test/a/?utm_source=x&utm_medium=y#frag")).toBe("https://example.test/a");
    const one = await fingerprintOf({ title: "CISA adds Fortinet flaw to KEV", link: "https://example.test/a?utm_source=x" });
    const two = await fingerprintOf({ title: "cisa adds fortinet flaw to kev!", link: "https://example.test/a/" });
    expect(one).toBe(two);
    expect(one.length).toBe(64);
  });

  test("a duplicate fingerprint is never written twice", async () => {
    const statements: string[] = [];
    const db = {
      prepare(sql: string) {
        return {
          bind: (..._values: unknown[]) => ({ __sql: sql, all: async () => ({ results: [] }) }),
          all: async () => ({ results: [] }),
        };
      },
      batch: async (batch: any[]) => {
        statements.push(...batch.map((entry) => entry.__sql));
        return [];
      },
    } as any;
    const result = await runNewsIngestPass(
      { DB: db },
      {
        feeds: [
          { name: "Example", url: "https://example.test/feed" },
          { name: "Example2", url: "https://example.test/feed2" },
        ],
        fetchImpl: async () => new Response(RSS, { status: 200 }),
        now: new Date("2026-11-26T00:40:00.000Z"),
        limit: 5,
      },
    );
    // One distinct story across two feeds ⇒ one article, one insert.
    expect(result.articles_written).toBeLessThanOrEqual(1);
    expect(result.subrequestsUsed).toBeLessThanOrEqual(6);
    expect(statements.filter((sql) => sql.includes("INTO news_articles")).length).toBeLessThanOrEqual(1);
  });
});

/* ─────────────────────── deterministic entity linking ───────────────────── */

describe("PHASE 9B — deterministic auto-entity linker", () => {
  test("extracts CVE, technique, family, actor and vendor candidates", () => {
    const mentions = extractMentions(
      "CISA warns CVE-2026-15003 is exploited; Cobalt Strike and APT29 used T1059.001 against Fortinet devices. Also MAL-2026-1234.",
      {
        families: [{ slug: "cobalt-strike", name: "Cobalt Strike" }],
        actors: [{ slug: "apt29", name: "APT29", aliases: ["Cozy Bear"] }],
        vendors: [{ slug: "fortinet", name: "Fortinet" }],
        techniques: ["T1059.001"],
      },
    );
    const types = mentions.map((mention) => mention.entity_type).sort();
    expect(types).toEqual(["actor", "malware_advisory", "malware_family", "technique", "vendor"]);
    expect(mentions.find((m) => m.entity_type === "technique")?.in_catalog).toBe(1);
    expect(mentions.find((m) => m.entity_type === "malware_advisory")?.in_catalog).toBe(0);
  });

  test("bare T#### product codes are not treated as techniques", () => {
    expect(extractTechniqueIds("The T1000 chip and T1059.001 technique")).toEqual(["T1059.001"]);
  });

  test("only catalogued mentions produce an internal link", () => {
    expect(mentionHref({ entity_type: "cve", entity_slug: "CVE-2026-1", in_catalog: 1 })).toBe(
      "/intelligence/vulnerabilities/CVE-2026-1",
    );
    expect(mentionHref({ entity_type: "cve", entity_slug: "CVE-2026-1", in_catalog: 0 })).toBeNull();
    expect(mentionHref({ entity_type: "vendor", entity_slug: "fortinet", in_catalog: 1 })).toBe(
      "/intelligence/vendors/fortinet",
    );
  });
});

/* ───────────────────────────── synthesis ────────────────────────────────── */

describe("PHASE 9B — briefing synthesis", () => {
  const item = {
    title: "CISA adds a critical Fortinet authentication bypass to KEV",
    link: "https://example.test/fortinet",
    publishedAt: "2026-11-25T12:00:00.000Z",
    description: "Active exploitation of CVE-2026-15003 has been observed.",
    sourceName: "CISA Advisories",
  };
  const mentions = [
    { entity_type: "cve" as const, entity_slug: "CVE-2026-15003", entity_label: "CVE-2026-15003", in_catalog: 1 },
    { entity_type: "vendor" as const, entity_slug: "fortinet", entity_label: "Fortinet", in_catalog: 1 },
  ];
  const cves = [
    {
      cve_id: "CVE-2026-15003",
      cvss_score: 9.8,
      epss_score: 0.42,
      is_exploited_in_wild: 1,
      kev_due_date: "2026-12-10",
      affected_vendor: "Fortinet",
      affected_product: "FortiOS",
      poc_count: 3,
    },
  ];

  test("verdict is always inside the 40–65 word GEO window", () => {
    const briefing = buildBriefing({ item, mentions, cves, techniques: [], families: [], actors: [] });
    expect(verdictWordCount(briefing.verdict)).toBeGreaterThanOrEqual(40);
    expect(verdictWordCount(briefing.verdict)).toBeLessThanOrEqual(65);
    expect(clampVerdict("Too short.").split(/\s+/).length).toBeGreaterThanOrEqual(40);
  });

  test("KEV membership drives CRITICAL and fact-derived FAQ", () => {
    const briefing = buildBriefing({ item, mentions, cves, techniques: [{ id: "T1059.001", name: "PowerShell" }], families: [], actors: [] });
    expect(briefing.severity).toBe("CRITICAL");
    expect(briefing.category).toBe("EXPLOITATION");
    expect(briefing.faq.length).toBeGreaterThanOrEqual(2);
    expect(briefing.faq.some((entry) => /Known Exploited Vulnerabilities/.test(entry.answer))).toBe(true);
    expect(briefing.faq.every((entry) => !/will be exploited tomorrow/i.test(entry.answer))).toBe(true);
    expect(briefing.sections.length).toBe(3);
  });

  test("no CVE means no severity, CVSS or exploitation claim", () => {
    const briefing = buildBriefing({
      item: {
        ...item,
        title: "CISA publishes new guidance on identity hardening",
        description: "The agency published baseline configuration guidance for federal networks.",
      },
      mentions: [],
      cves: [],
      techniques: [],
      families: [],
      actors: [],
    });
    expect(briefing.severity).toBe("INFO");
    expect(briefing.verdict).not.toMatch(/CVSS \d/);
    expect(briefing.faq[0].answer).toMatch(/No authoritative CVE/);
  });

  test("hunting snippets never contain a raw defang violation", () => {
    const hunt = buildHuntingSnippet(["CVE-2026-15003", "Cobalt Strike"]);
    expect(hunt.kql).toContain("DeviceProcessEvents");
    expect(hunt.spl).toContain("index=*");
    expect(hunt.kql).not.toContain("<a href");
  });
});

/* ─────────────────────────── IndexNow no-op ─────────────────────────────── */

describe("PHASE 9B — IndexNow", () => {
  test("no key means no request at all", async () => {
    let called = false;
    const result = await pingIndexNow(["https://zayron-x.co/news/x"], "", {
      fetchImpl: (async () => {
        called = true;
        return new Response("", { status: 200 });
      }) as any,
    });
    expect(result).toBe("DISABLED");
    expect(called).toBe(false);
  });

  test("a configured key sends exactly one bounded POST", async () => {
    const calls: string[] = [];
    const budget = new NewsBudget(6);
    const result = await pingIndexNow(["https://zayron-x.co/news/x"], "abc123", {
      budget,
      fetchImpl: (async (url: string) => {
        calls.push(String(url));
        return new Response("", { status: 200 });
      }) as any,
    });
    expect(result).toBe("HTTP_200");
    expect(calls).toEqual(["https://api.indexnow.org/indexnow"]);
    expect(budget.used).toBe(1);
  });
});

/* ──────────────────────────── SEO / GEO graph ───────────────────────────── */

describe("PHASE 9B — linked JSON-LD @graph", () => {
  test("emits one graph with Organization, WebSite, entity and FAQPage", () => {
    const graph = buildLinkedJsonLdGraph({
      path: "/news/example",
      primary: { "@type": "NewsArticle", headline: "Example" },
      faq: [{ question: "What is affected?", answer: "FortiOS." }],
      social: ["https://t.me/zayronxai"],
    }) as any;
    expect(graph["@context"]).toBe("https://schema.org");
    const types = graph["@graph"].map((node: any) => node["@type"]);
    expect(types).toEqual(["Organization", "WebSite", "NewsArticle", "FAQPage"]);
    const article = graph["@graph"][2];
    expect(article.publisher["@id"]).toBe("https://zayron-x.co/#organization");
    expect(article.isPartOf["@id"]).toBe("https://zayron-x.co/#website");
    expect(graph["@graph"][3].mainEntity[0]["@type"]).toBe("Question");
  });

  test("sameAs contains only verified absolute https profiles", () => {
    const profiles = socialProfiles({
      NEXT_PUBLIC_SOCIAL_X_URL: "javascript:alert(1)",
      NEXT_PUBLIC_SOCIAL_LINKEDIN_URL: "https://www.linkedin.com/company/zayronx",
    });
    expect(profiles).toEqual(["https://t.me/zayronxai", "https://www.linkedin.com/company/zayronx"]);
  });

  test("opengraph always carries an image", () => {
    const og = buildOpenGraph({ title: "T", description: "D", path: "/news/x" });
    expect(og.images[0].url).toBe("/og-image.png");
    expect(og.images[0].width).toBe(1200);
  });
});

describe("PHASE 9B — sitemap contracts", () => {
  test("Google News sitemap declares the news namespace and escapes titles", () => {
    const xml = buildNewsSitemap(
      [
        {
          loc: "https://zayron-x.co/news/a",
          title: "Fortinet & F5 <critical>",
          publishedAt: "2026-11-25T12:00:00.000Z",
        },
      ],
      "https://zayron-x.co",
    );
    expect(xml).toContain('xmlns:news="http://www.google.com/schemas/sitemap-news/0.9"');
    expect(xml).toContain("<news:name>ZAYRON-X</news:name>");
    expect(xml).toContain("Fortinet &amp; F5 &lt;critical&gt;");
    expect(xml).toContain("<news:publication_date>2026-11-25T12:00:00.000Z</news:publication_date>");
  });

  test("only the 48h window is fresh", () => {
    const now = Date.parse("2026-11-26T00:00:00.000Z");
    expect(isNewsSitemapFresh("2026-11-25T23:00:00.000Z", now)).toBe(true);
    expect(isNewsSitemapFresh("2026-11-23T00:00:00.000Z", now)).toBe(false);
    expect(isNewsSitemapFresh("not-a-date", now)).toBe(false);
  });
});

/* ─────────────────────────────── llms.txt ───────────────────────────────── */

describe("PHASE 9B — live llms.txt", () => {
  const data = {
    siteUrl: "https://zayron-x.co",
    news: [
      {
        slug: "example-briefing",
        title: "Example briefing",
        verdict: "A verdict.",
        category: "EXPLOITATION",
        severity: "CRITICAL",
        published_at: "2026-11-25T12:00:00.000Z",
      },
    ],
    kev: [{ cve_id: "CVE-2026-15003", vendor: "Fortinet", product: "FortiOS", cvss_score: 9.8, kev_due_date: "2026-12-10" }],
    families: [{ slug: "cobalt-strike", name: "Cobalt Strike", active_iocs: 12 }],
    actors: [{ slug: "apt29", name: "APT29", techniques: 73 }],
    counters: { briefings: 1, verified_cves: 425, kev: 10, actors: 185, families: 5 },
  };

  test("index lists briefings, KEV, families, actors and canonical patterns", () => {
    const text = buildLlmsTxt(data);
    expect(text.startsWith("# ZAYRON-X")).toBe(true);
    expect(text).toContain("https://zayron-x.co/news/example-briefing");
    expect(text).toContain("CVE-2026-15003");
    expect(text).toContain("/intelligence/malware/families/cobalt-strike");
    expect(text).toContain("/intelligence/threat-actors/apt29");
    expect(text).toContain("/sitemaps/news.xml");
    expect(text).not.toMatch(/hxxp|https?:\/\/\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}/);
  });

  test("full digest carries verdicts and provenance rules", () => {
    const text = buildLlmsFullTxt(data);
    expect(text).toContain("Example briefing");
    expect(text).toContain("A verdict.");
    expect(text).toContain("Provenance");
  });
});

/* ─────────────────────── vendor / region hub logic ──────────────────────── */

describe("PHASE 9B — programmatic hubs", () => {
  test("vendor slugs are stable and placeholders are rejected", () => {
    expect(vendorSlug("Red Hat")).toBe("red-hat");
    expect(vendorSlug("Fortinet")).toBe("fortinet");
    expect(isRealVendor("Fortinet")).toBe(true);
    expect(isRealVendor("n/a")).toBe(false);
    expect(isRealVendor("unknown")).toBe(false);
  });

  test("region codes are the five supported hubs", () => {
    expect(REGION_DEFINITIONS.map((region) => region.code)).toEqual(["us", "eu", "me", "apac", "global"]);
    expect(isRegionCode("us")).toBe(true);
    expect(isRegionCode("mars")).toBe(false);
  });

  test("regional summary counts only real telemetry", () => {
    const summary = summarizeRegion("us", {
      iocRows: [
        { country: "US", n: 4 },
        { country: "DE", n: 2 },
      ],
      actors: [
        { slug: "a", name: "A", regions: ["united states"] },
        { slug: "b", name: "B", regions: ["europe"] },
      ],
      campaigns: [{ slug: "c", name: "C", regions: ["us"] }],
    });
    expect(summary.active_c2).toBe(4);
    expect(summary.actors).toBe(1);
    expect(summary.campaigns).toBe(1);
    expect(summary.name).toBe("United States");
  });
});

/* ──────────────────────────── API read bounds ───────────────────────────── */

describe("PHASE 9B — newsroom read contract", () => {
  test("limit and offset are clamped, unknown categories are not errors", () => {
    expect(parseNewsLimit("500")).toBe(50);
    expect(parseNewsLimit("0")).toBe(1);
    expect(parseNewsLimit("junk")).toBe(20);
    expect(normalizeNewsCategory("exploitation")).toBe("EXPLOITATION");
    expect(normalizeNewsCategory("nonsense")).toBeNull();
  });

  test("briefing dates render deterministically in UTC", () => {
    expect(formatNewsDate("2026-11-25T12:00:00.000Z")).toBe("Nov 25, 2026");
  });
});

/* ─────────────────────── Windows build OOM guard ────────────────────────── */

describe("PHASE 9B — deterministic web build memory", () => {
  test("the production deploy script pins the successful build profile", () => {
    const source = readFileSync(path.resolve(__dirname, "../../tools/deploy-web-production.mjs"), "utf8");
    expect(source).toContain("RAYON_NUM_THREADS");
    expect(source).toContain("--max-old-space-size=6144");
    expect(source).toContain("env: buildEnv()");
  });
});

/* eslint-disable @typescript-eslint/no-explicit-any */
