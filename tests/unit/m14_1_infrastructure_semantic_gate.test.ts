/**
 * M14.1 — Infrastructure Semantic Gate + Public Payload Integrity Tests
 *
 * Root-defect regression: a non-empty string attribute must NEVER become an
 * InfrastructureRelationship by itself (semantic eligibility is deny-by-default),
 * and the public report payload must carry the real analysis_run_id.
 * Synthetic fixtures, novel holdout identities only.
 */
import { describe, it, expect } from 'bun:test';

import {
  correlateInfrastructure,
  acquireMalwareSample,
  analyzeMalwareArtifact,
  buildAnalysisRunBinding,
  buildMalwareIntelligenceReport,
  buildPublicReportPayload,
} from '../../packages/intelligence/src/malware/canonical';
import type { Observation, MalwareClaim, MalwareConfiguration, InfrastructureRelationship } from '../../packages/intelligence/src/malware/canonical';
import type { Artifact } from '../../packages/intelligence/src/malware/canonical/artifact';

const RUN_ID = 'ar_m141_gate_001';
const AT = '2026-09-21T00:00:00.000Z';
const ART = 'art_m141_holdout';

// ── fixtures ──

function evidence(id: string) {
  return [
    {
      evidence_id: id,
      source_id: 'src_m141_holdout',
      source_snapshot_id: RUN_ID,
      kind: 'STATIC' as const,
      authority_tier: 'TIER_1' as const,
      reliability: 'A' as const,
      credibility: '2' as const,
      observed_at: AT,
      retrieved_at: AT,
      url: undefined,
      store_evidence_id: undefined,
    },
  ];
}

function prov(refs: ReturnType<typeof evidence>) {
  return {
    evidence_refs: refs,
    source_ids: [...new Set(refs.map((e) => e.source_id))],
    authority_tier: 'TIER_1' as const,
    snapshot_ids: [RUN_ID],
    derived_at: AT,
  };
}

function makeArtifact(): Artifact {
  return {
    artifact_id: ART,
    identity_key: `sha256:${'b'.repeat(64)}`,
    format_class: 'PE',
    file_names: ['m141_holdout.bin'],
    hashes: { sha256: 'b'.repeat(64) },
    file_size_bytes: 1024,
    mime_type: 'application/x-dosexec',
    format_attributes: {},
    provenance: prov(evidence('ev_art_m141')),
  } as unknown as Artifact;
}

function makeObs(over: Partial<Observation> & { observation_id: string; attributes: Record<string, string | number | boolean | null> }): Observation {
  const ev = evidence(`ev_${over.observation_id}`);
  return {
    analysis_run_id: RUN_ID,
    artifact_id: ART,
    source: 'STATIC_ANALYSIS',
    observation_type: 'tool_analysis',
    observed_at: AT,
    evidence_refs: ev,
    provenance: prov(ev),
    ...over,
  } as Observation;
}

function makeClaim(over: Partial<MalwareClaim> & { claim_id: string; object_value: Record<string, string | number | boolean | null> }): MalwareClaim {
  const ev = evidence(`ev_${over.claim_id}`);
  return {
    analysis_run_id: RUN_ID,
    artifact_id: ART,
    subject_id: ART,
    predicate: 'REPORTS_VALUE',
    statement: 'synthetic claim',
    status: 'DERIVED',
    evidence_refs: ev,
    provenance: prov(ev),
    ...over,
  } as MalwareClaim;
}

function makeConfig(over: Partial<MalwareConfiguration> & { configuration_id: string; attributes: Record<string, string | number | boolean | null> }): MalwareConfiguration {
  const ev = evidence(`ev_${over.configuration_id}`);
  return {
    analysis_run_id: RUN_ID,
    artifact_id: ART,
    config_type: 'embedded_config',
    status: 'DERIVED',
    evidence_refs: ev,
    provenance: prov(ev),
    ...over,
  } as MalwareConfiguration;
}

const corr = (inputs: {
  claims?: MalwareClaim[];
  configurations?: MalwareConfiguration[];
  observations?: Observation[];
  existing_relationships?: readonly InfrastructureRelationship[];
}) =>
  correlateInfrastructure({
    analysis_run_id: RUN_ID,
    artifact: makeArtifact(),
    ...inputs,
    correlated_at: AT,
  });

// ── Case A–E, I: forbidden metadata never becomes infrastructure ──

