import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = join(import.meta.dir, "..");
const read = (path: string) => readFileSync(join(root, path), "utf8");

import {
  TELEGRAM_WIRE_CRON,
  TELEGRAM_WIRE_SLOTS,
  isAuthoritativePulseTick,
  isBreakingP0,
  isIocIngestTick,
  isTelegramQuietHours,
  resolveTelegramWireSlot,
  utcMinuteOfDay,
  withBreakingPrefix,
} from "../workers/ingest/src/telegramSlots";
import {
  clampTelegramCaption,
  defangIndicator,
  formatIocTelegramDispatch,
  formatPulseTelegramDispatch,
} from "../packages/intelligence/src/syndication/telegramWire";
import { validateTelegramDispatch } from "../packages/intelligence/src/syndication/telegramFormatter";
import { sendTelegramPhoto, runTelegramWireSlot } from "../workers/ingest/src/telegramWireSlot";
import { isIocIngestSlot } from "../workers/ingest/src/detectionRules";
import { encodePng, measureText, paintCard, renderOgCardPng, ogCardResponse, OG_CACHE_CONTROL } from "../apps/web/app/lib/ogCard";

const at = (iso: string) => new Date(iso);

/* ───────────────────────────── 10-slot router ───────────────────────────── */

describe("10-slot EU/US business-hours wire", () => {
  test("all ten slots exist on the single cron grid, 08:00–20:00 UTC", () => {
    const expected = ["08:00", "09:20", "10:40", "12:00", "13:20", "14:40", "16:00", "17:20", "18:40", "20:00"];
    expect(TELEGRAM_WIRE_SLOTS.map((slot) => slot.utc)).toEqual(expected);
    for (const slot of TELEGRAM_WIRE_SLOTS) {
      const minute = slot.minuteOfDay % 60;
      // The cron fires at :00, :20 and :40 only.
      expect([0, 20, 40]).toContain(minute);
      expect(slot.minuteOfDay).toBeGreaterThanOrEqual(8 * 60);
      expect(slot.minuteOfDay).toBeLessThanOrEqual(20 * 60);
    }
    expect(TELEGRAM_WIRE_CRON).toBe("0,20,40 * * * *");
  });

  test("slot kinds and the four visual cards match the editorial calendar", () => {
    const kinds = TELEGRAM_WIRE_SLOTS.map((slot) => `${slot.utc}:${slot.kind}:${slot.visual ? "photo" : "text"}`);
    expect(kinds).toEqual([
      "08:00:cve:photo",
      "09:20:malware:text",
      "10:40:cve:text",
      "12:00:ioc:photo",
      "13:20:cve:text",
      "14:40:radar:photo",
      "16:00:cve:text",
      "17:20:malware:text",
      "18:40:ioc:text",
      "20:00:cve:photo",
    ]);
  });

  test("each slot resolves only at its own UTC minute", () => {
    for (const slot of TELEGRAM_WIRE_SLOTS) {
      const [hour, minute] = slot.utc.split(":").map(Number);
      const matched = resolveTelegramWireSlot(at(`2026-11-25T${slot.utc}:00Z`));
      expect(matched?.utc).toBe(slot.utc);
      expect(matched?.minuteOfDay).toBe(utcMinuteOfDay(new Date(Date.UTC(2026, 10, 25, hour, minute))));
      // One minute later is not that slot.
      const shifted = new Date(Date.UTC(2026, 10, 25, hour, minute + 1));
      expect(resolveTelegramWireSlot(shifted)?.utc).not.toBe(slot.utc);
    }
    expect(resolveTelegramWireSlot(at("2026-11-25T11:00:00Z"))).toBeNull();
  });

  test("quiet hours cover 20:01 → 07:59 only", () => {
    expect(isTelegramQuietHours(at("2026-11-25T20:00:00Z"))).toBe(false);
    expect(isTelegramQuietHours(at("2026-11-25T20:01:00Z"))).toBe(true);
    expect(isTelegramQuietHours(at("2026-11-25T03:20:00Z"))).toBe(true);
    expect(isTelegramQuietHours(at("2026-11-25T07:59:00Z"))).toBe(true);
    expect(isTelegramQuietHours(at("2026-11-25T08:00:00Z"))).toBe(false);
  });

  test("P0 override: CISA KEV always breaks, P0 needs EPSS ≥ 70%", () => {
    expect(isBreakingP0({ kevNewlyFlagged: true })).toBe(true);
    expect(isBreakingP0({ kevNewlyFlagged: false, priority: "P0", epssScore: 0.71 })).toBe(true);
    expect(isBreakingP0({ priority: "P0", epssScore: 71 })).toBe(true);
    expect(isBreakingP0({ priority: "P0", epssScore: 0.69 })).toBe(false);
    expect(isBreakingP0({ priority: "P1", epssScore: 0.99 })).toBe(false);
    expect(isBreakingP0({ priority: null, epssScore: null })).toBe(false);
    expect(withBreakingPrefix("<b>x</b>").startsWith("<b>[BREAKING P0]</b>")).toBe(true);
  });

  test("IOC ingest is staggered to :20 and never collides with a wire slot", () => {
    expect(isIocIngestSlot(at("2026-11-25T00:20:00Z"), 8)).toBe(true);
    expect(isIocIngestSlot(at("2026-11-25T08:20:00Z"), 8)).toBe(true);
    expect(isIocIngestSlot(at("2026-11-25T16:20:00Z"), 8)).toBe(true);
    expect(isIocIngestSlot(at("2026-11-25T08:00:00Z"), 8)).toBe(false);
    expect(isIocIngestSlot(at("2026-11-25T12:00:00Z"), 8)).toBe(false);
    expect(isIocIngestSlot(at("2026-11-25T04:20:00Z"), 8)).toBe(false);
    // The same guard exists in the slot module and agrees with detectionRules.
    expect(isIocIngestTick(at("2026-11-25T08:20:00Z"), 8)).toBe(true);
    expect(isIocIngestTick(at("2026-11-25T08:00:00Z"), 8)).toBe(false);
    // Collision proof: no IOC tick minute is a Telegram slot minute.
    const slotMinutes = new Set(TELEGRAM_WIRE_SLOTS.map((slot) => slot.minuteOfDay));
    for (const hour of [0, 8, 16]) {
      expect(slotMinutes.has(hour * 60 + 20)).toBe(false);
      // 00:20 is inside quiet hours; 08:20 and 16:20 are business hours.
      expect(isTelegramQuietHours(new Date(Date.UTC(2026, 10, 25, hour, 20)))).toBe(hour === 0);
    }
  });

  test("the heavy pulse keeps its 4-hourly cadence on the :00 ticks", () => {
    expect(isAuthoritativePulseTick(at("2026-11-25T08:00:00Z"))).toBe(true);
    expect(isAuthoritativePulseTick(at("2026-11-25T08:20:00Z"))).toBe(false);
    expect(isAuthoritativePulseTick(at("2026-11-25T09:00:00Z"))).toBe(false);
    expect(isAuthoritativePulseTick(at("2026-11-25T20:00:00Z"))).toBe(true);
  });
});

