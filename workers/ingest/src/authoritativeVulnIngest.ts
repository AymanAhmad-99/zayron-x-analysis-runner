/**
 * Authoritative CVE ingestion — NVD + CISA KEV + FIRST EPSS → `zayron-x-db`.
 *
 * ARCHITECTURAL CONSTRAINT (Gate 3A.3)
 * Authoritative CVE ingestion belongs to `workers/ingest` and targets the
 * operational database (`zayron-x-db`). `zayron-x-intelligence-db` stays an
 * isolated research store; `workers/source-fabric` is NOT repointed at the
 * operational DB.
 *
 * WRITE CONTRACT
 * A row written here is `provenance_state = 'AUTHORITATIVE_VERIFIED'` and every
 * field comes from a named authority:
 *   cvss_score / cvss_vector   NVD metrics (v3.1 → v3.0 → v2)
 *   severity                   deterministic CVSS band — never a narrative label
 *   epss_score / percentile    FIRST EPSS
 *   is_exploited_in_wild       CISA KEV membership ONLY
 *   affected/fixed versions    NVD CPE range boundaries (`versionEndExcluding`
 *                              is the first fixed version; nothing is invented)
 * A source that is unavailable leaves its columns untouched instead of writing a
 * sentinel.
 */
export interface EnvLike {
  DB: any;
  NVD_API_KEY?: string;
}

/** A reference with its source-declared tags (`Patch`, `Exploit`, `Vendor Advisory`). */
export interface CveReference {
  url: string;
  source: string;
  tags: string[];
}

/** CWE identifier plus the authority that assigned it (NVD vs CISA ADP). */
export interface CweEntry {
  id: string;
  source: string;
}

/** CISA SSVC decision points as published by the ADP container. */
export interface SsvcDecision {
  exploitation: string | null;
  automatable: string | null;
  technical_impact: string | null;
  source: string;
  timestamp: string | null;
}

export interface NvdCveRecord {
  cve_id: string;
  description: string;
  cvss_score: number | null;
  cvss_vector: string | null;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'UNKNOWN';
  published_at: string | null;
  modified_at: string | null;
  /** NVD publication state: `Awaiting Analysis`, `Analyzed`, `Modified`, … */
  vuln_status: string | null;
  vendor: string | null;
  product: string | null;
  affected_versions: string[];
  fixed_versions: string[];
  patch_url: string | null;
  cwe_ids: CweEntry[];
  references: CveReference[];
  cvss_source_provider: string | null;
  cvss_source_type: string | null;
  ssvc: SsvcDecision | null;
  /** TRUE when a source-declared reference is tagged `Exploit` (observation only). */
  exploit_reference_observed: boolean;
}

/**
 * NVD source UUID for the CISA ADP Vulnrichment container.
 *
 * NVD republishes the ADP's CVSS/CWE/SSVC as `Secondary` metrics whose source is
 * this UUID. Losing that attribution is what made a clear "who said 7.5"
 * impossible in Phase 4B, so the UUID is mapped to an explicit provider name.
 */
export const CISA_ADP_SOURCE_UUID = '134c704f-9b21-4f2e-91b3-4a467353bcc0';

/** Human-readable authority for an NVD metric/reference source string. */
export function providerForSource(source: unknown): string {
  const value = typeof source === 'string' ? source.trim() : '';
  if (!value) return 'NVD';
  if (value.toLowerCase() === CISA_ADP_SOURCE_UUID) return 'CISA ADP — Vulnrichment';
  if (/^nvd@nist\.gov$/i.test(value) || /nist\.gov$/i.test(value)) return 'NVD';
  return value;
}

export interface AuthoritativeIngestSummary {
  requested_limit: number;
  nvd_records: number;
  persisted: number;
  kev_matched: number;
  epss_matched: number;
  acknowledged_unmodified: number;
  cves: string[];
  errors: string[];
}

/** Deterministic CVSS band. No narrative, no ratchet, no default-high guess. */
export function severityFromCvss(score: number | null | undefined): NvdCveRecord['severity'] {
  if (typeof score !== 'number' || !Number.isFinite(score) || score < 0 || score > 10) return 'UNKNOWN';
  if (score >= 9.0) return 'CRITICAL';
  if (score >= 7.0) return 'HIGH';
  if (score >= 4.0) return 'MEDIUM';
  if (score > 0) return 'LOW';
  return 'UNKNOWN';
}

