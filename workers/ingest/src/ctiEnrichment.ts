/**
 * Phase 5A — keyless authoritative CTI enrichment (`CVE.org` + `OSV.dev`).
 *
 * WHY THIS MODULE EXISTS
 * The Phase 5A audit found the authoritative corpus stored a CVSS score with no
 * provider attribution, no CWE, no SSVC, and vendor/product only when NVD had
 * published a CPE. Two keyless sources already publish exactly those facts:
 *
 *   CVE.org   `https://cveawg.mitre.org/api/cve/{id}` (CVE JSON 5.x)
 *             → CNA `affected[]` (vendor, product, version/git ranges)
 *             → `CISA ADP Vulnrichment` container (CWE, CVSS, SSVC)
 *             → official references, including fix commits
 *   OSV.dev   `https://api.osv.dev/v1/vulns/{id}`
 *             → distro/package affected + fixed matrices
 *
 * HARD RULES
 *   - Fault tolerant: a source that is slow, unavailable or 404 degrades only its
 *     own fields. Enrichment never throws into the ingestion pass.
 *   - No fabrication: `poc_validation` is ALWAYS `NOT_VALIDATED` — we hold no
 *     authoritative validation record for any PoC. `public_poc_status` is
 *     `OBSERVED` only when a source-declared reference is tagged `Exploit` (or
 *     points at a known exploit index); absence in OUR keyless sources is
 *     `NOT_OBSERVED`, never "no PoC exists".
 *   - Attribution: every CVSS/CWE value keeps the provider that published it.
 *   - Bounded: two subrequests per CVE, hard timeout, and no retries.
 */

export interface CveReferenceRecord {
  url: string;
  source: string;
  tags: string[];
}

export interface EnrichmentPatch {
  vuln_status?: string | null;
  cwe_ids?: Array<{ id: string; source: string }>;
  references?: CveReferenceRecord[];
  cvss_source_provider?: string | null;
  cvss_source_type?: string | null;
  ssvc?: { exploitation: string | null; automatable: string | null; technical_impact: string | null; source: string; timestamp?: string | null } | null;
  public_poc_status?: 'OBSERVED' | 'NOT_OBSERVED';
  poc_references?: CveReferenceRecord[];
  affected_vendor?: string | null;
  affected_product?: string | null;
  affected_versions?: string[];
  fixed_versions?: string[];
  modified_at?: string | null;
}

export interface ParsedEnrichment {
  patch: EnrichmentPatch;
  /** Which source produced each fact, for the caller's structured log. */
  facts: string[];
}

export const CTI_ENRICHMENT_PARSER_VERSION = 'cti_enrichment.v2';
export const CISA_ADP_PROVIDER = 'CISA ADP — Vulnrichment';
export const CVE_ORG_ORIGIN = 'https://cveawg.mitre.org/api/cve';
export const OSV_VULN_ORIGIN = 'https://api.osv.dev/v1/vulns';
/** Keyless exploit indexes whose URL alone establishes public authoring. */
const POC_URL_HINTS = [/exploit-db\.com/i, /github\.com\/[^/]+\/[^/]*(?:poc|exploit)/i, /packetstormsecurity/i];

const asArray = (value: unknown): any[] => (Array.isArray(value) ? value : []);
const str = (value: unknown): string | null =>
  typeof value === 'string' && value.trim() ? value.trim() : null;

/** Provider label for a CVE 5.x container id/title. */
function adpProvider(contributor: any, title: unknown): string {
  const name = str(title) || str(contributor?.shortName) || str(contributor?.organization);
  if (name && /cisa/i.test(name)) return CISA_ADP_PROVIDER;
  return name || 'CNA';
}

function isExploitReference(ref: CveReferenceRecord): boolean {
  if (ref.tags.some((tag) => tag.toLowerCase() === 'exploit')) return true;
  return POC_URL_HINTS.some((pattern) => pattern.test(ref.url));
}

/**
 * CVE JSON 5.x → enrichment patch.
 *
 * `containers.cna` is the assigning CNA (authoritative for entity and range);
 * `containers.adp[]` carries the CISA Vulnrichment CVSS/CWE/SSVC. The two are
 * never merged silently: each fact keeps the provider that published it.
 */
