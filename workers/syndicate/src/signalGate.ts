/**
 * PHASE 14 — Signal Gate, Deduplication Lock & Bounded D1 / RSS Candidate Loader.
 *
 * Strictly bounds every D1 query (`LIMIT 10`) so total daily row reads remain
 * negligible (< 2,000 rows/day across 48 half-hour ticks) and degrades cleanly
 * to the public `/news/rss.xml` feed if D1 is unavailable or quota-limited.
 */
import type { PlatformName, SyndicationItem } from "./types";
import { collapseWhitespace, decodeXmlEntities, normalizeHashtag, normalizeSiteUrl } from "./textUtils";

const INITIALIZED_DBS = new WeakSet<object>();

export const CREATE_SYNDICATION_TABLE_SQL = `
CREATE TABLE IF NOT EXISTS social_syndication_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  item_id TEXT NOT NULL,
  item_type TEXT NOT NULL,
  platform TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'posted',
  external_uri TEXT,
  external_url TEXT,
  error_message TEXT,
  posted_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (item_id, platform)
)`;

export const CREATE_SYNDICATION_INDEX_SQL = `
CREATE INDEX IF NOT EXISTS idx_social_syndication_platform_time
  ON social_syndication_log (platform, status, posted_at DESC)`;

export const SELECT_SYNDICATION_NEWS_SQL = `
SELECT id, slug, title, verdict, summary, category, severity, published_at
  FROM news_articles
 WHERE status = 'PUBLISHED'
 ORDER BY published_at DESC
 LIMIT 10`;

export const SELECT_SYNDICATION_KEV_SQL = `
SELECT cve_id, title, description, cvss_score, epss_score, affected_vendor,
       affected_product, is_exploited_in_wild, kev_due_date, severity, published_at, modified_at
  FROM vulnerabilities
 WHERE provenance_state = 'AUTHORITATIVE_VERIFIED'
   AND is_exploited_in_wild = 1
 ORDER BY epss_score DESC, cvss_score DESC
 LIMIT 10`;

export const SELECT_SYNDICATION_HIGH_EPSS_SQL = `
SELECT cve_id, title, description, cvss_score, epss_score, affected_vendor,
       affected_product, is_exploited_in_wild, kev_due_date, severity, published_at, modified_at
  FROM vulnerabilities
 WHERE provenance_state = 'AUTHORITATIVE_VERIFIED'
   AND is_exploited_in_wild = 0
   AND epss_score >= 0.5
 ORDER BY epss_score DESC, cvss_score DESC
 LIMIT 5`;

export async function ensureSyndicationTable(db: D1Database | undefined): Promise<void> {
  if (!db) return;
  const key = db as unknown as object;
  if (INITIALIZED_DBS.has(key)) return;
  await db.prepare(CREATE_SYNDICATION_TABLE_SQL).run();
  await db.prepare(CREATE_SYNDICATION_INDEX_SQL).run();
  INITIALIZED_DBS.add(key);
}

function toFiniteNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const num = Number(value);
    return Number.isFinite(num) ? num : null;
  }
  return null;
}

function mapNewsRow(row: Record<string, unknown>, siteUrl: string): SyndicationItem | null {
  const slug = String(row.slug ?? "").trim();
  const title = collapseWhitespace(String(row.title ?? ""));
  if (!slug || !title) return null;

  const summary = collapseWhitespace(String(row.verdict ?? row.summary ?? title));
  const encodedSlug = encodeURIComponent(slug);
  const catTag = normalizeHashtag(String(row.category ?? ""));
  const tags = ["ThreatIntel", catTag && catTag.length <= 24 ? catTag : "Cybersecurity"];

  return {
    itemId: `news:${slug}`,
    itemType: "news",
    title,
    summary,
    url: `${siteUrl}/news/${encodedSlug}`,
    imageUrl: `${siteUrl}/api/og/news/${encodedSlug}`,
    tags,
    severity: String(row.severity ?? "HIGH").toUpperCase(),
    cvssScore: null,
    epssScore: null,
    isKev: false,
    publishedAt: String(row.published_at ?? new Date().toISOString()),
    detectionHint: "Review linked CVEs, actors, and defensive mitigations in the briefing.",
  };
}

