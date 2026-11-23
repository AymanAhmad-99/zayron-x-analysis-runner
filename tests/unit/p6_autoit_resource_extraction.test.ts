/**
 * Phase 6 — deterministic AutoIt resource extraction (focused tests).
 *
 * Locks the phase-6 contract end to end:
 *   (1) the container's extraction record is NEVER trusted: parent digest,
 *       extent bounds, payload digest, "the payload IS the parent's bytes at the
 *       extent" and magic placement are all recomputed by the layer that holds
 *       the bytes;
 *   (2) a verified extent is published as a derived artifact ONLY when it is
 *       exactly the extent this run's own canonical COMPILED_AUTOIT_SCRIPT
 *       embedded object reports, with its observation + evidence lineage;
 *   (3) extraction is not decoding: configuration stays a CANDIDATE (blocker
 *       upgraded to AWAITING_DETERMINISTIC_DECODER), never values, never
 *       behaviors, never a family, never infrastructure;
 *   (4) the derived artifact id is content-addressed (`art_<sha256>`): identical
 *       bytes are one artifact, different bytes are a different artifact, and
 *       the parent identity is never reused;
 *   (5) the write path and the stored-report read gate share ONE provenance
 *       validator, so a stored row cannot carry provenance the write path would
 *       have rejected.
 */

import { describe, it, expect } from 'bun:test';

import type { Artifact } from '../../packages/intelligence/src/malware/canonical/artifact';
import type { Observation } from '../../packages/intelligence/src/malware/canonical/observation';
import type { EvidenceRef } from '../../packages/intelligence/src/malware/canonical/provenance';
import type { EmbeddedObjectSection } from '../../packages/intelligence/src/malware/canonical/staticEvidenceProjection';
import { EMBEDDED_OBJECT_TYPE_BY_SIGNATURE } from '../../packages/intelligence/src/malware/canonical/staticEvidenceProjection';
import {
  AUTOIT_EXTRACTION_METHOD,
  AUTOIT_EXTRACTION_LAYER_VERSION,
  AUTOIT_RESOURCE_MAGIC,
  bindExtractionToCanonicalEvidence,
  validateDerivedArtifactProvenance,
  verifyContainerExtraction,
  type ContainerExtractionRecord,
} from '../../packages/intelligence/src/malware/canonical/autoItResourceExtractor';
import {
  deriveStaticConfigurationEvidence,
  projectStaticConfigurationAssessment,
  publishStaticConfigurationItem,
  validateConfigurationItemProjection,
} from '../../packages/intelligence/src/malware/canonical/staticConfigurationLayer';
import { materializeCanonicalReport } from '../../packages/intelligence/src/malware/canonical/reportMaterialization';
import { validateStoredMalwareReport } from '../../packages/intelligence/src/malware/canonical/storedReportValidation';
import { CURRENT_MALWARE_REPORT_CONTRACT_VERSION } from '../../packages/intelligence/src/malware/canonical/reportContract';

const RUN_ID = 'ar-p6-test-0001';
const OTHER_RUN_ID = 'ar-p6-test-0002';
const ARTIFACT_ID = 'art_gmf_p6test0000000001';
const OTHER_ARTIFACT_ID = 'art_gmf_p6test0000000002';
const AT = '2026-09-23T00:00:00.000Z';
const EVIDENCE_ID = 'ev_static_p6_extract';
const OBSERVATION_ID = 'obs_static_p6_embedded_objects';

const MAGIC_BYTES = new Uint8Array([...AUTOIT_RESOURCE_MAGIC].map((c) => c.charCodeAt(0)));

/** Synthetic extent used by the byte-level and binding cases. */
const EXTENT_OFFSET = 0x400;
const EXTENT_SIZE = 96;

function sampleBytes(): Uint8Array {
  const bytes = new Uint8Array(0x800);
  bytes.fill(0x41);
  bytes.set(MAGIC_BYTES, EXTENT_OFFSET);
  for (let i = EXTENT_OFFSET + MAGIC_BYTES.length; i < EXTENT_OFFSET + EXTENT_SIZE; i += 1) bytes[i] = 0x42;
  return bytes;
}

function extentSlice(bytes: Uint8Array, offset = EXTENT_OFFSET, size = EXTENT_SIZE): Uint8Array {
  return bytes.slice(offset, offset + size);
}

async function sha256Hex(bytes: Uint8Array): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', bytes as unknown as ArrayBuffer);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

function b64(bytes: Uint8Array): string {
  return Buffer.from(bytes).toString('base64');
}