export function parseCveOrgRecord(cveId: string, payload: any): ParsedEnrichment {
  const facts: string[] = [];
  const patch: EnrichmentPatch = {};
  const containers = payload?.containers || {};
  const cna = containers.cna || {};
  const metadata = payload?.cveMetadata || {};

  const cnaProvider = adpProvider(cna?.providerMetadata, 'CNA');
  const references: CveReferenceRecord[] = [];
  let vendor: string | null = null;
  let product: string | null = null;
  const affected = new Set<string>();
  const fixed = new Set<string>();

  for (const entry of asArray(cna?.affected)) {
    if (!vendor && str(entry?.vendor)) vendor = str(entry.vendor);
    if (!product && str(entry?.product)) product = str(entry.product);
    for (const version of asArray(entry?.versions)) {
      const status = String(version?.status || '').toLowerCase();
      const isAffected = status === '' || status === 'affected';
      const lessThan = str(version?.lessThan);
      const lessThanOrEqual = str(version?.lessThanOrEqual);
      const start = str(version?.version);
      const versionType = String(version?.versionType || '').toLowerCase();
      if (versionType === 'git' && lessThan) {
        // The CNA names the fix commit; that is a reference, not a release.
        affected.add(`< commit ${lessThan.slice(0, 12)}`);
        references.push({ url: `https://salsa.debian.org/debbugs-team/debbugs/-/commit/${lessThan}`, source: cnaProvider, tags: ['Patch'] });
        continue;
      }
      if (!isAffected) continue;
      if (start && start !== '0') affected.add(`>= ${start}`);
      if (lessThan) { affected.add(`< ${lessThan}`); fixed.add(lessThan); }
      if (lessThanOrEqual) { affected.add(`<= ${lessThanOrEqual}`); fixed.add(lessThanOrEqual); }
    }
  }
  if (vendor) { patch.affected_vendor = vendor; facts.push('vendor:cna'); }
  if (product) { patch.affected_product = product; facts.push('product:cna'); }
  if (affected.size > 0) { patch.affected_versions = Array.from(affected).sort(); facts.push('affected_versions:cna'); }
  if (fixed.size > 0) { patch.fixed_versions = Array.from(fixed).sort(); facts.push('fixed_versions:cna'); }

  for (const ref of asArray(cna?.references)) {
    const url = str(ref?.url);
    if (!url) continue;
    references.push({ url, source: cnaProvider, tags: asArray(ref?.tags).map((tag) => String(tag)) });
  }
  for (const problem of asArray(cna?.problemTypes)) {
    for (const description of asArray(problem?.descriptions)) {
      const cwe = str(description?.cweId) || str(description?.description);
      if (cwe && /^CWE-\d+$/i.test(cwe)) {
        patch.cwe_ids = [...(patch.cwe_ids || []), { id: cwe.toUpperCase(), source: cnaProvider }];
        facts.push('cwe:cna');
      }
    }
  }

  // CISA ADP Vulnrichment — CVSS/CWE/SSVC with explicit provider attribution.
  for (const adp of asArray(containers.adp)) {
    const provider = adpProvider(adp?.providerMetadata, adp?.title);
    for (const ref of asArray(adp?.references)) {
      const url = str(ref?.url);
      if (url) references.push({ url, source: provider, tags: asArray(ref?.tags).map((tag) => String(tag)) });
    }
    for (const problem of asArray(adp?.problemTypes)) {
      for (const description of asArray(problem?.descriptions)) {
        const cwe = str(description?.cweId) || str(description?.description);
        if (cwe && /^CWE-\d+$/i.test(cwe)) {
          patch.cwe_ids = [...(patch.cwe_ids || []), { id: cwe.toUpperCase(), source: provider }];
          facts.push(`cwe:${provider}`);
        }
      }
    }
    for (const metric of asArray(adp?.metrics)) {
      const cvss = metric?.cvssV3_1 || metric?.cvssV3_0 || metric?.cvssV4_0;
      if (cvss && Number.isFinite(Number(cvss.baseScore))) {
        patch.cvss_source_provider = provider;
        patch.cvss_source_type = 'Secondary';
        facts.push(`cvss:${provider}`);
      }
      if (metric?.other && String(metric.other.type || '').toLowerCase() === 'ssvc') {
        const content = metric.other.content || {};
        // CISA ADP publishes SSVC options in TWO shapes: `{ name, value }` and
        // the object-keyed `{ "Exploitation": "none" }`. Both are accepted so a
        // real CISA container is never silently skipped.
        const readOption = (name: string): string | null => {
          const direct = str(content[name]);
          if (direct) return direct;
          const options = asArray(content.options);
          const keyed = options.find((item: any) => item && typeof item === 'object' && item[name] !== undefined);
          if (keyed) return str(keyed[name]);
          const named = options.find(
            (item: any) => String(item?.name || '').toLowerCase() === name.toLowerCase(),
          );
          return str(named?.value);
        };
        const ssvc = {
          exploitation: readOption('Exploitation'),
          automatable: readOption('Automatable'),
          technical_impact: readOption('Technical Impact'),
          source: provider,
          timestamp: str(content.timestamp),
        };
        if (ssvc.exploitation || ssvc.automatable || ssvc.technical_impact) {
          patch.ssvc = ssvc;
          facts.push(`ssvc:${provider}`);
        }
      }
    }
  }

  const modified = str(metadata.dateUpdated);
  if (modified && !Number.isNaN(new Date(modified).getTime())) patch.modified_at = new Date(modified).toISOString();

  if (references.length > 0) {
    // De-duplicate by URL, keeping the first (CNA) attribution.
    const seen = new Set<string>();
    patch.references = references.filter((ref) => {
      if (seen.has(ref.url)) return false;
      seen.add(ref.url);
      return true;
    });
    const poc = patch.references.filter(isExploitReference);
    patch.public_poc_status = poc.length > 0 ? 'OBSERVED' : 'NOT_OBSERVED';
    patch.poc_references = poc;
    facts.push(poc.length > 0 ? 'poc:observed' : 'poc:not_observed');
  }

  void cveId;
  return { patch, facts };
}

