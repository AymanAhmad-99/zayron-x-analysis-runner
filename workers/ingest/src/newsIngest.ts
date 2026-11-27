/**
 * PHASE 9B — keyless, graph-enriched neural newsroom ingest.
 *
 * Design rules, all enforced here:
 *   - deterministic: same feed payload + same D1 catalogs → same briefing;
 *   - fail closed: a story with no verifiable entity is still published as a
 *     plain advisory, but it NEVER gains an internal link, a KEV claim or a
 *     CVSS it does not have;
 *   - bounded: at most `NEWS_MAX_SUBREQUESTS` external requests per pass;
 *   - isolated: its own `:40` slots, never shared with the pulse, IOC, Radar,
 *     PoC/KEV or Telegram ticks.
 *
 * It never copies a third-party article body. The published text is our own
 * template over the source's title/facts plus ZAYRON-X catalog telemetry.
 */

export const NEWS_FEEDS = [
  {
    name: "CISA Advisories",
    url: "https://www.cisa.gov/cybersecurity-advisories/all.xml",
  },
  { name: "SANS ISC", url: "https://isc.sans.edu/rssfeed.xml" },
  // BleepingComputer's Cloudflare edge answers 403 to a non-browser UA, so it is
  // deliberately not a schedule source. CISA News was verified 200 + valid RSS.
  { name: "CISA News", url: "https://www.cisa.gov/news.xml" },
  { name: "The Hacker News", url: "https://feeds.feedburner.com/TheHackersNews" },
] as const;

/** Verified-empty `:40` ticks. None collides with any other pipeline slot. */
export const NEWS_INGEST_HOURS = [0, 8, 12, 16, 20] as const;
export const NEWS_INGEST_MINUTE = 40;
export const NEWS_MAX_SUBREQUESTS = 6;
export const NEWS_MAX_ARTICLES_PER_PASS = 5;
export const NEWS_TITLE_LOCK_HOURS = 72;

/**
 * PHASE 9C — per-feed allocation ceiling.
 *
 * Ranking purely by publication time made the newsroom single-source: whichever
 * feed published most recently won all five slots, so CISA Advisories, SANS ISC
 * and CISA News produced zero briefings while The Hacker News produced every one.
 * A source-fair newsroom allocates round-robin and caps each feed, so one
 * prolific publisher can never crowd the others out of a pass.
 */
export const NEWS_MAX_ARTICLES_PER_FEED = 2;

/**
 * Round-robin allocation across feeds.
 *
 * Within each feed the newest items win; across feeds the pick rotates, one item
 * per feed per round, and no feed may contribute more than `perFeedCap`. The
 * result is deterministic for a given input, which is what makes it testable.
 */
export function allocateAcrossFeeds(
  items: NewsItem[],
  maxArticles: number,
  perFeedCap: number = NEWS_MAX_ARTICLES_PER_FEED,
): NewsItem[] {
  const cap = Math.max(1, Math.floor(perFeedCap));
  const byFeed = new Map<string, NewsItem[]>();
  const ordered = [...(Array.isArray(items) ? items : [])].sort(
    (a, b) => Date.parse(b.publishedAt) - Date.parse(a.publishedAt),
  );
  for (const item of ordered) {
    const key = item.sourceName;
    const bucket = byFeed.get(key) ?? [];
    if (bucket.length >= cap) continue;
    bucket.push(item);
    byFeed.set(key, bucket);
  }
  const feeds = [...byFeed.keys()];
  const allocated: NewsItem[] = [];
  for (let round = 0; round < cap; round += 1) {
    for (const feed of feeds) {
      if (allocated.length >= maxArticles) return allocated;
      const bucket = byFeed.get(feed) ?? [];
      if (bucket.length > round) allocated.push(bucket[round]);
    }
  }
  return allocated;
}

const USER_AGENT = "ZAYRON-X-Newsroom/1.0 (+https://zayron-x.co)";

/** Pure slot predicate; exported so the unit gate can prove zero overlap. */
export function isNewsIngestSlot(
  date: Date,
  hours: readonly number[] = NEWS_INGEST_HOURS,
): boolean {
  const minute = date.getUTCMinutes();
  const hour = date.getUTCHours();
  return minute === NEWS_INGEST_MINUTE && hours.includes(hour);
}

/** Hard subrequest ceiling for one invocation. */
export class NewsBudget {
  used = 0;
  constructor(readonly limit: number = NEWS_MAX_SUBREQUESTS) {}

  get remaining(): number {
    return Math.max(0, this.limit - this.used);
  }

  take(): boolean {
    if (this.used >= this.limit) return false;
    this.used += 1;
    return true;
  }
}

/* ───────────────────────────── feed decoding ─────────────────────────────── */

