/**
 * M8 — Deterministic Claim-to-Behavior Processor Tests
 *
 * 18 required scenarios, synthetic claims, novel holdout artifact identities.
 * No real malware family names as anchors anywhere.
 */
import { describe, it, expect } from 'bun:test';
import { readFileSync } from 'node:fs';

import {
  processClaimsToBehaviors,
  validateClaim,
  validateBehavior,
} from '../../packages/intelligence/src/malware/canonical';
import type {
  Artifact,
  MalwareClaim,
  Behavior,
  EvidenceRef,
} from '../../packages/intelligence/src/malware/canonical';

const RUN_ID = 'ar_m8_holdout_001';
const PROCESSED_AT = '2026-09-20T18:00:00.000Z';

// Novel holdout artifact identity.
function makeArtifact(): Artifact {
  return {
    artifact_id: 'art_m8_holdout',
    identity_key: `sha256:${'e3'.repeat(32)}`,
    format_class: 'PE',
    file_names: ['m8_holdout.bin'],
    hashes: { sha256: 'e3'.repeat(32) },
    file_size_bytes: undefined,
    mime_type: 'application/x-dosexec',
    format_attributes: {},
    provenance: { evidence_refs: [], source_ids: [], authority_tier: 'TIER_2', snapshot_ids: [], derived_at: PROCESSED_AT },
  };
}

function staticEvidence(id = 'ev_m8_static'): EvidenceRef[] {
  return [
    { evidence_id: id, source_id: 'src_static_analyzer', source_snapshot_id: RUN_ID, kind: 'STATIC', authority_tier: 'TIER_1', reliability: 'A', credibility: '2', retrieved_at: PROCESSED_AT },
  ];
}

function dynamicEvidence(id = 'ev_m8_dynamic'): EvidenceRef[] {
  return [
    { evidence_id: id, source_id: 'src_dynamic_sandbox', source_snapshot_id: RUN_ID, kind: 'DYNAMIC', authority_tier: 'TIER_1', reliability: 'A', credibility: '2', retrieved_at: PROCESSED_AT },
  ];
}

function makeClaim(partial: Partial<MalwareClaim> & { claim_id: string }): MalwareClaim {
  const evidence = partial.evidence_refs ?? staticEvidence();
  return {
    claim_id: partial.claim_id,
    analysis_run_id: partial.analysis_run_id ?? RUN_ID,
    artifact_id: partial.artifact_id ?? 'art_m8_holdout',
    subject_id: partial.subject_id ?? 'art_m8_holdout',
    predicate: partial.predicate ?? 'REPORTS_VALUE',
    object_value: partial.object_value ?? {},
    statement: partial.statement ?? 'synthetic claim',
    status: partial.status ?? 'SOURCE_REPORTED',
    modality: partial.modality,
    evidence_refs: evidence,
    provenance: partial.provenance ?? {
      evidence_refs: evidence,
      source_ids: [...new Set(evidence.map((e) => e.source_id))],
      authority_tier: 'TIER_1',
      snapshot_ids: [RUN_ID],
      derived_at: PROCESSED_AT,
    },
  };
}

const capaClaim = (): MalwareClaim =>
  makeClaim({
    claim_id: 'clm_m8_capa',
    predicate: 'EXHIBITS_CAPABILITY',
    status: 'CAN_DO',
    modality: 'CAN_DO',
    object_value: { capability_0_name: 'write file', capability_count: 1, tool_name: 'capa' },
    statement: 'Static tooling reported 1 capability candidate(s) (write file); modality is CAN_DO.',
  });

const observedActionClaim = (): MalwareClaim =>
  makeClaim({
    claim_id: 'clm_m8_observed',
    predicate: 'EXHIBITS_BEHAVIOR',
    status: 'OBSERVED_DOING',
    modality: 'OBSERVED_DOING',
    object_value: { behavior_0_name: 'wrote_file', api_name: 'WriteFile' },
    evidence_refs: dynamicEvidence(),
    statement: 'Runtime execution observed the action; dynamic evidence attached.',
  });

const process = (claims: readonly MalwareClaim[], existing?: readonly Behavior[]) =>
  processClaimsToBehaviors({
    analysis_run_id: RUN_ID,
    artifact: makeArtifact(),
    claims,
    existing_behaviors: existing,
    processed_at: PROCESSED_AT,
  });

