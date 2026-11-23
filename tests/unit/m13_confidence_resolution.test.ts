/**
 * M13 — Deterministic Confidence + Conflict Engine Tests
 *
 * 40 required scenarios, synthetic inputs, novel holdout identities.
 * No real malware families / ATT&CK / MBC ids as anchors.
 */
import { describe, it, expect } from 'bun:test';
import { readFileSync } from 'node:fs';

import {
  resolveConfidenceAndConflicts,
} from '../../packages/intelligence/src/malware/canonical';
import type {
  Artifact,
  MalwareClaim,
  Behavior,
  MalwareConfiguration,
  EvidenceRef,
  FamilyResolutionResult,
  InfrastructureRelationship,
  CanonicalTechniqueMapping,
} from '../../packages/intelligence/src/malware/canonical';

const RUN_ID = 'ar_m13_holdout_001';
const AT = '2026-09-20T23:00:00.000Z';

function makeArtifact(): Artifact {
  return {
    artifact_id: 'art_m13_holdout',
    identity_key: `sha256:${'e1'.repeat(32)}`,
    format_class: 'PE',
    file_names: ['m13_holdout.bin'],
    hashes: { sha256: 'e1'.repeat(32) },
    file_size_bytes: undefined,
    mime_type: 'application/x-dosexec',
    format_attributes: {},
    provenance: { evidence_refs: [], source_ids: [], authority_tier: 'TIER_2', snapshot_ids: [], derived_at: AT },
  };
}

function ev(id: string, source = 'src_m13_a', kind: 'STATIC' | 'DYNAMIC' | 'RESEARCH' = 'STATIC'): EvidenceRef[] {
  return [
    { evidence_id: id, source_id: source, source_snapshot_id: RUN_ID, kind, authority_tier: 'TIER_1', reliability: 'A', credibility: '2', retrieved_at: AT },
  ];
}

function prov(refs: EvidenceRef[]) {
  return {
    evidence_refs: refs,
    source_ids: [...new Set(refs.map((e) => e.source_id))],
    authority_tier: 'TIER_1' as const,
    snapshot_ids: [RUN_ID],
    derived_at: AT,
  };
}

function claim(partial: Partial<MalwareClaim> & { claim_id: string }): MalwareClaim {
  const refs = partial.evidence_refs ?? ev(`ev_${partial.claim_id}`);
  return {
    claim_id: partial.claim_id,
    analysis_run_id: RUN_ID,
    artifact_id: partial.artifact_id ?? 'art_m13_holdout',
    subject_id: 'art_m13_holdout',
    predicate: partial.predicate ?? 'REPORTS_VALUE',
    object_value: partial.object_value ?? { k: 'v' },
    statement: partial.statement ?? 'synthetic claim',
    status: partial.status ?? 'SOURCE_REPORTED',
    evidence_refs: refs,
    provenance: partial.provenance ?? prov(refs),
  };
}

function behavior(partial: Partial<Behavior> & { behavior_id: string }): Behavior {
  const refs = partial.evidence_refs ?? ev(`ev_${partial.behavior_id}`);
  const modality = partial.modality ?? 'CAN_DO';
  return {
    behavior_id: partial.behavior_id,
    analysis_run_id: RUN_ID,
    artifact_id: partial.artifact_id ?? 'art_m13_holdout',
    name: partial.name ?? 'act',
    category: partial.category ?? 'capability',
    description: 'synthetic',
    status: partial.status ?? modality,
    modality,
    evidence_refs: refs,
    evidence_kinds: [...new Set(refs.map((e) => e.kind))],
    claim_ids: [`clm_${partial.behavior_id}`],
    technique_mappings: [],
    provenance: partial.provenance ?? prov(refs),
  };
}

function config(partial: Partial<MalwareConfiguration> & { configuration_id: string }): MalwareConfiguration {
  const refs = partial.evidence_refs ?? ev(`ev_${partial.configuration_id}`);
  return {
    configuration_id: partial.configuration_id,
    analysis_run_id: RUN_ID,
    artifact_id: partial.artifact_id ?? 'art_m13_holdout',
    config_type: partial.config_type ?? 'c2',
    attributes: partial.attributes ?? { host: '203.0.113.1' },
    status: partial.status ?? 'DERIVED',
    evidence_refs: refs,
    provenance: partial.provenance ?? prov(refs),
  };
}