/* ───────────────────────── post formatting contract ──────────────────────── */

describe("institutional post formatting", () => {
  const iocPayload = formatIocTelegramDispatch({
    edition: "#1",
    activeTotal: 405,
    edlReady: 205,
    topFamily: "QakBot",
    indicators: [
      { type: "ip", value: "45.61.136.12", confidence: 95, family: "QakBot", sources: ["feodo-tracker"] },
      { type: "url", value: "http://evil.example.com/gate.php", confidence: 90, sources: ["openphish"] },
    ],
  });

  test("IOC and pulse posts pass the render gate with HTML anchors and 5+ hashtags", () => {
    expect(validateTelegramDispatch(iocPayload.html, iocPayload.hashtags)).toEqual([]);
    const pulse = formatPulseTelegramDispatch({
      pulseDate: null,
      activeTotal: 405,
      edlReady: 205,
      topFamily: "QakBot",
      confidence: 95,
      families: [{ family: "QakBot", count: 4 }],
    });
    expect(validateTelegramDispatch(pulse.html, pulse.hashtags)).toEqual([]);
    for (const payload of [iocPayload, pulse]) {
      expect(payload.hashtags.length).toBeGreaterThanOrEqual(5);
      const lowered = payload.hashtags.map((tag) => tag.toLowerCase());
      expect(lowered).toContain("#usa");
      expect(lowered).toContain("#cybersecurity");
      expect(payload.html).toContain('<a href="https://zayron-x.co/');
      // No raw URL outside an anchor attribute.
      expect(/https?:\/\//i.test(payload.html.replace(/href="[^"]*"/gi, ""))).toBe(false);
    }
  });

  test("every indicator is defanged — never a clickable hazard", () => {
    expect(defangIndicator("http://evil.example.com/a")).toBe("hxxp://evil[.]example[.]com/a");
    expect(defangIndicator("45.61.136.12")).toBe("45[.]61[.]136[.]12");
    expect(defangIndicator("1.10.16.0/20")).toBe("1[.]10[.]16[.]0/20");
    // Idempotent.
    expect(defangIndicator("hxxp://evil[.]example[.]com")).toBe("hxxp://evil[.]example[.]com");
    expect(iocPayload.html).toContain("45[.]61[.]136[.]12");
    expect(iocPayload.html).toContain("hxxp://evil[.]example[.]com/gate[.]php");
    expect(/https?:\/\/(?!zayron-x\.co)/i.test(iocPayload.html.replace(/href="[^"]*"/gi, ""))).toBe(false);
  });

  test("photo captions stay within 1024 chars with CTA and hashtags intact", () => {
    const long = [iocPayload.html, "▸ padding line ".repeat(120)].join("\n");
    const caption = clampTelegramCaption(long);
    expect(caption.length).toBeLessThanOrEqual(1024);
    expect(caption).toContain('<a href="https://zayron-x.co/');
    expect(caption).toContain("#USA");
    expect(caption).toContain("#CyberSecurity");
    // A post that already fits is returned untouched.
    expect(clampTelegramCaption(iocPayload.html)).toBe(iocPayload.html);
  });

  test("sendPhoto falls back to sendMessage when the card fails", async () => {
    const calls: string[] = [];
    const fetchFn = (async (url: string) => {
      calls.push(String(url));
      if (String(url).includes("/sendPhoto")) {
        return new Response(JSON.stringify({ ok: false, error_code: 400 }), { status: 400 });
      }
      return new Response(JSON.stringify({ ok: true, result: { message_id: 77 } }), { status: 200 });
    }) as unknown as typeof fetch;

    const sent = await sendTelegramPhoto(
      "token",
      "@zayronxai",
      "https://zayron-x.co/api/og/ioc-pulse",
      "caption",
      "<b>full post</b>",
      fetchFn,
    );
    expect(sent.ok).toBe(true);
    expect(sent.viaPhoto).toBe(false);
    expect(sent.messageId).toBe("77");
    expect(calls[0]).toContain("/sendPhoto");
    expect(calls[1]).toContain("/sendMessage");
  });
});

/* ─────────────────────────── slot dispatch (dry run) ──────────────────────── */

function fakeEnv(row: Record<string, any> | null) {
  const db = {
    prepare(sql: string) {
      const stmt = {
        bind() {
          return stmt;
        },
        async all() {
          if (sql.includes("FROM vulnerabilities")) return { results: row ? [row] : [] };
          if (sql.includes("FROM malware_reports")) return { results: [] };
          if (sql.includes("FROM iocs")) {
            return {
              results: [{ type: "ip", normalized_value: "45.61.136.12", confidence: 95, family: "QakBot", sources_json: '["feodo-tracker"]', seen_count: 4 }],
            };
          }
          if (sql.includes("GROUP BY family")) return { results: [{ family: "QakBot", count: 4 }] };
          return { results: [] };
        },
        async first() {
          if (sql.includes("COUNT(*) AS total")) return { total: 0, edl: 0 };
          if (sql.includes("radar_pulses")) return null;
          return null;
        },
        async run() {
          return { success: true };
        },
      };
      return stmt;
    },
  };
  return {
    DB: db,
    TELEGRAM_TARGET_CHANNEL: "zayronxai",
    TELEGRAM_OUTBOUND_ENABLED: "true",
    TELEGRAM_BOT_TOKEN: "token",
    TELEGRAM_MAX_DAILY_DISPATCHES: "10",
  } as any;
}

const cveRow = {
  cve_id: "CVE-2026-129830",
  severity: "CRITICAL",
  cvss_score: 9.8,
  epss_score: 0.82,
  epss_percentile: 0.99,
  is_exploited_in_wild: 0,
  kev_due_date: null,
  affected_vendor: "Acme",
  affected_product: "Gateway",
  cwe_ids_json: '["CWE-78"]',
  affected_versions_json: '["<1.4.2"]',
  ssvc_json: '{"automatable":"YES"}',
  public_poc_status: "OBSERVED",
  strategic_brief_json: JSON.stringify({
    executive_bluf: "Unauthenticated command injection in Acme Gateway. Patch to 1.4.2 immediately.",
    operational_prioritization: { priority: "P0" },
  }),
};

describe("slot dispatch", () => {
  test("08:00 renders a CVE card in dry run without any outbound request", async () => {
    const result = await runTelegramWireSlot(fakeEnv(cveRow), {
      when: at("2026-11-25T08:00:00Z"),
      dryRun: true,
    });
    expect(result.status).toBe("DRY_RUN");
    expect(result.kind).toBe("cve");
    expect(result.visual).toBe(true);
    expect(result.entity_id).toBe("CVE-2026-129830");
    expect(result.html).toContain('<a href="https://zayron-x.co/intelligence/vulnerabilities/CVE-2026-129830"');
  });

  test("12:00 renders the defanged IOC brief; 09:20 falls back to a CVE", async () => {
    const ioc = await runTelegramWireSlot(fakeEnv(cveRow), { when: at("2026-11-25T12:00:00Z"), dryRun: true });
    expect(ioc.kind).toBe("ioc");
    expect(ioc.html).toContain("45[.]61[.]136[.]12");
    expect(ioc.html).not.toContain("http://45.61.136.12");

    const fallback = await runTelegramWireSlot(fakeEnv(cveRow), { when: at("2026-11-25T09:20:00Z"), dryRun: true });
    expect(fallback.kind).toBe("malware");
    expect(fallback.errors.join(",")).toContain("FALLBACK_TO_CVE:malware");
    expect(fallback.entity_id).toBe("CVE-2026-129830");
  });

  test("quiet hours stay silent unless the CVE is a breaking P0", async () => {
    // A P1 with low EPSS is not a breaking P0: quiet hours keep it silent.
    const quietRow = {
      ...cveRow,
      epss_score: 0.12,
      strategic_brief_json: JSON.stringify({
        executive_bluf: "Routine advisory.",
        operational_prioritization: { priority: "P1" },
      }),
    };
    const quiet = await runTelegramWireSlot(fakeEnv(quietRow), { when: at("2026-11-25T03:00:00Z"), dryRun: true });
    expect(quiet.status).toBe("SKIPPED");

    const kevRow = { ...cveRow, is_exploited_in_wild: 1 };
    const breaking = await runTelegramWireSlot(fakeEnv(kevRow), { when: at("2026-11-25T03:00:00Z"), dryRun: true });
    expect(breaking.status).toBe("DRY_RUN");
    expect(breaking.html?.startsWith("<b>[BREAKING P0]</b>")).toBe(true);
  });

  test("a tick with no slot publishes nothing at all", async () => {
    const none = await runTelegramWireSlot(fakeEnv(cveRow), { when: at("2026-11-25T11:00:00Z"), dryRun: true });
    expect(none.status).toBe("SKIPPED");
    expect(none.reason).toBe("NO_SLOT");
  });
});

/* ───────────────────────────── OG telemetry cards ────────────────────────── */

describe("programmatic edge telemetry cards", () => {
  const spec = {
    badge: "CRITICAL ADVISORY",
    title: "CVE-2026-129830",
    subtitle: "ACME / GATEWAY",
    cells: [
      { label: "PRIORITY", value: "P0" },
      { label: "CVSS", value: "9.8" },
      { label: "EPSS", value: "82.0%" },
      { label: "CISA KEV", value: "LISTED" },
    ],
  };

  test("the encoded bytes are a real 1200×630 PNG", async () => {
    const png = await renderOgCardPng(spec);
    expect([...png.slice(0, 8)]).toEqual([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    const view = new DataView(png.buffer, png.byteOffset, png.byteLength);
    expect(new TextDecoder().decode(png.slice(12, 16))).toBe("IHDR");
    expect(view.getUint32(16)).toBe(1200);
    expect(view.getUint32(20)).toBe(630);
    expect(png[24]).toBe(8); // bit depth
    expect(png[25]).toBe(2); // truecolour
    // Terminates on IEND.
    expect(new TextDecoder().decode(png.slice(png.length - 8, png.length - 4))).toBe("IEND");
  });

  test("the card paints obsidian with the orange accent bar", () => {
    const rgb = paintCard(spec);
    expect(rgb.length).toBe(1200 * 630 * 3);
    // First pixel sits under the #FF5500 accent bar.
    expect([rgb[0], rgb[1], rgb[2]]).toEqual([255, 85, 0]);
    // A pixel in the open field is matte obsidian.
    const offset = (400 * 1200 + 600) * 3;
    expect([rgb[offset], rgb[offset + 1], rgb[offset + 2]]).toEqual([5, 5, 7]);
  });

  test("text measurement is deterministic and the cache policy is a day + a week", () => {
    expect(measureText("CVE", 3)).toBe(3 * 18 - 3);
    expect(measureText("", 3)).toBe(0);
    expect(OG_CACHE_CONTROL).toBe("public, s-maxage=86400, stale-while-revalidate=604800");
  });

  test("the response is image/png with the aggressive CDN cache header", async () => {
    const response = await ogCardResponse(spec);
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("image/png");
    expect(response.headers.get("cache-control")).toBe(OG_CACHE_CONTROL);
    const bytes = new Uint8Array(await response.arrayBuffer());
    expect(bytes.length).toBeGreaterThan(1000);
    expect(bytes[0]).toBe(0x89);
  });

  test("encodePng is reusable for any canvas size", async () => {
    const tiny = await encodePng(2, 2, new Uint8Array(2 * 2 * 3).fill(9));
    expect(tiny[0]).toBe(0x89);
    const view = new DataView(tiny.buffer, tiny.byteOffset, tiny.byteLength);
    expect(view.getUint32(16)).toBe(2);
    expect(view.getUint32(20)).toBe(2);
  });
});

/* ───────────────────────────── wiring assertions ─────────────────────────── */

describe("Phase 7D wiring", () => {
  test("the three card routes and the health endpoint exist and are public", () => {
    const cveRoute = read("apps/web/app/api/og/cve/[cveId]/route.ts");
    const malwareRoute = read("apps/web/app/api/og/malware/[id]/route.ts");
    const pulseRoute = read("apps/web/app/api/og/ioc-pulse/route.ts");
    for (const route of [cveRoute, malwareRoute, pulseRoute]) {
      expect(route).toContain("ogCardResponse");
      expect(route).toContain("force-dynamic");
    }
    expect(read("workers/api/src/security.ts")).toContain('"/api/v1/health/pipeline"');
    expect(read("workers/api/src/index.ts")).toContain("path === '/api/v1/health/pipeline'");
  });

  test("CVE, malware and IOC pages advertise their dynamic og:image", () => {
    expect(read("apps/web/app/intelligence/vulnerabilities/[id]/page.tsx")).toContain("/api/og/cve/");
    expect(read("apps/web/app/malware/intelligence/reports/[id]/page.tsx")).toContain("/api/og/malware/");
    const iocs = read("apps/web/app/intelligence/iocs/page.tsx");
    expect(iocs).toContain("/api/og/ioc-pulse");
    expect(iocs).toContain('card: "summary_large_image"');
  });

  test("the scheduled tick routes through the wire, not the operator pass", () => {
    const index = read("workers/ingest/src/index.ts");
    expect(index).toContain("runTelegramWireSlot(env as any, { when: new Date() })");
    expect(index).toContain("isAuthoritativePulseTick");
    expect(read("workers/ingest/wrangler.toml")).toContain('crons = ["0,20,40 * * * *"]');
    expect(read("workers/ingest/wrangler.toml")).toContain('TELEGRAM_MAX_DAILY_DISPATCHES = "10"');
  });

  test("the status badge is mounted on /developers and /security", () => {
    expect(read("apps/web/app/developers/page.tsx")).toContain("PipelineHealthBadge");
    expect(read("apps/web/app/security/page.tsx")).toContain("statusSlot={<PipelineHealthBadge />}");
    expect(read("apps/web/app/components/PipelineHealthBadge.tsx")).toContain("PIPELINE HEALTHY");
  });
});
