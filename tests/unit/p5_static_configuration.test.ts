/**
 * Phase 5 — deterministic STATIC CONFIGURATION evidence layer tests.
 *
 * Locks the phase-5 contract:
 *  1. configuration without evidence / artifact id / run id  → rejected
 *  2. foreign artifact / foreign run                        → rejected
 *  3. nondeterministic id                                   → rejected
 *  4. raw indicator never becomes configuration
 *  5. a URL never becomes C2; configuration never becomes behavior / family /
 *     infrastructure
 *  6. an undecoded blob is never published as decoded configuration
 *  7. a rejected/unsupported structure is never published as empty configuration
 *  8. the read gate rejects a malformed configuration section and keeps a valid
 *     one visible
 *  9. identity is deterministic and run-scoped
 *
 * Synthetic identities only; no stored row is read, mutated or repaired.
 */
import { describe, it, expect } from 'bun:test';

import type { Observation } from '../../packages/intelligence/src/malware/canonical/observation';
import type { EvidenceRef } from '../../packages/intelligence/src/malware/canonical/provenance';
import type { EmbeddedObjectSection } from '../../packages/intelligence/src/malware/canonical/staticEvidenceProjection';
import { EMBEDDED_OBJECT_TYPE_BY_SIGNATURE } from '../../packages/intelligence/src/malware/canonical/staticEvidenceProjection';
import {
  STATIC_CONFIGURATION_EXTRACTION_SCOPE,
  STATIC_CONFIGURATION_LAYER_VERSION,
  StaticConfigurationLayerError,
  configurationIdentityFromProjection,
  deriveStaticConfigurationEvidence,
  projectStaticConfigurationAssessment,
  publishStaticConfigurationItem,
  validateConfigurationItemProjection,
  validateStaticConfigurationAssessment,
} from '../../packages/intelligence/src/malware/canonical/staticConfigurationLayer';
import {
  analyzeMalwareArtifact,
  buildAnalysisRunBinding,
  buildMalwareIntelligenceReport,
  buildPublicReportPayload,
  acquireMalwareSample,
} from '../../packages/intelligence/src/malware/canonical';
import { materializeCanonicalReport } from '../../packages/intelligence/src/malware/canonical/reportMaterialization';
import { validateStoredMalwareReport } from '../../packages/intelligence/src/malware/canonical/storedReportValidation';
import { CURRENT_MALWARE_REPORT_CONTRACT_VERSION } from '../../packages/intelligence/src/malware/canonical/reportContract';
import { processClaimsToBehaviors } from '../../packages/intelligence/src/malware/canonical/behaviorProcessor';
import { processEvidenceToClaims } from '../../packages/intelligence/src/malware/canonical/claimProcessor';
import { resolveMalwareFamily } from '../../packages/intelligence/src/malware/canonical/familyResolution';
import { correlateInfrastructure } from '../../packages/intelligence/src/malware/canonical/infrastructureCorrelation';
import type { Artifact } from '../../packages/intelligence/src/malware/canonical/artifact';

const RUN_ID = 'ar-p5-test-0001';
const OTHER_RUN_ID = 'ar-p5-test-0002';
const ARTIFACT_ID = 'art_p5_test_0001';
const OTHER_ARTIFACT_ID = 'art_p5_test_0002';
const ANALYZED_AT = '2026-09-23T00:00:00.000Z';
const AUTOIT_MAGIC = [0x41, 0x55, 0x33, 0x21, 0x45, 0x41, 0x30, 0x36]; // 'AU3!EA06'

function evidenceRef(runId: string, evidenceId = `ev_static_${runId}_1`): EvidenceRef {
  return {
    evidence_id: evidenceId,
    source_id: 'src_static_analyzer',
    source_snapshot_id: runId,
    kind: 'STATIC',
    authority_tier: 'TIER_1',
    reliability: 'A',
    credibility: '2',
    observed_at: ANALYZED_AT,
    retrieved_at: ANALYZED_AT,
    url: undefined,
    store_evidence_id: undefined,
  } as EvidenceRef;
}

