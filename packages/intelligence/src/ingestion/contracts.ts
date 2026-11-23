/**
 * ZAYRON-X Ingestion Runtime Core Types & Contracts
 * Phase: Implementation Planning → Controlled Runtime Foundation
 * Strict adherence to the finalized Knowledge Ingestion Architecture.
 */

export type AuthorityTier =
  | 'TIER_0' // Primary Vendor, National Government CSIRT, Standards Body
  | 'TIER_1' // Verified Primary Security Team, Official CVE Numbering Authority
  | 'TIER_2' // Certified Threat Intelligence Research Lab, Industry ISAC
  | 'TIER_3' // Commercial Aggregator, Curated Open-Source Community
  | 'TIER_4'; // Unverified Community, Social Feed, Anonymous Forum

export type AdmiraltyReliability = 'A' | 'B' | 'C' | 'D' | 'E' | 'F';
export type AdmiraltyCredibility = '1' | '2' | '3' | '4' | '5' | '6';

export type SnapshotStatus =
  | 'NEW'
  | 'UNCHANGED'
  | 'UPDATED'
  | 'SUPERSEDED'
  | 'INVALID'
  | 'REJECTED';

export type IngestionRunStatus =
  | 'PENDING'
  | 'FETCHING'
  | 'PARSING'
  | 'NORMALIZING'
  | 'VALIDATING'
  | 'COMMITTING'
  | 'COMPLETED_SUCCESS'
  | 'COMPLETED_WITH_WARNINGS'
  | 'FAILED_ABORTED';

export type LicenseComplianceStatus =
  | 'INGEST_ALLOWED'
  | 'INGEST_METADATA_ONLY'
  | 'REFERENCE_ONLY'
  | 'LICENSE_REVIEW_REQUIRED'
  | 'REJECT';

export interface SourceSnapshot {
  snapshot_id: string; // SHA-256(raw_bytes)
  source_id: string;
  retrieved_at: string; // ISO-8601 UTC
  published_at?: string; // ISO-8601 UTC
  version?: string;
  revision?: string;
  content_hash: string;
  content_type: string;
  object_count: number;
  parser_version: string;
  raw_storage_reference: string;
  acquisition_status: SnapshotStatus;
}

export interface CandidateEvidence {
  evidence_id: string;
  source_snapshot_id: string;
  evidence_type: string;
  statement: string;
  url: string;
  observed_at?: string;
  published_at?: string;
  retrieved_at: string;
  reliability: AdmiraltyReliability;
  credibility: AdmiraltyCredibility;
  entity_scope: string[];
}

export interface CandidateEntity {
  canonical_id: string;
  entity_type: string;
  primary_name: string;
  aliases: string[];
  external_ids: Record<string, string>;
  first_seen?: string;
  last_seen?: string;
  properties: Record<string, unknown>;
}

export interface CandidateRelationship {
  relationship_id: string;
  source_entity_id: string;
  relationship_type: string;
  target_entity_id: string;
  evidence_refs: string[];
  confidence: 'HIGH' | 'MODERATE' | 'LOW';
  valid_from?: string;
}

export interface CandidateClaim {
  claim_id: string;
  domain: string;
  subject_id: string;
  predicate: string;
  object_value: string;
  statement: string;
  status: 'CONFIRMED' | 'REPORTED' | 'ASSESSED' | 'UNKNOWN';
  evidence_refs: string[];
  confidence: 'HIGH' | 'MODERATE' | 'LOW';
}

export interface RawAcquisitionResult {
  raw_bytes: Uint8Array;
  content_type: string;
  http_status: number;
  etag?: string;
  last_modified?: string;
  retrieved_at: string;
}

export interface AdapterNormalizationResult {
  entities: CandidateEntity[];
  evidence: CandidateEvidence[];
  relationships: CandidateRelationship[];
  claims: CandidateClaim[];
  raw_record_count: number;
  objects_supported?: number;
  objects_unsupported?: number;
  objects_rejected?: number;
  orphan_relationships?: number;
  warninglist_matches?: number;
}

export interface IngestionRun {
  run_id: string;
  source_id: string;
  trigger_type: string;
  started_at: string;
  completed_at?: string;
  duration_ms?: number;
  source_snapshot_id?: string;
  status: IngestionRunStatus;
  records_seen: number;
  records_created: number;
  records_updated: number;
  records_rejected: number;
  evidence_extracted: number;
  claims_constructed: number;
  contradictions_raised: number;
  errors: Array<{ stage: string; error_code: string; message: string }>;
  parser_version: string;
  normalizer_version: string;
}

export interface IngestionAdapter<TRaw = any> {
  readonly sourceId: string;
  readonly authorityTier: AuthorityTier;
  readonly defaultReliability: AdmiraltyReliability;
  readonly parserVersion: string;
  evaluateLicense(): LicenseComplianceStatus;
  parse(rawBytes: Uint8Array): TRaw;
  normalize(parsed: TRaw, snapshot: SourceSnapshot): Promise<AdapterNormalizationResult>;
}