/**
 * A REAL PE32 image whose .rsrc section holds one RCDATA resource containing
 * `payload` — so the canonical structural scan locates the magic inside an
 * actual resource extent (no synthetic evidence anywhere in part 3).
 */
function buildPeWithAutoItResource(payload: Uint8Array): { bytes: Uint8Array; extent_offset: number; extent_size: number } {
  const SEC_RVA = 0x2000;
  const SEC_PTR = 0x400;
  const blobSize = 16 + 8 + 24 + 24 + 16 + payload.length;
  const bytes = new Uint8Array(SEC_PTR + blobSize);
  const dv = new DataView(bytes.buffer);
  bytes[0] = 0x4d;
  bytes[1] = 0x5a;
  dv.setUint32(0x3c, 0x40, true);
  const pe = 0x40;
  bytes[pe] = 0x50;
  bytes[pe + 1] = 0x45;
  dv.setUint16(pe + 4, 0x14c, true);
  dv.setUint16(pe + 6, 2, true);
  dv.setUint16(pe + 20, 224, true);
  const opt = pe + 24;
  dv.setUint16(opt, 0x10b, true);
  const dd = opt + 96;
  dv.setUint32(dd + 16, SEC_RVA, true);
  dv.setUint32(dd + 20, blobSize, true);
  const st = opt + 224;
  const textName = '.text';
  for (let i = 0; i < textName.length; i += 1) bytes[st + i] = textName.charCodeAt(i);
  dv.setUint32(st + 8, 0x200, true);
  dv.setUint32(st + 12, 0x1000, true);
  dv.setUint32(st + 16, 0x200, true);
  dv.setUint32(st + 20, 0x200, true);
  const rs = st + 40;
  const rsrcName = '.rsrc';
  for (let i = 0; i < rsrcName.length; i += 1) bytes[rs + i] = rsrcName.charCodeAt(i);
  dv.setUint32(rs + 8, blobSize, true);
  dv.setUint32(rs + 12, SEC_RVA, true);
  dv.setUint32(rs + 16, blobSize, true);
  dv.setUint32(rs + 20, SEC_PTR, true);
  // resource directory: root → RCDATA → id 1 → language 1033 → data entry → payload
  const b = SEC_PTR;
  const l1Entry = 16;
  const l1Dir = 24;
  const l2Dir = 48;
  const dataEntry = 72;
  const payloadOff = 88;
  dv.setUint16(b + 14, 1, true);
  dv.setUint32(b + l1Entry, 10, true);
  dv.setUint32(b + l1Entry + 4, 0x80000000 | l1Dir, true);
  dv.setUint16(b + l1Dir + 14, 1, true);
  dv.setUint32(b + l1Dir + 16, 1, true);
  dv.setUint32(b + l1Dir + 20, 0x80000000 | l2Dir, true);
  dv.setUint16(b + l2Dir + 14, 1, true);
  dv.setUint32(b + l2Dir + 16, 1033, true);
  dv.setUint32(b + l2Dir + 20, dataEntry, true);
  dv.setUint32(b + dataEntry, SEC_RVA + payloadOff, true);
  dv.setUint32(b + dataEntry + 4, payload.length, true);
  bytes.set(payload, b + payloadOff);
  return { bytes, extent_offset: b + payloadOff, extent_size: payload.length };
}

function makeArtifact(sha: string): Artifact {
  return {
    artifact_id: ARTIFACT_ID,
    identity_key: `sha256:${sha}`,
    format_class: 'PE',
    file_names: ['p6_holdout.bin'],
    hashes: { sha256: sha },
    mime_type: 'application/octet-stream',
    format_attributes: {},
    provenance: { evidence_refs: [], source_ids: [], authority_tier: 'TIER_1', snapshot_ids: [], derived_at: AT },
  } as unknown as Artifact;
}

function evidenceRef(): EvidenceRef {
  return {
    evidence_id: EVIDENCE_ID,
    source_id: 'src_static_analyzer',
    source_snapshot_id: RUN_ID,
    kind: 'STATIC',
    authority_tier: 'TIER_1',
    reliability: 'A',
    credibility: '2',
    observed_at: AT,
    retrieved_at: AT,
  } as EvidenceRef;
}