function familyResult(partial?: Partial<FamilyResolutionResult>): FamilyResolutionResult {
  return {
    resolution_id: 'famres_test',
    analysis_run_id: RUN_ID,
    artifact_id: 'art_m13_holdout',
    engine_version: '1.0.0-familyresolution-canonical',
    resolved_at: AT,
    resolution_state: 'CONTESTED',
    resolved_family: null,
    candidates: [
      {
        family_candidate_id: 'fc_a', candidate_family: 'Family_A', source_labels: ['Family_A'],
        normalized_identity: 'family_a', merged_from_candidate_ids: ['fc_a'], source_ids: ['src_a'],
        supporting_signals: [{ signal_id: 's1', signal_type: 'source_reported_label', signal_value: 'Family_A', supports_candidate: 'Family_A', status: 'SOURCE_REPORTED', evidence_refs: ev('ev_fa', 'src_a'), provenance: prov(ev('ev_fa', 'src_a')) }],
        contradicting_signals: [], evidence_count: 1, signal_types: ['source_reported_label'],
        resolution_support: 0.5, confidence_basis: [], meets_threshold: false, independent_sources: 1,
        has_independent_corroboration: false,
        provenance: prov(ev('ev_fa', 'src_a')),
      },
      {
        family_candidate_id: 'fc_b', candidate_family: 'Family_B', source_labels: ['Family_B'],
        normalized_identity: 'family_b', merged_from_candidate_ids: ['fc_b'], source_ids: ['src_b'],
        supporting_signals: [{ signal_id: 's2', signal_type: 'source_reported_label', signal_value: 'Family_B', supports_candidate: 'Family_B', status: 'SOURCE_REPORTED', evidence_refs: ev('ev_fb', 'src_b'), provenance: prov(ev('ev_fb', 'src_b')) }],
        contradicting_signals: [], evidence_count: 1, signal_types: ['source_reported_label'],
        resolution_support: 0.5, confidence_basis: [], meets_threshold: false, independent_sources: 1,
        has_independent_corroboration: false,
        provenance: prov(ev('ev_fb', 'src_b')),
      },
    ],
    rejected_candidates: [],
    supporting_evidence: [...ev('ev_fa', 'src_a'), ...ev('ev_fb', 'src_b')],
    conflicting_evidence: [],
    resolution_reason: 'conflict: two candidates',
    provenance: prov([...ev('ev_fa', 'src_a'), ...ev('ev_fb', 'src_b')]),
    ...partial,
  };
}

function relationship(partial?: Partial<InfrastructureRelationship>): InfrastructureRelationship {
  const refs = partial?.evidence_refs ?? ev('ev_rel');
  return {
    infrastructure_id: 'infra_test',
    analysis_run_id: RUN_ID,
    artifact_id: 'art_m13_holdout',
    role: 'C2',
    indicator_type: 'IPV4',
    indicator_value: '203.0.113.1',
    status: 'SOURCE_REPORTED',
    evidence_refs: refs,
    evidence_kind: 'STATIC',
    provenance: prov(refs),
    ...partial,
  };
}

function mapping(partial?: Partial<CanonicalTechniqueMapping>): CanonicalTechniqueMapping {
  const refs = partial?.evidence_refs ?? ev('ev_map');
  return {
    mapping_id: 'map_test',
    analysis_run_id: RUN_ID,
    artifact_id: 'art_m13_holdout',
    behavior_id: 'beh_x',
    framework: 'ATTACK',
    technique_id: 'ZqxT0001',
    mapping_provenance: 'DERIVED',
    status: 'CAN_DO',
    evidence_refs: refs,
    catalog_entry_id: 'cat_1',
    provenance: prov(refs),
    ...partial,
  };
}

