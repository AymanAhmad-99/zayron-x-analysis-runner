/**
 * ZAYRON-X Reporting Layer Core Types & Schema
 * Grounded in Canonical Knowledge Model & Layer 5 Architecture.
 */

import type { AuthorityTier, AdmiraltyReliability, AdmiraltyCredibility } from '../ingestion/contracts';

export type IntelligenceDomain =
  | 'VULNERABILITY'
  | 'EXPLOIT'
  | 'MALWARE'
  | 'THREAT_ACTOR'
  | 'CAMPAIGN'
  | 'RANSOMWARE'
  | 'INDICATOR'
  | 'INFRASTRUCTURE'
  | 'ATTACK_TECHNIQUE'
  | 'INCIDENT';

export type ReportLifecycleState =
  | 'DRAFT'
  | 'REVIEW_REQUIRED'
  | 'READY'
  | 'PUBLISHED'
  | 'SUPERSEDED';

export type FreshnessState =
  | 'CURRENT'
  | 'HISTORICAL'
  | 'STALE'
  | 'SUPERSEDED'
  | 'UNKNOWN';

export type AudienceType =
  | 'EXECUTIVE'
  | 'ANALYST'
  | 'SOC_DETECTION'
  | 'INCIDENT_RESPONSE';

export type ClaimEpistemicStatus =
  | 'DIRECTLY_OBSERVED'
  | 'SOURCE_REPORTED'
  | 'CORROBORATED'
  | 'ASSESSED'
  | 'INFERRED'
  | 'UNKNOWN'
  | 'CONTESTED'
  | 'SUPERSEDED'
  | 'OBSERVED' // Backwards compatibility with existing tests/fixtures
  | 'REPORTED'; // Backwards compatibility

export type ExploitationTemporalStatus =
  | 'HISTORICAL_EXPLOITATION_OBSERVED'
  | 'CURRENT_EXPLOITATION_OBSERVED'
  | 'CURRENT_STATUS_UNKNOWN'
  | 'NO_EXPLOITATION_OBSERVED'
  | 'UNKNOWN';

export type ExploitMaturity =
  | 'NO_KNOWN_EXPLOIT'
  | 'POC'
  | 'PUBLIC_EXPLOIT'
  | 'FUNCTIONAL_EXPLOIT'
  | 'WEAPONIZED'
  | 'OBSERVED_EXPLOITATION'
  | 'UNKNOWN';

export type AttackMappingProvenance =
  | 'SOURCE_REPORTED'
  | 'ANALYST_MAPPED'
  | 'INFERRED';

export type TlpLevel =
  | 'TLP:CLEAR'
  | 'TLP:GREEN'
  | 'TLP:AMBER'
  | 'TLP:AMBER+STRICT'
  | 'TLP:RED';

export type ConfidenceLevel = 'HIGH' | 'MEDIUM' | 'LOW' | 'UNKNOWN';

export type ActionUrgency = 'REQUIRED' | 'RECOMMENDED' | 'OPTIONAL';

export interface ReportCitation {
  citationId: string;
  evidenceId: string;
  sourceId: string;
  sourceSnapshotId?: string;
  authorityTier?: AuthorityTier;
  reliability?: AdmiraltyReliability;
  credibility?: AdmiraltyCredibility;
  statement: string;
  url?: string;
  publishedAt?: string;
  retrievedAt: string;
  /**
   * Evidence classification when the citation is materialised from a typed
   * evidence-store record (e.g. INCIDENT_TELEMETRY, VICTIM_CONFIRMATION).
   */
  evidenceType?: string;
}

export interface AssessmentConfidenceDimensions {
  historicalExploitation?: ConfidenceLevel;
  currentExploitationStatus?: ConfidenceLevel;
  threatActorAttribution?: ConfidenceLevel;
  vulnerabilityImpact?: ConfidenceLevel;
  mitigationEffectiveness?: ConfidenceLevel;
  
  // Malware Domain Dimensions
  sampleIdentity?: ConfidenceLevel;
  familyClassification?: ConfidenceLevel;
  maliciousnessAssessment?: ConfidenceLevel;
  currentActivity?: ConfidenceLevel;
  campaignAssociation?: ConfidenceLevel;

  // Exploit Domain Dimensions
  exploitMaturityDimension?: ConfidenceLevel;
  functionalCapability?: ConfidenceLevel;
  prerequisitesAssessment?: ConfidenceLevel;
}

