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
/**
 * PHASE 7.3 — freshness fix.
 *
 * The bucket lists objects lexicographically, so a `prefix=npm/MAL-2026-`
 * listing returns `MAL-2026-10`, `MAL-2026-100`… i.e. the oldest ids, which is
 * why the workspace was stuck on July 2026 while the bucket already held
 * November advisories. Each object carries an `updated` timestamp, so the fix is
 * to read one bounded listing per ecosystem and sort by that timestamp.
 *
 * Go is deliberately absent: it holds 12 `MAL-*` objects in total and none from
 * November 2026 (verified live 2026-11-26), so a request would only cost budget.
 */
export const OSV_ECOSYSTEMS = ['npm', 'PyPI', 'RubyGems'] as const;
export function osvListingUrl(ecosystem: string): string {
  return `https://storage.googleapis.com/storage/v1/b/osv-vulnerabilities/o?prefix=${encodeURIComponent(ecosystem)}/MAL-2026-&maxResults=1000&fields=items(name,updated)`;
}
/** Keyless daily C2 infrastructure (Cobalt Strike IPs, CSV with an `ioc` label). */
export const C2INTEL_IPS =
  'https://raw.githubusercontent.com/drb-ra/C2IntelFeeds/master/feeds/IPPortC2s-30day.csv';
/** Keyless per-family IOC feed; `/v1/month/<tag>` is one request per family. */
export const TWEETFEED_BASE = 'https://api.tweetfeed.live/v1/month';
export const TWEETFEED_FAMILIES: Array<{ tag: string; family: string }> = [
  { tag: 'sliver', family: 'Sliver' },
  { tag: 'cobaltstrike', family: 'Cobalt Strike' },
];
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
const MAX_OSV_RECORDS = 5;
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

/**
 * PHASE 7.3 — pick the genuinely newest advisories.
 *
 * Ids are NOT assigned in date order (`MAL-2026-985` is a November update while
 * `MAL-2026-10093` is not), so recency comes from the bucket's own `updated`
 * field. Ties fall back to the id ordinal, then the name, for a stable pick.
 */
export function selectNewestMalListings(
  items: Array<{ name?: string; updated?: string }>,
  limit: number,
  alreadyStored: Iterable<string> = [],
): string[] {
  const stored = new Set(Array.from(alreadyStored).map((v) => String(v).toUpperCase()));
  const parsed: Array<{ name: string; ordinal: number; updated: number }> = [];
  for (const item of items || []) {
    const name = String(item?.name || '');
    const match = /^(?:[A-Za-z]+\/)?(MAL-\d{4}-(\d+))\.json$/.exec(name);
    if (!match) continue;
    if (stored.has(match[1].toUpperCase())) continue;
    const updated = Date.parse(String(item?.updated || ''));
    parsed.push({ name, ordinal: Number(match[2]) || 0, updated: Number.isNaN(updated) ? 0 : updated });
  }
  parsed.sort((a, b) => b.updated - a.updated || b.ordinal - a.ordinal || a.name.localeCompare(b.name));
  return parsed.slice(0, Math.max(0, limit)).map((entry) => entry.name);
}

/**
 * `Malicious code in @scope/pkg (npm)` → `Malicious code in @scope/pkg`.
 * The ecosystem becomes its own field, so the badge is not duplicated in prose.
 */
export function cleanSupplyChainTitle(summary: string): string {
  const base = String(summary || '')
    .replace(/\s*\((?:npm|PyPI|Go|RubyGems|Maven|NuGet|Packagist|Hex|Pub|crates\.io|Linux|OSS-Fuzz)\)\s*$/i, '')
    .trim();
  // Some OSV summaries repeat the package name in front of the phrase.
  return base.replace(/^[^:]{1,120}:\s*(?=malicious\s+code\s+in\s)/i, '').trim();
}

