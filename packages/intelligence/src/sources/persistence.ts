import type { NormalizedVulnerability, RawSourceRecord } from './adapters';

/** Minimal D1 surface used by the Preview supply path (no driver dependency). */
export interface PreviewD1Executor {
  prepare(sql: string): {
    bind(...args: unknown[]): {
      run(): Promise<unknown>;
      first<T = any>(): Promise<T | null>;
      all<T = any>(): Promise<{ results: T[] }>;
    };
  };
}

// ── Independently verified database identities ────────────────────────────────
// Preview D1 (approved destination for Preview intelligence supply):
export const PREVIEW_VULNERABILITY_DATABASE_NAME = 'zayron-x-preview-db';
export const PREVIEW_VULNERABILITY_DATABASE_ID = '34962f8f-abd1-4b0b-8bd7-b4eab59bd902';
// Production D1 (must never be reachable from any Preview path):
export const PRODUCTION_VULNERABILITY_DATABASE_NAME = 'zayron-x-db';
export const PRODUCTION_VULNERABILITY_DATABASE_ID = 'c19c8f45-801b-4034-bd76-402e5e5389b5';

/**
 * Runtime configuration var carrying the effective Preview supply destination.
 * It is configuration (not an environment name) and is validated by the deploy
 * guard against the approved preview pair, so Preview ingestion can never
 * silently resolve to the production database.
 */
export const PREVIEW_SUPPLY_IDENTITY_VAR = 'PREVIEW_SUPPLY_DB_IDENTITY';

export const PREVIEW_SUPPLY_DATABASE_IDENTITY = `${PREVIEW_VULNERABILITY_DATABASE_NAME}:${PREVIEW_VULNERABILITY_DATABASE_ID}`;

/** Guard failure codes (exported so callers can branch on a closed set). */
export const PREVIEW_DATABASE_IDENTITY_CONFLICT = 'PREVIEW_DATABASE_IDENTITY_CONFLICT';

export interface D1DatabaseIdentity {
  database_name?: unknown;
  database_id?: unknown;
}

/**
 * Resolve, then verify, the ONLY approved Preview destination.
 *
 * Fail-closed outcomes (all throw):
 *   PREVIEW_DB_IDENTITY_MISSING      — no identity supplied at all
 *   PREVIEW_DB_IDENTITY_MALFORMED    — one half of name/id absent or not a string
 *   PREVIEW_PRODUCTION_DATABASE_FORBIDDEN — identity names the production database
 *   PREVIEW_DATABASE_IDENTITY_CONFLICT    — name and id disagree about which DB this is
 *   PREVIEW_DATABASE_IDENTITY_MISMATCH    — a coherent identity that is not the approved pair
 */
export function assertPreviewVulnerabilityDatabase(identity: D1DatabaseIdentity | null | undefined): void {
  if (identity === null || identity === undefined) throw new Error('PREVIEW_DB_IDENTITY_MISSING');
  const rawName = identity.database_name;
  const rawId = identity.database_id;
  if (rawName === undefined || rawId === undefined) throw new Error('PREVIEW_DB_IDENTITY_MISSING');
  if (typeof rawName !== 'string' || typeof rawId !== 'string' || rawName.trim() === '' || rawId.trim() === '') {
    throw new Error('PREVIEW_DB_IDENTITY_MALFORMED');
  }
  const database_name = rawName.trim();
  const database_id = rawId.trim();
  // Conflicting halves: one half claims preview, the other claims production.
  const namesProduction = database_name === PRODUCTION_VULNERABILITY_DATABASE_NAME || database_id === PRODUCTION_VULNERABILITY_DATABASE_ID;
  const namesPreview = database_name === PREVIEW_VULNERABILITY_DATABASE_NAME || database_id === PREVIEW_VULNERABILITY_DATABASE_ID;
  if (namesProduction && namesPreview) throw new Error('PREVIEW_DATABASE_IDENTITY_CONFLICT');
  if (database_id === PRODUCTION_VULNERABILITY_DATABASE_ID || database_name === PRODUCTION_VULNERABILITY_DATABASE_NAME) {
    throw new Error('PREVIEW_PRODUCTION_DATABASE_FORBIDDEN');
  }
  if (database_name !== PREVIEW_VULNERABILITY_DATABASE_NAME || database_id !== PREVIEW_VULNERABILITY_DATABASE_ID) {
    throw new Error('PREVIEW_DATABASE_IDENTITY_MISMATCH');
  }
}