export interface ReportConfidence {
  level: ConfidenceLevel;
  sourceReliability: AuthorityTier;
  evidenceDirectness: 'DIRECT_OBSERVATION' | 'SOURCE_DERIVED' | 'INFERRED';
  corroborationCount: number;
  hasContradictions: boolean;
  basis: string[];
  reasoning: string;
  dimensions?: AssessmentConfidenceDimensions;
}

export interface EpistemicStatement {
  statementId: string;
  status: ClaimEpistemicStatus;
  text: string;
  evidenceRefs: string[];
  competingStatements?: string[];
}

export interface IntelligenceGap {
  gapId: string;
  topic: string;
  reason: string;
  evidenceNeeded: string;
  impactOnAssessment: string;
}

export interface TimelineEntry {
  timestamp: string; // ISO UTC
  eventType: string; // e.g. FIRST_OBSERVED, PUBLISHED, EXPLOITATION_SEEN
  description: string;
  evidenceRef: string;
  sourceId: string;
  epistemicStatus?: ClaimEpistemicStatus;
}

export type CapabilityClaimLevel =
  | 'SAMPLE_OBSERVED'
  | 'FAMILY_DOCUMENTED'
  | 'SOURCE_REPORTED'
  | 'ANALYST_ASSESSED'
  | 'UNKNOWN';

export type AttackMappingScope =
  | 'SAMPLE_SPECIFIC'
  | 'FAMILY_LEVEL'
  | 'ANALYST_MAPPED'
  | 'SOURCE_REPORTED'
  | 'UNKNOWN';

export type DefensiveActionScope =
  | 'SAMPLE-SPECIFIC'
  | 'FAMILY-LEVEL'
  | 'ENVIRONMENTAL'
  | 'GENERAL-HARDENING';

export type SampleFindingStatus =
  | 'CONFIRMED'
  | 'SOURCE_REPORTED'
  | 'AVAILABLE'
  | 'LIMITED'
  | 'NOT AVAILABLE'
  | 'UNKNOWN';

export interface SampleSpecificFindings {
  sampleIdentity: SampleFindingStatus;
  cryptographicHashes: SampleFindingStatus;
  fileMetadata: SampleFindingStatus;
  sourceClassification: SampleFindingStatus;
  sampleLevelBehavioralTelemetry: SampleFindingStatus;
  currentActivity: SampleFindingStatus;
  threatActor: SampleFindingStatus;
  campaign: SampleFindingStatus;
}

export interface CorroborationMetadata {
  isCorroborated: boolean;
  evidenceCount: number;
  sourceDiversity: number;
  sourceIdentities: string[];
  evidenceIndependence: 'INDEPENDENT' | 'SINGLE_SOURCE' | 'SELF_REFERENTIAL' | 'UNSUPPORTED';
  details?: string;
}

export type MitigationStatus = 'CURRENT' | 'HISTORICAL' | 'SUPERSEDED' | 'UNKNOWN';

export interface DefensiveAction {
  actionId: string;
  urgency: ActionUrgency;
  title: string;
  description: string;
  affectedDomain: IntelligenceDomain;
  targetEntityId: string;
  evidenceRefs: string[];
  confidence: ConfidenceLevel;
  guidanceType?: 'SOURCE_DERIVED' | 'ANALYST_DERIVED' | 'EVIDENCE_GROUNDED_RECOMMENDATION';
  scope?: DefensiveActionScope;
  mitigationStatus?: MitigationStatus;
}

export interface ContradictionRecord {
  conflictId: string;
  topic: string;
  claimA: { statement: string; sourceId: string; evidenceRef: string };
  claimB: { statement: string; sourceId: string; evidenceRef: string };
  analystResolution?: string;
  status: 'UNRESOLVED' | 'RESOLVED';
}

export interface EntityRelationshipNode {
  relationshipId: string;
  sourceEntityId: string;
  sourceEntityType: string;
  relationshipType: string;
  targetEntityId: string;
  targetEntityType: string;
  confidence: ConfidenceLevel;
  evidenceRefs: string[];
}

export interface TechnicalArtifactIOC {
  iocType: string;
  value: string;
  warninglistMatch?: boolean;
  warninglistName?: string;
  confidence: ConfidenceLevel;
  evidenceRefs: string[];
  provenance?: string;
  firstSeen?: string;
  lastSeen?: string;
  relationshipToSample?: string;
}

