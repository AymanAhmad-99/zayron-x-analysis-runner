/**
 * Wave 4A — bounded `/api/v1/feed` query construction.
 *
 * The feed filter accepts `q` and runs it as an unindexed LIKE scan against
 * `intelligence_events`, so both the query length and the page size must be
 * bounded before the SQL is built. The row query and the COUNT query share the
 * exact same WHERE clause, so `meta.total` is the real match count instead of
 * the number of rows on the current page.
 *
 * Kept as a pure module (no Env, no bindings) so the SQL contract is unit
 * testable without loading the Worker entrypoint.
 */

export const FEED_DEFAULT_LIMIT = 20;
export const FEED_MAX_LIMIT = 100;
export const FEED_MAX_QUERY_LENGTH = 120;

export type FeedFilterInput = {
  limit?: string | null;
  offset?: string | null;
  severity?: string | null;
  status?: string | null;
  type?: string | null;
  q?: string | null;
};

export type FeedQuery = {
  limit: number;
  offset: number;
  /** Bounded search term actually applied, or null when no filter was given. */
  search: string | null;
  rowsSql: string;
  rowsParams: unknown[];
  countSql: string;
  countParams: unknown[];
};

const FEED_COLUMNS = `
            e.id, e.type, e.title, e.summary, e.severity, e.confidence, e.status,
            e.content_hash, e.first_seen_at, e.last_updated_at, e.entities_json, e.mitre_matrix,
            e.created_at, e.updated_at`;

export function buildFeedQuery(input: FeedFilterInput): FeedQuery {
  const parsedLimit = Number(input.limit);
  const limit = Math.min(
    Math.max(Number.isFinite(parsedLimit) && parsedLimit > 0 ? Math.floor(parsedLimit) : FEED_DEFAULT_LIMIT, 1),
    FEED_MAX_LIMIT,
  );
  const parsedOffset = Number(input.offset);
  const offset = Number.isFinite(parsedOffset) && parsedOffset > 0 ? Math.floor(parsedOffset) : 0;

  const conditions: string[] = [];
  const filterParams: unknown[] = [];

  const severity = (input.severity || '').trim().toLowerCase();
  if (severity) {
    conditions.push('e.severity = ?');
    filterParams.push(severity);
  }
  const status = (input.status || '').trim().toUpperCase();
  if (status) {
    conditions.push('e.status = ?');
    filterParams.push(status);
  }
  const type = (input.type || '').trim();
  if (type) {
    conditions.push('e.type = ?');
    filterParams.push(type);
  }

  const rawSearch = (input.q || '').trim();
  const search = rawSearch ? rawSearch.slice(0, FEED_MAX_QUERY_LENGTH) : null;
  if (search) {
    conditions.push('(e.title LIKE ? OR e.summary LIKE ?)');
    filterParams.push(`%${search}%`, `%${search}%`);
  }

  const where = conditions.length > 0 ? ` AND ${conditions.join(' AND ')}` : '';

  return {
    limit,
    offset,
    search,
    rowsSql: `SELECT ${FEED_COLUMNS}\n          FROM intelligence_events e\n          WHERE 1=1${where}\n          ORDER BY e.created_at DESC LIMIT ? OFFSET ?`,
    rowsParams: [...filterParams, limit, offset],
    countSql: `SELECT COUNT(*) AS total FROM intelligence_events e WHERE 1=1${where}`,
    countParams: filterParams,
  };
}

/** True when the request carries a non-empty search term for the feed. */
export function hasFeedSearchQuery(url: URL): boolean {
  return (url.searchParams.get('q') ?? '').trim().length > 0;
}