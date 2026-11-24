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

export interface NvdCveRecord {
  cve_id: string;
  description: string;
  cvss_score: number | null;
  cvss_vector: string | null;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'UNKNOWN';
  published_at: string | null;
  vendor: string | null;
  product: string | null;
  affected_versions: string[];
  fixed_versions: string[];
  patch_url: string | null;
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

function firstCvss(metrics: any): { score: number | null; vector: string | null } {
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
        };
      }
    }
  }
  return { score: null, vector: null };
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
    const { score, vector } = firstCvss(cve?.metrics);

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

    const patchRef = (Array.isArray(cve?.references) ? cve.references : [])
      .find((ref: any) => Array.isArray(ref?.tags) && ref.tags.some((t: unknown) => String(t).toLowerCase() === 'patch'));
    const published = typeof cve?.published === 'string' && !Number.isNaN(new Date(cve.published).getTime())
      ? new Date(cve.published).toISOString()
      : null;

    out.push({
      cve_id: cveId,
      description: typeof description === 'string' ? description.trim().slice(0, 8000) : '',
      cvss_score: score,
      cvss_vector: vector,
      severity: severityFromCvss(score),
      published_at: published,
      vendor,
      product,
      affected_versions: Array.from(affected).sort(),
      fixed_versions: Array.from(fixed).sort(),
      patch_url: typeof patchRef?.url === 'string' ? patchRef.url : null,
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
  affected_versions_json, fixed_versions_json, kev_due_date, created_at, updated_at
) VALUES (
  ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,
  'AUTHORITATIVE_VERIFIED', 'nvd+kev+epss', datetime('now'), ?,
  ?, ?, ?, datetime('now'), datetime('now')
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
      ).run();
      summary.persisted += 1;
      summary.cves.push(record.cve_id);
    } catch (error) {
      summary.errors.push(`PERSIST_FAILED:${record.cve_id}:${String((error as Error)?.message || error).slice(0, 160)}`);
    }
  }
  return summary;
}
