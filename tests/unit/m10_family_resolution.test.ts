/**
 * M10 — Deterministic Family Resolution Engine Tests
 *
 * 28 required scenarios, synthetic candidates, novel holdout artifact
 * identities. No real malware family names as implementation anchors.
 */
import { describe, it, expect } from 'bun:test';
import { readFileSync } from 'node:fs';

import {
  resolveMalwareFamily,
  normalizeFamilyLabel,
  validateFamilyCandidate,
} from '../../packages/intelligence/src/malware/canonical';
import type {
  Artifact,
  FamilyCandidate,
  FamilySignal,
} from '../../packages/intelligence/src/malware/canonical';

const RUN_ID = 'ar_m10_holdout_001';
const RESOLVED_AT = '2026-09-20T20:00:00.000Z';

function makeArtifact(): Artifact {
  return {
    artifact_id: 'art_m10_holdout',
    identity_key: `sha256:${'b7'.repeat(32)}`,
    format_class: 'PE',
    file_names: ['m10_holdout.bin'],
    hashes: { sha256: 'b7'.repeat(32) },
    file_size_bytes: undefined,
    mime_type: 'application/x-dosexec',
    format_attributes: {},
    provenance: { evidence_refs: [], source_ids: [], authority_tier: 'TIER_2', snapshot_ids: [], derived_at: RESOLVED_AT },
  };
}

function evidence(id: string, source: string, kind: 'STATIC' | 'DYNAMIC' | 'RESEARCH' | 'INFERENCE' = 'RESEARCH') {
  return [
    { evidence_id: id, source_id: source, source_snapshot_id: RUN_ID, kind, authority_tier: 'TIER_1' as const, reliability: 'A' as const, credibility: '2' as const, retrieved_at: RESOLVED_AT },
  ];
}

function signal(partial: Partial<FamilySignal> & { signal_id: string; supports_candidate: string }): FamilySignal {
  const ev = partial.evidence_refs ?? evidence(`ev_${partial.signal_id}`, 'src_source_a');
  return {
    signal_id: partial.signal_id,
    signal_type: partial.signal_type ?? 'source_reported_label',
    signal_value: partial.signal_value ?? 'label',
    supports_candidate: partial.supports_candidate,
    status: partial.status ?? 'SOURCE_REPORTED',
    evidence_refs: ev,
    provenance: partial.provenance ?? {
      evidence_refs: ev,
      source_ids: [...new Set(ev.map((e) => e.source_id))],
      authority_tier: 'TIER_1',
      snapshot_ids: [RUN_ID],
      derived_at: RESOLVED_AT,
    },
  };
}

function candidate(partial: Partial<FamilyCandidate> & { candidate_family: string; signals: FamilySignal[] }): FamilyCandidate {
  const ev = partial.provenance?.evidence_refs ?? partial.signals.flatMap((s) => s.evidence_refs);
  return {
    family_candidate_id: partial.family_candidate_id ?? `fc_${partial.candidate_family}`,
    analysis_run_id: partial.analysis_run_id ?? RUN_ID,
    artifact_id: partial.artifact_id ?? 'art_m10_holdout',
    candidate_family: partial.candidate_family,
    signals: partial.signals,
    contradicting_signals: partial.contradicting_signals ?? [],
    source_ids: partial.source_ids ?? [...new Set(partial.signals.flatMap((s) => s.evidence_refs.map((e) => e.source_id)))],
    confidence: partial.confidence ?? {
      confidence_id: `conf_${partial.candidate_family}`,
      analysis_run_id: RUN_ID,
      signals: [],
      aggregate: 0,
      basis: [],
      uncertainty: { unassessed_dimensions: [], contested_dimensions: [], limitations: [] },
      provenance: { evidence_refs: ev, source_ids: [], authority_tier: 'TIER_1', snapshot_ids: [RUN_ID], derived_at: RESOLVED_AT },
    },
    resolution_state: partial.resolution_state ?? 'UNRESOLVED',
    provenance: partial.provenance ?? {
      evidence_refs: ev,
      source_ids: [...new Set(partial.signals.flatMap((s) => s.evidence_refs.map((e) => e.source_id)))],
      authority_tier: 'TIER_1',
      snapshot_ids: [RUN_ID],
      derived_at: RESOLVED_AT,
    },
  };
}

