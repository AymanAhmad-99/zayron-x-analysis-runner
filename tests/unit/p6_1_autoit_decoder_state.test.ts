/**
 * Phase 6.1 — deterministic decoder state for the recovered AutoIt container.
 *
 * Locks the ONE honest claim this phase can make: the recovered extent IS a
 * recognised `AU3!EA06` container, and NO pinned, verification-capable decoder
 * exists in the hardened image — so the decode state is UNAVAILABLE, nothing is
 * decoded, nothing is guessed, and configuration stays a CANDIDATE.
 *
 * The tests also lock the fail-closed invariant that makes a fabricated decode
 * impossible to publish: only a `DECODED` state may carry an output digest, a
 * content-addressed child and a pinned decoder identity; every other state
 * carries null output fields, on the write path AND through the read gate.
 */

import { describe, it, expect } from 'bun:test';

import type { Observation } from '../../packages/intelligence/src/malware/canonical/observation';
import type { EmbeddedObjectSection } from '../../packages/intelligence/src/malware/canonical/staticEvidenceProjection';
import { EMBEDDED_OBJECT_TYPE_BY_SIGNATURE } from '../../packages/intelligence/src/malware/canonical/staticEvidenceProjection';
import {
  AUTOIT_DECODER_ABSENT_REASON,
  AUTOIT_EXTRACTION_METHOD,
  AUTOIT_EXTRACTION_LAYER_VERSION,
  AUTOIT_RESOURCE_MAGIC,
  DERIVED_ARTIFACT_ORIGIN,
  recognizeAutoItResourceContainer,
  validateDerivedArtifactDecoderState,
  validateDerivedArtifactProvenance,
  type DerivedArtifact,
} from '../../packages/intelligence/src/malware/canonical/autoItResourceExtractor';
import {
  deriveStaticConfigurationEvidence,
  projectStaticConfigurationAssessment,
  publishStaticConfigurationItem,
  validateConfigurationItemProjection,
  validateStaticConfigurationAssessment,
  STATIC_CONFIGURATION_LAYER_VERSION,
} from '../../packages/intelligence/src/malware/canonical/staticConfigurationLayer';

const RUN_ID = 'ar-p61-test-0001';
const ARTIFACT_ID = 'art_gmf_p61test0000000001';
const PARENT_SHA = '7'.repeat(64);
const DECODED_SHA = '9'.repeat(64);
/** The recovered child's own digest/id (label used by every validator code). */
const DERIVED_SHA = '8'.repeat(64);
const DERIVED_ID = `art_${DERIVED_SHA}`;
const AT = '2026-09-23T00:00:00.000Z';
const EVIDENCE_ID = 'ev_static_p61';
const OBSERVATION_ID = 'obs_static_p61_embedded_objects';

const MAGIC_BYTES = [...AUTOIT_RESOURCE_MAGIC].map((c) => c.charCodeAt(0));
/** Extent-relative offset the canonical evidence reports for this container. */
const MAGIC_RELATIVE_OFFSET = 16;
/** Synthetic extent used by every byte-level case in this file. */
const EXTENT_HOST_OFFSET = 815544;
const EXTENT_SIZE = 1024;

/**
 * Deterministic filler — a fixed-seed xorshift, never `Math.random`, so the
 * fixtures themselves are reproducible across runs.
 */
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

/** A REAL EA06-shaped extent: prefix + magic + encoded region + trailer magic. */
function ea06Extent(options: { trailer?: boolean; magicAt?: number; regionBytes?: number } = {}): Uint8Array {
  const trailer = options.trailer ?? true;
  const regionBytes = options.regionBytes ?? EXTENT_SIZE - MAGIC_RELATIVE_OFFSET - 8 - (trailer ? 8 : 0);
  const bytes = new Uint8Array(MAGIC_RELATIVE_OFFSET + 8 + regionBytes + (trailer ? 8 : 0));
  bytes.set(deterministicBytes(MAGIC_RELATIVE_OFFSET, 0x51ed), 0);
  const at = options.magicAt ?? MAGIC_RELATIVE_OFFSET;
  bytes.set(Uint8Array.from(MAGIC_BYTES), at);
  bytes.set(deterministicBytes(regionBytes, 0x2b1d), at + 8);
  if (trailer) bytes.set(Uint8Array.from(MAGIC_BYTES), bytes.length - 8);
  return bytes;
}