/** Parse an effective-configuration identity token `"<name>:<id>"`, fail-closed. */
export function parsePreviewDatabaseIdentity(raw: unknown): D1DatabaseIdentity {
  if (typeof raw !== 'string' || raw.trim() === '') throw new Error('PREVIEW_DB_IDENTITY_MISSING');
  const parts = raw.split(':');
  if (parts.length !== 2 || parts[0].trim() === '' || parts[1].trim() === '') {
    throw new Error('PREVIEW_DB_IDENTITY_MALFORMED');
  }
  const identity: D1DatabaseIdentity = { database_name: parts[0].trim(), database_id: parts[1].trim() };
  assertPreviewVulnerabilityDatabase(identity);
  return identity;
}

/** Resolve the Preview destination from effective configuration vars. */
export function previewSupplyIdentityFromConfigVars(vars: Record<string, unknown> | undefined | null): D1DatabaseIdentity {
  if (!vars || typeof vars !== 'object') throw new Error('PREVIEW_DB_IDENTITY_MISSING');
  return parsePreviewDatabaseIdentity(vars[PREVIEW_SUPPLY_IDENTITY_VAR]);
}

export function rawRecordKey(record: Pick<RawSourceRecord, 'sourceId' | 'sourceRecordId'>): string {
  return `${record.sourceId}:${record.sourceRecordId}`;
}

export interface PreviewPersistResult {
  /** true when a NEW canonical vulnerability row was created. */
  canonicalCreated: boolean;
  /** true when the canonical row already existed and was merged in place. */
  canonicalUpdated: boolean;
  /** number of provenance records written for this item. */
  provenanceRecords: number;
}

/**
 * Persist ONE normalized vulnerability into the dedicated Preview store.
 *
 * Guarantees:
 *  - Identity is re-asserted on every call (a caller cannot bypass the guard).
 *  - Provenance is mandatory: a record with no source provenance is refused.
 *  - Every write is keyed, so repeated ingestion is idempotent and cannot create
 *    uncontrolled duplicate canonical reports or duplicate read-model rows.
 *  - The read model (`vulnerabilities`) is derived from EXTERNALLY OBSERVED facts
 *    only. No model-generated text is ever projected here.
 */
export async function persistNormalizedPreview(
  db: PreviewD1Executor,
  identity: D1DatabaseIdentity,
  item: NormalizedVulnerability,
): Promise<PreviewPersistResult> {
  assertPreviewVulnerabilityDatabase(identity);
  const id = item.identity;
  if (!id) throw new Error('CANONICAL_IDENTITY_REQUIRED');
  const now = new Date().toISOString();
  if (!Array.isArray(item.sourceRecords) || item.sourceRecords.length === 0) throw new Error('SOURCE_PROVENANCE_REQUIRED');

  // 1. Source provenance — keyed by (source_id, source_record_id). A re-fetch of
  //    byte-identical content is a NO-OP, so first-seen provenance survives.
  for (const record of item.sourceRecords) {
    await db.prepare(
      `INSERT INTO vulnerability_source_records (source_id, source_record_id, source_url, raw_payload, content_hash, fetched_at, parser_version, ingestion_status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(source_id, source_record_id) DO UPDATE SET
         raw_payload = excluded.raw_payload,
         content_hash = excluded.content_hash,
         fetched_at = excluded.fetched_at,
         ingestion_status = excluded.ingestion_status
       WHERE vulnerability_source_records.content_hash <> excluded.content_hash`,
    ).bind(
      record.sourceId, record.sourceRecordId, record.sourceUrl, JSON.stringify(record.rawPayload),
      record.contentHash, record.fetchedAt, record.parserVersion, record.ingestionStatus,
    ).run();
  }

  // 2. Canonical store — one row per canonical identity, deterministically merged.
  const existing = await db.prepare('SELECT canonical_json FROM canonical_vulnerabilities WHERE vulnerability_id = ?')
    .bind(id).first<{ canonical_json: string }>();
  const previous = existing?.canonical_json ? JSON.parse(existing.canonical_json) as NormalizedVulnerability : undefined;
  const merged = previous ? mergeCanonicalVulnerability(previous, item) : item;
  await db.prepare(
    `INSERT INTO canonical_vulnerabilities (vulnerability_id, cve_id, aliases_json, products_json, affected_versions_json, fixed_versions_json, canonical_json, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(vulnerability_id) DO UPDATE SET
       cve_id = excluded.cve_id,
       aliases_json = excluded.aliases_json,
       products_json = excluded.products_json,
       affected_versions_json = excluded.affected_versions_json,
       fixed_versions_json = excluded.fixed_versions_json,
       canonical_json = excluded.canonical_json,
       updated_at = excluded.updated_at`,
  ).bind(
    id, merged.cveId || null, JSON.stringify(merged.aliases), JSON.stringify(merged.products),
    JSON.stringify(merged.affectedVersions), JSON.stringify(merged.fixedVersions), JSON.stringify(merged), now,
  ).run();

  // 3. Read model — the table the workspace vulnerability view serves from.
  await projectVulnerabilityReadModel(db, merged, now);

  return { canonicalCreated: !previous, canonicalUpdated: !!previous, provenanceRecords: item.sourceRecords.length };
}