// Weak: single source, label-only (no STATIC/DYNAMIC/DERIVED corroboration).
const weakCandidate = (label = 'Family_X') =>
  candidate({
    candidate_family: label,
    signals: [signal({ signal_id: 'sig_weak_label', supports_candidate: label })],
  });

// Strong: two independent sources + a derived static-structural signal.
const strongCandidate = (label = 'Family_X') =>
  candidate({
    candidate_family: label,
    signals: [
      signal({ signal_id: 'sig_label_a', supports_candidate: label, evidence_refs: evidence('ev_lbl_a', 'src_source_a') }),
      signal({ signal_id: 'sig_label_b', supports_candidate: label, evidence_refs: evidence('ev_lbl_b', 'src_source_b') }),
      signal({
        signal_id: 'sig_struct_static',
        supports_candidate: label,
        signal_type: 'static_structural',
        status: 'DERIVED',
        evidence_refs: evidence('ev_struct', 'src_static_analyzer', 'STATIC'),
      }),
    ],
  });

const resolve = (
  candidates: readonly FamilyCandidate[],
  opts?: Partial<Parameters<typeof resolveMalwareFamily>[0]>
) =>
  resolveMalwareFamily({
    analysis_run_id: RUN_ID,
    artifact: makeArtifact(),
    candidates,
    resolved_at: RESOLVED_AT,
    ...opts,
  });

function processorSource(): string {
  const raw = readFileSync('packages/intelligence/src/malware/canonical/familyResolution.ts', 'utf8');
  return raw.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/\/\/.*$/gm, ' ');
}

// ── Tests ────────────────────────────────────────────────────────

describe('M10 — resolution states', () => {
  it('1. single source-reported candidate with weak evidence → unresolved', () => {
    const r = resolve([weakCandidate()]);
    expect(r.resolution_state).toBe('UNRESOLVED');
    expect(r.resolved_family).toBeNull();
  });

  it('2. source-reported candidate + independent supporting evidence → support increases and can resolve', () => {
    const weak = resolve([weakCandidate()]);
    const strengthened = resolve([strongCandidate()]);
    const weakEval = weak.candidates[0];
    const strongEval = strengthened.candidates[0];
    expect(strongEval.resolution_support).toBeGreaterThan(weakEval.resolution_support);
    expect(strengthened.resolution_state).toBe('RESOLVED');
    expect(strengthened.resolved_family).toBe(normalizeFamilyLabel('Family_X'));
  });

  it('3. insufficient evidence → unresolved (abstention, never a guess)', () => {
    const r = resolve([weakCandidate()]);
    expect(r.resolution_state).toBe('UNRESOLVED');
    expect(r.resolved_family).toBeNull();
    expect(r.resolution_reason).toContain('unresolved');
  });

  it('4. one clearly supported candidate → resolved', () => {
    const r = resolve([strongCandidate()]);
    expect(r.resolution_state).toBe('RESOLVED');
    expect(r.resolved_family).toBe('family_x');
    expect(r.resolution_reason).toContain('resolved');
  });

  it('5. two materially supported candidates → conflict', () => {
    const r = resolve([strongCandidate('Family_X'), strongCandidate('Family_Y')]);
    expect(r.resolution_state).toBe('CONTESTED');
    expect(r.resolved_family).toBeNull();
  });

  it('6. equal-support candidates → conflict (no arbitrary tie-break)', () => {
    const r = resolve([strongCandidate('Family_P'), strongCandidate('Family_Q')]);
    expect(r.resolution_state).toBe('CONTESTED');
    expect(r.resolved_family).toBeNull();
  });

  it('26. empty candidate set → unresolved', () => {
    const r = resolve([]);
    expect(r.resolution_state).toBe('UNRESOLVED');
    expect(r.resolved_family).toBeNull();
    expect(r.candidates).toHaveLength(0);
  });

  it('28. candidate with only generic evidence → unresolved', () => {
    const c = candidate({
      candidate_family: 'Family_G',
      signals: [
        signal({ signal_id: 'sig_generic_behavior', supports_candidate: 'Family_G', signal_type: 'behavior', evidence_refs: evidence('ev_generic', 'src_sandbox', 'DYNAMIC') }),
      ],
    });
    const r = resolve([c]);
    expect(r.resolution_state).toBe('UNRESOLVED');
  });
});

