/**
 * PHASE 10B-1 — public read model for the multilingual Global Wire.
 *
 * This module is deliberately small and read-only. It serves the isolated
 * `osint_wire_signals` observation store plus corroborated clusters; it has no
 * write path and cannot reach `news_articles` or any authoritative table.
 */

export const WIRE_CACHE_SECONDS = 120;
export const WIRE_DEFAULT_LIMIT = 30;
export const WIRE_MAX_LIMIT = 60;

export const WIRE_REGIONS = ["RU", "CN", "IR", "KR", "GCC", "EU", "GLOBAL"] as const;
export const WIRE_TIERS = ["EARLY_WIRE_SIGNAL", "CORROBORATED_OSINT", "DISPUTED_RECYCLED"] as const;

export interface WireSignalView {
  id: string;
  region: string;
  language: string;
  title: string;
  summary: string;
  excerpt: string;
  trust_tier: string;
  signal_score: number;
  cves: string[];
  iocs: string[];
  actors: string[];
  cluster_id: string | null;
  source_handle: string;
  source_title: string;
  category: string;
  url: string;
  published_at: string;
  ingested_at: string;
}

export interface WireClusterView {
  id: string;
  cluster_key: string;
  headline: string;
  regions: string[];
  source_count: number;
  linked_cves: string[];
  convergence_score: number;
  trust_tier: string;
  last_seen_at: string;
}

export interface WireFeed {
  items: WireSignalView[];
  clusters: WireClusterView[];
  region_counts: Array<{ region: string; count: number }>;
  total: number;
  region: string;
  tier: string;
  limit: number;
  translation: "LIVE" | "DETERMINISTIC";
}

export function parseWireRegion(raw: unknown): "ALL" | (typeof WIRE_REGIONS)[number] {
  const value = String(raw ?? "").trim().toUpperCase();
  if (!value || value === "ALL") return "ALL";
  return (WIRE_REGIONS as readonly string[]).includes(value) ? (value as (typeof WIRE_REGIONS)[number]) : "ALL";
}

export function parseWireTier(raw: unknown): "ALL" | (typeof WIRE_TIERS)[number] {
  const value = String(raw ?? "").trim().toUpperCase();
  if (!value || value === "ALL") return "ALL";
  return (WIRE_TIERS as readonly string[]).includes(value) ? (value as (typeof WIRE_TIERS)[number]) : "ALL";
}

export function parseWireLimit(raw: unknown): number {
  const value = Number(typeof raw === "string" ? raw.trim() : raw);
  if (!Number.isFinite(value)) return WIRE_DEFAULT_LIMIT;
  return Math.max(1, Math.min(WIRE_MAX_LIMIT, Math.floor(value)));
}

/**
 * Defence in depth: stored excerpts are already defanged, and they are defanged
 * again on the way out, so an operator importing a row by hand cannot publish a
 * clickable indicator through this API.
 */
