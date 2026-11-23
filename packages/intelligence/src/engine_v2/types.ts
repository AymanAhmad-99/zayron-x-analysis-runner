/**
 * ZAYRON-X — DEEP INTELLIGENCE ANALYSIS ENGINE v2
 * Canonical Type Definitions & Contracts
 */

export type ClaimTypeV2 =
  | 'VERIFIED_FACT'
  | 'OBSERVED_BEHAVIOR'
  | 'SUPPORTED_INFERENCE'
  | 'ANALYST_ASSESSMENT'
  | 'UNKNOWN';

export type EpistemicStatusV2 =
  | 'OBSERVED'
  | 'INFERRED'
  | 'CONTEXTUAL'
  | 'UNRESOLVED';

export type AnalyticalDomainV2 =
  | 'VULNERABILITY_ANALYSIS'
  | 'EXPLOIT_ANALYSIS'
  | 'MALWARE_ANALYSIS'
  | 'REVERSE_ENGINEERING'
  | 'MEMORY_FORENSICS'
  | 'NETWORK_SECURITY_MONITORING'
  | 'DETECTION_ENGINEERING'
  | 'THREAT_INTELLIGENCE'
  | 'THREAT_MODELING'
  | 'INCIDENT_RESPONSE'
  | 'WINDOWS_INTERNALS'
  | 'LINUX_INTERNALS'
  | 'CLOUD_SECURITY'
  | 'WEB_SECURITY'
  | 'IDENTITY_AUTHENTICATION'
  | 'CRYPTOGRAPHY';

export type ExploitStatusV2 =
  | 'VULNERABILITY_EXISTS'
  | 'PUBLIC_EXPLOIT_EXISTS'
  | 'EXPLOITATION_OBSERVED'
  | 'EXPLOITATION_IN_THE_WILD';

export type ThreatSeverityV2 = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFORMATIONAL';
export type TriagePriorityV2 = 'P1' | 'P2' | 'P3' | 'P4';

export type EpistemicClaimType =
  | 'CONFIRMED_FACT'
  | 'INFERENCE'
  | 'UNVERIFIED'
  | 'CONFLICTING_SOURCES';

export interface GroundedCitation {
  document_id: string;
  chunk_id: string;
  quoted_fragment: string; // verbatim substring, <= 30 words, MUST exist character-for-character in the resolved chunk's raw text
  authority_tier: number;
}

export interface GroundedClaimV2 {
  claim_id: string;
  claim_type: EpistemicClaimType | ClaimTypeV2;
  statement: string;
  evidence_ids: string[];
  book_citations: GroundedCitation[]; // MANDATORY for INFERENCE/ASSESSMENT claims when relevant book chunks were retrieved
  knowledge_ids?: string[];
  source_ids?: string[];
  confidence: number;
  epistemic_status?: EpistemicStatusV2;
  observation_mode?: 'OBSERVED' | 'INFERRED' | 'CONTEXTUAL';
  timestamp?: string;
  rationale: string;
}

export interface AuthoritativeEnrichmentV2 {
  cve_id: string | null;
  cvss_score: number | null;
  cvss_severity: ThreatSeverityV2;
  cvss_vector: string | null;
  vector_breakdown?: {
    attack_vector?: 'NETWORK' | 'ADJACENT' | 'LOCAL' | 'PHYSICAL';
    attack_complexity?: 'LOW' | 'HIGH';
    privileges_required?: 'NONE' | 'LOW' | 'HIGH';
    user_interaction?: 'NONE' | 'REQUIRED';
    scope?: 'UNCHANGED' | 'CHANGED';
    confidentiality?: 'HIGH' | 'LOW' | 'NONE';
    integrity?: 'HIGH' | 'LOW' | 'NONE';
    availability?: 'HIGH' | 'LOW' | 'NONE';
  };
  exploit_status: ExploitStatusV2;
  cisa_kev: {
    is_in_kev: boolean;
    date_added?: string;
    /** Present only when catalog evidence exists; undefined = no catalog evidence ingested. */
    ransomware_campaign_use?: boolean;
    required_action?: string;
  };
  /** Recorded provenance for the KEV state: CONFIRMED (evidence-backed) or ABSENT (no evidence ingested). */
  kev_evidence: {
    status: 'CONFIRMED' | 'ABSENT';
    source_id: string | null;
    source_url: string | null;
    catalog_version: string | null;
    retrieved_at: string | null;
  };
  epss: {
    /** null = UNKNOWN (no measured EPSS evidence); the pipeline never synthesizes a score. */
    score: number | null;
    percentile?: number | null;
  };
  /** Recorded provenance for the EPSS state: CONFIRMED (measured) or ABSENT (no evidence ingested). */
  epss_evidence: {
    status: 'CONFIRMED' | 'ABSENT';
    source_id: string | null;
    source_url: string | null;
    retrieved_at: string | null;
  };
  analyst_priority: TriagePriorityV2;
}

