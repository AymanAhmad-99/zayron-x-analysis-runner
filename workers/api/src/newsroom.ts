/**
 * PHASE 9B — newsroom read model.
 *
 * Two indexed reads power the whole neural newsroom: the article index
 * (`news_articles`) and the bidirectional mention index (`entity_mentions`).
 * Nothing here reformats a stored fact: the verdict, body sections, FAQ and
 * graph snapshot are served exactly as the ingest pass published them.
 */

export const NEWS_CACHE_SECONDS = 300;
export const NEWS_RELATED_LIMIT = 5;

export interface NewsSummaryRow {
  slug: string;
  title: string;
  verdict: string;
  summary: string;
  category: string;
  severity: string;
  source_name: string;
  published_at: string;
}

export interface NewsMentionRow {
  entity_type: string;
  entity_slug: string;
  entity_label: string;
  in_catalog: number;
}

export interface NewsArticleRow extends NewsSummaryRow {
  id: string;
  fingerprint: string;
  source_url: string;
  ingested_at: string;
  body_sections_json: string;
  graph_enrichment_json: string;
  faq_json: string;
  status: string;
}

export interface RelatedBriefing {
  slug: string;
  title: string;
  category: string;
  severity: string;
  published_at: string;
  verdict: string;
  shared_entities?: number;
}

const NEWS_CATEGORIES = new Set([
  "VULNERABILITY",
  "EXPLOITATION",
  "MALWARE",
  "THREAT_ACTOR",
  "SUPPLY_CHAIN",
  "ADVISORY",
]);

/** `?limit=1..50`, default 20. Never throws. */
export function parseNewsLimit(raw: unknown, fallback = 20): number {
  const value = Number(typeof raw === "string" ? raw.trim() : raw);
  if (!Number.isFinite(value)) return fallback;
  return Math.max(1, Math.min(50, Math.floor(value)));
}

export function parseNewsOffset(raw: unknown): number {
  const value = Number(typeof raw === "string" ? raw.trim() : raw);
  if (!Number.isFinite(value) || value <= 0) return 0;
  return Math.min(5000, Math.floor(value));
}

/** Unknown category is an empty filter result, never a 500. */
export function normalizeNewsCategory(raw: unknown): string | null {
  const value = String(raw ?? "").trim().toUpperCase();
  return NEWS_CATEGORIES.has(value) ? value : null;
}