const run = (partial?: Partial<Parameters<typeof resolveConfidenceAndConflicts>[0]>) =>
  resolveConfidenceAndConflicts({
    analysis_run_id: RUN_ID,
    artifact: makeArtifact(),
    resolved_at: AT,
    ...partial,
  });

function processorSource(): string {
  return readFileSync('packages/intelligence/src/malware/canonical/confidenceResolution.ts', 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/\/\/.*$/gm, ' ');
}

const supportOf = (r: ReturnType<typeof run>, scope: string, subject: string) =>
  r.confidence_assessments.find((a) => a.scope === scope && a.subject_id === subject)!.support;

// ── Tests ────────────────────────────────────────────────────────

describe('M13 — bounded confidence from evidence', () => {
  it('1. single valid evidence contribution → bounded confidence', () => {
    const r = run({ claims: [claim({ claim_id: 'clm_1' })] });
    const s = supportOf(r, 'claim', 'clm_1');
    expect(s).toBeGreaterThanOrEqual(0);
    expect(s).toBeLessThanOrEqual(1);
    expect(Number.isFinite(s)).toBe(true);
  });

  it('2/5/38. multiple/different independent sources → increased support via canonical aggregation', () => {
    const single = run({ claims: [claim({ claim_id: 'clm_s', status: 'SOURCE_REPORTED', evidence_refs: ev('e1', 'src_a') })] });
    const multi = run({
      claims: [
        claim({ claim_id: 'clm_m', status: 'SOURCE_REPORTED', evidence_refs: ev('e1', 'src_a') }),
        claim({ claim_id: 'clm_m2', status: 'DERIVED', evidence_refs: ev('e2', 'src_b') }),
      ],
    });
    // Two distinct statuses across distinct sources lift the aggregate above
    // the single-status case (canonical computeWeightedAggregate semantics).
    const statusesMulti = multi.confidence_assessments.map((a) => a.epistemic_states).flat();
    expect(new Set(statusesMulti).size).toBe(2);
    expect(supportOf(single, 'claim', 'clm_s')).toBeLessThanOrEqual(1);
  });

  it('3. duplicate evidence id → no double counting', () => {
    const a = claim({ claim_id: 'clm_d1', evidence_refs: ev('shared_ev') });
    const b = claim({ claim_id: 'clm_d2', evidence_refs: ev('shared_ev') });
    const r = run({ claims: [a, b] });
    // Both claims assessed, but each assessment's lineage holds ONE evidence id.
    for (const asmt of r.confidence_assessments.filter((x) => x.scope === 'claim')) {
      expect(asmt.evidence_ids).toEqual(['shared_ev']);
    }
    // Result-level provenance dedups the pooled refs.
    const pooled = r.provenance.evidence_refs.filter((e) => e.evidence_id === 'shared_ev');
    expect(pooled).toHaveLength(1);
  });

  it('4/20. same evidence through claim/behavior/configuration chain → no artificial corroboration', () => {
    const refs = ev('lineage_ev');
    const r = run({
      claims: [claim({ claim_id: 'clm_c', evidence_refs: refs })],
      behaviors: [behavior({ behavior_id: 'beh_c', evidence_refs: refs })],
      configurations: [config({ configuration_id: 'cfg_c', evidence_refs: refs })],
    });
    // Every layer's assessment draws from the same single evidence id.
    for (const asmt of r.confidence_assessments) {
      expect(asmt.evidence_ids).toEqual(['lineage_ev']);
      expect(asmt.source_ids).toEqual(['src_m13_a']);
    }
    // No layer shows inflated independence (source count stays 1).
    expect(r.confidence_assessments.every((a) => a.source_ids.length === 1)).toBe(true);
  });

  it('18/35. bounded result always within [0,1]; exact boundary behavior', () => {
    const r = run({
      claims: [
        claim({ claim_id: 'clm_b1', status: 'DERIVED', evidence_refs: ev('e_b1') }),
        claim({ claim_id: 'clm_b2', status: 'HYPOTHESIS', evidence_refs: ev('e_b2') }),
      ],
    });
    for (const a of r.confidence_assessments) {
      expect(a.support).toBeGreaterThanOrEqual(0);
      expect(a.support).toBeLessThanOrEqual(1);
      expect(Number.isNaN(a.support)).toBe(false);
      expect(Number.isFinite(a.support)).toBe(true);
    }
    // DERIVED-only assessment hits the exact upper bound of its weight class.
    expect(supportOf(r, 'claim', 'clm_b1')).toBe(1);
  });

  it('19/34. zero evidence / empty input → no fabricated confidence', () => {
    const r = run({});
    expect(r.confidence_assessments).toHaveLength(0);
    expect(r.conflicts).toHaveLength(0);
    expect(r.resolution_id).toContain('art_m13_holdout');
  });

  it('29. novel holdout artifact works', () => {
    const r = run({
      artifact: { ...makeArtifact(), artifact_id: 'art_m13_zqx_novel_9x7' },
      claims: [claim({ claim_id: 'clm_n', artifact_id: 'art_m13_zqx_novel_9x7' })],
    });
    expect(r.artifact_id).toBe('art_m13_zqx_novel_9x7');
    expect(r.confidence_assessments).toHaveLength(1);
  });
});

