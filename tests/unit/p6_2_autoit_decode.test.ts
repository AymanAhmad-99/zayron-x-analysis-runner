/**
 * Phase 6.2 — deterministic, verifiable EA06 decode of the recovered AutoIt
 * container.
 *
 * Locks the canonical decode path end to end:
 *   decode record → strict parse → pinned identity + verification sentence →
 *   digest/size recomputed from transported bytes → decoded child artifact
 *   (content-addressed, deterministic) → parent/child lineage →
 *   STATIC_DECODED promotion → read gate → NO semantic promotion.
 */

import { describe, it, expect } from 'bun:test';

import type { Observation } from '../../packages/intelligence/src/malware/canonical/observation';
import type { EmbeddedObjectSection } from '../../packages/intelligence/src/malware/canonical/staticEvidenceProjection';
import { EMBEDDED_OBJECT_TYPE_BY_SIGNATURE } from '../../packages/intelligence/src/malware/canonical/staticEvidenceProjection';
import {
  AUTOIT_DECODER_METHOD,
  AUTOIT_DECODER_VERSION,
  AUTOIT_DECODER_VERIFICATION,
  AUTOIT_EXTRACTION_METHOD,
  AUTOIT_EXTRACTION_LAYER_VERSION,
  DECODED_ARTIFACT_ORIGIN,
  bindDecodingToExtraction,
  validateDerivedArtifactDecoderState,
  validateDerivedArtifactProvenance,
  verifyContainerDecoding,
  type ContainerDecodeRecord,
  type DerivedArtifact,
} from '../../packages/intelligence/src/malware/canonical/autoItResourceExtractor';
import {
  deriveStaticConfigurationEvidence,
  projectStaticConfigurationAssessment,
  validateStaticConfigurationAssessment,
} from '../../packages/intelligence/src/malware/canonical/staticConfigurationLayer';

const RUN_ID = 'ar-p62-test-0001';
const ARTIFACT_ID = 'art_gmf_p62test0000000001';
const PARENT_SHA = '7'.repeat(64);
const DERIVED_SHA = '8'.repeat(64);
const DERIVED_ID = `art_${DERIVED_SHA}`;
/** Ground truth from the real specimen verification (phase 6.2 discovery). */
const DECODED_SHA = '4561adf7d7fb25815973f362a12aeed5d3a83832048b9f6f198ec8558db374f3';
const DECODED_SIZE = 1_656_795;
const AT = '2026-09-23T00:00:00.000Z';
const EVIDENCE_ID = 'ev_static_p62';
const OBSERVATION_ID = 'obs_static_p62_embedded_objects';
const EXTENT_HOST_OFFSET = 815544;
const EXTENT_SIZE = 576146;

/** Deterministic payload stand-in for the decoded bytes (fixed-seed xorshift). */
function deterministicBytes(length: number, seed: number): Uint8Array {
  let state = seed >>> 0 || 1;
  const out = new Uint8Array(length);
  for (let i = 0; i < length; i += 1) {
    state ^= state << 13;
    state >>>= 0;
    state ^= state >>> 17;
    state ^= state << 5;
    state >>>= 0;
    out[i] = state & 0xff;
  }
  return out;
}

function base64Of(bytes: Uint8Array): string {
  let binary = '';
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary);
}

/**
 * A byte-level deterministic DECODE record (sha256 of `deterministicBytes` is
 * computed with Bun's crypto so the fixture is fixed, not random).
 */
async function sha256Hex(bytes: Uint8Array): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', bytes as BufferSource);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

async function decodeRecord(overrides: Partial<ContainerDecodeRecord> = {}): Promise<ContainerDecodeRecord> {
  const payload = deterministicBytes(4096, 0x62d2);
  const outputSha = await sha256Hex(payload);
  return {
    status: 'DECODED',
    decoder_method: AUTOIT_DECODER_METHOD,
    decoder_version: AUTOIT_DECODER_VERSION,
    verification: AUTOIT_DECODER_VERIFICATION,
    output_sha256: outputSha,
    output_size_bytes: payload.length,
    output_b64: base64Of(payload),
    output_name: 'script',
    records: [{ marker: '>>>AUTOIT SCRIPT<<<', declared_crc32: 0x9efc0be8 }],
    ...overrides,
  };
}

