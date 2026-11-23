/**
 * P0 — Run binding + cross-run isolation of existing canonical results
 *
 * Locks the two remaining malware-pipeline boundary weaknesses:
 *
 *   RUN BINDING (objective 1)
 *     A declared analysis_run_id is accepted ONLY when an authoritative binding
 *     proves it belongs to a MALWARE job over the artifact_id and sha256 of the
 *     artifact actually being analyzed. The control is not a regex: the binding
 *     carries the job identity + artifact identity, and the pipeline produces no
 *     evidence otherwise.
 *
 *   CROSS-RUN ISOLATION (objective 2)
 *     An existing canonical result (family_resolution,
 *     infrastructure_relationships, attack_mbc_mappings, confidence_conflicts)
 *     is admitted ONLY when BOTH artifact_id AND analysis_run_id match the
 *     current run. Artifact equality, content equality and resolution_id
 *     equality are never sufficient, and resolution identity now includes the
 *     run id.
 *
 * Assertion 8 also re-proves that the artifact_id / sha256 binding is still
 * enforced (both by the binding validator and by the report grounding gate).
 *
 * Synthetic fixtures, novel holdout identities only.
 */
import { describe, it, expect } from 'bun:test';

import {
  analyzeMalwareArtifact,
  buildAnalysisRunBinding,
  buildMalwareIntelligenceReport,
  buildPublicReportPayload,
  groundReport,
  acquireMalwareSample,
  validateAnalysisRunBinding,
  type AnalysisRunBinding,
} from '../../packages/intelligence/src/malware/canonical';
import type { Artifact } from '../../packages/intelligence/src/malware/canonical/artifact';

const AT = '2026-09-22T00:00:00.000Z';
const SHA = 'b'.repeat(64);
const RUN_A = 'ar_p0_bound_run_001';
const JOB_A = 'job_p0_bound_001';