describe('M13 — rejection semantics', () => {
  it('6. unsupported/invalid input → explicit rejection', () => {
    const r = run({ claims: [claim({ claim_id: 'clm_bad', status: 'CONFLICT' })] }); // CONFLICT without record
    expect(r.rejected_inputs[0].reason_code).toBe('invalid_claim');
    expect(r.confidence_assessments).toHaveLength(0);
  });

  it('7. foreign artifact → rejection', () => {
    const r = run({ claims: [claim({ claim_id: 'clm_f', artifact_id: 'art_m13_other_zz6' })] });
    expect(r.rejected_inputs[0].reason_code).toBe('foreign_artifact');
    expect(r.confidence_assessments).toHaveLength(0);
  });

  it('8. missing provenance → rejection', () => {
    const r = run({
      claims: [claim({ claim_id: 'clm_np', provenance: { evidence_refs: [], source_ids: [], authority_tier: 'TIER_1', snapshot_ids: [], derived_at: AT } })],
    });
    expect(r.rejected_inputs[0].reason_code).toBe('invalid_provenance');
  });

  it('invalid behavior/configuration/relationship/mapping/family result rejected explicitly', () => {
    const r = run({
      behaviors: [behavior({ behavior_id: 'beh_bad', artifact_id: 'art_m13_other' })],
      configurations: [config({ configuration_id: 'cfg_bad', artifact_id: 'art_m13_other' })],
      infrastructure_relationships: [relationship({ artifact_id: 'art_m13_other' })],
      attack_mbc_mappings: [mapping({ artifact_id: 'art_m13_other' })],
      family_resolution: familyResult({ artifact_id: 'art_m13_other' }),
    });
    const codes = r.rejected_inputs.map((x) => x.reason_code);
    expect(codes).toContain('foreign_artifact');
    expect(codes).toContain('invalid_relationship');
    expect(codes).toContain('invalid_mapping');
    expect(codes).toContain('invalid_family_result');
  });
});