/** A provenance-complete extraction parent, exactly as phase 6 publishes it. */
function parentArtifact(overrides: Partial<DerivedArtifact> = {}): DerivedArtifact {
  const MAGIC_RELATIVE_OFFSET = 16;
  return {
    artifact_id: DERIVED_ID,
    origin: 'EXTENDED_RESOURCE_EXTRACTION:AUTOIT_RCDATA_RESOURCE',
    hashes: { sha256: DERIVED_SHA },
    file_names: ['specimen.bin#RCDATA:named'],
    format_class: 'OTHER',
    file_size_bytes: EXTENT_SIZE,
    derived_sha256: DERIVED_SHA,
    parent_artifact_id: ARTIFACT_ID,
    parent_sha256: PARENT_SHA,
    analysis_run_id: RUN_ID,
    extraction_method: AUTOIT_EXTRACTION_METHOD,
    extractor_version: AUTOIT_EXTRACTION_LAYER_VERSION,
    extraction_outcome: 'EXTRACTED',
    resource_type: 'RCDATA',
    resource_id: null,
    host_extent: { host_offset: EXTENT_HOST_OFFSET, size_bytes: EXTENT_SIZE },
    magic_offset: EXTENT_HOST_OFFSET + MAGIC_RELATIVE_OFFSET,
    observation_id: OBSERVATION_ID,
    evidence_ids: [EVIDENCE_ID],
    payload_retention: 'RUN_SCOPE_ONLY',
    decoded_configuration: null,
    resource_container: {
      format: 'AUTOIT_EA06_COMPILED_SCRIPT',
      format_recognized: true,
      magic_relative_offset: MAGIC_RELATIVE_OFFSET,
      encoded_region: { start: MAGIC_RELATIVE_OFFSET + 8, end: EXTENT_SIZE - 8 },
      decode: {
        state: 'UNAVAILABLE',
        decoder_method: null,
        decoder_version: null,
        reason: 'no pinned decoder in this image',
        output_sha256: null,
        output_size_bytes: null,
        child_artifact_id: null,
      },
    },
    decode: {
      state: 'UNAVAILABLE',
      decoder_method: null,
      decoder_version: null,
      reason: 'no pinned decoder in this image',
      output_sha256: null,
      output_size_bytes: null,
      child_artifact_id: null,
    },
    ...overrides,
  } as DerivedArtifact;
}

const CONTEXT = { artifact_id: ARTIFACT_ID, sha256: PARENT_SHA, analysis_run_id: RUN_ID };

// ── 1–5. verifyContainerDecoding: strict, byte-level, fail-closed ──

