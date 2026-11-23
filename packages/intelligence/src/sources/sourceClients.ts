import {
  parseOsvRecord,
  parseGhsaAdvisories,
  parseNvdCpeData,
  parseCisaVulnrichment,
  lookupExploitDbEvidence,
  normalizeEpssObservation,
  buildTemporalProvenance,
  type UnifiedEnrichmentRecord,
  type PublicExploitEvidence,
  type EpssObservation,
  type TemporalProvenance,
} from './adapters';

export type SourceAvailability = 'SOURCE_AVAILABLE' | 'SOURCE_UNAVAILABLE' | 'SOURCE_ERROR' | 'SOURCE_EMPTY';

export interface SourceFetchResult<T> {
  sourceId: string;
  status: SourceAvailability;
  statusCode?: number;
  url: string;
  data: T | null;
  error?: string;
  latencyMs: number;
  fetchedAt: string;
}

export interface ClientFetchOptions {
  fetchFn?: typeof fetch;
  timeoutMs?: number;
  headers?: Record<string, string>;
}

async function safeFetch<T>(
  sourceId: string,
  url: string,
  parser: (raw: any) => T | null,
  options: ClientFetchOptions = {}
): Promise<SourceFetchResult<T>> {
  const fetchFn = options.fetchFn || fetch;
  const timeoutMs = options.timeoutMs ?? 5000;
  const started = Date.now();
  const fetchedAt = new Date().toISOString();

  try {
    const controller = new AbortController();
    const timeoutHandle = setTimeout(() => controller.abort(), timeoutMs);

    const headers: Record<string, string> = {
      'User-Agent': 'ZAYRON-X-Vulnerability-Intelligence/1.0',
      accept: 'application/json',
      ...(options.headers || {}),
    };

    let response: Response;
    try {
      response = await fetchFn(url, {
        headers,
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timeoutHandle);
    }

    const latencyMs = Date.now() - started;

    if (response.status === 404) {
      return {
        sourceId,
        status: 'SOURCE_EMPTY',
        statusCode: 404,
        url,
        data: null,
        latencyMs,
        fetchedAt,
      };
    }

    if (response.status === 429) {
      return {
        sourceId,
        status: 'SOURCE_UNAVAILABLE',
        statusCode: 429,
        url,
        data: null,
        error: 'Rate limit exceeded (HTTP 429)',
        latencyMs,
        fetchedAt,
      };
    }

    if (response.status >= 500) {
      return {
        sourceId,
        status: 'SOURCE_UNAVAILABLE',
        statusCode: response.status,
        url,
        data: null,
        error: `Upstream service error (HTTP ${response.status})`,
        latencyMs,
        fetchedAt,
      };
    }

    if (!response.ok) {
      return {
        sourceId,
        status: 'SOURCE_ERROR',
        statusCode: response.status,
        url,
        data: null,
        error: `Unexpected HTTP status ${response.status}`,
        latencyMs,
        fetchedAt,
      };
    }

    let json: any;
    try {
      json = await response.json();
    } catch (parseErr) {
      return {
        sourceId,
        status: 'SOURCE_ERROR',
        statusCode: response.status,
        url,
        data: null,
        error: `Malformed JSON response: ${parseErr instanceof Error ? parseErr.message : String(parseErr)}`,
        latencyMs,
        fetchedAt,
      };
    }

    if (!json || (Array.isArray(json) && json.length === 0) || (typeof json === 'object' && Object.keys(json).length === 0)) {
      return {
        sourceId,
        status: 'SOURCE_EMPTY',
        statusCode: response.status,
        url,
        data: null,
        latencyMs,
        fetchedAt,
      };
    }

    const parsedData = parser(json);
    if (!parsedData) {
      return {
        sourceId,
        status: 'SOURCE_EMPTY',
        statusCode: response.status,
        url,
        data: null,
        latencyMs,
        fetchedAt,
      };
    }

    return {
      sourceId,
      status: 'SOURCE_AVAILABLE',
      statusCode: response.status,
      url,
      data: parsedData,
      latencyMs,
      fetchedAt,
    };
  } catch (err) {
    const latencyMs = Date.now() - started;
    const isTimeout = (err instanceof Error && (err.name === 'AbortError' || err.message.toLowerCase().includes('aborted')));
    return {
      sourceId,
      status: isTimeout ? 'SOURCE_UNAVAILABLE' : 'SOURCE_ERROR',
      url,
      data: null,
      error: isTimeout ? `Request timed out after ${timeoutMs}ms` : (err instanceof Error ? err.message : String(err)),
      latencyMs,
      fetchedAt,
    };
  }
}

// ── 1. OSV Client (Phase 2C) ───────────────────────────────────────────────────

export class OsvClient {
  constructor(private readonly baseUrl = 'https://api.osv.dev/v1') {}

  public async fetchByCve(cveId: string, options: ClientFetchOptions = {}): Promise<SourceFetchResult<UnifiedEnrichmentRecord>> {
    const norm = cveId.trim().toUpperCase();
    const url = `${this.baseUrl}/vulns/${encodeURIComponent(norm)}`;
    return safeFetch('osv', url, raw => parseOsvRecord(norm, raw), options);
  }

  public async fetchById(osvOrGhsaId: string, options: ClientFetchOptions = {}): Promise<SourceFetchResult<UnifiedEnrichmentRecord>> {
    const norm = osvOrGhsaId.trim();
    const url = `${this.baseUrl}/vulns/${encodeURIComponent(norm)}`;
    return safeFetch('osv', url, raw => parseOsvRecord(norm, raw), options);
  }
}

// ── 2. GHSA Client (Phase 2D) ──────────────────────────────────────────────────

export class GhsaClient {
  constructor(
    private readonly baseUrl = 'https://api.github.com/advisories',
    private readonly defaultToken?: string
  ) {}

  public async fetchByCve(cveId: string, options: ClientFetchOptions & { token?: string } = {}): Promise<SourceFetchResult<UnifiedEnrichmentRecord>> {
    const norm = cveId.trim().toUpperCase();
    const url = `${this.baseUrl}?cve_id=${encodeURIComponent(norm)}`;
    const token = options.token || this.defaultToken;
    const headers = token ? { Authorization: `Bearer ${token}` } : undefined;

    return safeFetch('github-advisory', url, raw => parseGhsaAdvisories(norm, raw), {
      ...options,
      headers: { ...headers, ...(options.headers || {}) },
    });
  }

  public async fetchById(ghsaId: string, options: ClientFetchOptions & { token?: string } = {}): Promise<SourceFetchResult<UnifiedEnrichmentRecord>> {
    const norm = ghsaId.trim().toUpperCase();
    const url = `${this.baseUrl}/${encodeURIComponent(norm)}`;
    const token = options.token || this.defaultToken;
    const headers = token ? { Authorization: `Bearer ${token}` } : undefined;

    return safeFetch('github-advisory', url, raw => {
      const arr = Array.isArray(raw) ? raw : [raw];
      return parseGhsaAdvisories(norm, arr);
    }, {
      ...options,
      headers: { ...headers, ...(options.headers || {}) },
    });
  }
}

// ── 3. NVD Client (Phase 2E) ───────────────────────────────────────────────────

export class NvdClient {
  constructor(
    private readonly baseUrl = 'https://services.nvd.nist.gov/rest/json/cves/2.0',
    private readonly defaultApiKey?: string
  ) {}

  public async fetchByCve(cveId: string, options: ClientFetchOptions & { apiKey?: string } = {}): Promise<SourceFetchResult<ReturnType<typeof parseNvdCpeData>>> {
    const norm = cveId.trim().toUpperCase();
    const url = `${this.baseUrl}?cveId=${encodeURIComponent(norm)}`;
    const apiKey = options.apiKey || this.defaultApiKey;
    const headers = apiKey ? { apiKey } : undefined;

    return safeFetch('nvd-cpe', url, raw => {
      const cveItem = raw?.vulnerabilities?.[0]?.cve;
      return cveItem ? parseNvdCpeData(cveItem) : null;
    }, {
      ...options,
      headers: { ...headers, ...(options.headers || {}) },
    });
  }
}

// ── 4. EPSS Client (Phase 2E) ──────────────────────────────────────────────────

export class EpssClient {
  constructor(private readonly baseUrl = 'https://api.first.org/data/v1/epss') {}

  // PHASE 5 (REM-04): the EPSS payload's own `date` field is the observation timestamp.
  // It is preserved verbatim when supplied and stays null otherwise — it is NEVER
  // defaulted from the CVE publication timestamp or any other temporal domain.
  public async fetchByCve(cveId: string, options: ClientFetchOptions = {}): Promise<SourceFetchResult<EpssObservation>> {
    const norm = cveId.trim().toUpperCase();
    const url = `${this.baseUrl}?cve=${encodeURIComponent(norm)}`;

    return safeFetch('first-epss', url, raw => normalizeEpssObservation(raw), options);
  }
}

// ── 5. CISA Vulnrichment Client (MITRE / CISA ADP) ──────────────────────────────

export class CisaVulnrichmentClient {
  constructor(private readonly baseUrl = 'https://raw.githubusercontent.com/cisagov/vulnrichment/develop') {}

  public async fetchByCve(cveId: string, options: ClientFetchOptions = {}): Promise<SourceFetchResult<UnifiedEnrichmentRecord>> {
    const norm = cveId.trim().toUpperCase();
    const parts = norm.split('-');
    const year = parts[1] || 'unknown';
    const num = parts[2] || '0';
    const prefix = num.length > 3 ? num.slice(0, num.length - 3) + 'xxx' : '0xxx';
    const url = `${this.baseUrl}/${year}/${prefix}/${encodeURIComponent(norm)}.json`;

    return safeFetch('cisa-vulnrichment', url, raw => parseCisaVulnrichment(norm, raw), options);
  }
}

// ── 6. Exploit-DB Client (Phase 2 Source 7: Public PoC Availability) ──────────

export class ExploitDbClient {
  public async fetchByCve(cveId: string, options: ClientFetchOptions = {}): Promise<SourceFetchResult<PublicExploitEvidence>> {
    const started = Date.now();
    const fetchedAt = new Date().toISOString();
    const norm = cveId.trim().toUpperCase();
    try {
      const evidence = await lookupExploitDbEvidence(norm, options.fetchFn);
      const latencyMs = Date.now() - started;
      const isAvailable = evidence.status === 'FOUND';
      return {
        sourceId: 'exploit-db',
        status: isAvailable ? 'SOURCE_AVAILABLE' : 'SOURCE_EMPTY',
        url: evidence.source_url || 'https://www.exploit-db.com',
        data: evidence,
        latencyMs,
        fetchedAt,
      };
    } catch (err: any) {
      const latencyMs = Date.now() - started;
      return {
        sourceId: 'exploit-db',
        status: 'SOURCE_ERROR',
        url: 'https://www.exploit-db.com',
        data: null,
        error: err instanceof Error ? err.message : String(err),
        latencyMs,
        fetchedAt,
      };
    }
  }
}

// ── 7. Unified Production Source Coordinator ──────────────────────────────────

export interface UnifiedSourceFetchBundle {
  cveId: string;
  nvd: SourceFetchResult<ReturnType<typeof parseNvdCpeData>>;
  cisaVulnrichment: SourceFetchResult<UnifiedEnrichmentRecord>;
  osv: SourceFetchResult<UnifiedEnrichmentRecord>;
  ghsa: SourceFetchResult<UnifiedEnrichmentRecord>;
  epss: SourceFetchResult<EpssObservation>;
  exploitDb: SourceFetchResult<PublicExploitEvidence>;
  /**
   * PHASE 5 (REM-04) — canonical temporal provenance, source-scoped.
   * `source_observed_at.epss` is the EPSS snapshot date ONLY when FIRST.org supplies one.
   * `retrieved_at.*` is the ZAYRON-X fetch event from SourceFetchResult.fetchedAt.
   * Missing values stay `null` — never borrowed from another temporal domain.
   */
  temporal_provenance: TemporalProvenance;
}

export async function fetchCanonicalVulnerabilitySources(
  cveId: string,
  options: {
    fetchFn?: typeof fetch;
    githubToken?: string;
    nvdApiKey?: string;
    timeoutMs?: number;
  } = {}
): Promise<UnifiedSourceFetchBundle> {
  const osvClient = new OsvClient();
  const ghsaClient = new GhsaClient('https://api.github.com/advisories', options.githubToken);
  const nvdClient = new NvdClient('https://services.nvd.nist.gov/rest/json/cves/2.0', options.nvdApiKey);
  const epssClient = new EpssClient();
  const vulnClient = new CisaVulnrichmentClient();
  const exploitDbClient = new ExploitDbClient();

  const fetchOptions = {
    fetchFn: options.fetchFn,
    timeoutMs: options.timeoutMs ?? 6000,
  };

  const [nvd, cisaVulnrichment, osv, ghsa, epss, exploitDb] = await Promise.all([
    nvdClient.fetchByCve(cveId, fetchOptions),
    vulnClient.fetchByCve(cveId, fetchOptions),
    osvClient.fetchByCve(cveId, fetchOptions),
    ghsaClient.fetchByCve(cveId, fetchOptions),
    epssClient.fetchByCve(cveId, fetchOptions),
    exploitDbClient.fetchByCve(cveId, fetchOptions),
  ]);

  return {
    cveId,
    nvd,
    cisaVulnrichment,
    osv,
    ghsa,
    epss,
    exploitDb,
    temporal_provenance: buildTemporalProvenance({
      retrieved_at: {
        'nvd-cpe': nvd.fetchedAt,
        'cisa-vulnrichment': cisaVulnrichment.fetchedAt,
        'osv': osv.fetchedAt,
        'github-advisory': ghsa.fetchedAt,
        'first-epss': epss.fetchedAt,
        'exploit-db': exploitDb.fetchedAt,
      },
      source_observed_at: {
        // EPSS snapshot date ONLY when FIRST.org supplies one — else null.
        'epss': epss.data?.observed_at ?? null,
      },
      source_published_at: {
        'nvd': nvd.data?.publishedDate ?? null,
      },
      source_updated_at: {
        'nvd': nvd.data?.lastModifiedDate ?? null,
      },
    }),
  };
}