function embeddedObservation(
  input: { run_id?: string; artifact_id?: string; host_offset?: number; size_bytes?: number; magic_offset?: number } = {},
): Observation {
  const runId = input.run_id ?? RUN_ID;
  const artifactId = input.artifact_id ?? ARTIFACT_ID;
  const ref = evidenceRef();
  return {
    observation_id: OBSERVATION_ID,
    analysis_run_id: runId,
    artifact_id: artifactId,
    source: 'STATIC_ANALYSIS',
    observation_type: 'embedded_objects',
    attributes: {
      analysis_status: 'OBSERVED',
      embedded_object_count: 1,
      embedded_object_0_signature: 'compiled_autoit_script',
      embedded_object_0_offset: input.magic_offset ?? EXTENT_OFFSET,
      embedded_object_0_size: input.size_bytes ?? EXTENT_SIZE,
      embedded_object_0_host_offset: input.host_offset ?? EXTENT_OFFSET,
      embedded_object_0_section: '.rsrc',
      embedded_object_0_resource_type: 'RCDATA',
      embedded_object_0_entropy: 7.9,
      resource_count: 26,
      byte_scan_capped: false,
    },
    observed_at: AT,
    evidence_refs: [ref],
    provenance: {
      evidence_refs: [ref],
      source_ids: [ref.source_id],
      authority_tier: 'TIER_1',
      snapshot_ids: [runId],
      derived_at: AT,
    },
  } as unknown as Observation;
}

function embeddedSection(
  observation: Observation,
  over: { evidence_id?: string; run_id?: string; artifact_id?: string; host_offset?: number; size_bytes?: number; magic_offset?: number } = {},
): EmbeddedObjectSection {
  const a = observation.attributes;
  const signature = String(a.embedded_object_0_signature);
  return {
    projection_version: 'test',
    observation_id: observation.observation_id,
    observation_status: 'OBSERVED',
    count: 1,
    objects: [
      {
        object_type: EMBEDDED_OBJECT_TYPE_BY_SIGNATURE[signature],
        signature,
        offset: over.magic_offset ?? Number(a.embedded_object_0_offset),
        host_offset: over.host_offset ?? Number(a.embedded_object_0_host_offset),
        size_bytes: over.size_bytes ?? Number(a.embedded_object_0_size),
        host_section: '.rsrc',
        host_resource_type: 'RCDATA',
        entropy: 7.9,
        digest: { algorithm: 'sha256' as const, value: 'a'.repeat(64) },
        parent_artifact_id: over.artifact_id ?? observation.artifact_id,
        analysis_run_id: over.run_id ?? observation.analysis_run_id,
        evidence_id: over.evidence_id ?? observation.evidence_refs[0].evidence_id,
        observation_id: observation.observation_id,
        source_tool: 'STATIC_ANALYSIS',
        tool_version: '1.0.0-staticanalyzer-canonical',
        extracted: false as const,
        child_artifact_id: null,
      },
    ],
    coverage: {
      scanned_bytes: 0x800,
      byte_scan_capped: false,
      overlay_bytes: 0,
      resource_count: 26,
      resource_total_bytes: 0x600,
      resource_inventory_capped: false,
    },
    source: {
      source_tool: 'STATIC_ANALYSIS',
      tool_version: '1.0.0-staticanalyzer-canonical',
      evidence_ids: [over.evidence_id ?? EVIDENCE_ID],
      artifact_id: over.artifact_id ?? observation.artifact_id,
      analysis_run_id: over.run_id ?? observation.analysis_run_id,
    },
    epistemic_status: 'STATIC_CANDIDATE',
  } as unknown as EmbeddedObjectSection;
}

/** The plane's record for `bytes`' extent, with every claimed value filled in. */
async function recordFor(
  bytes: Uint8Array,
  offset = EXTENT_OFFSET,
  size = EXTENT_SIZE,
  over: Partial<ContainerExtractionRecord> = {},
): Promise<ContainerExtractionRecord> {
  const payload = extentSlice(bytes, offset, size);
  return {
    status: 'EXTRACTED',
    error_class: null,
    note: null,
    extractor_version: AUTOIT_EXTRACTION_LAYER_VERSION,
    extraction_method: AUTOIT_EXTRACTION_METHOD,
    parent_sha256: await sha256Hex(bytes),
    host_offset: offset,
    size_bytes: size,
    resource_type: 'RCDATA',
    resource_id: 1,
    magic_offset: offset,
    output_sha256: await sha256Hex(payload),
    output_size_bytes: size,
    output_b64: b64(payload),
    duration_ms: 3,
    ...over,
  };
}

async function verify(bytes: Uint8Array, offset = EXTENT_OFFSET, size = EXTENT_SIZE, over: Partial<ContainerExtractionRecord> = {}) {
  const sha = await sha256Hex(bytes);
  return verifyContainerExtraction({
    artifact: makeArtifact(sha),
    rawBytes: bytes,
    analysis_run_id: RUN_ID,
    record: await recordFor(bytes, offset, size, over),
  });
}