describe('phase 6.2 — decode record verification', () => {
  it('1. a verified decode record is accepted and the digest is recomputed from the bytes', async () => {
    const result = await verifyContainerDecoding({
      record: await decodeRecord(),
      expected_extracted_sha256: DERIVED_SHA,
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.decoded.decoder_method).toBe(AUTOIT_DECODER_METHOD);
      expect(result.decoded.decoder_version).toBe(AUTOIT_DECODER_VERSION);
      expect(result.decoded.decoded_sha256).toBe(await sha256Hex(deterministicBytes(4096, 0x62d2)));
      expect(result.decoded.decoded_size_bytes).toBe(4096);
      expect(result.decoded.source_extracted_sha256).toBe(DERIVED_SHA);
    }
  });

  it('2. a wrong output checksum is rejected', async () => {
    const record = await decodeRecord({ output_sha256: 'f'.repeat(64) });
    const result = await verifyContainerDecoding({ record, expected_extracted_sha256: DERIVED_SHA });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe('DECODED_PAYLOAD_DIGEST_MISMATCH');
  });

  it('3. a wrong declared compressed/recorded size is rejected', async () => {
    const record = await decodeRecord({ output_size_bytes: 4095 });
    const result = await verifyContainerDecoding({ record, expected_extracted_sha256: DERIVED_SHA });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe('DECODED_PAYLOAD_SIZE_MISMATCH');
  });

  it('4. malformed, truncated or non-base64 output is rejected', async () => {
    for (const overrides of [
      { output_b64: '!!!not-base64!!!' },
      { output_b64: undefined },
      { output_sha256: 'nothex' },
    ] as Partial<ContainerDecodeRecord>[]) {
      const result = await verifyContainerDecoding({
        record: await decodeRecord(overrides),
        expected_extracted_sha256: DERIVED_SHA,
      });
      expect(result.ok).toBe(false);
    }
  });

  it('5. decoder identity or verification sentence mismatch is rejected', async () => {
    const wrongVersion = await verifyContainerDecoding({
      record: await decodeRecord({ decoder_version: '9.9.9' }),
      expected_extracted_sha256: DERIVED_SHA,
    });
    expect(wrongVersion.ok).toBe(false);
    if (!wrongVersion.ok) expect(wrongVersion.code).toBe('DECODER_IDENTITY_MISMATCH');

    const wrongVerification = await verifyContainerDecoding({
      record: await decodeRecord({ verification: 'trust me' }),
      expected_extracted_sha256: DERIVED_SHA,
    });
    expect(wrongVerification.ok).toBe(false);
    if (!wrongVerification.ok) expect(wrongVerification.code).toBe('DECODE_VERIFICATION_ABSENT');
  });

  it('6. a decode without this run’s verified extraction, or equal to it, is rejected', async () => {
    const noExtent = await verifyContainerDecoding({ record: await decodeRecord(), expected_extracted_sha256: null });
    expect(noExtent.ok).toBe(false);

    const payload = deterministicBytes(4096, 0x62d2);
    const sameAsExtent = await verifyContainerDecoding({
      record: await decodeRecord({ output_sha256: DERIVED_SHA }),
      expected_extracted_sha256: DERIVED_SHA,
    });
    expect(sameAsExtent.ok).toBe(false);
    void payload;
  });

  it('7. verification is deterministic: identical records verify identically', async () => {
    const a = await verifyContainerDecoding({ record: await decodeRecord(), expected_extracted_sha256: DERIVED_SHA });
    const b = await verifyContainerDecoding({ record: await decodeRecord(), expected_extracted_sha256: DERIVED_SHA });
    expect(a).toEqual(b);
  });
});

// ── 6–11. the decoded child artifact ──