function mapVulnerabilityRow(row: Record<string, unknown>, siteUrl: string): SyndicationItem | null {
  const cveId = String(row.cve_id ?? "").trim().toUpperCase();
  if (!cveId) return null;

  const isKev = Number(row.is_exploited_in_wild ?? 0) === 1 || Boolean(String(row.kev_due_date ?? "").trim());
  const vendorProduct = [row.affected_vendor, row.affected_product]
    .map((v) => collapseWhitespace(String(v ?? "")))
    .filter(Boolean)
    .join(" ");
  const rawTitle = collapseWhitespace(String(row.title ?? ""));
  const title = vendorProduct
    ? `${cveId} (${vendorProduct})`
    : rawTitle && !rawTitle.toUpperCase().startsWith(cveId)
      ? `${cveId}: ${rawTitle}`
      : rawTitle || cveId;

  const summary = collapseWhitespace(String(row.description ?? row.title ?? `${cveId} verified vulnerability dossier`));
  const encodedCve = encodeURIComponent(cveId);
  const cvssScore = toFiniteNumber(row.cvss_score);
  const epssScore = toFiniteNumber(row.epss_score);
  const kevDue = collapseWhitespace(String(row.kev_due_date ?? ""));

  return {
    itemId: `cve:${cveId}`,
    itemType: isKev ? "kev" : "cve",
    title,
    summary,
    url: `${siteUrl}/intelligence/vulnerabilities/${encodedCve}`,
    imageUrl: `${siteUrl}/api/og/cve/${encodedCve}`,
    tags: isKev ? ["ThreatIntel", "CISAKEV"] : ["ThreatIntel", "CVE"],
    severity: String(row.severity ?? (isKev ? "CRITICAL" : "HIGH")).toUpperCase(),
    cvssScore,
    epssScore,
    isKev,
    publishedAt: String(row.modified_at ?? row.published_at ?? new Date().toISOString()),
    detectionHint: kevDue
      ? `CISA KEV due ${kevDue} — prioritize patching and exposure validation.`
      : "Apply vendor updates and inspect perimeter logs for anomalous exploitation.",
  };
}

function extractXmlTag(block: string, tagName: string): string {
  const re = new RegExp(`<${tagName}[^>]*>([\\s\\S]*?)<\\/${tagName}>`, "i");
  const match = block.match(re);
  return match ? decodeXmlEntities(match[1]) : "";
}

