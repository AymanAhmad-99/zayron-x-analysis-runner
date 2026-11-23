export const CONTROL_PLANE_LIFECYCLES = ['DRAFT', 'PILOT', 'STAGED', 'APPROVED', 'PRODUCTION', 'SUPERSEDED', 'RETIRED'] as const;
export type ControlPlaneLifecycle = typeof CONTROL_PLANE_LIFECYCLES[number];
export type CorpusScope = 'PILOT' | 'TRACK_B' | 'STAGING' | 'PRODUCTION' | 'ARCHIVE';
export type IdentityStatus = 'CANONICAL' | 'ALIAS' | 'HISTORICAL' | 'DEPRECATED' | 'VERSIONED' | 'UNRESOLVED';
export type IdentityRelation = 'ALIAS_OF' | 'RENAMED_FROM' | 'SUPERSEDES' | 'SAME_CONTENT_UNCONFIRMED';

export interface DocumentIdentity {
  documentIdentityId: string;
  documentId: string;
  title: string;
  publisher?: string;
  edition?: string;
  sourceReference: string;
  identityStatus: IdentityStatus;
  lifecycle: 'ACTIVE' | 'PROPOSED' | 'RETIRED';
}

export interface ObjectSet {
  objectSetDigest: string;
  objectCount: number;
  documentIds: string[];
  contentHashSetDigest: string;
}

export interface CorpusRevision {
  corpusRevisionId: string;
  scope: CorpusScope;
  lifecycle: ControlPlaneLifecycle;
  documentIdentityIds: string[];
  objectSet: ObjectSet;
  parserVersion: string;
  schemaVersion: string;
  validationState: 'UNKNOWN' | 'PENDING' | 'PASSED' | 'FAILED';
  approvalState: 'NOT_REQUESTED' | 'PENDING' | 'APPROVED' | 'REJECTED';
}

export interface SeedRevision {
  seedRevisionId: string;
  corpusRevisionId: string;
  objectSetDigest: string;
  payloadDigest: string;
  targetEnvironment: 'LOCAL' | 'PREVIEW' | 'STAGING' | 'PRODUCTION';
  targetD1DatabaseId: string;
  operatorIdentity: string;
  idempotencyKey: string;
  approvalState: 'PENDING' | 'APPROVED' | 'REJECTED';
  executionState: 'NOT_STARTED' | 'RUNNING' | 'SUCCEEDED' | 'FAILED' | 'QUARANTINED';
}

export interface ObjectSetEntry { objectId: string; documentId: string; contentHash: string; }
export interface ValidationResult { status: 'VALID' | 'BLOCKED' | 'INVALID'; errors: string[]; warnings: string[]; }
export interface ProductionDatasetStateInput {
  datasetStateId: string;
  d1DatabaseId: string;
  binding: string;
  environment: 'STAGING' | 'PRODUCTION';
  corpusRevisionId: string;
  seedRevisionId: string;
  objectSetDigest: string;
  rowCount: number;
  distinctDocumentCount: number;
  verificationResult: 'PENDING' | 'PASSED' | 'FAILED' | 'QUARANTINED';
}

/** Canonical input for the object-set digest. Ordering is independent of file order. */
export function canonicalObjectSetEntries(entries: ObjectSetEntry[]): string {
  return [...entries]
    .sort((a, b) => a.objectId.localeCompare(b.objectId))
    .map((e) => `${e.objectId}\t${e.documentId}\t${e.contentHash}`)
    .join('\n');
}