/** Deterministic union merge; never invents fields, never drops provenance. */
export function mergeCanonicalVulnerability(
  previous: NormalizedVulnerability,
  incoming: NormalizedVulnerability,
): NormalizedVulnerability {
  const union = (a: string[] = [], b: string[] = []) => [...new Set([...(a || []), ...(b || [])])];
  const evidence = [...new Map(
    [...(previous.evidence || []), ...(incoming.evidence || [])].map((e) => [e.evidence_id, e]),
  ).values()];
  const sourceRecords = [...new Map(
    [...(previous.sourceRecords || []), ...(incoming.sourceRecords || [])].map((r) => [rawRecordKey(r), r]),
  ).values()];
  return {
    ...previous,
    ...incoming,
    aliases: union(previous.aliases, incoming.aliases),
    products: union(previous.products, incoming.products),
    affectedVersions: union(previous.affectedVersions, incoming.affectedVersions),
    fixedVersions: union(previous.fixedVersions, incoming.fixedVersions),
    cwe: union(previous.cwe, incoming.cwe),
    references: union(previous.references, incoming.references),
    evidence,
    sourceRecords,
    // Externally observed exploitation status, never downgraded by a later source.
    exploitation: previous.exploitation?.status === 'KNOWN_EXPLOITED' ? previous.exploitation : incoming.exploitation ?? previous.exploitation,
    fields: { ...previous.fields, ...incoming.fields },
    relevance: incoming.relevance ?? previous.relevance,
  };
}

/** Stable read-model id, identical to the existing canonical ingest convention. */
export function readModelIdFor(cveId: string): string {
  return `vuln_${cveId.toLowerCase().replace(/[^a-z0-9]/g, '_')}`;
}

/**
 * Exploitation-evidence state for the read-model flag, derived from the canonical
 * record's OWN exploitation status.
 *
 * This is the same four-state contract the ingest write path enforces:
 *
 *   · `KNOWN_EXPLOITED`  confirmed in the wild — the ONLY value that may raise the flag
 *   · `REPORTED`         a source was consulted and establishes nothing confirmed
 *   · `SUSPECTED`        a source was consulted and establishes nothing confirmed
 *   · `NO_EVIDENCE`      consulted and found nothing; explicitly NOT a negative
 *   · absent             no exploitation evidence was consulted for the record at all
 *
 * Severity is deliberately not a parameter, so it cannot be reintroduced here.
 * `UNCONFIRMED` and `UNKNOWN` both carry the `-1` signal, which means "preserve the
 * stored value": an incoming record that omits exploitation evidence must never
 * clear a positive another source established.
 */
