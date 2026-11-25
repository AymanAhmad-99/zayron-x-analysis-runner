/**
 * PHASE 7B — edge-cached IOC read surface (`/api/v1/iocs/*`).
 *
 * Every function here is a thin D1 projection. Authorization, rate limiting and
 * cache headers are decided by `security.ts` / `edgeCache.ts`; this module only
 * answers the question that was asked.
 *
 * The EDL gate (`status = 'ACTIVE'` AND `confidence >= 85`) is applied IN SQL as
 * well as in the formatter, so a caller cannot widen it with a query parameter.
 */

import {
  EDL_MIN_CONFIDENCE,
  canonicalType,
  defangIndicator,
  isAllowlistedDomain,
  isPrivateOrReservedIp,
  normalizeIndicator,
  refangIndicator,
  toCsv,
  toEdlText,
  toStixBundle,
  type IocRecord,
  type IocType,
} from '@zayron/intelligence';

export const IOC_FEED_MAX_LIMIT = 500;
export const EDL_PREVIEW_MAX_LINES = 25;

export type IocStatus = 'ACTIVE' | 'EXPIRED' | 'NOT_FOUND';

export interface IocRow {
  id: string;
  type: string;
  normalized_value: string;
  confidence: number;
  status: string;
  seen_count: number;
  sources_json: string;
  family: string | null;
  asn: string | null;
  asn_name: string | null;
  country: string | null;
  expires_at: string | null;
  radar_enriched_at: string | null;
  created_at?: string;
  updated_at?: string;
}

function parseSources(raw: string | null | undefined): string[] {
  try {
    const parsed = JSON.parse(String(raw || '[]'));
    return Array.isArray(parsed) ? parsed.map((v) => String(v)) : [];
  } catch {
    return [];
  }
}

function toRecord(row: IocRow): IocRecord {
  return {
    type: row.type,
    value: row.normalized_value,
    confidence: Number(row.confidence) || 0,
    family: row.family,
    sources: parseSources(row.sources_json),
    firstSeen: row.created_at ?? null,
    lastSeen: row.updated_at ?? null,
    asn: row.asn,
    country: row.country,
    status: row.status,
  };
}

/**
 * A stored indicator is only "clean" if it still passes today's allowlist.
 * The shield at ingest time is the primary control; this is the second.
 */
function isCleanRow(row: { type: string; normalized_value: string }): boolean {
  const type = canonicalType(row.type);
  if (type === 'ip' || type === 'cidr') return !isPrivateOrReservedIp(row.normalized_value.split('/')[0]);
  if (type === 'domain') return !isAllowlistedDomain(row.normalized_value);
  if (type === 'url') {
    try {
      const host = new URL(row.normalized_value).hostname;
      return !isAllowlistedDomain(host);
    } catch {
      return true;
    }
  }
  return true;
}

// ── stats ────────────────────────────────────────────────────────────────────

export interface IocStats {
  active_total: number;
  active_by_type: Record<string, number>;
  top_families_24h: Array<{ family: string; count: number }>;
  openssf_dossiers: number;
  malware_reports_total: number;
  edl_ready: number;
  last_ingest_at: string | null;
  latest_radar_pulse: { pulse_date: string; created_at: string | null } | null;
  generated_at: string;
}

