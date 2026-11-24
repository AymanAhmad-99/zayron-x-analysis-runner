import { VULNERABILITY_INTELLIGENCE_TYPE } from "./taxonomy";
import { apiFetch, getApiBaseUrl } from "./siteConfig";
import { projectVulnerabilityReportPublicRead, type AnalysisAvailability, type AuthoritativeAdvisory, type ReportIntegrityInput } from "../../../../packages/intelligence/src/vulnerability/reportIntegrity";

/** EPSS is a probability in [0, 1]; sentinels, partial numbers and non-finite values are unavailable. */
export function formatEpss(epss?: { score?: unknown; percentile?: unknown; status?: unknown }) {
  const probability = (raw: unknown): number | null => {
    if (typeof raw !== "number" && (typeof raw !== "string" || !raw.trim())) return null;
    const n = Number(raw);
    return Number.isFinite(n) && n >= 0 && n <= 1 ? n : null;
  };
  const score = epss?.status === "NOT_AVAILABLE" ? null : probability(epss?.score);
  const percentile = probability(epss?.percentile);
  return {
    value: score === null ? "UNAVAILABLE" : `${(score * 100).toFixed(1)}%`,
    sub: score === null ? "EPSS data not available" : percentile === null ? "percentile unavailable" : `percentile ${(percentile * 100).toFixed(0)}`,
  };
}

export type ApiState = "success" | "empty" | "error";

export interface ApiResult<T> { state: ApiState; data: T | null; error?: string; }
export interface IntelligenceRecord { id: string; title?: string; summary?: string; severity?: string; status?: string; confidence?: number; type?: string; updatedAt?: string; }
export interface IntelligenceList { items: IntelligenceRecord[]; total?: number; nextCursor?: string | null; }
export interface VulnerabilityRecord { id?: string; intelligence_id?: string; title?: string; summary?: string; severity?: string; confidence?: number | Record<string, unknown>; status?: string; source_title?: string; source_id?: string; updated_at?: string; created_at?: string; }
export interface VulnerabilityList { items: VulnerabilityRecord[]; total: number; limit: number; offset: number; }
export interface MalwareRecord { id?: string; intelligence_id?: string; title?: string; summary?: string; intelligence_type?: string; categories?: unknown[]; subcategories?: unknown[]; entities?: unknown[]; severity?: string; confidence?: number | Record<string, unknown>; status?: string; source_title?: string; source_id?: string; created_at?: string; updated_at?: string; }
export interface ExploitRecord extends MalwareRecord { vulnerability_id?: string; vulnerability_ids?: string[]; cve?: string; cves?: string[]; }
export interface ThreatActorRecord { id?: string; name?: string; slug?: string; aliases?: string | string[]; confidence?: number | Record<string, unknown>; status?: string; assessment?: string; source?: string; source_title?: string; source_id?: string; updated_at?: string; last_active?: string; created_at?: string; }
export interface CampaignRecord { id?: string; name?: string; slug?: string; aliases?: string | string[]; actor_id?: string; threat_actor?: string; target_sectors?: string | string[]; target_regions?: string | string[]; geography?: string | string[]; confidence?: number | Record<string, unknown>; status?: string; assessment?: string; source?: string; source_title?: string; source_id?: string; created_at?: string; updated_at?: string; }
export interface IocRecord { id?: string; type?: string; normalized_value?: string; event_id?: string; event_title?: string; malware_id?: string; threat_actor_id?: string; confidence?: number; created_at?: string; updated_at?: string; }
export interface RelationRecord { id?: string; source_entity_type?: string; source_entity_id?: string; target_entity_type?: string; target_entity_id?: string; relation_type?: string; confidence?: number; created_at?: string; updated_at?: string; }