function jsonArray(value: unknown): unknown[] {
  if (typeof value !== "string" || value.trim() === "") return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/**
 * Verified internal route for a mention. `null` means "no link" — an entity that
 * is not in the live catalog must never become a 404 link.
 */
export function mentionHref(mention: { entity_type: string; entity_slug: string; in_catalog: number }): string | null {
  if (Number(mention.in_catalog) !== 1) return null;
  const slug = String(mention.entity_slug ?? "").trim();
  if (!slug) return null;
  switch (mention.entity_type) {
    case "cve":
      return `/intelligence/vulnerabilities/${encodeURIComponent(slug)}`;
    case "malware_family":
      return `/intelligence/malware/families/${encodeURIComponent(slug)}`;
    case "actor":
      return `/intelligence/threat-actors/${encodeURIComponent(slug)}`;
    case "campaign":
      return `/intelligence/campaigns/${encodeURIComponent(slug)}`;
    case "technique":
      return `/intelligence/techniques/${encodeURIComponent(slug)}`;
    case "vendor":
      return `/intelligence/vendors/${encodeURIComponent(slug)}`;
    case "malware_advisory":
      return `/intelligence/malware/advisories/${encodeURIComponent(slug)}`;
    default:
      return null;
  }
}

async function all<T>(db: D1Database, sql: string, params: unknown[] = []): Promise<T[]> {
  const statement = db.prepare(sql);
  const bound = params.length > 0 ? statement.bind(...params) : statement;
  const result = await bound.all<T>();
  const rows = (result as any)?.results;
  return Array.isArray(rows) ? (rows as T[]) : [];
}

export interface NewsIndexParams {
  category?: unknown;
  entity_type?: unknown;
  entity_slug?: unknown;
  q?: unknown;
  limit?: unknown;
  offset?: unknown;
}

export async function loadNewsIndex(
  db: D1Database,
  params: NewsIndexParams = {},
): Promise<{ items: NewsSummaryRow[]; total: number; limit: number; offset: number }> {
  const limit = parseNewsLimit(params.limit);
  const offset = parseNewsOffset(params.offset);
  const where: string[] = ["n.status = 'PUBLISHED'"];
  const bindings: unknown[] = [];

  const category = normalizeNewsCategory(params.category);
  if (category) {
    where.push("n.category = ?");
    bindings.push(category);
  }

  const entityType = String(params.entity_type ?? "").trim().toLowerCase();
  const entitySlug = String(params.entity_slug ?? "").trim();
  if (entityType && entitySlug) {
    where.push(
      "EXISTS (SELECT 1 FROM entity_mentions m WHERE m.news_id = n.id AND m.entity_type = ? AND m.entity_slug = ?)",
    );
    bindings.push(entityType, entitySlug);
  }

  const query = String(params.q ?? "").trim();
  if (query) {
    where.push("(n.title LIKE ? OR n.summary LIKE ? OR n.verdict LIKE ?)");
    const like = `%${query.slice(0, 80)}%`;
    bindings.push(like, like, like);
  }

  const clause = where.join(" AND ");
  const countRows = await all<{ n: number }>(db, `SELECT COUNT(*) AS n FROM news_articles n WHERE ${clause}`, bindings);
  const total = Number(countRows[0]?.n ?? 0);
  const items = await all<NewsSummaryRow>(
    db,
    `SELECT n.slug, n.title, n.verdict, n.summary, n.category, n.severity, n.source_name, n.published_at
       FROM news_articles n
      WHERE ${clause}
      ORDER BY n.published_at DESC
      LIMIT ? OFFSET ?`,
    [...bindings, limit, offset],
  );
  return { items, total, limit, offset };
}

export interface NewsArticlePayload extends Omit<NewsArticleRow, "body_sections_json" | "graph_enrichment_json" | "faq_json"> {
  body_sections: unknown[];
  graph_enrichment: Record<string, unknown>;
  faq: unknown[];
  mentions: Array<NewsMentionRow & { href: string | null }>;
  related_briefings: RelatedBriefing[];
}

export async function loadNewsArticle(db: D1Database, slug: string): Promise<NewsArticlePayload | null> {
  const clean = String(slug ?? "").trim();
  if (!clean) return null;
  const rows = await all<NewsArticleRow>(
    db,
    `SELECT id, slug, fingerprint, title, verdict, summary, category, severity, source_name, source_url,
            published_at, ingested_at, body_sections_json, graph_enrichment_json, faq_json, status
       FROM news_articles WHERE slug = ? AND status = 'PUBLISHED' LIMIT 1`,
    [clean],
  );
  const row = rows[0];
  if (!row) return null;

  const mentions = await all<NewsMentionRow>(
    db,
    `SELECT entity_type, entity_slug, entity_label, in_catalog
       FROM entity_mentions WHERE news_id = ?
      ORDER BY CASE entity_type WHEN 'cve' THEN 0 WHEN 'actor' THEN 1 WHEN 'malware_family' THEN 2
                               WHEN 'technique' THEN 3 WHEN 'vendor' THEN 4 ELSE 5 END, entity_label ASC`,
    [row.id],
  );

  const related = await all<RelatedBriefing>(
    db,
    `SELECT n.slug, n.title, n.category, n.severity, n.published_at, n.verdict,
            COUNT(*) AS shared_entities
       FROM entity_mentions a
       JOIN entity_mentions b
         ON b.entity_type = a.entity_type AND b.entity_slug = a.entity_slug AND b.news_id <> a.news_id
       JOIN news_articles n ON n.id = b.news_id AND n.status = 'PUBLISHED'
      WHERE a.news_id = ? AND a.in_catalog = 1 AND b.in_catalog = 1
      GROUP BY n.id
      ORDER BY shared_entities DESC, n.published_at DESC
      LIMIT ?`,
    [row.id, NEWS_RELATED_LIMIT],
  );

  const graph = jsonArray(row.graph_enrichment_json);
  return {
    ...row,
    body_sections: jsonArray(row.body_sections_json),
    graph_enrichment: (graph.length > 0 ? graph[0] : {}) as Record<string, unknown>,
    faq: jsonArray(row.faq_json),
    mentions: mentions.map((mention) => ({ ...mention, href: mentionHref(mention) })),
    related_briefings: related,
  };
}

/**
 * Reverse neural feed: the newest briefings that mention one entity. Used by the
 * actor, malware-family, technique and CVE detail endpoints.
 */
export async function loadRelatedNews(
  db: D1Database,
  entityType: string,
  entitySlug: string,
  limit = NEWS_RELATED_LIMIT,
): Promise<RelatedBriefing[]> {
  const type = String(entityType ?? "").trim().toLowerCase();
  const slug = String(entitySlug ?? "").trim();
  if (!type || !slug) return [];
  return all<RelatedBriefing>(
    db,
    `SELECT n.slug, n.title, n.category, n.severity, n.published_at, n.verdict
       FROM entity_mentions m
       JOIN news_articles n ON n.id = m.news_id AND n.status = 'PUBLISHED'
      WHERE m.entity_type = ? AND m.entity_slug = ?
      ORDER BY n.published_at DESC
      LIMIT ?`,
    [type, slug, Math.max(1, Math.min(20, limit))],
  );
}

export async function loadNewsTelemetry(db: D1Database): Promise<{
  published_briefings: number;
  linked_entities: number;
  sources_tracked: number;
  last_ingest: string | null;
}> {
  const rows = await all<{
    published_briefings: number;
    linked_entities: number;
    sources_tracked: number;
    last_ingest: string | null;
  }>(
    db,
    `SELECT (SELECT COUNT(*) FROM news_articles WHERE status = 'PUBLISHED') AS published_briefings,
            (SELECT COUNT(*) FROM entity_mentions) AS linked_entities,
            (SELECT COUNT(DISTINCT source_name) FROM news_articles) AS sources_tracked,
            (SELECT MAX(ingested_at) FROM news_articles) AS last_ingest`,
  );
  const row = rows[0];
  return {
    published_briefings: Number(row?.published_briefings ?? 0),
    linked_entities: Number(row?.linked_entities ?? 0),
    sources_tracked: Number(row?.sources_tracked ?? 0),
    last_ingest: row?.last_ingest ?? null,
  };
}