describe('M10 — candidates, normalization, preservation', () => {
  it('7. losing candidate evidence remains preserved after resolution', () => {
    const loser = candidate({
      candidate_family: 'Family_Loser',
      signals: [
        signal({ signal_id: 'sig_loser_a', supports_candidate: 'Family_Loser', evidence_refs: evidence('ev_loser_a', 'src_source_a') }),
        signal({ signal_id: 'sig_loser_b', supports_candidate: 'Family_Loser', evidence_refs: evidence('ev_loser_b', 'src_source_b') }),
      ],
    });
    // Winner carries a yara-class signal on top of the same base so it
    // materially outranks the loser (generic weights, no family specifics).
    const winner = candidate({
      candidate_family: 'Family_Winner',
      signals: [
        ...strongCandidate('Family_Winner').signals,
        signal({ signal_id: 'sig_winner_yara', supports_candidate: 'Family_Winner', signal_type: 'yara', status: 'DERIVED', evidence_refs: evidence('ev_winner_yara', 'src_yara', 'STATIC') }),
      ],
    });
    const r = resolve([winner, loser]);
    expect(r.resolution_state).toBe('RESOLVED');
    expect(r.resolved_family).toBe('family_winner');
    const loserEval = r.candidates.find((c) => c.normalized_identity === 'family_loser');
    expect(loserEval).toBeDefined();
    expect(loserEval!.supporting_signals.length).toBe(2);
    expect(loserEval!.evidence_count).toBe(2);
    expect(r.supporting_evidence.map((e) => e.evidence_id)).toContain('ev_loser_a');
  });

  it('8/19. source labels preserved after deterministic normalization merge', () => {
    expect(normalizeFamilyLabel('  Family-X ')).toBe('family_x');
    expect(normalizeFamilyLabel('FAMILY_X')).toBe('family_x');
    expect(normalizeFamilyLabel('family.x')).toBe('family_x');
    const a = weakCandidate('Family-X');
    const b = weakCandidate('FAMILY_X');
    const r = resolve([a, b]);
    expect(r.candidates).toHaveLength(1);
    expect(r.candidates[0].source_labels.sort()).toEqual(['FAMILY_X', 'Family-X']);
    expect(r.candidates[0].normalized_identity).toBe('family_x');
    // Evidence preserved from both merged candidates.
    expect(r.candidates[0].supporting_signals.length).toBe(2);
  });

  it('20. conflicting labels remain conflict/unresolved as appropriate', () => {
    const r = resolve([weakCandidate('Family_A'), weakCandidate('Family_B')]);
    // Both weak → nothing qualifies; state stays UNRESOLVED, both candidates visible.
    expect(r.resolution_state).toBe('UNRESOLVED');
    expect(r.candidates.map((c) => c.normalized_identity).sort()).toEqual(['family_a', 'family_b']);
  });

  it('18. novel family candidate works without hardcoded mapping', () => {
    const r = resolve([strongCandidate('Zqx_NeverSeenFamily_9x7')]);
    expect(r.resolution_state).toBe('RESOLVED');
    expect(r.resolved_family).toBe('zqx_neverseenfamily_9x7');
  });

  it('27. null/invalid candidate → explicit rejection', () => {
    const r = resolve([null as unknown as FamilyCandidate, weakCandidate()]);
    expect(r.rejected_candidates).toHaveLength(1);
    expect(r.rejected_candidates[0].reason_code).toBe('candidate_null');
    expect(r.candidates).toHaveLength(1);
    // Label-less candidate also rejected explicitly.
    const noLabel = { ...weakCandidate('Family_Z'), candidate_family: '' };
    const r2 = resolve([noLabel]);
    expect(r2.rejected_candidates[0].reason_code).toBe('candidate_label_missing');
  });
});

