/**
 * PHASE 7B — bulk IOC + OpenSSF malware ingest pass.
 *
 * FOUR free, key-less bulk sources, each fetched ONCE per run:
 *
 *   openssf-osv     OSV.dev `MAL-*` malicious-package records (npm/PyPI/Go/…)
 *                   → `malware_reports` dossiers
 *   urlhaus         recent malicious URLs (abuse.ch with a key, else the public
 *                   OpenPhish feed) → `iocs` (type `url`)
 *   feodo-tracker   public JSON C2 IP blocklist → `iocs` (type `ip`)
 *   spamhaus-drop   public JSON CIDR list → `iocs` (type `cidr`, confidence 95)
 *
 * Then Cloudflare Radar enriches up to five high-confidence IPs and stores one
 * daily pulse snapshot.
 *
 * FREE-TIER CONTRACT
 * ------------------
 * A Worker invocation has ONE subrequest budget. Every external call goes
 * through {@link Budget}, which refuses to spend past
 * {@link MAX_SUBREQUESTS_PER_RUN} and counts what it spent. D1 writes are
 * grouped through `db.batch()` so the whole run is a handful of round trips.
 *
 * ZERO-EXECUTION
 * --------------
 * Metadata, hashes, URLs, CIDRs and package manifests only. Nothing here
 * downloads or runs a sample.
 */

import { syncDetectionRules } from './detectionRules';
import {
  MAX_SUBREQUESTS_PER_RUN,
  baseConfidenceFor,
  canonicalType,
  EDL_MIN_CONFIDENCE,
  expiresAtFor,
  normalizeIndicator,
  planBulkUpsert,
  type ExistingIocRow,
  type IncomingIoc,
  type PlannedIoc,
} from '@zayron/intelligence';

export interface IocIngestEnv {
  DB: D1Database;
  CF_RADAR_TOKEN?: string;
  ABUSECH_AUTH_KEY?: string;
  /** Optional per-run hard override; clamped to the free-tier ceiling. */
  IOC_INGEST_MAX_SUBREQUESTS?: string;
  IOC_INGEST_ENABLED?: string;
  ENVIRONMENT?: string;
}

export const OSV_BUCKET_LIST =
  'https://storage.googleapis.com/storage/v1/b/osv-vulnerabilities/o?prefix=npm/MAL-2026-&maxResults=200';
export const OSV_MEDIA_BASE = 'https://storage.googleapis.com/download/storage/v1/b/osv-vulnerabilities/o/';
export const URLHAUS_RECENT_API = 'https://urlhaus-api.abuse.ch/v1/urls/recent/';
export const URLHAUS_TEXT_RECENT = 'https://urlhaus.abuse.ch/downloads/text_recent/';
export const OPENPHISH_FEED = 'https://openphish.com/feed.txt';
export const FEODO_BLOCKLIST = 'https://feodotracker.abuse.ch/downloads/ipblocklist.json';
export const SPAMHAUS_DROP = 'https://www.spamhaus.org/drop/drop_v4.json';
export const RADAR_IP_ENTITY = 'https://api.cloudflare.com/client/v4/radar/entities/ip';
// PHASE 7.2 — the L3 protocol summary is a real Radar endpoint. The previous
// `/radar/attacks/summary/layer3` path does not exist and answered non-2xx even
// with a valid token, so no pulse was ever stored.
export const RADAR_ATTACK_SUMMARY =
  'https://api.cloudflare.com/client/v4/radar/attacks/layer3/summary/protocol?dateRange=1d&format=json';

/** Hard caps that keep a single free-tier tick small and predictable. */
const MAX_ROWS_PER_SOURCE = 200;
const MAX_OSV_RECORDS = 4;
const MAX_RADAR_IPS = 5;

export class Budget {
  readonly limit: number;
  used = 0;

  constructor(limit: number = MAX_SUBREQUESTS_PER_RUN) {
    this.limit = Math.max(1, Math.min(MAX_SUBREQUESTS_PER_RUN, Math.floor(limit)));
  }

  remaining(): number {
    return Math.max(0, this.limit - this.used);
  }

  /** True only when another external request fits inside the budget. */
  canSpend(count = 1): boolean {
    return this.used + count <= this.limit;
  }

  spend(count = 1): boolean {
    if (!this.canSpend(count)) return false;
    this.used += count;
    return true;
  }
}

