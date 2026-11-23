import { parseCisaKev, parseNvd, parseGithubAdvisory, parseOsv, parseEpss, validateSourceRecord, type AdapterResult, type NormalizedVulnerability } from './adapters';
import { VULNERABILITY_SOURCE_REGISTRY } from './registry';
import { assessVulnerabilityRelevance } from '../relevance/vulnerability';
import {
  assertPreviewVulnerabilityDatabase,
  parsePreviewDatabaseIdentity,
  persistNormalizedPreview,
  PREVIEW_DATABASE_IDENTITY_CONFLICT,
  type D1DatabaseIdentity,
  type PreviewD1Executor,
} from './persistence';
/** CISA Known Exploited Vulnerabilities catalog — the upstream Preview reads for KEV facts. */
export const CISA_KEV_FEED_URL = 'https://www.cisa.gov/sites/default/files/feeds/known_exploited_vulnerabilities.json';

/** Hard bounds: a single Preview supply run can never fan out without limit. */
export const PREVIEW_MAX_PROVIDER_REQUESTS = 3;
export const PREVIEW_MAX_DISCOVERY_RECORDS = 500;
export const PREVIEW_PROVIDER_TIMEOUT_MS = 6000;
export const PREVIEW_PROVIDER_ATTEMPTS = 2;

export type ProviderId = 'cisa-kev' | 'nvd' | 'cve-program' | 'github-advisory' | 'osv' | 'epss';

/**
 * Exact upstream hosts Preview ingestion may contact. A request to any other
 * host (including any production/collector origin) is refused before fetching.
 */
const APPROVED_PREVIEW_PROVIDER_HOSTS: Readonly<Record<ProviderId, string>> = {
  'cisa-kev': 'www.cisa.gov',
  nvd: 'services.nvd.nist.gov',
  'cve-program': 'cveawg.mitre.org',
  'github-advisory': 'api.github.com',
  osv: 'api.osv.dev',
  epss: 'api.first.org',
};

export interface ProviderRequest {
  provider: ProviderId;
  url: string;
  parser: (payload: any, url: string) => AdapterResult;
  enabled?: boolean;
}

export function assertApprovedPreviewProviderRequest(request: ProviderRequest): void {
  const parsed = new URL(request.url);
  if (parsed.protocol !== 'https:' || parsed.hostname !== APPROVED_PREVIEW_PROVIDER_HOSTS[request.provider]) {
    throw new Error('PREVIEW_PROVIDER_URL_NOT_APPROVED');
  }
}

/** The bounded, legitimate upstream request set for ONE vulnerability identifier. */
export function previewProviderRequests(cveId: string): ProviderRequest[] {
  const cve = cveId.trim().toUpperCase();
  if (!/^CVE-\d{4}-\d{4,19}$/.test(cve)) throw new Error('INVALID_CVE_ID');
  return [
    {
      provider: 'cisa-kev',
      url: CISA_KEV_FEED_URL,
      parser: (payload, url) => {
        const entry = Array.isArray(payload?.vulnerabilities)
          ? payload.vulnerabilities.find((item: { cveID?: string }) => String(item.cveID || '').toUpperCase() === cve)
          : undefined;
        return parseCisaKev(entry ? { vulnerability: entry } : { vulnerability: {} }, url);
      },
    },
    { provider: 'nvd', url: `https://services.nvd.nist.gov/rest/json/cves/2.0?cveId=${encodeURIComponent(cve)}`, parser: parseNvd },
    { provider: 'epss', url: `https://api.first.org/data/v1/epss?cve=${encodeURIComponent(cve)}`, parser: parseEpss },
  ];
}

export interface IngestionMetrics {
  provider: ProviderId;
  startedAt: string;
  completedAt: string;
  success: boolean;
  recordsDiscovered: number;
  recordsAccepted: number;
  recordsRejected: number;
  duplicates: number;
  canonicalEntitiesCreated: number;
  canonicalEntitiesUpdated: number;
  error?: string;
}

export interface OrchestrationResult {
  records: NormalizedVulnerability[];
  metrics: IngestionMetrics[];
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** Bounded retry: fixed attempt count, exponential backoff, per-attempt timeout. */
export async function fetchWithRetry(
  fetcher: typeof fetch,
  url: string,
  attempts = PREVIEW_PROVIDER_ATTEMPTS,
  baseDelayMs = 100,
  timeoutMs = PREVIEW_PROVIDER_TIMEOUT_MS,
): Promise<Response> {
  let last: unknown;
  for (let attempt = 0; attempt < attempts; attempt++) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetcher(url, { headers: { accept: 'application/json' }, signal: controller.signal });
      if (response.ok || response.status < 500) return response;
      last = new Error(`HTTP_${response.status}`);
    } catch (error) {
      last = error;
    } finally {
      clearTimeout(timeout);
    }
    if (attempt + 1 < attempts) await sleep(baseDelayMs * (2 ** attempt));
  }
  throw last instanceof Error ? last : new Error(String(last));
}