describe('M10 — evidence discipline', () => {
  it('9. configuration signal contributes only through provenance-backed evidence', () => {
    const noEv = signal({
      signal_id: 'sig_conf_no_ev',
      supports_candidate: 'Family_C',
      signal_type: 'configuration',
      status: 'DERIVED',
      evidence_refs: [],
    });
    const withEv = signal({
      signal_id: 'sig_conf_ev',
      supports_candidate: 'Family_C',
      signal_type: 'configuration',
      status: 'DERIVED',
      evidence_refs: evidence('ev_conf', 'src_config_extractor', 'STATIC'),
    });
    // Evidence-free configuration signal contributes zero (the candidate's
    // own provenance carries an identity evidence ref, independent of signals).
    const identityEv = evidence('ev_cand_identity', 'src_identity', 'STATIC');
    const cNoEv = {
      ...candidate({ candidate_family: 'Family_C', signals: [noEv] }),
      provenance: {
        evidence_refs: identityEv,
        source_ids: ['src_identity'],
        authority_tier: 'TIER_1' as const,
        snapshot_ids: [RUN_ID],
        derived_at: RESOLVED_AT,
      },
    };
    const r1 = resolve([cNoEv]);
    expect(r1.rejected_candidates).toHaveLength(0);
    expect(r1.candidates[0].resolution_support).toBe(0);
    expect(r1.candidates[0].confidence_basis.join(' ')).toContain('contributes zero');
    // Provenance-backed configuration signal contributes its weight.
    const r2 = resolve([
      candidate({
        candidate_family: 'Family_C',
        signals: [withEv, signal({ signal_id: 'sig_c_b', supports_candidate: 'Family_C', evidence_refs: evidence('ev_c_b', 'src_source_b') })],
      }),
    ]);
    expect(r2.candidates[0].resolution_support).toBeGreaterThan(0);
  });

  it('10. generic behavior alone cannot resolve a family', () => {
    const c = candidate({
      candidate_family: 'Family_Beh',
      signals: [
        signal({ signal_id: 'sig_beh', supports_candidate: 'Family_Beh', signal_type: 'behavior', status: 'DERIVED', evidence_refs: evidence('ev_beh', 'src_sandbox', 'DYNAMIC') }),
      ],
    });
    const r = resolve([c]);
    expect(r.resolution_state).toBe('UNRESOLVED');
  });

  it('11. weak static indicator alone cannot resolve a family', () => {
    const c = candidate({
      candidate_family: 'Family_Static',
      signals: [
        signal({ signal_id: 'sig_weak_static', supports_candidate: 'Family_Static', signal_type: 'static_structural', status: 'DERIVED', evidence_refs: evidence('ev_ws', 'src_static_analyzer', 'STATIC') }),
      ],
    });
    const r = resolve([c]);
    expect(r.resolution_state).toBe('UNRESOLVED');
  });

  it('12. cross-artifact evidence → rejection', () => {
    const foreign = { ...weakCandidate('Family_F'), artifact_id: 'art_m10_other_zz5' };
    const r = resolve([foreign]);
    expect(r.rejected_candidates[0].reason_code).toBe('candidate_artifact_mismatch');
    expect(r.candidates).toHaveLength(0);
    expect(r.resolution_state).toBe('UNRESOLVED');
    // Foreign non-candidate input also rejected.
    const r2 = resolve([weakCandidate()], {
      claims: [{ claim_id: 'clm_foreign', artifact_id: 'art_m10_other_zz5' } as never],
    });
    expect(r2.rejected_candidates.some((x) => x.reason_code === 'input_artifact_mismatch')).toBe(true);
  });

  it('13. missing provenance → rejection', () => {
    const bad = candidate({
      candidate_family: 'Family_Noprov',
      signals: [signal({ signal_id: 'sig_np', supports_candidate: 'Family_Noprov' })],
    });
    const noProv = { ...bad, provenance: { evidence_refs: [], source_ids: [], authority_tier: 'TIER_1', snapshot_ids: [], derived_at: RESOLVED_AT } };
    const r = resolve([noProv]);
    expect(r.rejected_candidates[0].reason_code).toBe('invalid_provenance');
  });
});

