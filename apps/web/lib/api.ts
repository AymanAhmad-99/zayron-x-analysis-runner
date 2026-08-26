const BASE_URL = process.env.API_WORKER_URL || 'https://zayron-x-api.aabusabih.workers.dev';

async function fetchAPI<T>(endpoint: string, options?: RequestInit): Promise<T | null> {
  try {
    const url = endpoint.startsWith('http') ? endpoint : `${BASE_URL}${endpoint}`;
    const res = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
      next: { revalidate: 30, ...options?.next },
    });

    if (!res.ok) {
      if (res.status === 404) return null;
      console.error(`[API Error] ${res.status} for ${endpoint}`);
      return null;
    }

    return await res.json();
  } catch (err) {
    console.error(`[API Fetch Exception] ${endpoint}:`, err);
    return null;
  }
}

export interface FeedResponse {
  data: Array<{
    id: string;
    type: string;
    title: string;
    summary?: string;
    severity: string;
    confidence: number;
    status: string;
    content_hash: string;
    first_seen_at: string;
    last_updated_at: string;
    entities?: {
      cves?: string[];
      actors?: string[];
      malware?: string[];
      ipv4s?: string[];
      domains?: string[];
      ttps?: string[];
    };
    evidence?: Array<{
      id: string;
      source_id?: string;
      source_display_name?: string;
      type: string;
      url?: string;
      snippet?: string;
      weight: number;
      created_at: string;
    }>;
    evidence_count?: number;
  }>;
  meta: {
    count: number;
    limit: number;
    offset: number;
    filters: Record<string, any>;
  };
}

export interface ThreatDetailResponse {
  data: {
    id: string;
    type: string;
    title: string;
    summary?: string;
    severity: string;
    confidence: number;
    status: string;
    content_hash: string;
    first_seen_at: string;
    last_updated_at: string;
    entities?: {
      cves?: string[];
      actors?: string[];
      malware?: string[];
      ipv4s?: string[];
      domains?: string[];
      ttps?: string[];
    };
    evidence?: Array<{
      id: string;
      source_id?: string;
      source_display_name?: string;
      source_url?: string;
      type: string;
      url?: string;
      snippet?: string;
      weight: number;
      created_at: string;
    }>;
  };
}

export interface VulnerabilitiesResponse {
  data: Array<{
    id: string;
    cve_id: string;
    title: string;
    description?: string;
    severity: string;
    cvss_score?: number;
    epss_score?: number;
    is_exploited_in_wild?: number;
    affected_vendor?: string;
    affected_product?: string;
    patch_url?: string;
    published_at?: string;
    created_at: string;
  }>;
  meta: {
    count: number;
    limit: number;
    offset: number;
  };
}

export interface VulnerabilityDetailResponse {
  data: {
    id: string;
    cve_id: string;
    title: string;
    description?: string;
    severity: string;
    cvss_score?: number;
    epss_score?: number;
    is_exploited_in_wild?: number;
    affected_vendor?: string;
    affected_product?: string;
    patch_url?: string;
    published_at?: string;
    created_at: string;
    linked_events?: Array<{
      id: string;
      title: string;
      summary?: string;
      severity: string;
      confidence: number;
      first_seen_at: string;
    }>;
    related_evidence?: Array<{
      id: string;
      source_name?: string;
      type: string;
      url?: string;
      snippet?: string;
      weight: number;
      created_at: string;
    }>;
    related_iocs?: Array<{
      id: string;
      type: string;
      normalized_value: string;
      confidence: number;
    }>;
  };
}

export interface ActorsResponse {
  data: Array<{
    id: string;
    name: string;
    slug: string;
    aliases?: string;
    country?: string;
    motivation?: string;
    description?: string;
    first_seen?: string;
    last_active?: string;
  }>;
  meta: {
    count: number;
    limit: number;
    offset: number;
  };
}

export interface ActorDetailResponse {
  data: {
    id: string;
    name: string;
    slug: string;
    aliases?: string;
    country?: string;
    motivation?: string;
    description?: string;
    first_seen?: string;
    last_active?: string;
    campaigns?: Array<any>;
    linked_events?: Array<{
      id: string;
      title: string;
      summary?: string;
      severity: string;
      confidence: number;
      first_seen_at: string;
    }>;
    related_iocs?: Array<{
      id: string;
      type: string;
      normalized_value: string;
      confidence: number;
    }>;
  };
}