export interface AttackTechniqueMapping {
  techniqueId: string; // e.g. T1059.001
  techniqueName: string;
  tactic: string;
  detectionOpportunity?: string;
  evidenceRefs: string[];
  mappingProvenance?: AttackMappingProvenance;
  scope?: AttackMappingScope;
}

export interface MalwareCapabilityItem {
  capabilityId: string;
  category: 'execution' | 'persistence' | 'credential_access' | 'discovery' | 'defense_evasion' | 'command_and_control' | 'data_collection' | 'exfiltration' | 'impact' | 'lateral_movement';
  name: string;
  description: string;
  status: ClaimEpistemicStatus;
  evidenceRefs: string[];
  confidence: ConfidenceLevel;
  scope?: 'SAMPLE_SPECIFIC' | 'FAMILY_LEVEL';
  claimLevel?: CapabilityClaimLevel;
}

export interface CanonicalIntelligenceReport {
  reportId: string;
  revision: number;
  reportVersion: string;
  intelligenceVersion: string;
  templateVersion: string;
  state: ReportLifecycleState;
  freshness: FreshnessState;
  domain: IntelligenceDomain;
  templateId: string;
  tlp?: TlpLevel;
  createdAt: string;
  updatedAt: string;
  supersedes?: string;
  supersededBy?: string;
  
  // Entity Identity
  identity: {
    entityId: string;
    primaryName: string;
    aliases: string[];
    externalIds: Record<string, string>;
  };

  // The 5 Canonical Pillars
  executiveSummary: {
    whatHappened: string;
    whyItMatters: string;
    affectedScope: string;
    keyConclusion: string;
    immediateAction: string;
  };

  intelligenceAssessment: {
    assessmentSummary: string;
    confidence: ReportConfidence;
    supportingEvidenceRefs: string[];
    competingHypotheses: string[];
    assumptions: string[];
    limitations: string[];
    reasoning: string;
  };

  whatWeKnow: EpistemicStatement[];
  whatWeDoNotKnow: IntelligenceGap[];
  timeline: TimelineEntry[];
  relationships: EntityRelationshipNode[];
  iocs: TechnicalArtifactIOC[];
  attackTechniques: AttackTechniqueMapping[];
  actions: DefensiveAction[];
  contradictions: ContradictionRecord[];
  evidenceStore: Record<string, ReportCitation>;

