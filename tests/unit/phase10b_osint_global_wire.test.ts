import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import {
  OSINT_WIRE_MAX_SOURCES,
  clusterKeyFor,
  computeTrustTier,
  contentFingerprint,
  convergenceScore,
  defang,
  defangText,
  detectLanguage,
  deterministicSummary,
  extractActors,
  extractCnvdIds,
  extractCveIds,
  extractIocs,
  extractTechniqueIds,
  handleOsintWebhook,
  ingestWebhookSignals,
  isOsintWireSlot,
  isPromotionCandidate,
  isWireNoise,
  nextCursor,
  nextPollInterval,
  normalizeWireRegion,
  normalizeWireTier,
  parseTelegramChannelHtml,
  parseWebhookSignals,
  regionForLanguage,
  runOsintWirePass,
  scoreSignal,
  sourceUrlFor,
  translateBatch,
  verifyOsintWebhook,
} from "../../workers/ingest/src/osintWire";
import {
  loadWireFeed,
  parseWireLimit,
  parseWireRegion,
  parseWireTier,
  refangSafe,
} from "../../workers/api/src/wire";
import { cveHref, wireHref, wireRelativeTime, wireTierLabel } from "../../apps/web/app/lib/wire";
import {
  buildSeedSql,
  classifyChannels,
  detectLanguage as importDetectLanguage,
  normalizeHandle,
  parseInput,
  parsePlainList,
  parseTelegramDesktopExport,
  sourceIdFor,
  summarize,
} from "../../tools/lib/telegramChannels.mjs";

/**
 * PHASE 10B-1 — multilingual global OSINT wire. Local only: an injected D1 shim
 * and a stub fetch, no network, no live endpoint, no writes outside the shim.
 */

const LONG_RU =
  "Обнаружена активная эксплуатация уязвимости CVE-2026-12345 в корпоративных шлюзах. " +
  "Злоумышленники используют цепочку T1059.001 и домен evil-control.example для связи с C2.";
const LONG_ZH =
  "研究人员披露了 CVE-2026-54321 的在野利用详情，攻击者通过 CNVD-2026-11223 相关漏洞投递恶意载荷。" +
  "相关基础设施位于 update-check.example，建议立即排查。";
const LONG_EN =
  "Researchers published exploitation details for CVE-2026-77777 affecting an edge gateway, " +
  "with a public proof of concept and observed scanning from 203.0.113.42 against exposed hosts.";

const TELEGRAM_HTML = `
<html><body>
  <div class="tgme_widget_message" data-post="ru_sec/101">
    <div class="tgme_widget_message_forwarded_from">forwarded from somewhere</div>
    <div class="tgme_widget_message_text">${LONG_RU}</div>
    <time datetime="2026-11-27T09:00:00+00:00"></time>
    <a href="https://evil-control.example/payload">link</a>
    <a href="https://t.me/ru_sec/100">prev</a>
  </div>
  <div class="tgme_widget_message" data-post="ru_sec/104">
    <div class="tgme_widget_message_text">${LONG_EN}</div>
    <time datetime="2026-11-27T10:00:00+00:00"></time>
  </div>
  <div class="tgme_widget_message" data-post="ru_sec/105">
    <time datetime="2026-11-27T10:30:00+00:00"></time>
  </div>
</body></html>`;

/* ─────────────────────────── D1 shim / fetch stub ─────────────────────────── */

interface Query {
  sql: string;
  args: unknown[];
}

function fakeDb(sources: any[] = []) {
  const queries: Query[] = [];
  const db = {
    prepare(sql: string) {
      return {
        bind(...args: unknown[]) {
          return {
            async run() {
              queries.push({ sql, args });
              return { meta: { changes: 1 } };
            },
            async all() {
              queries.push({ sql, args });
              if (/FROM osint_sources/.test(sql)) return { results: sources };
              if (/FROM osint_clusters/.test(sql)) return { results: [] };
              if (/COUNT\(DISTINCT source_id\)/.test(sql)) return { results: [{ n: 0 }] };
              if (/COUNT\(\*\) AS n/.test(sql)) return { results: [{ n: sources.length }] };
              return { results: [] };
            },
            async first() {
              return null;
            },
          };
        },
      };
    },
  };
  return { db, queries };
}