describe('phase 6.2 — decoded child artifact and lineage', () => {
  it('8. bindDecodingToExtraction mints a content-addressed child and upgrades the parent', async () => {
    const parent = parentArtifact();
    const parentSnapshot = JSON.stringify(parent);
    const verified = await verifyContainerDecoding({ record: await decodeRecord(), expected_extracted_sha256: DERIVED_SHA });
    expect(verified.ok).toBe(true);
    if (!verified.ok) return;

    const outcome = bindDecodingToExtraction({ parent, analysis_run_id: RUN_ID, decoded: verified.decoded });
    expect(outcome.status).toBe('DECODED');
    expect(outcome.child).not.toBeNull();
    const child = outcome.child!;
    expect(child.artifact_id).toBe(`art_${verified.decoded.decoded_sha256}`);
    expect(child.origin).toBe(DECODED_ARTIFACT_ORIGIN);
    expect(child.parent_artifact_id).toBe(DERIVED_ID);
    expect(child.parent_sha256).toBe(DERIVED_SHA);
    expect(child.analysis_run_id).toBe(RUN_ID);
    expect(child.derived_sha256).toBe(verified.decoded.decoded_sha256);
    expect(child.hashes.sha256).toBe(verified.decoded.decoded_sha256);
    expect(child.extraction_method).toBe(AUTOIT_DECODER_METHOD);
    expect(child.extractor_version).toBe(`${AUTOIT_DECODER_METHOD}@${AUTOIT_DECODER_VERSION}`);
    expect(child.decode.state).toBe('DECODED');
    expect(outcome.parent.decode.state).toBe('DECODED');
    // Parent object unchanged by binding.
    expect(JSON.stringify(parent)).toBe(parentSnapshot);
  });

  it('9. binding is deterministic: identical inputs produce identical child identity', async () => {
    const verified = await verifyContainerDecoding({ record: await decodeRecord(), expected_extracted_sha256: DERIVED_SHA });
    if (!verified.ok) throw new Error('fixture must verify');
    const first = bindDecodingToExtraction({ parent: parentArtifact(), analysis_run_id: RUN_ID, decoded: verified.decoded });
    const second = bindDecodingToExtraction({ parent: parentArtifact(), analysis_run_id: RUN_ID, decoded: verified.decoded });
    expect(first.child!.artifact_id).toBe(second.child!.artifact_id);
    expect(first.child!.derived_sha256).toBe(second.child!.derived_sha256);
    expect(JSON.stringify(first.child)).toBe(JSON.stringify(second.child));
  });

  it('10. foreign parent run is rejected; decode not descended from the extent is rejected', async () => {
    const verified = await verifyContainerDecoding({ record: await decodeRecord(), expected_extracted_sha256: DERIVED_SHA });
    if (!verified.ok) throw new Error('fixture must verify');
    const foreignRun = bindDecodingToExtraction({
      parent: parentArtifact(),
      analysis_run_id: 'ar-someone-else',
      decoded: verified.decoded,
    });
    expect(foreignRun.status).toBe('ERROR');
    expect(foreignRun.child).toBeNull();
    expect(foreignRun.errors).toContain('foreign_parent_run');

    const foreignDecoded = bindDecodingToExtraction({
      parent: parentArtifact(),
      analysis_run_id: RUN_ID,
      decoded: { ...verified.decoded, source_extracted_sha256: 'a'.repeat(64) },
    });
    expect(foreignDecoded.status).toBe('ERROR');
    expect(foreignDecoded.errors).toContain('decoded_child_not_descended_from_verified_extent');
  });

  it('11. the child passes provenance + decoder-state validation (read gate semantics)', async () => {
    const verified = await verifyContainerDecoding({ record: await decodeRecord(), expected_extracted_sha256: DERIVED_SHA });
    if (!verified.ok) throw new Error('fixture must verify');
    const outcome = bindDecodingToExtraction({ parent: parentArtifact(), analysis_run_id: RUN_ID, decoded: verified.decoded });
    const child = outcome.child!;
    // The real gates pass the report's sibling derived artifacts so a decode's
    // lineage can resolve through its extraction parent.
    expect(validateDerivedArtifactProvenance(child, { ...CONTEXT, derived_artifacts: [outcome.parent] })).toEqual([]);
    expect(validateDerivedArtifactDecoderState(child)).toEqual([]);
    // And the upgraded parent still validates.
    expect(validateDerivedArtifactProvenance(outcome.parent, { ...CONTEXT, derived_artifacts: [outcome.parent, child] })).toEqual([]);
    expect(validateDerivedArtifactDecoderState(outcome.parent)).toEqual([]);
  });

  it('12. a decode-origin child without a DECODED state is rejected', () => {
    const forged = { ...parentArtifact(), origin: DECODED_ARTIFACT_ORIGIN, decode: { ...parentArtifact().decode, state: 'UNAVAILABLE' } };
    const errors = validateDerivedArtifactProvenance(forged, CONTEXT);
    expect(errors).toContain(`derived_artifact:decode_origin_without_decoded_state:${forged.artifact_id}`);
  });
});

// ── 12–14. STATIC_DECODED promotion gate ──