function embeddedObservation(input: {
  run_id?: string;
  artifact_id?: string;
  signatures: string[];
  evidence_id?: string;
}): Observation {
  const runId = input.run_id ?? RUN_ID;
  const artifactId = input.artifact_id ?? ARTIFACT_ID;
  const attributes: Record<string, string | number | boolean | null> = {
    analysis_status: 'OBSERVED',
    embedded_object_count: input.signatures.length,
    resource_count: 26,
    byte_scan_capped: false,
  };
  input.signatures.forEach((signature, i) => {
    attributes[`embedded_object_${i}_signature`] = signature;
    attributes[`embedded_object_${i}_offset`] = 0xc71b8 + i;
    attributes[`embedded_object_${i}_size`] = 576146;
    attributes[`embedded_object_${i}_host_offset`] = 0xc71b8;
    attributes[`embedded_object_${i}_section`] = '.rsrc';
    attributes[`embedded_object_${i}_resource_type`] = 'RCDATA';
    attributes[`embedded_object_${i}_entropy`] = 7.9997;
  });
  const ref = evidenceRef(runId, input.evidence_id ?? `ev_static_${runId}_1`);
  return {
    observation_id: `obs_static_${artifactId}_embedded_objects_p5`,
    analysis_run_id: runId,
    artifact_id: artifactId,
    source: 'STATIC_ANALYSIS',
    observation_type: 'embedded_objects',
    attributes,
    observed_at: ANALYZED_AT,
    evidence_refs: [ref],
    provenance: {
      evidence_refs: [ref],
      source_ids: [ref.source_id],
      authority_tier: 'TIER_1',
      snapshot_ids: [runId],
      derived_at: ANALYZED_AT,
    },
  } as Observation;
}

/** A URL indicator observation — objective proof that indicators are not configuration. */
function indicatorObservation(runId = RUN_ID, artifactId = ARTIFACT_ID): Observation {
  const ref = evidenceRef(runId, `ev_static_${runId}_indicators`);
  return {
    observation_id: `obs_static_${artifactId}_string_indicators_p5`,
    analysis_run_id: runId,
    artifact_id: artifactId,
    source: 'STATIC_ANALYSIS',
    observation_type: 'string_indicators',
    attributes: {
      analysis_status: 'OBSERVED',
      indicator_count: 2,
      indicator_0_type: 'URL',
      indicator_0_value: 'https://example.invalid/config.php',
      indicator_1_type: 'DOMAIN',
      indicator_1_value: 'example.invalid',
    },
    observed_at: ANALYZED_AT,
    evidence_refs: [ref],
    provenance: {
      evidence_refs: [ref],
      source_ids: [ref.source_id],
      authority_tier: 'TIER_1',
      snapshot_ids: [runId],
      derived_at: ANALYZED_AT,
    },
  } as Observation;
}

function embeddedSectionFrom(observation: Observation): EmbeddedObjectSection {
  const count = Number(observation.attributes.embedded_object_count ?? 0);
  return {
    projection_version: 'test',
    observation_id: observation.observation_id,
    observation_status: String(observation.attributes.analysis_status),
    count,
    objects: Array.from({ length: count }, (_, i) => {
      const signature = String(observation.attributes[`embedded_object_${i}_signature`]);
      return {
        object_type: EMBEDDED_OBJECT_TYPE_BY_SIGNATURE[signature],
        signature,
        offset: Number(observation.attributes[`embedded_object_${i}_offset`]),
        host_offset: Number(observation.attributes[`embedded_object_${i}_host_offset`]),
        size_bytes: Number(observation.attributes[`embedded_object_${i}_size`]),
        host_section: String(observation.attributes[`embedded_object_${i}_section`]),
        host_resource_type: String(observation.attributes[`embedded_object_${i}_resource_type`]),
        entropy: Number(observation.attributes[`embedded_object_${i}_entropy`]),
        digest: { algorithm: 'sha256' as const, value: 'a'.repeat(64) },
        parent_artifact_id: observation.artifact_id,
        analysis_run_id: observation.analysis_run_id,
        evidence_id: observation.evidence_refs[0].evidence_id,
        observation_id: observation.observation_id,
        source_tool: 'STATIC_ANALYSIS',
        tool_version: '1.0.0-staticanalyzer-canonical',
        extracted: false as const,
        child_artifact_id: null,
      };
    }),
    coverage: {
      scanned_bytes: 58332,
      byte_scan_capped: false,
      overlay_bytes: 0,
      resource_count: 26,
      resource_total_bytes: 610780,
      resource_inventory_capped: false,
    },
    source: {
      source_tool: 'STATIC_ANALYSIS',
      tool_version: '1.0.0-staticanalyzer-canonical',
      evidence_ids: observation.evidence_refs.map((r) => r.evidence_id),
      artifact_id: observation.artifact_id,
      analysis_run_id: observation.analysis_run_id,
    },
    epistemic_status: 'STATIC_CANDIDATE',
  } as unknown as EmbeddedObjectSection;
}

