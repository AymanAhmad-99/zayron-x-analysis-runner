import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { socialProfiles } from "../../apps/web/app/lib/seo";
import {
  BSKY_COOLDOWN_MINUTES,
  BSKY_DAILY_CAP,
  buildBlueskyPostPayload,
  buildBlueskyPostWebUrl,
  publishBlueskyPost,
} from "../../workers/syndicate/src/bluesky";
import { handleSyndicateRequest, runSyndicationCycle } from "../../workers/syndicate/src/index";
import { formatLinkedInPost, publishLinkedInPost } from "../../workers/syndicate/src/linkedin";
import {
  SELECT_SYNDICATION_HIGH_EPSS_SQL,
  SELECT_SYNDICATION_KEV_SQL,
  SELECT_SYNDICATION_NEWS_SQL,
  getPlatformQuotaState,
  loadSyndicationCandidates,
  parseRssXml,
  recordSyndicationLog,
  selectUnpostedCandidate,
} from "../../workers/syndicate/src/signalGate";
import { graphemeLength } from "../../workers/syndicate/src/textUtils";
import type { SyndicateEnv, SyndicationItem } from "../../workers/syndicate/src/types";
import {
  X_DAILY_CAP,
  buildOAuth1AuthorizationHeader,
  formatXThread,
  publishXThread,
} from "../../workers/syndicate/src/x";

interface LogRow {
  item_id: string;
  item_type: string;
  platform: string;
  status: string;
  external_uri: string | null;
  external_url: string | null;
  error_message: string | null;
  posted_at: string;
}

function createFakeD1(options: {
  newsRows?: Array<Record<string, unknown>>;
  kevRows?: Array<Record<string, unknown>>;
  epssRows?: Array<Record<string, unknown>>;
  initialLogRows?: LogRow[];
  throwOnQuery?: boolean;
} = {}) {
  const logRows: LogRow[] = [...(options.initialLogRows ?? [])];
  const executedSql: string[] = [];

  const db = {
    executedSql,
    logRows,
    prepare(sql: string) {
      executedSql.push(sql);
      let bound: unknown[] = [];
      const stmt = {
        bind(...args: unknown[]) {
          bound = args;
          return stmt;
        },
        async run() {
          if (options.throwOnQuery && /FROM\s+(news_articles|vulnerabilities)/i.test(sql)) {
            throw new Error("D1 quota temporarily exceeded");
          }
          if (/INSERT INTO social_syndication_log/i.test(sql)) {
            const [itemId, itemType, platform, status, externalUri, externalUrl, errorMessage, postedAt] = bound as [
              string,
              string,
              string,
              string,
              string | null,
              string | null,
              string | null,
              string,
            ];
            const idx = logRows.findIndex((r) => r.item_id === itemId && r.platform === platform);
            if (idx >= 0) {
              if (logRows[idx].status !== "posted") {
                logRows[idx] = {
                  item_id: itemId,
                  item_type: itemType,
                  platform,
                  status,
                  external_uri: externalUri ?? logRows[idx].external_uri,
                  external_url: externalUrl ?? logRows[idx].external_url,
                  error_message: errorMessage,
                  posted_at: postedAt,
                };
              }
            } else {
              logRows.push({
                item_id: itemId,
                item_type: itemType,
                platform,
                status,
                external_uri: externalUri,
                external_url: externalUrl,
                error_message: errorMessage,
                posted_at: postedAt,
              });
            }
          }
          return { success: true, results: [] };
        },
        async all<T = Record<string, unknown>>() {
          if (options.throwOnQuery && /FROM\s+(news_articles|vulnerabilities)/i.test(sql)) {
            throw new Error("D1 quota temporarily exceeded");
          }
          if (/FROM news_articles/i.test(sql)) {
            return { results: (options.newsRows ?? []) as T[], success: true };
          }
          if (/is_exploited_in_wild = 1/i.test(sql)) {
            return { results: (options.kevRows ?? []) as T[], success: true };
          }
          if (/is_exploited_in_wild = 0/i.test(sql)) {
            return { results: (options.epssRows ?? []) as T[], success: true };
          }
          if (/SELECT posted_at\s+FROM social_syndication_log/i.test(sql)) {
            const [platform, dayStart] = bound as [string, string];
            const filtered = logRows
              .filter((r) => r.platform === platform && r.status === "posted" && r.posted_at >= dayStart)
              .sort((a, b) => (a.posted_at > b.posted_at ? -1 : 1))
              .slice(0, 12)
              .map((r) => ({ posted_at: r.posted_at }));
            return { results: filtered as T[], success: true };
          }
          if (/SELECT item_id\s+FROM social_syndication_log/i.test(sql)) {
            const [platform, ...ids] = bound as [string, ...string[]];
            const idSet = new Set(ids);
            const filtered = logRows
              .filter((r) => r.platform === platform && r.status === "posted" && idSet.has(r.item_id))
              .map((r) => ({ item_id: r.item_id }));
            return { results: filtered as T[], success: true };
          }
          return { results: [] as T[], success: true };
        },
      };
      return stmt;
    },
  };

  return db as unknown as D1Database & { executedSql: string[]; logRows: LogRow[] };
}

