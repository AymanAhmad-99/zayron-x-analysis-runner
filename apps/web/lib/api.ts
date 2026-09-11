const BASE_URL = process.env.NEXT_PUBLIC_API_URL || process.env.API_WORKER_URL || '';

async function fetchAPI<T>(endpoint: string, options?: RequestInit): Promise<T | null> {
  try {
    const url = endpoint.startsWith('http') ? endpoint : `${BASE_URL}${endpoint}`;
    const res = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
      next: { revalidate: 3600, ...options?.next },
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
    filters: Record<string, unknown>;
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
    campaigns?: Array<Record<string, unknown>>;
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
    yara_rule?: string | boolean;
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
    yara_rule?: string | boolean;
    sigma_rule?: string | boolean;
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
  status?: string;
  type?: string;
  q?: string;
}): Promise<FeedResponse | null> {
  const query = new URLSearchParams();
  if (params?.limit) query.set('limit', String(params.limit));
  if (params?.offset) query.set('offset', String(params.offset));
  if (params?.severity) query.set('severity', params.severity);
  if (params?.status) query.set('status', params.status);
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

export interface CampaignItem {
  id: string;
  name: string;
  slug: string;
  actor_id?: string;
  target_sectors?: string[];
  target_regions?: string[];
  description?: string;
  start_date?: string;
  end_date?: string;
  created_at?: string;
}

export interface ReportItem {
  id: string;
  title: string;
  slug: string;
  abstract: string;
  pdf_r2_key?: string;
  tier_required: string;
  published_at?: string;
  updated_at?: string;
  created_at?: string;
}

export async function getCampaigns(): Promise<{ data: CampaignItem[]; meta: { count: number } } | null> {
  return fetchAPI<{ data: CampaignItem[]; meta: { count: number } }>('/api/v1/campaigns');
}

export async function getCampaignById(idOrSlug: string): Promise<{ data: CampaignItem } | null> {
  return fetchAPI<{ data: CampaignItem }>(`/api/v1/campaigns/${encodeURIComponent(idOrSlug)}`);
}

export async function getReports(): Promise<{ data: ReportItem[]; meta: { count: number } } | null> {
  return fetchAPI<{ data: ReportItem[]; meta: { count: number } }>('/api/v1/reports');
}

export async function getReportById(idOrSlug: string): Promise<{ data: ReportItem } | null> {
  return fetchAPI<{ data: ReportItem }>(`/api/v1/reports/${encodeURIComponent(idOrSlug)}`);
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

export async function getGraphEdges(limit = 100): Promise<{ data: Array<Record<string, unknown>> } | null> {
  return fetchAPI<{ data: Array<Record<string, unknown>> }>(`/api/v1/graph/edges?limit=${limit}`);
}

export interface ArticleItem {
  id: string;
  title: string;
  slug: string;
  dek?: string;
  excerpt?: string;
  content?: string;
  author?: string;
  category?: string;
  tags?: string;
  severity?: string;
  confidence?: number;
  ai_summary?: string;
  is_published?: number;
  is_featured?: number;
  is_breaking?: number;
  canonical_intel_event_id?: string;
  published_at?: string;
  created_at?: string;
  updated_at?: string;
}

export interface ArticlesResponse {
  data: ArticleItem[];
  meta?: {
    limit: number;
    offset: number;
    total: number;
    degraded?: boolean;
    note?: string;
  };
}

export async function getArticles(params?: {
  limit?: number;
  offset?: number;
  category?: string;
  severity?: string;
}): Promise<ArticlesResponse | null> {
  const query = new URLSearchParams();
  if (params?.limit) query.set('limit', String(params.limit));
  if (params?.offset) query.set('offset', String(params.offset));
  if (params?.category) query.set('category', params.category);
  if (params?.severity) query.set('severity', params.severity);

  const qs = query.toString();
  return fetchAPI<ArticlesResponse>(`/api/v1/articles${qs ? `?${qs}` : ''}`);
}

export async function getArticleBySlug(slug: string): Promise<{ data: ArticleItem } | null> {
  return fetchAPI<{ data: ArticleItem }>(`/api/v1/articles/${encodeURIComponent(slug)}`);
}

export interface SourceItem {
  id: string;
  handle: string | null;
  channel_id?: string;
  telegram_id?: string | null;
  display_name: string;
  url?: string | null;
  source_type: string;
  entity_type?: string;
  category?: string;
  subcategories?: string[];
  language?: string;
  region?: string;
  topic?: string;
  authority_tier: number;
  trust_score: number;
  priority: number;
  status: string;
  enabled: number | boolean;
  monitoring_status: string;
  verification_status: string;
  eligibility_status?: string;
  collector_id?: string;
  shard_id: string;
  message_count: number;
  error_count: number;
  last_error?: string;
  last_seen_at?: string;
  last_message_at?: string;
  last_successful_ingestion_at?: string;
  created_at: string;
  updated_at: string;
}

export interface SourcesResponse {
  status: string;
  total: number;
  count: number;
  limit: number;
  offset: number;
  page?: number;
  sources: SourceItem[];
  degraded?: boolean;
  note?: string;
}

export interface SourceHealthResponse {
  status: string;
  metrics?: {
    total_sources: number;
    total_discovered?: number;
    registered_sources?: number;
    enabled_sources: number;
    telegram_sources: number;
    monitored_sources?: number;
    paused_sources?: number;
    disabled_sources?: number;
    validated_sources?: number;
    unverified_sources?: number;
    degraded_sources?: number;
    blocked_sources?: number;
    auto_monitoring_enabled?: boolean;
  };
  sharding?: {
    shard_count: number;
    distribution: Array<{ shard_id: string; channel_count: number }>;
  };
  collector?: {
    status?: string;
    session_active?: boolean;
    messages_received?: number;
    messages_dispatched?: number;
    duplicates_dropped?: number;
    errors_count?: number;
    uptime_seconds?: number;
    last_received_at?: string;
    last_success_at?: string;
    monitored_channels?: string[];
  };
  degraded?: boolean;
  note?: string;
  timestamp: string;
}

export interface DiscoveredSourceItem {
  telegram_id: string;
  username?: string | null;
  handle?: string | null;
  title: string;
  entity_type: string;
  category?: string;
  subcategories?: string[];
  authority_tier?: number;
  shard_id?: string;
  accessible: boolean;
  already_registered: boolean;
  registered_source_id?: string | null;
  eligibility_status?: 'ELIGIBLE' | 'INELIGIBLE' | 'BLOCKED' | 'UNSUPPORTED';
  monitoring_status?: string;
  blocked: boolean;
  block_reason?: string | null;
}

export interface SourcesDiscoveryResponse {
  status: string;
  message?: string;
  total_discovered: number;
  total_eligible?: number;
  total_blocked?: number;
  total_ineligible?: number;
  auto_monitoring_enabled?: boolean;
  discovered: DiscoveredSourceItem[];
}

export async function autoRegisterSources(): Promise<any> {
  try {
    const res = await fetch(`${BASE_URL}/api/v1/sources/auto-register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
    return await res.json();
  } catch (err: any) {
    return { status: 'ERROR', message: err.message };
  }
}

export async function getSources(params?: {
  limit?: number;
  offset?: number;
  page?: number;
  type?: string;
  status?: string;
  monitoring_status?: string;
  shard_id?: string;
  verification_status?: string;
  language?: string;
  category?: string;
  q?: string;
}): Promise<SourcesResponse | null> {
  const query = new URLSearchParams();
  if (params?.limit) query.set('limit', String(params.limit));
  if (params?.offset !== undefined) query.set('offset', String(params.offset));
  if (params?.page) query.set('page', String(params.page));
  if (params?.type) query.set('type', params.type);
  if (params?.status) query.set('status', params.status);
  if (params?.monitoring_status) query.set('monitoring_status', params.monitoring_status);
  if (params?.shard_id) query.set('shard_id', params.shard_id);
  if (params?.verification_status) query.set('verification_status', params.verification_status);
  if (params?.language) query.set('language', params.language);
  if (params?.category) query.set('category', params.category);
  if (params?.q) query.set('q', params.q);

  const qs = query.toString();
  return fetchAPI<SourcesResponse>(`/api/v1/sources${qs ? `?${qs}` : ''}`);
}

export async function getSourceById(id: string): Promise<{ status: string; source: SourceItem; degraded?: boolean } | null> {
  return fetchAPI<{ status: string; source: SourceItem; degraded?: boolean }>(`/api/v1/sources/${encodeURIComponent(id)}`);
}

export async function getSourceHealth(): Promise<SourceHealthResponse | null> {
  return fetchAPI<SourceHealthResponse>('/api/v1/sources/health');
}

export async function getSourcesDiscovery(): Promise<SourcesDiscoveryResponse | null> {
  return fetchAPI<SourcesDiscoveryResponse>('/api/v1/sources/discovery');
}

export interface KnowledgeEntityItem {
  id: string;
  title: string;
  author: string;
  publisher?: string;
  publication_date?: string;
  authority_tier: number;
  document_type: string;
  status: string;
  jurisdiction?: string;
  summary: string;
  key_contributions?: string[];
  topics?: string[];
  total_chunks?: number;
  rag_enabled?: boolean;
}

export interface KnowledgeResponse {
  status: string;
  total: number;
  count: number;
  data: KnowledgeEntityItem[];
}

export async function getKnowledge(params?: {
  type?: string;
  topic?: string;
  tier?: number;
  limit?: number;
  offset?: number;
}): Promise<KnowledgeResponse | null> {
  const query = new URLSearchParams();
  if (params?.type) query.set('type', params.type);
  if (params?.topic) query.set('topic', params.topic);
  if (params?.tier !== undefined) query.set('tier', String(params.tier));
  if (params?.limit) query.set('limit', String(params.limit));
  if (params?.offset) query.set('offset', String(params.offset));

  const qs = query.toString();
  return fetchAPI<KnowledgeResponse>(`/api/v1/knowledge${qs ? `?${qs}` : ''}`);
}

export async function getKnowledgeById(id: string): Promise<{ status: string; data: KnowledgeEntityItem } | null> {
  return fetchAPI<{ status: string; data: KnowledgeEntityItem }>(`/api/v1/knowledge/${encodeURIComponent(id)}`);
}

// ── CANONICAL INTELLIGENCE PIPELINE TYPES & CLIENTS ───────────────

export interface CanonicalConfidenceVector {
  source_reliability: number;
  content_confidence: number;
  entity_confidence: number;
  overall_confidence: number;
  rating: 'VERY_LOW' | 'LOW' | 'MEDIUM' | 'HIGH' | 'VERY_HIGH';
}

export interface CanonicalEvidenceItem {
  evidence_id: string;
  intelligence_id: string;
  claim: string;
  evidence_type: string;
  source_message_id: string;
  source_id: string;
  quoted_excerpt: string;
  source_timestamp: string;
  source_url: string;
  confidence: number;
  created_at: string;
}

export interface CanonicalSourceReference {
  source_id: string;
  handle: string | null;
  title: string;
  url: string | null;
  message_id: string;
  published_at: string;
  authority_tier: number;
}

export interface CanonicalIntelligenceReport {
  intelligence_id: string;
  schema_version: string;
  source_id: string;
  telegram_source_id: string | null;
  source_handle: string | null;
  source_title: string;
  source_category: string;
  source_language: string;
  source_region: string;

  message_id: string;
  message_timestamp: string;
  ingested_at: string;
  processed_at: string;

  title: string;
  summary: string;
  body: string;

  intelligence_type: string;
  categories: string[];
  subcategories?: string[];

  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFORMATIONAL';
  priority: 'P1' | 'P2' | 'P3' | 'P4';
  confidence: CanonicalConfidenceVector;

  entities: {
    actors: Array<{ name: string; slug: string; status: string }>;
    malware: Array<{ name: string; slug: string; family?: string; status: string }>;
    cves: Array<{ cve_id: string; description?: string; severity?: string; status: string }>;
    campaigns?: Array<{ name: string; slug: string }>;
    tools?: string[];
    techniques?: Array<{ id: string; name: string; tactic: string }>;
    victims?: string[];
    organizations?: string[];
    regions?: string[];
  };
  indicators: Array<{
    type: 'ipv4' | 'domain' | 'url' | 'sha256' | 'md5' | 'email';
    value: string;
    context?: string;
  }>;

  evidence: CanonicalEvidenceItem[];
  citations?: string[];
  source_references: CanonicalSourceReference[];

  ai_analysis?: {
    threat_summary: string;
    why_it_matters: string;
    threat_type: string;
    recommended_actions: string[];
    timeline: Array<{ event: string; timestamp?: string }>;
    epistemic_status: 'OBSERVED' | 'REPORTED' | 'INFERRED' | 'UNKNOWN';
  };
  ai_model: string;
  ai_model_version: string;
  ai_prompt_version: string;

  report_type?: 'VULNERABILITY' | 'MALWARE' | 'THREAT_ACTOR' | 'CAMPAIGN' | 'GENERAL_CTI';
  structured_report?: {
    report_type: string;
    report_version: string;
    sections: Array<{
      section_number: string;
      title: string;
      category: string;
      content: string;
    }>;
    claims: Array<{
      claim_id: string;
      claim_text: string;
      epistemic_status: string;
      source_provenance: {
        original_source: string;
        collection_source: string;
      };
      confidence_score: number;
    }>;
    attack_mappings?: Array<{
      technique_id: string;
      technique_name: string;
      relationship: string;
      source: string;
      confidence: number;
    }>;
  };
  knowledge_trace?: Array<{
    document_id: string;
    title: string;
    edition?: string;
    publication_year?: string;
    authority_tier: number;
    domain: string;
    chunk_id: string;
    retrieval_score: number;
    section: string;
    why_retrieved: string;
    report_sections_influenced: string[];
    status: 'USED' | 'CONSIDERED_NOT_USED' | 'NOT_APPLICABLE';
    rejection_reason?: string;
  }>;
  epistemic_breakdown?: {
    verified_facts: string[];
    analyst_assessment: string[];
    unknowns: string[];
  };

  deduplication_key: string;
  content_hash: string;

  status: string;
  publication_status: string;

  created_at: string;
  updated_at: string;
}

export interface IntelligenceFeedResponse {
  status: string;
  total: number;
  limit: number;
  offset: number;
  reports: CanonicalIntelligenceReport[];
  stats?: IntelligenceStats;
}

export interface IntelligenceStats {
  messages_ingested: number;
  messages_normalized: number;
  messages_filtered: number;
  messages_analyzed: number;
  reports_created: number;
  reports_published: number;
  reports_review_required: number;
  ai_failures: number;
  duplicates_prevented: number;
}

export async function getIntelligenceFeed(params?: {
  limit?: number;
  offset?: number;
  category?: string;
  severity?: string;
  status?: string;
  q?: string;
}): Promise<IntelligenceFeedResponse | null> {
  const query = new URLSearchParams();
  if (params?.limit) query.set('limit', String(params.limit));
  if (params?.offset !== undefined) query.set('offset', String(params.offset));
  if (params?.category) query.set('category', params.category);
  if (params?.severity) query.set('severity', params.severity);
  if (params?.status) query.set('status', params.status);
  if (params?.q) query.set('q', params.q);

  const qs = query.toString();
  return fetchAPI<IntelligenceFeedResponse>(`/api/v1/intelligence${qs ? `?${qs}` : ''}`);
}

export async function getIntelligenceById(id: string): Promise<{ status: string; report: CanonicalIntelligenceReport } | null> {
  return fetchAPI<{ status: string; report: CanonicalIntelligenceReport }>(`/api/v1/intelligence/${encodeURIComponent(id)}`);
}

export async function getIntelligenceStats(): Promise<{ status: string; stats: IntelligenceStats } | null> {
  return fetchAPI<{ status: string; stats: IntelligenceStats }>('/api/v1/intelligence/stats');
}

export async function getIntelligenceLatest(): Promise<{ status: string; total: number; reports: CanonicalIntelligenceReport[] } | null> {
  return fetchAPI<{ status: string; total: number; reports: CanonicalIntelligenceReport[] }>('/api/v1/intelligence/latest');
}

export async function getIntelligenceTrending(): Promise<{ status: string; total: number; reports: CanonicalIntelligenceReport[] } | null> {
  return fetchAPI<{ status: string; total: number; reports: CanonicalIntelligenceReport[] }>('/api/v1/intelligence/trending');
}