function derivation(input: {
  signatures?: string[];
  run_id?: string;
  artifact_id?: string;
  observations?: Observation[];
}) {
  const runId = input.run_id ?? RUN_ID;
  const artifactId = input.artifact_id ?? ARTIFACT_ID;
  const embedded = embeddedObservation({
    run_id: runId,
    artifact_id: artifactId,
    signatures: input.signatures ?? ['compiled_autoit_script'],
  });
  const observations = [embedded, indicatorObservation(runId, artifactId), ...(input.observations ?? [])];
  const derived = deriveStaticConfigurationEvidence({
    artifact_id: artifactId,
    analysis_run_id: runId,
    embedded_objects: embeddedSectionFrom(embedded),
    observations,
    derived_at: ANALYZED_AT,
  });
  return { derived, observations, artifact_id: artifactId, run_id: runId };
}

/** The canonical item as the report publishes it (the real publication mapping). */
function publishedItem(item: ReturnType<typeof derivation>['derived']['items'][number]) {
  return publishStaticConfigurationItem(item);
}

describe('phase 5 — static configuration layer', () => {
  it('1. a configuration-bearing container yields a lineaged candidate item, never values', () => {
    const { derived } = derivation({});
    expect(derived.outcome).toBe('CONFIGURATION_CANDIDATE');
    expect(derived.items).toHaveLength(1);
    const item = derived.items[0];
    expect(item.configuration_type).toBe('embedded_script_configuration');
    expect(item.epistemic_status).toBe('STATIC_CANDIDATE');
    expect(item.undecoded_reason).toBe('UNDECODED_STATIC_BLOB');
    expect(item.value).toBeNull();
    expect(item.raw_value).toBeNull();
    expect(item.normalized_value).toBeNull();
    expect(item.evidence_ids.length).toBeGreaterThan(0);
    expect(item.observation_id).toContain('embedded_objects');
    expect(item.attributes.resource_type).toBe('RCDATA');
    expect(validateConfigurationItemProjection(publishedItem(item), {
      artifact_id: ARTIFACT_ID,
      analysis_run_id: RUN_ID,
    })).toEqual([]);
  });

  it('2. configuration without evidence is rejected (never published unbacked)', () => {
    const { derived } = derivation({});
    const item = { ...publishedItem(derived.items[0]), evidence_id: '', evidence_ids: [] };
    const errors = validateConfigurationItemProjection(item, { artifact_id: ARTIFACT_ID, analysis_run_id: RUN_ID });
    expect(errors).toContain('configuration:evidence_id_missing');
    expect(errors).toContain('configuration:evidence_ids_missing');
  });

  it('3. configuration without artifact id or run id is rejected', () => {
    const { derived } = derivation({});
    const base = publishedItem(derived.items[0]);
    expect(
      validateConfigurationItemProjection({ ...base, artifact_id: '' }, { artifact_id: ARTIFACT_ID, analysis_run_id: RUN_ID })
    ).toContain('configuration:artifact_mismatch:');
    expect(
      validateConfigurationItemProjection({ ...base, analysis_run_id: '' }, { artifact_id: ARTIFACT_ID, analysis_run_id: RUN_ID })
    ).toContain('configuration:run_mismatch:');
  });

  it('4. a foreign artifact is rejected (cross-artifact isolation)', () => {
    const { derived } = derivation({});
    const foreign = { ...publishedItem(derived.items[0]), artifact_id: OTHER_ARTIFACT_ID };
    expect(
      validateConfigurationItemProjection(foreign, { artifact_id: ARTIFACT_ID, analysis_run_id: RUN_ID })
    ).toContain(`configuration:artifact_mismatch:${OTHER_ARTIFACT_ID}`);
    // The projection refuses to publish another artifact's/run's item at all.
    expect(() =>
      projectStaticConfigurationAssessment({
        derivation: { ...derived, items: [{ ...derived.items[0], artifact_id: OTHER_ARTIFACT_ID }] },
        observations: [embeddedObservation({ signatures: ['compiled_autoit_script'] })],
      })
    ).toThrow(StaticConfigurationLayerError);
  });

  it('5. a foreign run is rejected (cross-run isolation)', () => {
    const other = derivation({ run_id: OTHER_RUN_ID, artifact_id: ARTIFACT_ID });
    const embeddedOther = embeddedObservation({ run_id: OTHER_RUN_ID, artifact_id: ARTIFACT_ID, signatures: ['compiled_autoit_script'] });
    const foreign = { ...publishedItem(other.derived.items[0]) };
    expect(
      validateConfigurationItemProjection(foreign, { artifact_id: ARTIFACT_ID, analysis_run_id: RUN_ID })
    ).toContain(`configuration:run_mismatch:${OTHER_RUN_ID}`);
    expect(() =>
      projectStaticConfigurationAssessment({
        derivation: other.derived,
        observations: [embeddedOther],
      })
    ).not.toThrow(); // its OWN run's observation is valid …
    expect(() =>
      projectStaticConfigurationAssessment({
        derivation: other.derived,
        observations: [embeddedObservation({ signatures: ['compiled_autoit_script'] })], // the OTHER run's observation
      })
    ).toThrow(StaticConfigurationLayerError);
  });

  it('6. a forged or nondeterministic configuration id is rejected', () => {
    const { derived } = derivation({});
    const item = { ...publishedItem(derived.items[0]), configuration_id: 'cfg_forged' };
    expect(
      validateConfigurationItemProjection(item, { artifact_id: ARTIFACT_ID, analysis_run_id: RUN_ID })
    ).toContain('configuration:nondeterministic_id');
    expect(derived.items[0].configuration_id).toBe(
      configurationIdentityFromProjection({
        artifact_id: ARTIFACT_ID,
        analysis_run_id: RUN_ID,
        configuration_type: 'embedded_script_configuration',
        canonical_value: derived.items[0].identity_anchor,
        evidence_ids: derived.items[0].evidence_ids,
      })
    );
  });

  it('7. identity is deterministic and run-scoped', () => {
    const first = derivation({}).derived;
    const second = derivation({}).derived;
    expect(second.items.map((i) => i.configuration_id)).toEqual(first.items.map((i) => i.configuration_id));
    expect(JSON.stringify(second.items)).toBe(JSON.stringify(first.items));
    const otherRun = derivation({ run_id: OTHER_RUN_ID }).derived;
    expect(otherRun.items[0].configuration_id).not.toBe(first.items[0].configuration_id);
  });

  it('8. raw indicators (URL / domain) never become configuration', () => {
    // Only a non-configuration-bearing container plus URL/domain indicators.
    const { derived } = derivation({ signatures: ['embedded_pe'] });
    expect(derived.items).toEqual([]);
    expect(derived.outcome).toBe('NO_RESULT');
    expect(derived.containers_considered.map((c) => [c.object_type, c.configuration_bearing])).toEqual([
      ['NESTED_PE', false],
    ]);
    expect(JSON.stringify(derived)).not.toContain('example.invalid');
  });

  it('9. a URL never becomes C2 and configuration never becomes behavior, family or infrastructure', () => {
    const { derived, observations, artifact_id } = derivation({});
    const artifact = {
      artifact_id,
      identity_key: `sha256:${'b'.repeat(64)}`,
      format_class: 'PE',
      file_names: ['p5.bin'],
      hashes: { sha256: 'b'.repeat(64) },
      format_attributes: {},
      provenance: { evidence_refs: [], source_ids: [], authority_tier: 'TIER_2', snapshot_ids: [], derived_at: ANALYZED_AT },
    } as unknown as Artifact;

    // No item invents a C2 role and no attribute fabricates a network field.
    for (const item of derived.items) {
      expect(item.configuration_type).not.toContain('c2');
      expect(Object.keys(item.attributes)).not.toContain('url');
      expect(Object.keys(item.attributes)).not.toContain('c2');
    }

    // The deterministic layers that COULD promote a configuration do not.
    const claims = processEvidenceToClaims({
      analysis_run_id: RUN_ID,
      artifact,
      observations,
      processed_at: ANALYZED_AT,
    });
    const behaviors = processClaimsToBehaviors({
      analysis_run_id: RUN_ID,
      artifact,
      claims: claims.new_claims,
      processed_at: ANALYZED_AT,
    });
    expect(behaviors.new_behaviors).toEqual([]);

    const family = resolveMalwareFamily({
      analysis_run_id: RUN_ID,
      artifact,
      candidates: [],
      claims: claims.new_claims,
      behaviors: behaviors.new_behaviors,
      configurations: derived.configurations,
      observations,
      resolved_at: ANALYZED_AT,
    });
    expect(family.resolution_state).toBe('UNRESOLVED');
    expect(family.resolved_family).toBeNull();

    const infrastructureWith = correlateInfrastructure({
      analysis_run_id: RUN_ID,
      artifact,
      claims: claims.new_claims,
      behaviors: behaviors.new_behaviors,
      configurations: derived.configurations,
      observations,
      correlated_at: ANALYZED_AT,
    });
    const infrastructureWithout = correlateInfrastructure({
      analysis_run_id: RUN_ID,
      artifact,
      claims: claims.new_claims,
      behaviors: behaviors.new_behaviors,
      configurations: [],
      observations,
      correlated_at: ANALYZED_AT,
    });
    // The configuration items contribute NO relationship at all …
    expect(infrastructureWith.new_relationships).toEqual([]);
    expect(infrastructureWith.new_relationships).toEqual(infrastructureWithout.new_relationships);
    // … they are considered and EXPLICITLY rejected (never silently dropped),
    // with the canonical reason that a structural string is not infrastructure.
    const configurationRejections = infrastructureWith.rejected_inputs.filter(
      (r) => r.source_kind === 'configuration'
    );
    expect(configurationRejections.length).toBeGreaterThan(0);
    expect(configurationRejections[0].reason_code).toBe('no_infrastructure_semantics');
    // … and no relationship promotes a value into a C2 role.
    expect(infrastructureWith.new_relationships.filter((r) => r.role === 'C2')).toEqual([]);
  });

  it('10. an undecoded blob is never published as decoded configuration', () => {
    const { derived } = derivation({});
    const item = derived.items[0];
    expect(item.epistemic_status).toBe('STATIC_CANDIDATE');
    expect(item.undecoded_reason).toBe('UNDECODED_STATIC_BLOB');

    // A candidate that carries a value field is rejected outright …
    const withValue = { ...publishedItem(item), value: 'https://example.invalid/c2', normalized_value: 'https://example.invalid/c2' };
    const errors = validateConfigurationItemProjection(withValue, { artifact_id: ARTIFACT_ID, analysis_run_id: RUN_ID });
    expect(errors).toContain('configuration:candidate_with_value');

    // … and the canonical contract refuses an undecoded blob that carries data.
    expect(derived.configurations[0].extraction?.undecoded_reason).toBe('UNDECODED_STATIC_BLOB');
    expect(derived.configurations[0].extraction?.raw_value).toBeNull();
    expect(derived.configurations[0].extraction?.normalized_value).toBeNull();
    // Neither an executed nor an observed state is claimed for a blocker.
    expect(item.epistemic_status).not.toBe('STATIC_OBSERVED');
    expect(item.epistemic_status).not.toBe('STATIC_DECODED');
  });

  it('11. an unmapped or failing structure is not represented as an empty configuration', () => {
    const embedded = embeddedObservation({ signatures: ['compiled_autoit_script'] });
    // An embedded object type this layer has no rule for is rejected explicitly.
    const section = embeddedSectionFrom(embedded);
    const forged = {
      ...section,
      objects: [{ ...section.objects[0], object_type: 'NOT_A_CANONICAL_TYPE' as never }],
    };
    const derived = deriveStaticConfigurationEvidence({
      artifact_id: ARTIFACT_ID,
      analysis_run_id: RUN_ID,
      embedded_objects: forged,
      observations: [embedded],
      derived_at: ANALYZED_AT,
    });
    expect(derived.items).toEqual([]);
    expect(derived.rejected.map((r) => r.reason_code)).toContain('unknown_configuration_container');

    // An ERROR outcome that carries items is a contradiction, and is rejected.
    const { derived: ok, observations } = derivation({});
    const assessment = projectStaticConfigurationAssessment({ derivation: ok, observations });
    const contradictory = { ...assessment, outcome: 'ERROR' };
    expect(
      validateStaticConfigurationAssessment(contradictory, {
        artifact_id: ARTIFACT_ID,
        analysis_run_id: RUN_ID,
        item_count: ok.items.length,
        candidate_count: assessment.candidate_count,
        observed_count: assessment.observed_count,
        decoded_count: assessment.decoded_count,
      })
    ).toContain('configuration:items_without_observable_outcome:ERROR');
    // A rewritten extraction scope is rejected: the scope is part of the claim.
    expect(
      validateStaticConfigurationAssessment({ ...assessment, extraction_scope: 'everything' }, {
        artifact_id: ARTIFACT_ID,
        analysis_run_id: RUN_ID,
        item_count: ok.items.length,
        candidate_count: assessment.candidate_count,
        observed_count: assessment.observed_count,
        decoded_count: assessment.decoded_count,
      })
    ).toContain('configuration:extraction_scope_missing_or_rewritten');
    expect(assessment.extraction_scope).toBe(STATIC_CONFIGURATION_EXTRACTION_SCOPE);
    expect(assessment.outcome).toBe('CONFIGURATION_CANDIDATE');
  });

  it('12. no statically recoverable configuration is NO_RESULT, never "no configuration exists"', () => {
    const { derived } = derivation({ signatures: ['zip_archive'] });
    expect(derived.outcome).toBe('NO_RESULT');
    expect(derived.outcome_reason).toContain('no statically recoverable configuration was identified within the supported extraction scope');
    expect(derived.outcome_reason).not.toContain('no configuration exists');
    expect(derived.items).toEqual([]);
  });

  it('13. an absent extraction plane is UNAVAILABLE, and no containers is NOT_APPLICABLE', () => {
    // No embedded-object observation for this run ⇒ the plane did not run.
    const unavailable = deriveStaticConfigurationEvidence({
      artifact_id: ARTIFACT_ID,
      analysis_run_id: RUN_ID,
      embedded_objects: embeddedSectionFrom(embeddedObservation({ signatures: ['compiled_autoit_script'] })),
      observations: [],
      derived_at: ANALYZED_AT,
    });
    expect(unavailable.outcome).toBe('UNAVAILABLE');
    // No container-capable structure at all ⇒ the scope does not apply.
    const emptySection = { ...embeddedSectionFrom(embeddedObservation({ signatures: [] })), count: 0, objects: [] };
    const notApplicable = deriveStaticConfigurationEvidence({
      artifact_id: ARTIFACT_ID,
      analysis_run_id: RUN_ID,
      embedded_objects: emptySection as EmbeddedObjectSection,
      observations: [embeddedObservation({ signatures: [] })],
      derived_at: ANALYZED_AT,
    });
    expect(notApplicable.outcome).toBe('NOT_APPLICABLE');
    expect(notApplicable.items).toEqual([]);
  });

  it('14. the assessment counts must agree with the published items', () => {
    const { derived, observations } = derivation({});
    const assessment = projectStaticConfigurationAssessment({ derivation: derived, observations });
    const ctx = {
      artifact_id: ARTIFACT_ID,
      analysis_run_id: RUN_ID,
      item_count: derived.items.length,
      candidate_count: assessment.candidate_count,
      observed_count: assessment.observed_count,
      decoded_count: assessment.decoded_count,
    };
    expect(validateStaticConfigurationAssessment(assessment, ctx)).toEqual([]);
    expect(validateStaticConfigurationAssessment({ ...assessment, count: 5 }, ctx)).toContain('configuration:count_mismatch:5');
    expect(
      validateStaticConfigurationAssessment({ ...assessment, outcome: 'NO_RESULT', outcome_reason: 'nothing' }, ctx)
    ).toContain('configuration:outcome_candidate_mismatch:NO_RESULT');
    // A statically derived item may never be published without its assessment.
    const malformed = { ...derived.items[0], epistemic_status: 'TURBO' };
    expect(
      validateConfigurationItemProjection(malformed, { artifact_id: ARTIFACT_ID, analysis_run_id: RUN_ID })
    ).toContain('configuration:unknown_epistemic_status:TURBO');
  });
});

