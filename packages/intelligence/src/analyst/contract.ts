export type ThreatLevel = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFORMATIONAL';
export type ConfidenceState = 'CONFIRMED' | 'HIGH_CONFIDENCE' | 'MODERATE_CONFIDENCE' | 'LOW_CONFIDENCE' | 'UNVERIFIED' | 'INSUFFICIENT_EVIDENCE';
export type EpistemicStatus = 'OBSERVED_FACT' | 'CORROBORATED' | 'ANALYTICAL_INFERENCE' | 'REPORTED_CLAIM' | 'UNKNOWN';

export type EventTaxonomy =
  | 'VULNERABILITY'
  | 'ACTIVE_EXPLOITATION'
  | 'MALWARE'
  | 'THREAT_ACTOR'
  | 'CAMPAIGN'
  | 'IOC'
  | 'DATA_BREACH'
  | 'CREDENTIAL_THEFT'
  | 'RANSOMWARE'
  | 'PHISHING'
  | 'CLOUD_ATTACK'
  | 'IDENTITY_ATTACK'
  | 'SUPPLY_CHAIN'
  | 'REGULATORY_CHANGE'
  | 'SECURITY_ADVISORY'
  | 'RESEARCH'
  | 'OTHER';

export interface GroundedClaim {
  claimId: string;
  statement: string;
  epistemicStatus: EpistemicStatus;
  evidenceIds: string[];
  sourceIds: string[];
  confidence: number;
}

export interface ContradictionRecord {
  contradictionId: string;
  topic: string;
  sourceA: { id: string; name: string; tier: number; claim: string; timestamp?: string };
  sourceB: { id: string; name: string; tier: number; claim: string; timestamp?: string };
  resolutionStatus: 'UNRESOLVED_CONFLICT' | 'SUPERSEDED_BY_PRIMARY' | 'EVIDENTIARY_DISPUTE';
  analystNote: string;
}

export interface IntelligenceAssessmentReport {
  assessment: {
    headline: string;
    executive_summary: string;
    threat_level: ThreatLevel;
    confidence_score: number; // 0.0 to 1.0 (System-controlled calculation)
    confidence_state: ConfidenceState;
    novelty: 'NEW_THREAT' | 'EVOLVING_CAMPAIGN' | 'KNOWN_ACTIVITY' | 'HISTORICAL_PATTERN';
    urgency: 'IMMEDIATE_ACTION_REQUIRED' | 'ELEVATED_MONITORING' | 'ROUTINE_PATCHING' | 'INFORMATIONAL';
  };

  what_happened: string;
  why_it_matters: string;
  who_is_involved: string[];
  who_may_be_affected: string[];

  vulnerabilities: Array<{
    cveId: string;
    title?: string;
    severity?: string;
    isExploitedInWild?: boolean;
    cvssScore?: number;
    epssScore?: number;
    affectedProduct?: string;
  }>;

  malware: Array<{
    name: string;
    slug?: string;
    family?: string;
    type?: string;
    capabilities?: string[];
  }>;

  actors: Array<{
    name: string;
    slug?: string;
    country?: string;
    motivation?: string;
    aliases?: string[];
  }>;

  iocs: Array<{
    type: 'ipv4' | 'ipv6' | 'domain' | 'url' | 'sha256' | 'md5';
    value: string;
    confidence: number;
    context?: string;
  }>;

  ttps: Array<{
    techniqueId: string; // e.g. T1190
    techniqueName: string;
    tactic: string;
  }>;

  infrastructure: Array<{
    type: string;
    value: string;
    role: string;
  }>;

  timeline: Array<{
    timestamp: string;
    eventDescription: string;
    sourceId?: string;
  }>;

  evidence: Array<{
    evidenceId: string;
    snippet: string;
    sourceType: string;
    weight: number;
    sourceId?: string;
  }>;

  corroboration: {
    source_count: number;
    independent_source_count: number;
    source_tiers: number[];
    contradictions: ContradictionRecord[];
  };

  unknowns: string[];
  defensive_implications: Array<{
    mitreDefenseId?: string;
    recommendation: string;
    priority: 'HIGH' | 'MEDIUM' | 'LOW';
  }>;

  citations: Array<{
    citationId: string;
    title: string;
    publisher?: string;
    sourceUrl?: string;
    authorityTier: number;
    referenceType: 'primary_standard' | 'research_paper' | 'cisa_advisory' | 'telemetry_evidence' | 'book_methodology';
  }>;

  groundedClaims?: GroundedClaim[];
}