describe('M14.1 — forbidden metadata (semantic gate, deny-by-default)', () => {
  it('CASE A: entropy metadata → no relationship', () => {
    const r = corr({ observations: [makeObs({ observation_id: 'obs_entropy', observation_type: 'entropy', attributes: { entropy: 'overall_entropy_high' } })] });
    expect(r.new_relationships).toHaveLength(0);
  });

  it('CASE B: tool availability / status → no relationship', () => {
    const r = corr({
      observations: [makeObs({ observation_id: 'obs_tool', attributes: { status: 'UNAVAILABLE', tool: 'capa', tool_name: 'capa' } })],
    });
    expect(r.new_relationships).toHaveLength(0);
    expect(r.rejected_inputs.some((x) => x.reason_code === 'no_infrastructure_semantics')).toBe(true);
  });

  it('CASE C: section metadata → no relationship', () => {
    const r = corr({
      observations: [makeObs({ observation_id: 'obs_sections', observation_type: 'sections', attributes: { sections: '.text,.rdata,.data,.rsrc,.reloc' } })],
    });
    expect(r.new_relationships).toHaveLength(0);
  });

  it('CASE D: architecture metadata → no relationship', () => {
    const r = corr({
      observations: [makeObs({ observation_id: 'obs_arch', observation_type: 'binary_metadata', attributes: { architecture: 'i386' } })],
    });
    expect(r.new_relationships).toHaveLength(0);
  });

  it('CASE E: image base / parser metadata → no relationship', () => {
    const r = corr({
      observations: [makeObs({ observation_id: 'obs_base', observation_type: 'binary_metadata', attributes: { image_base: '0x400000', parser: 'custom_pe_parser' } })],
    });
    expect(r.new_relationships).toHaveLength(0);
  });

  it('CASE I: URL-shaped generic note → NO relationship (gate is semantic, not regex-only)', () => {
    const r = corr({
      observations: [makeObs({ observation_id: 'obs_note', attributes: { note: 'https://example.com' } })],
      claims: [makeClaim({ claim_id: 'clm_note', object_value: { note: 'https://example.com', message: 'contact https://example.com soon' } })],
    });
    expect(r.new_relationships).toHaveLength(0);
    expect(r.rejected_inputs.every((x) => x.reason_code === 'no_infrastructure_semantics')).toBe(true);
  });

  it('epistemic notes / tool metadata keys never become infrastructure (defense in depth vs M7 exclusion)', () => {
    const r = corr({
      observations: [
        makeObs({ observation_id: 'obs_epistemic', attributes: { epistemic_note: 'see https://example.com/notes', reason: 'UNAVAILABLE', absence_meaning: 'no analysis performed' } }),
      ],
    });
    expect(r.new_relationships).toHaveLength(0);
  });

  it('non-infrastructure claim predicates never contribute, even with indicator keys', () => {
    const r = corr({
      claims: [makeClaim({ claim_id: 'clm_reports', predicate: 'REPORTS_VALUE', object_value: { url: 'https://example.com/gate' } })],
    });
    expect(r.new_relationships).toHaveLength(0);
    expect(r.rejected_inputs[0].reason_code).toBe('no_infrastructure_semantics');
  });

  it('value-shape alone is insufficient: OTHER classification never creates a relationship from a metadata key', () => {
    // URL/IP shapes on ineligible keys must still be denied.
    const r = corr({
      observations: [makeObs({ observation_id: 'obs_shapes', attributes: { description: 'http://example.com/x', detail: '198.51.100.1' } })],
    });
    expect(r.new_relationships).toHaveLength(0);
  });
});

// ── Case F–J: eligible semantic domains still correlate ──