/** Canonical family label from a C2 feed's free-text `ioc` column. */
export function c2FamilyFromLabel(label: string): string | null {
  const text = String(label || '').toLowerCase();
  if (text.includes('cobalt')) return 'Cobalt Strike';
  if (text.includes('sliver')) return 'Sliver';
  if (text.includes('havoc')) return 'Havoc';
  if (text.includes('brute ratel') || text.includes('bruteratel')) return 'Brute Ratel';
  if (text.includes('metasploit') || text.includes('meterpreter')) return 'Metasploit';
  if (text.includes('asyncrat')) return 'AsyncRAT';
  return null;
}

/**
 * C2IntelFeeds CSV: `#ip,port,ioc`. One IP may appear on several ports, so the
 * parser keeps the first occurrence and ignores unlabelled/unknown families
 * rather than guessing an attribution.
 */
export function parseC2IntelFeedsCsv(text: string): Array<{ ip: string; port: string | null; family: string }> {
  const out: Array<{ ip: string; port: string | null; family: string }> = [];
  const seen = new Set<string>();
  for (const line of String(text || '').split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const [rawIp, rawPort, ...rest] = trimmed.split(',');
    const ip = String(rawIp || '').replace(/"/g, '').trim();
    if (!/^\d{1,3}(?:\.\d{1,3}){3}$/.test(ip)) continue;
    const family = c2FamilyFromLabel(rest.join(','));
    if (!family || seen.has(ip)) continue;
    seen.add(ip);
    const port = String(rawPort || '').replace(/"/g, '').trim();
    out.push({ ip, port: /^\d{1,5}$/.test(port) ? port : null, family });
  }
  return out;
}

/** TweetFeed JSON: `[{ type: 'ip'|'url'|'domain', value, tags }]`. */
export function parseTweetFeed(
  payload: unknown,
  family: string,
): Array<{ type: 'ip' | 'domain' | 'url'; value: string; family: string }> {
  const list = Array.isArray(payload) ? payload : [];
  const out: Array<{ type: 'ip' | 'domain' | 'url'; value: string; family: string }> = [];
  const seen = new Set<string>();
  for (const item of list as Array<Record<string, unknown>>) {
    const type = String(item?.type || '').toLowerCase();
    const value = String(item?.value || '').trim();
    if (!value || seen.has(`${type}|${value}`)) continue;
    if (type !== 'ip' && type !== 'domain' && type !== 'url') continue;
    seen.add(`${type}|${value}`);
    out.push({ type, value, family });
  }
  return out;
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
  const affectedVersions: Array<{ introduced: string | null; fixed: string | null; last_affected: string | null }> = [];
  for (const entry of affected) {
    const pkg = entry?.package as Record<string, unknown> | undefined;
    const ecosystem = typeof pkg?.ecosystem === 'string' ? pkg.ecosystem : '';
    const name = typeof pkg?.name === 'string' ? pkg.name : '';
    if (ecosystem && !ecosystems.includes(ecosystem)) ecosystems.push(ecosystem);
    if (name && !packages.includes(name)) packages.push(name);
    const versions = Array.isArray(entry?.versions) ? (entry.versions as unknown[]) : [];
    for (const version of versions.slice(0, 20)) {
      const label = String(version || '').trim();
      // A MAL record lists the exact malicious releases; they are versions, not
      // commit hashes, so they carry through to the dossier's version table.
      if (label && !affectedVersions.some((row) => row.introduced === label && !row.fixed)) {
        affectedVersions.push({ introduced: label, fixed: null, last_affected: label });
      }
    }
    const ranges = Array.isArray(entry?.ranges) ? (entry.ranges as Array<Record<string, unknown>>) : [];
    for (const range of ranges) {
      const events = Array.isArray(range?.events) ? (range.events as Array<Record<string, unknown>>) : [];
      let introduced: string | null = null;
      for (const event of events) {
        if (typeof event?.introduced === 'string') introduced = event.introduced;
        if (typeof event?.last_affected === 'string' && introduced) {
          affectedVersions.push({ introduced, fixed: null, last_affected: event.last_affected });
        }
        if (typeof event?.fixed === 'string') {
          if (/^[a-f0-9]{64}$/i.test(event.fixed)) hashes.push(event.fixed.toLowerCase());
          if (introduced) affectedVersions.push({ introduced, fixed: event.fixed, last_affected: null });
        }
      }
    }
  }

  const summary = typeof record?.summary === 'string' && record.summary.trim()
    ? record.summary.trim()
    : `Malicious package ${packages[0] || id}`;
  const details = typeof record?.details === 'string' ? record.details.trim() : '';
  const ecosystemLabel = ecosystems.length > 0 ? ecosystems.join('/') : 'open-source';
  const published = typeof record?.published === 'string' ? record.published : new Date().toISOString();
  const modified = typeof record?.modified === 'string' ? record.modified : published;
  const references = Array.isArray(record?.references) ? (record.references as unknown[]).slice(0, 20) : [];

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
      title: cleanSupplyChainTitle(summary) || `Malicious package ${packages[0] || id}`,
      sha256: hashes[0] ?? null,
      family: packages[0] ?? null,
      summary: (details || summary).slice(0, 2000),
      source: 'openssf-osv',
      severity: 'HIGH',
      report_json: JSON.stringify({
        id,
        summary,
        title: cleanSupplyChainTitle(summary),
        ecosystem: ecosystems[0] ?? 'open-source',
        ecosystems,
        package_name: packages[0] ?? null,
        packages: packages.slice(0, 10),
        affected_versions: affectedVersions.slice(0, 20),
        published_at: published,
        modified_at: modified,
        details: details.slice(0, 6000),
        references,
        // Grounded in the OSV record only: the advisory's own database source.
        provenance: { database: 'OSV.dev', advisory: `https://osv.dev/vulnerability/${id}` },
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

/** `Cobalt Strike` → `cobalt-strike` — the canonical malware/family hub slug. */
export function iocFamilySlug(value: unknown): string | null {
  const raw = String(value ?? '').trim();
  if (!raw) return null;
  const slug = raw
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
  return slug || null;
}

async function writeIocRows(db: D1Database, plans: PlannedIoc[]): Promise<number> {
  if (plans.length === 0) return 0;
  const statements = plans.map((plan) =>
    db
      .prepare(
        `INSERT INTO iocs (
           id, type, normalized_value, confidence, status, seen_count, sources_json,
           family, malware_id, asn, asn_name, country, expires_at, created_at, updated_at
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
         ON CONFLICT(type, normalized_value) DO UPDATE SET
           confidence  = excluded.confidence,
           status      = 'ACTIVE',
           seen_count  = excluded.seen_count,
           sources_json = excluded.sources_json,
           family      = COALESCE(excluded.family, iocs.family),
           malware_id  = COALESCE(excluded.malware_id, iocs.malware_id),
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
        iocFamilySlug(plan.family),
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
    const stored = await env.DB.prepare(
      `SELECT id FROM malware_reports WHERE source = 'openssf-osv' ORDER BY published_at DESC LIMIT 500`,
    )
      .all<{ id: string }>()
      .catch(() => ({ results: [] as Array<{ id: string }> }));
    const storedIds = (stored.results || []).map((row) => String(row.id));

    // One bounded listing per ecosystem: the bucket cannot be asked for
    // "newest", so its `updated` timestamps are collected and sorted here.
    const listings: Array<{ name?: string; updated?: string }> = [];
    let listingFailures = 0;
    for (const ecosystem of OSV_ECOSYSTEMS) {
      if (!budget.spend()) break;
      try {
        const response = await fetch(osvListingUrl(ecosystem), { headers: { accept: 'application/json' } });
        if (!response.ok) {
          listingFailures += 1;
          continue;
        }
        const payload = (await readJson(response)) as { items?: Array<{ name?: string; updated?: string }> } | null;
        if (Array.isArray(payload?.items)) listings.push(...payload.items);
      } catch {
        listingFailures += 1;
      }
    }
    openssf.fetched = listings.length;
    if (openssf.fetched === 0) {
      throw new Error(listingFailures > 0 ? 'OSV_LISTING_FAILED' : 'OSV_LISTING_EMPTY');
    }

    const picks = selectNewestMalListings(listings, options.osvLimit ?? MAX_OSV_RECORDS, storedIds);

    const reportStatements: D1PreparedStatement[] = [];
    // One advisory per (title, ecosystem): the same package can be re-published
    // in several ecosystems, and a repeated title is what made the workspace
    // look duplicated.
    const seenTitles = new Set<string>();
    for (const objectName of picks) {
      if (!budget.spend()) break;
      const media = `${OSV_MEDIA_BASE}${encodeURIComponent(objectName)}?alt=media`;
      const response = await fetch(media, { headers: { accept: 'application/json' } });
      if (!response.ok) continue;
      const record = (await readJson(response)) as Record<string, unknown> | null;
      if (!record) continue;
      const mapped = mapOsvMaliciousRecord(record);
      if (!mapped) continue;
      let ecosystem = 'open-source';
      try {
        ecosystem = String(JSON.parse(mapped.report.report_json)?.ecosystem || 'open-source');
      } catch {
        ecosystem = 'open-source';
      }
      const titleKey = `${mapped.report.title.toLowerCase()}|${ecosystem.toLowerCase()}`;
      if (seenTitles.has(titleKey)) continue;
      seenTitles.add(titleKey);
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
    openssf.status = openssf.accepted > 0 ? 'OK' : 'FAILED';
    if (openssf.status === 'FAILED') openssf.error = 'NO_ADVISORY_FETCHED';
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

  // ── 3b. C2IntelFeeds — live keyless Cobalt Strike C2 infrastructure ─────
  // PHASE 7.3. `montysecurity/C2-Tracker` is ARCHIVED (its `data/` files were
  // removed and are no longer updated), so it cannot be a live source. This is
  // the maintained keyless replacement: one CSV, updated daily, with an `ioc`
  // column naming the family.
  const c2intel: SourceTelemetry = { source: 'c2intel-feeds', status: 'FAILED', fetched: 0, accepted: 0, rejected: 0 };
  sources.push(c2intel);
  try {
    if (!budget.spend()) throw new Error('SUBREQUEST_BUDGET_EXHAUSTED');
    const response = await fetch(C2INTEL_IPS, { headers: { accept: 'text/csv' } });
    if (!response.ok) throw new Error(`HTTP_${response.status}`);
    const rows = parseC2IntelFeedsCsv(await response.text());
    c2intel.fetched = rows.length;
    pushRows(
      'c2intel-feeds',
      rows.map((row) => ({
        type: 'ip' as const,
        value: row.ip,
        source: 'c2intel-feeds',
        family: row.family,
        confidence: 85,
      })),
    );
    c2intel.status = rows.length > 0 ? 'OK' : 'FAILED';
    if (rows.length === 0) c2intel.error = 'NO_ROWS';
  } catch (error) {
    c2intel.error = String((error as Error)?.message || error).slice(0, 160);
  }

  // ── 3c. TweetFeed — per-family keyless IOC lists (one request per family) ─
  const tweetfeed: SourceTelemetry = { source: 'tweetfeed', status: 'SKIPPED', fetched: 0, accepted: 0, rejected: 0 };
  sources.push(tweetfeed);
  try {
    for (const entry of TWEETFEED_FAMILIES) {
      if (!budget.spend()) break;
      const response = await fetch(`${TWEETFEED_BASE}/${encodeURIComponent(entry.tag)}`, {
        headers: { accept: 'application/json' },
      });
      if (!response.ok) continue;
      const rows = parseTweetFeed(await readJson(response), entry.family);
      tweetfeed.fetched += rows.length;
      pushRows(
        'tweetfeed',
        rows.map((row) => ({
          type: row.type,
          value: row.value,
          source: 'tweetfeed',
          family: row.family,
          confidence: 80,
        })),
      );
      tweetfeed.status = 'OK';
    }
  } catch (error) {
    tweetfeed.status = 'FAILED';
    tweetfeed.error = String((error as Error)?.message || error).slice(0, 160);
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