// ── Integration through the real write path and the stored-report read gate ──

const AT = '2026-09-23T00:00:00.000Z';

/** The verbatim tool table the analysis plane returns for this fixture. */
function containerResults(artifactId: string, sha: string) {
  return ['lief', 'floss', 'die', 'yara-x', 'capa'].map((tool_id) => ({
    tool_id,
    tool_version: null,
    status: 'UNAVAILABLE' as const,
    output: null,
    note: 'the analysis plane was unavailable for this configuration test',
    provenance: {
      tool_id,
      tool_version: null,
      analysis_run_id: RUN_ID,
      artifact_id: artifactId,
      input_sha256: sha,
      runner_identity: 'p5-test',
      ruleset_version: null,
      ruleset_digest: null,
      tool_binary_digest: null,
    },
  }));
}

function makeArtifact(): Artifact {
  return {
    artifact_id: ARTIFACT_ID,
    identity_key: `sha256:${'c'.repeat(64)}`,
    format_class: 'PE',
    file_names: ['p5_sample.bin'],
    hashes: { sha256: 'c'.repeat(64) },
    mime_type: 'application/octet-stream',
    format_attributes: {},
    provenance: { evidence_refs: [], source_ids: [], authority_tier: 'TIER_2', snapshot_ids: [], derived_at: AT },
  } as unknown as Artifact;
}