/**
 * Fetch, canonicalize and persist a bounded set of upstream vulnerability
 * records into the dedicated Preview store.
 *
 * Fail-closed preconditions (checked before any network call):
 *   - a D1 executor is bound                    → PREVIEW_DATABASE_BINDING_REQUIRED
 *   - an explicit database identity is supplied → PREVIEW_DATABASE_IDENTITY_REQUIRED
 *   - that identity is the approved preview pair (never production)
 *   - request count is within the hard bound
 *   - every request targets an approved upstream host
 *
 * Repeated runs are idempotent: provenance is keyed, the canonical row is merged
 * in place and the read-model projection is an upsert, so duplicates are counted
 * but never created. Per-provider failures are isolated and surfaced in metrics.
 */
export async function orchestrateVulnerabilitySources(
  requests: ProviderRequest[],
  options: { fetcher?: typeof fetch; db?: PreviewD1Executor; databaseIdentity?: D1DatabaseIdentity; maxRequests?: number } = {},
): Promise<OrchestrationResult> {
  if (!options.db) throw new Error('PREVIEW_DATABASE_BINDING_REQUIRED');
  if (!options.databaseIdentity) throw new Error('PREVIEW_DATABASE_IDENTITY_REQUIRED');
  assertPreviewVulnerabilityDatabase(options.databaseIdentity);

  const maxRequests = options.maxRequests ?? PREVIEW_MAX_PROVIDER_REQUESTS;
  if (!Number.isInteger(maxRequests) || maxRequests < 1 || maxRequests > PREVIEW_MAX_PROVIDER_REQUESTS) {
    throw new Error('PREVIEW_REQUEST_LIMIT_INVALID');
  }
  const enabled = requests.filter((request) => request.enabled !== false);
  if (enabled.length > maxRequests) throw new Error('PREVIEW_REQUEST_LIMIT_EXCEEDED');
  for (const request of enabled) assertApprovedPreviewProviderRequest(request);

  const fetcher = options.fetcher || fetch;
  const records: NormalizedVulnerability[] = [];
  const byIdentity = new Map<string, NormalizedVulnerability>();
  const metrics: IngestionMetrics[] = [];
  let totalRecordsDiscovered = 0;

  for (const request of enabled) {
    const startedAt = new Date().toISOString();
    const metric: IngestionMetrics = {
      provider: request.provider, startedAt, completedAt: startedAt, success: false,
      recordsDiscovered: 0, recordsAccepted: 0, recordsRejected: 0, duplicates: 0,
      canonicalEntitiesCreated: 0, canonicalEntitiesUpdated: 0,
    };
    try {
      const response = await fetchWithRetry(fetcher, request.url);
      if (!response.ok) throw new Error(`UPSTREAM_HTTP_${response.status}`);
      const payload: any = await response.json();
      const discovered = payload?.vulnerabilities || payload?.data || payload;
      metric.recordsDiscovered = Array.isArray(discovered) ? discovered.length : 1;
      totalRecordsDiscovered += metric.recordsDiscovered;
      if (totalRecordsDiscovered > PREVIEW_MAX_DISCOVERY_RECORDS) throw new Error('PREVIEW_DISCOVERY_LIMIT_EXCEEDED');

      const source = VULNERABILITY_SOURCE_REGISTRY.find((item) => item.id === request.provider);
      if (!source) throw new Error('PREVIEW_PROVIDER_NOT_REGISTERED');
      const validation = validateSourceRecord(source, request.url, payload);
      if (validation.length) throw new Error(validation.join(','));

      const parsed = request.parser(payload, request.url);
      if (!parsed.normalized) {
        metric.recordsRejected = 1;
        throw new Error(parsed.error || 'NORMALIZATION_FAILED');
      }
      parsed.normalized.relevance = assessVulnerabilityRelevance({
        severity: parsed.normalized.cvss?.score ? Math.min(1, parsed.normalized.cvss.score / 10) : undefined,
        exploitationStatus: parsed.normalized.exploitation?.status,
        enterprisePrevalence: parsed.normalized.products.length ? 0.5 : 0,
        sourceConfidence: 1,
        remediationAvailable: parsed.normalized.fixedVersions.length > 0,
        openSourceAdoption: parsed.normalized.aliases.some((alias) => alias.startsWith('GHSA-')) ? 0.7 : 0,
      });
      metric.recordsAccepted = 1;
      const prior = byIdentity.get(parsed.normalized.identity);
      if (prior) metric.duplicates = 1;

      const persisted = await persistNormalizedPreview(options.db, options.databaseIdentity, parsed.normalized);
      if (persisted.canonicalCreated) metric.canonicalEntitiesCreated = 1;
      if (persisted.canonicalUpdated) metric.canonicalEntitiesUpdated = 1;

      if (prior) {
        const merged = mergeDuplicate(prior, parsed.normalized);
        Object.assign(prior, merged);
        records[records.indexOf(prior)] = prior;
      } else {
        byIdentity.set(parsed.normalized.identity, parsed.normalized);
        records.push(parsed.normalized);
      }
      metric.success = true;
    } catch (error) {
      metric.error = error instanceof Error ? error.message : String(error);
      metric.recordsRejected = Math.max(metric.recordsRejected, 1);
    }
    metric.completedAt = new Date().toISOString();
    metrics.push(metric);
  }

  return { records, metrics };
}