export interface SourceTelemetry {
  source: string;
  status: 'OK' | 'SKIPPED' | 'FAILED';
  fetched: number;
  accepted: number;
  rejected: number;
  error?: string;
}

export interface IocIngestTelemetry {
  status: 'OK' | 'NOT_CONFIGURED';
  /** PHASE 7C — Sigma/Nuclei index sync (max once / 24h, 2 requests). */
  detection?: { status: string; nuclei: number; sigma: number; written: number; reason?: string } | null;
  subrequestsUsed: number;
  subrequestBudget: number;
  sources: SourceTelemetry[];
  iocsPlanned: number;
  iocsWritten: number;
  allowlistRejected: number;
  allowlistRejectionSamples: Array<{ value: string; type: string; reason: string }>;
  malwareReportsWritten: number;
  radarEnriched: number;
  radarPulse: 'STORED' | 'SKIPPED' | 'FAILED';
  expiredMarked: number;
  activeByType: Record<string, number>;
  activeBySource: Record<string, number>;
  selection: Array<{ type: string; value: string; confidence: number; sources: string[] }>;
  durationMs: number;
}

// ── parsers (pure, exported for the unit gate) ───────────────────────────────

/** Spamhaus JSON is newline-delimited `{"cidr":"…"}` records plus a metadata tail. */
export function parseSpamhausDrop(text: string): string[] {
  const out: string[] = [];
  for (const line of String(text || '').split(/\r?\n/)) {
    const trimmed = line.trim().replace(/,$/, '');
    if (!trimmed.startsWith('{')) continue;
    try {
      const parsed = JSON.parse(trimmed) as { cidr?: string; type?: string };
      if (parsed?.type === 'metadata') continue;
      if (typeof parsed?.cidr === 'string' && parsed.cidr.includes('/')) out.push(parsed.cidr);
    } catch {
      // A truncated trailing line is not a reason to drop the whole feed.
    }
  }
  return out;
}

export interface FeodoEntry {
  ip: string;
  family: string | null;
  asn: string | null;
  asnName: string | null;
  country: string | null;
}

/** Feodo Tracker public JSON array of C2 hosts. */
export function parseFeodoBlocklist(payload: unknown): FeodoEntry[] {
  const list = Array.isArray(payload) ? payload : [];
  const out: FeodoEntry[] = [];
  for (const item of list as Array<Record<string, unknown>>) {
    const ip = typeof item?.ip_address === 'string' ? item.ip_address.trim() : '';
    if (!ip) continue;
    out.push({
      ip,
      family: typeof item?.malware === 'string' && item.malware.trim() ? item.malware.trim() : null,
      asn: item?.as_number !== undefined && item?.as_number !== null ? String(item.as_number) : null,
      asnName: typeof item?.as_name === 'string' ? item.as_name : null,
      country: typeof item?.country === 'string' ? item.country : null,
    });
  }
  return out;
}

/** URLhaus JSON API (`query_status: ok`, `urls: [{ url, tags }]`). */
export function parseUrlhausApi(payload: unknown): Array<{ url: string; family: string | null }> {
  const data = payload as Record<string, unknown> | null;
  const list = Array.isArray(data?.urls) ? (data!.urls as Array<Record<string, unknown>>) : [];
  const out: Array<{ url: string; family: string | null }> = [];
  for (const item of list) {
    const url = typeof item?.url === 'string' ? item.url.trim() : '';
    if (!url) continue;
    const tags = item?.tags;
    const family = Array.isArray(tags) && tags.length > 0 ? String(tags[0]) : null;
    out.push({ url, family });
  }
  return out;
}

/** Public plain-text URL list (one URL per line). */
export function parsePlainUrlFeed(text: string): Array<{ url: string; family: string | null }> {
  return String(text || '')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => /^https?:\/\//i.test(line))
    .map((url) => ({ url, family: null }));
}

/**
 * OSV object names are lexicographic (`MAL-2026-1`, `MAL-2026-10`, `MAL-2026-100`),
 * but MAL ids are assigned in publication order, so numeric ordering recovers
 * recency far better than the API's own ordering.
 */