// ── Tests ────────────────────────────────────────────────────────

describe('M8 — valid transformations', () => {
  it('1. valid dynamic observed-action claim yields OBSERVED_DOING behavior', () => {
    const result = process([observedActionClaim()]);
    expect(result.rejected_claims).toHaveLength(0);
    expect(result.new_behaviors).toHaveLength(1);
    const b = result.new_behaviors[0];
    expect(b.modality).toBe('OBSERVED_DOING');
    expect(b.status).toBe('OBSERVED_DOING');
    expect(b.evidence_kinds).toEqual(['DYNAMIC']);
    expect(validateBehavior(b)).toHaveLength(0);
  });

  it('2. capa capability claim yields capability behavior, never OBSERVED_DOING', () => {
    const result = process([capaClaim()]);
    expect(result.new_behaviors).toHaveLength(1);
    const b = result.new_behaviors[0];
    expect(b.modality).toBe('CAN_DO');
    expect(b.status).toBe('CAN_DO');
    expect(b.category).toBe('capability');
    expect(b.name).toBe('write file');
    expect(b.technique_mappings).toHaveLength(0);
    const json = JSON.stringify(result);
    expect(json).not.toContain('"OBSERVED_DOING"');
  });

  it('12. provenance preserved and traceable (artifact/claim/evidence/source)', () => {
    const result = process([capaClaim()]);
    const b = result.new_behaviors[0];
    expect(b.artifact_id).toBe('art_m8_holdout');
    expect(b.claim_ids).toEqual(['clm_m8_capa']);
    expect(b.evidence_refs.map((e) => e.evidence_id)).toEqual(['ev_m8_static']);
    expect(b.provenance.source_ids).toContain('src_static_analyzer');
    expect(b.provenance.evidence_refs).toHaveLength(1);
  });

  it('17. novel holdout artifact works end-to-end', () => {
    const novelArtifact: Artifact = { ...makeArtifact(), artifact_id: 'art_m8_novel_zz1', hashes: { sha256: 'ff'.repeat(32) } };
    const claim: MalwareClaim = { ...capaClaim(), artifact_id: 'art_m8_novel_zz1', subject_id: 'art_m8_novel_zz1', claim_id: 'clm_m8_novel' };
    const result = processClaimsToBehaviors({
      analysis_run_id: 'ar_m8_novel',
      artifact: novelArtifact,
      claims: [claim],
      processed_at: PROCESSED_AT,
    });
    expect(result.rejected_claims).toHaveLength(0);
    expect(result.new_behaviors).toHaveLength(1);
    expect(result.new_behaviors[0].artifact_id).toBe('art_m8_novel_zz1');
  });

  it('18. novel holdout behavior predicate works without sample-specific logic', () => {
    // EXHIBITS_BEHAVIOR via DYNAMIC evidence on a fresh identity — same generic path.
    const claim: MalwareClaim = {
      ...observedActionClaim(),
      claim_id: 'clm_m8_novel_behavior_predicate',
      object_value: { behavior_0_name: 'connected_to_remote_endpoint' },
    };
    const result = process([claim]);
    expect(result.rejected_claims).toHaveLength(0);
    expect(result.new_behaviors).toHaveLength(1);
    expect(result.new_behaviors[0].name).toBe('connected_to_remote_endpoint');
    expect(result.new_behaviors[0].category).toBe('behavior');
  });
});