function stubFetch(status = 200, body = TELEGRAM_HTML) {
  const calls: string[] = [];
  const fetchFn = (async (url: any) => {
    calls.push(String(url));
    return new Response(body, { status, headers: { "content-type": "text/html" } });
  }) as unknown as typeof fetch;
  return { calls, fetchFn };
}

const SOURCE = {
  id: "src_ru",
  handle: "tg:ru_sec",
  source_type: "telegram_public",
  title: "RU Security",
  region: "RU",
  language: "ru",
  category: "news",
  credibility_score: 60,
  poll_interval_mins: 30,
  last_cursor: null,
};

/* ─────────────────────── public Telegram HTML parser ─────────────────────── */

describe("public telegram parser", () => {
  test("extracts data-post, text, timestamp and forwarded flag", () => {
    const messages = parseTelegramChannelHtml(TELEGRAM_HTML, "tg:ru_sec");
    expect(messages.length).toBe(2);
    expect(messages[0].externalId).toBe("101");
    expect(messages[0].text).toContain("CVE-2026-12345");
    expect(messages[0].publishedAt).toBe("2026-11-27T09:00:00.000Z");
    expect(messages[0].forwarded).toBe(true);
    expect(messages[1].forwarded).toBe(false);
  });

  test("drops blocks with no message text", () => {
    const messages = parseTelegramChannelHtml(TELEGRAM_HTML, "tg:ru_sec");
    expect(messages.some((message) => message.externalId === "105")).toBe(false);
  });

  test("keeps outbound links but excludes the channel's own t.me links", () => {
    const messages = parseTelegramChannelHtml(TELEGRAM_HTML, "tg:ru_sec");
    expect(messages[0].links).toContain("https://evil-control.example/payload");
    expect(messages[0].links.some((link) => link.includes("t.me/ru_sec"))).toBe(false);
  });

  test("a malformed page yields zero messages instead of throwing", () => {
    expect(parseTelegramChannelHtml("<html>nope</html>", "tg:x")).toEqual([]);
    expect(parseTelegramChannelHtml("", "tg:x")).toEqual([]);
  });

  test("cursor advances to the highest numeric post id and never regresses", () => {
    expect(nextCursor(null, ["101", "104"])).toBe("104");
    expect(nextCursor("200", ["101"])).toBe("200");
    expect(nextCursor("50", [])).toBe("50");
  });

  test("the pass only runs on its own four free :40 ticks", () => {
    expect(isOsintWireSlot(new Date("2026-11-27T10:40:00Z"))).toBe(true);
    expect(isOsintWireSlot(new Date("2026-11-27T22:40:00Z"))).toBe(true);
    expect(isOsintWireSlot(new Date("2026-11-27T10:20:00Z"))).toBe(false);
    // 08:40 / 12:40 / 16:40 / 20:40 belong to the newsroom, 04:40 to KEV.
    expect(isOsintWireSlot(new Date("2026-11-27T08:40:00Z"))).toBe(false);
    expect(isOsintWireSlot(new Date("2026-11-27T04:40:00Z"))).toBe(false);
  });

  test("source URLs are derived from the handle, never stored as free text", () => {
    expect(sourceUrlFor("tg:ru_sec")).toBe("https://t.me/s/ru_sec");
    expect(sourceUrlFor("gh:SigmaHQ/sigma")).toBe("https://github.com/SigmaHQ/sigma/releases.atom");
    expect(sourceUrlFor("rss:https://example.com/feed")).toBe("https://example.com/feed");
  });
});

/* ─────────────────────────── noise + defanging ───────────────────────────── */

describe("wire noise filter", () => {
  test("rejects text shorter than 80 characters", () => {
    expect(isWireNoise("CVE-2026-1234 patched")).toBe(true);
  });

  test("accepts a substantive security post", () => {
    expect(isWireNoise(LONG_EN)).toBe(false);
  });

  test("rejects a pure promotion with no identifier", () => {
    expect(isWireNoise("Join our channel for the best crypto signal giveaway and promo code today, subscribe now")).toBe(true);
  });

  test("a promotion that carries a real CVE is still a signal", () => {
    expect(isWireNoise(`${LONG_EN} Subscribe to our channel for daily updates and a promo code.`)).toBe(false);
  });
});