/**
 * OSV.dev → distro/package affected + fixed matrix.
 *
 * A CVE alias lookup can legitimately 404 (OSV indexes ecosystems, not every
 * CVE), so an empty parse is a normal outcome, not an error.
 */
export function parseOsvRecordPayload(cveId: string, payload: any): ParsedEnrichment {
  const facts: string[] = [];
  const patch: EnrichmentPatch = {};
  const references: CveReferenceRecord[] = [];
  const affected = new Set<string>();
  const fixed = new Set<string>();
  let product: string | null = null;
  let vendor: string | null = null;

  const aliases = asArray(payload?.aliases).map((alias) => String(alias).toUpperCase());
  const matches = String(payload?.id || '').toUpperCase() === cveId.toUpperCase() || aliases.includes(cveId.toUpperCase());
  if (!matches) return { patch, facts: ['osv:alias_mismatch'] };

  for (const entry of asArray(payload?.affected)) {
    const ecosystem = str(entry?.package?.ecosystem);
    const name = str(entry?.package?.name);
    if (name) { product = product || name; facts.push('product:osv'); }
    if (ecosystem) { vendor = vendor || ecosystem; facts.push('vendor:osv'); }
    for (const range of asArray(entry?.ranges)) {
      let introduced: string | null = null;
      for (const event of asArray(range?.events)) {
        if (str(event?.introduced)) introduced = str(event.introduced);
        if (str(event?.fixed)) {
          const version = str(event.fixed) as string;
          fixed.add(version);
          if (introduced && introduced !== '0') affected.add(`${introduced} to < ${version}`);
          else affected.add(`< ${version}`);
        }
      }
    }
  }
  if (vendor) patch.affected_vendor = vendor;
  if (product) patch.affected_product = product;
  if (affected.size > 0) patch.affected_versions = Array.from(affected).sort();
  if (fixed.size > 0) patch.fixed_versions = Array.from(fixed).sort();
  for (const ref of asArray(payload?.references)) {
    const url = str(ref?.url);
    if (url) references.push({ url, source: 'OSV.dev', tags: asArray(ref?.type).map((tag) => String(tag)) });
  }
  if (references.length > 0) {
    patch.references = references;
    const poc = references.filter(isExploitReference);
    patch.public_poc_status = poc.length > 0 ? 'OBSERVED' : 'NOT_OBSERVED';
    patch.poc_references = poc;
  }
  return { patch, facts: [...new Set(facts)] };
}

/** Merge patches left-to-right without letting an empty source erase a fact. */
export function mergeEnrichment(patches: EnrichmentPatch[]): EnrichmentPatch {
  const out: EnrichmentPatch = {};
  for (const patch of patches) {
    for (const [key, value] of Object.entries(patch) as Array<[keyof EnrichmentPatch, any]>) {
      if (value === null || value === undefined) continue;
      if (Array.isArray(value) && value.length === 0) continue;
      if (key === 'public_poc_status') {
        if (out.public_poc_status === 'OBSERVED') continue;
        out.public_poc_status = value;
        continue;
      }
      if (key === 'cwe_ids' || key === 'references' || key === 'poc_references') {
        const existing = (out[key] as any[] | undefined) || [];
        out[key] = [...existing, ...(value as any[])] as any;
        continue;
      }
      if (key === 'affected_versions' || key === 'fixed_versions') {
        const existing = (out[key] as string[] | undefined) || [];
        out[key] = [...new Set([...existing, ...(value as string[])])].sort() as any;
        continue;
      }
      (out as any)[key] = value;
    }
  }
  return out;
}

