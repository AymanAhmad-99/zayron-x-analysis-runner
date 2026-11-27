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

import { loadActorsForFamily, type MeshEntityRef } from './neuralMesh';
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
  /** PHASE 9A — hub slug when the stored family has a live family hub. */
  family_slug: string | null;
  /** PHASE 9A — top actors documented as using this family. */
  linked_actors: MeshEntityRef[];
  total_linked_actors: number;
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
    return {
      query,
      status: 'NOT_FOUND',
      found: false,
      data: null,
      candidates: [],
      family_slug: null,
      linked_actors: [],
      total_linked_actors: 0,
    };
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
      family_slug: null,
      linked_actors: [],
      total_linked_actors: 0,
    };
  }

  const status: IocStatus = String(row.status).toUpperCase() === 'EXPIRED' ? 'EXPIRED' : 'ACTIVE';
  // PHASE 9A — IOC → family hub → attributed actors. One bounded read, and a
  // failure here never turns a successful lookup into an error.
  const storedFamily = typeof row.family === 'string' && row.family.trim() ? row.family.trim() : null;
  const hubSlug = storedFamily ? familySlug(storedFamily) : null;
  const attribution = storedFamily && hubSlug
    ? await loadActorsForFamily(db, storedFamily, hubSlug, 8).catch(() => null)
    : null;
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
    family_slug: hubSlug,
    linked_actors: attribution?.actors ?? [],
    total_linked_actors: attribution?.total_linked_actors ?? 0,
  };
}

// ── feed ────────────────────────────────────────────────────────────────────

export interface IocFeedParams {
  type?: string | null;
  family?: string | null;
  minConfidence?: number;
  status?: string | null;
  limit?: number;
  /** PHASE 8A — incremental sync: only rows with `updated_at >= since`. */
  since?: string | null;
  /** PHASE 8A — offset pagination, clamped to a non-negative integer. */
  offset?: number | null;
}

export interface IocFeedResult {
  rows: IocRow[];
  total: number;
  nextOffset: number | null;
  filters: {
    type: string | null;
    family: string | null;
    min_confidence: number;
    status: string;
    limit: number;
    offset: number;
    since: string | null;
  };
}

/**
 * PHASE 8A — `?since=` normalization.
 *
 * D1 stores `updated_at` as `datetime('now')` → `YYYY-MM-DD HH:MM:SS`. A caller
 * sends ISO-8601 (`2026-11-01T00:00:00Z`), which is NOT lexicographically
 * comparable to that shape (`T` sorts after a space), so an unnormalized value
 * would silently match everything. Anything unparseable is rejected rather
 * than ignored: a bad checkpoint must not turn into a full re-pull.
 */