export async function buildIocStats(db: D1Database): Promise<IocStats> {
  const [typeRows, familyRows, malwareRows, edlRow, lastRow, pulseRow] = await Promise.all([
    db
      .prepare(`SELECT type, COUNT(*) AS count FROM iocs WHERE status = 'ACTIVE' GROUP BY type ORDER BY count DESC`)
      .all<{ type: string; count: number }>(),
    db
      .prepare(
        `SELECT family, COUNT(*) AS count FROM iocs
          WHERE status = 'ACTIVE' AND family IS NOT NULL AND family <> ''
            AND updated_at >= datetime('now', '-1 day')
          GROUP BY family ORDER BY count DESC LIMIT 5`,
      )
      .all<{ family: string; count: number }>(),
    db
      .prepare(
        `SELECT
           SUM(CASE WHEN source = 'openssf-osv' THEN 1 ELSE 0 END) AS openssf,
           COUNT(*) AS total
         FROM malware_reports`,
      )
      .first<{ openssf: number; total: number }>(),
    db
      .prepare(`SELECT COUNT(*) AS count FROM iocs WHERE status = 'ACTIVE' AND confidence >= ?`)
      .bind(EDL_MIN_CONFIDENCE)
      .first<{ count: number }>(),
    db.prepare(`SELECT MAX(updated_at) AS last_at FROM iocs`).first<{ last_at: string | null }>(),
    db
      .prepare(`SELECT pulse_date, created_at FROM radar_pulses ORDER BY pulse_date DESC LIMIT 1`)
      .first<{ pulse_date: string; created_at: string }>(),
  ]).catch(() => [null, null, null, null, null, null] as any);

  const activeByType: Record<string, number> = {};
  let activeTotal = 0;
  for (const row of (typeRows as any)?.results ?? []) {
    activeByType[String(row.type)] = Number(row.count) || 0;
    activeTotal += Number(row.count) || 0;
  }

  return {
    active_total: activeTotal,
    active_by_type: activeByType,
    top_families_24h: ((familyRows as any)?.results ?? []).map((row: any) => ({
      family: String(row.family),
      count: Number(row.count) || 0,
    })),
    openssf_dossiers: Number(malwareRows?.openssf ?? 0) || 0,
    malware_reports_total: Number(malwareRows?.total ?? 0) || 0,
    edl_ready: Number(edlRow?.count ?? 0) || 0,
    last_ingest_at: lastRow?.last_at ?? null,
    latest_radar_pulse: pulseRow
      ? { pulse_date: String(pulseRow.pulse_date), created_at: pulseRow.created_at ?? null }
      : null,
    generated_at: new Date().toISOString(),
  };
}

// ── lookup ──────────────────────────────────────────────────────────────────

export interface IocLookupResult {
  query: string;
  status: IocStatus;
  found: boolean;
  data: (IocRecord & {
    id: string;
    defanged: string;
    seen_count: number;
    asn: string | null;
    asn_name: string | null;
    country: string | null;
    expires_at: string | null;
    radar_enriched_at: string | null;
  }) | null;
  candidates: Array<{ type: string; value: string }>;
}

/**
 * Look a value up regardless of which type it parses as. A defanged input
 * (`hxxp://`, `[.]`) is refanged first, because that is what an analyst pastes.
 */
export async function lookupIoc(db: D1Database, rawQuery: string): Promise<IocLookupResult> {
  const query = refangIndicator(String(rawQuery || '').trim());
  const candidates: Array<{ type: IocType; value: string }> = [];
  for (const type of ['ip', 'cidr', 'domain', 'url', 'sha256'] as IocType[]) {
    const value = normalizeIndicator(type, query);
    if (value) candidates.push({ type, value });
  }

  if (candidates.length === 0) {
    return { query, status: 'NOT_FOUND', found: false, data: null, candidates: [] };
  }

  const clauses = candidates.map(() => '(type = ? AND normalized_value = ?)').join(' OR ');
  const binds = candidates.flatMap((candidate) => [candidate.type, candidate.value]);
  const row = await db
    .prepare(
      `SELECT id, type, normalized_value, confidence, status, seen_count, sources_json, family,
              asn, asn_name, country, expires_at, radar_enriched_at, created_at, updated_at
         FROM iocs WHERE ${clauses}
         ORDER BY confidence DESC, updated_at DESC LIMIT 1`,
    )
    .bind(...binds)
    .first<IocRow>();

  if (!row) {
    return {
      query,
      status: 'NOT_FOUND',
      found: false,
      data: null,
      candidates: candidates.map((c) => ({ type: c.type, value: c.value })),
    };
  }

  const status: IocStatus = String(row.status).toUpperCase() === 'EXPIRED' ? 'EXPIRED' : 'ACTIVE';
  return {
    query,
    status,
    found: true,
    data: {
      ...toRecord(row),
      id: row.id,
      defanged: defangIndicator(row.normalized_value),
      seen_count: Number(row.seen_count) || 1,
      asn: row.asn,
      asn_name: row.asn_name,
      country: row.country,
      expires_at: row.expires_at,
      radar_enriched_at: row.radar_enriched_at,
    },
    candidates: candidates.map((c) => ({ type: c.type, value: c.value })),
  };
}