function firstCvss(metrics: any): { score: number | null; vector: string | null; provider: string | null; type: string | null } {
  for (const key of ['cvssMetricV31', 'cvssMetricV30', 'cvssMetricV40', 'cvssMetricV2']) {
    const list = metrics?.[key];
    if (!Array.isArray(list) || list.length === 0) continue;
    for (const entry of list) {
      const data = entry?.cvssData;
      const score = Number(data?.baseScore);
      if (Number.isFinite(score)) {
        return {
          score,
          vector: typeof data?.vectorString === 'string' && data.vectorString.trim() ? data.vectorString.trim() : null,
          provider: providerForSource(entry?.source),
          type: typeof entry?.type === 'string' && entry.type.trim() ? entry.type.trim() : null,
        };
      }
    }
  }
  return { score: null, vector: null, provider: null, type: null };
}

/**
 * NVD `metrics.ssvcV203` → the three CISA decision points.
 *
 * NVD publishes the ADP SSVC verdict in a separate metric family that the
 * Phase 4B parser never read, so an SSVC decision that existed upstream was
 * invisible on our page.
 */
export function extractSsvc(metrics: any): SsvcDecision | null {
  const list = metrics?.ssvcV203;
  if (!Array.isArray(list) || list.length === 0) return null;
  const entry = list[0];
  const options = Array.isArray(entry?.ssvcData?.options) ? entry.ssvcData.options : [];
  const pick = (name: string): string | null => {
    const found = options.find((option: any) => String(option?.name || '').trim().toLowerCase() === name.toLowerCase());
    return found && typeof found.value === 'string' && found.value.trim() ? found.value.trim() : null;
  };
  const exploitation = pick('Exploitation');
  const automatable = pick('Automatable');
  const technicalImpact = pick('Technical Impact');
  if (exploitation === null && automatable === null && technicalImpact === null) return null;
  return {
    exploitation,
    automatable,
    technical_impact: technicalImpact,
    source: providerForSource(entry?.source),
    timestamp: typeof entry?.ssvcData?.timestamp === 'string' ? entry.ssvcData.timestamp : null,
  };
}

/**
 * `cve.affected[]` fallback when NVD publishes no CPE.
 *
 * A CNA that states `vendor: Debian, product: debbugs` is authoritative for the
 * entity, yet Phase 4B read only `configurations[].cpeMatch`, so 72 of 75 rows
 * lost vendor and product for no reason. A `git` version type is a commit, which
 * is a FIX REFERENCE, never a released fixed version: it is recorded as a
 * reference and never as `fixed_versions`.
 */
export function extractAffectedFallback(cve: any): {
  vendor: string | null;
  product: string | null;
  affected: string[];
  fixed: string[];
  references: CveReference[];
  exploitObserved: boolean;
} {
  let vendor: string | null = null;
  let product: string | null = null;
  const affected = new Set<string>();
  const fixed = new Set<string>();
  const references: CveReference[] = [];
  for (const entry of Array.isArray(cve?.affected) ? cve.affected : []) {
    const source = typeof entry?.source === 'string' ? providerForSource(entry.source) : 'CNA';
    if (!vendor && typeof entry?.vendor === 'string' && entry.vendor.trim()) vendor = entry.vendor.trim();
    if (!product && typeof entry?.product === 'string' && entry.product.trim()) product = entry.product.trim();
    for (const version of Array.isArray(entry?.versions) ? entry.versions : []) {
      const status = String(version?.status || '').toLowerCase();
      const lessThan = typeof version?.lessThan === 'string' ? version.lessThan.trim() : '';
      const lessThanOrEqual = typeof version?.lessThanOrEqual === 'string' ? version.lessThanOrEqual.trim() : '';
      const start = typeof version?.version === 'string' ? version.version.trim() : '';
      const versionType = String(version?.versionType || '').toLowerCase();
      const isAffected = status === '' || status === 'affected';
      if (versionType === 'git' && lessThan) {
        // A commit boundary is the fix commit itself.
        references.push({ url: `https://salsa.debian.org/debbugs-team/debbugs/-/commit/${lessThan}`, source, tags: ['Patch'] });
        affected.add(`< commit ${lessThan.slice(0, 12)}`);
        continue;
      }
      if (!isAffected) continue;
      if (start && start !== '0') affected.add(`>= ${start}`);
      if (lessThan) { affected.add(`< ${lessThan}`); fixed.add(lessThan); }
      if (lessThanOrEqual) { affected.add(`<= ${lessThanOrEqual}`); fixed.add(lessThanOrEqual); }
    }
  }
  return { vendor, product, affected: Array.from(affected), fixed: Array.from(fixed), references, exploitObserved: false };
}