describe('M14.1 — eligible sources (gate admits only qualified semantics)', () => {
  it('CASE F: eligible network indicator (observation attribute with network semantic key) → relationship', () => {
    const r = corr({
      observations: [makeObs({ observation_id: 'obs_net', observation_type: 'network_connection', attributes: { c2_host: '198.51.100.55' } })],
    });
    expect(r.new_relationships).toHaveLength(1);
    expect(r.new_relationships[0].indicator_type).toBe('IPV4');
    expect(r.new_relationships[0].indicator_value).toBe('198.51.100.55'); // verbatim (value fidelity)
  });

  it('CASE G: eligible configuration network field → relationship', () => {
    const r = corr({
      configurations: [makeConfig({ configuration_id: 'cfg_c2', config_type: 'c2', attributes: { c2_domain: 'Zqx_Gate_9x7.example' } })],
    });
    expect(r.new_relationships).toHaveLength(1);
    expect(r.new_relationships[0].indicator_value).toBe('Zqx_Gate_9x7.example');
  });

  it('CASE H: COMMUNICATES_WITH claim → relationship (canonical predicate preserved)', () => {
    const r = corr({
      claims: [makeClaim({ claim_id: 'clm_c2', predicate: 'COMMUNICATES_WITH', object_value: { host: '198.51.100.77' } })],
    });
    expect(r.new_relationships).toHaveLength(1);
    expect(r.new_relationships[0].role).toBe('C2');
  });

  it('CASE J: host indicators (mutex/pipe — existing canonical OTHER class) remain eligible from configurations', () => {
    const r = corr({
      configurations: [makeConfig({ configuration_id: 'cfg_host', attributes: { mutex: 'Global\\\\M141HoldoutMutex', pipe: '\\\\\\\\.\\\\pipe\\\\M141Pipe' } })],
    });
    expect(r.new_relationships).toHaveLength(2);
    expect(r.new_relationships.every((x) => x.indicator_type === 'OTHER')).toBe(true);
  });

  it('mixed eligible + ineligible attributes: only eligible values correlate (key-scoped, not input-scoped)', () => {
    const r = corr({
      observations: [
        makeObs({
          observation_id: 'obs_mixed',
          observation_type: 'network_connection',
          attributes: {
            c2_domain: 'Zqx_Mixed_9x7.example', // eligible
            architecture: 'i386', // ineligible
            note: 'https://example.com', // ineligible (CASE I)
          },
        }),
      ],
    });
    expect(r.new_relationships).toHaveLength(1);
    expect(r.new_relationships[0].indicator_value).toBe('Zqx_Mixed_9x7.example');
  });

  it('fidelity + identity semantics preserved: verbatim value, deterministic id, dedup intact', () => {
    const value = 'HtTp://Zqx-Fidelity.EXAMPLE:8443/Gate';
    const inputs = { claims: [makeClaim({ claim_id: 'clm_fid', predicate: 'COMMUNICATES_WITH', object_value: { url: value } })] };
    const first = corr(inputs);
    expect(first.new_relationships[0].indicator_value).toBe(value);
    const second = corr({ ...inputs, existing_relationships: first.new_relationships });
    expect(second.new_relationships).toHaveLength(0);
    expect(second.skipped_inputs[0].reason).toBe('duplicate_of_existing_relationship');
  });
});

// ── Public payload integrity ──

describe('M14.1 — public payload analysis_run_id propagation', () => {
  it('public payload carries the REAL analysis_run_id (top level and analysis_status)', () => {
    const SHA = 'c'.repeat(64);
    const ANALYZED_AT = '2026-09-21T00:30:00.000Z';
    const RUN = 'ar_m141_payload_001';
    const acquisition = acquireMalwareSample({
      metadata: {
        source: 'MALWAREBAZAAR',
        source_sample_id: 'm141_payload_holdout',
        declared_sha256: SHA,
        file_name: 'm141_payload.bin',
        first_seen: '2026-09-01T00:00:00.000Z',
      },
      raw: { downloaded_sha256: SHA },
      acquired_at: ANALYZED_AT,
    });
    expect(acquisition.status).toBe('ACQUIRED');
    const bytes = new Uint8Array(64);
    bytes[0] = 0x4d;
    bytes[1] = 0x5a;
    const pipeline = analyzeMalwareArtifact({ analysis_run_id: RUN, run_binding: buildAnalysisRunBinding({ analysis_run_id: RUN, job_id: 'job_m14_1_test', artifact: acquisition.artifact! }), artifact: acquisition.artifact!, rawBytes: bytes, analyzed_at: ANALYZED_AT });
    const report = buildMalwareIntelligenceReport({ acquisition, pipeline, generated_at: ANALYZED_AT });
    const pub = buildPublicReportPayload(report) as Record<string, unknown>;
    expect(pub.analysis_run_id).toBe(RUN);
    expect((pub.analysis_status as Record<string, unknown>).analysis_run_id).toBe(RUN);
    // No invented/derived second id: identical to the canonical run id.
    expect(pipeline.analysis_run_id).toBe(RUN);
    expect(report.analysis_run_id).toBe(RUN);
  });
});