  // Domain-Specific Fields
  domainDetails?: {
    cvssScore?: number;
    epssScore?: number;
    exploitMaturity?: ExploitMaturity;
    isKev?: boolean;
    malwareFamily?: string;
    actorMotivations?: string[];
    campaignObjective?: string;
    ransomwareLeakSiteReported?: boolean;
    preconditions?: string[];
    
    // Temporal & Epistemic Hardening
    exploitationTemporalStatus?: ExploitationTemporalStatus;
    knownExploitationPeriod?: {
      firstKnownExploitation?: string;
      latestAvailableExploitationEvidence?: string;
    };
    weaponizationStatus?: 'CONFIRMED_WEAPONIZED' | 'NOT_OBSERVED' | 'UNKNOWN';

    // Malware Domain Explicit Fields
    sampleSpecificFindings?: SampleSpecificFindings;
    sampleSpecificBehavior?: {
      status: 'AVAILABLE' | 'LIMITED' | 'NOT AVAILABLE' | 'UNKNOWN';
      details: string;
      evidenceRefs: string[];
    };
    corroborationMetadata?: CorroborationMetadata;
    sampleArtifact?: {
      sampleId: string;
      filename: string;
      /** Omitted when the source record does not establish a size. */
      fileSize?: number;
      fileType: string;
      mimeType: string;
      hashes: {
        sha256: string;
        sha1?: string;
        md5?: string;
        imphash?: string;
      };
      /** Omitted when the source record does not establish first observation. */
      firstSeen?: string;
      lastSeen?: string;
      reporter?: string;
      deliveryMethod?: string;
      tags?: string[];
    };
    familyClassification?: {
      sourceReportedFamily: string;
      normalizedFamily: string;
      classificationProvenance: 'SOURCE_REPORTED' | 'CORROBORATED' | 'ANALYST_ASSESSED' | 'CONTESTED';
      confidence: ConfidenceLevel;
      isContested?: boolean;
    };
    malwareCapabilities?: MalwareCapabilityItem[];
    activityStatus?: {
      currentStatus: 'CURRENTLY_OBSERVED' | 'HISTORICAL_ACTIVITY_OBSERVED' | 'CURRENT_STATUS_UNKNOWN' | 'NO_CURRENT_ACTIVITY_EVIDENCE' | 'UNKNOWN';
      /** Omitted when no timestamp is established for the activity window. */
      firstSeen?: string;
      lastSeen?: string;
      telemetryBasis: string;
    };

    // Exploit Domain Explicit Fields
    exploitDetails?: {
      targetVulnerabilityId: string;
      targetVulnerabilityName?: string;
      exploitId: string;
      exploitTitle: string;
      exploitType: string; // e.g. 'REMOTE_COMMAND_EXECUTION', 'PRIVILEGE_ESCALATION'
      maturityState: ExploitMaturity;
      publicAvailability: {
        status: 'PUBLICLY_AVAILABLE' | 'PRIVATE' | 'RESTRICTED' | 'UNKNOWN';
        publishedAt?: string;
        repositoryUrl?: string;
        author?: string;
      };
      functionalCapability: {
        capabilityLevel: 'REMOTE_CODE_EXECUTION' | 'LOCAL_PRIVILEGE_ESCALATION' | 'DENIAL_OF_SERVICE' | 'AUTHENTICATION_BYPASS' | 'UNKNOWN';
        reliability: 'RELIABLE' | 'UNRELIABLE' | 'CONCEPT_ONLY' | 'UNKNOWN';
        scopeOfImpact: string;
      };
      weaponization: {
        status: 'CONFIRMED_WEAPONIZED' | 'NOT_WEAPONIZED' | 'STANDALONE_SCRIPT' | 'UNKNOWN';
        frameworkIntegrated: boolean;
        automatedExploitFramework?: string;
      };
      observedExploitation: {
        status: ExploitationTemporalStatus;
        inTheWildObserved: boolean;
        evidenceBasis: string;
      };
      exploitationDimensions?: {
        historicalExploitation: 'CONFIRMED' | 'UNCONFIRMED' | 'UNKNOWN';
        publicPoc: 'CONFIRMED' | 'UNCONFIRMED' | 'UNKNOWN';
        zayronXCurrentTelemetry: 'OBSERVED' | 'NOT_OBSERVED' | 'UNKNOWN';
        globalCurrentExploitation: 'CONFIRMED' | 'NOT_OBSERVED' | 'UNKNOWN';
      };
      conditionsAndPrerequisites: string[];
      relatedMalware: Array<string | {
        name: string;
        relationshipType: string;
        evidenceSource: string;
        confidence: ConfidenceLevel;
        temporalScope: string;
        description: string;
      }>;
      relatedThreatActors: Array<string | {
        name: string;
        attributionStatus: 'PRIMARY_AUTHORITY_CORROBORATED' | 'SECONDARY_CORROBORATED' | 'ANALYST_INFERENCE' | 'UNCONFIRMED' | 'UNKNOWN';
        evidenceSource: string;
        confidence: ConfidenceLevel;
      }>;
      relatedCampaigns: Array<string | {
        name: string;
        attributionStatus: 'PRIMARY_AUTHORITY_CORROBORATED' | 'SECONDARY_CORROBORATED' | 'ANALYST_INFERENCE' | 'UNCONFIRMED' | 'UNKNOWN';
        evidenceSource: string;
        confidence: ConfidenceLevel;
        temporalScope: string;
        description: string;
      }>;
      detectionOpportunities: string[];
    };
  };
}

export interface AudienceProjection {
  audience: AudienceType;
  reportId: string;
  revision: number;
  title: string;
  domain: IntelligenceDomain;
  executiveTakeaway: string;
  confidence: ConfidenceLevel;
  primaryAction: string;
  sections: Array<{
    sectionId: string;
    title: string;
    content: string | Record<string, unknown> | Array<unknown>;
  }>;
}

export interface QualityGateIssue {
  ruleId: string;
  severity: 'FATAL' | 'WARNING';
  path: string;
  message: string;
}

export interface QualityGateResult {
  passed: boolean;
  status: ReportLifecycleState;
  issues: QualityGateIssue[];
}