/** Minimal PE32+ fixture carrying the compiled-AutoIt magic in its trailing bytes. */
function buildPeWithAutoit(): Uint8Array {
  const peOff = 0x40;
  const optSize = 112 + 16 * 8;
  const headerSize = peOff + 24 + optSize + 40;
  const text = new TextEncoder().encode('p5-config-fixture');
  const trailing = new Uint8Array(AUTOIT_MAGIC);
  const pe = new Uint8Array(headerSize + 0x400 + text.length + trailing.length);
  pe[0] = 0x4d;
  pe[1] = 0x5a;
  const dv = new DataView(pe.buffer);
  dv.setUint32(0x3c, peOff, true);
  pe[peOff] = 0x50;
  pe[peOff + 1] = 0x45;
  dv.setUint16(peOff + 4, 0x8664, true);
  dv.setUint16(peOff + 6, 1, true);
  dv.setUint32(peOff + 8, 0x678f0000, true);
  dv.setUint16(peOff + 20, optSize, true);
  const opt = peOff + 24;
  dv.setUint16(opt, 0x20b, true);
  dv.setUint32(opt + 16, 0x1000, true);
  pe[opt + 2] = 14;
  pe[opt + 3] = 29;
  const st = opt + optSize;
  const secOff = headerSize;
  const name = '.text';
  for (let j = 0; j < name.length; j++) pe[st + j] = name.charCodeAt(j);
  dv.setUint32(st + 8, 0x1000, true);
  dv.setUint32(st + 16, 0x400, true);
  dv.setUint32(st + 20, secOff, true);
  pe.fill(0x41, secOff, secOff + 0x400);
  pe.set(text, secOff + 16);
  pe.set(trailing, pe.length - trailing.length);
  return pe;
}