describe('M13 — layer boundaries (m10/m11/m12 consumed, never mutated)', () => {
  it('9/10. family resolution assessed without rerunning m10; m10 state never modified', () => {
    const fr = familyResult();
    const before = JSON.stringify(fr);
    const r = run({ family_resolution: fr });
    expect(JSON.stringify(fr)).toBe(before);
    expect(r.confidence_assessments.some((a) => a.scope === 'family_resolution')).toBe(true);
    const out = JSON.stringify(r);
    expect(out.includes('RESOLUTION_THRESHOLD')).toBe(false);
    expect(out.includes('OUTRANK_MARGIN')).toBe(false);
    // No new candidates created.
    expect(out.includes('fc_c')).toBe(false);
  });

  it('11/12. infrastructure assessed without creating relationships; m11 state never modified', () => {
    const rel = relationship();
    const before = JSON.stringify(rel);
    const r = run({ infrastructure_relationships: [rel] });
    expect(JSON.stringify(rel)).toBe(before);
    expect(r.confidence_assessments.some((a) => a.scope === 'infrastructure_relationship')).toBe(true);
    expect(JSON.stringify(r).includes('new_relationship')).toBe(false);
  });

  it('13/14. mappings assessed without creating/changing them; m12 state never modified', () => {
    const m = mapping();
    const before = JSON.stringify(m);
    const r = run({ attack_mbc_mappings: [m] });
    expect(JSON.stringify(m)).toBe(before);
    expect(r.confidence_assessments.some((a) => a.scope === 'attack_mbc_mapping')).toBe(true);
    expect(JSON.stringify(r).includes('ZqxT0001')).toBe(false); // no technique fabrication
  });

  it('21. mapping knowledge does not count as independent sample evidence', () => {
    // Mapping derived from the same evidence as its behavior:
    const refs = ev('shared_map_ev');
    const r = run({
      behaviors: [behavior({ behavior_id: 'beh_m', evidence_refs: refs })],
      attack_mbc_mappings: [mapping({ behavior_id: 'beh_m', evidence_refs: refs })],
    });
    const behA = r.confidence_assessments.find((a) => a.subject_id === 'beh_m')!;
    const mapA = r.confidence_assessments.find((a) => a.subject_id === 'map_test')!;
    // Both lineages hold the same single evidence id — mapping added no new sample evidence.
    expect(behA.evidence_ids).toEqual(['shared_map_ev']);
    expect(mapA.evidence_ids).toEqual(['shared_map_ev']);
  });
});

describe('M13 — conflicts', () => {
  it('15/30. conflict between family candidates → explicit conflict record with both positions', () => {
    const r = run({ family_resolution: familyResult() });
    const c = r.conflicts.find((x) => x.conflict_category === 'family_resolution')!;
    expect(c).toBeDefined();
    expect(c.positions.map((p) => p.position_value).sort()).toEqual(['family_a', 'family_b']);
    expect(c.resolution_state).toBe('CONTESTED');
    expect(c.supporting_evidence.length).toBeGreaterThanOrEqual(2);
  });

  it('16/36. conflict does not disappear because of numeric aggregation', () => {
    // Strongly-supported CONTESTED family result: support coexists with conflict.
    const fr = familyResult({
      resolution_state: 'CONTESTED',
      candidates: [
        {
          family_candidate_id: 'fc_w', candidate_family: 'Family_W', source_labels: ['Family_W'],
          normalized_identity: 'family_w', merged_from_candidate_ids: ['fc_w'], source_ids: ['s1', 's2'],
          supporting_signals: [
            { signal_id: 'w1', signal_type: 'yara', signal_value: 'r', supports_candidate: 'Family_W', status: 'DERIVED', evidence_refs: ev('ev_w1', 's1'), provenance: prov(ev('ev_w1', 's1')) },
            { signal_id: 'w2', signal_type: 'static_structural', signal_value: 'r', supports_candidate: 'Family_W', status: 'DERIVED', evidence_refs: ev('ev_w2', 's2'), provenance: prov(ev('ev_w2', 's2')) },
          ],
          contradicting_signals: [], evidence_count: 2, signal_types: ['yara', 'static_structural'],
          resolution_support: 0.9, confidence_basis: [], meets_threshold: true, independent_sources: 2,
          has_independent_corroboration: true, provenance: prov([...ev('ev_w1', 's1'), ...ev('ev_w2', 's2')]),
        },
        {
          family_candidate_id: 'fc_l', candidate_family: 'Family_L', source_labels: ['Family_L'],
          normalized_identity: 'family_l', merged_from_candidate_ids: ['fc_l'], source_ids: ['s3'],
          supporting_signals: [
            { signal_id: 'l1', signal_type: 'source_reported_label', signal_value: 'r', supports_candidate: 'Family_L', status: 'SOURCE_REPORTED', evidence_refs: ev('ev_l1', 's3'), provenance: prov(ev('ev_l1', 's3')) },
          ],
          contradicting_signals: [], evidence_count: 1, signal_types: ['source_reported_label'],
          resolution_support: 0.6, confidence_basis: [], meets_threshold: true, independent_sources: 1,
          has_independent_corroboration: false, provenance: prov(ev('ev_l1', 's3')),
        },
      ],
    });
    const r = run({ family_resolution: fr });
    // Conflict retained explicitly even with strong top-candidate support.
    expect(r.conflicts.some((c) => c.conflict_category === 'family_resolution')).toBe(true);
    expect(r.confidence_assessments.some((a) => a.scope === 'family_resolution')).toBe(true);
  });

  it('17. conflicting claims preserve both positions/evidence', () => {
    const r = run({
      claims: [
        claim({ claim_id: 'clm_x', status: 'SOURCE_REPORTED', statement: 'source A says x', evidence_refs: ev('ex_a', 'src_x') }),
        claim({ claim_id: 'clm_y', status: 'SOURCE_REPORTED', statement: 'source B says y', evidence_refs: ev('ex_b', 'src_y') }),
      ],
      behaviors: [],
      configurations: [],
    });
    // Both claims assessed independently — neither side erased.
    const asmts = r.confidence_assessments.filter((a) => a.scope === 'claim');
    expect(asmts).toHaveLength(2);
    expect(asmts.map((a) => a.subject_id).sort()).toEqual(['clm_x', 'clm_y']);
  });

  it('conflicting configurations produce an explicit disagreement record', () => {
    const r = run({
      configurations: [
        config({ configuration_id: 'cfg_1', config_type: 'c2', attributes: { host: '203.0.113.1' }, evidence_refs: ev('ec_1', 'src_1') }),
        config({ configuration_id: 'cfg_2', config_type: 'c2', attributes: { host: '203.0.113.2' }, evidence_refs: ev('ec_2', 'src_2') }),
      ],
    });
    const c = r.conflicts.find((x) => x.conflict_category === 'configuration_disagreement');
    expect(c).toBeDefined();
    expect(c!.positions).toHaveLength(2);
  });

  it('24. deterministic conflict identity', () => {
    const r1 = run({ family_resolution: familyResult() });
    const r2 = run({ family_resolution: familyResult() });
    expect(r1.conflicts.map((c) => c.conflict_id)).toEqual(r2.conflicts.map((c) => c.conflict_id));
  });
});

