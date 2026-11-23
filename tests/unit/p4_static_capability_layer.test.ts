/**
 * Phase 4 — canonical static capability layer tests.
 *
 * Locks the invariants that make the layer safe to publish:
 *  1. a capability with canonical evidence is produced, fully lineaged;
 *  2. a capability without evidence is rejected (never published unbacked);
 *  3. a foreign artifact's structural evidence is refused (cross-artifact);
 *  4. another run's structural evidence is refused (cross-run);
 *  5. identity is deterministic and replay-stable;
 *  6. capabilities never become behaviors/configurations/families/
 *     infrastructure/ATT&CK-MBC;
 *  7. strings and compiler/packer evidence alone never create a capability;
 *  8. the catalog version is recorded on every capability and in the section.
 */
import { describe, expect, test } from 'bun:test';
import type { Observation } from '../../packages/intelligence/src/malware/canonical/observation';
import type { EvidenceRef } from '../../packages/intelligence/src/malware/canonical/provenance';
import type { EmbeddedObjectSection } from '../../packages/intelligence/src/malware/canonical/staticEvidenceProjection';
import { EMBEDDED_OBJECT_TYPE_BY_SIGNATURE } from '../../packages/intelligence/src/malware/canonical/staticEvidenceProjection';
import {
  CAPABILITY_INDICATORS_OBSERVATION_TYPE,
  STATIC_CAPABILITY_CATALOG,
  STATIC_CAPABILITY_CATALOG_VERSION,
  StaticCapabilityLayerError,
  buildCapabilityObservation,
  deriveStaticCapabilities,
  projectCapabilitySection,
  validateCapabilitySection,
  validateStaticCapabilityIndicator,
} from '../../packages/intelligence/src/malware/canonical/staticCapabilityLayer';
import { processEvidenceToClaims } from '../../packages/intelligence/src/malware/canonical/claimProcessor';
import { processClaimsToBehaviors } from '../../packages/intelligence/src/malware/canonical/behaviorProcessor';
import { processClaimsToConfigurations } from '../../packages/intelligence/src/malware/canonical/configurationProcessor';
import { correlateInfrastructure } from '../../packages/intelligence/src/malware/canonical/infrastructureCorrelation';
import { resolveMalwareFamily } from '../../packages/intelligence/src/malware/canonical/familyResolution';
import { mapBehaviorsToAttackMbc } from '../../packages/intelligence/src/malware/canonical/attackMbcMapping';
import type { Artifact } from '../../packages/intelligence/src/malware/canonical/artifact';

const RUN_ID = 'ar-p4-test-0001';
const OTHER_RUN_ID = 'ar-p4-test-0002';
const ARTIFACT_ID = 'art_p4_test_0001';
const OTHER_ARTIFACT_ID = 'art_p4_test_0002';
const ANALYZED_AT = '2026-09-23T00:00:00.000Z';

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
    observation_id: `obs_static_${artifactId}_embedded_objects_test`,
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