export async function getRelations(limit = 100): Promise<ApiResult<{ items: RelationRecord[]; total: number }>> {
  try { const response = await apiFetch(`${getApiBaseUrl()}/graph/edges?limit=${Math.min(limit, 300)}`, PUBLIC_READ_INIT); if (!response.ok) return { state: "error", data: null, error: `API returned HTTP ${response.status}` }; const payload = await response.json() as { data?: RelationRecord[]; meta?: { total?: number } }; const items = Array.isArray(payload.data) ? payload.data : []; return { state: items.length ? "success" : "empty", data: { items, total: payload.meta?.total ?? items.length } }; } catch { return { state: "error", data: null, error: "Relationship API is unavailable" }; }
}

export async function resolveEntity(type: string, id: string): Promise<string | null> {
  const normalized = type.toLowerCase(); const base = getApiBaseUrl(); let endpoint: string | null = null; let mode: "report" | "data" = "data";
  if (["vulnerability", "vulnerabilities", "malware", "exploit", "exploits"].includes(normalized)) { endpoint = `${getApiBaseUrl()}/intelligence/${encodeURIComponent(id)}`; mode = "report"; }
  else if (["actor", "actors"].includes(normalized)) endpoint = `${base}/actors/${encodeURIComponent(id)}`;
  else if (["campaign", "campaigns"].includes(normalized)) endpoint = `${base}/campaigns/${encodeURIComponent(id)}`;
  else if (["ioc", "iocs"].includes(normalized)) endpoint = `${base}/iocs/${encodeURIComponent(id)}`;
  if (!endpoint) return null;
  try { const response = await apiFetch(endpoint, { headers: { accept: "application/json" }, cache: "no-store" }); if (!response.ok) return null; const payload = await response.json() as Record<string, unknown>; const entity = mode === "report" ? payload.report : payload.data; if (!entity || typeof entity !== "object") return null; const record = entity as Record<string, unknown>; return typeof record.title === "string" ? record.title : typeof record.name === "string" ? record.name : typeof record.normalized_value === "string" ? record.normalized_value : typeof record.intelligence_id === "string" ? record.intelligence_id : null; } catch { return null; }
}

export async function getIocs(params: { type?: string; q?: string } = {}): Promise<ApiResult<{ items: IocRecord[]; total: number }>> {
  const query = new URLSearchParams(); if (params.type) query.set("type", params.type); if (params.q) query.set("q", params.q);
  try { const response = await apiFetch(`${getApiBaseUrl()}/iocs${query.size ? `?${query}` : ""}`, PUBLIC_READ_INIT); if (!response.ok) return { state: "error", data: null, error: `API returned HTTP ${response.status}` }; const payload = await response.json() as { data?: IocRecord[]; meta?: { total?: number } }; const items = Array.isArray(payload.data) ? payload.data : []; return { state: items.length ? "success" : "empty", data: { items, total: payload.meta?.total ?? items.length } }; } catch { return { state: "error", data: null, error: "IOC API is unavailable" }; }
}

export async function getCampaigns(): Promise<ApiResult<{ items: CampaignRecord[]; total: number }>> {
  try { const response = await apiFetch(`${getApiBaseUrl()}/campaigns`, PUBLIC_READ_INIT); if (!response.ok) return { state: "error", data: null, error: `API returned HTTP ${response.status}` }; const payload = await response.json() as { data?: CampaignRecord[]; meta?: { total?: number } }; const items = Array.isArray(payload.data) ? payload.data : []; return { state: items.length ? "success" : "empty", data: { items, total: payload.meta?.total ?? items.length } }; } catch { return { state: "error", data: null, error: "Campaign API is unavailable" }; }
}

export async function getThreatActors(params: { q?: string } = {}): Promise<ApiResult<{ items: ThreatActorRecord[]; total: number }>> {
  const query = params.q ? `?q=${encodeURIComponent(params.q)}` : "";
  try { const response = await apiFetch(`${getApiBaseUrl()}/actors${query}`, PUBLIC_READ_INIT); if (!response.ok) return { state: "error", data: null, error: `API returned HTTP ${response.status}` }; const payload = await response.json() as { data?: ThreatActorRecord[]; meta?: { total?: number } }; const items = Array.isArray(payload.data) ? payload.data : []; return { state: items.length ? "success" : "empty", data: { items, total: payload.meta?.total ?? items.length } }; } catch { return { state: "error", data: null, error: "Threat actor API is unavailable" }; }
}

