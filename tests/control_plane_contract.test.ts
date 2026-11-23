import { describe, expect, it } from 'vitest';
import { canPromote, objectSetDigest, validateCorpusRevision, validateObjectSet, validateProductionDatasetState, validateSeedIdempotency, validateSeedRevision, type CorpusRevision, type ObjectSet, type SeedRevision } from '../packages/intelligence/src/control_plane/contract';

const objectSet: ObjectSet = { objectSetDigest: 'objects:pilot', contentHashSetDigest: 'hashes:pilot', objectCount: 371, documentIds: ['doc-01-heuer-psychology', 'doc-02-nist-sp-800-150', 'doc-03-nist-sp-800-150'] };
const corpus: CorpusRevision = { corpusRevisionId: 'corpus:pilot:unknown', scope: 'PILOT', lifecycle: 'APPROVED', documentIdentityIds: ['doc-02', 'doc-03'], objectSet, parserVersion: 'v3', schemaVersion: 'v3', validationState: 'PASSED', approvalState: 'APPROVED' };
const seed: SeedRevision = { seedRevisionId: 'seed:test', corpusRevisionId: corpus.corpusRevisionId, objectSetDigest: objectSet.objectSetDigest, payloadDigest: 'payload:test', targetEnvironment: 'PRODUCTION', targetD1DatabaseId: '91ed8f95-95ad-4451-bb18-e0d1dbadbe53', operatorIdentity: 'test', idempotencyKey: 'seed:test:once', approvalState: 'APPROVED', executionState: 'NOT_STARTED' };

describe('V3 control-plane contract', () => {
  it('represents unresolved doc-02/doc-03 identities without merging them', () => expect(new Set(corpus.documentIdentityIds).size).toBe(2));
  it('validates deterministic object-set requirements', () => expect(() => validateObjectSet(objectSet)).not.toThrow());
  it('rejects wrong targets and unapproved seeds', () => {
    expect(() => validateSeedRevision({ ...seed, targetD1DatabaseId: 'wrong' }, corpus, seed.targetD1DatabaseId)).toThrow('target D1');
    expect(() => validateSeedRevision({ ...seed, approvalState: 'PENDING' }, corpus, seed.targetD1DatabaseId)).toThrow('approval');
  });
  it('enforces promotion order', () => { expect(canPromote('PILOT', 'STAGED')).toBe(true); expect(canPromote('PILOT', 'PRODUCTION')).toBe(false); });
  it('produces an order-independent deterministic object-set digest', async () => {
    const entries = [{ objectId: 'b', documentId: 'doc-03', contentHash: 'h2' }, { objectId: 'a', documentId: 'doc-02', contentHash: 'h1' }];
    expect(await objectSetDigest(entries)).toBe(await objectSetDigest([...entries].reverse()));
  });
  it('blocks duplicate IDs and conflicting idempotency payloads', () => {
    expect(validateCorpusRevision({ ...corpus, objectSet: { ...objectSet, objectCount: 2 } }, [
      { objectId: 'same', documentId: 'doc-02', contentHash: 'a' }, { objectId: 'same', documentId: 'doc-03', contentHash: 'b' },
    ]).status).toBe('INVALID');
    expect(() => validateSeedIdempotency(seed, { ...seed, payloadDigest: 'different' })).toThrow('Conflicting payload');
  });
  it('validates dataset attestation linkage', () => {
    expect(validateProductionDatasetState({ datasetStateId: 'd', d1DatabaseId: 'db', binding: 'SOURCE_STATE', environment: 'PRODUCTION', corpusRevisionId: 'c', seedRevisionId: 's', objectSetDigest: 'o', rowCount: 371, distinctDocumentCount: 3, verificationResult: 'PENDING' }).status).toBe('VALID');
  });
});