async function bindValid(bytes: Uint8Array) {
  const verified = await verify(bytes);
  if (!verified.ok || verified.verification.kind !== 'EXTRACTED') throw new Error('fixture not verified');
  return bindExtractionToCanonicalEvidence({
    artifact: makeArtifact(await sha256Hex(bytes)),
    analysis_run_id: RUN_ID,
    embedded_objects: embeddedSection(embeddedObservation()),
    verification: verified.verification,
  });
}

// ── 1–8: the byte level ─────────────────────────────────────────────

describe('phase 6 — byte-level extraction verification', () => {
  it('1. a well-formed extraction record is verified against the parent bytes', async () => {
    const bytes = sampleBytes();
    const result = await verify(bytes);
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error(result.detail);
    expect(result.verification.kind).toBe('EXTRACTED');
    if (result.verification.kind !== 'EXTRACTED') throw new Error('not extracted');
    const verified = result.verification.verified;
    expect(verified.host_offset).toBe(EXTENT_OFFSET);
    expect(verified.size_bytes).toBe(EXTENT_SIZE);
    expect(verified.resource_type).toBe('RCDATA');
    expect(verified.derived_sha256).toBe(await sha256Hex(extentSlice(bytes)));
    expect(verified.parent_sha256).toBe(await sha256Hex(bytes));
    expect(verified.extraction_method).toBe(AUTOIT_EXTRACTION_METHOD);
    expect(verified.extractor_version).toBe(AUTOIT_EXTRACTION_LAYER_VERSION);
  });

  it('2. an extracted payload that is not the parent bytes at the extent is refused', async () => {
    const bytes = sampleBytes();
    const tampered = new Uint8Array(extentSlice(bytes));
    tampered[16] = 0x43;
    const notParent = await verify(bytes, EXTENT_OFFSET, EXTENT_SIZE, {
      output_b64: b64(tampered),
      output_sha256: await sha256Hex(tampered),
    });
    expect(notParent.ok).toBe(false);
    if (notParent.ok) throw new Error('expected failure');
    expect(notParent.code).toBe('PAYLOAD_NOT_PARENT_BYTES');

    const wrongDigest = await verify(bytes, EXTENT_OFFSET, EXTENT_SIZE, { output_sha256: 'b'.repeat(64) });
    expect(wrongDigest.ok).toBe(false);
    if (wrongDigest.ok) throw new Error('expected failure');
    expect(wrongDigest.code).toBe('PAYLOAD_DIGEST_MISMATCH');

    const wrongSize = await verify(bytes, EXTENT_OFFSET, EXTENT_SIZE, { output_size_bytes: EXTENT_SIZE - 1 });
    expect(wrongSize.ok).toBe(false);
    if (wrongSize.ok) throw new Error('expected failure');
    expect(wrongSize.code).toBe('PAYLOAD_SIZE_MISMATCH');
  });

  it('3. the declared parent sha256 is re-measured, never trusted', async () => {
    const bytes = sampleBytes();
    const result = await verify(bytes, EXTENT_OFFSET, EXTENT_SIZE, { parent_sha256: 'c'.repeat(64) });
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error('expected failure');
    expect(result.code).toBe('PARENT_SHA256_MISMATCH');
  });

  it('4. an extent that leaves the file is refused, never clamped', async () => {
    const bytes = sampleBytes();
    const result = await verify(bytes, bytes.length - 8, 64);
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error('expected failure');
    expect(result.code).toBe('EXTENT_OUT_OF_BOUNDS');
  });

  it('5. the AU3!EA06 magic must sit where the record claims', async () => {
    const bytes = sampleBytes();
    const moved = await verify(bytes, EXTENT_OFFSET, EXTENT_SIZE, { magic_offset: EXTENT_OFFSET + 8 });
    expect(moved.ok).toBe(false);
    if (moved.ok) throw new Error('expected failure');
    expect(moved.code).toBe('MAGIC_NOT_PRESENT_IN_EXTENT');

    const outside = await verify(bytes, EXTENT_OFFSET, EXTENT_SIZE, { magic_offset: EXTENT_OFFSET + EXTENT_SIZE });
    expect(outside.ok).toBe(false);
    if (outside.ok) throw new Error('expected failure');
    expect(outside.code).toBe('EXTENT_BOUND_INDETERMINATE');
  });

  it('6. identical bytes yield one derived digest (byte determinism)', async () => {
    const bytes = sampleBytes();
    const digests: string[] = [];
    for (let i = 0; i < 3; i += 1) {
      const result = await verify(bytes);
      if (!result.ok || result.verification.kind !== 'EXTRACTED') throw new Error('not verified');
      digests.push(result.verification.verified.derived_sha256);
    }
    expect(new Set(digests).size).toBe(1);
    expect(digests[0]).toBe(await sha256Hex(extentSlice(bytes)));
  });

  it('7. the derived artifact id is content-addressed and stable', async () => {
    const bytes = sampleBytes();
    const sha = await sha256Hex(bytes);
    const first = (await bindValid(bytes)).derived_artifact!;
    const second = (await bindValid(bytes)).derived_artifact!;
    expect(first.artifact_id).toBe(second.artifact_id);
    expect(first.artifact_id).toBe(`art_${first.derived_sha256}`);
    expect(
      validateDerivedArtifactProvenance(first, { artifact_id: ARTIFACT_ID, sha256: sha, analysis_run_id: RUN_ID }),
    ).toEqual([]);

    // Different resource bytes ⇒ a different derived identity.
    const otherBytes = sampleBytes();
    otherBytes[EXTENT_OFFSET + 32] = 0x44;
    const other = (await bindValid(otherBytes)).derived_artifact!;
    expect(other.artifact_id).not.toBe(first.artifact_id);
    expect(other.derived_sha256).not.toBe(first.derived_sha256);
    expect(other.derived_sha256).not.toBe(sha);
  });

  it('8. the parent artifact is unchanged and its identity is never reused', async () => {
    const bytes = sampleBytes();
    const before = Uint8Array.from(bytes);
    const parentSha = await sha256Hex(bytes);
    const derived = (await bindValid(bytes)).derived_artifact!;
    expect(bytes).toEqual(before);
    expect(await sha256Hex(bytes)).toBe(parentSha);
    expect(derived.parent_artifact_id).toBe(ARTIFACT_ID);
    expect(derived.parent_sha256).toBe(parentSha);
    expect(derived.derived_sha256).not.toBe(parentSha);
    expect(derived.file_size_bytes).toBe(EXTENT_SIZE);
    // Extraction is not decoding, and no second evidence store is opened.
    expect(derived.decoded_configuration).toBeNull();
    expect(derived.payload_retention).toBe('RUN_SCOPE_ONLY');
    expect(
      validateDerivedArtifactProvenance(derived, { artifact_id: ARTIFACT_ID, sha256: parentSha, analysis_run_id: RUN_ID }),
    ).toEqual([]);
  });
});