// ── feed ────────────────────────────────────────────────────────────────────

export interface IocFeedParams {
  type?: string | null;
  family?: string | null;
  minConfidence?: number;
  status?: string | null;
  limit?: number;
}

export interface IocFeedResult {
  rows: IocRow[];
  total: number;
  filters: { type: string | null; family: string | null; min_confidence: number; status: string; limit: number };
}

export function resolveFeedStatus(value: string | null | undefined): 'ACTIVE' | 'EXPIRED' | 'ANY' {
  const normalized = String(value || 'active').trim().toUpperCase();
  if (normalized === 'EXPIRED') return 'EXPIRED';
  if (normalized === 'ANY' || normalized === 'ALL') return 'ANY';
  return 'ACTIVE';
}

export async function queryIocFeed(db: D1Database, params: IocFeedParams = {}): Promise<IocFeedResult> {
  const limit = Math.max(1, Math.min(Number(params.limit) || IOC_FEED_MAX_LIMIT, IOC_FEED_MAX_LIMIT));
  const type = params.type ? canonicalType(params.type) : null;
  const status = resolveFeedStatus(params.status);
  const minConfidence = Math.max(0, Math.min(100, Number(params.minConfidence ?? 70) || 0));
  const family = params.family ? String(params.family).trim() : null;

  const where: string[] = [];
  const binds: unknown[] = [];
  if (type) {
    where.push('type = ?');
    binds.push(type);
  }
  if (status !== 'ANY') {
    where.push('status = ?');
    binds.push(status);
  }
  where.push('confidence >= ?');
  binds.push(minConfidence);
  if (family) {
    where.push('LOWER(COALESCE(family, \'\')) = ?');
    binds.push(family.toLowerCase());
  }
  const whereSql = where.length > 0 ? `WHERE ${where.join(' AND ')}` : '';

  const countRow = await db
    .prepare(`SELECT COUNT(*) AS total FROM iocs ${whereSql}`)
    .bind(...binds)
    .first<{ total: number }>();
  const rows = await db
    .prepare(
      `SELECT id, type, normalized_value, confidence, status, seen_count, sources_json, family,
              asn, asn_name, country, expires_at, radar_enriched_at, created_at, updated_at
         FROM iocs ${whereSql}
         ORDER BY confidence DESC, updated_at DESC LIMIT ?`,
    )
    .bind(...binds, limit)
    .all<IocRow>();

  return {
    rows: (rows.results || []).filter(isCleanRow),
    total: Number(countRow?.total ?? 0) || 0,
    filters: {
      type: type ?? null,
      family,
      min_confidence: minConfidence,
      status,
      limit,
    },
  };
}

/** Render a feed projection in the requested wire format. */
export function formatIocFeed(rows: IocRow[], format: string): { body: string; contentType: string } {
  const records = rows.map(toRecord);
  if (format === 'csv') return { body: toCsv(records), contentType: 'text/csv; charset=utf-8' };
  if (format === 'stix') {
    return {
      body: JSON.stringify(toStixBundle(records), null, 2),
      contentType: 'application/stix+json; version=2.1',
    };
  }
  return {
    body: JSON.stringify(
      {
        status: 'SUCCESS',
        count: rows.length,
        format: 'json',
        data: rows.map((row) => ({
          ...toRecord(row),
          id: row.id,
          defanged: defangIndicator(row.normalized_value),
          seen_count: Number(row.seen_count) || 1,
          asn_name: row.asn_name,
          expires_at: row.expires_at,
        })),
      },
      null,
      2,
    ),
    contentType: 'application/json; charset=utf-8',
  };
}