function embeddedObjects(): EmbeddedObjectSection {
  const signature = 'compiled_autoit_script';
  return {
    projection_version: 'test',
    observation_id: OBSERVATION_ID,
    observation_status: 'OBSERVED',
    count: 1,
    objects: [
      {
        object_type: EMBEDDED_OBJECT_TYPE_BY_SIGNATURE[signature],
        signature,
        offset: EXTENT_HOST_OFFSET + 16,
        host_offset: EXTENT_HOST_OFFSET,
        size_bytes: EXTENT_SIZE,
        host_section: '.rsrc',
        host_resource_type: 'RCDATA',
        entropy: 7.9997,
        digest: { algorithm: 'sha256' as const, value: 'a'.repeat(64) },
        parent_artifact_id: ARTIFACT_ID,
        analysis_run_id: RUN_ID,
        evidence_id: EVIDENCE_ID,
        observation_id: OBSERVATION_ID,
        source_tool: 'STATIC_ANALYSIS',
        tool_version: '1.0.0-staticanalyzer-canonical',
        extracted: false as const,
        child_artifact_id: null,
      },
    ],
    coverage: {
      scanned_bytes: EXTENT_HOST_OFFSET + EXTENT_SIZE,
      byte_scan_capped: false,
      overlay_bytes: 0,
      resource_count: 26,
      resource_total_bytes: EXTENT_SIZE,
      resource_inventory_capped: false,
    },
    source: {
      source_tool: 'STATIC_ANALYSIS',
      tool_version: '1.0.0-staticanalyzer-canonical',
      evidence_ids: [EVIDENCE_ID],
      observation_ids: [OBSERVATION_ID],
      artifact_id: ARTIFACT_ID,
      analysis_run_id: RUN_ID,
    },
  } as unknown as EmbeddedObjectSection;
}

function embeddedObservation(): Observation {
  return {
    observation_id: OBSERVATION_ID,
    analysis_run_id: RUN_ID,
    artifact_id: ARTIFACT_ID,
    source: 'STATIC_ANALYSIS',
    observation_type: 'embedded_objects',
    attributes: {
      analysis_status: 'OBSERVED',
      embedded_object_count: 1,
      embedded_object_0_signature: 'compiled_autoit_script',
      embedded_object_0_offset: EXTENT_HOST_OFFSET + 16,
      embedded_object_0_size: EXTENT_SIZE,
      embedded_object_0_host_offset: EXTENT_HOST_OFFSET,
      embedded_object_0_section: '.rsrc',
      embedded_object_0_resource_type: 'RCDATA',
      embedded_object_0_entropy: 7.9997,
      resource_count: 26,
      byte_scan_capped: false,
    },
    observed_at: AT,
    evidence_refs: [
      {
        evidence_id: EVIDENCE_ID,
        source_id: 'src_static_analyzer',
        source_snapshot_id: RUN_ID,
        kind: 'STATIC',
        authority_tier: 'TIER_1',
        reliability: 'A',
        credibility: '2',
        observed_at: AT,
        retrieved_at: AT,
      },
    ],
    provenance: {
      evidence_refs: [],
      source_ids: ['src_static_analyzer'],
      authority_tier: 'TIER_1',
      snapshot_ids: [RUN_ID],
      derived_at: AT,
    },
  } as unknown as Observation;
}

function derivation(decodedChild: DerivedArtifact | null) {
  return deriveStaticConfigurationEvidence({
    artifact_id: ARTIFACT_ID,
    analysis_run_id: RUN_ID,
    embedded_objects: embeddedObjects(),
    observations: [embeddedObservation()],
    derived_artifact: parentArtifact(),
    decoded_child: decodedChild,
    derived_at: AT,
  });
}