export interface MalwareResponse {
  data: Array<{
    id: string;
    name: string;
    slug: string;
    family?: string;
    type?: string;
    description?: string;
    yara_rule?: string;
  }>;
  meta: {
    count: number;
    limit: number;
    offset: number;
  };
}

export interface MalwareDetailResponse {
  data: {
    id: string;
    name: string;
    slug: string;
    family?: string;
    type?: string;
    description?: string;
    yara_rule?: string;
    sigma_rule?: string;
    linked_events?: Array<{
      id: string;
      title: string;
      summary?: string;
      severity: string;
      confidence: number;
      first_seen_at: string;
    }>;
    related_iocs?: Array<{
      id: string;
      type: string;
      normalized_value: string;
      confidence: number;
    }>;
  };
}

export interface IOCsResponse {
  data: Array<{
    id: string;
    type: string;
    normalized_value: string;
    confidence: number;
    event_id?: string;
    event_title?: string;
    event_severity?: string;
    created_at: string;
  }>;
  meta: {
    count: number;
    limit: number;
    offset: number;
  };
}

export interface IOCDetailResponse {
  data: {
    id: string;
    type: string;
    normalized_value: string;
    confidence: number;
    event_id?: string;
    event_title?: string;
    event_summary?: string;
    event_severity?: string;
    first_seen_at?: string;
    evidence?: Array<{
      id: string;
      source_name?: string;
      type: string;
      url?: string;
      snippet?: string;
      weight: number;
      created_at: string;
    }>;
  };
}

export interface SearchResponse {
  data: {
    query: string;
    actors: Array<{ id: string; name: string; slug: string; country?: string; motivation?: string; description?: string }>;
    vulnerabilities: Array<{ id: string; cve_id: string; title: string; severity: string; description?: string }>;
    malware: Array<{ id: string; name: string; slug: string; family?: string; description?: string }>;
    iocs: Array<{ id: string; type: string; normalized_value: string; event_id?: string }>;
    events: Array<{ id: string; title: string; summary?: string; severity: string; confidence: number; first_seen_at: string }>;
    articles: Array<{ id: string; title: string; slug: string; category: string; published_at?: string }>;
  };
  meta: {
    total_matches: number;
  };
}

// ── EXPORTED DATA FETCHERS ──────────────────────────────────────────

export async function getThreatFeed(params?: {
  limit?: number;
  offset?: number;
  severity?: string;
  type?: string;
  q?: string;
}): Promise<FeedResponse | null> {
  const query = new URLSearchParams();
  if (params?.limit) query.set('limit', String(params.limit));
  if (params?.offset) query.set('offset', String(params.offset));
  if (params?.severity) query.set('severity', params.severity);
  if (params?.type) query.set('type', params.type);
  if (params?.q) query.set('q', params.q);

  const qs = query.toString();
  return fetchAPI<FeedResponse>(`/api/v1/feed${qs ? `?${qs}` : ''}`);
}

export async function getThreatById(id: string): Promise<ThreatDetailResponse | null> {
  return fetchAPI<ThreatDetailResponse>(`/api/v1/threats/${encodeURIComponent(id)}`);
}

export async function getVulnerabilities(params?: {
  limit?: number;
  offset?: number;
  severity?: string;
  q?: string;
}): Promise<VulnerabilitiesResponse | null> {
  const query = new URLSearchParams();
  if (params?.limit) query.set('limit', String(params.limit));
  if (params?.offset) query.set('offset', String(params.offset));
  if (params?.severity) query.set('severity', params.severity);
  if (params?.q) query.set('q', params.q);

  const qs = query.toString();
  return fetchAPI<VulnerabilitiesResponse>(`/api/v1/vulnerabilities${qs ? `?${qs}` : ''}`);
}

export async function getVulnerabilityById(cveId: string): Promise<VulnerabilityDetailResponse | null> {
  return fetchAPI<VulnerabilityDetailResponse>(`/api/v1/vulnerabilities/${encodeURIComponent(cveId)}`);
}