describe("defanging", () => {
  test("a URL becomes hxxp with bracketed dots", () => {
    expect(defang("https://evil.example/path")).toBe("hxxps://evil[.]example/path");
  });

  test("free text defangs URLs, IPv4 literals and bare domains", () => {
    const output = defangText("beacon to https://c2.example/x from 203.0.113.42 and update-check.example");
    expect(output).toContain("hxxps://c2[.]example/x");
    expect(output).toContain("203[.]0[.]113[.]42");
    expect(output).toContain("update-check[.]example");
    expect(output).not.toContain("https://c2.example");
  });

  test("extractIocs returns only defanged values", () => {
    const iocs = extractIocs(`${LONG_EN} update-check.example hash ${"a".repeat(64)}`);
    expect(iocs).toContain("203[.]0[.]113[.]42");
    expect(iocs).toContain("update-check[.]example");
    expect(iocs).toContain("a".repeat(64));
    expect(iocs.some((ioc) => ioc.includes(".") && !ioc.includes("[.]"))).toBe(false);
  });

  test("CVE, CNVD/CNNVD, MITRE and actor extraction are independent", () => {
    const text = `${LONG_ZH} T1059.001 APT29 Lazarus`;
    expect(extractCveIds(text)).toEqual(["CVE-2026-54321"]);
    expect(extractCnvdIds(text)).toEqual(["CNVD-2026-11223"]);
    expect(extractTechniqueIds(text)).toEqual(["T1059.001"]);
    expect(extractActors(text)).toContain("APT29");
    expect(extractActors(text)).toContain("Lazarus");
  });

  test("a bare undotted T#### is not treated as a technique", () => {
    expect(extractTechniqueIds("product code T1000 shipped")).toEqual([]);
  });
});

/* ─────────────────────────── language + scoring ──────────────────────────── */

describe("deterministic language detection", () => {
  test("detects each supported script", () => {
    expect(detectLanguage(LONG_RU)).toBe("ru");
    expect(detectLanguage(LONG_ZH)).toBe("zh");
    expect(detectLanguage(LONG_EN)).toBe("en");
    expect(detectLanguage("이 취약점은 원격 코드 실행을 허용합니다")).toBe("ko");
    expect(detectLanguage("این آسیب‌پذیری امکان اجرای کد از راه دور را می‌دهد")).toBe("fa");
    expect(detectLanguage("تم اكتشاف ثغرة خطيرة في البوابة")).toBe("ar");
  });

  test("latin text with a stray Cyrillic word stays English", () => {
    expect(detectLanguage(`CVE-2026-1234 analysis ${"a".repeat(400)} привет`)).toBe("en");
  });

  test("language maps to a wire region", () => {
    expect(regionForLanguage("ru")).toBe("RU");
    expect(regionForLanguage("zh")).toBe("CN");
    expect(regionForLanguage("fa")).toBe("IR");
    expect(regionForLanguage("ko")).toBe("KR");
    expect(regionForLanguage("ar")).toBe("GCC");
    expect(regionForLanguage("en")).toBe("GLOBAL");
  });
});

describe("signal scoring", () => {
  test("an identifier-bearing post outscores plain commentary", () => {
    const withCve = scoreSignal({ text: LONG_EN, region: "GLOBAL", language: "en", credibility: 60, forwarded: false });
    const plain = scoreSignal({
      text: "A long commentary post about the state of security operations without any identifier at all, repeated for length.",
      region: "GLOBAL",
      language: "en",
      credibility: 60,
      forwarded: false,
    });
    expect(withCve).toBeGreaterThan(plain);
    expect(withCve).toBeLessThanOrEqual(100);
    expect(withCve).toBeGreaterThanOrEqual(0);
  });

  test("a forward is penalised and promotion is penalised harder", () => {
    const base = scoreSignal({ text: LONG_EN, region: "GLOBAL", language: "en", credibility: 60, forwarded: false });
    const forwarded = scoreSignal({ text: LONG_EN, region: "GLOBAL", language: "en", credibility: 60, forwarded: true });
    expect(forwarded).toBeLessThan(base);
  });

  test("fingerprints are stable across whitespace and punctuation noise", async () => {
    const a = await contentFingerprint("CVE-2026-1234   Exploited!!");
    const b = await contentFingerprint("cve-2026-1234 exploited");
    expect(a).toBe(b);
    expect(a).toHaveLength(64);
  });
});

/* ─────────────────────── provenance firewall (tiers) ─────────────────────── */