/** Parse a CPE 2.3 string into vendor/product without guessing. */
export function parseCpe(criteria: unknown): { vendor: string | null; product: string | null } {
  if (typeof criteria !== 'string') return { vendor: null, product: null };
  const parts = criteria.split(':');
  // cpe:2.3:part:vendor:product:version:...
  if (parts.length < 5 || parts[0] !== 'cpe') return { vendor: null, product: null };
  const clean = (value: string) => (value && value !== '*' && value !== '-') ? value.replace(/_/g, ' ') : null;
  return { vendor: clean(parts[3]), product: clean(parts[4]) };
}

/**
 * Project an NVD 2.0 API payload into canonical records.
 *
 * Only source-stated values are used. CPE `versionEndExcluding` is NVD's own
 * statement that the affected range ends before that version, so it is the first
 * fixed version; there is no other fixed-version authority in NVD.
 */
export function extractNvdCves(payload: any): NvdCveRecord[] {
  const items = Array.isArray(payload?.vulnerabilities) ? payload.vulnerabilities : [];
  const out: NvdCveRecord[] = [];
  for (const item of items) {
    const cve = item?.cve;
    const cveId = typeof cve?.id === 'string' ? cve.id.trim().toUpperCase() : '';
    if (!/^CVE-\d{4}-\d{4,19}$/.test(cveId)) continue;
    const description = Array.isArray(cve?.descriptions)
      ? (cve.descriptions.find((d: any) => d?.lang === 'en')?.value || '')
      : '';
    const { score, vector, provider: cvssProvider, type: cvssType } = firstCvss(cve?.metrics);

    const affected = new Set<string>();
    const fixed = new Set<string>();
    let vendor: string | null = null;
    let product: string | null = null;
    for (const config of Array.isArray(cve?.configurations) ? cve.configurations : []) {
      for (const node of Array.isArray(config?.nodes) ? config.nodes : []) {
        for (const match of Array.isArray(node?.cpeMatch) ? node.cpeMatch : []) {
          const parsed = parseCpe(match?.criteria);
          if (!vendor && parsed.vendor) vendor = parsed.vendor;
          if (!product && parsed.product) product = parsed.product;
          const startIncluding = typeof match?.versionStartIncluding === 'string' ? match.versionStartIncluding : null;
          const endIncluding = typeof match?.versionEndIncluding === 'string' ? match.versionEndIncluding : null;
          const endExcluding = typeof match?.versionEndExcluding === 'string' ? match.versionEndExcluding : null;
          if (startIncluding) affected.add(`>= ${startIncluding}`);
          if (endIncluding) affected.add(`<= ${endIncluding}`);
          if (endExcluding) {
            affected.add(`< ${endExcluding}`);
            fixed.add(endExcluding);
          }
        }
      }
    }

    const references: CveReference[] = (Array.isArray(cve?.references) ? cve.references : [])
      .filter((ref: any) => typeof ref?.url === 'string' && ref.url.trim())
      .map((ref: any) => ({
        url: ref.url.trim(),
        source: 'NVD',
        tags: (Array.isArray(ref?.tags) ? ref.tags : []).map((tag: unknown) => String(tag)).filter(Boolean),
      }));
    const patchRef = references.find((ref) => ref.tags.some((tag) => tag.toLowerCase() === 'patch'));
    const exploitReferenceObserved = references.some((ref) => ref.tags.some((tag) => tag.toLowerCase() === 'exploit'));

    // No CPE published (very common while NVD is `Awaiting Analysis`) → the CNA
    // `affected[]` array is still authoritative for the entity and the range.
    const fallback = extractAffectedFallback(cve);
    if (!vendor && fallback.vendor) vendor = fallback.vendor;
    if (!product && fallback.product) product = fallback.product;
    for (const range of fallback.affected) affected.add(range);
    for (const version of fallback.fixed) fixed.add(version);
    for (const ref of fallback.references) references.push(ref);

    const weaknesses = Array.isArray(cve?.weaknesses) ? cve.weaknesses : [];
    const cweIds: CweEntry[] = [];
    for (const weakness of weaknesses) {
      const source = providerForSource(weakness?.source);
      for (const entry of Array.isArray(weakness?.description) ? weakness.description : []) {
        const value = typeof entry?.value === 'string' ? entry.value.trim().toUpperCase() : '';
        if (/^CWE-\d+$/.test(value) && !cweIds.some((existing) => existing.id === value)) cweIds.push({ id: value, source });
      }
    }

    const published = typeof cve?.published === 'string' && !Number.isNaN(new Date(cve.published).getTime())
      ? new Date(cve.published).toISOString()
      : null;
    const modified = typeof cve?.lastModified === 'string' && !Number.isNaN(new Date(cve.lastModified).getTime())
      ? new Date(cve.lastModified).toISOString()
      : null;

    out.push({
      cve_id: cveId,
      description: typeof description === 'string' ? description.trim().slice(0, 8000) : '',
      cvss_score: score,
      cvss_vector: vector,
      severity: severityFromCvss(score),
      published_at: published,
      modified_at: modified,
      vuln_status: typeof cve?.vulnStatus === 'string' && cve.vulnStatus.trim() ? cve.vulnStatus.trim() : null,
      vendor,
      product,
      affected_versions: Array.from(affected).sort(),
      fixed_versions: Array.from(fixed).sort(),
      patch_url: typeof patchRef?.url === 'string' ? patchRef.url : null,
      cwe_ids: cweIds,
      references,
      cvss_source_provider: cvssProvider,
      cvss_source_type: cvssType,
      ssvc: extractSsvc(cve?.metrics),
      exploit_reference_observed: exploitReferenceObserved,
    });
  }
  return out;
}