function evidence(id: string) {
  return [
    {
      evidence_id: id,
      source_id: 'src_p0_binding',
      source_snapshot_id: RUN_A,
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
    snapshot_ids: [...new Set(refs.map((e) => e.source_snapshot_id))],
    derived_at: AT,
  };
}

function makeArtifact(sha: string): Artifact {
  return {
    artifact_id: `art_p0_${sha.slice(0, 12)}`,
    identity_key: `sha256:${sha}`,
    format_class: 'PE',
    file_names: [`p0_binding_${sha.slice(0, 8)}.bin`],
    hashes: { sha256: sha },
    file_size_bytes: null,
    mime_type: 'application/x-dosexec',
    format_attributes: {},
    provenance: prov(evidence(`ev_art_${sha.slice(0, 8)}`)),
  } as unknown as Artifact;
}

function tinyPe(): Uint8Array {
  const b = new Uint8Array(64);
  b[0] = 0x4d;
  b[1] = 0x5a;
  return b;
}

function acquireFor(sha: string) {
  return acquireMalwareSample({
    metadata: {
      source: 'MALWAREBAZAAR',
      source_sample_id: `p0_binding_${sha.slice(0, 8)}`,
      declared_sha256: sha,
      file_name: `p0_binding_${sha.slice(0, 8)}.bin`,
      first_seen: AT,
    },
    raw: { downloaded_sha256: sha },
    acquired_at: AT,
  });
}

function runWith(input: {
  analysis_run_id: string;
  run_binding: AnalysisRunBinding;
  artifact: Artifact;
  existing?: Record<string, unknown>;
}) {
  return analyzeMalwareArtifact({
    analysis_run_id: input.analysis_run_id,
    run_binding: input.run_binding,
    artifact: input.artifact,
    rawBytes: tinyPe(),
    analyzed_at: AT,
    ...(input.existing ? { existing: input.existing as never } : {}),
  });
}

function familyResolutionFor(runId: string, artifactId: string, resolvedFamily: string | null) {
  return {
    resolution_id: `famres_${artifactId}_holdout`,
    analysis_run_id: runId,
    artifact_id: artifactId,
    engine_version: 'holdout',
    resolved_at: AT,
    resolution_state: resolvedFamily ? 'RESOLVED' : 'UNRESOLVED',
    resolved_family: resolvedFamily,
    candidates: [],
    rejected_candidates: [],
    supporting_evidence: [],
    conflicting_evidence: [],
    resolution_reason: 'holdout fixture',
    provenance: prov(evidence('ev_fam_holdout')),
  };
}

function relationshipFor(runId: string, artifactId: string, value: string) {
  const refs = evidence(`ev_infra_${runId}`);
  return {
    infrastructure_id: `infra_${artifactId}_holdout_${runId}`,
    analysis_run_id: runId,
    artifact_id: artifactId,
    role: 'C2',
    indicator_type: 'IPV4',
    indicator_value: value,
    status: 'DERIVED',
    evidence_refs: refs,
    provenance: prov(refs),
  };
}

describe('P0 — analysis_run_id binding', () => {
  it('1. an arbitrary externally supplied analysis_run_id is rejected', () => {
    const acquisition = acquireFor(SHA);
    const artifact = acquisition.artifact!;
    const bound = buildAnalysisRunBinding({ analysis_run_id: RUN_A, job_id: JOB_A, artifact });

    // The caller declares a run id the authoritative binding does not own.
    expect(() =>
      runWith({ analysis_run_id: 'ar_externally_supplied_999', run_binding: bound, artifact }),
    ).toThrow(/PIPELINE_REJECTED: run_binding_invalid/);
    expect(() =>
      runWith({ analysis_run_id: 'ar_externally_supplied_999', run_binding: bound, artifact }),
    ).toThrow(/run_binding_id_mismatch/);
  });

  it('2. a foreign-domain (non-malware) run binding is rejected', () => {
    const artifact = acquireFor(SHA).artifact!;
    const bound = buildAnalysisRunBinding({ analysis_run_id: RUN_A, job_id: JOB_A, artifact });
    const foreign = { ...bound, domain: 'VULNERABILITY' } as unknown as AnalysisRunBinding;

    expect(validateAnalysisRunBinding(foreign, { analysis_run_id: RUN_A, artifact })).toContain(
      'run_binding_domain_mismatch:VULNERABILITY',
    );
    expect(() =>
      runWith({ analysis_run_id: RUN_A, run_binding: foreign, artifact }),
    ).toThrow(/run_binding_domain_mismatch/);

    // A binding with no malware job identity is equally rejected.
    const jobless = { ...bound, job_id: '' } as AnalysisRunBinding;
    expect(() =>
      runWith({ analysis_run_id: RUN_A, run_binding: jobless, artifact }),
    ).toThrow(/run_binding_job_absent/);
  });

  it('3. a binding for another artifact / another sha256 is rejected', () => {
    const artifactA = acquireFor(SHA).artifact!;
    const otherSha = 'c'.repeat(64);
    const artifactB = acquireFor(otherSha).artifact!;
    const boundToA = buildAnalysisRunBinding({ analysis_run_id: RUN_A, job_id: JOB_A, artifact: artifactA });

    // Same run id, different artifact.
    expect(() =>
      runWith({ analysis_run_id: RUN_A, run_binding: boundToA, artifact: artifactB }),
    ).toThrow(/run_binding_artifact_mismatch/);

    // Same artifact_id, wrong sha256.
    const wrongSha = { ...boundToA, sha256: otherSha } as AnalysisRunBinding;
    expect(() =>
      runWith({ analysis_run_id: RUN_A, run_binding: wrongSha, artifact: artifactA }),
    ).toThrow(/run_binding_sha256_mismatch/);

    // A malformed (non 64-hex) sha256 never passes as an identity.
    const malformed = { ...boundToA, sha256: 'deadbeef' } as AnalysisRunBinding;
    expect(() =>
      runWith({ analysis_run_id: RUN_A, run_binding: malformed, artifact: artifactA }),
    ).toThrow(/run_binding_sha256_malformed/);
  });

  it('4. same artifact + same run + same job binding is accepted and rendered in the report', () => {
    const acquisition = acquireFor(SHA);
    const artifact = acquisition.artifact!;
    const bound = buildAnalysisRunBinding({ analysis_run_id: RUN_A, job_id: JOB_A, artifact });

    const pipeline = runWith({ analysis_run_id: RUN_A, run_binding: bound, artifact });
    expect(pipeline.analysis_run_id).toBe(RUN_A);
    expect(validateAnalysisRunBinding(bound, { analysis_run_id: RUN_A, artifact })).toEqual([]);

    const report = buildMalwareIntelligenceReport({ acquisition, pipeline, generated_at: AT });
    expect(report.run_binding).toEqual({
      domain: 'MALWARE',
      job_id: JOB_A,
      analysis_run_id: RUN_A,
      artifact_id: artifact.artifact_id,
      sha256: SHA,
    });
    // The published payload proves the binding; grounding gate accepts it.
    expect((buildPublicReportPayload(report) as Record<string, any>).run_binding.job_id).toBe(JOB_A);
    expect(groundReport(report, { pipeline, acquisition })).toEqual([]);
  });
});

describe('P0 — cross-run isolation of existing canonical results', () => {
  it('5. an existing result from a different analysis_run_id is excluded', () => {
    const artifact = acquireFor(SHA).artifact!;
    const bound = buildAnalysisRunBinding({ analysis_run_id: RUN_A, job_id: JOB_A, artifact });

    const pipeline = runWith({
      analysis_run_id: RUN_A,
      run_binding: bound,
      artifact,
      existing: {
        family_resolution: familyResolutionFor('ar_p0_other_run', artifact.artifact_id, 'RunAOnlyFamily'),
        infrastructure_relationships: [relationshipFor('ar_p0_other_run', artifact.artifact_id, '198.51.100.77')],
        attack_mbc_mappings: [],
        confidence_conflicts: {
          resolution_id: 'ccr_holdout',
          analysis_run_id: 'ar_p0_other_run',
          artifact_id: artifact.artifact_id,
          engine_version: 'holdout',
          resolved_at: AT,
          confidence_assessments: [],
          conflicts: [],
          rejected_inputs: [],
          skipped_inputs: [],
          provenance: prov(evidence('ev_ccr_holdout')),
        },
      },
    });

    expect(pipeline.filtered_foreign_run_results.count).toBe(3);
    expect(pipeline.filtered_foreign_run_results.scopes).toContain('family_resolution');
    expect(pipeline.filtered_foreign_run_results.scopes).toContain('infrastructure_relationships');
    expect(pipeline.filtered_foreign_run_results.scopes).toContain('confidence_conflicts');
    expect(pipeline.filtered_foreign_run_results.result_ids).toContain(
      `famres_${artifact.artifact_id}_holdout`,
    );
  });

  it('6. the same artifact + same run is admitted (and an identical result is reused)', () => {
    const artifact = acquireFor(SHA).artifact!;
    const bound = buildAnalysisRunBinding({ analysis_run_id: RUN_A, job_id: JOB_A, artifact });

    // First execution: take this run's own canonical results.
    const first = runWith({ analysis_run_id: RUN_A, run_binding: bound, artifact });

    // Same artifact + same run ⇒ nothing is filtered out.
    const second = runWith({
      analysis_run_id: RUN_A,
      run_binding: bound,
      artifact,
      existing: {
        family_resolution: first.family_resolution,
        infrastructure_relationships: first.infrastructure.new_relationships,
        attack_mbc_mappings: first.attack_mbc.new_mappings,
        confidence_conflicts: first.confidence_conflicts,
      },
    });
    expect(second.filtered_foreign_run_results.count).toBe(0);
    expect(second.filtered_foreign_run_results.scopes).toEqual([]);
    // Reuse is run-scoped: the run's own resolution identity is stable.
    expect(second.family_resolution.resolution_id).toBe(first.family_resolution.resolution_id);
  });

  it('7. an existing result with the same artifact but a different run never enters the report', () => {
    const acquisition = acquireFor(SHA);
    const artifact = acquisition.artifact!;
    const bound = buildAnalysisRunBinding({ analysis_run_id: RUN_A, job_id: JOB_A, artifact });

    const foreignFamily = familyResolutionFor('ar_p0_other_run', artifact.artifact_id, 'RunAOnlyFamily');
    const foreignRelationship = relationshipFor('ar_p0_other_run', artifact.artifact_id, '198.51.100.77');

    const pipeline = runWith({
      analysis_run_id: RUN_A,
      run_binding: bound,
      artifact,
      existing: {
        family_resolution: foreignFamily,
        infrastructure_relationships: [foreignRelationship],
      },
    });
    const report = buildMalwareIntelligenceReport({ acquisition, pipeline, generated_at: AT });

    // Run A's family result never becomes run B's report identity.
    expect(report.family_section.resolved_family).not.toBe('RunAOnlyFamily');
    expect(pipeline.family_resolution.analysis_run_id).toBe(RUN_A);
    expect(pipeline.family_resolution.resolution_id).not.toBe(foreignFamily.resolution_id);

    // Run A's relationship never renders — and never backs a confidence item.
    expect(report.infrastructure_section.items.map((i) => i.indicator_value)).not.toContain('198.51.100.77');
    expect(report.confidence_section.items.map((a) => a.subject_id)).not.toContain(
      foreignRelationship.infrastructure_id,
    );
    expect(pipeline.filtered_foreign_run_results.scopes.sort()).toEqual([
      'family_resolution',
      'infrastructure_relationships',
    ]);
  });

  it('8. artifact + sha256 binding stays enforced end to end', () => {
    const artifact = acquireFor(SHA).artifact!;
    const bound = buildAnalysisRunBinding({ analysis_run_id: RUN_A, job_id: JOB_A, artifact });

    // Binding validator: artifact + sha256 are mandatory components.
    const errors = validateAnalysisRunBinding(
      { ...bound, artifact_id: 'art_p0_somewhere_else' },
      { analysis_run_id: RUN_A, artifact },
    );
    expect(errors.some((e) => e.startsWith('run_binding_artifact_mismatch'))).toBe(true);
    expect(errors.some((e) => e.startsWith('run_binding_sha256_'))).toBe(false); // sha itself is intact

    // An absent binding never passes.
    expect(validateAnalysisRunBinding(undefined, { analysis_run_id: RUN_A, artifact })[0]).toContain(
      'run_binding_absent',
    );

    // Report gate: a tampered binding is a publication rejection, not a warning.
    const pipeline = runWith({ analysis_run_id: RUN_A, run_binding: bound, artifact });
    const acquisition = acquireFor(SHA);
    const report = buildMalwareIntelligenceReport({ acquisition, pipeline, generated_at: AT });
    const tampered = JSON.parse(JSON.stringify(report)) as typeof report;
    tampered.run_binding.analysis_run_id = 'ar_p0_tampered';
    const gateErrors = groundReport(tampered, { pipeline, acquisition });
    expect(gateErrors.some((e) => e.startsWith('run_binding:report_run_id_mismatch'))).toBe(true);

    const shaTampered = JSON.parse(JSON.stringify(report)) as typeof report;
    shaTampered.run_binding.sha256 = 'd'.repeat(64);
    expect(
      groundReport(shaTampered, { pipeline, acquisition }).some((e) =>
        e.startsWith('run_binding:report_sha256_mismatch'),
      ),
    ).toBe(true);
  });
});