export async function getExploits(params: { limit?: number; offset?: number } = {}): Promise<ApiResult<{ items: ExploitRecord[]; total: number; limit: number; offset: number }>> {
  const limit = params.limit ?? 25; const offset = params.offset ?? 0; const query = new URLSearchParams({ category: "exploit", limit: String(limit), offset: String(offset) });
  try { const response = await apiFetch(`${getApiBaseUrl()}/intelligence?${query}`, PUBLIC_READ_INIT); if (!response.ok) return { state: "error", data: null, error: `API returned HTTP ${response.status}` }; const payload = await response.json() as Record<string, unknown>; const reports = Array.isArray(payload.reports) ? payload.reports as ExploitRecord[] : []; const total = typeof payload.total === "number" ? payload.total : reports.length; return { state: reports.length ? "success" : "empty", data: { items: reports, total, limit, offset } }; } catch { return { state: "error", data: null, error: "Exploit API is unavailable" }; }
}

// ── Canonical malware intelligence reports (single source of truth) ──
// Reads the EXACT canonical store the ZAYRON-X analysis pipeline materializes
// into (zayron-x-db.malware_reports) via the API Worker's /malware/intelligence/reports
// endpoints. List rows are derived from real persisted report metadata; detail
// returns the full canonical public payload verbatim.

export interface CanonicalMalwareReportListItem {
  report_id: string;
  title: string;
  sha256: string | null;
  family: string | null;
  source: string;
  severity: string | null;
  published_at: string;
  // Gate 3A.4 — sha256 canonicalisation + indexation verdict.
  canonical_report_id?: string;
  is_canonical?: boolean;
  indexable?: boolean;
  static_triage_signal?: MalwareTriageSignal;
}

export type MalwareTriageSignal = "ELEVATED" | "MODERATE" | "LOW" | "INFORMATIONAL";

/** Derived server-side (workers/api/src/malwarePublicSignals.ts); never re-derived in the browser. */
export interface MalwarePublicPresentation {
  brief: string;
  brief_word_count: number;
  static_triage_signal: MalwareTriageSignal;
  static_triage_reasons: string[];
  source_reported_family: string | null;
  capa_reported_count: number;
  capa_groups: { category: string; capabilities: string[] }[];
  static_attack_candidates: { technique_id: string; name: string; derived_from: string }[];
  static_attack_note: string;
  infrastructure_primary: { value: string; type: string; role: string | null }[];
  infrastructure_low_signal: { value: string; type: string; role: string | null; reason?: string }[];
  infrastructure_primary_count: number;
  infrastructure_demoted_count: number;
  indexable: boolean;
  index_reason: string;
}

export interface CanonicalMalwareReportMeta {
  report_id: string;
  sha256: string | null;
  source: string;
  published_at: string;
  canonical_report_id: string;
  is_canonical: boolean;
  indexable: boolean;
  index_reason: string;
  public_presentation: MalwarePublicPresentation;
}

export interface CanonicalMalwareToolResult {
  tool_id: string;
  tool_version: string | null;
  status: string;
  note: string | null;
  output_present: boolean;
  provenance?: { runner_identity?: string; ruleset_version?: string | null; ruleset_digest?: string | null; tool_binary_digest?: string | null };
}