export async function getActors(params?: {
  limit?: number;
  offset?: number;
  q?: string;
}): Promise<ActorsResponse | null> {
  const query = new URLSearchParams();
  if (params?.limit) query.set('limit', String(params.limit));
  if (params?.offset) query.set('offset', String(params.offset));
  if (params?.q) query.set('q', params.q);

  const qs = query.toString();
  return fetchAPI<ActorsResponse>(`/api/v1/actors${qs ? `?${qs}` : ''}`);
}

export async function getActorById(idOrSlug: string): Promise<ActorDetailResponse | null> {
  return fetchAPI<ActorDetailResponse>(`/api/v1/actors/${encodeURIComponent(idOrSlug)}`);
}

export async function getMalwareList(params?: {
  limit?: number;
  offset?: number;
  q?: string;
}): Promise<MalwareResponse | null> {
  const query = new URLSearchParams();
  if (params?.limit) query.set('limit', String(params.limit));
  if (params?.offset) query.set('offset', String(params.offset));
  if (params?.q) query.set('q', params.q);

  const qs = query.toString();
  return fetchAPI<MalwareResponse>(`/api/v1/malware${qs ? `?${qs}` : ''}`);
}

export async function getMalwareById(idOrSlug: string): Promise<MalwareDetailResponse | null> {
  return fetchAPI<MalwareDetailResponse>(`/api/v1/malware/${encodeURIComponent(idOrSlug)}`);
}

export async function getIOCs(params?: {
  limit?: number;
  offset?: number;
  type?: string;
  q?: string;
}): Promise<IOCsResponse | null> {
  const query = new URLSearchParams();
  if (params?.limit) query.set('limit', String(params.limit));
  if (params?.offset) query.set('offset', String(params.offset));
  if (params?.type) query.set('type', params.type);
  if (params?.q) query.set('q', params.q);

  const qs = query.toString();
  return fetchAPI<IOCsResponse>(`/api/v1/iocs${qs ? `?${qs}` : ''}`);
}

export async function getIOCByValue(val: string): Promise<IOCDetailResponse | null> {
  return fetchAPI<IOCDetailResponse>(`/api/v1/iocs/${encodeURIComponent(val)}`);
}

export async function getCampaigns(): Promise<{ data: Array<any>; meta: { count: number } } | null> {
  return fetchAPI<{ data: Array<any>; meta: { count: number } }>('/api/v1/campaigns');
}

export async function getCampaignById(idOrSlug: string): Promise<{ data: any } | null> {
  return fetchAPI<{ data: any }>(`/api/v1/campaigns/${encodeURIComponent(idOrSlug)}`);
}

export async function getReports(): Promise<{ data: Array<any>; meta: { count: number } } | null> {
  return fetchAPI<{ data: Array<any>; meta: { count: number } }>('/api/v1/reports');
}

export async function getReportById(idOrSlug: string): Promise<{ data: any } | null> {
  return fetchAPI<{ data: any }>(`/api/v1/reports/${encodeURIComponent(idOrSlug)}`);
}

export async function searchGlobal(q: string): Promise<SearchResponse | null> {
  return fetchAPI<SearchResponse>(`/api/v1/search?q=${encodeURIComponent(q)}`);
}

export interface AIAnalysisResponse {
  run_id: string;
  model: string;
  duration_ms: number;
  data: {
    assessment: string;
    threat_level: string;
    confidence_score: number;
    confidence_state: string;
    key_findings: string[];
    correlated_actors: string[];
    correlated_malware: string[];
    correlated_cves: string[];
    recommended_mitigations: string[];
    source_citations: Array<{
      claim: string;
      evidence_id: string;
      source_name: string;
    }>;
  };
}

export async function getAIAnalysis(query?: string): Promise<AIAnalysisResponse | null> {
  return fetchAPI<AIAnalysisResponse>('/api/v1/ai/analyze', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: query || 'Assess current threat telemetry and critical exploit activity' }),
  });
}

export async function getGraphEdges(limit = 100): Promise<{ data: Array<any> } | null> {
  return fetchAPI<{ data: Array<any> }>(`/api/v1/graph/edges?limit=${limit}`);
}