// ── 9–13, 16: evidence binding, isolation and non-promotion ─────────

describe('phase 6 — evidence binding, isolation and non-promotion', () => {
  it('9. a foreign analysis run cannot supply the canonical evidence', async () => {
    const bytes = sampleBytes();
    const verified = await verify(bytes);
    if (!verified.ok || verified.verification.kind !== 'EXTRACTED') throw new Error('not verified');
    const outcome = bindExtractionToCanonicalEvidence({
      artifact: makeArtifact(await sha256Hex(bytes)),
      analysis_run_id: RUN_ID,
      embedded_objects: embeddedSection(embeddedObservation({ run_id: OTHER_RUN_ID }), { run_id: OTHER_RUN_ID }),
      verification: verified.verification,
    });
    expect(outcome.status).toBe('ERROR');
    expect(outcome.derived_artifact).toBeNull();
    expect(outcome.errors).toContain('derived_artifact_without_canonical_evidence');
  });

  it('10. a foreign parent artifact cannot supply or receive the evidence', async () => {
    const bytes = sampleBytes();
    const sha = await sha256Hex(bytes);
    const verified = await verify(bytes);
    if (!verified.ok || verified.verification.kind !== 'EXTRACTED') throw new Error('not verified');
    const outcome = bindExtractionToCanonicalEvidence({
      artifact: makeArtifact(sha),
      analysis_run_id: RUN_ID,
      embedded_objects: embeddedSection(embeddedObservation({ artifact_id: OTHER_ARTIFACT_ID }), { artifact_id: OTHER_ARTIFACT_ID }),
      verification: verified.verification,
    });
    expect(outcome.status).toBe('ERROR');
    expect(outcome.derived_artifact).toBeNull();

    const valid = (await bindValid(bytes)).derived_artifact!;
    expect(
      validateDerivedArtifactProvenance({ ...valid, parent_artifact_id: OTHER_ARTIFACT_ID }, {
        artifact_id: ARTIFACT_ID,
        sha256: sha,
        analysis_run_id: RUN_ID,
      }),
    ).toContain(`derived_artifact:foreign_parent_artifact:${valid.artifact_id}`);
    expect(
      validateDerivedArtifactProvenance({ ...valid, parent_sha256: 'e'.repeat(64) }, {
        artifact_id: ARTIFACT_ID,
        sha256: sha,
        analysis_run_id: RUN_ID,
      }),
    ).toContain(`derived_artifact:foreign_parent_sha256:${valid.artifact_id}`);
    expect(
      validateDerivedArtifactProvenance({ ...valid, analysis_run_id: OTHER_RUN_ID }, {
        artifact_id: ARTIFACT_ID,
        sha256: sha,
        analysis_run_id: RUN_ID,
      }),
    ).toContain(`derived_artifact:foreign_analysis_run:${valid.artifact_id}`);
  });

  it('10b. several magic hits inside ONE extent are one container, two extents are refused', async () => {
    const bytes = sampleBytes();
    const verified = await verify(bytes);
    if (!verified.ok || verified.verification.kind !== 'EXTRACTED') throw new Error('not verified');
    const section = embeddedSection(embeddedObservation());
    // A REAL canonical shape (this specimen has it): the same magic appears
    // twice inside one RCDATA extent. Both hits are ONE container — the derived
    // artifact is published, and both hits are its evidence lineage.
    const twoHits: EmbeddedObjectSection = {
      ...section,
      count: 2,
      objects: [
        section.objects[0],
        { ...section.objects[0], offset: EXTENT_OFFSET + 48 },
      ],
    };
    const bound = bindExtractionToCanonicalEvidence({
      artifact: makeArtifact(await sha256Hex(bytes)),
      analysis_run_id: RUN_ID,
      embedded_objects: twoHits,
      verification: verified.verification,
    });
    expect(bound.status).toBe('EXTRACTED');
    expect(bound.derived_artifact!.host_extent).toEqual({ host_offset: EXTENT_OFFSET, size_bytes: EXTENT_SIZE });
    expect(bound.derived_artifact!.magic_offset).toBe(EXTENT_OFFSET);
    expect(bound.derived_artifact!.evidence_ids).toEqual([EVIDENCE_ID]);

    // The plane reports the FIRST magic of the extent: a canonical evidence set
    // whose first magic is elsewhere is a boundary disagreement, never merged.
    const shifted: EmbeddedObjectSection = {
      ...section,
      count: 1,
      objects: [{ ...section.objects[0], offset: EXTENT_OFFSET + 48 }],
    };
    const mismatch = bindExtractionToCanonicalEvidence({
      artifact: makeArtifact(await sha256Hex(bytes)),
      analysis_run_id: RUN_ID,
      embedded_objects: shifted,
      verification: verified.verification,
    });
    expect(mismatch.status).toBe('ERROR');
    expect(mismatch.derived_artifact).toBeNull();
    expect(mismatch.reason).toContain('canonical evidence does not support this extraction');
  });

  it('11. missing canonical evidence lineage blocks publication', async () => {
    const bytes = sampleBytes();
    const verified = await verify(bytes);
    if (!verified.ok || verified.verification.kind !== 'EXTRACTED') throw new Error('not verified');
    const outcome = bindExtractionToCanonicalEvidence({
      artifact: makeArtifact(await sha256Hex(bytes)),
      analysis_run_id: RUN_ID,
      embedded_objects: embeddedSection(embeddedObservation(), { evidence_id: '' }),
      verification: verified.verification,
    });
    expect(outcome.status).toBe('ERROR');
    expect(outcome.errors).toContain('evidence_lineage_missing');

    const valid = (await bindValid(bytes)).derived_artifact!;
    expect(validateDerivedArtifactProvenance({ ...valid, evidence_ids: [] }, {})).toContain(
      `derived_artifact:evidence_lineage_missing:${valid.artifact_id}`,
    );
    expect(validateDerivedArtifactProvenance({ ...valid, observation_id: '' }, {})).toContain(
      `derived_artifact:observation_lineage_missing:${valid.artifact_id}`,
    );
  });

  it('12, 13, 16. extraction keeps configuration a CANDIDATE and can never decode it', async () => {
    const bytes = sampleBytes();
    const bound = await bindValid(bytes);
    const observation = embeddedObservation();
    const section = embeddedSection(observation);
    const withoutExtraction = deriveStaticConfigurationEvidence({
      artifact_id: ARTIFACT_ID,
      analysis_run_id: RUN_ID,
      embedded_objects: section,
      observations: [observation],
      derived_at: AT,
    });
    const withExtraction = deriveStaticConfigurationEvidence({
      artifact_id: ARTIFACT_ID,
      analysis_run_id: RUN_ID,
      embedded_objects: section,
      observations: [observation],
      derived_artifact: bound.derived_artifact,
      derived_at: AT,
    });

    // 12. the blocker states exactly what is missing — decoder UNAVAILABLE.
    expect(withoutExtraction.items[0].undecoded_reason).toBe('UNDECODED_STATIC_BLOB');
    expect(withoutExtraction.items[0].derived_artifact_id).toBeNull();
    expect(withExtraction.items[0].undecoded_reason).toBe('AWAITING_DETERMINISTIC_DECODER');
    expect(withExtraction.items[0].derived_artifact_id).toBe(bound.derived_artifact!.artifact_id);
    expect(withExtraction.items[0].extracted_payload_sha256).toBe(bound.derived_artifact!.derived_sha256);
    expect(withExtraction.outcome_reason).toContain('NO deterministic decoder');

    // 13. no decoder ran ⇒ no decoded state, no value, no field.
    expect(withExtraction.outcome).toBe('CONFIGURATION_CANDIDATE');
    expect(withExtraction.items[0].epistemic_status).toBe('STATIC_CANDIDATE');
    expect(withExtraction.items[0].value).toBeNull();
    expect(withExtraction.items[0].raw_value).toBeNull();
    expect(withExtraction.items[0].normalized_value).toBeNull();
    const assessment = projectStaticConfigurationAssessment({ derivation: withExtraction, observations: [observation] });
    expect(assessment.decoded_count).toBe(0);
    expect(assessment.observed_count).toBe(0);
    expect(assessment.candidate_count).toBe(1);

    // 16. a value or an assertive state without a decoder is a fabrication.
    const published = publishStaticConfigurationItem(withExtraction.items[0]);
    expect(validateConfigurationItemProjection(published, { artifact_id: ARTIFACT_ID, analysis_run_id: RUN_ID })).toEqual([]);
    expect(
      validateConfigurationItemProjection(
        { ...published, value: 'https://example.invalid/c2', normalized_value: 'https://example.invalid/c2', identity_anchor: 'https://example.invalid/c2' },
        { artifact_id: ARTIFACT_ID, analysis_run_id: RUN_ID },
      ),
    ).toContain('configuration:candidate_with_value');
    // A decoded item with NO decode provenance is rejected: claiming a decode
    // while refusing to say what was decoded is not publishable in any state.
    // (A genuine STATIC_DECODED item carries null values by contract — decode
    // success alone claims no configuration field — but must cite its payload.)
    expect(
      validateConfigurationItemProjection(
        { ...published, epistemic_status: 'STATIC_DECODED', extracted_payload_sha256: null },
        { artifact_id: ARTIFACT_ID, analysis_run_id: RUN_ID },
      ),
    ).toContain('configuration:decoded_without_payload_provenance');
    expect(
      validateConfigurationItemProjection(
        { ...published, derived_artifact_id: null, extracted_payload_sha256: null },
        { artifact_id: ARTIFACT_ID, analysis_run_id: RUN_ID },
      ),
    ).toContain('configuration:awaiting_decoder_without_derived_artifact');
    expect(
      validateConfigurationItemProjection(
        { ...published, derived_artifact_id: `art_${'b'.repeat(64)}` },
        { artifact_id: ARTIFACT_ID, analysis_run_id: RUN_ID },
      ),
    ).toContain('configuration:derived_artifact_pointer_disagrees_with_digest');
  });
});

