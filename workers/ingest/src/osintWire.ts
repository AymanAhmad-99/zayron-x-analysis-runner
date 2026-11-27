/**
 * PHASE 10B-1 — multilingual global OSINT wire.
 *
 * The wire is a SEPARATE sensory store: public Telegram channels (`t.me/s/`),
 * GitHub security radars and regional open feeds. Nothing here can write a
 * briefing, a CVE or an authoritative fact. Every row carries an explicit trust
 * tier, and only a corroborated multi-source cluster is ever a promotion
 * candidate — a single Telegram post is never submitted to IndexNow.
 *
 * Two rules shape the whole module:
 *   1. FAIL CLOSED. No `GEMINI_API_KEY` means deterministic extraction and
 *      scoring, never a throw and never an empty row.
 *   2. BOUNDED. At most `OSINT_WIRE_MAX_SOURCES` (12) sources per cycle, one
 *      fetch each, so the shared Workers invocation budget stays intact.
 */

import { decodeEntities, parseFeed, stripTags } from "./newsIngest";

export const OSINT_WIRE_MAX_SOURCES = 12;
export const OSINT_WIRE_MAX_ITEMS_PER_SOURCE = 6;
export const OSINT_WIRE_CONVERGENCE_HOURS = 72;
export const OSINT_WIRE_ACTIVE_INTERVAL_MINS = 15;
export const OSINT_WIRE_QUIET_INTERVAL_MINS = 60;
export const OSINT_WIRE_MIN_TEXT = 80;
export const OSINT_WIRE_PROMOTION_SCORE = 80;
export const OSINT_WIRE_PROMOTION_SOURCES = 3;

/**
 * Free `:40` ticks only. 00/02/04/06/08/12/16/20:40 belong to the newsroom, PoC,
 * KEV and Radar passes, and 09/11/13/15/17/19/21/23:40 belong to email, X and
 * LinkedIn. These four are the only ticks with no other pipeline work.
 */
export const OSINT_WIRE_HOURS = [10, 14, 18, 22] as const;
export const OSINT_WIRE_MINUTE = 40;

/** Pure slot predicate; exported so the unit gate can prove zero overlap. */
export function isOsintWireSlot(
  date: Date,
  hours: readonly number[] = OSINT_WIRE_HOURS,
): boolean {
  return date.getUTCMinutes() === OSINT_WIRE_MINUTE && hours.includes(date.getUTCHours());
}

export const OSINT_REGIONS = ["RU", "CN", "IR", "KR", "GCC", "EU", "GLOBAL"] as const;
export type OsintRegion = (typeof OSINT_REGIONS)[number];

export const OSINT_LANGUAGES = ["ru", "zh", "fa", "ko", "ar", "en"] as const;
export type OsintLanguage = (typeof OSINT_LANGUAGES)[number];

export const WIRE_TRUST_TIERS = [
  "EARLY_WIRE_SIGNAL",
  "CORROBORATED_OSINT",
  "DISPUTED_RECYCLED",
] as const;
export type WireTrustTier = (typeof WIRE_TRUST_TIERS)[number];

const USER_AGENT = "ZAYRON-X-GlobalWire/1.0 (+https://zayron-x.co)";

/* ───────────────────────────── language / region ─────────────────────────── */

const PERSIAN_MARKERS = /[\u067E\u0686\u0698\u06AF\u06CC\u06A9\u06F0-\u06F9]/;

function scriptCounts(text: string) {
  let cyrillic = 0;
  let han = 0;
  let hangul = 0;
  let arabic = 0;
  let latin = 0;
  for (const char of text) {
    const code = char.codePointAt(0) ?? 0;
    if (code >= 0x0400 && code <= 0x04ff) cyrillic += 1;
    else if (code >= 0x4e00 && code <= 0x9fff) han += 1;
    else if (code >= 0xac00 && code <= 0xd7af) hangul += 1;
    else if (code >= 0x0600 && code <= 0x06ff) arabic += 1;
    else if ((code >= 0x41 && code <= 0x5a) || (code >= 0x61 && code <= 0x7a)) latin += 1;
  }
  return { cyrillic, han, hangul, arabic, latin };
}

/**
 * Deterministic script detection. No model call, no locale lookup: the dominant
 * non-Latin script wins, Arabic is disambiguated into Persian by its letters,
 * and anything dominated by Latin is English.
 */
export function detectLanguage(text: string): OsintLanguage {
  const value = String(text ?? "");
  const counts = scriptCounts(value);
  const best = Math.max(counts.cyrillic, counts.han, counts.hangul, counts.arabic);
  // A Latin majority of more than 2:1 wins, so a technical post quoting one
  // foreign word stays English while a bilingual channel title ("Русский
  // Security") is still tagged by its own script.
  if (best === 0 || counts.latin > best * 2) return "en";
  if (best === counts.cyrillic) return "ru";
  if (best === counts.han) return "zh";
  if (best === counts.hangul) return "ko";
  return PERSIAN_MARKERS.test(value) ? "fa" : "ar";
}

const REGION_LANGUAGE: Record<string, OsintRegion> = {
  ru: "RU",
  zh: "CN",
  fa: "IR",
  ko: "KR",
  ar: "GCC",
  en: "GLOBAL",
};

export function regionForLanguage(language: string): OsintRegion {
  return REGION_LANGUAGE[String(language ?? "").toLowerCase()] ?? "GLOBAL";
}

export function normalizeWireRegion(value: unknown): "ALL" | OsintRegion {
  const raw = String(value ?? "").trim().toUpperCase();
  if (raw === "ALL" || raw === "") return "ALL";
  return (OSINT_REGIONS as readonly string[]).includes(raw) ? (raw as OsintRegion) : "ALL";
}