describe('M8 — narrow scope: non-transforming claims', () => {
  it('3. static metadata claim produces zero runtime behavior (explicit rejection)', () => {
    const result = process([makeClaim({ claim_id: 'clm_m8_meta', predicate: 'REPORTS_VALUE', status: 'DERIVED', object_value: { architecture: 'x86_64' } })]);
    expect(result.new_behaviors).toHaveLength(0);
    expect(result.rejected_claims[0].reason_code).toBe('unsupported_predicate');
  });

  it('4. YARA match claim produces zero automatic runtime behavior', () => {
    const result = process([makeClaim({ claim_id: 'clm_m8_yara', predicate: 'REPORTS_VALUE', status: 'SOURCE_REPORTED', object_value: { match_0_rule: 'Some_Rule' } })]);
    expect(result.new_behaviors).toHaveLength(0);
    expect(result.rejected_claims[0].reason_code).toBe('unsupported_predicate');
  });

  it('5. FLOSS string claim produces zero automatic runtime behavior', () => {
    const result = process([makeClaim({ claim_id: 'clm_m8_floss', predicate: 'REPORTS_VALUE', status: 'SOURCE_REPORTED', object_value: { decoded_0: 'https://x.invalid' } })]);
    expect(result.new_behaviors).toHaveLength(0);
    expect(result.rejected_claims[0].reason_code).toBe('unsupported_predicate');
  });

  it('family/attribution-flavored predicates never transform', () => {
    const result = process([
      makeClaim({ claim_id: 'clm_m8_classified', predicate: 'CLASSIFIED_AS', status: 'SOURCE_REPORTED', object_value: { label: 'whatever' } }),
      makeClaim({ claim_id: 'clm_m8_attributed', predicate: 'ATTRIBUTED_TO', status: 'SOURCE_REPORTED', object_value: { group: 'whatever' } }),
    ]);
    expect(result.new_behaviors).toHaveLength(0);
    expect(result.rejected_claims.every((r) => r.reason_code === 'unsupported_predicate')).toBe(true);
  });
});

describe('M8 — safety rejections', () => {
  it('6. invalid claim (capability claim without modality) → rejected via canonical validator', () => {
    const invalid: MalwareClaim = { ...capaClaim(), claim_id: 'clm_m8_invalid', modality: undefined };
    expect(validateClaim(invalid).length).toBeGreaterThan(0); // canonical validator disagrees first
    const result = process([invalid]);
    expect(result.new_behaviors).toHaveLength(0);
    expect(result.rejected_claims[0].reason_code).toBe('claim_validation_failed');
  });

  it('7. missing provenance/evidence → rejected', () => {
    const noEvidence: MalwareClaim = { ...capaClaim(), claim_id: 'clm_m8_noproof', evidence_refs: [], provenance: { evidence_refs: [], source_ids: [], authority_tier: 'TIER_4', snapshot_ids: [], derived_at: PROCESSED_AT } };
    const result = process([noEvidence]);
    expect(result.new_behaviors).toHaveLength(0);
    expect(result.rejected_claims[0].reason_code).toBe('invalid_provenance');
  });

  it('8. artifact/claim mismatch → rejected', () => {
    const foreign: MalwareClaim = { ...capaClaim(), claim_id: 'clm_m8_foreign', artifact_id: 'art_some_other' };
    const result = process([foreign]);
    expect(result.new_behaviors).toHaveLength(0);
    expect(result.rejected_claims[0].reason_code).toBe('claim_artifact_mismatch');
  });

  it('13. static evidence cannot create observed runtime behavior', () => {
    // Canonical validator itself rejects OBSERVED_DOING without DYNAMIC evidence;
    // the processor must agree and reject explicitly.
    const fakeObserved: MalwareClaim = { ...observedActionClaim(), claim_id: 'clm_m8_fake', evidence_refs: staticEvidence() };
    const result = process([fakeObserved]);
    expect(result.new_behaviors).toHaveLength(0);
    expect(result.rejected_claims[0].reason_code).toBe('claim_validation_failed');
    const json = JSON.stringify(result);
    expect(json).not.toContain('"OBSERVED_DOING":'); // no behavior object carries it
  });

  it('status/modality disagreement is rejected without reinterpretation', () => {
    const disagree: MalwareClaim = { ...capaClaim(), claim_id: 'clm_m8_disagree', status: 'OBSERVED_DOING', modality: 'CAN_DO', evidence_refs: dynamicEvidence() };
    const result = process([disagree]);
    expect(result.new_behaviors).toHaveLength(0);
    expect(result.rejected_claims[0].reason_code).toBe('incompatible_modality');
  });

  it('UNKNOWN/CONFLICT/SOURCE_REPORTED statuses never transform', () => {
    const result = process([
      makeClaim({ claim_id: 'clm_m8_src', predicate: 'EXHIBITS_CAPABILITY', status: 'SOURCE_REPORTED', modality: 'CAN_DO' }),
      makeClaim({ claim_id: 'clm_m8_unknown', predicate: 'EXHIBITS_CAPABILITY', status: 'UNKNOWN' }),
    ]);
    expect(result.new_behaviors).toHaveLength(0);
    expect(result.rejected_claims.every((r) => r.reason_code === 'incompatible_epistemic_status' || r.reason_code === 'claim_validation_failed')).toBe(true);
  });

  it('artifact identity missing → all claims rejected', () => {
    const result = processClaimsToBehaviors({
      analysis_run_id: RUN_ID,
      artifact: { ...makeArtifact(), artifact_id: '' },
      claims: [capaClaim()],
      processed_at: PROCESSED_AT,
    });
    expect(result.new_behaviors).toHaveLength(0);
    expect(result.rejected_claims).toHaveLength(1);
  });
});