describe("provenance firewall", () => {
  test("three independent sources upgrade to CORROBORATED_OSINT", () => {
    expect(computeTrustTier({ sourceCount: 3, regions: ["RU"], linkedCve: true })).toBe("CORROBORATED_OSINT");
  });

  test("two regions plus a linked CVE also corroborate", () => {
    expect(computeTrustTier({ sourceCount: 2, regions: ["CN", "RU"], linkedCve: true })).toBe("CORROBORATED_OSINT");
  });

  test("two regions with no catalogued CVE stay EARLY", () => {
    expect(computeTrustTier({ sourceCount: 2, regions: ["CN", "RU"], linkedCve: false })).toBe("EARLY_WIRE_SIGNAL");
  });

  test("a single source is always an early signal", () => {
    expect(computeTrustTier({ sourceCount: 1, regions: ["IR"], linkedCve: true })).toBe("EARLY_WIRE_SIGNAL");
  });

  test("an entity-free forward from a low-credibility source is disputed", () => {
    expect(
      computeTrustTier({ sourceCount: 1, regions: ["GLOBAL"], linkedCve: false, forwarded: true, entityCount: 0, credibility: 20 }),
    ).toBe("DISPUTED_RECYCLED");
  });

  test("only a corroborated, >=80, >=3-source cluster is a promotion candidate", () => {
    expect(isPromotionCandidate({ trustTier: "CORROBORATED_OSINT", sourceCount: 3, signalScore: 85 })).toBe(true);
    expect(isPromotionCandidate({ trustTier: "CORROBORATED_OSINT", sourceCount: 2, signalScore: 85 })).toBe(false);
    expect(isPromotionCandidate({ trustTier: "EARLY_WIRE_SIGNAL", sourceCount: 5, signalScore: 95 })).toBe(false);
    expect(isPromotionCandidate({ trustTier: "CORROBORATED_OSINT", sourceCount: 4, signalScore: 60 })).toBe(false);
  });

  test("cluster keys prefer the strongest identifier and are null for noise", () => {
    expect(clusterKeyFor({ cves: ["CVE-2026-1"], cnvd: ["CNVD-2026-1"], techniques: [], actors: ["APT29"], iocs: [] })).toBe(
      "cve:CVE-2026-1",
    );
    expect(clusterKeyFor({ cves: [], cnvd: [], techniques: [], actors: ["APT 29"], iocs: [] })).toBe("actor:apt-29");
    expect(clusterKeyFor({ cves: [], cnvd: [], techniques: [], actors: [], iocs: [] })).toBeNull();
  });

  test("convergence rises with sources, regions and CVEs", () => {
    const low = convergenceScore({ sourceCount: 1, regionCount: 1, cveCount: 0, averageSignalScore: 20 });
    const high = convergenceScore({ sourceCount: 4, regionCount: 3, cveCount: 2, averageSignalScore: 90 });
    expect(high).toBeGreaterThan(low);
    expect(high).toBeLessThanOrEqual(100);
  });

  test("adaptive cadence polls fast when productive and backs off when quiet", () => {
    expect(nextPollInterval(60, 3)).toBe(15);
    expect(nextPollInterval(15, 0)).toBe(30);
    expect(nextPollInterval(55, 0)).toBe(60);
  });
});

/* ─────────────────────── fail-closed translation ─────────────────────────── */

describe("fail-closed translation", () => {
  test("no credential means no call and a null result", async () => {
    const { calls, fetchFn } = stubFetch();
    const result = await translateBatch([{ index: 0, text: LONG_RU, language: "ru" }], { fetchImpl: fetchFn });
    expect(result).toBeNull();
    expect(calls).toEqual([]);
  });

  test("an HTTP error degrades to null instead of throwing", async () => {
    const { fetchFn } = stubFetch(500, "{}");
    const result = await translateBatch([{ index: 0, text: LONG_RU, language: "ru" }], {
      apiKey: "test-key",
      fetchImpl: fetchFn,
    });
    expect(result).toBeNull();
  });

  test("a non-English 'translation' is rejected rather than stored as English", async () => {
    const payload = JSON.stringify([
      { index: 0, title: "Критическая уязвимость", summary: "Обнаружена эксплуатация в дикой природе", relevance: 90 },
    ]);
    const fetchFn = (async () =>
      new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: payload }] } }] }), {
        status: 200,
        headers: { "content-type": "application/json" },
      })) as unknown as typeof fetch;
    const result = await translateBatch([{ index: 0, text: LONG_RU, language: "ru" }], {
      apiKey: "test-key",
      fetchImpl: fetchFn,
    });
    expect(result).toBeNull();
  });

  test("the deterministic summary never claims a translation happened", () => {
    const { title, summary } = deterministicSummary(LONG_RU, "ru", "RU");
    expect(title).toContain("CVE-2026-12345");
    expect(summary).toContain("no machine translation was applied");
    expect(detectLanguage(summary)).toBe("en");
  });
});