export interface CanonicalMalwareReport {
  report_id: string;
  report_version: string;
  artifact_id: string;
  sha256: string | null;
  sample_identity: Record<string, unknown>;
  acquisition: Record<string, unknown>;
  analysis_status: Record<string, unknown> & { analysis_run_id?: string };
  analysis_run_id?: string;
  analyzed_artifact?: { artifact_id: string; sha256: string | null; file_names: string[]; file_size_bytes: number | null; format_class: string };
  executive_assessment: { statements: { statement: string; grounds: { canonical_id: string; canonical_kind: string }[] }[] };
  static_findings: { observation_count: number; claim_count: number; statements: { statement: string; grounds: { canonical_id: string; canonical_kind: string }[] }[] };
  behaviors: { items: Record<string, unknown>[] };
  configuration: { items: Record<string, unknown>[] };
  family: Record<string, unknown> & { resolution_state?: string; resolved_family?: string | null; candidates?: Record<string, unknown>[]; resolution_reason?: string };
  infrastructure: { items: Record<string, unknown>[] };
  attack_mbc: { items: Record<string, unknown>[] };
  confidence: { items: Record<string, unknown>[] };
  conflicts: { items: Record<string, unknown>[] };
  evidence: Record<string, unknown>;
  detection_artifacts: Record<string, unknown> & { derived_artifacts?: { artifact_id: string; origin: string; hashes: Record<string, string>; file_names: string[] }[] };
  limitations: { code: string; subject_id: string; detail: string }[];
  grounding: Record<string, unknown>;
  decoded_structure?: Record<string, unknown>;
  generated_at: string;
  overall_status?: string;
  tool_results?: CanonicalMalwareToolResult[];
}

export async function getCanonicalMalwareReports(): Promise<ApiResult<{ items: CanonicalMalwareReportListItem[]; total: number }>> {
  try {
    const response = await apiFetch(`${getApiBaseUrl()}/malware/intelligence/reports`, PUBLIC_READ_INIT);
    if (!response.ok) return { state: "error", data: null, error: `API returned HTTP ${response.status}` };
    const payload = await response.json() as { data?: CanonicalMalwareReportListItem[]; meta?: { total?: number } };
    const items = Array.isArray(payload.data) ? payload.data : [];
    return { state: items.length ? "success" : "empty", data: { items, total: payload.meta?.total ?? items.length } };
  } catch { return { state: "error", data: null, error: "Canonical malware report API is unavailable" }; }
}

export interface CanonicalMalwareReportResult extends ApiResult<CanonicalMalwareReport> {
  meta?: CanonicalMalwareReportMeta;
}

export async function getCanonicalMalwareReport(id: string): Promise<CanonicalMalwareReportResult> {
  try {
    const response = await apiFetch(`${getApiBaseUrl()}/malware/intelligence/reports/${encodeURIComponent(id)}`, PUBLIC_READ_INIT);
    if (!response.ok) return { state: response.status === 404 ? "empty" : "error", data: null, error: `API returned HTTP ${response.status}` };
    const payload = await response.json() as { report?: CanonicalMalwareReport; meta?: CanonicalMalwareReportMeta };
    if (!payload.report) return { state: "empty", data: null };
    return { state: "success", data: payload.report, meta: payload.meta };
  } catch { return { state: "error", data: null, error: "Canonical malware report API is unavailable" }; }
}

export async function getMalware(params: { limit?: number; offset?: number } = {}): Promise<ApiResult<{ items: MalwareRecord[]; total: number; limit: number; offset: number }>> {
  const limit = params.limit ?? 25; const offset = params.offset ?? 0; const query = new URLSearchParams({ category: "malware", limit: String(limit), offset: String(offset) });
  try { const response = await apiFetch(`${getApiBaseUrl()}/intelligence?${query}`, PUBLIC_READ_INIT); if (!response.ok) return { state: "error", data: null, error: `API returned HTTP ${response.status}` }; const payload = await response.json() as Record<string, unknown>; const reports = Array.isArray(payload.reports) ? payload.reports as MalwareRecord[] : []; const total = typeof payload.total === "number" ? payload.total : reports.length; return { state: reports.length ? "success" : "empty", data: { items: reports, total, limit, offset } }; } catch { return { state: "error", data: null, error: "Malware API is unavailable" }; }
}
export interface VulnerabilityEvidence {
  id?: string;
  title?: string;
  source?: string;
  url?: string;
  snippet?: string;
  weight?: number;
}

export interface VulnerabilityRelation {
  id?: string;
  source_entity_type?: string;
  source_entity_id?: string;
  target_entity_type?: string;
  target_entity_id?: string;
  relation_type?: string;
  confidence?: number;
  created_at?: string;
  updated_at?: string;
}