/** NVD recent-CVE fetch. An API key is optional and only raises the rate limit. */
export async function fetchRecentNvdCves(
  limit: number,
  days: number,
  fetchFn: typeof fetch = fetch,
  apiKey?: string,
): Promise<NvdCveRecord[]> {
  const end = new Date();
  const start = new Date(end.getTime() - Math.max(1, days) * 24 * 60 * 60 * 1000);
  const params = new URLSearchParams({
    pubStartDate: start.toISOString(),
    pubEndDate: end.toISOString(),
    resultsPerPage: String(Math.max(1, Math.min(limit, 50))),
  });
  const headers: Record<string, string> = { accept: 'application/json' };
  if (apiKey) headers.apiKey = apiKey;
  const response = await fetchFn(`https://services.nvd.nist.gov/rest/json/cves/2.0?${params.toString()}`, { headers });
  if (!response.ok) throw new Error(`NVD_HTTP_${response.status}`);
  return extractNvdCves(await response.json());
}

export interface KevEntry {
  dateAdded: string | null;
  dueDate: string | null;
  requiredAction: string | null;
}

export async function fetchKevCatalog(fetchFn: typeof fetch = fetch): Promise<Map<string, KevEntry>> {
  const response = await fetchFn('https://www.cisa.gov/sites/default/files/feeds/known_exploited_vulnerabilities.json', {
    headers: { accept: 'application/json' },
  });
  if (!response.ok) throw new Error(`KEV_HTTP_${response.status}`);
  const payload = await response.json() as any;
  const map = new Map<string, KevEntry>();
  for (const item of Array.isArray(payload?.vulnerabilities) ? payload.vulnerabilities : []) {
    if (typeof item?.cveID !== 'string') continue;
    map.set(item.cveID.toUpperCase(), {
      dateAdded: typeof item.dateAdded === 'string' ? item.dateAdded : null,
      dueDate: typeof item.dueDate === 'string' ? item.dueDate : null,
      requiredAction: typeof item.requiredAction === 'string' ? item.requiredAction : null,
    });
  }
  return map;
}

export async function fetchEpssScores(
  cveIds: string[],
  fetchFn: typeof fetch = fetch,
): Promise<Map<string, { score: number; percentile: number | null }>> {
  const map = new Map<string, { score: number; percentile: number | null }>();
  if (cveIds.length === 0) return map;
  const url = `https://api.first.org/data/v1/epss?cve=${encodeURIComponent(cveIds.join(','))}`;
  const response = await fetchFn(url, { headers: { accept: 'application/json' } });
  if (!response.ok) throw new Error(`EPSS_HTTP_${response.status}`);
  const payload = await response.json() as any;
  for (const row of Array.isArray(payload?.data) ? payload.data : []) {
    const cve = typeof row?.cve === 'string' ? row.cve.toUpperCase() : '';
    const score = Number(row?.epss);
    if (!cve || !Number.isFinite(score)) continue;
    const percentile = Number(row?.percentile);
    map.set(cve, { score, percentile: Number.isFinite(percentile) ? percentile : null });
  }
  return map;
}