export function normalizeSinceParam(raw: string | null | undefined): { ok: boolean; value: string | null } {
  const text = String(raw ?? '').trim();
  if (!text) return { ok: true, value: null };
  const iso = text.includes('T') ? text : text.replace(' ', 'T');
  const withZone = /[Zz]$|[+-]\d{2}:?\d{2}$/.test(iso) ? iso : `${iso}Z`;
  const parsed = Date.parse(withZone);
  if (!Number.isFinite(parsed)) return { ok: false, value: null };
  return { ok: true, value: new Date(parsed).toISOString().slice(0, 19).replace('T', ' ') };
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
  const offset = Math.max(0, Math.floor(Number(params.offset) || 0));
  const since = normalizeSinceParam(params.since).value;

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
  // Incremental sync: `updated_at` is the checkpoint column an OpenCTI/MISP/
  // Splunk connector can safely resume from.
  if (since) {
    where.push('updated_at >= ?');
    binds.push(since);
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
         ORDER BY confidence DESC, updated_at DESC LIMIT ? OFFSET ?`,
    )
    .bind(...binds, limit, offset)
    .all<IocRow>();

  const clean = (rows.results || []).filter(isCleanRow);
  const total = Number(countRow?.total ?? 0) || 0;
  return {
    rows: clean,
    total,
    nextOffset: offset + clean.length < total ? offset + clean.length : null,
    filters: {
      type: type ?? null,
      family,
      min_confidence: minConfidence,
      status,
      limit,
      offset,
      since,
    },
  };
}

// ── bulk lookup (PHASE 8A) ──────────────────────────────────────────────────

export const IOC_BULK_MAX_ITEMS = 50;

export interface IocBulkMatch {
  input: string;
  type: string;
  value: string;
  defanged: string;
  confidence: number;
  family: string | null;
  family_slug: string | null;
  sources: string[];
  asn: string | null;
  asn_name: string | null;
  country: string | null;
  status: string;
}

export interface IocBulkResult {
  matched: IocBulkMatch[];
  unmatched: string[];
  summary: { requested: number; found: number; active: number };
  /** PHASE 9A — one attributed-actor card per distinct family in the batch. */
  linked_families: Array<{
    family: string;
    family_slug: string;
    actors: MeshEntityRef[];
    total_linked_actors: number;
  }>;
}

const BULK_SELECT = `SELECT id, type, normalized_value, confidence, status, seen_count, sources_json, family,
       asn, asn_name, country, expires_at, radar_enriched_at, created_at, updated_at
  FROM iocs WHERE `;

/**
 * Batched multi-indicator lookup.
 *
 * ONE `db.batch()` round trip: the candidate predicates are chunked only to stay
 * inside D1's bound-parameter ceiling (never one query per input), so a 50-item
 * request is a constant number of statements regardless of payload size.
 * Defanged input (`hxxp://`, `[.]`) is refanged before matching, exactly as a
 * single lookup does.
 */
export async function bulkLookupIocs(db: D1Database, raw: unknown): Promise<IocBulkResult> {
  const inputs = (Array.isArray(raw) ? raw : [])
    .map((value) => String(value ?? '').trim())
    .filter(Boolean);

  const candidates: Array<{ input: string; type: IocType; value: string }> = [];
  for (const input of inputs) {
    const refanged = refangIndicator(input);
    for (const type of ['ip', 'cidr', 'domain', 'url', 'sha256'] as IocType[]) {
      const value = normalizeIndicator(type, refanged);
      if (value) candidates.push({ input, type, value });
    }
  }

  const key = (type: string, value: string) => `${type}:${value}`;
  const found = new Map<string, IocRow>();

  if (candidates.length > 0) {
    // 2 bound values per predicate, capped at 80 parameters per statement.
    const chunkSize = 40;
    const statements: Array<ReturnType<D1Database['prepare']>> = [];
    for (let i = 0; i < candidates.length; i += chunkSize) {
      const chunk = candidates.slice(i, i + chunkSize);
      const clauses = chunk.map(() => '(type = ? AND normalized_value = ?)').join(' OR ');
      const binds = chunk.flatMap((candidate) => [candidate.type, candidate.value]);
      statements.push(
        db.prepare(`${BULK_SELECT}${clauses} ORDER BY confidence DESC, updated_at DESC LIMIT 200`).bind(...binds),
      );
    }
    const batched = await db.batch(statements);
    for (const result of batched as Array<{ results?: IocRow[] }>) {
      for (const row of result?.results ?? []) {
        if (!isCleanRow(row)) continue;
        const k = key(row.type, row.normalized_value);
        const existing = found.get(k);
        if (!existing || Number(row.confidence) > Number(existing.confidence)) found.set(k, row);
      }
    }
  }

  const matched: IocBulkMatch[] = [];
  const unmatched: string[] = [];
  const seenInputs = new Set<string>();
  for (const input of inputs) {
    if (seenInputs.has(input)) continue;
    seenInputs.add(input);
    const refanged = refangIndicator(input);
    let row: IocRow | undefined;
    for (const type of ['ip', 'cidr', 'domain', 'url', 'sha256'] as IocType[]) {
      const value = normalizeIndicator(type, refanged);
      if (!value) continue;
      const hit = found.get(key(type, value));
      if (hit) {
        row = hit;
        break;
      }
    }
    if (!row) {
      unmatched.push(input);
      continue;
    }
    matched.push({
      input,
      type: row.type,
      value: row.normalized_value,
      defanged: defangIndicator(row.normalized_value),
      confidence: Number(row.confidence) || 0,
      family: row.family,
      family_slug: typeof row.family === 'string' && row.family.trim() ? familySlug(row.family) : null,
      sources: parseSources(row.sources_json),
      asn: row.asn,
      asn_name: row.asn_name,
      country: row.country,
      status: String(row.status || '').toUpperCase(),
    });
  }

  const families = [...new Set(matched.map((entry) => entry.family).filter((value): value is string => Boolean(value)))].slice(0, 5);
  const linkedFamilies = (
    await Promise.all(
      families.map((family) =>
        loadActorsForFamily(db, family, familySlug(family), 6).catch(() => null),
      ),
    )
  )
    .filter((entry): entry is NonNullable<typeof entry> => Boolean(entry))
    .map((entry) => ({
      family: entry.family,
      family_slug: entry.family_slug,
      actors: entry.actors,
      total_linked_actors: entry.total_linked_actors,
    }));

  return {
    matched,
    unmatched,
    summary: {
      requested: seenInputs.size,
      found: matched.length,
      active: matched.filter((entry) => entry.status === 'ACTIVE').length,
    },
    linked_families: linkedFamilies,
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

export interface IocFamilyIndexEntry {
  family: string;
  slug: string;
  active_count: number;
  /** Most recent observation across the family's active indicators. */
  last_seen: string | null;
  /** Every feed that currently contributes an indicator to the family. */
  sources: string[];
  /** Verified Sigma rules whose filename names this family (never invented). */
  sigma_rules: number;
}

let familyCache: { at: number; rows: IocFamilyIndexEntry[] } | null = null;

/** Distinct families with active indicators, cached in-isolate for 60s. */
export async function listIocFamilies(db: D1Database): Promise<IocFamilyIndexEntry[]> {
  if (familyCache && Date.now() - familyCache.at < 60_000) {
    return familyCache.rows;
  }
  const rows = await db
    .prepare(
      `SELECT family, COUNT(*) AS count, MAX(updated_at) AS last_seen FROM iocs
        WHERE status = 'ACTIVE' AND family IS NOT NULL AND family <> ''
        GROUP BY family ORDER BY count DESC LIMIT 60`,
    )
    .all<{ family: string; count: number; last_seen: string | null }>();
  const clean = (rows.results || [])
    .map((row) => ({ family: String(row.family), count: Number(row.count) || 0, last_seen: row.last_seen ?? null }))
    .filter((row) => row.family.trim().length > 0);

  // Source badges: one bounded read reduced in JS, so the list stays one query.
  const sourceRows = await db
    .prepare(
      `SELECT family, sources_json FROM iocs
        WHERE status = 'ACTIVE' AND family IS NOT NULL AND family <> ''
        LIMIT 5000`,
    )
    .all<{ family: string; sources_json: string }>()
    .catch(() => ({ results: [] as Array<{ family: string; sources_json: string }> }));
  const sourcesByFamily = new Map<string, Set<string>>();
  for (const row of sourceRows.results || []) {
    const key = String(row.family).toLowerCase();
    const set = sourcesByFamily.get(key) ?? new Set<string>();
    for (const source of parseSources(row.sources_json)) set.add(source);
    sourcesByFamily.set(key, set);
  }

  // Sigma coverage: grouped rule counts keyed by the family the filename named.
  const sigmaRows = await db
    .prepare(
      `SELECT match_key, COUNT(*) AS count FROM detection_rules
        WHERE kind = 'family' GROUP BY match_key`,
    )
    .all<{ match_key: string; count: number }>()
    .catch(() => ({ results: [] as Array<{ match_key: string; count: number }> }));
  const sigmaByFamily = new Map<string, number>();
  for (const row of sigmaRows.results || []) {
    sigmaByFamily.set(String(row.match_key).toLowerCase(), Number(row.count) || 0);
  }

  const enriched: IocFamilyIndexEntry[] = clean.map((row) => ({
    family: row.family,
    slug: familySlug(row.family),
    active_count: row.count,
    last_seen: row.last_seen,
    sources: Array.from(sourcesByFamily.get(row.family.toLowerCase()) ?? []).sort(),
    sigma_rules: sigmaByFamily.get(row.family.toLowerCase()) ?? 0,
  }));
  familyCache = { at: Date.now(), rows: enriched };
  return enriched;
}

/** Resolve a slug against the live family list, then build the hub payload. */
export async function buildFamilySummary(db: D1Database, slug: string): Promise<FamilySummary | null> {
  const wanted = familySlug(slug);
  const families = await listIocFamilies(db);
  const match = families.find((entry) => entry.slug === wanted);
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

/* ── PHASE 9C — canonical malware-family resolution ─────────────────────────── */

export interface FamilyTechniqueRef {
  id: string;
  name: string;
  tactic: string;
}

export interface CanonicalFamilySummary extends FamilySummary {
  /** True when the hub is a canonical catalog profile with no live indicators. */
  canonical: true;
  description: string | null;
  techniques: FamilyTechniqueRef[];
}

export interface CanonicalFamilyHubEntry extends IocFamilyIndexEntry {
  canonical: true;
}

/**
 * PHASE 9C — the canonical `malware` catalog is the second half of the family
 * namespace.
 *
 * `iocs.family` only ever contains families that currently hold an active
 * indicator. `technique_edges` links instead to canonical `malware.slug` rows,
 * so a hub for a documented family without live C2 today (lumma, asyncrat,
 * mimikatz, medusa) used to 404 even though the technique mesh linked to it.
 * These helpers resolve that half of the namespace from stored facts only —
 * no indicator, count or technique is ever invented.
 */
export async function listCanonicalFamilyHubs(db: D1Database): Promise<CanonicalFamilyHubEntry[]> {
  const rows = await db
    .prepare(`SELECT slug, name, updated_at FROM malware ORDER BY name ASC LIMIT 200`)
    .all<{ slug: string; name: string; updated_at: string | null }>()
    .catch(() => ({ results: [] as Array<{ slug: string; name: string; updated_at: string | null }> }));
  const edgeRows = await db
    .prepare(
      `SELECT entity_slug, COUNT(*) AS edges FROM technique_edges
        WHERE entity_type = 'malware' GROUP BY entity_slug`,
    )
    .all<{ entity_slug: string; edges: number }>()
    .catch(() => ({ results: [] as Array<{ entity_slug: string; edges: number }> }));
  const edgeCounts = new Map<string, number>();
  for (const row of edgeRows.results || []) {
    edgeCounts.set(String(row.entity_slug).toLowerCase(), Number(row.edges) || 0);
  }
  return (rows.results || [])
    .map((row) => {
      const slug = familySlug(row.slug);
      if (!slug) return null;
      return {
        family: String(row.name ?? row.slug),
        slug,
        active_count: 0,
        last_seen: row.updated_at ?? null,
        sources: [],
        sigma_rules: edgeCounts.get(slug) ?? 0,
        canonical: true as const,
      };
    })
    .filter((entry): entry is CanonicalFamilyHubEntry => Boolean(entry));
}

/**
 * Resolve a slug against the canonical `malware` catalog.
 *
 * Returns `null` when the family is not catalogued, so the caller can answer a
 * real 404. A catalogued family always resolves — its `iocs` array is simply
 * empty and its counts are zero, which is the honest state, not a missing page.
 */
export async function buildCanonicalFamilySummary(
  db: D1Database,
  slug: string,
): Promise<CanonicalFamilySummary | null> {
  const wanted = familySlug(slug);
  const raw = String(slug ?? "").trim().toLowerCase();
  if (!wanted || !raw) return null;

  const row = await db
    .prepare(
      `SELECT name, slug, description, created_at, updated_at FROM malware
        WHERE LOWER(slug) = ? OR LOWER(name) = ? LIMIT 1`,
    )
    .bind(wanted, raw)
    .first<{
      name: string;
      slug: string;
      description: string | null;
      created_at: string | null;
      updated_at: string | null;
    }>();
  if (!row) return null;

  const canonicalSlug = familySlug(row.slug) || wanted;
  const techniqueRows = await db
    .prepare(
      `SELECT technique_id, technique_name, tactic FROM technique_edges
        WHERE entity_type = 'malware' AND entity_slug = ?
        ORDER BY technique_id ASC LIMIT 200`,
    )
    .bind(canonicalSlug)
    .all<{ technique_id: string; technique_name: string; tactic: string }>()
    .catch(() => ({ results: [] as Array<{ technique_id: string; technique_name: string; tactic: string }> }));
  const techniques: FamilyTechniqueRef[] = (techniqueRows.results || []).map((technique) => ({
    id: String(technique.technique_id),
    name: String(technique.technique_name ?? technique.technique_id),
    tactic: String(technique.tactic ?? "unmapped"),
  }));

  const detection = await queryDetectionRules(db, { family: row.name }).catch(() => ({
    rules: [] as DetectionRule[],
  }));

  return {
    family: String(row.name),
    slug: canonicalSlug,
    active_count: 0,
    edl_ready: 0,
    by_type: {},
    sources: [],
    first_seen: row.created_at ?? null,
    last_seen: row.updated_at ?? null,
    iocs: [],
    detection_rules: detection.rules,
    canonical: true,
    description: row.description ?? null,
    techniques,
  };
}