// ── 14, 15, 17: the real scan, the real write path, the real read gate ─

const toolResults = (artifactId: string, sha: string) =>
  ['lief', 'floss', 'die', 'yara-x', 'capa', 'magika'].map((tool_id) => ({
    tool_id,
    tool_version: null,
    status: 'UNAVAILABLE' as const,
    output: null,
    note: 'the analysis plane was unavailable for this extraction test',
    provenance: {
      tool_id,
      tool_version: null,
      analysis_run_id: RUN_ID,
      artifact_id: artifactId,
      input_sha256: sha,
      runner_identity: 'p6-test',
      ruleset_version: null,
      ruleset_digest: null,
      tool_binary_digest: null,
    },
  }));

async function materializeFixture() {
  const payload = new Uint8Array([...MAGIC_BYTES, ...new Array(88).fill(0x42)]);
  const { bytes, extent_offset, extent_size } = buildPeWithAutoItResource(payload);
  const sha = await sha256Hex(bytes);
  const artifactId = `art_gmf_${sha.slice(0, 16)}`;
  const materialization = await materializeCanonicalReport({
    job: { job_id: 'job_p6_read', analysis_run_id: RUN_ID, artifact_id: artifactId, sha256: sha, toolchain_version: null },
    rawBytes: bytes,
    container_results: toolResults(artifactId, sha),
    container_extractions: [await recordFor(bytes, extent_offset, extent_size)],
    runner_identity: 'p6-test',
    acquisition_context: { source_sample_id: 'p6_holdout', file_names: ['p6_holdout.bin'], size_bytes: bytes.length },
    mapping_catalog: [],
    analyzed_at: AT,
    generated_at: AT,
  });
  return { materialization, sha, artifactId, bytes, extent_offset, extent_size };
}