/** In-memory union of two observations of the SAME canonical identity. */
function mergeDuplicate(prior: NormalizedVulnerability, incoming: NormalizedVulnerability): NormalizedVulnerability {
  const union = (a: string[] = [], b: string[] = []) => [...new Set([...a, ...b])];
  return {
    identity: prior.identity,
    cveId: prior.cveId,
    cwe: union(prior.cwe, incoming.cwe),
    fields: { ...prior.fields, ...incoming.fields },
    evidence: [...new Map([...prior.evidence, ...incoming.evidence].map((e) => [e.evidence_id, e])).values()],
    sourceRecords: [...new Map(
      [...prior.sourceRecords, ...incoming.sourceRecords].map((r) => [`${r.sourceId}:${r.sourceRecordId}`, r]),
    ).values()],
    aliases: union(prior.aliases, incoming.aliases),
    products: union(prior.products, incoming.products),
    affectedVersions: union(prior.affectedVersions, incoming.affectedVersions),
    fixedVersions: union(prior.fixedVersions, incoming.fixedVersions),
    references: union(prior.references, incoming.references),
    relevance: incoming.relevance ?? prior.relevance,
  };
}

/**
 * Extract the `[env.preview]` section from a wrangler TOML document.
 *
 * The section runs until the first header that is NOT one of its own sub-tables
 * (`[env.preview.vars]`, `[[env.preview.d1_databases]]`, ...). Stopping at ANY
 * header would truncate the section at its first sub-table and hide every
 * binding and var that matters, so the distinction is load-bearing.
 */
export function previewEnvironmentSection(configText: string): string | undefined {
  const start = configText.search(/^\[env\.preview\]\s*$/m);
  if (start === -1) return undefined;
  const lines = configText.slice(start).split(/\r?\n/);
  const body = [lines[0]];
  for (let index = 1; index < lines.length; index += 1) {
    const line = lines[index];
    if (/^\[{1,2}[^\]]/.test(line) && !/^\[{1,2}env\.preview[.\]]/.test(line)) break;
    body.push(line);
  }
  return body.join('\n');
}

/**
 * Resolve the approved Preview destination from the EFFECTIVE configuration.
 *
 * The `[env.preview]` D1 `DB` binding carries the destination; when the
 * `PREVIEW_SUPPLY_DB_IDENTITY` var is also present the two must agree. Every
 * failure mode is closed:
 *   PREVIEW_ENVIRONMENT_MISSING / PREVIEW_DB_BINDING_AMBIGUOUS / IDENTITY_MISSING
 *   PREVIEW_DB_IDENTITY_* (via the shared guard) / PREVIEW_DATABASE_IDENTITY_CONFLICT
 */
export function previewVulnerabilityDatabaseIdentityFromConfig(configText: string): D1DatabaseIdentity {
  const environment = previewEnvironmentSection(configText);
  if (environment === undefined) throw new Error('PREVIEW_ENVIRONMENT_MISSING');

  const blocks = [...environment.matchAll(/\[\[env\.preview\.d1_databases\]\]([\s\S]*?)(?=\n\[|$)/g)].map((match) => match[1]);
  const bindings = blocks.filter((block) => /^\s*binding\s*=\s*["']DB["']\s*$/m.test(block));
  if (bindings.length !== 1) throw new Error('PREVIEW_DB_BINDING_AMBIGUOUS');
  const name = bindings[0].match(/^\s*database_name\s*=\s*["']([^"']+)["']\s*$/m)?.[1];
  const id = bindings[0].match(/^\s*database_id\s*=\s*["']([^"']+)["']\s*$/m)?.[1];
  if (!name || !id) throw new Error('PREVIEW_DB_IDENTITY_MISSING');
  const identity: D1DatabaseIdentity = { database_name: name, database_id: id };
  assertPreviewVulnerabilityDatabase(identity);

  const declared = environment.match(/^\s*PREVIEW_SUPPLY_DB_IDENTITY\s*=\s*["']([^"']*)["']\s*$/m)?.[1];
  if (declared !== undefined) {
    const declaredIdentity = parsePreviewDatabaseIdentity(declared);
    if (
      declaredIdentity.database_name !== identity.database_name ||
      declaredIdentity.database_id !== identity.database_id
    ) {
      throw new Error(PREVIEW_DATABASE_IDENTITY_CONFLICT);
    }
  }
  return identity;
}