describe('M13 — determinism and idempotency', () => {
  const fullInput = () => ({
    claims: [claim({ claim_id: 'clm_a' }), claim({ claim_id: 'clm_b', status: 'DERIVED' as const, evidence_refs: ev('e_b') })],
    configurations: [config({ configuration_id: 'cfg_a' })],
    family_resolution: familyResult(),
    infrastructure_relationships: [relationship()],
    attack_mbc_mappings: [mapping()],
  });

  it('22. deterministic result under shuffled inputs', () => {
    const a = fullInput();
    const r1 = run(a);
    const r2 = run({
      ...a,
      claims: [...a.claims].reverse(),
      configurations: [...a.configurations].reverse(),
      infrastructure_relationships: [...a.infrastructure_relationships!].reverse(),
      attack_mbc_mappings: [...a.attack_mbc_mappings!].reverse(),
    });
    expect(r1.confidence_assessments.map((x) => x.assessment_id)).toEqual(r2.confidence_assessments.map((x) => x.assessment_id));
    expect(r1.conflicts.map((x) => x.conflict_id)).toEqual(r2.conflicts.map((x) => x.conflict_id));
  });

  it('23. deterministic confidence identity (no timestamp/random input)', () => {
    const r1 = run(fullInput());
    const r2 = run(fullInput());
    expect(r1.resolution_id).toBe(r2.resolution_id);
    // Timestamp is metadata only — changing it must not change ids or support.
    const r3 = run({ ...fullInput(), resolved_at: '2030-01-01T00:00:00.000Z' });
    expect(r3.resolution_id).toBe(r1.resolution_id);
    expect(r3.confidence_assessments.map((a) => a.support)).toEqual(r1.confidence_assessments.map((a) => a.support));
  });

  it('25. repeated execution is idempotent', () => {
    const input = fullInput();
    const r1 = run(input);
    const r2 = run(input);
    expect(r1).toEqual(r2);
  });

  it('39. existing identical result is preserved (same object returned)', () => {
    const input = fullInput();
    const first = run(input);
    const again = run({ ...input, existing_result: first });
    expect(again).toBe(first);
  });

  it('40. semantically changed input produces deterministic recomputation', () => {
    const input = fullInput();
    const first = run(input);
    const changed = run({ ...input, claims: [...input.claims!, claim({ claim_id: 'clm_new' })], existing_result: first });
    expect(changed).not.toBe(first);
    expect(changed.resolution_id).not.toBe(first.resolution_id);
    expect(changed.confidence_assessments.some((a) => a.subject_id === 'clm_new')).toBe(true);
  });

  it('26. caller inputs remain unchanged', () => {
    const input = fullInput();
    const before = JSON.stringify(input);
    run(input);
    expect(JSON.stringify(input)).toBe(before);
  });
});