async function sha256Hex(bytes: Uint8Array): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', bytes as unknown as ArrayBuffer);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

describe('phase 5 — configuration in the canonical report and read gate', () => {
  it('15. the write path publishes the assessment + candidate item and keeps behavior/family/infrastructure empty', async () => {
    const bytes = buildPeWithAutoit();
    const sha = await sha256Hex(bytes);
    const artifactId = `art_gmf_${sha.slice(0, 16)}`;
    const materialization = await materializeCanonicalReport({
      job: { job_id: 'job_p5', analysis_run_id: RUN_ID, artifact_id: artifactId, sha256: sha, toolchain_version: null },
      rawBytes: bytes,
      container_results: containerResults(artifactId, sha),
      runner_identity: 'p5-test',
      acquisition_context: { source_sample_id: 'p5_holdout', file_names: ['p5_holdout.bin'], size_bytes: bytes.length },
      mapping_catalog: [],
      analyzed_at: AT,
      generated_at: AT,
    });
    expect(materialization.status).toBe('MATERIALIZED');
    const payload = materialization.public_payload as Record<string, any>;
    expect(payload.report_version).toBe(CURRENT_MALWARE_REPORT_CONTRACT_VERSION);

    const configuration = payload.configuration;
    expect(configuration.assessment).toBeDefined();
    expect(configuration.assessment.projection_version).toBe(STATIC_CONFIGURATION_LAYER_VERSION);
    expect(configuration.items.length).toBeGreaterThan(0);
    const item = configuration.items[0];
    expect(item.epistemic_status).toBe('STATIC_CANDIDATE');
    expect(item.undecoded_reason).toBe('UNDECODED_STATIC_BLOB');
    expect(item.value).toBeNull();
    expect(item.evidence_ids.length).toBeGreaterThan(0);
    expect(item.artifact_id).toBe(artifactId);
    expect(item.analysis_run_id).toBe(RUN_ID);

    // No promotion anywhere.
    expect(payload.behaviors.items).toEqual([]);
    expect(payload.family.resolution_state).toBe('UNRESOLVED');
    expect(payload.infrastructure.items).toEqual([]);
    expect(payload.attack_mbc.items).toEqual([]);
    expect(payload.grounding.all_statements_grounded).toBe(true);
  });

  it('16. the read gate keeps a valid static configuration visible and rejects a malformed one', async () => {
    const bytes = buildPeWithAutoit();
    const sha = await sha256Hex(bytes);
    const artifactId = `art_gmf_${sha.slice(0, 16)}`;
    const materialization = await materializeCanonicalReport({
      job: { job_id: 'job_p5b', analysis_run_id: RUN_ID, artifact_id: artifactId, sha256: sha, toolchain_version: null },
      rawBytes: bytes,
      container_results: containerResults(artifactId, sha),
      runner_identity: 'p5-test',
      acquisition_context: { source_sample_id: 'p5_holdout', file_names: ['p5_holdout.bin'], size_bytes: bytes.length },
      mapping_catalog: [],
      analyzed_at: AT,
      generated_at: AT,
    });
    expect(materialization.status).toBe('MATERIALIZED');
    const stored = {
      ...(materialization.public_payload as Record<string, any>),
      overall_status: 'SUCCEEDED',
      tool_results: materialization.tool_results,
    };
    const gate = (p: Record<string, any>) =>
      validateStoredMalwareReport({ stored_id: String(p.report_id), stored_sha256: p.sha256, payload: p });

    expect(gate(stored)).toEqual([]);

    // A forged identity, a foreign run citation and a value on a blocked candidate
    // are each rejected, and the assessment cannot be silently dropped.
    const forged = JSON.parse(JSON.stringify(stored));
    forged.configuration.items[0].configuration_id = 'cfg_forged';
    forged.configuration.items[0].analysis_run_id = OTHER_RUN_ID;
    forged.configuration.items[0].value = 'https://example.invalid/c2';
    forged.configuration.items[0].normalized_value = 'https://example.invalid/c2';
    const errors = gate(forged);
    expect(errors).toContain('configuration:nondeterministic_id');
    expect(errors).toContain(`configuration:run_mismatch:${OTHER_RUN_ID}`);
    expect(errors).toContain('configuration:candidate_with_value');

    const stripped = JSON.parse(JSON.stringify(stored));
    delete stripped.configuration.assessment;
    expect(gate(stripped)).toContain(
      `contract:missing_required_field:${CURRENT_MALWARE_REPORT_CONTRACT_VERSION}:configuration.assessment`
    );
  });

  it('17. the pipeline never turns a configuration item into a behavior or a family', () => {
    const acquisition = acquireMalwareSample({
      metadata: {
        source: 'MALWAREBAZAAR',
        source_sample_id: 'p5_holdout',
        declared_sha256: 'd'.repeat(64),
        file_name: 'p5_holdout.bin',
        first_seen: AT,
      },
      raw: { downloaded_sha256: 'd'.repeat(64) },
      acquired_at: AT,
    });
    const artifact = acquisition.artifact!;
    const pipeline = analyzeMalwareArtifact({
      analysis_run_id: RUN_ID,
      run_binding: buildAnalysisRunBinding({ analysis_run_id: RUN_ID, job_id: 'job_p5c', artifact }),
      artifact,
      rawBytes: buildPeWithAutoit(),
      analyzed_at: AT,
    });
    const report = buildMalwareIntelligenceReport({ acquisition, pipeline, generated_at: AT });
    const payload = buildPublicReportPayload(report);

    const staticItems = pipeline.static_configuration.items;
    expect(staticItems.length).toBeGreaterThan(0);
    for (const item of staticItems) {
      expect(item.epistemic_status).toBe('STATIC_CANDIDATE');
      expect(pipeline.behaviors.new_behaviors.map((b) => b.behavior_id)).not.toContain(item.configuration_id);
    }
    expect(pipeline.behaviors.new_behaviors).toEqual([]);
    expect(pipeline.family_resolution.resolution_state).toBe('UNRESOLVED');
    expect(pipeline.infrastructure.new_relationships).toEqual([]);
    expect(pipeline.attack_mbc.new_mappings).toEqual([]);
    // The canonical list carries the static items exactly once.
    const ids = pipeline.configurations.new_configurations.map((c) => c.configuration_id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids).toContain(staticItems[0].configuration_id);
    expect(payload.configuration.items.length).toBe(ids.length);
    expect(report.grounding.all_statements_grounded).toBe(true);
  });
});