export interface StructuredClaim {
  id: string;
  field: string;
  value: string;
  truth_type: string;
  confidence: number;
  source_ids?: string[];
  knowledge_ids?: string[];
  notes?: string;
}

export interface StructuredVulnerabilityReport {
  schema_version?: string;
  status?: string;
  semantic_gate?: { isValid?: boolean; violations?: string[] };
  claims_verification?: { is_valid?: boolean; violations?: Array<{ issue?: string }> };
  diagnostics?: { warnings?: string[]; analysis_provenance?: string };
  dates?: {
    cve_published_at?: string;
    vendor_advisory_at?: string;
    cisa_kev_added_at?: string;
    cisa_due_at?: string;
    report_published_at?: string;
    report_updated_at?: string;
  };
  identity: {
    cve: string;
    title: string;
    vendor: string;
    product: string;
    vulnerability_type: string;
    cwe_id?: string;
    cwe_name?: string;
    cwe_description?: string;
    cwe_ids: string[];
    cwe_details?: Array<{ id: string; name: string; description?: string; formatted?: string }>;
    products_affected?: Array<{
      vendor: string;
      product: string;
      affected_versions: string[];
      fixed_versions?: string[];
    }>;
    technical_mechanism?: string;
    cwe_disagreement?: boolean;
    source_specific_cwes?: Record<string, string[]>;
    truth_states?: Record<string, string>;
  };
  signals?: {
    kev_listed?: boolean;
    observed_in_wild?: boolean;
    exploited_in_the_wild?: boolean;
    exploit_code_public?: string;
    exploit_attempt_observed?: boolean;
    ransomware_campaign_use?: string;
    ransomware_associated?: string;
    public_exploit?: string;
    exploit_code_available?: string;
    cvss_severity?: string;
    epss_score?: string;
    epss_percentile?: string;
  };
  severity: {
    severity: string;
    cvss: {
      score: string;
      vector: string;
      version: string;
      status: string;
      truth_type: string;
    };
    epss: {
      score: string;
      percentile: string;
      status: string;
      truth_type: string;
    };
  };
  exploitation: {
    known_exploited: boolean;
    kev_listed?: boolean;
    observed_in_wild?: boolean;
    exploited_in_the_wild?: boolean;
    exploit_code_public?: string;
    exploit_attempt_observed?: boolean;
    ransomware_campaign_use?: string;
    exploitation_status: string;
    exploitation_context: string;
    ransomware_association: string;
    attack_exposure: string;
    public_exploit?: {
      exploit_id?: string;
      title?: string;
      source_url?: string;
      publication_date?: string;
      status?: string;
      exploit_type?: string;
      is_poc?: boolean;
    };
    public_exploit_available?: string;
    truth_states?: Record<string, string>;
  };
  threat_context?: {
    attack_mappings?: Array<{
      technique_id: string;
      technique_name: string;
      tactic: string;
      relationship: string;
      rationale?: string;
      status: string;
      confidence: number;
      evidence_ids?: string[];
      source_ids?: string[];
    }>;
  };
  technical: {
    technical_mechanism?: string;
    root_cause: string;
    attack_surface: string;
    prerequisites: string;
    authentication_required: boolean | string;
    privileges_required: string;
    user_interaction: string;
    attack_vector: string;
    attack_complexity?: string;
    source_stated_impact?: string;
    analytical_impact?: string;
    technical_impact: string;
    truth_states?: Record<string, string>;
  };
  attack_path?: {
    stages?: Array<{
      stage: string;
      value: string;
      truth_type: string;
      confidence: number;
      evidence_ids: string[];
      source_ids: string[];
    }>;
    entry_point: string;
    prerequisite: string;
    vulnerability_condition: string;
    exploitation_effect: string;
    resulting_access: string;
    confidence: string | number;
    evidence_ids: string[];
  };
  affected_scope?: {
    affected_versions: string;
    fixed_versions: string;
    products_affected?: Array<{
      vendor: string;
      product: string;
      affected_versions: string[];
      fixed_versions?: string[];
    }>;
    truth_states?: Record<string, string>;
  };
  affected: {
    affected_versions: string;
    fixed_versions: string;
    products_affected?: Array<{
      vendor: string;
      product: string;
      affected_versions: string[];
      fixed_versions?: string[];
    }>;
    truth_states?: Record<string, string>;
  };
  remediation: {
    vendor_advisory: string;
    advisory_url?: string;
    advisory_source?: string;
    advisory_published?: string;
    remediation_source?: string;
    fixed_version_source?: string;
    canonical_advisory?: {
      vendor?: string;
      product?: string;
      affected_versions?: string[];
      fixed_versions?: string[];
      advisory_id?: string;
      source_format?: string;
      remediations?: Array<{ type: string; details: string; url?: string }>;
      mitigations?: string[];
    };
    cisa_action: string;
    due_date: string;
    recommended_action: string;
  };
  validation?: {
    kernel_validation?: {
      executed: boolean;
      status: string;
      lifecycle_state: string;
      checks?: {
        canonical_integrity: string;
        semantic_consistency: string;
        evidence_grounding: string;
      };
      conflicts?: string[];
      errors?: string[];
    };
  };
  detection: {
    known_indicators?: string;
    vendor_detection_guidance?: string;
    cisa_detection_guidance?: string;
    analyst_defensive_considerations?: string;
    recommended_monitoring?: string;
    observable_behaviors: string;
    defensive_signals: string;
    detection_confidence: string;
    truth_states?: Record<string, string>;
  };
  assessment: {
    executive_assessment: string;
    technical_assessment: string;
    confidence: {
      source_confidence?: number;
      analysis_confidence?: number;
      overall_confidence?: number;
      score: number;
      rating: string;
      basis: string;
    };
    uncertainty: string[];
  };
  uncertainty?: string[];
  evidence?: any[];
  provenance: {
    claims: StructuredClaim[];
    evidence: any[];
    sources: string[];
  };
}