export function exploitationReadModelSignal(
  exploitation: NormalizedVulnerability['exploitation'],
): { state: 'CONFIRMED_IN_WILD' | 'UNCONFIRMED' | 'UNKNOWN'; flag: 0 | 1; signal: 1 | -1 } {
  if (exploitation?.status === 'KNOWN_EXPLOITED') {
    return { state: 'CONFIRMED_IN_WILD', flag: 1, signal: 1 };
  }
  if (
    exploitation?.status === 'REPORTED'
    || exploitation?.status === 'SUSPECTED'
    || exploitation?.status === 'NO_EVIDENCE'
  ) {
    return { state: 'UNCONFIRMED', flag: 0, signal: -1 };
  }
  return { state: 'UNKNOWN', flag: 0, signal: -1 };
}

/**
 * Project a canonical record into the `vulnerabilities` read model.
 *
 * `ON CONFLICT(id)` is used (the table PRIMARY KEY) rather than `cve_id`, so
 * identities without a CVE (ghsa:/package:) cannot re-insert on every retry via
 * a NULL cve_id. Fields are observed facts only — the description is an explicit
 * OBSERVED-FACTS summary citing its sources, never model interpretation.
 */
async function projectVulnerabilityReadModel(
  db: PreviewD1Executor,
  item: NormalizedVulnerability,
  now: string,
): Promise<void> {
  const cve = item.cveId ? item.cveId.toUpperCase() : undefined;
  // The read model is CVE-keyed (`cve_id` is NOT NULL + UNIQUE) and is what the
  // workspace vulnerability view serves. Advisories with no CVE stay in the
  // canonical store and are never projected under a fabricated CVE id.
  if (!cve) return;
  const id = readModelIdFor(cve);
  const severity = (item.severity || (item.cvss?.score !== undefined
    ? item.cvss.score >= 9 ? 'CRITICAL' : item.cvss.score >= 7 ? 'HIGH' : item.cvss.score >= 4 ? 'MEDIUM' : 'LOW'
    : undefined) || 'UNKNOWN').toUpperCase();
  const exploitation = exploitationReadModelSignal(item.exploitation);
  const exploited = exploitation.flag;
  const observed = [
    `OBSERVED_FACTS (no model interpretation)`,
    `identity=${item.identity}`,
    `exploitation=${item.exploitation?.status ?? 'NO_EVIDENCE'}`,
    `severity=${severity}`,
    item.cvss?.score !== undefined ? `cvss=${item.cvss.score}${item.cvss.vector ? ` (${item.cvss.vector})` : ''}` : `cvss=NOT_OBSERVED`,
    `sources=${[...new Set(item.sourceRecords.map((r) => r.sourceId))].sort().join(',')}`,
    `fixed_versions=${item.fixedVersions.length ? item.fixedVersions.join('|') : 'NOT_OBSERVED'}`,
    `first_seen=${item.sourceRecords.map((r) => r.fetchedAt).sort()[0] ?? now}`,
  ].join('; ');
  await db.prepare(
    `INSERT INTO vulnerabilities (id, cve_id, title, description, severity, cvss_score, cvss_vector, is_exploited_in_wild, published_at, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET
       cve_id = COALESCE(excluded.cve_id, vulnerabilities.cve_id),
       title = excluded.title,
       description = excluded.description,
       severity = CASE
         WHEN vulnerabilities.severity = 'CRITICAL' THEN 'CRITICAL'
         WHEN excluded.severity = 'CRITICAL' THEN 'CRITICAL'
         ELSE excluded.severity END,
       cvss_score = COALESCE(excluded.cvss_score, vulnerabilities.cvss_score),
       cvss_vector = COALESCE(excluded.cvss_vector, vulnerabilities.cvss_vector),
       is_exploited_in_wild = CASE WHEN ? = -1 THEN vulnerabilities.is_exploited_in_wild ELSE ? END,
       published_at = COALESCE(vulnerabilities.published_at, excluded.published_at),
       updated_at = excluded.updated_at`,
  ).bind(
    id, cve, `${cve} Security Advisory`, observed, severity,
    item.cvss?.score ?? null, item.cvss?.vector ?? null, exploited,
    item.exploitation?.dateAdded ?? now, now, now,
    exploitation.signal, exploitation.signal,
  ).run();
}