export function parseRssXml(xml: string, rawSiteUrl: string, limit = 10): SyndicationItem[] {
  const siteUrl = normalizeSiteUrl(rawSiteUrl);
  const items: SyndicationItem[] = [];
  const itemMatches = String(xml ?? "").match(/<item\b[^>]*>[\s\S]*?<\/item>/gi) ?? [];

  for (const block of itemMatches.slice(0, limit)) {
    const title = extractXmlTag(block, "title");
    const link = extractXmlTag(block, "link") || extractXmlTag(block, "guid");
    const summary = extractXmlTag(block, "description") || title;
    const category = normalizeHashtag(extractXmlTag(block, "category"));
    const pubDate = extractXmlTag(block, "pubDate");
    if (!title || !/^https?:\/\//i.test(link)) continue;

    let slug = link;
    try {
      const parsed = new URL(link);
      const segments = parsed.pathname.split("/").filter(Boolean);
      slug = segments[segments.length - 1] || parsed.pathname;
    } catch {
      slug = link;
    }

    const parsedDate = Date.parse(pubDate);
    items.push({
      itemId: `news:${slug}`,
      itemType: "news",
      title,
      summary,
      url: link,
      imageUrl: `${siteUrl}/api/og/news/${encodeURIComponent(slug)}`,
      tags: ["ThreatIntel", category && category.length <= 24 ? category : "Cybersecurity"],
      severity: "HIGH",
      cvssScore: null,
      epssScore: null,
      isKev: /\bkev\b|actively exploited/i.test(`${title} ${summary}`),
      publishedAt: Number.isFinite(parsedDate) ? new Date(parsedDate).toISOString() : new Date().toISOString(),
      detectionHint: "Review verified indicators and recommended defensive controls.",
    });
  }
  return items;
}

export async function fetchRssFallbackCandidates(
  rawSiteUrl: string,
  limit = 10,
  fetchFn: typeof fetch = fetch,
): Promise<SyndicationItem[]> {
  const siteUrl = normalizeSiteUrl(rawSiteUrl);
  try {
    const res = await fetchFn(`${siteUrl}/news/rss.xml`, {
      headers: { Accept: "application/rss+xml, application/xml, text/xml" },
      signal: AbortSignal.timeout(6000),
    });
    if (!res.ok) return [];
    const xml = await res.text();
    return parseRssXml(xml, siteUrl, limit);
  } catch {
    return [];
  }
}

export async function loadSyndicationCandidates(
  db: D1Database | undefined,
  rawSiteUrl: string,
  fetchFn: typeof fetch = fetch,
): Promise<{ candidates: SyndicationItem[]; source: "d1" | "rss_fallback" }> {
  const siteUrl = normalizeSiteUrl(rawSiteUrl);
  const collected: SyndicationItem[] = [];
  const seen = new Set<string>();

  const pushUnique = (item: SyndicationItem | null) => {
    if (!item || seen.has(item.itemId)) return;
    seen.add(item.itemId);
    collected.push(item);
  };

  if (db) {
    try {
      const [newsRes, kevRes, highEpssRes] = await Promise.all([
        db.prepare(SELECT_SYNDICATION_NEWS_SQL).all<Record<string, unknown>>().catch(() => null),
        db.prepare(SELECT_SYNDICATION_KEV_SQL).all<Record<string, unknown>>().catch(() => null),
        db.prepare(SELECT_SYNDICATION_HIGH_EPSS_SQL).all<Record<string, unknown>>().catch(() => null),
      ]);

      const newsItems = (newsRes?.results ?? [])
        .map((r) => mapNewsRow(r, siteUrl))
        .filter((v): v is SyndicationItem => v !== null);
      const kevItems = (kevRes?.results ?? [])
        .map((r) => mapVulnerabilityRow(r, siteUrl))
        .filter((v): v is SyndicationItem => v !== null);
      const epssItems = (highEpssRes?.results ?? [])
        .map((r) => mapVulnerabilityRow(r, siteUrl))
        .filter((v): v is SyndicationItem => v !== null);

      // Interleave freshest published briefings with top CISA KEV advisories first.
      const maxLen = Math.max(newsItems.length, kevItems.length);
      for (let i = 0; i < maxLen; i++) {
        if (i < newsItems.length) pushUnique(newsItems[i]);
        if (i < kevItems.length) pushUnique(kevItems[i]);
      }
      for (const item of epssItems) {
        pushUnique(item);
      }

      if (collected.length > 0) {
        return { candidates: collected.slice(0, 15), source: "d1" };
      }
    } catch {
      // Fall through cleanly to RSS fallback if D1 throws or hits quota limits.
    }
  }

  const rssItems = await fetchRssFallbackCandidates(siteUrl, 10, fetchFn);
  return { candidates: rssItems, source: "rss_fallback" };
}

export interface PlatformQuotaState {
  allowed: boolean;
  reason: "ok" | "daily_cap" | "cooldown";
  countToday: number;
  lastPostedAt: string | null;
}

export async function getPlatformQuotaState(
  db: D1Database | undefined,
  platform: PlatformName,
  now: Date,
  dailyCap: number,
  cooldownMinutes = 0,
): Promise<PlatformQuotaState> {
  if (!db) {
    return { allowed: true, reason: "ok", countToday: 0, lastPostedAt: null };
  }

  await ensureSyndicationTable(db);
  const utcDayPrefix = `${now.toISOString().slice(0, 10)}T00:00:00.000Z`;
  const rows = await db
    .prepare(
      `SELECT posted_at
         FROM social_syndication_log
        WHERE platform = ? AND status = 'posted' AND posted_at >= ?
        ORDER BY posted_at DESC
        LIMIT 12`,
    )
    .bind(platform, utcDayPrefix)
    .all<{ posted_at?: string }>();

  const timestamps = (rows.results ?? [])
    .map((r) => String(r.posted_at ?? "").trim())
    .filter(Boolean);
  const countToday = timestamps.length;
  const lastPostedAt = timestamps[0] ?? null;

  if (countToday >= dailyCap) {
    return { allowed: false, reason: "daily_cap", countToday, lastPostedAt };
  }

  if (cooldownMinutes > 0 && lastPostedAt) {
    const lastMs = Date.parse(lastPostedAt);
    if (Number.isFinite(lastMs) && now.getTime() - lastMs < cooldownMinutes * 60_000) {
      return { allowed: false, reason: "cooldown", countToday, lastPostedAt };
    }
  }

  return { allowed: true, reason: "ok", countToday, lastPostedAt };
}

export async function selectUnpostedCandidate(
  db: D1Database | undefined,
  platform: PlatformName,
  candidates: SyndicationItem[],
): Promise<SyndicationItem | null> {
  if (candidates.length === 0) return null;
  if (!db) return candidates[0] ?? null;

  await ensureSyndicationTable(db);
  const itemIds = candidates.map((c) => c.itemId).slice(0, 20);
  const placeholders = itemIds.map(() => "?").join(", ");
  const existing = await db
    .prepare(
      `SELECT item_id
         FROM social_syndication_log
        WHERE platform = ? AND status = 'posted' AND item_id IN (${placeholders})`,
    )
    .bind(platform, ...itemIds)
    .all<{ item_id?: string }>();

  const postedIds = new Set((existing.results ?? []).map((r) => String(r.item_id ?? "")));
  return candidates.find((c) => !postedIds.has(c.itemId)) ?? null;
}

export async function recordSyndicationLog(
  db: D1Database | undefined,
  entry: {
    itemId: string;
    itemType: string;
    platform: PlatformName;
    status: "posted" | "failed";
    externalUri?: string | null;
    externalUrl?: string | null;
    errorMessage?: string | null;
    postedAt?: string;
  },
): Promise<void> {
  if (!db) return;
  await ensureSyndicationTable(db);
  const postedAt = entry.postedAt ?? new Date().toISOString();
  await db
    .prepare(
      `INSERT INTO social_syndication_log
         (item_id, item_type, platform, status, external_uri, external_url, error_message, posted_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(item_id, platform) DO UPDATE SET
         status = excluded.status,
         external_uri = COALESCE(excluded.external_uri, social_syndication_log.external_uri),
         external_url = COALESCE(excluded.external_url, social_syndication_log.external_url),
         error_message = excluded.error_message,
         posted_at = excluded.posted_at
       WHERE social_syndication_log.status <> 'posted'`,
    )
    .bind(
      entry.itemId,
      entry.itemType,
      entry.platform,
      entry.status,
      entry.externalUri ?? null,
      entry.externalUrl ?? null,
      entry.errorMessage ?? null,
      postedAt,
    )
    .run();
}