export function selectNewestMalObjectNames(
  items: Array<{ name?: string }>,
  limit: number,
  alreadyStored: Iterable<string> = [],
): string[] {
  const stored = new Set(Array.from(alreadyStored).map((v) => String(v).toUpperCase()));
  const parsed: Array<{ name: string; ordinal: number }> = [];
  for (const item of items || []) {
    const name = String(item?.name || '');
    const match = /^(?:[a-z]+\/)?(MAL-\d{4}-(\d+))\.json$/i.exec(name);
    if (!match) continue;
    if (stored.has(match[1].toUpperCase())) continue;
    parsed.push({ name, ordinal: Number(match[2]) || 0 });
  }
  parsed.sort((a, b) => b.ordinal - a.ordinal);
  return parsed.slice(0, Math.max(0, limit)).map((entry) => entry.name);
}

export interface OsvMaliciousMapping {
  report: {
    id: string;
    title: string;
    sha256: string | null;
    family: string | null;
    summary: string;
    source: 'openssf-osv';
    severity: string;
    report_json: string;
    published_at: string;
  };
  iocs: IncomingIoc[];
}

/** Map one OSV `MAL-*` record into a human-readable malware dossier. */
export function mapOsvMaliciousRecord(record: Record<string, unknown>): OsvMaliciousMapping | null {
  const id = typeof record?.id === 'string' ? record.id.trim().toUpperCase() : '';
  if (!/^MAL-\d{4}-\d+$/.test(id)) return null;

  const affected = Array.isArray(record?.affected) ? (record.affected as Array<Record<string, unknown>>) : [];
  const ecosystems: string[] = [];
  const packages: string[] = [];
  const hashes: string[] = [];
  for (const entry of affected) {
    const pkg = entry?.package as Record<string, unknown> | undefined;
    const ecosystem = typeof pkg?.ecosystem === 'string' ? pkg.ecosystem : '';
    const name = typeof pkg?.name === 'string' ? pkg.name : '';
    if (ecosystem && !ecosystems.includes(ecosystem)) ecosystems.push(ecosystem);
    if (name && !packages.includes(name)) packages.push(name);
    const ranges = Array.isArray(entry?.ranges) ? (entry.ranges as Array<Record<string, unknown>>) : [];
    for (const range of ranges) {
      const events = Array.isArray(range?.events) ? (range.events as Array<Record<string, unknown>>) : [];
      for (const event of events) {
        if (typeof event?.fixed === 'string' && /^[a-f0-9]{64}$/i.test(event.fixed)) hashes.push(event.fixed.toLowerCase());
      }
    }
  }

  const summary = typeof record?.summary === 'string' && record.summary.trim()
    ? record.summary.trim()
    : `Malicious package ${packages[0] || id}`;
  const details = typeof record?.details === 'string' ? record.details.trim() : '';
  const ecosystemLabel = ecosystems.length > 0 ? ecosystems.join('/') : 'open-source';
  const published = typeof record?.published === 'string' ? record.published : new Date().toISOString();

  const iocs: IncomingIoc[] = hashes.map((hash) => ({
    type: 'sha256',
    value: hash,
    source: 'openssf-osv',
    family: packages[0] || null,
  }));

  return {
    report: {
      id,
      // Human-readable H1: the OSV summary already reads
      // "Malicious code in @pkg/name (npm)", so prefixing the id would only
      // repeat it. The id stays as copyable metadata in the dossier header.
      title: summary,
      sha256: hashes[0] ?? null,
      family: packages[0] ?? null,
      summary: (details || summary).slice(0, 2000),
      source: 'openssf-osv',
      severity: 'HIGH',
      report_json: JSON.stringify({
        id,
        summary,
        details: details.slice(0, 4000),
        ecosystems,
        packages: packages.slice(0, 10),
        references: Array.isArray(record?.references) ? record.references : [],
      }),
      published_at: published,
    },
    iocs,
  };
}

// ── the pass ─────────────────────────────────────────────────────────────────

function sourceLimit(env: IocIngestEnv): number {
  const configured = Number(env.IOC_INGEST_MAX_SUBREQUESTS);
  if (Number.isFinite(configured) && configured > 0) return configured;
  return MAX_SUBREQUESTS_PER_RUN;
}