describe('M10 — determinism and idempotency', () => {
  it('14. deterministic candidate ordering regardless of input order', () => {
    const a = strongCandidate('Family_Aaa');
    const b = strongCandidate('Family_Bbb');
    const r1 = resolve([b, a]);
    const r2 = resolve([a, b]);
    expect(r1.candidates.map((c) => c.normalized_identity)).toEqual(r2.candidates.map((c) => c.normalized_identity));
  });

  it('15/18. deterministic resolution identity (no timestamp/random input)', () => {
    const r1 = resolve([strongCandidate('Family_Idem')]);
    const r2 = resolve([strongCandidate('Family_Idem')]);
    expect(r1.resolution_id).toBe(r2.resolution_id);
    // Different semantic input → different identity.
    const r3 = resolve([strongCandidate('Family_Other')]);
    expect(r3.resolution_id).not.toBe(r1.resolution_id);
  });

  it('16/20. repeated execution → identical output, no caller mutation', () => {
    const cands = [strongCandidate('Family_Idem2'), weakCandidate('Family_Weak')];
    const before = JSON.stringify(cands);
    const r1 = resolve(cands);
    const r2 = resolve(cands);
    expect(r1).toEqual(r2);
    expect(JSON.stringify(cands)).toBe(before);
  });

  it('25. existing result is not silently overwritten without valid recomputation', () => {
    const cands = [strongCandidate('Family_Keep')];
    const first = resolve(cands);
    const again = resolve(cands, { existing_result: first });
    expect(again).toBe(first); // identical recomputation → existing result object returned
    // Different input → fresh, validly recomputed result (not the old one).
    const changed = resolve([weakCandidate('Family_Keep')], { existing_result: first });
    expect(changed).not.toBe(first);
    expect(changed.resolution_id).not.toBe(first.resolution_id);
  });
});

describe('M10 — boundaries and genericity', () => {
  it('17. no family-specific source code (comment-stripped scan)', () => {
    const src = processorSource();
    for (const pat of [
      'CVE-', 'sha256 ===', 'hash ===', 'family ===', 'malware ===', 'sample ===', 'artifact_id ===',
      'WannaCry', 'RedLine', 'Emotet', 'Ryuk', 'LockBit', 'Mirai', 'ATTACK', 'ATT&CK', 'MBC',
      "'HIGH'", "'MEDIUM'", "'LOW'",
    ]) {
      expect(src.includes(pat)).toBe(false);
    }
  });

  it('21. resolved result retains supporting and contradicting evidence', () => {
    const winner = strongCandidate('Family_W');
    const withContradiction = candidate({
      candidate_family: 'Family_W',
      signals: winner.signals,
      contradicting_signals: [
        signal({ signal_id: 'sig_contra', supports_candidate: 'Family_W', signal_type: 'research', evidence_refs: evidence('ev_contra', 'src_research_b') }),
      ],
    });
    const r = resolve([withContradiction]);
    expect(r.resolution_state).toBe('RESOLVED');
    expect(r.supporting_evidence.length).toBeGreaterThan(0);
    expect(r.conflicting_evidence.map((e) => e.evidence_id)).toContain('ev_contra');
    expect(r.candidates[0].contradicting_signals).toHaveLength(1);
  });

  it('22. no ATT&CK/MBC mapping in result', () => {
    const out = JSON.stringify(resolve([strongCandidate('Family_Tech')]));
    expect(out.includes('technique')).toBe(false);
    expect(out.includes('ATTACK')).toBe(false);
    expect(out.includes('MBC')).toBe(false);
  });

  it('23. no actor/campaign attribution in result', () => {
    const out = JSON.stringify(resolve([strongCandidate('Family_Attrl')]));
    expect(out.includes('attribution')).toBe(false);
    expect(out.includes('campaign')).toBe(false);
    expect(out.includes('actor_attribution')).toBe(false);
  });

  it('24. no final confidence ranking (resolution support only, per-candidate basis)', () => {
    const r = resolve([strongCandidate('Family_Conf'), weakCandidate('Family_Conf2')]);
    const out = JSON.stringify(r);
    expect(out.includes('"HIGH"')).toBe(false);
    expect(out.includes('"MEDIUM"')).toBe(false);
    expect(out.includes('"LOW"')).toBe(false);
    // Explainable basis per candidate — the reason is not hidden in one number.
    for (const c of r.candidates) {
      expect(c.confidence_basis.length).toBe(c.supporting_signals.length);
    }
    expect(r.resolution_reason).toContain('support');
  });

  it('candidate validation still enforced via canonical validator', () => {
    const c = weakCandidate('Family_V');
    expect(validateFamilyCandidate(c)).toHaveLength(0);
  });
});