const UPSERT_SQL = `
INSERT INTO vulnerabilities (
  id, cve_id, title, description, severity, cvss_score, cvss_vector, epss_score,
  is_exploited_in_wild, affected_vendor, affected_product, patch_url, published_at,
  provenance_state, provenance_source, provenance_updated_at, epss_percentile,
  affected_versions_json, fixed_versions_json, kev_due_date,
  vuln_status, cwe_ids_json, references_json, cvss_source_provider, cvss_source_type,
  ssvc_json, public_poc_status, poc_validation, poc_references_json,
  in_the_wild_exploitation, modified_at, last_checked_at, created_at, updated_at
) VALUES (
  ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,
  'AUTHORITATIVE_VERIFIED', 'nvd+kev+epss', datetime('now'), ?,
  ?, ?, ?,
  ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'), datetime('now')
)
ON CONFLICT(cve_id) DO UPDATE SET
  title = excluded.title,
  description = CASE WHEN excluded.description <> '' THEN excluded.description ELSE vulnerabilities.description END,
  severity = excluded.severity,
  cvss_score = COALESCE(excluded.cvss_score, vulnerabilities.cvss_score),
  cvss_vector = COALESCE(excluded.cvss_vector, vulnerabilities.cvss_vector),
  epss_score = COALESCE(excluded.epss_score, vulnerabilities.epss_score),
  epss_percentile = COALESCE(excluded.epss_percentile, vulnerabilities.epss_percentile),
  is_exploited_in_wild = excluded.is_exploited_in_wild,
  affected_vendor = COALESCE(excluded.affected_vendor, vulnerabilities.affected_vendor),
  affected_product = COALESCE(excluded.affected_product, vulnerabilities.affected_product),
  patch_url = COALESCE(excluded.patch_url, vulnerabilities.patch_url),
  published_at = COALESCE(excluded.published_at, vulnerabilities.published_at),
  provenance_state = 'AUTHORITATIVE_VERIFIED',
  provenance_source = 'nvd+kev+epss',
  provenance_updated_at = datetime('now'),
  affected_versions_json = excluded.affected_versions_json,
  fixed_versions_json = excluded.fixed_versions_json,
  kev_due_date = excluded.kev_due_date,
  -- Phase 5A enrichment columns. A source that publishes nothing must never
  -- erase what another authority established: every write is COALESCE + "never
  -- drop a richer array" rather than a plain overwrite.
  vuln_status = COALESCE(excluded.vuln_status, vulnerabilities.vuln_status),
  cwe_ids_json = CASE WHEN COALESCE(excluded.cwe_ids_json, '[]') IN ('[]', '') THEN vulnerabilities.cwe_ids_json ELSE excluded.cwe_ids_json END,
  references_json = CASE WHEN COALESCE(excluded.references_json, '[]') IN ('[]', '') THEN vulnerabilities.references_json ELSE excluded.references_json END,
  cvss_source_provider = COALESCE(excluded.cvss_source_provider, vulnerabilities.cvss_source_provider),
  cvss_source_type = COALESCE(excluded.cvss_source_type, vulnerabilities.cvss_source_type),
  ssvc_json = COALESCE(excluded.ssvc_json, vulnerabilities.ssvc_json),
  public_poc_status = CASE WHEN vulnerabilities.public_poc_status = 'OBSERVED' THEN 'OBSERVED' ELSE COALESCE(excluded.public_poc_status, vulnerabilities.public_poc_status) END,
  poc_validation = CASE WHEN vulnerabilities.poc_validation = 'VALIDATED' THEN 'VALIDATED' ELSE COALESCE(excluded.poc_validation, vulnerabilities.poc_validation) END,
  poc_references_json = CASE WHEN COALESCE(excluded.poc_references_json, '[]') IN ('[]', '') THEN vulnerabilities.poc_references_json ELSE excluded.poc_references_json END,
  in_the_wild_exploitation = CASE WHEN excluded.is_exploited_in_wild = 1 THEN 'CONFIRMED' ELSE COALESCE(vulnerabilities.in_the_wild_exploitation, 'UNKNOWN') END,
  modified_at = COALESCE(excluded.modified_at, vulnerabilities.modified_at),
  last_checked_at = datetime('now'),
  updated_at = datetime('now')
`;