/** A provenance-complete derived artifact, exactly as the extractor publishes it. */
function derivedArtifact(overrides: Partial<DerivedArtifact> = {}): DerivedArtifact {
  const extent = ea06Extent();
  const recognition = recognizeAutoItResourceContainer(extent, MAGIC_RELATIVE_OFFSET);
  const derivedSha = DERIVED_SHA;
  return {
    artifact_id: `art_${derivedSha}`,
    origin: DERIVED_ARTIFACT_ORIGIN,
    hashes: { sha256: derivedSha },
    file_names: ['specimen.bin#RCDATA:named'],
    format_class: 'OTHER',
    file_size_bytes: extent.length,
    derived_sha256: derivedSha,
    parent_artifact_id: ARTIFACT_ID,
    parent_sha256: PARENT_SHA,
    analysis_run_id: RUN_ID,
    extraction_method: AUTOIT_EXTRACTION_METHOD,
    extractor_version: AUTOIT_EXTRACTION_LAYER_VERSION,
    extraction_outcome: 'EXTRACTED',
    resource_type: 'RCDATA',
    resource_id: null,
    host_extent: { host_offset: EXTENT_HOST_OFFSET, size_bytes: extent.length },
    magic_offset: EXTENT_HOST_OFFSET + MAGIC_RELATIVE_OFFSET,
    observation_id: OBSERVATION_ID,
    evidence_ids: [EVIDENCE_ID],
    payload_retention: 'RUN_SCOPE_ONLY',
    decoded_configuration: null,
    resource_container: recognition,
    decode: recognition.decode,
    ...overrides,
  } as DerivedArtifact;
}

const CONTEXT = { artifact_id: ARTIFACT_ID, sha256: PARENT_SHA, analysis_run_id: RUN_ID };

describe('phase 6.1 — container classification and decode state', () => {
  it('1. a real EA06-shaped extent is recognised as an AutoIt container', () => {
    const extent = ea06Extent();
    const r = recognizeAutoItResourceContainer(extent, MAGIC_RELATIVE_OFFSET);
    expect(r.format).toBe('AUTOIT_EA06_COMPILED_SCRIPT');
    expect(r.format_recognized).toBe(true);
    expect(r.magic_relative_offset).toBe(MAGIC_RELATIVE_OFFSET);
    expect(r.prefix_bytes).toBe(MAGIC_RELATIVE_OFFSET);
    expect(r.trailer_magic_present).toBe(true);
    expect(r.encoded_region_bytes).toBe(extent.length - MAGIC_RELATIVE_OFFSET - 8 - 8);
    expect(r.standard_wrapper_present).toEqual({ zlib: false, gzip: false });
    expect(r.projection_version).toContain('autoitdecoderstate');
  });

  it('2. decoder state is UNAVAILABLE with the measured reason and NO output of any kind', () => {
    const r = recognizeAutoItResourceContainer(ea06Extent(), MAGIC_RELATIVE_OFFSET);
    expect(r.decode.state).toBe('UNAVAILABLE');
    expect(r.decode.reason).toBe(AUTOIT_DECODER_ABSENT_REASON);
    expect(r.decode.reason).toContain('AUTOIT_EA06_PROPRIETARY_KEYSTREAM_LZ77');
    expect(r.decode.decoder_method).toBeNull();
    expect(r.decode.decoder_version).toBeNull();
    expect(r.decode.output_sha256).toBeNull();
    expect(r.decode.output_size_bytes).toBeNull();
    expect(r.decode.child_artifact_id).toBeNull();
  });

  it('3. a magic anywhere else is NOT a recognised container: fail closed', () => {
    const r = recognizeAutoItResourceContainer(ea06Extent({ magicAt: 4, trailer: false }), MAGIC_RELATIVE_OFFSET);
    expect(r.format).toBe('UNRECOGNIZED');
    expect(r.format_recognized).toBe(false);
    expect(r.magic_relative_offset).toBeNull();
    expect(r.encoded_region_bytes).toBeNull();
    expect(r.decode.state).toBe('ERROR');
    expect(r.decode.output_sha256).toBeNull();
  });

  it('4. a truncated extent is rejected, never partially decoded', () => {
    const r = recognizeAutoItResourceContainer(Uint8Array.from(MAGIC_BYTES.slice(0, 4)), MAGIC_RELATIVE_OFFSET);
    expect(r.format_recognized).toBe(false);
    expect(r.decode.state).toBe('ERROR');
    const empty = recognizeAutoItResourceContainer(new Uint8Array(0), 0);
    expect(empty.format_recognized).toBe(false);
    expect(empty.trailer_magic_present).toBe(false);
  });

  it('5. detecting a codec wrapper is NOT decoding (no automatic promotion)', () => {
    const extent = ea06Extent();
    // inject a valid zlib header where the encoded region starts
    extent[MAGIC_RELATIVE_OFFSET + 8] = 0x78;
    extent[MAGIC_RELATIVE_OFFSET + 9] = 0x9c;
    const r = recognizeAutoItResourceContainer(extent, MAGIC_RELATIVE_OFFSET);
    expect(r.standard_wrapper_present.zlib).toBe(true);
    // …and the state is STILL unavailable: this layer has no decoder to run.
    expect(r.decode.state).toBe('UNAVAILABLE');
    expect(r.decode.output_sha256).toBeNull();
    expect(r.decode.child_artifact_id).toBeNull();
  });

  it('6. recognition is deterministic: three runs on identical bytes are identical', () => {
    const extent = ea06Extent();
    const runs = [0, 1, 2].map(() => recognizeAutoItResourceContainer(Uint8Array.from(extent), MAGIC_RELATIVE_OFFSET));
    expect(JSON.stringify(runs[1])).toBe(JSON.stringify(runs[0]));
    expect(JSON.stringify(runs[2])).toBe(JSON.stringify(runs[0]));
    // different bytes → different encoded region size, never a shared identity
    const other = recognizeAutoItResourceContainer(ea06Extent({ regionBytes: 64 }), MAGIC_RELATIVE_OFFSET);
    expect(other.encoded_region_bytes).not.toBe(runs[0].encoded_region_bytes);
  });

  it('7. the recognition carries no value, configuration, behavior, family or infrastructure claim', () => {
    const r = recognizeAutoItResourceContainer(ea06Extent(), MAGIC_RELATIVE_OFFSET);
    expect(Object.keys(r).sort()).toEqual([
      'decode',
      'encoded_region_bytes',
      'format',
      'format_recognized',
      'magic_relative_offset',
      'prefix_bytes',
      'projection_version',
      'standard_wrapper_present',
      'trailer_magic_present',
    ]);
    expect(Object.keys(r.decode).sort()).toEqual([
      'child_artifact_id',
      'decoder_method',
      'decoder_version',
      'output_sha256',
      'output_size_bytes',
      'reason',
      'state',
    ]);
  });
});