export interface VulnerabilityDetail {
  intelligence_id?: string;
  schema_version?: string;
  title?: string;
  summary?: string;
  body?: string;
  severity?: string;
  confidence?: number | Record<string, unknown>;
  status?: string;
  publication_status?: string;
  intelligence_type?: string;
  structured_report?: StructuredVulnerabilityReport;
  ai_analysis?: ReportIntegrityInput['ai_analysis'];
  analysis_availability?: AnalysisAvailability;
  /** Gate 3A.3 — verified NVD/KEV/EPSS facts, safe on a withheld public page. */
  public_advisory?: AuthoritativeAdvisory | null;
  knowledge_trace?: any[];
  epistemic_breakdown?: any;
  entities?: Array<{ id?: string; name?: string; type?: string }>;
  evidence?: VulnerabilityEvidence[];
  source_references?: Array<{ title?: string; url?: string }>;
  relations?: VulnerabilityRelation[];
  citations?: unknown[];
  source_title?: string;
  source_id?: string;
  created_at?: string;
  updated_at?: string;
  message_timestamp?: string;
  ingested_at?: string;
  processed_at?: string;
  published_at?: string;
  first_seen?: string;
  first_seen_at?: string;
  last_seen?: string;
  last_seen_at?: string;
  observed_at?: string;
}