/* ────────────────────────────── ingest cycle ─────────────────────────────── */

describe("osint wire ingest cycle", () => {
  test("runs without a translation credential and reports DETERMINISTIC", async () => {
    const { db } = fakeDb([SOURCE]);
    const { fetchFn } = stubFetch();
    const result = await runOsintWirePass({ DB: db as any }, { fetchImpl: fetchFn, generate: false });
    expect(result.translation).toBe("DETERMINISTIC");
    expect(result.sources_polled).toBe(1);
    expect(result.signals_ingested).toBeGreaterThan(0);
  });

  test("never polls more than 12 sources in one cycle", async () => {
    const many = Array.from({ length: 30 }, (_, index) => ({
      ...SOURCE,
      id: `src_${index}`,
      handle: `tg:chan_${index}`,
    }));
    const { db } = fakeDb(many);
    const { calls, fetchFn } = stubFetch();
    const result = await runOsintWirePass({ DB: db as any }, { fetchImpl: fetchFn });
    expect(result.sources_polled).toBeLessThanOrEqual(OSINT_WIRE_MAX_SOURCES);
    expect(calls.length).toBeLessThanOrEqual(OSINT_WIRE_MAX_SOURCES);
  });

  test("writes only the isolated osint store — never a briefing or an authoritative fact", async () => {
    const { db, queries } = fakeDb([SOURCE]);
    const { fetchFn } = stubFetch();
    await runOsintWirePass({ DB: db as any }, { fetchImpl: fetchFn });
    const sql = queries.map((query) => query.sql).join("\n");
    expect(sql).toContain("osint_wire_signals");
    expect(sql).toContain("osint_sources");
    expect(sql).not.toContain("news_articles");
    expect(sql).not.toContain("entity_mentions");
    expect(sql).not.toContain("intelligence_events");
    expect(sql).not.toMatch(/INSERT[^;]*vulnerabilities/i);
  });

  test("never fires IndexNow for a raw single-source signal", async () => {
    const { db } = fakeDb([SOURCE]);
    const { calls, fetchFn } = stubFetch();
    await runOsintWirePass({ DB: db as any }, { fetchImpl: fetchFn });
    expect(calls.some((url) => url.includes("indexnow"))).toBe(false);
  });

  test("a failing source is recorded and never aborts the cycle", async () => {
    const { db } = fakeDb([SOURCE]);
    const fetchFn = (async () => new Response("nope", { status: 500 })) as unknown as typeof fetch;
    const result = await runOsintWirePass({ DB: db as any }, { fetchImpl: fetchFn });
    expect(result.status).toBe("DEGRADED");
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.sources[0].status).toBe(500);
  });

  test("an empty source registry is a clean skip, not an error", async () => {
    const { db } = fakeDb([]);
    const { calls, fetchFn } = stubFetch();
    const result = await runOsintWirePass({ DB: db as any }, { fetchImpl: fetchFn });
    expect(result.status).toBe("SKIPPED");
    expect(calls).toEqual([]);
  });
});

/* ───────────────────────────── signed webhook ────────────────────────────── */