async function readJson(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

async function writeIocRows(db: D1Database, plans: PlannedIoc[]): Promise<number> {
  if (plans.length === 0) return 0;
  const statements = plans.map((plan) =>
    db
      .prepare(
        `INSERT INTO iocs (
           id, type, normalized_value, confidence, status, seen_count, sources_json,
           family, asn, asn_name, country, expires_at, created_at, updated_at
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
         ON CONFLICT(type, normalized_value) DO UPDATE SET
           confidence  = excluded.confidence,
           status      = 'ACTIVE',
           seen_count  = excluded.seen_count,
           sources_json = excluded.sources_json,
           family      = COALESCE(excluded.family, iocs.family),
           asn         = COALESCE(excluded.asn, iocs.asn),
           asn_name    = COALESCE(excluded.asn_name, iocs.asn_name),
           country     = COALESCE(excluded.country, iocs.country),
           expires_at  = excluded.expires_at,
           updated_at  = datetime('now')`,
      )
      .bind(
        `ioc_${crypto.randomUUID().replace(/-/g, '').slice(0, 16)}`,
        plan.type,
        plan.value,
        plan.confidence,
        plan.status,
        plan.seenCount,
        JSON.stringify(plan.sources),
        plan.family,
        plan.asn,
        plan.asnName,
        plan.country,
        plan.expiresAt,
      ),
  );

  for (let i = 0; i < statements.length; i += 50) {
    await db.batch(statements.slice(i, i + 50));
  }
  return statements.length;
}

async function readExistingIocs(db: D1Database, values: string[]): Promise<ExistingIocRow[]> {
  if (values.length === 0) return [];
  const unique = Array.from(new Set(values)).slice(0, 200);
  const placeholders = unique.map(() => '?').join(',');
  const result = await db
    .prepare(
      `SELECT type, normalized_value, confidence, seen_count, sources_json, status, asn, asn_name, country
         FROM iocs WHERE normalized_value IN (${placeholders})`,
    )
    .bind(...unique)
    .all<ExistingIocRow & { asn?: string | null; asn_name?: string | null; country?: string | null }>();
  return (result.results || []) as unknown as ExistingIocRow[];
}

export async function runIocIngestPass(
  env: IocIngestEnv,
  options: { now?: number; osvLimit?: number; skipRadar?: boolean; forceDetection?: boolean } = {},
): Promise<IocIngestTelemetry> {
  const started = Date.now();
  const now = options.now ?? Date.now();
  const budget = new Budget(sourceLimit(env));
  const sources: SourceTelemetry[] = [];
  const rejectionSamples: Array<{ value: string; type: string; reason: string }> = [];
  let allowlistRejected = 0;
  let malwareReportsWritten = 0;
  let radarEnriched = 0;
  let radarPulse: IocIngestTelemetry['radarPulse'] = 'SKIPPED';

  // ── 0. PHASE 7C — Sigma/Nuclei coverage index (2 requests, 24h cached) ──
  const detection = await syncDetectionRules(
    { DB: env.DB },
    { budget, now, force: options.forceDetection === true },
  ).catch(() => null);

  const incoming: IncomingIoc[] = [];
  const noteRejections = (rejected: Array<{ value: string; type: string; reason: string }>) => {
    allowlistRejected += rejected.length;
    for (const item of rejected) {
      if (rejectionSamples.length < 8) rejectionSamples.push(item);
    }
  };
  const pushRows = (source: string, rows: IncomingIoc[]) => {
    for (const row of rows.slice(0, MAX_ROWS_PER_SOURCE)) incoming.push(row);
  };

  // ── 1. OpenSSF Malicious Packages via the OSV bucket ────────────────────
  const openssf: SourceTelemetry = { source: 'openssf-osv', status: 'FAILED', fetched: 0, accepted: 0, rejected: 0 };
  sources.push(openssf);
  try {
    if (!budget.spend()) throw new Error('SUBREQUEST_BUDGET_EXHAUSTED');
    const listing = await fetch(OSV_BUCKET_LIST, { headers: { accept: 'application/json' } });
    if (!listing.ok) throw new Error(`HTTP_${listing.status}`);
    const listingJson = (await readJson(listing)) as { items?: Array<{ name?: string }> } | null;
    openssf.fetched = Array.isArray(listingJson?.items) ? listingJson!.items!.length : 0;

    const stored = await env.DB.prepare(
      `SELECT id FROM malware_reports WHERE source = 'openssf-osv' ORDER BY published_at DESC LIMIT 500`,
    )
      .all<{ id: string }>()
      .catch(() => ({ results: [] as Array<{ id: string }> }));
    const storedIds = (stored.results || []).map((row) => String(row.id));

    let picks = selectNewestMalObjectNames(listingJson?.items || [], options.osvLimit ?? MAX_OSV_RECORDS, storedIds);
    // The listing page is lexicographic; if every pick is already stored, walk
    // the numeric ids backwards rather than re-reading the same four objects.
    if (picks.length === 0) {
      const numeric = (listingJson?.items || [])
        .map((item) => /^(?:[a-z]+\/)?(MAL-\d{4}-(\d+))\.json$/i.exec(String(item?.name || '')))
        .filter(Boolean) as RegExpExecArray[];
      numeric.sort((a, b) => Number(b[2]) - Number(a[2]));
      picks = numeric
        .filter((m) => !storedIds.map((s) => s.toUpperCase()).includes(m[1].toUpperCase()))
        .slice(0, options.osvLimit ?? MAX_OSV_RECORDS)
        .map((m) => m[0].replace(/^(?:[a-z]+\/)/i, ''));
    }

    const reportStatements: D1PreparedStatement[] = [];
    for (const objectName of picks) {
      if (!budget.spend()) break;
      const media = `${OSV_MEDIA_BASE}${encodeURIComponent(objectName)}?alt=media`;
      const response = await fetch(media, { headers: { accept: 'application/json' } });
      if (!response.ok) continue;
      const record = (await readJson(response)) as Record<string, unknown> | null;
      if (!record) continue;
      const mapped = mapOsvMaliciousRecord(record);
      if (!mapped) continue;
      reportStatements.push(
        env.DB.prepare(
          `INSERT INTO malware_reports (id, title, sha256, family, summary, source, severity, report_json, published_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
           ON CONFLICT(id) DO UPDATE SET
             title = excluded.title,
             summary = excluded.summary,
             report_json = excluded.report_json,
             published_at = excluded.published_at`,
        ).bind(
          mapped.report.id,
          mapped.report.title.slice(0, 300),
          mapped.report.sha256,
          mapped.report.family,
          mapped.report.summary,
          mapped.report.source,
          mapped.report.severity,
          mapped.report.report_json,
          mapped.report.published_at,
        ),
      );
      for (const ioc of mapped.iocs) incoming.push(ioc);
      openssf.accepted += 1;
    }
    for (let i = 0; i < reportStatements.length; i += 25) {
      const chunk = reportStatements.slice(i, i + 25);
      await env.DB.batch(chunk);
      malwareReportsWritten += chunk.length;
    }
    openssf.status = 'OK';
  } catch (error) {
    openssf.error = String((error as Error)?.message || error).slice(0, 160);
  }

  // ── 2. URLhaus (authenticated) or the public OpenPhish URL feed ──────────
  const urlSource: SourceTelemetry = { source: 'urlhaus', status: 'SKIPPED', fetched: 0, accepted: 0, rejected: 0 };
  sources.push(urlSource);
  try {
    if (env.ABUSECH_AUTH_KEY && budget.canSpend()) {
      budget.spend();
      const response = await fetch(URLHAUS_RECENT_API, {
        method: 'POST',
        headers: { 'Auth-Key': env.ABUSECH_AUTH_KEY, 'content-type': 'application/x-www-form-urlencoded' },
        body: 'limit=100',
      });
      if (!response.ok) throw new Error(`HTTP_${response.status}`);
      const rows = parseUrlhausApi(await readJson(response));
      urlSource.fetched = rows.length;
      pushRows('urlhaus', rows.map((row) => ({ type: 'url', value: row.url, source: 'urlhaus', family: row.family })));
      urlSource.status = 'OK';
    } else if (budget.canSpend()) {
      // abuse.ch now requires an Auth-Key for every bulk endpoint; the public
      // OpenPhish list is the key-less URL source with the same shape of value.
      budget.spend();
      const response = await fetch(OPENPHISH_FEED, { headers: { accept: 'text/plain' }, redirect: 'follow' });
      if (!response.ok) throw new Error(`HTTP_${response.status}`);
      const rows = parsePlainUrlFeed(await response.text());
      urlSource.fetched = rows.length;
      urlSource.source = 'openphish';
      pushRows('openphish', rows.map((row) => ({ type: 'url', value: row.url, source: 'openphish', family: row.family })));
      urlSource.status = 'OK';
    }
  } catch (error) {
    urlSource.status = 'FAILED';
    urlSource.error = String((error as Error)?.message || error).slice(0, 160);
  }

  // ── 3. Feodo Tracker C2 IP blocklist ────────────────────────────────────
  const feodo: SourceTelemetry = { source: 'feodo-tracker', status: 'FAILED', fetched: 0, accepted: 0, rejected: 0 };
  sources.push(feodo);
  try {
    if (!budget.spend()) throw new Error('SUBREQUEST_BUDGET_EXHAUSTED');
    const response = await fetch(FEODO_BLOCKLIST, { headers: { accept: 'application/json' } });
    if (!response.ok) throw new Error(`HTTP_${response.status}`);
    const rows = parseFeodoBlocklist(await readJson(response));
    feodo.fetched = rows.length;
    pushRows(
      'feodo-tracker',
      rows.map((row) => ({
        type: 'ip',
        value: row.ip,
        source: 'feodo-tracker',
        family: row.family,
        asn: row.asn,
        asnName: row.asnName,
        country: row.country,
      })),
    );
    feodo.status = 'OK';
  } catch (error) {
    feodo.error = String((error as Error)?.message || error).slice(0, 160);
  }

  // ── 4. Spamhaus DROP CIDRs (baseline confidence 95) ─────────────────────
  const drop: SourceTelemetry = { source: 'spamhaus-drop', status: 'FAILED', fetched: 0, accepted: 0, rejected: 0 };
  sources.push(drop);
  try {
    if (!budget.spend()) throw new Error('SUBREQUEST_BUDGET_EXHAUSTED');
    const response = await fetch(SPAMHAUS_DROP, { headers: { accept: 'application/json' } });
    if (!response.ok) throw new Error(`HTTP_${response.status}`);
    const cidrs = parseSpamhausDrop(await response.text());
    drop.fetched = cidrs.length;
    pushRows(
      'spamhaus-drop',
      cidrs.map((cidr) => ({
        type: 'cidr',
        value: cidr,
        source: 'spamhaus-drop',
        confidence: baseConfidenceFor('spamhaus-drop'),
      })),
    );
    drop.status = 'OK';
  } catch (error) {
    drop.error = String((error as Error)?.message || error).slice(0, 160);
  }

  // ── 5. normalize + dedup + hygiene shield, then one batched upsert ──────
  const existing = await readExistingIocs(
    env.DB,
    incoming.map((row) => normalizeIndicator(row.type, row.value) || '').filter(Boolean),
  ).catch(() => [] as ExistingIocRow[]);
  const outcome = planBulkUpsert(incoming, existing, now);
  noteRejections(outcome.rejected);
  for (const source of sources) {
    source.rejected = outcome.rejected.filter((rejected) =>
      rejected.reason === 'PRIVATE_OR_RESERVED' || rejected.reason === 'SHARED_INFRASTRUCTURE',
    ).length;
  }

  const iocsWritten = await writeIocRows(env.DB, outcome.accepted).catch(() => 0);

  // Decay: an indicator whose TTL elapsed is EXPIRED, never deleted.
  let expiredMarked = 0;
  try {
    const result = await env.DB.prepare(
      `UPDATE iocs SET status = 'EXPIRED', updated_at = datetime('now')
         WHERE status = 'ACTIVE' AND expires_at IS NOT NULL AND expires_at <= ?`,
    )
      .bind(new Date(now).toISOString())
      .run();
    expiredMarked = Number((result as any)?.meta?.changes ?? 0);
  } catch {
    expiredMarked = 0;
  }

  // ── 6. Cloudflare Radar enrichment + one daily pulse ────────────────────
  const radarToken = (env.CF_RADAR_TOKEN || '').trim();
  if (radarToken && !options.skipRadar) {
    try {
      const candidates = await env.DB.prepare(
        `SELECT id, normalized_value FROM iocs
           WHERE type = 'ip' AND status = 'ACTIVE' AND confidence >= ?
             AND radar_enriched_at IS NULL
           ORDER BY confidence DESC, updated_at DESC LIMIT ?`,
      )
        .bind(EDL_MIN_CONFIDENCE, MAX_RADAR_IPS)
        .all<{ id: string; normalized_value: string }>();

      const updates: D1PreparedStatement[] = [];
      for (const row of candidates.results || []) {
        if (!budget.spend()) break;
        const response = await fetch(`${RADAR_IP_ENTITY}?ip=${encodeURIComponent(row.normalized_value)}&format=json`, {
          headers: { authorization: `Bearer ${radarToken}`, accept: 'application/json' },
        });
        if (!response.ok) continue;
        const payload = (await readJson(response)) as any;
        const entity = payload?.result?.ip ?? payload?.result ?? null;
        const asn = entity?.asn ? String(entity.asn) : null;
        const asnName = typeof entity?.asnName === 'string' ? entity.asnName : null;
        const country = typeof entity?.location?.countryCode === 'string'
          ? entity.location.countryCode
          : typeof entity?.country === 'string' ? entity.country : null;
        updates.push(
          env.DB.prepare(
            `UPDATE iocs SET asn = COALESCE(?, asn), asn_name = COALESCE(?, asn_name),
                              country = COALESCE(?, country), radar_enriched_at = datetime('now'),
                              updated_at = datetime('now')
               WHERE id = ?`,
          ).bind(asn, asnName, country, row.id),
        );
        radarEnriched += 1;
      }
      if (updates.length > 0) await env.DB.batch(updates);

      if (budget.spend()) {
        const response = await fetch(RADAR_ATTACK_SUMMARY, {
          headers: { authorization: `Bearer ${radarToken}`, accept: 'application/json' },
        });
        if (response.ok) {
          const payload = (await readJson(response)) as any;
          const pulseDate = new Date(now).toISOString().slice(0, 10);
          await env.DB.prepare(
            `INSERT INTO radar_pulses (id, pulse_date, payload_json, created_at)
             VALUES (?, ?, ?, datetime('now'))
             ON CONFLICT(pulse_date) DO UPDATE SET payload_json = excluded.payload_json`,
          )
            .bind(`radar_${pulseDate}`, pulseDate, JSON.stringify(payload?.result ?? payload ?? {}).slice(0, 200000))
            .run();
          radarPulse = 'STORED';
        } else {
          // Status only: the body can echo request metadata, and this is the
          // signal an operator needs to tell a token problem from a path one.
          console.warn(`[ioc-ingest] radar pulse request failed status=${response.status}`);
          radarPulse = 'FAILED';
        }
      }
    } catch {
      radarPulse = 'FAILED';
    }
  }

  // ── 7. honest rollup for the operator's first-run telemetry ─────────────
  const byType = new Map<string, number>();
  const bySource = new Map<string, number>();
  try {
    const typeRows = await env.DB.prepare(
      `SELECT type, COUNT(*) AS count FROM iocs WHERE status = 'ACTIVE' GROUP BY type`,
    ).all<{ type: string; count: number }>();
    for (const row of typeRows.results || []) byType.set(String(row.type), Number(row.count) || 0);

    const sourceRows = await env.DB.prepare(
      `SELECT sources_json FROM iocs WHERE status = 'ACTIVE' ORDER BY updated_at DESC LIMIT 5000`,
    ).all<{ sources_json: string }>();
    for (const row of sourceRows.results || []) {
      try {
        const list = JSON.parse(String(row.sources_json || '[]'));
        if (Array.isArray(list)) for (const source of list) bySource.set(String(source), (bySource.get(String(source)) || 0) + 1);
      } catch {
        /* a malformed provenance blob must not break the rollup */
      }
    }
  } catch {
    /* rollup is telemetry: failure never fails the ingest */
  }

  return {
    status: 'OK',
    detection,
    subrequestsUsed: budget.used,
    subrequestBudget: budget.limit,
    sources,
    iocsPlanned: outcome.accepted.length,
    iocsWritten,
    allowlistRejected,
    allowlistRejectionSamples: rejectionSamples,
    malwareReportsWritten,
    radarEnriched,
    radarPulse,
    expiredMarked,
    activeByType: Object.fromEntries(byType),
    activeBySource: Object.fromEntries(bySource),
    selection: outcome.accepted
      .slice()
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, 5)
      .map((plan) => ({ type: plan.type, value: plan.value, confidence: plan.confidence, sources: plan.sources })),
    durationMs: Date.now() - started,
  };
}

/** True when an indicator is old enough to be expired by the decay policy. */
export function shouldExpire(type: string, expiresAt: string | null | undefined, now: number = Date.now()): boolean {
  const canonical = canonicalType(type);
  if (!canonical) return false;
  if (!expiresAt) return false;
  const expected = expiresAtFor(canonical, now);
  return Date.parse(expiresAt) < Date.parse(expected) - 1000;
}