// ── EDL ─────────────────────────────────────────────────────────────────────

export const EDL_TYPES: Record<string, IocType> = {
  'ip.txt': 'ip',
  'domain.txt': 'domain',
  'url.txt': 'url',
  'cidr.txt': 'cidr',
};

export function resolveEdlType(segment: string): IocType | null {
  return EDL_TYPES[String(segment || '').trim().toLowerCase()] ?? null;
}

export async function buildEdl(
  db: D1Database,
  type: IocType,
  options: { limit?: number } = {},
): Promise<{ text: string; count: number; total: number }> {
  const limit = Math.max(1, Math.min(Number(options.limit) || IOC_FEED_MAX_LIMIT, IOC_FEED_MAX_LIMIT));
  const rows = await db
    .prepare(
      `SELECT id, type, normalized_value, confidence, status, seen_count, sources_json, family,
              asn, asn_name, country, expires_at, radar_enriched_at, created_at, updated_at
         FROM iocs
         WHERE type = ? AND status = 'ACTIVE' AND confidence >= ?
         ORDER BY confidence DESC, updated_at DESC
         LIMIT ?`,
    )
    .bind(type, EDL_MIN_CONFIDENCE, limit)
    .all<IocRow>();

  const clean = (rows.results || []).filter(isCleanRow);
  const text = toEdlText(clean.map(toRecord), limit);
  return { text, count: text ? text.trim().split('\n').length : 0, total: clean.length };
}

// ── detection rules (Phase 7C) ───────────────────────────────────────────────

export interface DetectionRuleRow {
  id: string;
  source: string;
  rule_id: string;
  kind: string;
  match_key: string;
  name: string;
  path: string;
  severity: string | null;
  repo: string;
  url: string;
  synced_at: string;
}

export interface DetectionRule {
  source: string;
  rule_id: string;
  name: string;
  path: string;
  severity: string | null;
  url: string;
}

const RULE_COLUMNS = 'id, source, rule_id, kind, match_key, name, path, severity, repo, url, synced_at';

function projectRule(row: DetectionRuleRow): DetectionRule {
  return {
    source: row.source,
    rule_id: row.rule_id,
    name: row.name,
    path: row.path,
    severity: row.severity,
    url: row.url,
  };
}

/**
 * Verified GitHub rule/template matches for ONE cve or ONE family.
 * Never synthesized: a row exists only because the rule file exists upstream.
 */
export async function queryDetectionRules(
  db: D1Database,
  query: { cve?: string | null; family?: string | null },
): Promise<{ cve: string | null; family: string | null; rules: DetectionRule[]; synced_at: string | null }> {
  const cve = String(query.cve || '').trim().toUpperCase();
  const family = String(query.family || '').trim().toLowerCase();
  if (!cve && !family) return { cve: null, family: null, rules: [], synced_at: null };

  const clauses: string[] = [];
  const binds: unknown[] = [];
  if (cve && /^CVE-\d{4}-\d{4,}$/.test(cve)) {
    clauses.push("(kind = 'cve' AND match_key = ?)");
    binds.push(cve);
  }
  if (family) {
    clauses.push("(kind = 'family' AND match_key = ?)");
    binds.push(family);
  }
  if (clauses.length === 0) return { cve: cve || null, family: family || null, rules: [], synced_at: null };

  const rows = await db
    .prepare(
      `SELECT ${RULE_COLUMNS} FROM detection_rules WHERE ${clauses.join(' OR ')}
        ORDER BY CASE source WHEN 'nuclei' THEN 0 ELSE 1 END, name ASC LIMIT 25`,
    )
    .bind(...binds)
    .all<DetectionRuleRow>();

  const rules = (rows.results || []).map(projectRule);
  const syncedAt = (rows.results || []).map((r) => r.synced_at).filter(Boolean).sort().pop() ?? null;
  return { cve: cve || null, family: family || null, rules, synced_at: syncedAt };
}