const NAMED_ENTITIES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
  ndash: "–",
  mdash: "—",
  hellip: "…",
  rsquo: "’",
  lsquo: "‘",
  ldquo: "“",
  rdquo: "”",
};

export function decodeEntities(value: string): string {
  return String(value ?? "")
    .replace(/&#x([0-9a-f]+);/gi, (_match, hex) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_match, dec) => String.fromCodePoint(parseInt(dec, 10)))
    .replace(/&([a-z]+);/gi, (match, name) => NAMED_ENTITIES[String(name).toLowerCase()] ?? match);
}

/** Strip every tag, collapse whitespace. The ONLY text we ever keep. */
export function stripTags(value: string): string {
  return decodeEntities(String(value ?? "").replace(/<[^>]*>/g, " "))
    .replace(/\s+/g, " ")
    .trim();
}

function tag(block: string, name: string): string {
  const pattern = new RegExp(`<${name}[^>]*>([\\s\\S]*?)</${name}>`, "i");
  const match = block.match(pattern);
  if (!match) return "";
  return stripTags(match[1].replace(/^<!\[CDATA\[([\s\S]*?)\]\]>$/, "$1"));
}

export interface NewsItem {
  title: string;
  link: string;
  publishedAt: string;
  description: string;
  sourceName: string;
}

/** Parse RSS 2.0 or Atom without an XML dependency (Workers-safe). */
export function parseFeed(xml: string, sourceName: string): NewsItem[] {
  const body = String(xml ?? "");
  const blocks = [
    ...body.matchAll(/<item[\s>][\s\S]*?<\/item>/gi),
    ...body.matchAll(/<entry[\s>][\s\S]*?<\/entry>/gi),
  ].map((match) => match[0]);
  const items: NewsItem[] = [];
  for (const block of blocks) {
    const title = tag(block, "title");
    let link = tag(block, "link");
    if (!link) {
      const href = block.match(/<link[^>]+href="([^"]+)"/i);
      link = href ? decodeEntities(href[1]).trim() : "";
    }
    const rawDate =
      tag(block, "pubDate") || tag(block, "published") || tag(block, "updated") || tag(block, "dc:date");
    const published = new Date(rawDate);
    const description =
      tag(block, "description") || tag(block, "summary") || tag(block, "content:encoded") || "";
    if (!title || !/^https?:\/\//i.test(link)) continue;
    items.push({
      title: title.replace(/\s+/g, " ").trim().slice(0, 300),
      link,
      publishedAt: Number.isFinite(published.getTime())
        ? published.toISOString()
        : new Date().toISOString(),
      description: description.slice(0, 1200),
      sourceName,
    });
  }
  return items;
}

/* ───────────────────────────── identifiers ───────────────────────────────── */

export function normalizeTitle(value: string): string {
  return String(value ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9 ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function slugify(value: string, max = 70): string {
  return String(value ?? "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, max)
    .replace(/-+$/g, "");
}

export async function sha256Hex(value: string): Promise<string> {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

/** Dedupe key: normalized source URL + canonical title stem. */
export async function fingerprintOf(item: Pick<NewsItem, "title" | "link">): Promise<string> {
  return sha256Hex(`${normalizeUrl(item.link)}|${normalizeTitle(item.title)}`);
}

export function normalizeUrl(value: string): string {
  try {
    const url = new URL(value);
    url.hash = "";
    for (const key of [...url.searchParams.keys()]) {
      if (/^(utm_|ref|source|fbclid|gclid|mc_)/i.test(key)) url.searchParams.delete(key);
    }
    const search = url.searchParams.toString();
    return `${url.origin.toLowerCase()}${url.pathname.replace(/\/+$/, "")}${search ? `?${search}` : ""}`;
  } catch {
    return String(value ?? "").trim().toLowerCase();
  }
}

/* ─────────────────────────── entity extraction ───────────────────────────── */

export interface CatalogFamily {
  slug: string;
  name: string;
}
export interface CatalogActor {
  slug: string;
  name: string;
  aliases: string[];
}

export interface EntityMention {
  entity_type: "cve" | "malware_family" | "malware_advisory" | "actor" | "campaign" | "technique" | "vendor";
  entity_slug: string;
  entity_label: string;
  in_catalog: number;
}

export function extractCveIds(text: string): string[] {
  const found = new Set<string>();
  for (const match of String(text ?? "").matchAll(/\bCVE-\d{4}-\d{4,7}\b/gi)) {
    found.add(match[0].toUpperCase());
  }
  return [...found];
}

export function extractMalwareAdvisoryIds(text: string): string[] {
  const found = new Set<string>();
  for (const match of String(text ?? "").matchAll(/\bMAL-\d{4}-\d{4,7}\b/gi)) found.add(match[0].toUpperCase());
  return [...found];
}

export function extractTechniqueIds(text: string): string[] {
  const found = new Set<string>();
  for (const match of String(text ?? "").matchAll(/\bT\d{4}(?:\.\d{3})?\b/g)) {
    const id = match[0].toUpperCase();
    // A bare T#### is usually a product code ("T1000"), so only the dotted
    // sub-technique form is linked without a catalog check.
    if (!id.includes(".")) continue;
    found.add(id);
  }
  return [...found];
}

function containsTerm(haystack: string, term: string): boolean {
  const needle = term.trim().toLowerCase();
  if (needle.length < 4) return false;
  if (!/^[a-z0-9 ._+-]+$/.test(needle)) return false;
  const escaped = needle.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`(^|[^a-z0-9])${escaped}([^a-z0-9]|$)`, "i").test(haystack);
}

/**
 * Candidate extraction. Every candidate is filtered against the live catalog by
 * the caller — this function must never be trusted as the catalog check.
 */
export function extractMentions(
  text: string,
  catalogs: {
    families?: CatalogFamily[];
    actors?: CatalogActor[];
    vendors?: Array<{ slug: string; name: string }>;
    techniques?: string[];
  },
): EntityMention[] {
  const haystack = ` ${String(text ?? "").replace(/\s+/g, " ").toLowerCase()} `;
  const mentions = new Map<string, EntityMention>();
  const push = (mention: EntityMention) => {
    const key = `${mention.entity_type}:${mention.entity_slug}`;
    if (!mentions.has(key)) mentions.set(key, mention);
  };

  for (const family of catalogs.families ?? []) {
    if (containsTerm(haystack, family.name)) {
      push({ entity_type: "malware_family", entity_slug: family.slug, entity_label: family.name, in_catalog: 1 });
    }
  }
  for (const actor of catalogs.actors ?? []) {
    const terms = [actor.name, ...(actor.aliases ?? [])].filter(Boolean);
    if (terms.some((term) => containsTerm(haystack, term))) {
      push({ entity_type: "actor", entity_slug: actor.slug, entity_label: actor.name, in_catalog: 1 });
    }
  }
  for (const vendor of catalogs.vendors ?? []) {
    if (containsTerm(haystack, vendor.name)) {
      push({ entity_type: "vendor", entity_slug: vendor.slug, entity_label: vendor.name, in_catalog: 1 });
    }
  }
  for (const techniqueId of extractTechniqueIds(text)) {
    const known = (catalogs.techniques ?? []).includes(techniqueId);
    push({
      entity_type: "technique",
      entity_slug: techniqueId,
      entity_label: techniqueId,
      in_catalog: known ? 1 : 0,
    });
  }
  for (const malId of extractMalwareAdvisoryIds(text)) {
    // MAL-* is catalogued by the malware-report store; the ingest pass verifies
    // existence later and keeps the mention unlinked when it does not exist.
    push({ entity_type: "malware_advisory", entity_slug: malId, entity_label: malId, in_catalog: 0 });
  }
  return [...mentions.values()];
}

/* ───────────────────────────── classification ───────────────────────────── */

export type NewsCategory =
  | "VULNERABILITY"
  | "EXPLOITATION"
  | "MALWARE"
  | "THREAT_ACTOR"
  | "SUPPLY_CHAIN"
  | "ADVISORY";
export type NewsSeverity = "CRITICAL" | "HIGH" | "MEDIUM" | "INFO";

const EXPLOITATION_TERMS = /\b(exploited|exploitation|in the wild|zero-day|0-day|remote code execution|rce|ransomware|actively)\b/i;
const SUPPLY_CHAIN_TERMS = /\b(supply chain|npm|pypi|package|dependency|maintainer|repository|open source|open-source)\b/i;

export function classifyCategory(text: string, mentions: EntityMention[]): NewsCategory {
  const value = String(text ?? "");
  if (SUPPLY_CHAIN_TERMS.test(value)) return "SUPPLY_CHAIN";
  if (mentions.some((mention) => mention.entity_type === "cve") && EXPLOITATION_TERMS.test(value)) {
    return "EXPLOITATION";
  }
  if (mentions.some((mention) => mention.entity_type === "malware_family")) return "MALWARE";
  if (mentions.some((mention) => mention.entity_type === "actor")) return "THREAT_ACTOR";
  if (mentions.some((mention) => mention.entity_type === "cve")) return "VULNERABILITY";
  if (/\badvisory|advisories|guidance|bulletin\b/i.test(value)) return "ADVISORY";
  return "ADVISORY";
}

export function classifySeverity(input: {
  cvss?: number | null;
  kev?: boolean;
  title: string;
  text: string;
}): NewsSeverity {
  if (input.kev) return "CRITICAL";
  const cvss = Number(input.cvss);
  if (Number.isFinite(cvss) && cvss > 0) {
    if (cvss >= 9) return "CRITICAL";
    if (cvss >= 7) return "HIGH";
    if (cvss >= 4) return "MEDIUM";
    return "INFO";
  }
  const text = `${input.title} ${input.text}`;
  if (/\bcritical\b/i.test(text)) return "HIGH";
  if (EXPLOITATION_TERMS.test(text)) return "MEDIUM";
  return "INFO";
}

/* ─────────────────────────────── synthesis ──────────────────────────────── */

const VERDICT_PAD =
  "Every fact above is attributed to the named publisher; ZAYRON-X adds only catalog-verified telemetry and never asserts an exploitation state that the catalog does not hold.";

export function verdictWordCount(value: string): number {
  return String(value ?? "").trim().split(/\s+/).filter(Boolean).length;
}

/** Clamp a verdict into the mandated 40–65 word GEO citation window. */
export function clampVerdict(value: string): string {
  const words = String(value ?? "").trim().split(/\s+/).filter(Boolean);
  if (words.length > 65) return `${words.slice(0, 65).join(" ").replace(/[,;:]+$/, "")}.`;
  let text = words.join(" ");
  while (verdictWordCount(text) < 40) text = `${text} ${VERDICT_PAD}`.trim();
  return text;
}

export function buildHuntingSnippet(terms: string[]): { kql: string; spl: string } {
  const clean = terms.map((term) => term.replace(/["\\]/g, "")).filter(Boolean).slice(0, 6);
  const list = clean.length > 0 ? clean.map((term) => `"${term}"`).join(", ") : '"<add indicator>"';
  return {
    kql: `let lookback = 7d;\nDeviceProcessEvents\n| where Timestamp > ago(lookback)\n| where ProcessCommandLine has_any (${list})\n| project Timestamp, DeviceName, AccountName, ProcessCommandLine, InitiatingProcessFileName`,
    spl: `index=* earliest=-7d\n| eval hunt=lower(_raw)\n| where ${clean.length > 0 ? clean.map((term) => `like(hunt, "%${term.toLowerCase().replace(/"/g, "")}%")`).join(" OR ") : "false()"}\n| stats count min(_time) as first_seen max(_time) as last_seen by host, user, sourcetype`,
  };
}

export interface BriefingInput {
  item: NewsItem;
  mentions: EntityMention[];
  cves: Array<{
    cve_id: string;
    cvss_score: number | null;
    epss_score: number | null;
    is_exploited_in_wild: number | null;
    kev_due_date: string | null;
    affected_vendor: string | null;
    affected_product: string | null;
    poc_count: number;
  }>;
  techniques: Array<{ id: string; name: string }>;
  families: string[];
  actors: string[];
}

export interface Briefing {
  verdict: string;
  summary: string;
  sections: Array<{ heading: string; paragraphs: string[] }>;
  category: NewsCategory;
  severity: NewsSeverity;
  faq: Array<{ question: string; answer: string }>;
  enrichment: Record<string, unknown>;
}

export function buildBriefing(input: BriefingInput): Briefing {
  const { item, mentions, cves, techniques, families, actors } = input;
  const primary = cves[0] ?? null;
  const kev = cves.some((cve) => Number(cve.is_exploited_in_wild) === 1 || Boolean(cve.kev_due_date));
  const subject = primary
    ? `${primary.cve_id}${primary.affected_vendor ? ` in ${primary.affected_vendor}` : ""}`
    : families.length > 0
      ? `activity involving ${families.join(", ")}`
      : actors.length > 0
        ? `activity attributed to ${actors.join(", ")}`
        : "the published report";

  const category = classifyCategory(`${item.title} ${item.description}`, mentions);
  const severity = classifySeverity({
    cvss: primary?.cvss_score ?? null,
    kev,
    title: item.title,
    text: item.description,
  });

  const facts: string[] = [`${item.sourceName} published: ${item.title}`];
  if (primary) {
    facts.push(
      primary.cvss_score !== null
        ? `The ZAYRON-X catalog holds ${primary.cve_id} at CVSS ${Number(primary.cvss_score).toFixed(1)}`
        : `The ZAYRON-X catalog holds ${primary.cve_id} without a published CVSS score`,
    );
    if (kev) facts.push("CISA lists it as exploited in the wild");
    if (primary.poc_count > 0) facts.push(`${primary.poc_count} public proof-of-concept repository(ies) are indexed`);
  } else {
    facts.push("No CVE in the ZAYRON-X authoritative catalog is named by this report");
  }
  if (techniques.length > 0) facts.push(`Documented ATT&CK techniques: ${techniques.map((t) => t.id).join(", ")}`);

  const verdict = clampVerdict(`${facts.join(". ")}.`);
  const summary = primary
    ? `A source-verified report involving ${subject}, graded ${severity.toLowerCase()} against catalog telemetry.`
    : `A source-verified report on ${subject}, graded ${severity.toLowerCase()} against catalog telemetry.`;

  const sectionOne = [
    `The publisher reports: ${item.description ? item.description.slice(0, 700) : item.title}.`,
    "This briefing restates only the publisher's claims as claims; it does not reproduce their article body.",
  ];
  const sectionTwo = primary
    ? [
        `${primary.cve_id} is held in the ZAYRON-X authoritative catalog${
          primary.affected_product ? ` for ${primary.affected_product}` : ""
        }. CVSS: ${primary.cvss_score !== null ? Number(primary.cvss_score).toFixed(1) : "not published"}; EPSS: ${
          primary.epss_score !== null ? `${(Number(primary.epss_score) * 100).toFixed(1)}%` : "not published"
        }; CISA KEV: ${kev ? "listed" : "not listed"}.`,
        kev && primary.kev_due_date
          ? `BOD 22-01 remediation due date: ${primary.kev_due_date}.`
          : "Absence of a KEV listing is an absence of evidence, not evidence of safety.",
      ]
    : [
        "No authoritative CVE record matches this story in the ZAYRON-X catalog, so no severity, CVSS or exploitation claim is inferred.",
        "Treat vendor guidance as the primary source until a corroborated record is published.",
      ];
  const sectionThree = [
    techniques.length > 0
      ? `Hunting starters for ${techniques.map((t) => t.id).join(", ")} are included below; they are deterministic templates and must be tuned before alerting.`
      : "No ATT&CK technique is named by this report, so no hunting template is attached.",
    families.length > 0
      ? `Linked malware families: ${families.join(", ")}.`
      : actors.length > 0
        ? `Linked threat actors: ${actors.join(", ")}.`
        : "No catalogued threat actor or malware family is named in the source text.",
  ];

  const faq: Array<{ question: string; answer: string }> = [];
  if (primary) {
    faq.push({
      question: `What is ${primary.cve_id}?`,
      answer: `${primary.cve_id} is recorded in the ZAYRON-X authoritative catalog${
        primary.affected_product ? ` for ${primary.affected_product}` : ""
      } with a stored CVSS of ${primary.cvss_score !== null ? Number(primary.cvss_score).toFixed(1) : "not published"}.`,
    });
    faq.push({
      question: `Is ${primary.cve_id} exploited in the wild?`,
      answer: kev
        ? `Yes — CISA lists ${primary.cve_id} in the Known Exploited Vulnerabilities catalog${
            primary.kev_due_date ? ` with a BOD 22-01 due date of ${primary.kev_due_date}` : ""
          }.`
        : `No CISA KEV listing is held for ${primary.cve_id} in the ZAYRON-X catalog at ingest time. That is a statement about the catalog, not about safety.`,
    });
  } else {
    faq.push({
      question: "Does this report map to a catalogued CVE?",
      answer:
        "No authoritative CVE record in the ZAYRON-X catalog is named by this report, so no severity, CVSS or KEV state is asserted.",
    });
  }
  if (techniques.length > 0) {
    faq.push({
      question: "Which defensive techniques apply?",
      answer: `The report names ${techniques.map((t) => `${t.id} (${t.name})`).join(", ")}; deterministic KQL and SPL starters are published with the briefing.`,
    });
  } else {
    faq.push({
      question: "Where did this briefing come from?",
      answer: `${item.sourceName}. The original publication is linked as the official source; ZAYRON-X adds provenance, catalog telemetry and defensive guidance.`,
    });
  }

  const terms = [
    ...cves.map((cve) => cve.cve_id),
    ...families,
    ...techniques.map((technique) => technique.id),
  ];
  const hunt = buildHuntingSnippet(terms);

  return {
    verdict,
    summary,
    sections: [
      { heading: "What the source reports", paragraphs: sectionOne },
      { heading: "Catalog telemetry", paragraphs: sectionTwo },
      { heading: "Defensive posture", paragraphs: sectionThree },
    ],
    category,
    severity,
    faq: faq.slice(0, 3),
    enrichment: {
      cves: cves.map((cve) => ({
        cve_id: cve.cve_id,
        cvss_score: cve.cvss_score,
        epss_score: cve.epss_score,
        cisa_kev: kev && (Number(cve.is_exploited_in_wild) === 1 || Boolean(cve.kev_due_date)),
        kev_due_date: cve.kev_due_date,
        poc_count: cve.poc_count,
      })),
      techniques: techniques.map((technique) => technique.id),
      malware_families: families,
      actors,
      hunting: hunt,
    },
  };
}

/* ─────────────────────────────── D1 pass ───────────────────────────────── */

interface NewsEnv {
  DB: D1Database;
  INDEXNOW_KEY?: string;
  NEWS_INGEST_ENABLED?: string;
}

export interface NewsIngestOptions {
  limit?: number;
  maxSubrequests?: number;
  now?: Date;
  feeds?: readonly { name: string; url: string }[];
  fetchImpl?: typeof fetch;
}

export interface NewsIngestResult {
  status: "OK" | "SKIPPED" | "DEGRADED";
  articles_written: number;
  entity_mentions_written: number;
  subrequestsUsed: number;
  subrequestLimit: number;
  sources: Array<{ name: string; status: number | string; items: number }>;
  errors: string[];
  indexnow: string;
}

function rowValue(row: any, key: string): any {
  return row && typeof row === "object" ? row[key] : undefined;
}

async function queryAll(db: D1Database, sql: string, params: unknown[] = []): Promise<any[]> {
  const statement = db.prepare(sql);
  const bound = params.length > 0 ? statement.bind(...params) : statement;
  const result = await bound.all();
  return Array.isArray((result as any)?.results) ? (result as any).results : [];
}

export async function runNewsIngestPass(
  env: NewsEnv,
  options: NewsIngestOptions = {},
): Promise<NewsIngestResult> {
  const budget = new NewsBudget(options.maxSubrequests ?? NEWS_MAX_SUBREQUESTS);
  const limit = Math.max(1, Math.min(options.limit ?? NEWS_MAX_ARTICLES_PER_PASS, NEWS_MAX_ARTICLES_PER_PASS));
  const now = options.now ?? new Date();
  const fetchImpl = options.fetchImpl ?? fetch;
  const feeds = options.feeds ?? NEWS_FEEDS;
  const errors: string[] = [];
  const sources: Array<{ name: string; status: number | string; items: number }> = [];

  const items: NewsItem[] = [];
  for (const feed of feeds) {
    if (!budget.take()) {
      errors.push(`BUDGET_EXHAUSTED:${feed.name}`);
      break;
    }
    try {
      const response = await fetchImpl(feed.url, {
        headers: { "user-agent": USER_AGENT, accept: "application/rss+xml, application/xml, text/xml" },
        signal: AbortSignal.timeout(8000),
      });
      if (!response.ok) {
        sources.push({ name: feed.name, status: response.status, items: 0 });
        errors.push(`FEED_${response.status}:${feed.name}`);
        continue;
      }
      const parsed = parseFeed(await response.text(), feed.name);
      sources.push({ name: feed.name, status: response.status, items: parsed.length });
      items.push(...parsed);
    } catch (error) {
      sources.push({ name: feed.name, status: "ERROR", items: 0 });
      errors.push(`FEED_ERROR:${feed.name}:${String((error as Error)?.message ?? error).slice(0, 120)}`);
    }
  }

  // PHASE 9C — source-fair candidate pool. The pool is wider than one pass so a
  // duplicate never starves the allocation, but each feed stays capped and the
  // write loop below still stops at `limit`.
  const candidates = allocateAcrossFeeds(items, Math.max(limit * 3, 12));

  const withFingerprint: Array<{ item: NewsItem; fingerprint: string }> = [];
  for (const item of candidates) {
    withFingerprint.push({ item, fingerprint: await fingerprintOf(item) });
  }

  const existingFingerprints = new Set<string>();
  if (withFingerprint.length > 0) {
    const placeholders = withFingerprint.map(() => "?").join(",");
    const rows = await queryAll(
      env.DB,
      `SELECT fingerprint FROM news_articles WHERE fingerprint IN (${placeholders})`,
      withFingerprint.map((entry) => entry.fingerprint),
    );
    for (const row of rows) existingFingerprints.add(String(rowValue(row, "fingerprint")));
  }

  // 72h normalized-title lock, so a re-titled syndication of the same story is
  // never published twice.
  const recentRows = await queryAll(
    env.DB,
    `SELECT title, published_at FROM news_articles WHERE published_at >= datetime('now', ?)`,
    [`-${NEWS_TITLE_LOCK_HOURS} hours`],
  );
  const recentTitles = new Set(recentRows.map((row) => normalizeTitle(rowValue(row, "title") ?? "")));

  const families = (await queryAll(env.DB, `SELECT slug, name FROM malware ORDER BY slug ASC LIMIT 100`)).map(
    (row) => ({ slug: String(rowValue(row, "slug")), name: String(rowValue(row, "name")) }),
  );
  const actors = (
    await queryAll(env.DB, `SELECT slug, name, aliases_json FROM threat_actors ORDER BY slug ASC LIMIT 300`)
  ).map((row) => {
    let aliases: string[] = [];
    try {
      const parsed = JSON.parse(String(rowValue(row, "aliases_json") ?? "[]"));
      if (Array.isArray(parsed)) aliases = parsed.map(String);
    } catch {
      aliases = [];
    }
    return { slug: String(rowValue(row, "slug")), name: String(rowValue(row, "name")), aliases };
  });
  const vendors = (
    await queryAll(
      env.DB,
      `SELECT DISTINCT affected_vendor AS vendor FROM vulnerabilities
        WHERE provenance_state = 'AUTHORITATIVE_VERIFIED' AND affected_vendor IS NOT NULL LIMIT 500`,
    )
  )
    .map((row) => String(rowValue(row, "vendor") ?? "").trim())
    .filter(Boolean)
    .map((vendor) => ({ slug: slugify(vendor, 60), name: vendor }));
  const knownTechniques = new Set(
    (
      await queryAll(env.DB, `SELECT DISTINCT technique_id FROM technique_edges LIMIT 2000`)
    ).map((row) => String(rowValue(row, "technique_id")).toUpperCase()),
  );

  let articlesWritten = 0;
  let mentionsWritten = 0;
  const writtenUrls: string[] = [];

  for (const entry of withFingerprint) {
    if (articlesWritten >= limit) break;
    if (existingFingerprints.has(entry.fingerprint)) continue;
    if (recentTitles.has(normalizeTitle(entry.item.title))) continue;

    const text = `${entry.item.title}. ${entry.item.description}`;
    const candidateMentions = extractMentions(text, {
      families,
      actors,
      vendors,
      techniques: [...knownTechniques],
    });

    // CVE catalog check: ONLY authoritative rows may produce a mention or link.
    const cveIds = extractCveIds(text).slice(0, 5);
    const cveRows =
      cveIds.length > 0
        ? await queryAll(
            env.DB,
            `SELECT cve_id, cvss_score, epss_score, is_exploited_in_wild, kev_due_date,
                    affected_vendor, affected_product
               FROM vulnerabilities
              WHERE provenance_state = 'AUTHORITATIVE_VERIFIED'
                AND cve_id IN (${cveIds.map(() => "?").join(",")})`,
            cveIds,
          )
        : [];
    const pocCounts = new Map<string, number>();
    if (cveRows.length > 0) {
      const ids = cveRows.map((row) => String(rowValue(row, "cve_id")));
      const pocRows = await queryAll(
        env.DB,
        `SELECT cve_id, COUNT(*) AS n FROM cve_pocs WHERE cve_id IN (${ids.map(() => "?").join(",")}) GROUP BY cve_id`,
        ids,
      );
      for (const row of pocRows) pocCounts.set(String(rowValue(row, "cve_id")), Number(rowValue(row, "n") ?? 0));
    }
    const cves = cveRows.map((row) => ({
      cve_id: String(rowValue(row, "cve_id")),
      cvss_score: rowValue(row, "cvss_score") ?? null,
      epss_score: rowValue(row, "epss_score") ?? null,
      is_exploited_in_wild: rowValue(row, "is_exploited_in_wild") ?? null,
      kev_due_date: rowValue(row, "kev_due_date") ?? null,
      affected_vendor: rowValue(row, "affected_vendor") ?? null,
      affected_product: rowValue(row, "affected_product") ?? null,
      poc_count: pocCounts.get(String(rowValue(row, "cve_id"))) ?? 0,
    }));

    const mentions: EntityMention[] = [...candidateMentions];
    for (const cve of cves) {
      mentions.push({ entity_type: "cve", entity_slug: cve.cve_id, entity_label: cve.cve_id, in_catalog: 1 });
    }
    // A technique is only a verified link when the edge table knows it.
    for (const mention of mentions) {
      if (mention.entity_type === "technique") mention.in_catalog = knownTechniques.has(mention.entity_slug) ? 1 : 0;
    }

    const techniqueRows =
      mentions.filter((m) => m.entity_type === "technique" && m.in_catalog === 1).length > 0
        ? await queryAll(
            env.DB,
            `SELECT technique_id, MIN(technique_name) AS technique_name FROM technique_edges
              WHERE technique_id IN (${mentions
                .filter((m) => m.entity_type === "technique" && m.in_catalog === 1)
                .map(() => "?")
                .join(",")}) GROUP BY technique_id`,
            mentions.filter((m) => m.entity_type === "technique" && m.in_catalog === 1).map((m) => m.entity_slug),
          )
        : [];
    const techniques = techniqueRows.map((row) => ({
      id: String(rowValue(row, "technique_id")),
      name: String(rowValue(row, "technique_name") ?? rowValue(row, "technique_id")),
    }));

    const briefing = buildBriefing({
      item: entry.item,
      mentions,
      cves,
      techniques,
      families: mentions.filter((m) => m.entity_type === "malware_family").map((m) => m.entity_label),
      actors: mentions.filter((m) => m.entity_type === "actor").map((m) => m.entity_label),
    });

    const fingerprint = entry.fingerprint;
    const id = `news_${fingerprint.slice(0, 16)}`;
    let slug = slugify(entry.item.title, 70);
    if (!slug) slug = `briefing-${fingerprint.slice(0, 8)}`;
    const slugTaken = await queryAll(env.DB, `SELECT fingerprint FROM news_articles WHERE slug = ?`, [slug]);
    if (slugTaken.length > 0 && String(rowValue(slugTaken[0], "fingerprint")) !== fingerprint) {
      slug = `${slug}-${fingerprint.slice(0, 6)}`;
    }

    const ingestedAt = now.toISOString();
    const statements: D1PreparedStatement[] = [
      env.DB.prepare(
        `INSERT OR IGNORE INTO news_articles (
           id, slug, fingerprint, title, verdict, summary, body_sections_json, category, severity,
           source_name, source_url, published_at, ingested_at, graph_enrichment_json, faq_json, status
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'PUBLISHED')`,
      ).bind(
        id,
        slug,
        fingerprint,
        entry.item.title,
        briefing.verdict,
        briefing.summary,
        JSON.stringify(briefing.sections),
        briefing.category,
        briefing.severity,
        entry.item.sourceName,
        entry.item.link,
        entry.item.publishedAt,
        ingestedAt,
        JSON.stringify(briefing.enrichment),
        JSON.stringify(briefing.faq),
      ),
    ];
    for (const mention of mentions) {
      statements.push(
        env.DB.prepare(
          `INSERT OR IGNORE INTO entity_mentions (news_id, entity_type, entity_slug, entity_label, in_catalog)
           VALUES (?, ?, ?, ?, ?)`,
        ).bind(id, mention.entity_type, mention.entity_slug, mention.entity_label, mention.in_catalog),
      );
    }

    await env.DB.batch(statements);
    articlesWritten += 1;
    mentionsWritten += mentions.length;
    writtenUrls.push(`https://zayron-x.co/news/${slug}`);
    existingFingerprints.add(fingerprint);
    recentTitles.add(normalizeTitle(entry.item.title));
  }

  let indexnow = "DISABLED";
  if (env.INDEXNOW_KEY && writtenUrls.length > 0) {
    indexnow = await pingIndexNow(writtenUrls, env.INDEXNOW_KEY, { budget, fetchImpl });
  }

  return {
    status: errors.length === 0 ? "OK" : articlesWritten > 0 ? "DEGRADED" : "DEGRADED",
    articles_written: articlesWritten,
    entity_mentions_written: mentionsWritten,
    subrequestsUsed: budget.used,
    subrequestLimit: budget.limit,
    sources,
    errors,
    indexnow,
  };
}

/* ─────────────────────────────── IndexNow ───────────────────────────────── */

/**
 * One bounded POST when `INDEXNOW_KEY` is configured; a graceful no-op
 * otherwise (no throw, no request, no log noise in production).
 */
export async function pingIndexNow(
  urls: string[],
  key: string,
  options: { budget?: NewsBudget; fetchImpl?: typeof fetch; siteOrigin?: string } = {},
): Promise<string> {
  const cleanKey = String(key ?? "").trim();
  if (!cleanKey || urls.length === 0) return "DISABLED";
  const budget = options.budget;
  if (budget && !budget.take()) return "BUDGET_EXHAUSTED";
  const fetchImpl = options.fetchImpl ?? fetch;
  const origin = (options.siteOrigin ?? "https://zayron-x.co").replace(/\/+$/, "");
  try {
    const response = await fetchImpl("https://api.indexnow.org/indexnow", {
      method: "POST",
      headers: { "content-type": "application/json; charset=utf-8" },
      body: JSON.stringify({
        host: new URL(origin).host,
        key: cleanKey,
        keyLocation: `${origin}/${cleanKey}.txt`,
        urlList: urls.slice(0, 10),
      }),
      signal: AbortSignal.timeout(5000),
    });
    return `HTTP_${response.status}`;
  } catch (error) {
    return `ERROR:${String((error as Error)?.message ?? error).slice(0, 80)}`;
  }
}
