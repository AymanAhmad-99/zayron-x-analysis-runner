/**
 * ZAYRON-X Domain-Agnostic Intelligence Core: Types & Contracts
 * 
 * Supports: vulnerability, malware, ransomware, exploit, threat_actor, campaign, incident, infrastructure, ioc, tool, technique.
 * Zero hardcoded product/vendor/CVE blocklists.
 */

export type IntelligenceDomain = 
  | 'vulnerability'
  | 'malware'
  | 'ransomware'
  | 'exploit'
  | 'threat_actor'
  | 'campaign'
  | 'incident'
  | 'infrastructure'
  | 'ioc'
  | 'tool'
  | 'technique';

export type ClaimVerificationStatus = 
  | 'SUPPORTED'
  | 'PARTIALLY_SUPPORTED'
  | 'UNSUPPORTED'
  | 'CONTRADICTED'
  | 'AMBIGUOUS'
  | 'UNKNOWN';

export type AuthorityTier = 
  | 'PRIMARY_VENDOR'
  | 'GOVERNMENT_REGULATOR'
  | 'AUTHORITATIVE_CATALOG'
  | 'FIRST_PARTY_TELEMETRY'
  | 'TRUSTED_RESEARCH'
  | 'SECONDARY_MEDIA'
  | 'UNVERIFIED_COMMUNITY';

export type CanonicalFactType =
  | 'IDENTITY'
  | 'CLASSIFICATION'
  | 'SEVERITY'
  | 'METRIC'
  | 'AFFECTED_TARGET'
  | 'FIX_TARGET'
  | 'EXPLOITATION_STATUS'
  | 'ATTRIBUTION'
  | 'TEMPORAL'
  | 'CAPABILITY'
  | 'INFRASTRUCTURE'
  | 'INDICATOR';

export type RelationshipType =
  | 'AFFECTS'
  | 'EXPLOITS'
  | 'USES'
  | 'DEPLOYS'
  | 'TARGETS'
  | 'DELIVERS'
  | 'HOSTED_ON'
  | 'COMMUNICATES_WITH'
  | 'ATTRIBUTED_TO'
  | 'OBSERVED_IN'
  | 'MITIGATED_BY'
  | 'RELATED_TO'
  | 'DROPS'
  | 'CHAINED_WITH'
  | 'USED_AFTER'
  | 'USED_BEFORE'
  | 'SAME_PRODUCT'
  | 'SAME_CAMPAIGN'
  | 'SAME_ADVISORY';

export interface TemporalScope {
  observedAt?: string;
  publishedAt?: string;
  validFrom?: string;
  validUntil?: string;
  assessmentTime: string;
}

export interface SourceDefinition {
  sourceId: string;
  name: string;
  domain?: string;
  authorityTier: AuthorityTier;
  supportedDomains: IntelligenceDomain[];
  supportedFactTypes: CanonicalFactType[];
  trustScore: number;
  isAuthoritative: boolean;
  independenceGroup?: string;
  admiraltyReliability?: 'A' | 'B' | 'C' | 'D' | 'E' | 'F'; // Admiralty source reliability
}

export interface CanonicalFact<T = unknown> {
  factId: string;
  factType: CanonicalFactType;
  name: string;
  value: T;
  sourceId: string;
  isImmutable: boolean;
  temporal?: TemporalScope;
}

export interface CanonicalRecord {
  objectId: string;
  domain: IntelligenceDomain;
  primaryIdentifier: string;
  aliases: string[];
  canonicalFacts: Record<string, CanonicalFact>;
  metadata?: Record<string, unknown>;
}

export interface CoreEvidenceItem {
  evidenceId: string;
  objectId: string;
  sourceId: string;
  sourceType: AuthorityTier;
  url: string;
  statement: string;
  temporal?: TemporalScope;
  provenanceHash?: string;
}

export interface EvidenceBundle {
  objectId: string;
  domain: IntelligenceDomain;
  items: CoreEvidenceItem[];
  temporalWindow?: { start: string; end: string };
}

export interface CoreClaim {
  claimId: string;
  domain: IntelligenceDomain;
  subject: string;
  predicate: string;
  objectValue: string;
  text: string;
  status: 'CONFIRMED' | 'ASSESSED' | 'UNKNOWN' | 'DISALLOWED';
  evidenceRefs: string[];
  confidenceScore?: number;
  temporal?: TemporalScope;
}

export interface CoreRelationship {
  relationshipId: string;
  type: RelationshipType;
  sourceObjectId: string;
  targetObjectId: string;
  evidenceRefs: string[];
  confidence: number;
}

export interface AnalysisProfileField {
  name: string;
  factType: CanonicalFactType;
  required: boolean;
  allowInference: boolean;
  defaultFallback?: 'UNKNOWN' | 'NOT_ESTABLISHED' | 'NOT_AVAILABLE_IN_CURRENT_EVIDENCE';
}

export interface AnalysisProfile {
  domain: IntelligenceDomain;
  fields: AnalysisProfileField[];
  allowedRelationships: RelationshipType[];
  criticalFacts: string[];
}

export interface CoreValidationResult {
  valid: boolean;
  supportedClaims: CoreClaim[];
  partiallySupportedClaims: Array<{ claim: CoreClaim; notes: string }>;
  unsupportedClaims: Array<{ claim: CoreClaim; reason: string }>;
  contradictedClaims: Array<{ claim: CoreClaim; conflictWith: string }>;
  errors: string[];
  warnings: string[];
}

export interface ValidatedIntelligenceObject {
  objectId: string;
  domain: IntelligenceDomain;
  canonicalRecord: CanonicalRecord;
  evidenceBundle: EvidenceBundle;
  validatedClaims: CoreClaim[];
  relationships: CoreRelationship[];
  executiveSummary: string;
  confidenceScore: number;
  temporalScope: TemporalScope;
  unknowns: string[];
  limitations: string[];
}