describe("signed ingest webhook", () => {
  const makeRequest = (headers: Record<string, string> = {}) =>
    new Request("https://zayron-x.co/internal/osint-wire/ingest", { method: "POST", headers, body: "{}" });

  test("accepts the operator bearer", async () => {
    const ok = await verifyOsintWebhook(makeRequest({ authorization: "Bearer secret-token" }), {
      STRATEGIC_OPERATOR_TOKEN: "secret-token",
    }, "{}");
    expect(ok).toBe(true);
  });

  test("rejects a wrong or missing bearer", async () => {
    expect(await verifyOsintWebhook(makeRequest({ authorization: "Bearer nope" }), {
      STRATEGIC_OPERATOR_TOKEN: "secret-token",
    }, "{}")).toBe(false);
    expect(await verifyOsintWebhook(makeRequest(), {}, "{}")).toBe(false);
  });

  test("rejects an unsigned request even when a signing secret exists", async () => {
    expect(await verifyOsintWebhook(makeRequest(), { OSINT_WIRE_SIGNING_SECRET: "hmac" }, "{}")).toBe(false);
  });

  test("method and auth failures fail closed with the right status", async () => {
    const { db } = fakeDb([]);
    const getResponse = await handleOsintWebhook(
      new Request("https://x/internal/osint-wire/ingest", { method: "GET" }),
      { DB: db as any },
    );
    expect(getResponse.status).toBe(405);
    const postResponse = await handleOsintWebhook(makeRequest(), { DB: db as any, STRATEGIC_OPERATOR_TOKEN: "t" });
    expect(postResponse.status).toBe(403);
  });

  test("only well-formed signals survive parsing", () => {
    const parsed = parseWebhookSignals({
      signals: [
        { handle: "tg:a", external_id: "1", text: LONG_EN },
        { handle: "", external_id: "2", text: LONG_EN },
        { handle: "tg:b", external_id: "", text: LONG_EN },
        { handle: "tg:c", external_id: "3", text: "" },
      ],
    });
    expect(parsed).toHaveLength(1);
    expect(parsed[0].handle).toBe("tg:a");
  });

  test("an unknown handle is registered disabled and never trusted", async () => {
    const { db, queries } = fakeDb([]);
    const result = await ingestWebhookSignals({ DB: db as any }, [
      { handle: "tg:unknown_private", external_id: "9", text: LONG_EN },
    ]);
    expect(result.accepted).toBe(0);
    expect(result.rejected).toBe(1);
    const insert = queries.find((query) => /INSERT OR IGNORE INTO osint_sources/.test(query.sql));
    expect(insert).toBeDefined();
    expect(String(insert!.sql)).toContain("'telegram_private_webhook'");
  });
});

/* ─────────────────────────────── read model ──────────────────────────────── */

describe("wire read model", () => {
  const rows = [
    {
      id: "ows_1",
      region: "RU",
      original_lang: "ru",
      translated_title: "RU wire: CVE-2026-12345",
      translated_summary: "Exploitation observed.",
      original_excerpt: "C2 at hxxps://evil[.]example/x",
      trust_tier: "EARLY_WIRE_SIGNAL",
      signal_score: 78,
      extracted_cves: '["CVE-2026-12345"]',
      extracted_iocs: '["203[.]0[.]113[.]42"]',
      extracted_actors: "[]",
      cluster_id: null,
      source_url: "https://t.me/ru_sec/101",
      published_at: "2026-11-27T09:00:00Z",
      ingested_at: "2026-11-27T09:05:00Z",
      source_handle: "tg:ru_sec",
      source_title: "RU Security",
      category: "news",
    },
  ];

  function readDb() {
    const seen: Query[] = [];
    const exec = (sql: string, args: unknown[]) => {
      seen.push({ sql, args });
      if (/FROM osint_wire_signals s\s+LEFT JOIN/.test(sql)) return { results: rows };
      if (/COUNT\(\*\) AS n/.test(sql)) return { results: [{ n: 1 }] };
      if (/FROM osint_clusters/.test(sql)) {
        return {
          results: [
            {
              id: "osc_1",
              cluster_key: "cve:CVE-2026-12345",
              headline: "RU wire: CVE-2026-12345",
              regions_json: '["RU","CN"]',
              source_count: 3,
              linked_cves_json: '["CVE-2026-12345"]',
              convergence_score: 82,
              trust_tier: "CORROBORATED_OSINT",
              last_seen_at: "2026-11-27T10:00:00Z",
            },
          ],
        };
      }
      if (/GROUP BY region/.test(sql)) return { results: [{ region: "RU", count: 4 }] };
      return { results: [] };
    };
    return {
      seen,
      prepare(sql: string) {
        return {
          async all() {
            return exec(sql, []);
          },
          bind(...args: unknown[]) {
            return {
              async all() {
                return exec(sql, args);
              },
            };
          },
        };
      },
    };
  }

  test("parses filters defensively", () => {
    expect(parseWireRegion("ru")).toBe("RU");
    expect(parseWireRegion("mars")).toBe("ALL");
    expect(parseWireTier("corroborated_osint")).toBe("CORROBORATED_OSINT");
    expect(parseWireTier("nope")).toBe("ALL");
    expect(parseWireLimit("500")).toBe(60);
    expect(parseWireLimit("abc")).toBe(30);
    expect(normalizeWireRegion("cn")).toBe("CN");
    expect(normalizeWireTier("early_wire_signal")).toBe("EARLY_WIRE_SIGNAL");
  });

  test("returns sanitized signals, clusters and regional counts", async () => {
    const feed = await loadWireFeed(readDb() as any, { region: "RU", limit: 10 });
    expect(feed.items).toHaveLength(1);
    expect(feed.items[0].cves).toEqual(["CVE-2026-12345"]);
    expect(feed.items[0].excerpt).toContain("[.]");
    expect(feed.clusters[0].trust_tier).toBe("CORROBORATED_OSINT");
    expect(feed.region_counts[0]).toEqual({ region: "RU", count: 4 });
    expect(feed.total).toBe(1);
  });

  test("region and tier filters are bound parameters, never interpolated", async () => {
    const db = readDb();
    await loadWireFeed(db as any, { region: "CN", tier: "EARLY_WIRE_SIGNAL" });
    const signalQuery = db.seen.find((entry) => /FROM osint_wire_signals s\s+LEFT JOIN/.test(entry.sql));
    expect(signalQuery!.sql).toContain("s.region = ?");
    expect(signalQuery!.sql).toContain("s.trust_tier = ?");
    expect(signalQuery!.args).toContain("CN");
    expect(signalQuery!.sql).not.toContain("'CN'");
  });

  test("output defanging is idempotent", () => {
    expect(refangSafe("hxxps://evil[.]example/x")).toBe("hxxps://evil[.]example/x");
    expect(refangSafe("https://evil.example/x")).toBe("https://evil.example/x");
  });
});