export function normalizeWireTier(value: unknown): "ALL" | WireTrustTier {
  const raw = String(value ?? "").trim().toUpperCase();
  if (raw === "ALL" || raw === "") return "ALL";
  return (WIRE_TRUST_TIERS as readonly string[]).includes(raw) ? (raw as WireTrustTier) : "ALL";
}

/* ───────────────────────────────── defanging ─────────────────────────────── */

/**
 * Defang one indicator or URL. `http`/`https` become `hxxp`/`hxxps` and every dot
 * becomes `[.]`, so a stored wire row can never be clicked into live malware
 * infrastructure from the newsroom.
 */
export function defang(value: string): string {
  const raw = String(value ?? "").trim();
  if (!raw) return "";
  return raw
    .replace(/^http(s?):\/\//i, (_match, s: string) => `hxxp${s}://`)
    .replace(/\./g, "[.]");
}

const URL_PATTERN = /\bhttps?:\/\/[^\s<>"')\]]+/gi;
const IPV4_PATTERN = /\b(?:\d{1,3}\.){3}\d{1,3}\b/g;
const DOMAIN_PATTERN =
  /\b(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+(?:com|net|org|ru|cn|ir|kr|io|xyz|top|info|biz|onion|site|online|club|shop|app|dev|me|co|su|cc|pw|tk|ml|ga|cf|gq|example)\b/gi;

/** Defang free text: URLs, IPv4 literals and bare domains, in that order. */
export function defangText(value: string): string {
  return String(value ?? "")
    .replace(URL_PATTERN, (url) => defang(url))
    .replace(IPV4_PATTERN, (ip) => ip.replace(/\./g, "[.]"))
    .replace(DOMAIN_PATTERN, (domain) => (domain.includes("[.]") ? domain : domain.replace(/\./g, "[.]")));
}

/* ───────────────────────────── identification ────────────────────────────── */

export function extractCveIds(text: string): string[] {
  const found = new Set<string>();
  for (const match of String(text ?? "").matchAll(/\bCVE-\d{4}-\d{4,7}\b/gi)) found.add(match[0].toUpperCase());
  return [...found];
}

export function extractCnvdIds(text: string): string[] {
  const found = new Set<string>();
  for (const match of String(text ?? "").matchAll(/\bCNVD-\d{4}-\d{4,6}\b/gi)) found.add(match[0].toUpperCase());
  for (const match of String(text ?? "").matchAll(/\bCNNVD-\d{6}-\d{4,6}\b/gi)) found.add(match[0].toUpperCase());
  return [...found];
}

export function extractTechniqueIds(text: string): string[] {
  const found = new Set<string>();
  for (const match of String(text ?? "").matchAll(/\bT\d{4}(?:\.\d{3})?\b/g)) {
    const id = match[0].toUpperCase();
    if (!id.includes(".")) continue;
    found.add(id);
  }
  return [...found];
}

const BENIGN_DOMAINS = new Set([
  "t.me",
  "telegram.org",
  "github.com",
  "x.com",
  "twitter.com",
  "google.com",
  "youtube.com",
  "cisa.gov",
  "nvd.nist.gov",
  "mitre.org",
]);

/** SHA-256 / MD5 hashes, IPv4 literals and domains — every value defanged. */
export function extractIocs(text: string): string[] {
  const value = String(text ?? "");
  const found = new Set<string>();
  for (const match of value.matchAll(/\b[a-f0-9]{64}\b/gi)) found.add(match[0].toLowerCase());
  for (const match of value.matchAll(/\b[a-f0-9]{32}\b/gi)) found.add(match[0].toLowerCase());
  for (const match of value.matchAll(IPV4_PATTERN)) found.add(defang(match[0]));
  for (const match of value.matchAll(DOMAIN_PATTERN)) {
    const domain = match[0].toLowerCase();
    if (BENIGN_DOMAINS.has(domain)) continue;
    found.add(defang(domain));
  }
  return [...found].slice(0, 25);
}

const ACTOR_HINTS: Array<[RegExp, string]> = [
  [/\b(APT\s?\d{1,2})\b/gi, ""],
  [/\b(Lazarus|Kimsuky|Sandworm|Turla|FIN7|FIN11|Cl0p|Clop|LockBit|BlackCat|ALPHV|Akira|Play|Qilin|Medusa)\b/gi, ""],
  [/\b(Volt Typhoon|Salt Typhoon|Earth Lusca|Mustang Panda|SideWinder|Charming Kitten|MuddyWater)\b/gi, ""],
];

/** Named actors only — a bare CVE is never an actor. */
export function extractActors(text: string): string[] {
  const value = String(text ?? "");
  const found = new Set<string>();
  for (const [pattern] of ACTOR_HINTS) {
    for (const match of value.matchAll(pattern)) found.add(match[0].replace(/\s+/g, " ").trim());
  }
  return [...found].slice(0, 5);
}

export async function sha256Hex(value: string): Promise<string> {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

/** Dedupe key: whitespace/URL-normalized lowercase text, SHA-256. */
export function normalizeForFingerprint(text: string): string {
  return String(text ?? "")
    .toLowerCase()
    .replace(/https?:\/\/\S+/gi, (url) => url.replace(/[?#].*$/, "").replace(/\/+$/, ""))
    .replace(/[\u200b-\u200f\ufeff]/g, "")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
}

export async function contentFingerprint(text: string): Promise<string> {
  return sha256Hex(normalizeForFingerprint(text));
}

/* ────────────────────────────── Telegram HTML ────────────────────────────── */

export interface TelegramMessage {
  externalId: string;
  publishedAt: string;
  text: string;
  forwarded: boolean;
  links: string[];
}

/**
 * Zero-dependency parser for the public `t.me/s/<channel>` widget.
 *
 * Each message is a `tgme_widget_message` block carrying `data-post`, an ISO
 * `<time datetime>` and the message text. Telegram's widget markup is stable and
 * server-rendered, so no model, DOM or JS runtime is involved.
 */
export function parseTelegramChannelHtml(html: string, handle: string): TelegramMessage[] {
  const body = String(html ?? "");
  const starts = [...body.matchAll(/data-post="([^"]+)"/g)];
  const messages: TelegramMessage[] = [];
  for (let index = 0; index < starts.length; index += 1) {
    const match = starts[index];
    const start = match.index ?? 0;
    const end = index + 1 < starts.length ? starts[index + 1].index ?? body.length : body.length;
    const block = body.slice(start, end);
    const postRef = String(match[1] ?? "");
    const externalId = postRef.includes("/") ? postRef.split("/").pop() ?? "" : postRef;
    if (!externalId) continue;
    const timeMatch = block.match(/<time[^>]*datetime="([^"]+)"/i);
    const bodyMatch = block.match(
      /<div[^>]*class="[^"]*tgme_widget_message_text[^"]*"[^>]*>([\s\S]*?)<\/div>/i,
    );
    const text = bodyMatch ? stripTags(bodyMatch[1]) : "";
    if (!text) continue;
    const links = [...block.matchAll(/href="(https?:\/\/[^"]+)"/gi)]
      .map((entry) => decodeEntities(entry[1]))
      .filter((link) => !/^https?:\/\/(t\.me|telegram\.org)\//i.test(link));
    const published = timeMatch ? new Date(timeMatch[1]) : new Date(0);
    messages.push({
      externalId,
      publishedAt: Number.isFinite(published.getTime()) && published.getTime() > 0
        ? published.toISOString()
        : new Date().toISOString(),
      text: text.slice(0, 4000),
      forwarded: /tgme_widget_message_forwarded_from/i.test(block),
      links: [...new Set(links)].slice(0, 8),
    });
    if (messages.length >= 40) break;
  }
  return messages;
}

/* ──────────────────────────────── noise ──────────────────────────────────── */

const PROMO_PATTERN =
  /(subscribe|subscrib|подпис|подпиш|реклам|广告|推广|تبلیغ|구독|join (?:us|our)|promo code|giveaway|airdrop|casino|betting|onlyfans|crypto signal)/i;

export function isWireNoise(text: string): boolean {
  const value = String(text ?? "").trim();
  if (value.length < OSINT_WIRE_MIN_TEXT) return true;
  if (!/[\p{L}\p{N}]/u.test(value)) return true;
  const promoHits = (value.match(PROMO_PATTERN) ?? []).length;
  const hasEntity =
    extractCveIds(value).length > 0 ||
    extractCnvdIds(value).length > 0 ||
    extractTechniqueIds(value).length > 0 ||
    extractIocs(value).length > 0;
  if (promoHits > 0 && !hasEntity) return true;
  if (value.length < 140 && promoHits > 1) return true;
  return false;
}

/* ──────────────────────────────── scoring ────────────────────────────────── */

export interface WireSignalFacts {
  text: string;
  region: string;
  language: string;
  credibility: number;
  forwarded: boolean;
  now?: Date;
}

/**
 * Deterministic 0–100 relevance score. Identifiers dominate, corroborating
 * language helps, promotion and staler-than-72h posts cost points. Never throws.
 */
export function scoreSignal(facts: WireSignalFacts): number {
  const text = String(facts.text ?? "");
  let score = 20;
  if (extractCveIds(text).length > 0) score += 25;
  if (extractCnvdIds(text).length > 0) score += 22;
  if (extractTechniqueIds(text).length > 0) score += 8;
  if (extractIocs(text).length > 0) score += 10;
  if (extractActors(text).length > 0) score += 8;
  if (/\b(exploit(?:ed|ation)?|in the wild|zero-day|0-day|ransomware|actively exploited)\b/i.test(text)) score += 8;
  if (/\b(kev|known exploited)\b/i.test(text)) score += 6;
  if (text.length >= 240) score += 4;
  if (facts.forwarded) score -= 4;
  if (PROMO_PATTERN.test(text)) score -= 12;
  const credibility = Number(facts.credibility);
  if (Number.isFinite(credibility)) score += Math.round((credibility - 50) / 10);
  return Math.max(0, Math.min(100, score));
}

export interface TrustInput {
  sourceCount: number;
  regions: string[];
  linkedCve: boolean;
  forwarded?: boolean;
  entityCount?: number;
  credibility?: number;
}

/**
 * THE PROVENANCE FIREWALL. Only independent corroboration upgrades a signal:
 *   - ≥ 3 independent sources                 → CORROBORATED_OSINT
 *   - ≥ 2 distinct regions AND a linked CVE   → CORROBORATED_OSINT
 *   - a bare forward with nothing extracted   → DISPUTED_RECYCLED
 *   - everything else                         → EARLY_WIRE_SIGNAL
 */
export function computeTrustTier(input: TrustInput): WireTrustTier {
  const sources = Math.max(0, Number(input.sourceCount) || 0);
  const regions = new Set((input.regions ?? []).map((region) => String(region).toUpperCase()));
  if (sources >= OSINT_WIRE_PROMOTION_SOURCES) return "CORROBORATED_OSINT";
  if (regions.size >= 2 && input.linkedCve) return "CORROBORATED_OSINT";
  const unspecified =
    input.forwarded === true &&
    (input.entityCount ?? 0) === 0 &&
    Number(input.credibility ?? 50) < 40;
  if (unspecified) return "DISPUTED_RECYCLED";
  return "EARLY_WIRE_SIGNAL";
}

/** Convergence 0–100: independent sources, regions, linked CVEs and score. */
export function convergenceScore(input: {
  sourceCount: number;
  regionCount: number;
  cveCount: number;
  averageSignalScore: number;
}): number {
  const raw =
    Math.min(45, Math.max(0, input.sourceCount) * 12) +
    Math.min(25, Math.max(0, input.regionCount) * 8) +
    Math.min(15, Math.max(0, input.cveCount) * 5) +
    Math.round(Math.max(0, Math.min(100, input.averageSignalScore)) * 0.15);
  return Math.max(0, Math.min(100, raw));
}

/** Only a corroborated, high-convergence cluster is an IndexNow candidate. */
export function isPromotionCandidate(input: {
  trustTier: string;
  sourceCount: number;
  signalScore: number;
}): boolean {
  return (
    input.trustTier === "CORROBORATED_OSINT" &&
    input.sourceCount >= OSINT_WIRE_PROMOTION_SOURCES &&
    input.signalScore >= OSINT_WIRE_PROMOTION_SCORE
  );
}

/** Cluster key from the strongest shared identifier, or `null` for noise. */
export function clusterKeyFor(input: {
  cves: string[];
  cnvd: string[];
  techniques: string[];
  actors: string[];
  iocs: string[];
}): string | null {
  if (input.cves.length > 0) return `cve:${input.cves[0]}`;
  if (input.cnvd.length > 0) return `cnvd:${input.cnvd[0]}`;
  if (input.actors.length > 0) return `actor:${input.actors[0].toLowerCase().replace(/\s+/g, "-")}`;
  if (input.techniques.length > 0) return `ttp:${input.techniques[0]}`;
  if (input.iocs.length > 0) return `ioc:${input.iocs[0]}`;
  return null;
}

/** Adaptive cadence: a productive source polls faster, a quiet one backs off. */
export function nextPollInterval(current: number, newSignals: number): number {
  const base = Math.max(5, Math.floor(Number(current) || OSINT_WIRE_QUIET_INTERVAL_MINS));
  if (newSignals > 0) return OSINT_WIRE_ACTIVE_INTERVAL_MINS;
  return Math.min(OSINT_WIRE_QUIET_INTERVAL_MINS, base + 15);
}

export function nextCursor(previous: string | null, externalIds: string[]): string | null {
  const numeric = externalIds.map((id) => Number(id)).filter((value) => Number.isFinite(value));
  if (numeric.length === 0) return previous;
  const max = Math.max(...numeric, Number(previous ?? 0) || 0);
  return String(max);
}

/* ─────────────────────────── deterministic summary ───────────────────────── */

/**
 * Fail-closed "translation". With no model credential we do not invent an
 * English article: we emit a neutral, source-attributed line built only from the
 * identifiers the text actually contains.
 */
export function deterministicSummary(text: string, language: string, region: string): {
  title: string;
  summary: string;
} {
  const clean = String(text ?? "").replace(/\s+/g, " ").trim();
  const cves = extractCveIds(clean);
  const cnvd = extractCnvdIds(clean);
  const actors = extractActors(clean);
  const iocs = extractIocs(clean);
  const languageLabel = String(language ?? "en").toUpperCase();
  const subject =
    cves.length > 0
      ? cves.slice(0, 2).join(", ")
      : cnvd.length > 0
        ? cnvd.slice(0, 2).join(", ")
        : actors.length > 0
          ? actors.slice(0, 2).join(", ")
          : iocs.length > 0
            ? "a technical indicator set"
            : "an unclassified security report";
  const title = `${region} wire: ${subject}`.slice(0, 140);
  const summary =
    `Untranslated ${languageLabel} source reporting on ${subject}. ` +
    `Deterministic extraction only: no machine translation was applied because no translation credential is bound. ` +
    `Original excerpt retained for analyst review.`;
  return { title, summary: summary.slice(0, 600) };
}

const GEMINI_ENDPOINT = "https://generativelanguage.googleapis.com/v1beta/models";

/**
 * Batched translation (`<= 10` items per call). Returns `null` on ANY problem —
 * missing key, HTTP error, malformed JSON — so the caller falls back instead of
 * throwing into the cron.
 */
export async function translateBatch(
  items: Array<{ index: number; text: string; language: string }>,
  options: { apiKey?: string; model?: string; fetchImpl?: typeof fetch } = {},
): Promise<Map<number, { title: string; summary: string; relevance: number }> | null> {
  const key = String(options.apiKey ?? "").trim();
  if (!key || items.length === 0) return null;
  const model = String(options.model ?? "gemini-2.0-flash").trim() || "gemini-2.0-flash";
  const fetchImpl = options.fetchImpl ?? fetch;
  const payload = {
    contents: [
      {
        role: "user",
        parts: [
          {
            text:
              "You are ZAYRON-X's multilingual OSINT translation layer. Translate each item into crisp, neutral, " +
              "analyst-grade English. Never translate CVE/CNVD/MITRE identifiers, hashes, domains or IPs. " +
              "Do not add facts that are not in the source. Return ONLY a JSON array of objects " +
              '{"index":number,"title":string,"summary":string,"relevance":0-100}.\n\n' +
              JSON.stringify(items.slice(0, 10).map((item) => ({ index: item.index, language: item.language, text: item.text.slice(0, 1200) }))),
          },
        ],
      },
    ],
    generationConfig: { temperature: 0.1, maxOutputTokens: 1600, responseMimeType: "application/json" },
  };
  try {
    const response = await fetchImpl(`${GEMINI_ENDPOINT}/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(key)}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(12000),
    });
    if (!response.ok) return null;
    const data: any = await response.json();
    const text = String(data?.candidates?.[0]?.content?.parts?.[0]?.text ?? "");
    const parsed = JSON.parse(text.slice(text.indexOf("["), text.lastIndexOf("]") + 1));
    if (!Array.isArray(parsed)) return null;
    const out = new Map<number, { title: string; summary: string; relevance: number }>();
    for (const entry of parsed) {
      const index = Number(entry?.index);
      const title = String(entry?.title ?? "").trim();
      const summary = String(entry?.summary ?? "").trim();
      if (!Number.isFinite(index) || !title || !summary) continue;
      // An English-only gate: a "translation" that is still mostly Cyrillic or
      // Han is rejected rather than stored as English.
      if (detectLanguage(`${title} ${summary}`) !== "en") continue;
      out.set(index, {
        title: title.slice(0, 180),
        summary: summary.slice(0, 700),
        relevance: Math.max(0, Math.min(100, Number(entry?.relevance) || 0)),
      });
    }
    return out.size > 0 ? out : null;
  } catch {
    return null;
  }
}

/* ──────────────────────────────── fetch ──────────────────────────────────── */

export interface OsintSourceRow {
  id: string;
  handle: string;
  source_type: string;
  title: string;
  region: string;
  language: string;
  category: string;
  credibility_score: number;
  poll_interval_mins: number;
  last_cursor: string | null;
}

export function sourceUrlFor(handle: string): string {
  const value = String(handle ?? "").trim();
  if (value.startsWith("tg:")) return `https://t.me/s/${encodeURIComponent(value.slice(3))}`;
  if (value.startsWith("rss:")) return value.slice(4);
  if (value.startsWith("gh:")) {
    const repo = value.slice(3).replace(/^\/+/, "");
    return `https://github.com/${repo}/releases.atom`;
  }
  return value;
}

export function publicSourceUrl(handle: string): string {
  const value = String(handle ?? "").trim();
  if (value.startsWith("tg:")) return `https://t.me/${value.slice(3)}`;
  if (value.startsWith("rss:")) return value.slice(4);
  if (value.startsWith("gh:")) return `https://github.com/${value.slice(3)}`;
  return value;
}

/* ─────────────────────────────── ingest pass ─────────────────────────────── */

export interface OsintWireEnv {
  DB: D1Database;
  GEMINI_API_KEY?: string;
  GEMINI_MODEL?: string;
  STRATEGIC_OPERATOR_TOKEN?: string;
  CTI_OPERATOR_TOKEN?: string;
  OSINT_WIRE_SIGNING_SECRET?: string;
  ENVIRONMENT?: string;
}

export interface OsintWireOptions {
  now?: Date;
  maxSources?: number;
  fetchImpl?: typeof fetch;
  generate?: boolean;
}

export interface OsintWireResult {
  status: "OK" | "DEGRADED" | "SKIPPED";
  sources_polled: number;
  signals_ingested: number;
  signals_skipped: number;
  clusters_updated: number;
  corroborated: number;
  translation: "GEMINI" | "DETERMINISTIC";
  sources: Array<{ handle: string; status: number | string; items: number }>;
  errors: string[];
}

async function all<T>(db: D1Database, sql: string, params: unknown[] = []): Promise<T[]> {
  const statement = db.prepare(sql);
  const bound = params.length > 0 ? statement.bind(...params) : statement;
  const result = await bound.all<T>();
  const rows = (result as any)?.results;
  return Array.isArray(rows) ? (rows as T[]) : [];
}

function jsonArray(value: unknown): string[] {
  if (typeof value !== "string" || !value.trim()) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    return [];
  }
}

interface WireCandidate {
  externalId: string;
  publishedAt: string;
  text: string;
  forwarded: boolean;
  url: string;
}

/**
 * ONE bounded ingest cycle: `<= 12` sources, one fetch each, no unbounded loops.
 * A failing source is recorded and skipped — it can never abort the cycle.
 */
export async function runOsintWirePass(
  env: OsintWireEnv,
  options: OsintWireOptions = {},
): Promise<OsintWireResult> {
  const now = options.now ?? new Date();
  const fetchImpl = options.fetchImpl ?? fetch;
  const maxSources = Math.max(1, Math.min(options.maxSources ?? OSINT_WIRE_MAX_SOURCES, OSINT_WIRE_MAX_SOURCES));
  const errors: string[] = [];
  const sourceResults: Array<{ handle: string; status: number | string; items: number }> = [];
  const translation = options.generate === false
    ? "DETERMINISTIC"
    : String(env.GEMINI_API_KEY ?? "").trim()
      ? "GEMINI"
      : "DETERMINISTIC";

  let sources: OsintSourceRow[] = [];
  try {
    sources = await all<OsintSourceRow>(
      env.DB,
      `SELECT id, handle, source_type, title, region, language, category, credibility_score,
              poll_interval_mins, last_cursor
         FROM osint_sources
        WHERE enabled = 1
          AND (last_polled_at IS NULL
               OR last_polled_at <= datetime('now', '-' || poll_interval_mins || ' minutes'))
        ORDER BY COALESCE(last_polled_at, '1970-01-01') ASC
        LIMIT ?`,
      [maxSources],
    );
  } catch (error) {
    errors.push(`SOURCE_READ_FAILED:${String((error as Error)?.message ?? error).slice(0, 120)}`);
    return {
      status: "DEGRADED",
      sources_polled: 0,
      signals_ingested: 0,
      signals_skipped: 0,
      clusters_updated: 0,
      corroborated: 0,
      translation,
      sources: [],
      errors,
    };
  }

  // Defence in depth: never trust the database to honour LIMIT for the
  // subrequest ceiling this cycle depends on.
  sources = sources.slice(0, maxSources);

  if (sources.length === 0) {
    return {
      status: "SKIPPED",
      sources_polled: 0,
      signals_ingested: 0,
      signals_skipped: 0,
      clusters_updated: 0,
      corroborated: 0,
      translation,
      sources: [],
      errors,
    };
  }

  const candidates: Array<{ source: OsintSourceRow; item: WireCandidate }> = [];

  for (const source of sources.slice(0, maxSources)) {
    const target = sourceUrlFor(source.handle);
    try {
      const response = await fetchImpl(target, {
        headers: {
          "user-agent": USER_AGENT,
          accept: source.source_type === "telegram_public"
            ? "text/html,application/xhtml+xml"
            : "application/atom+xml, application/rss+xml, application/xml, text/xml",
        },
        signal: AbortSignal.timeout(8000),
      });
      if (!response.ok) {
        sourceResults.push({ handle: source.handle, status: response.status, items: 0 });
        errors.push(`SOURCE_${response.status}:${source.handle}`);
        continue;
      }
      const body = await response.text();
      let items: WireCandidate[] = [];
      if (source.source_type === "telegram_public") {
        const parsed = parseTelegramChannelHtml(body, source.handle);
        const cursor = Number(source.last_cursor ?? 0) || 0;
        items = parsed
          .filter((message) => (Number(message.externalId) || 0) > cursor)
          .map((message) => ({
            externalId: message.externalId,
            publishedAt: message.publishedAt,
            text: message.text,
            forwarded: message.forwarded,
            url: `https://t.me/${source.handle.replace(/^tg:/, "")}/${message.externalId}`,
          }));
      } else {
        const feedItems = parseFeed(body, source.title);
        items = feedItems.slice(0, OSINT_WIRE_MAX_ITEMS_PER_SOURCE).map((item) => ({
          externalId: item.link.slice(0, 300),
          publishedAt: item.publishedAt,
          text: `${item.title}. ${item.description}`.slice(0, 4000),
          forwarded: false,
          url: item.link,
        }));
      }
      sourceResults.push({ handle: source.handle, status: response.status, items: items.length });
      for (const item of items.slice(0, OSINT_WIRE_MAX_ITEMS_PER_SOURCE)) candidates.push({ source, item });
    } catch (error) {
      sourceResults.push({ handle: source.handle, status: "ERROR", items: 0 });
      errors.push(`SOURCE_ERROR:${source.handle}:${String((error as Error)?.message ?? error).slice(0, 90)}`);
    }
  }

  // Filter noise BEFORE spending a translation call.
  const usable = candidates.filter((entry) => !isWireNoise(entry.item.text));

  // One batched translation call, only for non-English text, `<= 10` items.
  const translations = new Map<number, { title: string; summary: string; relevance: number }>();
  if (translation === "GEMINI") {
    const pending = usable
      .map((entry, index) => ({ entry, index, language: detectLanguage(entry.item.text) }))
      .filter((row) => row.language !== "en")
      .slice(0, 10);
    if (pending.length > 0) {
      const result = await translateBatch(
        pending.map((row) => ({ index: row.index, text: row.entry.item.text, language: row.language })),
        { apiKey: env.GEMINI_API_KEY, model: env.GEMINI_MODEL, fetchImpl },
      );
      if (result) for (const [index, value] of result) translations.set(index, value);
      else errors.push("TRANSLATION_FALLBACK:DETERMINISTIC");
    }
  }

  let ingested = 0;
  let skipped = 0;
  let clustersUpdated = 0;
  let corroborated = 0;
  const cursorBySource = new Map<string, string[]>();
  const newBySource = new Map<string, number>();

  for (let index = 0; index < usable.length; index += 1) {
    const { source, item } = usable[index];
    const language = detectLanguage(item.text);
    const cves = extractCveIds(item.text).slice(0, 8);
    const cnvd = extractCnvdIds(item.text).slice(0, 8);
    const techniques = extractTechniqueIds(item.text).slice(0, 6);
    const actors = extractActors(item.text).slice(0, 5);
    const iocs = extractIocs(item.text).slice(0, 25);
    const translated = translations.get(index);
    const fallback = deterministicSummary(item.text, language, source.region);
    const title = translated?.title || fallback.title;
    const summary = translated?.summary || fallback.summary;
    const signalScore = Math.max(
      scoreSignal({
        text: item.text,
        region: source.region,
        language,
        credibility: source.credibility_score,
        forwarded: item.forwarded,
        now,
      }),
      translated?.relevance ?? 0,
    );
    const key = clusterKeyFor({ cves, cnvd, techniques, actors, iocs });
    const fingerprint = await contentFingerprint(item.text);
    const id = `ows_${fingerprint.slice(0, 24)}`;

    // Cluster resolution. A cluster row exists only for identifier-bearing
    // signals, so the read surface never shows an empty "cluster".
    let clusterId: string | null = null;
    let trustTier: WireTrustTier = computeTrustTier({
      sourceCount: 1,
      regions: [source.region],
      linkedCve: cves.length > 0,
      forwarded: item.forwarded,
      entityCount: cves.length + cnvd.length + techniques.length + iocs.length,
      credibility: source.credibility_score,
    });
    if (key) {
      try {
        const existing = await all<{
          id: string;
          source_count: number;
          regions_json: string;
          linked_cves_json: string;
        }>(env.DB, `SELECT id, source_count, regions_json, linked_cves_json FROM osint_clusters WHERE cluster_key = ? LIMIT 1`, [key]);
        const regions = new Set(jsonArray(existing[0]?.regions_json));
        regions.add(source.region);
        const linkedCves = new Set([...jsonArray(existing[0]?.linked_cves_json), ...cves]);
        const distinctSources = (await all<{ n: number }>(
          env.DB,
          `SELECT COUNT(DISTINCT source_id) AS n FROM osint_wire_signals WHERE cluster_id = ?`,
          [existing[0]?.id ?? ""],
        ))[0]?.n ?? 0;
        const sourceCount = Math.max(1, Number(distinctSources) + 1);
        trustTier = computeTrustTier({
          sourceCount,
          regions: [...regions],
          linkedCve: linkedCves.size > 0,
          forwarded: item.forwarded,
          entityCount: cves.length + cnvd.length + techniques.length + iocs.length,
          credibility: source.credibility_score,
        });
        const score = convergenceScore({
          sourceCount,
          regionCount: regions.size,
          cveCount: linkedCves.size,
          averageSignalScore: signalScore,
        });
        clusterId = existing[0]?.id ?? `osc_${(await sha256Hex(key)).slice(0, 20)}`;
        if (clusterId) {
          await env.DB.prepare(
            `INSERT INTO osint_clusters
               (id, cluster_key, headline, regions_json, source_count, linked_cves_json, convergence_score, trust_tier, first_seen_at, last_seen_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
             ON CONFLICT(cluster_key) DO UPDATE SET
               headline = CASE WHEN excluded.source_count > osint_clusters.source_count THEN excluded.headline ELSE osint_clusters.headline END,
               regions_json = excluded.regions_json,
               source_count = excluded.source_count,
               linked_cves_json = excluded.linked_cves_json,
               convergence_score = excluded.convergence_score,
               trust_tier = excluded.trust_tier,
               last_seen_at = datetime('now')`,
          )
            .bind(
              clusterId,
              key,
              title.slice(0, 200),
              JSON.stringify([...regions]),
              sourceCount,
              JSON.stringify([...linkedCves]),
              score,
              trustTier,
            )
            .run();
          clustersUpdated += 1;
        }
      } catch (error) {
        errors.push(`CLUSTER_FAILED:${key}:${String((error as Error)?.message ?? error).slice(0, 90)}`);
        clusterId = null;
      }
    }
    if (trustTier === "CORROBORATED_OSINT") corroborated += 1;

    try {
      const statement = env.DB.prepare(
        `INSERT OR IGNORE INTO osint_wire_signals
           (id, source_id, external_id, content_fingerprint, original_lang, region, original_excerpt,
            translated_title, translated_summary, trust_tier, signal_score, extracted_cves, extracted_iocs,
            extracted_actors, cluster_id, source_url, published_at, ingested_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`,
      ).bind(
        id,
        source.id,
        item.externalId,
        fingerprint,
        language,
        source.region,
        defangText(item.text).slice(0, 1200),
        title,
        summary,
        trustTier,
        signalScore,
        JSON.stringify(cves),
        JSON.stringify(iocs),
        JSON.stringify(actors),
        clusterId,
        item.url,
        item.publishedAt,
      );
      const result = await statement.run();
      const changes = Number((result as any)?.meta?.changes ?? 0);
      if (changes > 0) {
        ingested += 1;
        newBySource.set(source.id, (newBySource.get(source.id) ?? 0) + 1);
        const bucket = cursorBySource.get(source.id) ?? [];
        bucket.push(item.externalId);
        cursorBySource.set(source.id, bucket);
      } else {
        skipped += 1;
      }
    } catch (error) {
      errors.push(`SIGNAL_WRITE_FAILED:${source.handle}:${String((error as Error)?.message ?? error).slice(0, 90)}`);
    }
  }

  // Adaptive cadence + cursor, one small UPDATE per polled source.
  for (const source of sources) {
    const written = newBySource.get(source.id) ?? 0;
    const interval = nextPollInterval(source.poll_interval_mins, written);
    const cursor =
      source.source_type === "telegram_public"
        ? nextCursor(source.last_cursor, cursorBySource.get(source.id) ?? [])
        : source.last_cursor;
    try {
      await env.DB.prepare(
        `UPDATE osint_sources
            SET poll_interval_mins = ?, last_cursor = ?, last_polled_at = datetime('now')
          WHERE id = ?`,
      ).bind(interval, cursor, source.id).run();
    } catch (error) {
      errors.push(`SOURCE_UPDATE_FAILED:${source.handle}:${String((error as Error)?.message ?? error).slice(0, 90)}`);
    }
  }

  return {
    status: errors.length === 0 ? "OK" : "DEGRADED",
    sources_polled: sources.length,
    signals_ingested: ingested,
    signals_skipped: skipped,
    clusters_updated: clustersUpdated,
    corroborated,
    translation,
    sources: sourceResults,
    errors,
  };
}

/* ────────────────────────────── signed webhook ───────────────────────────── */

export interface WebhookSignal {
  handle: string;
  external_id: string;
  text: string;
  published_at?: string;
  url?: string;
  forwarded?: boolean;
  region?: string;
  language?: string;
}

function constantTimeEqual(a: string, b: string): boolean {
  if (!a || !b || a.length !== b.length) return false;
  let diff = 0;
  for (let index = 0; index < a.length; index += 1) diff |= a.charCodeAt(index) ^ b.charCodeAt(index);
  return diff === 0;
}

/** Bearer operator token OR an HMAC-SHA256 signature over the raw body. */
export async function verifyOsintWebhook(
  request: Request,
  env: Pick<OsintWireEnv, "STRATEGIC_OPERATOR_TOKEN" | "CTI_OPERATOR_TOKEN" | "OSINT_WIRE_SIGNING_SECRET">,
  rawBody: string,
): Promise<boolean> {
  const bearer = (request.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "").trim();
  for (const token of [env.STRATEGIC_OPERATOR_TOKEN, env.CTI_OPERATOR_TOKEN]) {
    if (token && constantTimeEqual(bearer, String(token).trim())) return true;
  }
  const secret = String(env.OSINT_WIRE_SIGNING_SECRET ?? "").trim();
  const signature = (request.headers.get("x-zayron-signature") ?? "").replace(/^sha256=/i, "").trim();
  if (!secret || !signature) return false;
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const digest = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(rawBody));
  const expected = [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
  return constantTimeEqual(signature.toLowerCase(), expected);
}

export function parseWebhookSignals(payload: unknown): WebhookSignal[] {
  const raw = payload && typeof payload === "object" && Array.isArray((payload as any).signals)
    ? (payload as any).signals
    : [];
  const out: WebhookSignal[] = [];
  for (const entry of raw) {
    if (!entry || typeof entry !== "object") continue;
    const handle = String((entry as any).handle ?? "").trim();
    const externalId = String((entry as any).external_id ?? "").trim();
    const text = String((entry as any).text ?? "").trim();
    if (!handle || !externalId || !text) continue;
    out.push({
      handle,
      external_id: externalId.slice(0, 200),
      text: text.slice(0, 4000),
      published_at: String((entry as any).published_at ?? "").trim() || undefined,
      url: String((entry as any).url ?? "").trim() || undefined,
      forwarded: (entry as any).forwarded === true,
      region: String((entry as any).region ?? "").trim().toUpperCase() || undefined,
      language: String((entry as any).language ?? "").trim().toLowerCase() || undefined,
    });
  }
  return out;
}

/**
 * Signed off-edge receiver for the future private-channel (MTProto) collector.
 * It resolves the source by handle and writes through the SAME provenance path
 * as the public parser; an unknown handle is registered as a disabled source so
 * an authenticated collector cannot silently invent a trusted publisher.
 */
export async function ingestWebhookSignals(
  env: OsintWireEnv,
  signals: WebhookSignal[],
): Promise<{ accepted: number; rejected: number; sources: string[] }> {
  let accepted = 0;
  let rejected = 0;
  const sources = new Set<string>();
  for (const signal of signals.slice(0, 200)) {
    try {
      let source = (
        await all<OsintSourceRow>(
          env.DB,
          `SELECT id, handle, source_type, title, region, language, category, credibility_score, poll_interval_mins, last_cursor
             FROM osint_sources WHERE handle = ? LIMIT 1`,
          [signal.handle],
        )
      )[0];
      if (!source) {
        const language = signal.language ?? detectLanguage(signal.text);
        const id = `src_${(await sha256Hex(signal.handle)).slice(0, 20)}`;
        await env.DB.prepare(
          `INSERT OR IGNORE INTO osint_sources
             (id, handle, source_type, title, region, language, category, credibility_score, poll_interval_mins, enabled)
           VALUES (?, ?, 'telegram_private_webhook', ?, ?, ?, 'news', 40.0, 30, 0)`,
        )
          .bind(id, signal.handle, signal.handle, signal.region ?? regionForLanguage(language), language)
          .run();
        rejected += 1;
        continue;
      }
      const language = signal.language ?? detectLanguage(signal.text);
      const cves = extractCveIds(signal.text);
      const fingerprint = await contentFingerprint(signal.text);
      const fallback = deterministicSummary(signal.text, language, source.region);
      const trust = computeTrustTier({
        sourceCount: 1,
        regions: [source.region],
        linkedCve: cves.length > 0,
        forwarded: signal.forwarded,
        entityCount: cves.length,
        credibility: source.credibility_score,
      });
      const result = await env.DB.prepare(
        `INSERT OR IGNORE INTO osint_wire_signals
           (id, source_id, external_id, content_fingerprint, original_lang, region, original_excerpt,
            translated_title, translated_summary, trust_tier, signal_score, extracted_cves, extracted_iocs,
            extracted_actors, cluster_id, source_url, published_at, ingested_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, ?, ?, datetime('now'))`,
      )
        .bind(
          `ows_${fingerprint.slice(0, 24)}`,
          source.id,
          signal.external_id,
          fingerprint,
          language,
          signal.region ?? source.region,
          defangText(signal.text).slice(0, 1200),
          fallback.title,
          fallback.summary,
          trust,
          scoreSignal({
            text: signal.text,
            region: source.region,
            language,
            credibility: source.credibility_score,
            forwarded: signal.forwarded === true,
          }),
          JSON.stringify(cves),
          JSON.stringify(extractIocs(signal.text)),
          JSON.stringify(extractActors(signal.text)),
          signal.url ?? publicSourceUrl(source.handle),
          signal.published_at ?? new Date().toISOString(),
        )
        .run();
      if (Number((result as any)?.meta?.changes ?? 0) > 0) accepted += 1;
      else rejected += 1;
      sources.add(source.handle);
    } catch {
      rejected += 1;
    }
  }
  return { accepted, rejected, sources: [...sources] };
}

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", "cache-control": "no-store" },
  });
}

/** `POST /internal/osint-wire/ingest` — bearer or HMAC, never a public write. */
export async function handleOsintWebhook(request: Request, env: OsintWireEnv): Promise<Response> {
  if (request.method !== "POST") return json(405, { error: "METHOD_NOT_ALLOWED" });
  const rawBody = await request.text();
  if (!(await verifyOsintWebhook(request, env, rawBody))) return json(403, { error: "UNAUTHORIZED" });
  let payload: unknown;
  try {
    payload = JSON.parse(rawBody || "{}");
  } catch {
    return json(400, { error: "INVALID_JSON" });
  }
  const signals = parseWebhookSignals(payload);
  if (signals.length === 0) return json(400, { error: "NO_SIGNALS" });
  const result = await ingestWebhookSignals(env, signals);
  return json(200, { status: "ACCEPTED", ...result });
}