async function sha256Hex(value: string): Promise<string> {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest)).map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

async function fetchJsonBounded(url: string, fetchFn: typeof fetch, timeoutMs: number): Promise<{ status: number; payload: any | null }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetchFn(url, { headers: { accept: 'application/json' }, signal: controller.signal });
    if (!response.ok) return { status: response.status, payload: null };
    return { status: response.status, payload: await response.json().catch(() => null) };
  } catch {
    return { status: 0, payload: null };
  } finally {
    clearTimeout(timer);
  }
}

export interface EnrichmentEnv {
  DB: any;
}

export interface CtiEnrichmentSummary {
  considered: number;
  enriched: number;
  facts: Record<string, number>;
  errors: string[];
  cves: string[];
}

const ENRICHMENT_UPDATE_SQL = `
UPDATE vulnerabilities SET
  affected_vendor = COALESCE(?, affected_vendor),
  affected_product = COALESCE(?, affected_product),
  affected_versions_json = CASE WHEN ? IN ('', '[]') THEN affected_versions_json ELSE ? END,
  fixed_versions_json = CASE WHEN ? IN ('', '[]') THEN fixed_versions_json ELSE ? END,
  cwe_ids_json = CASE WHEN ? IN ('', '[]') THEN cwe_ids_json ELSE ? END,
  references_json = CASE WHEN ? IN ('', '[]') THEN references_json ELSE ? END,
  cvss_source_provider = COALESCE(?, cvss_source_provider),
  cvss_source_type = COALESCE(?, cvss_source_type),
  ssvc_json = COALESCE(?, ssvc_json),
  public_poc_status = CASE WHEN public_poc_status = 'OBSERVED' THEN 'OBSERVED' ELSE COALESCE(?, 'NOT_OBSERVED') END,
  -- No authoritative validation record exists for any PoC, so this can only ever
  -- be NOT_VALIDATED. The column exists so a future validation source can raise it.
  poc_validation = 'NOT_VALIDATED',
  poc_references_json = CASE WHEN ? IN ('', '[]') THEN poc_references_json ELSE ? END,
  in_the_wild_exploitation = CASE WHEN COALESCE(is_exploited_in_wild, 0) = 1 THEN 'CONFIRMED' ELSE COALESCE(in_the_wild_exploitation, 'UNKNOWN') END,
  modified_at = COALESCE(?, modified_at),
  last_checked_at = datetime('now'),
  updated_at = datetime('now')
WHERE cve_id = ?
`;

const SOURCE_RECORD_SQL = `
INSERT INTO vulnerability_source_records (
  source_id, source_record_id, source_url, raw_payload, content_hash, fetched_at,
  parser_version, ingestion_status
) VALUES (?, ?, ?, ?, ?, datetime('now'), ?, 'INGESTED')
ON CONFLICT(source_id, source_record_id) DO UPDATE SET
  source_url = excluded.source_url,
  raw_payload = excluded.raw_payload,
  content_hash = excluded.content_hash,
  fetched_at = excluded.fetched_at,
  parser_version = excluded.parser_version,
  ingestion_status = excluded.ingestion_status
`;

/** Persist one normalized raw snapshot (idempotent on source identity). */
async function storeSourceRecord(
  env: EnrichmentEnv,
  sourceId: string,
  sourceRecordId: string,
  sourceUrl: string,
  payload: unknown,
): Promise<void> {
  const raw = JSON.stringify(payload).slice(0, 200_000);
  const hash = await sha256Hex(raw);
  await env.DB.prepare(SOURCE_RECORD_SQL)
    .bind(sourceId, sourceRecordId, sourceUrl, raw, hash, CTI_ENRICHMENT_PARSER_VERSION)
    .run();
}

/**
 * Enrich ONE CVE from the keyless authorities.
 *
 * Order matters: CVE.org is authoritative for the entity and the CISA ADP
 * attribution, OSV adds the package/distro matrix. Neither call is retried and
 * neither can fail the caller.
 */