export async function objectSetDigest(entries: ObjectSetEntry[]): Promise<string> {
  const bytes = new TextEncoder().encode(canonicalObjectSetEntries(entries));
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

export function validateCorpusRevision(revision: CorpusRevision, entries: ObjectSetEntry[]): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const ids = entries.map((e) => e.objectId);
  const documents = new Set(entries.map((e) => e.documentId));
  if (!revision.corpusRevisionId) errors.push('Corpus revision ID is required');
  if (!revision.objectSet.objectSetDigest) errors.push('Object-set digest is required');
  if (revision.objectSet.objectCount !== entries.length) errors.push('Object count does not match object set');
  if (new Set(ids).size !== ids.length) errors.push('Duplicate object IDs detected');
  if (documents.size === 0 && entries.length > 0) errors.push('Objects require document identities');
  if (revision.scope === 'PRODUCTION' && revision.approvalState !== 'APPROVED') errors.push('Production scope requires approval');
  if (revision.lifecycle === 'PRODUCTION' && revision.scope !== 'PRODUCTION') errors.push('Production lifecycle requires production scope');
  if (revision.validationState === 'FAILED') warnings.push('Revision is already marked failed');
  return { status: errors.length ? 'INVALID' : 'VALID', errors, warnings };
}

export function validateProductionDatasetState(state: ProductionDatasetStateInput): ValidationResult {
  const errors: string[] = [];
  if (!state.datasetStateId || !state.d1DatabaseId || !state.binding) errors.push('Dataset identity is incomplete');
  if (!state.corpusRevisionId || !state.seedRevisionId || !state.objectSetDigest) errors.push('Dataset revision linkage is incomplete');
  if (state.rowCount < 0 || state.distinctDocumentCount < 0) errors.push('Dataset counts must be non-negative');
  if (state.verificationResult === 'PASSED' && (!state.corpusRevisionId || !state.seedRevisionId)) errors.push('Verified state requires revision identities');
  return { status: errors.length ? 'INVALID' : 'VALID', errors, warnings: [] };
}

export function validateSeedIdempotency(existing: SeedRevision | undefined, incoming: SeedRevision): void {
  if (!existing) return;
  if (existing.idempotencyKey === incoming.idempotencyKey && existing.payloadDigest !== incoming.payloadDigest) throw new Error('Conflicting payload for idempotency key');
  if (existing.seedRevisionId === incoming.seedRevisionId && existing.payloadDigest !== incoming.payloadDigest) throw new Error('Conflicting payload for seed revision');
  if (existing.idempotencyKey === incoming.idempotencyKey) throw new Error('Seed revision already exists for idempotency key');
}

export function validateObjectSet(objectSet: ObjectSet): void {
  if (!objectSet.objectSetDigest || !objectSet.contentHashSetDigest) throw new Error('Object-set digests are required');
  if (!Number.isInteger(objectSet.objectCount) || objectSet.objectCount < 0) throw new Error('Object count must be a non-negative integer');
  if (objectSet.documentIds.length === 0 && objectSet.objectCount > 0) throw new Error('Non-empty object set requires document identities');
}

export function validateSeedRevision(seed: SeedRevision, corpus: CorpusRevision, expectedD1DatabaseId: string): void {
  if (seed.approvalState !== 'APPROVED') throw new Error('Seed approval is required');
  if (seed.targetEnvironment !== 'PRODUCTION' && !seed.targetEnvironment) throw new Error('Seed environment is required');
  if (seed.targetD1DatabaseId !== expectedD1DatabaseId) throw new Error('Seed target D1 does not match expected database');
  if (seed.corpusRevisionId !== corpus.corpusRevisionId || seed.objectSetDigest !== corpus.objectSet.objectSetDigest) throw new Error('Seed revision does not match corpus object set');
  if (!seed.payloadDigest || !seed.idempotencyKey) throw new Error('Seed payload digest and idempotency key are required');
  if (corpus.lifecycle !== 'APPROVED' && seed.targetEnvironment === 'PRODUCTION') throw new Error('Only approved corpus revisions may target production');
}

export function canPromote(from: ControlPlaneLifecycle, to: ControlPlaneLifecycle): boolean {
  const transitions: Record<ControlPlaneLifecycle, ControlPlaneLifecycle[]> = {
    DRAFT: ['PILOT'], PILOT: ['STAGED'], STAGED: ['APPROVED'], APPROVED: ['PRODUCTION'],
    PRODUCTION: ['SUPERSEDED'], SUPERSEDED: ['RETIRED'], RETIRED: [],
  };
  return transitions[from].includes(to);
}