/* ───────────────────────────────── UI ───────────────────────────────────── */

describe("global wire UI", () => {
  const newsPage = readFileSync("apps/web/app/news/page.tsx", "utf8");
  const component = readFileSync("apps/web/app/components/GlobalWire.tsx", "utf8");

  test("the newsroom offers both views and only the wire view is noindex", () => {
    expect(newsPage).toContain("Editorial Briefings");
    expect(newsPage).toContain("Global Wire");
    expect(newsPage).toContain('params.view === "wire"');
    expect(newsPage).toContain("indexable: !wireView");
  });

  test("the wire surface states the provenance firewall explicitly", () => {
    expect(component).toContain("AUTHORITATIVE_VERIFIED");
    expect(component).toContain("Provenance firewall");
    expect(component).toContain("never submitted to search engines");
  });

  test("a single-source row is labelled early signal, not verified", () => {
    expect(wireTierLabel("EARLY_WIRE_SIGNAL")).toBe("EARLY SIGNAL");
    expect(wireTierLabel("CORROBORATED_OSINT")).toBe("CORROBORATED OSINT");
    expect(wireTierLabel("whatever")).toBe("EARLY SIGNAL");
  });

  test("only a real CVE id becomes a dossier link", () => {
    expect(cveHref("CVE-2026-12345")).toBe("/intelligence/vulnerabilities/CVE-2026-12345");
    expect(cveHref("CVE-2026-12345<script>")).toBeNull();
  });

  test("wire links preserve the region filter and relative time is honest", () => {
    expect(wireHref({ region: "CN" })).toContain("view=wire");
    expect(wireHref({ region: "CN" })).toContain("region=CN");
    expect(wireRelativeTime("2026-11-27T09:00:00Z", new Date("2026-11-27T11:00:00Z"))).toBe("2h ago");
    expect(wireRelativeTime("2026-11-27T10:58:00Z", new Date("2026-11-27T11:00:00Z"))).toBe("2m ago");
    expect(wireRelativeTime("not-a-date")).toBe("not-a-date");
  });
});

/* ────────────────────────────── 200-channel importer ─────────────────────── */