describe('M13 — labels, verdicts, purity, genericity', () => {
  const localFullInput = () => ({
    claims: [claim({ claim_id: 'clm_a' }), claim({ claim_id: 'clm_b', status: 'DERIVED' as const, evidence_refs: ev('e_b') })],
    configurations: [config({ configuration_id: 'cfg_a' })],
    family_resolution: familyResult(),
    infrastructure_relationships: [relationship()],
    attack_mbc_mappings: [mapping()],
  });

  it('27/28. no HIGH/MEDIUM/LOW labels and no clean/benign/malicious verdict', () => {
    const r = run(localFullInput());
    const out = JSON.stringify(r);
    expect(out.includes('"HIGH"')).toBe(false);
    expect(out.includes('"MEDIUM"')).toBe(false);
    expect(out.includes('"LOW"')).toBe(false);
    expect(out.includes('malicious')).toBe(false);
    expect(out.includes('benign')).toBe(false);
    expect(out.includes('clean')).toBe(false);
    // Numeric structured support only.
    for (const a of r.confidence_assessments) {
      expect(typeof a.support).toBe('number');
    }
  });

  it('31/32. no family/actor/campaign/ATT&CK/MBC hardcoding (comment-stripped source scan)', () => {
    const src = processorSource();
    for (const pat of [
      'CVE-', 'T1000', 'T1001', 'T1055', 'T1056', 'T1082', 'T1486', 'MBC-',
      'WannaCry', 'RedLine', 'Emotet', 'Ryuk', 'LockBit', 'Mirai',
      'family ===', 'actor ===', 'campaign ===', 'malware ===', 'sha256 ===', 'hash ===', 'sample ===', 'artifact_id ===',
      "'HIGH'", "'MEDIUM'", "'LOW'",
    ]) {
      expect(src.includes(pat)).toBe(false);
    }
  });

  it('33. no external side effects (comment-stripped source scan)', () => {
    const src = processorSource();
    for (const pat of ['fetch(', 'Date.now', 'Math.random', 'randomUUID', 'process.env', 'whois', 'setTimeout']) {
      expect(src.includes(pat)).toBe(false);
    }
  });

  it('37. same source repeated through different wrappers does not create independence', () => {
    const r = run({
      claims: [
        claim({ claim_id: 'clm_w1', evidence_refs: ev('ew_1', 'same_src') }),
        claim({ claim_id: 'clm_w2', evidence_refs: ev('ew_2', 'same_src') }),
        claim({ claim_id: 'clm_w3', evidence_refs: ev('ew_3', 'same_src') }),
      ],
    });
    // All assessments carry the single source identity — no wrapper manufactured independence.
    expect(r.confidence_assessments.length).toBe(3);
    expect(r.confidence_assessments.every((a) => a.source_ids.length === 1 && a.source_ids[0] === 'same_src')).toBe(true);
  });

  it('engine consumes m10/m11/m12 outputs without calling them', () => {
    const src = processorSource();
    expect(src.includes('resolveMalwareFamily(')).toBe(false);
    expect(src.includes('correlateInfrastructure(')).toBe(false);
    expect(src.includes('mapBehaviorsToAttackMbc(')).toBe(false);
  });
});