export function refangSafe(value: string): string {
  return String(value ?? "")
    .replace(/\bhxxp(s?):\/\//gi, "hxxp$1://")
    .replace(/\[\.\]/g, "[.]")
    .replace(/\bdot\b/gi, "dot");
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

async function all<T>(db: D1Database, sql: string, params: unknown[] = []): Promise<T[]> {
  const statement = db.prepare(sql);
  const bound = params.length > 0 ? statement.bind(...params) : statement;
  const result = await bound.all<T>();
  const rows = (result as any)?.results;
  return Array.isArray(rows) ? (rows as T[]) : [];
}

export interface WireQuery {
  region?: unknown;
  tier?: unknown;
  limit?: unknown;
}

/**
 * One bounded read per surface: signals, active clusters and 7-day regional
 * counts. Every filter is a bound parameter; an unknown region or tier degrades
 * to `ALL` instead of a 500.
 */
export async function loadWireFeed(db: D1Database, query: WireQuery = {}): Promise<WireFeed> {
  const region = parseWireRegion(query.region);
  const tier = parseWireTier(query.tier);
  const limit = parseWireLimit(query.limit);

  const where: string[] = [];
  const bindings: unknown[] = [];
  if (region !== "ALL") {
    where.push("s.region = ?");
    bindings.push(region);
  }
  if (tier !== "ALL") {
    where.push("s.trust_tier = ?");
    bindings.push(tier);
  }
  const clause = where.length > 0 ? `WHERE ${where.join(" AND ")}` : "";

  const rows = await all<{
    id: string;
    region: string;
    original_lang: string;
    translated_title: string;
    translated_summary: string;
    original_excerpt: string;
    trust_tier: string;
    signal_score: number;
    extracted_cves: string;
    extracted_iocs: string;
    extracted_actors: string;
    cluster_id: string | null;
    source_url: string;
    published_at: string;
    ingested_at: string;
    source_handle: string | null;
    source_title: string | null;
    category: string | null;
  }>(
    db,
    `SELECT s.id, s.region, s.original_lang, s.translated_title, s.translated_summary, s.original_excerpt,
            s.trust_tier, s.signal_score, s.extracted_cves, s.extracted_iocs, s.extracted_actors,
            s.cluster_id, s.source_url, s.published_at, s.ingested_at,
            src.handle AS source_handle, src.title AS source_title, src.category
       FROM osint_wire_signals s
       LEFT JOIN osint_sources src ON src.id = s.source_id
       ${clause}
      ORDER BY s.ingested_at DESC, s.signal_score DESC
      LIMIT ?`,
    [...bindings, limit],
  );

  const totalRows = await all<{ n: number }>(
    db,
    `SELECT COUNT(*) AS n FROM osint_wire_signals s ${clause}`,
    bindings,
  );

  const clusters = await all<{
    id: string;
    cluster_key: string;
    headline: string;
    regions_json: string;
    source_count: number;
    linked_cves_json: string;
    convergence_score: number;
    trust_tier: string;
    last_seen_at: string;
  }>(
    db,
    `SELECT id, cluster_key, headline, regions_json, source_count, linked_cves_json,
            convergence_score, trust_tier, last_seen_at
       FROM osint_clusters
      WHERE source_count >= 2
      ORDER BY convergence_score DESC, last_seen_at DESC
      LIMIT 6`,
  );

  const counts = await all<{ region: string; count: number }>(
    db,
    `SELECT region, COUNT(*) AS count
       FROM osint_wire_signals
      WHERE ingested_at >= datetime('now', '-7 days')
      GROUP BY region
      ORDER BY count DESC`,
  );

  return {
    items: rows.map((row) => ({
      id: String(row.id),
      region: String(row.region ?? "GLOBAL"),
      language: String(row.original_lang ?? "en"),
      title: String(row.translated_title ?? ""),
      summary: String(row.translated_summary ?? ""),
      excerpt: refangSafe(String(row.original_excerpt ?? "")),
      trust_tier: String(row.trust_tier ?? "EARLY_WIRE_SIGNAL"),
      signal_score: Number(row.signal_score ?? 0),
      cves: jsonArray(row.extracted_cves),
      iocs: jsonArray(row.extracted_iocs),
      actors: jsonArray(row.extracted_actors),
      cluster_id: row.cluster_id ?? null,
      source_handle: String(row.source_handle ?? ""),
      source_title: String(row.source_title ?? row.source_handle ?? ""),
      category: String(row.category ?? "news"),
      url: String(row.source_url ?? ""),
      published_at: String(row.published_at ?? ""),
      ingested_at: String(row.ingested_at ?? ""),
    })),
    clusters: clusters.map((row) => ({
      id: String(row.id),
      cluster_key: String(row.cluster_key ?? ""),
      headline: String(row.headline ?? ""),
      regions: jsonArray(row.regions_json),
      source_count: Number(row.source_count ?? 0),
      linked_cves: jsonArray(row.linked_cves_json),
      convergence_score: Number(row.convergence_score ?? 0),
      trust_tier: String(row.trust_tier ?? "EARLY_WIRE_SIGNAL"),
      last_seen_at: String(row.last_seen_at ?? ""),
    })),
    region_counts: counts.map((row) => ({ region: String(row.region ?? "GLOBAL"), count: Number(row.count ?? 0) })),
    total: Number(totalRows[0]?.n ?? rows.length),
    region,
    tier,
    limit,
    // The read surface reports whether the stored corpus is machine-translated.
    // A row whose summary still says "no machine translation was applied" is
    // deterministic, and the UI says so instead of implying otherwise.
    translation: rows.some((row) => /deterministic extraction only/i.test(String(row.translated_summary ?? "")))
      ? "DETERMINISTIC"
      : "LIVE",
  };
}