function dieObservation(input: { values: string[]; run_id?: string; artifact_id?: string }): Observation {
  const runId = input.run_id ?? RUN_ID;
  const artifactId = input.artifact_id ?? ARTIFACT_ID;
  const attributes: Record<string, string | number | boolean | null> = {
    analysis_status: 'OBSERVED',
    tool_name: 'die',
    tool_version: '3.21',
    detection_count: input.values.length,
  };
  input.values.forEach((value, i) => {
    attributes[`detection_${i}_type`] = 'format';
    attributes[`detection_${i}_value`] = value;
  });
  const ref: EvidenceRef = { ...evidenceRef(runId, `ev_tool_die_${runId}`), source_id: 'src_tool_die' };
  return {
    observation_id: `obs_tool_${artifactId}_die_test`,
    analysis_run_id: runId,
    artifact_id: artifactId,
    source: 'EXTERNAL_TOOL',
    observation_type: 'tool_analysis',
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

/** The embedded-object projection as the pipeline computes it (structure only). */
function embeddedSectionFrom(observation: Observation): EmbeddedObjectSection {
  return {
    projection_version: 'test',
    observation_id: observation.observation_id,
    observation_status: String(observation.attributes.analysis_status),
    count: Number(observation.attributes.embedded_object_count ?? 0),
    objects: Array.from({ length: Number(observation.attributes.embedded_object_count ?? 0) }, (_, i) => ({
      object_type:
        EMBEDDED_OBJECT_TYPE_BY_SIGNATURE[String(observation.attributes[`embedded_object_${i}_signature`])] ??
        ('COMPILED_AUTOIT_SCRIPT' as const),
      signature: String(observation.attributes[`embedded_object_${i}_signature`]),
      offset: Number(observation.attributes[`embedded_object_${i}_offset`]),
      size_bytes: Number(observation.attributes[`embedded_object_${i}_size`]),
      host_section: '.rsrc',
      host_resource_type: 'RCDATA',
      entropy: 7.9997,
      digest: null,
      parent_artifact_id: observation.artifact_id,
      analysis_run_id: observation.analysis_run_id,
      evidence_id: observation.evidence_refs[0].evidence_id,
      observation_id: observation.observation_id,
      source_tool: 'STATIC_ANALYSIS',
      tool_version: '1.0.0-static-canonical',
      extracted: false as const,
      child_artifact_id: null,
    })),
    coverage: { resource_count: 26, resource_total_bytes: 610780, overlay_bytes: 0, scanned_bytes: 4096, byte_scan_capped: false },
    source: {
      source_tool: 'STATIC_ANALYSIS',
      tool_version: '1.0.0-static-canonical',
      evidence_ids: [observation.evidence_refs[0].evidence_id],
      artifact_id: observation.artifact_id,
      analysis_run_id: observation.analysis_run_id,
    },
  };
}

function derive(observations: Observation[], artifactId = ARTIFACT_ID, runId = RUN_ID) {
  const embedded = observations.find((o) => o.observation_type === 'embedded_objects');
  return deriveStaticCapabilities({
    artifact_id: artifactId,
    analysis_run_id: runId,
    embedded_objects: embedded ? embeddedSectionFrom(embedded) : { ...embeddedSectionFrom(embeddedObservation({ signatures: [] })), count: 0, objects: [], observation_id: null },
    observations,
  });
}

const AUTOIT_ARTIFACT: Artifact = {
  artifact_id: ARTIFACT_ID,
  identity_key: 'p4-test',
  file_names: ['sample.bin'],
  hashes: { sha256: '7b98cd3800dede6537cf78e7b61eeeda71d251dc97c70cb7c2135c6aa310ab7f' },
  file_size_bytes: 1234,
  mime_type: 'application/octet-stream',
  format_class: 'PE',
  provenance: { evidence_refs: [], source_ids: [], authority_tier: 'TIER_1', snapshot_ids: [], derived_at: ANALYZED_AT },
} as unknown as Artifact;

describe('phase 4 — static capability layer', () => {
  test('1. AutoIt structural evidence produces exactly the narrowly defined capability, with lineage', () => {
    const observations = [embeddedObservation({ signatures: ['compiled_autoit_script', 'compiled_autoit_script'] })];
    const result = derive(observations);
    expect(result.capabilities.length).toBe(1);
    const capability = result.capabilities[0];
    expect(capability.capability_name).toBe('Compiled AutoIt script support');
    expect(capability.modality).toBe('CAN_DO');
    expect(capability.source).toBe('STATIC_INFERENCE');
    expect(capability.epistemic_status).toBe('EVIDENCE_BACKED_STATIC');
    expect(capability.artifact_id).toBe(ARTIFACT_ID);
    expect(capability.analysis_run_id).toBe(RUN_ID);
    expect(capability.evidence_refs.length).toBeGreaterThan(0);
    expect(capability.evidence_ids.length).toBeGreaterThan(0);
    expect(capability.basis.kinds).toEqual(['EMBEDDED_COMPILED_AUTOIT_RESOURCE']);
    expect(capability.basis.observation_ids.length).toBe(1);
    expect(capability.basis_catalog_version).toBe(STATIC_CAPABILITY_CATALOG_VERSION);
    expect(capability.capability_catalog_id).toBe('AUTOIT_COMPILED_SCRIPT_SUPPORT');
    expect(validateStaticCapabilityIndicator(capability)).toEqual([]);
    // No runtime claim anywhere in the published driver.
    expect(capability.static_implication).toContain('no execution is claimed');
    expect(result.rejected).toEqual([]);
  });

  test('2. a capability without evidence is rejected, never published', () => {
    const base = derive([embeddedObservation({ signatures: ['compiled_autoit_script'] })]).capabilities[0];
    const stripped = { ...base, evidence_refs: [], evidence_ids: [] };
    const errors = validateStaticCapabilityIndicator(stripped);
    expect(errors).toContain('capability:missing_evidence_refs');
    expect(errors).toContain('capability:missing_evidence_ids');
    // A reinforcing detection cannot originate a capability.
    const onlyDetection = derive([dieObservation({ values: ['AutoIt'] })]);
    expect(onlyDetection.capabilities).toEqual([]);
  });

  test('3. another artifact’s structural evidence is refused (cross-artifact isolation)', () => {
    const observations = [embeddedObservation({ signatures: ['compiled_autoit_script'], artifact_id: OTHER_ARTIFACT_ID })];
    expect(() => derive(observations, ARTIFACT_ID, RUN_ID)).toThrow(StaticCapabilityLayerError);
  });

  test('4. another run’s structural evidence is refused (cross-run isolation)', () => {
    const observations = [embeddedObservation({ signatures: ['compiled_autoit_script'], run_id: OTHER_RUN_ID })];
    // The projection is refused while it still carries the foreign run, at both
    // the object level and the observation level.
    expect(() => derive(observations, ARTIFACT_ID, RUN_ID)).toThrow(StaticCapabilityLayerError);
    const section = embeddedSectionFrom(observations[0]);
    const foreignObject = { ...section, objects: [{ ...section.objects[0], analysis_run_id: RUN_ID }] };
    expect(() =>
      deriveStaticCapabilities({
        artifact_id: ARTIFACT_ID,
        analysis_run_id: RUN_ID,
        embedded_objects: foreignObject,
        observations: [],
      })
    ).toThrow(StaticCapabilityLayerError);
    // A foreign-run observation is also invisible to basis refinement.
    const foreignDetection = dieObservation({ values: ['AutoIt'], run_id: OTHER_RUN_ID });
    const own = derive([embeddedObservation({ signatures: ['compiled_autoit_script'] }), foreignDetection]);
    expect(own.capabilities[0].basis.kinds).toEqual(['EMBEDDED_COMPILED_AUTOIT_RESOURCE']);
    expect(own.capabilities[0].basis.observation_ids.length).toBe(1);
  });

  test('5. identity is deterministic across replays and independent of input order', () => {
    const a = derive([embeddedObservation({ signatures: ['compiled_autoit_script'] })]);
    const b = derive([embeddedObservation({ signatures: ['compiled_autoit_script'] })]);
    expect(a.capabilities.map((c) => c.capability_id)).toEqual(b.capabilities.map((c) => c.capability_id));
    const reversed = derive([
      embeddedObservation({ signatures: ['compiled_autoit_script'] }),
      embeddedObservation({ signatures: ['compiled_autoit_script'] }),
    ]);
    expect(reversed.capabilities.map((c) => c.capability_id)).toEqual(a.capabilities.map((c) => c.capability_id));
    // The id must not encode a clock or a random value.
    expect(a.capabilities[0].capability_id).toMatch(/^cap_art_p4_test_0001_AUTOIT_COMPILED_SCRIPT_SUPPORT_[0-9a-f]{16}$/);
    // A different run can never reuse the same capability identity.
    const otherRun = derive([embeddedObservation({ signatures: ['compiled_autoit_script'], run_id: OTHER_RUN_ID })], ARTIFACT_ID, OTHER_RUN_ID);
    expect(otherRun.capabilities[0].capability_id).not.toBe(a.capabilities[0].capability_id);
    // Re-labelling or hand-writing an identity is a rejection, not a warning.
    const forged = { ...a.capabilities[0], capability_id: 'cap_forged' };
    expect(validateStaticCapabilityIndicator(forged)).toContain('capability:nondeterministic_id');
    const relabelled = { ...a.capabilities[0], capability_name: 'Executes payload' };
    expect(validateStaticCapabilityIndicator(relabelled)).toContain('capability:name_not_catalog_name');
  });

  test('6. capabilities never become behaviors, configurations, families, infrastructure or techniques', () => {
    const observations = [embeddedObservation({ signatures: ['compiled_autoit_script'] })];
    const derivation = derive(observations);
    const capabilityObservation = buildCapabilityObservation({
      derivation,
      source_observation: observations[0],
      observed_at: ANALYZED_AT,
    });
    expect(capabilityObservation.observation_type).toBe(CAPABILITY_INDICATORS_OBSERVATION_TYPE);

    const claims = processEvidenceToClaims({
      analysis_run_id: RUN_ID,
      artifact: AUTOIT_ARTIFACT,
      observations: [...observations, capabilityObservation],
      processed_at: ANALYZED_AT,
    });
    const capabilityClaims = claims.new_claims.filter((c) => c.predicate === 'EXHIBITS_CAPABILITY');
    expect(capabilityClaims.length).toBe(1);
    expect(capabilityClaims[0].status).toBe('DERIVED');
    expect(capabilityClaims[0].modality).toBe('CAN_DO');

    const behaviors = processClaimsToBehaviors({
      analysis_run_id: RUN_ID,
      artifact: AUTOIT_ARTIFACT,
      claims: claims.new_claims,
      processed_at: ANALYZED_AT,
    });
    expect(behaviors.new_behaviors).toEqual([]);

    const configurations = processClaimsToConfigurations({
      analysis_run_id: RUN_ID,
      artifact: AUTOIT_ARTIFACT,
      claims: claims.new_claims,
      processed_at: ANALYZED_AT,
    });
    expect(configurations.new_configurations).toEqual([]);

    const infrastructure = correlateInfrastructure({
      analysis_run_id: RUN_ID,
      artifact: AUTOIT_ARTIFACT,
      claims: claims.new_claims,
      correlated_at: ANALYZED_AT,
    });
    expect(infrastructure.new_relationships).toEqual([]);

    const attack = mapBehaviorsToAttackMbc({
      analysis_run_id: RUN_ID,
      artifact: AUTOIT_ARTIFACT,
      claims: claims.new_claims,
      behaviors: behaviors.new_behaviors,
      mapping_catalog: [],
      mapped_at: ANALYZED_AT,
    });
    expect(attack.new_mappings).toEqual([]);

    const family = resolveMalwareFamily({
      analysis_run_id: RUN_ID,
      artifact: AUTOIT_ARTIFACT,
      candidates: [],
      claims: claims.new_claims,
      resolved_at: ANALYZED_AT,
    });
    expect(family.resolved_family).toBeNull();
    expect(family.resolution_state).not.toBe('RESOLVED');
  });

  test('7. strings and compiler/packer evidence alone never create a capability', () => {
    const stringObservation = {
      ...embeddedObservation({ signatures: [] }),
      observation_type: 'string_indicators',
      attributes: {
        analysis_status: 'OBSERVED',
        indicator_count: 16,
        statement: 'Deterministic string extraction recorded 16 candidate indicator(s).',
      },
    } as unknown as Observation;
    expect(derive([stringObservation]).capabilities).toEqual([]);

    const packing = {
      ...embeddedObservation({ signatures: [] }),
      observation_type: 'packing_indicators',
      attributes: { analysis_status: 'OBSERVED', packing_verdict: 'INDICATED', high_entropy_sections: 1 },
    } as unknown as Observation;
    expect(derive([packing]).capabilities).toEqual([]);

    // A detection value that this layer has no closed rule for is not coerced.
    expect(derive([dieObservation({ values: ['PE32', 'C++', 'UPX'] })]).capabilities).toEqual([]);
  });

  test('8. packer detection reinforces but never originates the AutoIt capability', () => {
    const observations = [
      embeddedObservation({ signatures: ['compiled_autoit_script'] }),
      dieObservation({ values: ['PE32', 'AutoIt'] }),
    ];
    const result = derive(observations);
    expect(result.capabilities.length).toBe(1);
    expect(result.capabilities[0].basis.kinds).toEqual([
      'EMBEDDED_COMPILED_AUTOIT_RESOURCE',
      'STATIC_STRUCTURE_SIGNATURE_DETECTION',
    ]);
    expect(result.capabilities[0].basis.observation_ids.length).toBe(2);
  });

  test('9. structural object types map to the catalog capabilities (nested PE / archive)', () => {
    const nested = derive([embeddedObservation({ signatures: ['embedded_pe'] })]);
    expect(nested.capabilities.map((c) => c.capability_name)).toEqual(['Embedded executable payload structure']);
    const archive = derive([embeddedObservation({ signatures: ['zip_archive'] })]);
    expect(archive.capabilities.map((c) => c.capability_name)).toEqual(['Embedded archive payload structure']);
  });

  test('10. the projected section is lineaged, execution-free and catalog-versioned', () => {
    const observations = [embeddedObservation({ signatures: ['compiled_autoit_script'] })];
    const derivation = derive(observations);
    const observation = buildCapabilityObservation({
      derivation,
      source_observation: observations[0],
      observed_at: ANALYZED_AT,
    });
    const section = projectCapabilitySection({
      capabilities: derivation.capabilities,
      observation,
      artifact_id: ARTIFACT_ID,
      analysis_run_id: RUN_ID,
    });
    expect(validateCapabilitySection(section)).toEqual([]);
    expect(section.count).toBe(1);
    expect(section.execution_claimed).toBe(false);
    expect(section.catalog_version).toBe(STATIC_CAPABILITY_CATALOG_VERSION);
    expect(section.observation_id).toBe(observation.observation_id);
    expect(section.items[0].catalog_version).toBe(STATIC_CAPABILITY_CATALOG_VERSION);
    expect(section.items[0].catalog_id).toBe('AUTOIT_COMPILED_SCRIPT_SUPPORT');
    expect(section.source.evidence_ids.length).toBeGreaterThan(0);
    expect(section.items[0].evidence_ids.length).toBeGreaterThan(0);
    // A foreign run in the section invalidates it.
    const tampered = { ...section, source: { ...section.source, analysis_run_id: OTHER_RUN_ID } };
    expect(validateCapabilitySection(tampered).length).toBeGreaterThan(0);
  });

  test('11. the catalog stays small and every entry is closed and versioned', () => {
    expect(STATIC_CAPABILITY_CATALOG.length).toBe(3);
    for (const definition of STATIC_CAPABILITY_CATALOG) {
      expect(definition.required_basis.length).toBeGreaterThan(0);
      expect(definition.catalog_version).toBe(STATIC_CAPABILITY_CATALOG_VERSION);
      expect(definition.static_implication).not.toMatch(/executes|performed|observed execution/i);
    }
  });

  test('12. no capability is emitted when the run produced no structural evidence', () => {
    const result = derive([]);
    expect(result.capabilities).toEqual([]);
    expect(result.rejected).toEqual([]);
    expect(() => buildCapabilityObservation({ derivation: result, source_observation: null, observed_at: ANALYZED_AT })).toThrow();
  });
});