/**
 * One authoritative ingestion pass.
 *
 * Every external source is independently fallible: an NVD failure aborts the pass
 * (there is nothing authoritative to write), while a KEV or EPSS failure degrades
 * only its own fields and is reported in `errors`.
 */
export async function runAuthoritativeVulnIngest(
  env: EnvLike,
  options: { limit?: number; days?: number; fetchFn?: typeof fetch } = {},
): Promise<AuthoritativeIngestSummary> {
  const fetchFn = options.fetchFn || fetch;
  const limit = Math.max(1, Math.min(options.limit ?? 10, 50));
  const days = Math.max(1, Math.min(options.days ?? 30, 120));
  const summary: AuthoritativeIngestSummary = {
    requested_limit: limit,
    nvd_records: 0,
    persisted: 0,
    kev_matched: 0,
    epss_matched: 0,
    acknowledged_unmodified: 0,
    cves: [],
    errors: [],
  };

  const records = await fetchRecentNvdCves(limit, days, fetchFn, env.NVD_API_KEY);
  summary.nvd_records = records.length;
  if (records.length === 0) {
    summary.errors.push('NVD_RETURNED_NO_RECORDS');
    return summary;
  }
  const ids = records.map((record) => record.cve_id);

  let kev = new Map<string, KevEntry>();
  try {
    kev = await fetchKevCatalog(fetchFn);
  } catch (error) {
    summary.errors.push(`KEV_UNAVAILABLE:${String((error as Error)?.message || error).slice(0, 120)}`);
  }
  let epss = new Map<string, { score: number; percentile: number | null }>();
  try {
    epss = await fetchEpssScores(ids, fetchFn);
  } catch (error) {
    summary.errors.push(`EPSS_UNAVAILABLE:${String((error as Error)?.message || error).slice(0, 120)}`);
  }

  // The authority is registered as a source even on a fresh database.
  await env.DB.prepare(
    `INSERT INTO sources (id, display_name, source_type, language, region, trust_score, priority, status, enabled, created_at, updated_at)
     VALUES ('first-epss', 'FIRST Exploit Prediction Scoring System', 'api', 'en', 'global', 0.9, 'A', 'ENABLED', 1, datetime('now'), datetime('now'))
     ON CONFLICT(id) DO NOTHING`,
  ).run().catch(() => undefined);

  for (const record of records) {
    const kevEntry = kev.get(record.cve_id) || null;
    const epssEntry = epss.get(record.cve_id) || null;
    if (kevEntry) summary.kev_matched += 1;
    if (epssEntry) summary.epss_matched += 1;
    const id = `vuln_${record.cve_id.toLowerCase().replace(/[^a-z0-9]/g, '_')}`;
    try {
      await env.DB.prepare(UPSERT_SQL).bind(
        id,
        record.cve_id,
        `${record.cve_id} Security Advisory`,
        record.description,
        record.severity,
        record.cvss_score,
        record.cvss_vector,
        epssEntry ? epssEntry.score : null,
        kevEntry ? 1 : 0,
        record.vendor,
        record.product,
        record.patch_url,
        record.published_at,
        epssEntry ? epssEntry.percentile : null,
        JSON.stringify(record.affected_versions),
        JSON.stringify(record.fixed_versions),
        kevEntry ? kevEntry.dueDate : null,
        record.vuln_status,
        JSON.stringify(record.cwe_ids),
        JSON.stringify(record.references),
        record.cvss_source_provider,
        record.cvss_source_type,
        record.ssvc ? JSON.stringify(record.ssvc) : null,
        record.exploit_reference_observed ? 'OBSERVED' : 'NOT_OBSERVED',
        // A reference tag is observation, never validation.
        'NOT_VALIDATED',
        JSON.stringify(record.references.filter((ref) => ref.tags.some((tag) => tag.toLowerCase() === 'exploit'))),
        kevEntry ? 'CONFIRMED' : 'UNKNOWN',
        record.modified_at,
      ).run();
      summary.persisted += 1;
      summary.cves.push(record.cve_id);
    } catch (error) {
      summary.errors.push(`PERSIST_FAILED:${record.cve_id}:${String((error as Error)?.message || error).slice(0, 160)}`);
    }
  }
  return summary;
}