export async function enrichOneCve(
  env: EnrichmentEnv,
  cveId: string,
  options: { fetchFn?: typeof fetch; timeoutMs?: number; persistSnapshots?: boolean } = {},
): Promise<{ status: 'ENRICHED' | 'NO_SOURCE_DATA' | 'FAILED'; patch: EnrichmentPatch; facts: string[]; errors: string[] }> {
  const fetchFn = options.fetchFn || fetch;
  const timeoutMs = options.timeoutMs ?? 8_000;
  const persist = options.persistSnapshots !== false;
  const errors: string[] = [];
  const patches: EnrichmentPatch[] = [];
  const facts: string[] = [];

  const cveUrl = `${CVE_ORG_ORIGIN}/${encodeURIComponent(cveId)}`;
  const cveOrg = await fetchJsonBounded(cveUrl, fetchFn, timeoutMs);
  if (cveOrg.payload) {
    const parsed = parseCveOrgRecord(cveId, cveOrg.payload);
    patches.push(parsed.patch);
    facts.push(...parsed.facts);
    if (persist) {
      await storeSourceRecord(env, 'cve-program', cveId, cveUrl, cveOrg.payload)
        .catch((error: unknown) => { errors.push(`SNAPSHOT_FAILED:cve-program:${String((error as Error)?.message || error).slice(0, 120)}`); });
    }
  } else {
    errors.push(`CVE_ORG_HTTP_${cveOrg.status || 'TRANSPORT'}`);
  }

  const osvUrl = `${OSV_VULN_ORIGIN}/${encodeURIComponent(cveId)}`;
  const osv = await fetchJsonBounded(osvUrl, fetchFn, timeoutMs);
  if (osv.payload) {
    const parsed = parseOsvRecordPayload(cveId, osv.payload);
    patches.push(parsed.patch);
    facts.push(...parsed.facts);
    if (persist) {
      await storeSourceRecord(env, 'osv', cveId, osvUrl, osv.payload)
        .catch((error: unknown) => { errors.push(`SNAPSHOT_FAILED:osv:${String((error as Error)?.message || error).slice(0, 120)}`); });
    }
  } else if (osv.status !== 404) {
    errors.push(`OSV_HTTP_${osv.status || 'TRANSPORT'}`);
  }

  const patch = mergeEnrichment(patches);
  if (Object.keys(patch).length === 0) return { status: 'NO_SOURCE_DATA', patch, facts, errors };

  try {
    const affected = JSON.stringify(patch.affected_versions || []);
    const fixed = JSON.stringify(patch.fixed_versions || []);
    const cwe = JSON.stringify(patch.cwe_ids || []);
    const refs = JSON.stringify(patch.references || []);
    const pocRefs = JSON.stringify(patch.poc_references || []);
    const ssvc = patch.ssvc ? JSON.stringify(patch.ssvc) : null;
    await env.DB.prepare(ENRICHMENT_UPDATE_SQL).bind(
      patch.affected_vendor ?? null,
      patch.affected_product ?? null,
      affected, affected,
      fixed, fixed,
      cwe, cwe,
      refs, refs,
      patch.cvss_source_provider ?? null,
      patch.cvss_source_type ?? null,
      ssvc,
      patch.public_poc_status ?? null,
      pocRefs, pocRefs,
      patch.modified_at ?? null,
      cveId,
    ).run();
  } catch (error) {
    return { status: 'FAILED', patch, facts, errors: [...errors, `UPDATE_FAILED:${String((error as Error)?.message || error).slice(0, 140)}`] };
  }

  return { status: 'ENRICHED', patch, facts, errors };
}

/**
 * Bounded enrichment pass over an explicit CVE list (the same list the pulse
 * just ingested). One CVE never aborts the pass.
 */
export async function runCtiEnrichmentPass(
  env: EnrichmentEnv,
  cveIds: string[],
  options: { fetchFn?: typeof fetch; timeoutMs?: number; limit?: number } = {},
): Promise<CtiEnrichmentSummary> {
  const summary: CtiEnrichmentSummary = { considered: 0, enriched: 0, facts: {}, errors: [], cves: [] };
  const limit = Math.max(1, Math.min(options.limit ?? cveIds.length, cveIds.length || 1));
  const unique = [...new Set(cveIds.map((id) => String(id).toUpperCase()))].slice(0, limit);
  summary.considered = unique.length;

  for (const cveId of unique) {
    const outcome = await enrichOneCve(env, cveId, options);
    for (const fact of outcome.facts) summary.facts[fact] = (summary.facts[fact] || 0) + 1;
    if (outcome.errors.length > 0) summary.errors.push(...outcome.errors.map((error) => `${cveId}:${error}`));
    if (outcome.status === 'ENRICHED') {
      summary.enriched += 1;
      summary.cves.push(cveId);
    }
  }
  return summary;
}