describe('phase 6 — the real extraction path through the canonical pipeline', () => {
  it('14. the derived artifact never becomes a behavior, and 15. never a family', async () => {
    const { materialization } = await materializeFixture();
    expect(materialization.status).toBe('MATERIALIZED');
    if (materialization.status !== 'MATERIALIZED') throw new Error(materialization.detail);
    const payload = materialization.public_payload as Record<string, any>;
    const derived = payload.detection_artifacts.derived_artifacts;
    expect(derived).toHaveLength(1);
    expect(derived[0].origin).toBe('EXTENDED_RESOURCE_EXTRACTION:AUTOIT_RCDATA_RESOURCE');
    expect(derived[0].artifact_id).toBe(`art_${derived[0].derived_sha256}`);
    expect(derived[0].decoded_configuration).toBeNull();
    // Structural scan found the object inside a real RCDATA extent, and the
    // derived artifact's parent linkage is this report's own identity.
    expect(derived[0].parent_artifact_id).toBe(payload.artifact_id);
    expect(derived[0].parent_sha256).toBe(payload.sha256);
    expect(derived[0].analysis_run_id).toBe(RUN_ID);
    expect(derived[0].resource_type).toBe('RCDATA');
    expect(derived[0].evidence_ids.length).toBeGreaterThan(0);
    expect(derived[0].observation_id).toContain('embedded_objects');
    // No promotion anywhere.
    expect(payload.behaviors.items).toEqual([]);
    expect(payload.family.resolution_state).toBe('UNRESOLVED');
    expect(payload.infrastructure.items).toEqual([]);
    expect(payload.attack_mbc.items).toEqual([]);
    expect(payload.grounding.all_statements_grounded).toBe(true);
    expect(materialization.summary.derived_artifact_outcome).toBe('EXTRACTED');
    expect(materialization.summary.derived_artifact_id).toBe(derived[0].artifact_id);
  });

  it('17. the read gate enforces derived-artifact provenance on the stored row', async () => {
    const { materialization } = await materializeFixture();
    if (materialization.status !== 'MATERIALIZED') throw new Error(materialization.detail);
    const payload = materialization.public_payload as Record<string, any>;
    expect(payload.report_version).toBe(CURRENT_MALWARE_REPORT_CONTRACT_VERSION);
    const stored = { ...payload, overall_status: 'SUCCEEDED', tool_results: materialization.tool_results };
    const gate = (p: Record<string, any>) =>
      validateStoredMalwareReport({ stored_id: String(p.report_id), stored_sha256: p.sha256, payload: p });
    expect(gate(stored)).toEqual([]);

    const artifactId = payload.detection_artifacts.derived_artifacts[0].artifact_id;
    const forged = (mutate: (d: Record<string, any>) => void) => {
      const copy = JSON.parse(JSON.stringify(stored));
      mutate(copy.detection_artifacts.derived_artifacts[0]);
      return gate(copy);
    };
    expect(forged((d) => { d.parent_artifact_id = OTHER_ARTIFACT_ID; })).toContain(
      `derived_artifact:foreign_parent_artifact:${artifactId}`,
    );
    expect(forged((d) => { d.analysis_run_id = OTHER_RUN_ID; })).toContain(
      `derived_artifact:foreign_analysis_run:${artifactId}`,
    );
    expect(forged((d) => { d.artifact_id = 'art_ffffffffffffffff'; })).toContain(
      'derived_artifact:identity_not_content_addressed:art_ffffffffffffffff',
    );
    expect(forged((d) => { d.evidence_ids = []; })).toContain(
      `derived_artifact:evidence_lineage_missing:${artifactId}`,
    );
    expect(forged((d) => { d.extraction_outcome = 'DECODED'; })).toContain(
      `derived_artifact:outcome_not_extracted:${artifactId}`,
    );
    expect(forged((d) => { d.hashes = { sha256: payload.sha256 }; })).toEqual(
      expect.arrayContaining([expect.stringMatching(/^detection_artifacts:analyzed_sample_promoted/)]),
    );

    const stripped = JSON.parse(JSON.stringify(stored));
    delete stripped.detection_artifacts.derived_artifacts;
    expect(gate(stripped)).toContain(
      `contract:missing_required_field:${CURRENT_MALWARE_REPORT_CONTRACT_VERSION}:detection_artifacts.derived_artifacts`,
    );
  });
});