// ── malware family hubs (Phase 7C) ──────────────────────────────────────────

export function familySlug(value: string): string {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

export interface FamilySummary {
  family: string;
  slug: string;
  active_count: number;
  edl_ready: number;
  by_type: Record<string, number>;
  sources: string[];
  first_seen: string | null;
  last_seen: string | null;
  iocs: Array<{
    type: string;
    defanged: string;
    confidence: number;
    status: string;
    expires_at: string | null;
    sources: string[];
  }>;
  detection_rules: DetectionRule[];
}

let familyCache: { at: number; rows: Array<{ family: string; count: number }> } | null = null;

/** Distinct families with active indicators, cached in-isolate for 60s. */
export async function listIocFamilies(db: D1Database): Promise<Array<{ family: string; slug: string; active_count: number }>> {
  if (familyCache && Date.now() - familyCache.at < 60_000) {
    return familyCache.rows.map((row) => ({ ...row, slug: familySlug(row.family) }));
  }
  const rows = await db
    .prepare(
      `SELECT family, COUNT(*) AS count FROM iocs
        WHERE status = 'ACTIVE' AND family IS NOT NULL AND family <> ''
        GROUP BY family ORDER BY count DESC LIMIT 60`,
    )
    .all<{ family: string; count: number }>();
  const clean = (rows.results || [])
    .map((row) => ({ family: String(row.family), count: Number(row.count) || 0 }))
    .filter((row) => row.family.trim().length > 0);
  familyCache = { at: Date.now(), rows: clean };
  return clean.map((row) => ({ ...row, slug: familySlug(row.family), active_count: row.count } as any));
}

/** Resolve a slug against the live family list, then build the hub payload. */
export async function buildFamilySummary(db: D1Database, slug: string): Promise<FamilySummary | null> {
  const wanted = familySlug(slug);
  const families = await listIocFamilies(db);
  const match = families.find((entry) => (entry as any).slug === wanted);
  if (!match) return null;

  const rows = await db
    .prepare(
      `SELECT type, normalized_value, confidence, status, expires_at, sources_json, created_at, updated_at
         FROM iocs WHERE status = 'ACTIVE' AND LOWER(family) = LOWER(?)
         ORDER BY confidence DESC, updated_at DESC LIMIT 100`,
    )
    .bind(match.family)
    .all<{
      type: string;
      normalized_value: string;
      confidence: number;
      status: string;
      expires_at: string | null;
      sources_json: string;
      created_at: string | null;
      updated_at: string | null;
    }>();

  const all = rows.results || [];
  const byType: Record<string, number> = {};
  const sources = new Set<string>();
  let edlReady = 0;
  for (const row of all) {
    byType[row.type] = (byType[row.type] || 0) + 1;
    for (const source of parseSources(row.sources_json)) sources.add(source);
    if (Number(row.confidence) >= EDL_MIN_CONFIDENCE) edlReady += 1;
  }

  const detection = await queryDetectionRules(db, { family: match.family }).catch(() => ({ rules: [] as DetectionRule[] }));

  return {
    family: match.family,
    slug: wanted,
    active_count: all.length,
    edl_ready: edlReady,
    by_type: byType,
    sources: Array.from(sources).sort(),
    first_seen: all.map((r) => r.created_at).filter(Boolean).sort()[0] ?? null,
    last_seen: all.map((r) => r.updated_at).filter(Boolean).sort().pop() ?? null,
    // Public HTML consumes ONLY `defanged`. The raw value never leaves this
    // function into a rendered page.
    iocs: all.slice(0, 25).map((row) => ({
      type: row.type,
      defanged: defangIndicator(row.normalized_value),
      confidence: Number(row.confidence) || 0,
      status: row.status,
      expires_at: row.expires_at,
      sources: parseSources(row.sources_json),
    })),
    detection_rules: detection.rules,
  };
}