describe('phase 6.1 — derived-artifact provenance with a decode block', () => {
  it('8. a decoded child without a decoder identity, digest or content-addressed id is rejected', () => {
    const undigested = derivedArtifact({ decode: { ...dis().decode, state: 'DECODED' } });
    const errors = validateDerivedArtifactDecoderState(undigested);
    expect(errors).toContain(`derived_artifact:decoded_without_output_digest:${DERIVED_ID}`);
    expect(errors).toContain(`derived_artifact:decoded_without_output_size:${DERIVED_ID}`);
    expect(errors).toContain(`derived_artifact:decoded_child_not_content_addressed:${DERIVED_ID}`);
    expect(errors).toContain(`derived_artifact:decoded_without_decoder_identity:${DERIVED_ID}`);

    // A digest and size are not enough: the decoder must be identified.
    const partial = derivedArtifact({
      decode: {
        state: 'DECODED',
        decoder_method: null,
        decoder_version: null,
        reason: 'claimed',
        output_sha256: DECODED_SHA,
        output_size_bytes: 42,
        child_artifact_id: `art_${DECODED_SHA}`,
      },
    });
    expect(validateDerivedArtifactDecoderState(partial)).toEqual([
      `derived_artifact:decoded_without_decoder_identity:${DERIVED_ID}`,
    ]);

    // A pinned decoder + digest + content-addressed child is the ONLY shape accepted.
    const honest = derivedArtifact({
      decode: {
        state: 'DECODED',
        decoder_method: 'AU3_EA06_DEFLATE_DECODER',
        decoder_version: '1.0.0',
        reason: 'decoded',
        output_sha256: DECODED_SHA,
        output_size_bytes: 42,
        child_artifact_id: `art_${DECODED_SHA}`,
      },
    });
    expect(validateDerivedArtifactDecoderState(honest)).toEqual([]);
  });

  it('9. an undecoded state carrying output, a child or a decoder identity is rejected', () => {
    const d = dis().decode;
    expect(
      validateDerivedArtifactDecoderState(derivedArtifact({ decode: { ...d, output_sha256: DECODED_SHA } })),
    ).toContain(`derived_artifact:undecoded_state_carries_output_digest:${DERIVED_ID}`);
    expect(
      validateDerivedArtifactDecoderState(derivedArtifact({ decode: { ...d, output_size_bytes: 12 } })),
    ).toContain(`derived_artifact:undecoded_state_carries_output_size:${DERIVED_ID}`);
    expect(
      validateDerivedArtifactDecoderState(derivedArtifact({ decode: { ...d, child_artifact_id: `art_${DECODED_SHA}` } })),
    ).toContain(`derived_artifact:undecoded_state_carries_child_artifact:${DERIVED_ID}`);
    expect(
      validateDerivedArtifactDecoderState(
        derivedArtifact({ decode: { ...d, decoder_method: 'wishful', decoder_version: '0.0.1' } }),
        CONTEXT,
      ),
    ).toContain(`derived_artifact:undecoded_state_claims_decoder:${DERIVED_ID}`);
    expect(validateDerivedArtifactDecoderState(derivedArtifact({ decode: { ...d, state: 'MAYBE' } }))).toContain(
      `derived_artifact:decode_state_unknown:${DERIVED_ID}:MAYBE`,
    );
  });

  it('10. a decoded claim over an unrecognised container is rejected', () => {
    const unrecognized = recognizeAutoItResourceContainer(Uint8Array.from(MAGIC_BYTES.slice(0, 4)), 16);
    const artifact = derivedArtifact({
      resource_container: unrecognized,
      decode: {
        state: 'DECODED',
        decoder_method: 'AU3_EA06_DEFLATE_DECODER',
        decoder_version: '1.0.0',
        reason: 'decoded',
        output_sha256: DECODED_SHA,
        output_size_bytes: 42,
        child_artifact_id: `art_${DECODED_SHA}`,
      },
    });
    expect(validateDerivedArtifactDecoderState(artifact)).toContain(
      `derived_artifact:decoded_unrecognised_container:${DERIVED_ID}`,
    );
  });

  it('11. a missing or inconsistent decode block / container recognition is rejected', () => {
    const missingDecode = derivedArtifact();
    delete (missingDecode as unknown as Record<string, unknown>).decode;
    expect(validateDerivedArtifactDecoderState(missingDecode)).toContain(
      `derived_artifact:decode_block_absent:${DERIVED_ID}`,
    );

    const missingContainer = derivedArtifact();
    delete (missingContainer as unknown as Record<string, unknown>).resource_container;
    expect(validateDerivedArtifactDecoderState(missingContainer)).toContain(
      `derived_artifact:container_recognition_absent:${DERIVED_ID}`,
    );

    const inconsistent = derivedArtifact({
      resource_container: { ...dis().resource_container, format: 'UNRECOGNIZED' },
    });
    expect(validateDerivedArtifactDecoderState(inconsistent)).toContain(
      `derived_artifact:container_recognition_inconsistent:${DERIVED_ID}`,
    );

    const unknownFormat = derivedArtifact({
      resource_container: { ...dis().resource_container, format: 'MZ_EXE' },
    });
    expect(validateDerivedArtifactDecoderState(unknownFormat)).toContain(
      `derived_artifact:container_format_unknown:${DERIVED_ID}:MZ_EXE`,
    );
  });

  it('12. the honest artifact passes, and foreign parent / run / lineage are still refused', () => {
    expect(validateDerivedArtifactProvenance(derivedArtifact(), CONTEXT)).toEqual([]);
    // parent unchanged: child identity is content-addressed and never the parent's
    const artifact = derivedArtifact();
    expect(artifact.parent_artifact_id).toBe(ARTIFACT_ID);
    expect(artifact.parent_sha256).toBe(PARENT_SHA);
    expect(artifact.artifact_id).not.toBe(`art_${PARENT_SHA}`);

    expect(
      validateDerivedArtifactProvenance(derivedArtifact({ parent_artifact_id: 'art_other' }), CONTEXT),
    ).toContain(`derived_artifact:foreign_parent_artifact:${DERIVED_ID}`);
    expect(
      validateDerivedArtifactProvenance(derivedArtifact({ analysis_run_id: 'ar-somewhere-else' }), CONTEXT),
    ).toContain(`derived_artifact:foreign_analysis_run:${DERIVED_ID}`);
    expect(validateDerivedArtifactProvenance(derivedArtifact({ evidence_ids: [] }), CONTEXT)).toContain(
      `derived_artifact:evidence_lineage_missing:${DERIVED_ID}`,
    );
    // Reusing the analyzed sample's own digest as the child's identity is the
    // "promote the sample to a derived artifact" defect — refused by name.
    expect(
      validateDerivedArtifactProvenance(
        derivedArtifact({
          artifact_id: `art_${PARENT_SHA}`,
          derived_sha256: PARENT_SHA,
          hashes: { sha256: PARENT_SHA },
        }),
        CONTEXT,
      ),
    ).toContain(`derived_artifact:analyzed_sample_promoted:art_${PARENT_SHA}`);
  });
});

