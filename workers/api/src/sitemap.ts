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
/**
 * PHASE 11-SEO-RECOVERY — High-signal curation filter for `vulnerabilities-*.xml`.
 *
 * Keeps all remaining CVE detail pages 200 OK & `index, follow` (no mass
 * `noindex`) while curating the submitted sitemap exclusively to enriched or
 * actively weaponized CVEs: CISA KEV, tracked PoCs, verified detection rules,
 * linked MITRE threat actors/campaigns, or published Neural Newsroom briefings.
 */
export const CURATED_VULNERABILITY_SITEMAP_WHERE = `provenance_state = 'AUTHORITATIVE_VERIFIED'
  AND cve_id IS NOT NULL
  AND cve_id <> ''
  AND (
    is_exploited_in_wild = 1
    OR (kev_due_date IS NOT NULL AND TRIM(kev_due_date) <> '')
    OR EXISTS (SELECT 1 FROM cve_pocs p WHERE p.cve_id = vulnerabilities.cve_id)
    OR EXISTS (SELECT 1 FROM detection_rules d WHERE d.kind = 'cve' AND d.match_key = vulnerabilities.cve_id)
    OR EXISTS (SELECT 1 FROM threat_actors a WHERE EXISTS (SELECT 1 FROM json_each(a.cves_json) WHERE UPPER(value) = vulnerabilities.cve_id))
    OR EXISTS (SELECT 1 FROM threat_campaigns c WHERE EXISTS (SELECT 1 FROM json_each(c.cves_json) WHERE UPPER(value) = vulnerabilities.cve_id))
    OR EXISTS (
      SELECT 1 FROM entity_mentions m
      JOIN news_articles n ON n.id = m.news_id AND n.status = 'PUBLISHED'
      WHERE m.entity_type = 'cve' AND UPPER(m.entity_slug) = vulnerabilities.cve_id
    )
  )`;

export function sitemapRowsQuery(kind: SitemapKind, tokens: string[], limit: number, offset: number): SitemapQuery {
  if (kind === "vulnerabilities") {
    void tokens;
    return {
      sql: `SELECT cve_id AS id,
          COALESCE(NULLIF(TRIM(modified_at), ''), NULLIF(TRIM(published_at), '')) AS updated_at
        FROM vulnerabilities
        WHERE ${CURATED_VULNERABILITY_SITEMAP_WHERE}
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
        WHERE ${CURATED_VULNERABILITY_SITEMAP_WHERE}`,
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