describe('phase 6.2 — STATIC_DECODED promotion gate', () => {
  it('13. with a verified decoded child the candidate is promoted to STATIC_DECODED with structural provenance only', async () => {
    const verified = await verifyContainerDecoding({ record: await decodeRecord(), expected_extracted_sha256: DERIVED_SHA });
    if (!verified.ok) throw new Error('fixture must verify');
    const outcome = bindDecodingToExtraction({ parent: parentArtifact(), analysis_run_id: RUN_ID, decoded: verified.decoded });
    const derived = derivation(outcome.child);
    expect(derived.outcome).toBe('OBSERVED');
    expect(derived.items).toHaveLength(1);
    const item = derived.items[0]!;
    expect(item.epistemic_status).toBe('STATIC_DECODED');
    expect(item.undecoded_reason).toBeNull();
    expect(item.extraction_method).toBe('DETERMINISTIC_DECODE');
    expect(item.attributes['decoded_artifact_id']).toBe(outcome.child!.artifact_id);
    expect(item.attributes['decoded_sha256']).toBe(outcome.child!.derived_sha256);
    // No semantic configuration value is claimed by decode success alone.
    expect(item.value).toBeNull();
    expect(item.raw_value).toBeNull();
    expect(item.normalized_value).toBeNull();
  });

  it('14. without a verified decoded child the item stays STATIC_CANDIDATE', () => {
    const derived = derivation(null);
    expect(derived.outcome).toBe('CONFIGURATION_CANDIDATE');
    expect(derived.items[0]!.epistemic_status).toBe('STATIC_CANDIDATE');
    expect(derived.items[0]!.undecoded_reason).toBe('AWAITING_DETERMINISTIC_DECODER');
  });

  it('15. a decoded child from a foreign run or parent cannot promote', async () => {
    const verified = await verifyContainerDecoding({ record: await decodeRecord(), expected_extracted_sha256: DERIVED_SHA });
    if (!verified.ok) throw new Error('fixture must verify');
    const foreign = bindDecodingToExtraction({ parent: parentArtifact(), analysis_run_id: 'ar-foreign', decoded: verified.decoded });
    expect(foreign.child).toBeNull();
    // Even a hand-forged child bound to another run cannot promote.
    const forgedChild = { ...bindDecodingToExtraction({ parent: parentArtifact(), analysis_run_id: RUN_ID, decoded: verified.decoded }).child!, analysis_run_id: 'ar-foreign' };
    const derived = derivation(forgedChild);
    expect(derived.items[0]!.epistemic_status).toBe('STATIC_CANDIDATE');
  });

  it('16. the decoded assessment projects coherently and validates', async () => {
    const verified = await verifyContainerDecoding({ record: await decodeRecord(), expected_extracted_sha256: DERIVED_SHA });
    if (!verified.ok) throw new Error('fixture must verify');
    const outcome = bindDecodingToExtraction({ parent: parentArtifact(), analysis_run_id: RUN_ID, decoded: verified.decoded });
    const derived = derivation(outcome.child);
    const assessment = projectStaticConfigurationAssessment({ derivation: derived, observations: [embeddedObservation()] });
    expect(assessment.decoder_availability).toBe('AVAILABLE');
    expect(assessment.decoded_count).toBe(1);
    expect(assessment.candidate_count).toBe(0);
    expect(validateStaticConfigurationAssessment(assessment, {
      artifact_id: ARTIFACT_ID,
      analysis_run_id: RUN_ID,
      item_count: 1,
      candidate_count: 0,
      observed_count: 0,
      decoded_count: 1,
    })).toEqual([]);
  });

  it('17. decoding promotes NO family, behavior, infrastructure or ATT&CK claim anywhere', async () => {
    const verified = await verifyContainerDecoding({ record: await decodeRecord(), expected_extracted_sha256: DERIVED_SHA });
    if (!verified.ok) throw new Error('fixture must verify');
    const outcome = bindDecodingToExtraction({ parent: parentArtifact(), analysis_run_id: RUN_ID, decoded: verified.decoded });
    const derived = derivation(outcome.child);
    // The canonical disclaimer legitimately names these domains in a NEGATION
    // ("a configuration container is not a configuration value and is not
    // evidence of any behavior, family, infrastructure or technique"). This is
    // the opposite of a promotion, so the disclaimer is asserted explicitly and
    // then removed before the structured remainder is scanned for a real claim.
    expect(derived.outcome_reason).toContain(
      'is not evidence of any behavior, family, infrastructure or technique',
    );
    const blob = JSON.stringify({
      child: outcome.child,
      parent: outcome.parent,
      derived: { ...derived, outcome_reason: undefined },
    });
    expect(blob).not.toMatch(/"family"/);
    expect(blob).not.toMatch(/behavio/i);
    expect(blob).not.toMatch(/infrastructure/i);
    expect(blob).not.toMatch(/attack/i);
    expect(blob).not.toMatch(/"c2"|c2_server/i);
  });
});