export async function getVulnerabilityDetail(id: string): Promise<ApiResult<VulnerabilityDetail>> {
  try {
    const response = await apiFetch(`${getApiBaseUrl()}/intelligence/${encodeURIComponent(id)}`, PUBLIC_READ_INIT);
    if (response.ok) {
      const payload = await response.json() as { report?: VulnerabilityDetail };
      if (payload.report) {
        const report = projectVulnerabilityReportPublicRead(payload.report);
        // Keep negative diagnostics even on older/incompatible structured payloads.
        // Never fall through to another record when the requested analysis was withheld.
        if (report.publication_status === "WITHHELD") return { state: "success", data: report };
        const structured = report.structured_report as Record<string, unknown> | undefined;
        const compatible = structured && structured.assessment && structured.identity && structured.remediation;
        return { state: "success", data: compatible ? report : { ...report, structured_report: undefined } };
      }
    }
    // Fallback to canonical /vulnerabilities/:id endpoint
    const vulnRes = await apiFetch(`${getApiBaseUrl()}/vulnerabilities/${encodeURIComponent(id)}`, PUBLIC_READ_INIT);
    if (vulnRes.ok) {
      const vulnPayload = await vulnRes.json() as { data?: Record<string, unknown> };
      if (vulnPayload.data) {
        const d = vulnPayload.data;
        const cveId = (d.cve_id as string) || (d.id as string) || id;
        const isExploited = Boolean(d.is_exploited_in_wild);
        return {
          state: "success",
          data: {
            intelligence_id: cveId,
            title: (d.title as string) || `${cveId} Security Advisory`,
            summary: (d.description as string) || `Authoritative intelligence advisory for ${cveId}`,
            body: (d.description as string) || `Authoritative intelligence advisory for ${cveId}`,
            severity: (d.severity as string) || 'HIGH',
            // Wave 4B — pass the API value through; never synthesize a score.
            confidence: typeof d.confidence === 'number' ? d.confidence : undefined,
            status: isExploited ? 'EXPLOITED_IN_WILD' : 'VERIFIED',
            source_id: 'cisa-kev',
            source_title: 'CISA Known Exploited Vulnerabilities',
            created_at: (d.created_at as string) || undefined,
            updated_at: (d.updated_at as string) || (d.created_at as string) || undefined,
            published_at: (d.published_at as string) || undefined,
            evidence: (Array.isArray(d.related_evidence) ? d.related_evidence : []) as VulnerabilityEvidence[],
            relations: [],
          }
        };
      }
    }
    return { state: "empty", data: null };
  } catch { return { state: "error", data: null, error: "Vulnerability detail API is unavailable" }; }
}

// Wave 4B: the API base is resolved per call by `siteConfig` (env + request
// host), never by a hardcoded preview literal and never from a module-import
// snapshot. A production deployment can no longer silently read the preview
// worker's database just because the var went missing.

/**
 * Wave 4B — public, anonymous reads are cacheable.
 *
 * A blanket `cache: "no-store"` forced every SSR render to hit the API, even for
 * slowly-changing public collections. `next.revalidate` is the standard Next
 * fetch cache hint (ignored harmlessly by a runtime that does not implement it);
 * the API's own `Cache-Control` still governs the edge copy.
 *
 * Authenticated/operator calls and dynamic `/search?q=` requests keep
 * `cache: "no-store"` — their responses are per-user and must never be shared.
 */
const PUBLIC_READ_INIT = {
  headers: { accept: "application/json" },
  next: { revalidate: 300 },
} as unknown as RequestInit;

export async function getIntelligence(params: { limit?: number; cursor?: string } = {}): Promise<ApiResult<IntelligenceList>> {
  const query = new URLSearchParams();
  if (params.limit) query.set("limit", String(params.limit));
  if (params.cursor) query.set("cursor", params.cursor);
  try {
    const response = await apiFetch(`${getApiBaseUrl()}/intelligence${query.size ? `?${query}` : ""}`, PUBLIC_READ_INIT);
    if (!response.ok) return { state: "error", data: null, error: `API returned HTTP ${response.status}` };
    const payload = await response.json() as Record<string, unknown>;
    const raw = Array.isArray(payload.reports) ? payload.reports : Array.isArray(payload.items) ? payload.items : Array.isArray(payload.data) ? payload.data : [];
    const items = (raw as Record<string, unknown>[]).map((r) => {
      const confidence = typeof r.confidence === "number" ? r.confidence : typeof (r.confidence as { overall_confidence?: number; score?: number; rating?: number })?.overall_confidence === "number" ? (r.confidence as { overall_confidence: number }).overall_confidence : typeof (r.confidence as { score?: number })?.score === "number" ? (r.confidence as { score: number }).score : undefined;
      return { ...r, id: (r.intelligence_id as string) || (r.id as string), type: (r.intelligence_type as string) || (r.type as string), updatedAt: (r.updated_at as string) || (r.updatedAt as string), confidence } as unknown as IntelligenceRecord;
    });
    return { state: items.length ? "success" : "empty", data: { items, total: typeof payload.total === "number" ? payload.total : undefined, nextCursor: typeof payload.nextCursor === "string" ? payload.nextCursor : null } };
  } catch { return { state: "error", data: null, error: "Intelligence API is unavailable" }; }
}