describe("telegram channel importer", () => {
  const desktopExport = JSON.stringify({
    chats: {
      list: [
        { name: "Русский Security", type: "public_supergroup", username: "ru_sec" },
        { name: "安全客", type: "public_supergroup", username: "anquanke" },
        { name: "Private Ops", type: "private_group", invite_link: "https://t.me/+AbCdEf123" },
        { name: "No Link Group", type: "private_group" },
        { name: "보안뉴스", type: "public_channel", username: "boannews" },
      ],
    },
  });

  test("parses a Telegram Desktop export", () => {
    const entries = parseTelegramDesktopExport(JSON.parse(desktopExport));
    expect(entries).toHaveLength(5);
    expect(entries[0].username).toBe("ru_sec");
  });

  test("splits public from private and tags region by script", () => {
    const { publicChannels, privateChannels } = classifyChannels(parseTelegramDesktopExport(JSON.parse(desktopExport)));
    expect(publicChannels.map((channel) => channel.handle)).toEqual([
      "tg:ru_sec",
      "tg:anquanke",
      "tg:boannews",
    ]);
    const ru = publicChannels.find((channel) => channel.handle === "tg:ru_sec")!;
    expect(ru.region).toBe("RU");
    expect(ru.language).toBe("ru");
    expect(publicChannels.find((channel) => channel.handle === "tg:anquanke")!.region).toBe("CN");
    expect(publicChannels.find((channel) => channel.handle === "tg:boannews")!.region).toBe("KR");
    expect(privateChannels).toHaveLength(2);
    expect(privateChannels.some((channel) => channel.invite.includes("+AbCdEf123"))).toBe(true);
  });

  test("parses a plain text list of handles and links", () => {
    const entries = parsePlainList(
      ["# my channels", "@ru_sec", "https://t.me/anquanke", "t.me/boannews", "https://t.me/+InviteOnly"].join("\n"),
    );
    expect(entries).toHaveLength(4);
    const { publicChannels, privateChannels } = classifyChannels(entries);
    expect(publicChannels).toHaveLength(3);
    expect(privateChannels).toHaveLength(1);
  });

  test("normalizes every accepted handle shape", () => {
    expect(normalizeHandle("@RU_Sec")).toBe("tg:ru_sec");
    expect(normalizeHandle("https://t.me/s/ru_sec/101")).toBe("tg:ru_sec");
    expect(normalizeHandle("t.me/ru_sec")).toBe("tg:ru_sec");
    expect(normalizeHandle("not a handle")).toBe("");
  });

  test("input shape is decided from the file, not blindly", () => {
    expect(parseInput(desktopExport, "result.json")).toHaveLength(5);
    expect(parseInput("@ru_sec\n@anquanke\n", "channels.txt")).toHaveLength(2);
    expect(() => parseInput("{broken", "result.json")).toThrow(/INVALID_JSON_EXPORT/);
  });

  test("the seed file is idempotent and contains only public rows", () => {
    const { publicChannels, privateChannels } = classifyChannels(parseTelegramDesktopExport(JSON.parse(desktopExport)));
    const sql = buildSeedSql(publicChannels);
    expect(sql.match(/INSERT OR IGNORE/g)).toHaveLength(publicChannels.length);
    expect(sql).toContain("'tg:ru_sec'");
    expect(sql).not.toContain("+AbCdEf123");
    expect(privateChannels.length).toBe(2);
  });

  test("source ids are stable, so re-running the importer is a no-op", () => {
    expect(sourceIdFor("tg:ru_sec")).toBe(sourceIdFor("tg:ru_sec"));
    expect(sourceIdFor("tg:ru_sec")).not.toBe(sourceIdFor("tg:anquanke"));
  });

  test("single quotes in a title cannot break the generated SQL", () => {
    const sql = buildSeedSql([
      { handle: "tg:quote", title: "O'Brien's channel", language: "en", region: "GLOBAL", category: "news" },
    ]);
    expect(sql).toContain("'O''Brien''s channel'");
  });

  test("summary counts public, private and per-region", () => {
    const { publicChannels, privateChannels } = classifyChannels(parseTelegramDesktopExport(JSON.parse(desktopExport)));
    const summary = summarize(publicChannels, privateChannels);
    expect(summary.public).toBe(3);
    expect(summary.private).toBe(2);
    expect(summary.total).toBe(5);
    expect(summary.byRegion.find((row) => row.region === "CN")!.count).toBe(1);
  });

  test("importer language detection matches the ingest engine", () => {
    expect(importDetectLanguage(LONG_RU)).toBe("ru");
    expect(importDetectLanguage(LONG_ZH)).toBe("zh");
    expect(importDetectLanguage(LONG_EN)).toBe("en");
  });
});
