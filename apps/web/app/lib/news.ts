import { readJsonResult, type ReadResult } from "./fetchResult";
import { apiFetch, getApiBaseUrl } from "./siteConfig";

/**
 * PHASE 9B — neural newsroom client.
 *
 * Transport only: the API owns the read model. `readJsonResult` keeps the
 * 410/404/503 distinction intact so a transient upstream failure can never be
 * cached as a missing briefing.
 */

export interface NewsSummary {
  slug: string;
  title: string;
  verdict: string;
  summary: string;
  category: string;
  severity: string;
  source_name: string;
  published_at: string;
}

export interface NewsMention {
  entity_type: string;
  entity_slug: string;
  entity_label: string;
  in_catalog: number;
  href: string | null;
}

export interface RelatedBriefing {
  slug: string;
  title: string;
  category: string;
  severity: string;
  published_at: string;
  verdict: string;
}

export interface NewsArticle extends NewsSummary {
  id: string;
  source_url: string;
  ingested_at: string;
  body_sections: Array<{ heading: string; paragraphs: string[] }>;
  graph_enrichment: {
    cves?: Array<{
      cve_id: string;
      cvss_score: number | null;
      epss_score: number | null;
      cisa_kev?: boolean;
      kev_due_date?: string | null;
      poc_count?: number;
    }>;
    techniques?: string[];
    malware_families?: string[];
    actors?: string[];
    hunting?: { kql: string; spl: string };
  };
  faq: Array<{ question: string; answer: string }>;
  mentions: NewsMention[];
  related_briefings: RelatedBriefing[];
}

export interface NewsTelemetry {
  published_briefings: number;
  linked_entities: number;
  sources_tracked: number;
  last_ingest: string | null;
}

export const NEWS_CATEGORIES = [
  { value: "", label: "All" },
  { value: "EXPLOITATION", label: "Exploitation" },
  { value: "VULNERABILITY", label: "Vulnerability" },
  { value: "MALWARE", label: "Malware" },
  { value: "THREAT_ACTOR", label: "Threat Actor" },
  { value: "SUPPLY_CHAIN", label: "Supply Chain" },
  { value: "ADVISORY", label: "Advisory" },
] as const;

/**
 * PHASE 9C — the stored enum is not a display label.
 *
 * `SUPPLY_CHAIN` is a database value; a reader must never see it. The map is the
 * single source of truth for both the filter strip and the card metadata line.
 */
export function categoryLabel(value: string): string {
  const raw = String(value ?? "").trim().toUpperCase();
  if (!raw) return "Advisory";
  const match = NEWS_CATEGORIES.find((entry) => entry.value === raw);
  if (match) return match.label;
  return raw
    .split("_")
    .filter(Boolean)
    .map((part) => part.charAt(0) + part.slice(1).toLowerCase())
    .join(" ");
}

const READ_INIT = {
  headers: { accept: "application/json" },
  next: { revalidate: 300 },
} as unknown as RequestInit;

export async function getNewsIndex(params: {
  category?: string;
  q?: string;
  limit?: number;
} = {}): Promise<ReadResult<{ items: NewsSummary[]; total: number }>> {
  const query = new URLSearchParams();
  if (params.category) query.set("category", params.category);
  if (params.q) query.set("q", params.q);
  query.set("limit", String(params.limit ?? 30));
  return readJsonResult(`${getApiBaseUrl()}/news?${query.toString()}`, READ_INIT, apiFetch as typeof fetch);
}

export async function getNewsTelemetry(): Promise<ReadResult<NewsTelemetry>> {
  return readJsonResult(`${getApiBaseUrl()}/news/telemetry`, READ_INIT, apiFetch as typeof fetch);
}

export async function getNewsArticle(slug: string): Promise<ReadResult<NewsArticle>> {
  const result = await readJsonResult<{ data?: NewsArticle }>(
    `${getApiBaseUrl()}/news/${encodeURIComponent(slug)}`,
    READ_INIT,
    apiFetch as typeof fetch,
  );
  if (result.state !== "ok") return result as ReadResult<NewsArticle>;
  // The API answers `{ status, data }`; a missing payload is a transport error,
  // never a missing briefing.
  return result.data?.data
    ? { state: "ok", data: result.data.data, status: result.status }
    : { state: "error", data: null, status: result.status, error: "Empty briefing payload" };
}

/**
 * Reverse neural feed for a page whose own payload does not carry it (the CVE
 * projection). Reads the newsroom's entity filter so the same index answers it.
 */
export async function getRelatedNewsForEntity(
  entityType: string,
  entitySlug: string,
  limit = 5,
): Promise<RelatedBriefing[]> {
  const query = new URLSearchParams({
    entity_type: entityType,
    entity_slug: entitySlug,
    limit: String(limit),
  });
  const result = await readJsonResult<{ items?: RelatedBriefing[] }>(
    `${getApiBaseUrl()}/news?${query.toString()}`,
    READ_INIT,
    apiFetch as typeof fetch,
  );
  return result.state === "ok" && Array.isArray(result.data?.items) ? result.data.items : [];
}

export function newsHref(slug: string): string {
  return `/news/${encodeURIComponent(slug)}`;
}

/**
 * PHASE 10A — the deterministic 1200×675 branded cover for a briefing.
 * Rendered on demand from the article's own metadata; cached at the edge.
 */
export function newsCoverUrl(slug: string): string {
  return `/api/news-cover/${encodeURIComponent(slug)}`;
}

export function formatNewsDate(value: string): string {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return value;
  return date.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric", timeZone: "UTC" });
}

export function severityAccent(severity: string): string {
  switch (String(severity ?? "").toUpperCase()) {
    case "CRITICAL":
      return "var(--color-danger, #ff3b30)";
    case "HIGH":
      return "var(--color-accent, #ff5500)";
    case "MEDIUM":
      return "var(--color-warning, #ffb020)";
    default:
      return "var(--color-muted, #8a8a96)";
  }
}