// ── configuration: a candidate stays a candidate without a decoder ──

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
        offset: EXTENT_HOST_OFFSET + MAGIC_RELATIVE_OFFSET,
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
      embedded_object_0_offset: EXTENT_HOST_OFFSET + MAGIC_RELATIVE_OFFSET,
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

function configurationDerivation() {
  return deriveStaticConfigurationEvidence({
    artifact_id: ARTIFACT_ID,
    analysis_run_id: RUN_ID,
    embedded_objects: embeddedObjects(),
    observations: [embeddedObservation()],
    derived_artifact: derivedArtifact(),
    derived_at: AT,
  });
}

describe('phase 6.1 — configuration stays CANDIDATE without a decoder', () => {
  it('13. the derivation records UNAVAILABLE and keeps the item a blocked candidate', () => {
    const derivation = configurationDerivation();
    expect(derivation.outcome).toBe('CONFIGURATION_CANDIDATE');
    expect(derivation.items).toHaveLength(1);
    const item = derivation.items[0]!;
    expect(item.epistemic_status).toBe('STATIC_CANDIDATE');
    expect(item.undecoded_reason).toBe('AWAITING_DETERMINISTIC_DECODER');
    expect(item.decoder_availability).toBe('UNAVAILABLE');
    expect(item.container_format).toBe('AUTOIT_EA06_COMPILED_SCRIPT');
    expect(item.value).toBeNull();
    expect(item.raw_value).toBeNull();
    expect(item.normalized_value).toBeNull();
    expect(item.derived_artifact_id).toBe(derivedArtifact().artifact_id);

    const assessment = projectStaticConfigurationAssessment({ derivation, observations: [embeddedObservation()] });
    expect(assessment.decoder_availability).toBe('UNAVAILABLE');
    expect(assessment.decoded_count).toBe(0);
    expect(assessment.outcome).toBe('CONFIGURATION_CANDIDATE');
    expect(assessment.execution_claimed).toBe(false);
    expect(assessment.projection_version).toBe(STATIC_CONFIGURATION_LAYER_VERSION);
  });

  it('14. an "available decoder" claim alongside a candidate item is rejected (write path and read gate)', () => {
    const derivation = configurationDerivation();
    const published = publishStaticConfigurationItem(derivation.items[0]!);
    const ctx = { artifact_id: ARTIFACT_ID, analysis_run_id: RUN_ID };
    expect(validateConfigurationItemProjection(published, ctx)).toEqual([]);

    expect(
      validateConfigurationItemProjection({ ...published, decoder_availability: 'AVAILABLE' }, ctx),
    ).toContain('configuration:awaiting_decoder_while_decoder_available');
    expect(
      validateConfigurationItemProjection({ ...published, decoder_availability: 'AVAILABLE' }, ctx),
    ).toContain('configuration:decoder_available_without_decoded_item');
    expect(
      validateConfigurationItemProjection({ ...published, decoder_availability: 'MAYBE' }, ctx),
    ).toContain('configuration:unknown_decoder_availability:MAYBE');
    expect(
      validateConfigurationItemProjection({ ...published, decoder_availability: null }, ctx),
    ).toContain('configuration:container_format_without_decoder_availability');

    const assessment = projectStaticConfigurationAssessment({ derivation, observations: [embeddedObservation()] });
    const assessmentCtx = {
      artifact_id: ARTIFACT_ID,
      analysis_run_id: RUN_ID,
      item_count: 1,
      candidate_count: 1,
      observed_count: 0,
      decoded_count: 0,
    };
    expect(validateStaticConfigurationAssessment(assessment, assessmentCtx)).toEqual([]);
    expect(
      validateStaticConfigurationAssessment({ ...assessment, decoder_availability: 'AVAILABLE' }, assessmentCtx),
    ).toContain('configuration:candidate_outcome_with_available_decoder');
  });

  it('15. decoding never promotes: no behavior, family, infrastructure or ATT&CK appears anywhere', () => {
    const derivation = configurationDerivation();
    const item = derivation.items[0]!;
    expect(item.basis).toBe('EMBEDDED_COMPILED_AUTOIT_RESOURCE');
    // The item exposes structural container facts only — no decoded field names.
    expect(Object.keys(item.attributes)).not.toContain('value');
    expect(item.attributes.content_digest).not.toBe(derivation.items[0]!.extracted_payload_sha256);
    const published = publishStaticConfigurationItem(item);
    expect(published.extracted_payload_sha256).toBe(derivedArtifact().derived_sha256);
    expect(published.decoder_availability).toBe('UNAVAILABLE');
  });
});

/** Read-back of the honest artifact's blocks (keeps the cases above terse). */
function dis(): DerivedArtifact {
  return derivedArtifact();
}