const SAMPLE_ITEM: SyndicationItem = {
  itemId: "cve:CVE-2026-44012",
  itemType: "kev",
  title: "CVE-2026-44012 (Acme Gateway) — Active Exploitation in Wild",
  summary: "Pre-authentication command execution flaw affecting edge gateways 🛡️ — patch immediately per CISA directive.",
  url: "https://zayron-x.co/intelligence/vulnerabilities/CVE-2026-44012",
  imageUrl: "https://zayron-x.co/api/og/cve/CVE-2026-44012",
  tags: ["ThreatIntel", "CISAKEV"],
  severity: "CRITICAL",
  cvssScore: 9.8,
  epssScore: 0.914,
  isKev: true,
  publishedAt: "2026-11-28T10:00:00Z",
  detectionHint: "Inspect /api/edge auth logs & upgrade firmware to 9.4.2+",
};

describe("PHASE 14 — Multi-platform Syndication Worker (zayron-x-syndicate)", () => {
  test("1. Bluesky rich-text facets compute exact UTF-8 byte offsets with multi-byte Unicode + <= 300 graphemes", () => {
    const payload = buildBlueskyPostPayload(SAMPLE_ITEM);
    expect(graphemeLength(payload.text)).toBeLessThanOrEqual(300);

    const bytes = Buffer.from(payload.text, "utf8");
    const linkFacet = payload.facets.find((f) => f.features[0]?.$type === "app.bsky.richtext.facet#link");
    expect(linkFacet).toBeDefined();
    expect(bytes.subarray(linkFacet!.index.byteStart, linkFacet!.index.byteEnd).toString("utf8")).toBe(
      SAMPLE_ITEM.url,
    );

    const tagFacets = payload.facets.filter((f) => f.features[0]?.$type === "app.bsky.richtext.facet#tag");
    expect(tagFacets.length).toBe(2);
    expect(bytes.subarray(tagFacets[0].index.byteStart, tagFacets[0].index.byteEnd).toString("utf8")).toBe(
      "#ThreatIntel",
    );
    expect(bytes.subarray(tagFacets[1].index.byteStart, tagFacets[1].index.byteEnd).toString("utf8")).toBe(
      "#CISAKEV",
    );

    expect(payload.embed.$type).toBe("app.bsky.embed.external");
    expect(payload.embed.external.uri).toBe(SAMPLE_ITEM.url);
    expect(payload.embed.external.title).toContain("CVE-2026-44012");

    // Ultra-long title + summary still stays <= 300 graphemes without slicing the canonical URL.
    const longItem: SyndicationItem = {
      ...SAMPLE_ITEM,
      title: "Critical Vulnerability ".repeat(14).trim(),
      summary: "Detailed defensive impact statement ".repeat(14).trim(),
    };
    const longPayload = buildBlueskyPostPayload(longItem);
    expect(graphemeLength(longPayload.text)).toBeLessThanOrEqual(300);
    expect(longPayload.text).toContain(longItem.url);
  });

  test("2. Bluesky publisher handles createSession, graceful OG fallback, createRecord, and web URL construction", async () => {
    const calls: Array<{ url: string; method: string }> = [];
    const mockFetch: typeof fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      calls.push({ url, method: init?.method ?? "GET" });
      if (url.endsWith("/xrpc/com.atproto.server.createSession")) {
        return new Response(
          JSON.stringify({ accessJwt: "jwt-123", did: "did:plc:zayron123", handle: "zayron-x.co" }),
          { status: 200 },
        );
      }
      if (url.includes("/api/og/")) {
        return new Response("not found", { status: 404 });
      }
      if (url.endsWith("/xrpc/com.atproto.repo.createRecord")) {
        const body = JSON.parse(String(init?.body ?? "{}"));
        expect(body.collection).toBe("app.bsky.feed.post");
        expect(body.record.embed.$type).toBe("app.bsky.embed.external");
        expect(body.record.embed.external.thumb).toBeUndefined();
        return new Response(
          JSON.stringify({ uri: "at://did:plc:zayron123/app.bsky.feed.post/3ktest999", cid: "bafyreitest" }),
          { status: 200 },
        );
      }
      return new Response("unexpected", { status: 500 });
    }) as typeof fetch;

    const out = await publishBlueskyPost(
      SAMPLE_ITEM,
      { identifier: "zayron-x.co", appPassword: "app-pw-value" },
      mockFetch,
    );
    expect(out.atUri).toBe("at://did:plc:zayron123/app.bsky.feed.post/3ktest999");
    expect(out.webUrl).toBe("https://bsky.app/profile/zayron-x.co/post/3ktest999");
    expect(buildBlueskyPostWebUrl("@zayron-x.co", out.atUri)).toBe(
      "https://bsky.app/profile/zayron-x.co/post/3ktest999",
    );
    expect(calls.map((c) => c.url)).toContain("https://bsky.social/xrpc/com.atproto.repo.createRecord");
  });

  test("3. X adapter builds RFC 5849 HMAC-SHA1 OAuth 1.0a header, keeps main tweet URL-free, and links reply thread", async () => {
    const authHeader = await buildOAuth1AuthorizationHeader({
      method: "POST",
      url: "https://api.x.com/2/tweets",
      creds: {
        apiKey: "ck",
        apiSecret: "cs",
        accessToken: "at",
        accessSecret: "as",
      },
      nonce: "fixednonce123",
      timestamp: "1764300000",
    });
    expect(authHeader.startsWith("OAuth ")).toBe(true);
    expect(authHeader).toContain('oauth_signature_method="HMAC-SHA1"');
    expect(authHeader).toContain('oauth_nonce="fixednonce123"');
    expect(authHeader).toContain('oauth_signature="');

    const pollutedItem: SyndicationItem = {
      ...SAMPLE_ITEM,
      summary: "Exploitation seen via https://evil-leak.example/raw — apply vendor mitigation ASAP.",
    };
    const thread = formatXThread(pollutedItem);
    expect(thread.mainTweet).not.toMatch(/https?:\/\//i);
    expect(thread.mainTweet.length).toBeLessThanOrEqual(280);
    expect(thread.replyTweet).toContain(pollutedItem.url);
    expect(thread.replyTweet.length).toBeLessThanOrEqual(280);

    const postedPayloads: Array<{ url: string; body: any }> = [];
    const mockFetch: typeof fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      const body = JSON.parse(String(init?.body ?? "{}"));
      postedPayloads.push({ url, body });
      const id = postedPayloads.length === 1 ? "199001" : "199002";
      return new Response(JSON.stringify({ data: { id } }), { status: 201 });
    }) as typeof fetch;

    const xOut = await publishXThread(
      SAMPLE_ITEM,
      { apiKey: "k", apiSecret: "s", accessToken: "t", accessSecret: "sec" },
      mockFetch,
    );
    expect(xOut.tweetId).toBe("199001");
    expect(xOut.replyId).toBe("199002");
    expect(postedPayloads[0].url).toBe("https://api.x.com/2/tweets");
    expect(postedPayloads[1].body.reply.in_reply_to_tweet_id).toBe("199001");
  });

  test("4. LinkedIn adapter produces executive brief format and calls LinkedIn Posts API", async () => {
    const text = formatLinkedInPost(SAMPLE_ITEM);
    expect(text).toContain("What Happened & Who Is Affected");
    expect(text).toContain("Defensive Action");
    expect(text).toContain(SAMPLE_ITEM.url);
    expect(text).toContain("#Cybersecurity #ThreatIntelligence #VulnerabilityManagement");

    let seenAuth = "";
    const mockFetch: typeof fetch = (async (_input: RequestInfo | URL, init?: RequestInit) => {
      const headers = init?.headers as Record<string, string>;
      seenAuth = headers.Authorization;
      return new Response("", { status: 201, headers: { "x-restli-id": "urn:li:share:778899" } });
    }) as typeof fetch;

    const out = await publishLinkedInPost(
      SAMPLE_ITEM,
      { accessToken: "li-token", orgUrn: "urn:li:organization:12345" },
      mockFetch,
    );
    expect(seenAuth).toBe("Bearer li-token");
    expect(out.postId).toBe("urn:li:share:778899");
  });

  test("5. Signal gate enforces bounded SQL, cross-platform dedupe lock, daily caps, cooldown & RSS fallback", async () => {
    expect(SELECT_SYNDICATION_NEWS_SQL).toContain("LIMIT 10");
    expect(SELECT_SYNDICATION_KEV_SQL).toContain("LIMIT 10");
    expect(SELECT_SYNDICATION_HIGH_EPSS_SQL).toContain("LIMIT 5");

    const db = createFakeD1({
      initialLogRows: [
        {
          item_id: "news:already-posted-slug",
          item_type: "news",
          platform: "bluesky",
          status: "posted",
          external_uri: "at://did:plc:x/app.bsky.feed.post/1",
          external_url: "https://bsky.app/profile/zayron-x.co/post/1",
          error_message: null,
          posted_at: "2026-11-28T11:30:00.000Z",
        },
      ],
    });

    const candidates: SyndicationItem[] = [
      { ...SAMPLE_ITEM, itemId: "news:already-posted-slug", itemType: "news", url: "https://zayron-x.co/news/already-posted-slug" },
      SAMPLE_ITEM,
    ];

    const nextBsky = await selectUnpostedCandidate(db, "bluesky", candidates);
    const nextX = await selectUnpostedCandidate(db, "x", candidates);
    expect(nextBsky?.itemId).toBe("cve:CVE-2026-44012");
    expect(nextX?.itemId).toBe("news:already-posted-slug");

    // 90m cooldown check for Bluesky
    const tooSoon = new Date("2026-11-28T12:15:00.000Z");
    const quotaSoon = await getPlatformQuotaState(db, "bluesky", tooSoon, BSKY_DAILY_CAP, BSKY_COOLDOWN_MINUTES);
    expect(quotaSoon.allowed).toBe(false);
    expect(quotaSoon.reason).toBe("cooldown");

    const afterCooldown = new Date("2026-11-28T13:05:00.000Z");
    const quotaOk = await getPlatformQuotaState(db, "bluesky", afterCooldown, BSKY_DAILY_CAP, BSKY_COOLDOWN_MINUTES);
    expect(quotaOk.allowed).toBe(true);

    // X daily cap = 5
    for (let i = 0; i < X_DAILY_CAP; i++) {
      await recordSyndicationLog(db, {
        itemId: `cve:CVE-2026-100${i}`,
        itemType: "kev",
        platform: "x",
        status: "posted",
        postedAt: "2026-11-28T09:00:00.000Z",
      });
    }
    const xQuota = await getPlatformQuotaState(db, "x", afterCooldown, X_DAILY_CAP, 0);
    expect(xQuota.allowed).toBe(false);
    expect(xQuota.reason).toBe("daily_cap");

    // D1 error triggers clean fallback to /news/rss.xml
    const failingDb = createFakeD1({ throwOnQuery: true });
    const rssXml = `<?xml version="1.0"?><rss><channel><item><title>Edge Zero-Day Alert</title><link>https://zayron-x.co/news/edge-zero-day</link><category>Advisory</category><description>Patch border firewalls promptly.</description></item></channel></rss>`;
    expect(parseRssXml(rssXml, "https://zayron-x.co")).toHaveLength(1);

    const loaded = await loadSyndicationCandidates(failingDb, "https://zayron-x.co", (async () =>
      new Response(rssXml, { status: 200 })) as typeof fetch);
    expect(loaded.source).toBe("rss_fallback");
    expect(loaded.candidates[0].itemId).toBe("news:edge-zero-day");
  });

  test("6. Promise.allSettled platform isolation skips unset secrets & isolates failing platform", async () => {
    const db = createFakeD1({
      newsRows: [
        {
          id: "n1",
          slug: "isolated-briefing",
          title: "Isolated Defensive Briefing",
          verdict: "Mitigate ingress exposure across affected proxies.",
          summary: "Mitigate ingress exposure.",
          category: "ADVISORY",
          severity: "CRITICAL",
          published_at: "2026-11-28T14:00:00Z",
        },
      ],
    });

    const env: SyndicateEnv = {
      DB: db,
      BLUESKY_IDENTIFIER: "zayron-x.co",
      BLUESKY_APP_PASSWORD: "bsky-app-password",
      X_API_KEY: "k",
      X_API_SECRET: "s",
      X_ACCESS_TOKEN: "t",
      X_ACCESS_SECRET: "sec",
      // LinkedIn deliberately omitted
    };

    const mockFetch: typeof fetch = (async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("bsky.social/xrpc/com.atproto.server.createSession")) {
        return new Response(
          JSON.stringify({ accessJwt: "jwt", did: "did:plc:abc", handle: "zayron-x.co" }),
          { status: 200 },
        );
      }
      if (url.includes("bsky.social/xrpc/com.atproto.repo.createRecord")) {
        return new Response(
          JSON.stringify({ uri: "at://did:plc:abc/app.bsky.feed.post/3kisolated", cid: "cid123" }),
          { status: 200 },
        );
      }
      if (url.includes("api.x.com/2/tweets")) {
        return new Response("upstream x error", { status: 500 });
      }
      return new Response("", { status: 404 });
    }) as typeof fetch;

    const report = await runSyndicationCycle(env, { dryRun: false, fetchFn: mockFetch });
    const byPlatform = Object.fromEntries(report.results.map((r) => [r.platform, r]));
    expect(byPlatform.bluesky.status).toBe("posted");
    expect(byPlatform.bluesky.externalUrl).toBe("https://bsky.app/profile/zayron-x.co/post/3kisolated");
    expect(byPlatform.x.status).toBe("failed");
    expect(byPlatform.linkedin.status).toBe("skipped_no_creds");
  });

  test("7. HTTP /health, 401 auth rejection, dryRun, and live testPost on POST /admin/syndicate", async () => {
    const db = createFakeD1();
    const env: SyndicateEnv = {
      DB: db,
      SYNDICATE_ADMIN_TOKEN: "super-secret-admin-token",
      BLUESKY_IDENTIFIER: "zayron-x.co",
      BLUESKY_APP_PASSWORD: "bsky-password",
    };

    const healthRes = await handleSyndicateRequest(new Request("https://syndicate.local/health"), env);
    expect(healthRes.status).toBe(200);
    expect(healthRes.headers.get("X-Robots-Tag")).toBe("noindex, nofollow");
    const healthJson = (await healthRes.json()) as any;
    expect(healthJson.platforms).toEqual({ bluesky: true, x: false, linkedin: false });

    const unauthRes = await handleSyndicateRequest(
      new Request("https://syndicate.local/admin/syndicate", {
        method: "POST",
        body: JSON.stringify({ dryRun: true }),
      }),
      env,
    );
    expect(unauthRes.status).toBe(401);

    // Dry run returns formatted previews with zero DB writes
    const dryRes = await handleSyndicateRequest(
      new Request("https://syndicate.local/admin/syndicate", {
        method: "POST",
        headers: { Authorization: "Bearer super-secret-admin-token" },
        body: JSON.stringify({
          dryRun: true,
          testPost: {
            title: "ZAYRON-X Launches Live Bluesky Threat Intel Stream",
            summary: "Continuous CISA KEV and enriched vulnerability briefings now live.",
            url: "https://zayron-x.co/platform",
            tags: ["ThreatIntel", "Cybersecurity"],
          },
        }),
      }),
      env,
    );
    expect(dryRes.status).toBe(200);
    const dryJson = (await dryRes.json()) as any;
    expect(dryJson.dryRun).toBe(true);
    expect(dryJson.results).toHaveLength(3);
    expect(db.logRows).toHaveLength(0);

    // Live testPost publishes cleanly and records lock row
    const liveMockFetch: typeof fetch = (async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("createSession")) {
        return new Response(
          JSON.stringify({ accessJwt: "jwt", did: "did:plc:z1", handle: "zayron-x.co" }),
          { status: 200 },
        );
      }
      if (url.includes("createRecord")) {
        return new Response(
          JSON.stringify({ uri: "at://did:plc:z1/app.bsky.feed.post/3klive1", cid: "cid1" }),
          { status: 200 },
        );
      }
      return new Response("", { status: 404 });
    }) as typeof fetch;

    const liveRes = await handleSyndicateRequest(
      new Request("https://syndicate.local/admin/syndicate", {
        method: "POST",
        headers: { Authorization: "Bearer super-secret-admin-token" },
        body: JSON.stringify({
          platforms: ["bluesky"],
          dryRun: false,
          limit: 1,
          testPost: {
            title: "ZAYRON-X First Bluesky Post",
            summary: "Authoritative defensive threat intelligence live at https://zayron-x.co.",
            url: "https://zayron-x.co/platform",
            tags: ["ThreatIntel"],
          },
        }),
      }),
      env,
      liveMockFetch,
    );
    expect(liveRes.status).toBe(200);
    const liveJson = (await liveRes.json()) as any;
    expect(liveJson.results[0].status).toBe("posted");
    expect(liveJson.results[0].externalUrl).toBe("https://bsky.app/profile/zayron-x.co/post/3klive1");
    expect(db.logRows.some((r) => r.platform === "bluesky" && r.status === "posted")).toBe(true);
  });

  test("8. Worker config matches repo compatibility contract and SEO sameAs includes @zayron-x.co Bluesky", () => {
    const wrangler = readFileSync("workers/syndicate/wrangler.toml", "utf8");
    expect(wrangler).toContain('name = "zayron-x-syndicate"');
    expect(wrangler).toContain('compatibility_date = "2025-09-23"');
    expect(wrangler).toContain('compatibility_flags = ["nodejs_compat"]');
    expect(wrangler).toContain('crons = ["*/30 * * * *"]');
    expect(wrangler).toContain('database_name = "zayron-x-db"');

    const profiles = socialProfiles({});
    expect(profiles).toContain("https://t.me/zayronxai");
    expect(profiles).toContain("https://bsky.app/profile/zayron-x.co");
  });
});
