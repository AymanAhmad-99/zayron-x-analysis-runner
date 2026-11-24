/**
 * Wave 4B — sitemap feed contract (pure, no Workers imports).
 *
 * Two public read endpoints expose the URL inventory of the SITE:
 *   GET /api/v1/sitemap/manifest          → shard counts
 *   GET /api/v1/sitemap/:kind?page&limit  → one lightweight page of ids
 *
 * Every query uses the SAME visibility gate as the corresponding public detail
 * route, so a sitemap can never advertise a withheld or draft record:
 *   vulnerabilities → vulnerabilities.provenance_state = 'AUTHORITATIVE_VERIFIED'
 *   malware         → the canonical malware report read gate (loadServable…)
 *   articles        → articles.is_published = 1
 *
 * Projection is deliberately `id` + `updated_at` only — never `SELECT *`: a
 * sitemap needs a loc and, when it exists, a real lastmod.
 */

export const SITEMAP_PAGE_SIZE = 2000;
export const SITEMAP_MAX_LIMIT = 5000;
export const SITEMAP_CACHE_CONTROL =
  "public, max-age=300, s-maxage=3600, stale-while-revalidate=86400";

export const SITEMAP_KINDS = ["vulnerabilities", "malware", "articles"] as const;
export type SitemapKind = (typeof SITEMAP_KINDS)[number];

export function isSitemapKind(value: string): value is SitemapKind {
  return (SITEMAP_KINDS as readonly string[]).includes(value);
}

/** `limit` clamped to [1, 5000]; absent/invalid falls back to the page size. */
export function clampSitemapLimit(raw: string | null | undefined): number {
  const parsed = Number(raw ?? "");
  if (!Number.isFinite(parsed) || parsed <= 0) return SITEMAP_PAGE_SIZE;
  return Math.min(SITEMAP_MAX_LIMIT, Math.max(1, Math.floor(parsed)));
}

/** `page` is 1-based; anything else becomes page 1. */
export function clampSitemapPage(raw: string | null | undefined): number {
  const parsed = Number(raw ?? "");
  if (!Number.isFinite(parsed) || parsed < 1) return 1;
  return Math.floor(parsed);
}

export function sitemapOffset(page: number, limit: number): number {
  return (Math.max(1, page) - 1) * Math.max(1, limit);
}

export interface SitemapQuery {
  sql: string;
  params: Array<string | number>;
}

/**
 * Rows for one shard.
 *
 * `tokens` are the vulnerability category aliases from `categoryFilterTokens`
 * (passed in by the Worker so this module stays dependency-free). They are used
 * exactly as `/api/v1/intelligence?category=` uses them, so the sitemap's
 * vulnerability population and the public listing cannot drift apart.
 */
export function sitemapRowsQuery(kind: SitemapKind, tokens: string[], limit: number, offset: number): SitemapQuery {
  if (kind === "vulnerabilities") {
    // Gate 3A.3 — the sitemap and the public vulnerability detail route now
    // read the SAME corpus and the SAME gate. The previous query projected
    // `intelligence_reports` while the detail route served `vulnerabilities`,
    // so the two populations could drift apart (prod advertised 0 CVE URLs while
    // detail pages existed). Only NVD/KEV/EPSS-verified rows are advertised;
    // `tokens` is intentionally unused because a verified CVE belongs to the
    // vulnerability domain by construction.
    void tokens;
    return {
      sql: `SELECT cve_id AS id, updated_at FROM vulnerabilities
        WHERE provenance_state = 'AUTHORITATIVE_VERIFIED' AND cve_id IS NOT NULL AND cve_id <> ''
        ORDER BY cve_id ASC LIMIT ? OFFSET ?`,
      params: [limit, offset],
    };
  }
  if (kind === "articles") {
    return {
      sql: `SELECT slug AS id, updated_at FROM articles
        WHERE is_published = 1
        ORDER BY slug ASC LIMIT ? OFFSET ?`,
      params: [limit, offset],
    };
  }
  // malware: the read gate validates rows in memory, so the shard selects the
  // minimal columns it needs and the Worker pages the gated rows.
  return {
    sql: `SELECT id, updated_at FROM malware_reports ORDER BY id ASC`,
    params: [],
  };
}

/** COUNT for the manifest — same WHERE clause as the rows query, no projection. */
export function sitemapCountQuery(kind: SitemapKind, tokens: string[]): SitemapQuery {
  if (kind === "vulnerabilities") {
    void tokens;
    return {
      sql: `SELECT COUNT(*) AS total FROM vulnerabilities
        WHERE provenance_state = 'AUTHORITATIVE_VERIFIED' AND cve_id IS NOT NULL AND cve_id <> ''`,
      params: [],
    };
  }
  if (kind === "articles") {
    return { sql: "SELECT COUNT(*) AS total FROM articles WHERE is_published = 1", params: [] };
  }
  return { sql: "SELECT COUNT(*) AS total FROM malware_reports", params: [] };
}

export interface SitemapItem {
  id: string;
  updated_at: string | null;
}

/** Drops rows without a usable identifier; keeps `updated_at` only when real. */
export function projectSitemapItems(rows: Array<Record<string, unknown>>): SitemapItem[] {
  const items: SitemapItem[] = [];
  for (const row of rows) {
    const id = typeof row.id === "string" ? row.id.trim() : "";
    if (!id) continue;
    const updatedAt = typeof row.updated_at === "string" && row.updated_at.trim() ? row.updated_at.trim() : null;
    items.push({ id, updated_at: updatedAt });
  }
  return items;
}

export interface SitemapManifest {
  page_size: number;
  counts: Record<SitemapKind, number>;
  shards: Record<SitemapKind, number>;
}

export function buildSitemapManifest(counts: Record<SitemapKind, number>): SitemapManifest {
  const shards = {} as Record<SitemapKind, number>;
  for (const kind of SITEMAP_KINDS) {
    shards[kind] = Math.ceil(Math.max(0, counts[kind] || 0) / SITEMAP_PAGE_SIZE);
  }
  return { page_size: SITEMAP_PAGE_SIZE, counts: { ...counts }, shards };
}