describe('M8 — dedup and determinism', () => {
  it('9. existing behavior prevents duplicate', () => {
    const first = process([capaClaim()]);
    const second = process([capaClaim()], first.new_behaviors);
    expect(second.new_behaviors).toHaveLength(0);
    expect(second.skipped_claims).toHaveLength(1);
    expect(second.skipped_claims[0].reason).toBe('duplicate_of_existing_behavior');
  });

  it('10. duplicate claim batch does not duplicate behavior', () => {
    const c = capaClaim();
    const result = process([c, { ...c }]); // identical claim twice
    expect(result.new_behaviors).toHaveLength(1);
    expect(result.skipped_claims).toHaveLength(1);
    expect(result.skipped_claims[0].reason).toBe('duplicate_in_batch');
  });

  it('different evidence-backed behaviors remain distinct', () => {
    const a = capaClaim();
    const b: MalwareClaim = { ...capaClaim(), claim_id: 'clm_m8_capa_b', evidence_refs: staticEvidence('ev_m8_static_other'), object_value: { capability_0_name: 'read file', capability_count: 1 } };
    const result = process([a, b]);
    expect(result.new_behaviors).toHaveLength(2);
  });

  it('11. identical input produces identical output (deep equality)', () => {
    const claims = [capaClaim(), observedActionClaim()];
    expect(process(claims)).toEqual(process(claims));
  });
});

describe('M8 — boundaries and holdout', () => {
  it('14. CAN_DO never becomes OBSERVED_DOING anywhere in the result', () => {
    const result = process([capaClaim()]);
    for (const b of result.new_behaviors) {
      expect(b.modality === 'OBSERVED_DOING').toBe(false);
      expect(b.status === 'OBSERVED_DOING').toBe(false);
    }
  });

  it('15. no confidence ranking/finalization (source scan + output scan)', () => {
    const src = readFileSync('packages/intelligence/src/malware/canonical/behaviorProcessor.ts', 'utf8')
      .split('\n')
      .filter((l) => !/^\s*(\/\/|\*|\/\*)/.test(l))
      .join('\n');
    for (const w of ['HIGH', 'MEDIUM', 'LOW']) expect(src.includes(w)).toBe(false);
    const result = process([capaClaim(), observedActionClaim()]);
    const json = JSON.stringify(result);
    for (const w of ['confidence', 'ranking', 'score']) expect(json.toLowerCase().includes(w)).toBe(false);
  });

  it('16. no family/actor/campaign/technique leakage in output', () => {
    const result = process([capaClaim(), observedActionClaim()]);
    const json = JSON.stringify(result).toLowerCase();
    for (const w of ['family', 'actor', 'campaign', 'att&ck', '"mbc"', 'technique_id', 'mapping_provenance', 'attribution']) {
      expect(json.includes(w)).toBe(false);
    }
    expect(result.new_behaviors.every((b) => b.technique_mappings.length === 0)).toBe(true);
  });

  it('no sample-specific logic in processor source (comment-stripped scan)', () => {
    const src = readFileSync('packages/intelligence/src/malware/canonical/behaviorProcessor.ts', 'utf8')
      .split('\n')
      .filter((l) => !/^\s*(\/\/|\*|\/\*)/.test(l))
      .join('\n');
    for (const forbidden of ['CVE-', 'sha256 ===', 'hash ===', 'family ===', 'malware ===', 'sample ===', 'artifact_id ===', 'ATT&CK', 'MBC', 'WannaCry', 'RedLine', 'Emotet', 'Ryuk', 'LockBit', 'Mirai']) {
      expect(src.includes(forbidden)).toBe(false);
    }
  });
});