export async function getVulnerabilities(params: { limit?: number; offset?: number; severity?: string; q?: string } = {}): Promise<ApiResult<VulnerabilityList>> {
  const limit = params.limit ?? 25;
  const offset = params.offset ?? 0;
  const query = new URLSearchParams({ limit: String(limit), offset: String(offset) });
  if (params.severity) query.set("severity", params.severity);
  if (params.q) query.set("q", params.q);

  try {
    const response = await apiFetch(`${getApiBaseUrl()}/vulnerabilities?${query}`, PUBLIC_READ_INIT);
    if (!response.ok) return { state: "error", data: null, error: `API returned HTTP ${response.status}` };
    const payload = await response.json() as { data?: Record<string, unknown>[]; meta?: { total?: number; limit?: number; offset?: number } };
    const rawItems = Array.isArray(payload.data) ? payload.data : [];
    const items: VulnerabilityRecord[] = rawItems.map((r) => {
      const cveId = (r.cve_id as string) || (r.id as string) || "";
      const isExploited = Boolean(r.is_exploited_in_wild);
      return {
        id: cveId,
        intelligence_id: cveId,
        title: (r.title as string) || (cveId ? `${cveId} Security Advisory` : "Vulnerability Advisory"),
        summary: (r.description as string) || "",
        severity: (r.severity as string) || "UNKNOWN",
        // Wave 4B — no client-side confidence synthesis. The API either returned a
        // confidence or it did not; a derived score is fabricated authority.
        confidence: typeof r.confidence === "number" ? r.confidence : undefined,
        status: isExploited ? "EXPLOITED_IN_WILD" : "VERIFIED",
        source_title: "CISA KEV",
        source_id: "cisa-kev",
        created_at: (r.created_at as string) || undefined,
        updated_at: (r.updated_at as string) || (r.created_at as string) || undefined,
      };
    });
    const total = typeof payload.meta?.total === "number" ? payload.meta.total : items.length;
    const metaLimit = typeof payload.meta?.limit === "number" ? payload.meta.limit : limit;
    const metaOffset = typeof payload.meta?.offset === "number" ? payload.meta.offset : offset;
    return { state: items.length ? "success" : "empty", data: { items, total, limit: metaLimit, offset: metaOffset } };
  } catch { return { state: "error", data: null, error: "Vulnerability API is unavailable" }; }
}

export async function searchIntelligence(query: string): Promise<ApiResult<IntelligenceList>> {
  if (!query.trim()) return { state: "empty", data: { items: [] } };
  try {
    const response = await apiFetch(`${getApiBaseUrl()}/search?q=${encodeURIComponent(query.trim())}`, { headers: { accept: "application/json" }, cache: "no-store" });
    if (!response.ok) return { state: "error", data: null, error: `API returned HTTP ${response.status}` };
    const payload = await response.json() as Record<string, unknown>;
    const searchData = payload.data && typeof payload.data === "object" ? payload.data as Record<string, unknown> : payload;
    const groups = ["actors", "vulnerabilities", "malware", "iocs", "events", "articles"];
    const items = groups.flatMap((group) => Array.isArray(searchData[group]) ? searchData[group] : []) as IntelligenceRecord[];
    return { state: items.length ? "success" : "empty", data: { items } };
  } catch { return { state: "error", data: null, error: "Search API is unavailable" }; }
}