export interface SourceProvenanceItemV2 {
  source_id: string;
  issuing_authority: string;
  collection_channel: string;
  discovery_source?: string;
  source_tier:
    | 'PRIMARY_FACT_SOURCE'
    | 'SECONDARY_RESEARCH'
    | 'COMMUNITY_DISCOVERY'
    | 'METHODOLOGY'
    | 'FRAMEWORK'
    | 'TELEMETRY';
  reference_url: string | null;
  observed_at: string;
  published_at: string;
  retrieved_at: string;
  content_hash: string;
}

export interface ContradictionRecordV2 {
  contradiction_id: string;
  topic: string;
  source_a: {
    authority: string;
    tier: number;
    claim: string;
    timestamp?: string;
  };
  source_b: {
    authority: string;
    tier: number;
    claim: string;
    timestamp?: string;
  };
  resolution_status: 'SUPERSEDED_BY_PRIMARY' | 'EVIDENTIARY_DISPUTE' | 'UNRESOLVED_CONFLICT';
  analyst_note: string;
}

export interface KnowledgeTraceItemV2 {
  document_id: string;
  chunk_id: string;
  chunk_text?: string;
  title: string;
  edition?: string;
  authority_tier?: number;
  domain: AnalyticalDomainV2;
  retrieval_score: number;
  retrieval_method: 'DOMAIN_PRECONDITION_SEMANTIC' | 'EXACT_ENTITY_MATCH' | 'STANDARDS_LOOKUP';
  reason_retrieved: string;
  section_influenced: string[];
  claim_influenced: string[];
  status: 'USED' | 'CONSIDERED_NOT_USED';
  rejection_reason?: string;
}

export interface ConfidenceMatrixV2 {
  source_reliability: number;
  evidence_strength: number;
  analytical_confidence: number;
  overall_confidence: number;
  rating: 'VERY_HIGH' | 'HIGH' | 'MODERATE' | 'LOW' | 'INSUFFICIENT_EVIDENCE';
  calibration_rationale: string;
}

export interface AttackMappingItemV2 {
  technique_id: string;
  technique_name: string;
  tactic: string;
  behavior_observed: string;
  evidence_id: string;
  confidence: number;
}

export interface CanonicalSectionV2 {
  section_number: string;
  title: string;
  category: 'EXECUTIVE' | 'VERIFIED_FACTS' | 'TECHNICAL_ANALYSIS' | 'THREAT_CONTEXT' | 'PROVENANCE' | 'DEFENSE' | 'UNKNOWN' | 'METADATA';
  content: string;
}

export interface CanonicalReportObjectV2 {
  report_id: string;
  schema_version: '2.0.0';
  report_type: 'VULNERABILITY' | 'MALWARE' | 'RANSOMWARE' | 'THREAT_ACTOR' | 'CAMPAIGN' | 'INCIDENT_TELEMETRY' | 'GENERAL_CTI';
  depth: 'LOW' | 'MODERATE' | 'HIGH';
  headline: string;
  executive_summary: string;
  severity: ThreatSeverityV2;
  priority: TriagePriorityV2;
  confidence: ConfidenceMatrixV2;
  enrichment: AuthoritativeEnrichmentV2;
  provenance: SourceProvenanceItemV2[];
  contradictions: ContradictionRecordV2[];
  claims: GroundedClaimV2[];
  attack_mappings: AttackMappingItemV2[];
  evidence_items: Array<{
    evidence_id: string;
    statement: string;
    quoted_excerpt: string;
    source_id: string;
    weight: number;
  }>;
  knowledge_trace: KnowledgeTraceItemV2[];
  sections: CanonicalSectionV2[];
  generated_at: string;
  quality_gate_passed: boolean;
  quality_gate_violations: string[];
}
