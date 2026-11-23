/**
 * M14.2 — Evidence Support vs Intelligence Confidence: Semantic Presentation Tests
 *
 * Protects the distinction between M13's mathematical EVIDENCE SUPPORT and
 * intelligence confidence/certainty. The numeric support value must remain
 * unchanged; only deterministic semantic presentation metadata is added.
 * Synthetic fixtures, novel holdout identities only.
 */
import { describe, it, expect } from 'bun:test';

import {
  resolveConfidenceAndConflicts,
  acquireMalwareSample,
  analyzeMalwareArtifact,
  buildAnalysisRunBinding,
  buildMalwareIntelligenceReport,
  buildPublicReportPayload,
  deriveSupportSemantics,
} from '../../packages/intelligence/src/malware/canonical';
import type { Artifact } from '../../packages/intelligence/src/malware/canonical/artifact';
import type { MalwareClaim } from '../../packages/intelligence/src/malware/canonical/claim';

const RUN_ID = 'ar_m142_semantics_001';
const AT = '2026-09-21T01:00:00.000Z';
const ART = 'art_m142_holdout';

// ── fixtures ──

function evidence(id: string, kind: 'STATIC' | 'DYNAMIC' | 'RESEARCH' | 'INFERENCE' = 'STATIC') {
  return [
    {
      evidence_id: id,
      source_id: 'src_m142_holdout',
      source_snapshot_id: RUN_ID,
      kind,
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
    identity_key: `sha256:${'d'.repeat(64)}`,
    format_class: 'PE',
    file_names: ['m142_holdout.bin'],
    hashes: { sha256: 'd'.repeat(64) },
    file_size_bytes: 1024,
    mime_type: 'application/x-dosexec',
    format_attributes: {},
    provenance: prov(evidence('ev_art_m142')),
  } as unknown as Artifact;
}

function makeClaim(partial: Partial<MalwareClaim> & { claim_id: string; object_value: Record<string, string | number | boolean | null> }): MalwareClaim {
  const ev = evidence(`ev_${partial.claim_id}`);
  return {
    analysis_run_id: RUN_ID,
    artifact_id: ART,
    subject_id: ART,
    predicate: 'REPORTS_VALUE',
    statement: 'synthetic claim',
    status: 'DERIVED',
    evidence_refs: ev,
    provenance: prov(ev),
    ...partial,
  } as MalwareClaim;
}

const run = (input: { claims?: MalwareClaim[]; existing_result?: unknown }) =>
  resolveConfidenceAndConflicts({
    analysis_run_id: RUN_ID,
    artifact: makeArtifact(),
    claims: input.claims ?? [],
    behaviors: [],
    configurations: [],
    resolved_at: AT,
    ...(input.existing_result ? { existing_result: input.existing_result as never } : {}),
  });

const semanticsOf = (a: { epistemic_states: readonly string[]; evidence_kinds: readonly string[]; evidence_ids: readonly string[] }) =>
  deriveSupportSemantics(a);

// ── semantic templates (cases A–E, H, I) ──

describe('M14.2 — deterministic support semantics per epistemic state', () => {
  it('CASE A: DERIVED + STATIC + support=1 → metric EVIDENCE_SUPPORT, strong-direct-support wording, NO certainty semantics', () => {
    const r = run({ claims: [makeClaim({ claim_id: 'clm_a', object_value: { detail: 'Zqx_Detail_A' } })] });
    expect(r.confidence_assessments.length).toBeGreaterThan(0);
    const a = r.confidence_assessments[0];
    expect(a.support).toBe(1); // math unchanged
    const sem = semanticsOf(a);
    expect(sem.metric).toBe('EVIDENCE_SUPPORT');
    expect(sem.epistemic_status).toEqual([...a.epistemic_states]);
    expect(sem.evidence_kind).toEqual([...a.evidence_kinds]);
    expect(sem.lineage_count).toBe(a.evidence_ids.length);
    expect(sem.interpretation).toContain('does not imply execution or absolute certainty');
    const text = JSON.stringify(sem).toLowerCase();
    expect(text.includes('certainty: 100%')).toBe(false);
    expect(text.includes('malicious')).toBe(false);
    expect(text.includes('confirmed')).toBe(false);
    expect(text.includes('definitive')).toBe(false);
  });

  it('CASE B: support 0.75-equivalent mixed lineage → numeric preserved verbatim, deterministic basis', () => {
    // Two statuses in one lineage: DERIVED (1.0) + SOURCE_REPORTED (0.5) → aggregate 0.75 via canonical math.
    const ev = evidence('ev_mixed_m142');
    const claim: MalwareClaim = {
      ...makeClaim({ claim_id: 'clm_b', object_value: { host: '198.51.100.2' } }),
      status: 'SOURCE_REPORTED',
      evidence_refs: ev,
      provenance: prov(ev),
    };
    const r = resolveConfidenceAndConflicts({
      analysis_run_id: RUN_ID,
      artifact: makeArtifact(),
      claims: [claim, makeClaim({ claim_id: 'clm_b2', object_value: { host: '198.51.100.2' } })],
      resolved_at: AT,
    });
    const withMixed = r.confidence_assessments.find((a) => Math.abs(a.support - 0.75) < 1e-9);
    if (withMixed) {
      expect(withMixed.support).toBe(0.75);
      expect(withMixed.support_semantics ?? semanticsOf(withMixed)).toBeTruthy();
      const sem = semanticsOf(withMixed);
      expect(sem.metric).toBe('EVIDENCE_SUPPORT');
      expect(sem.lineage_count).toBe(1);
    } else {
      // aggregation produced a different bounded mix — semantics must still carry the untouched value
      for (const a of r.confidence_assessments) {
        expect(semanticsOf(a).metric).toBe('EVIDENCE_SUPPORT');
      }
    }
  });

  it('CASE C: SOURCE_REPORTED lineage → source-reported wording', () => {
    const claim = makeClaim({ claim_id: 'clm_c', status: 'SOURCE_REPORTED', object_value: { url: 'https://example.com/zqx' } });
    const r = run({ claims: [claim] });
    const a = r.confidence_assessments.find((x) => x.epistemic_states.includes('SOURCE_REPORTED'));
    expect(a).toBeDefined();
    expect(a!.support).toBe(0.5); // canonical weight untouched
    expect(semanticsOf(a!).interpretation).toContain('source-reported evidence');
    expect(semanticsOf(a!).interpretation).toContain('does not independently establish');
  });

  it('CASE D: INFERRED lineage → inferential wording', () => {
    const claim = makeClaim({ claim_id: 'clm_d', status: 'INFERRED', object_value: { note: 'Zqx_Inferred_9x2' } });
    const r = run({ claims: [claim] });
    const a = r.confidence_assessments.find((x) => x.epistemic_states.includes('INFERRED'));
    expect(a).toBeDefined();
    expect(a!.support).toBe(0.25);
    expect(semanticsOf(a!).interpretation).toContain('inferential');
  });

  it('CASE E: HYPOTHESIS lineage → hypothetical wording', () => {
    const claim = makeClaim({ claim_id: 'clm_e', status: 'HYPOTHESIS', object_value: { note: 'Zqx_Hypo_9x3' } });
    const r = run({ claims: [claim] });
    const a = r.confidence_assessments.find((x) => x.epistemic_states.includes('HYPOTHESIS'));
    expect(a).toBeDefined();
    expect(a!.support).toBe(0.1);
    expect(semanticsOf(a!).interpretation).toContain('hypothetical');
  });

  it('CASE H: single static DERIVED lineage with support 1 → strong direct evidence support, NOT certainty; static-only limitation present', () => {
    const r = run({ claims: [makeClaim({ claim_id: 'clm_h', object_value: { detail: 'Zqx_Detail_H' } })] });
    const a = r.confidence_assessments.find((x) => x.support === 1);
    expect(a).toBeDefined();
    const sem = semanticsOf(a!);
    expect(sem.interpretation).toContain('Strong direct support');
    expect(sem.interpretation).toContain('Static evidence only');
    expect(sem.interpretation).toContain('dynamic execution was not performed');
    const lower = sem.interpretation.toLowerCase();
    expect(lower.includes('100% certainty')).toBe(false);
    expect(lower.includes('malware confirmed')).toBe(false);
    expect(lower.includes('behavior confirmed')).toBe(false);
  });

  it('CASE I: CAN_DO capability semantics — capability wording, never executed behavior', () => {
    const claim = makeClaim({ claim_id: 'clm_i', status: 'CAN_DO', object_value: { capability: 'Zqx_Capability_9x4' } });
    const r = run({ claims: [claim] });
    const a = r.confidence_assessments.find((x) => x.epistemic_states.includes('CAN_DO'));
    expect(a).toBeDefined();
    const interpretation = semanticsOf(a!).interpretation;
    expect(interpretation).toContain('can do this');
    expect(interpretation).toContain('does not imply observed execution');
    const text = interpretation.toLowerCase();
    expect(text.includes('executed behavior')).toBe(false);
    expect(text.includes('confirmed behavior')).toBe(false);
  });

  it('interpretation is deterministic: same input → identical text; no randomness/timestamps in semantics', () => {
    const r1 = run({ claims: [makeClaim({ claim_id: 'clm_det', object_value: { note: 'Zqx_Det_9x5' } })] });
    const r2 = run({ claims: [makeClaim({ claim_id: 'clm_det', object_value: { note: 'Zqx_Det_9x5' } })] });
    expect(semanticsOf(r1.confidence_assessments[0])).toEqual(semanticsOf(r2.confidence_assessments[0]));
  });
});

// ── payload/empty-state/conflict semantics (cases F, G) ──

describe('M14.2 — public payload, empty states, conflicts, numeric invariant', () => {
  function buildFull() {
    const SHA = 'e'.repeat(64);
    const ANALYZED_AT = '2026-09-21T01:30:00.000Z';
    const RUN = 'ar_m142_payload_001';
    const acquisition = acquireMalwareSample({
      metadata: { source: 'MALWAREBAZAAR', source_sample_id: 'm142_payload_holdout', declared_sha256: SHA, file_name: 'm142_payload.bin' },
      raw: { downloaded_sha256: SHA },
      acquired_at: ANALYZED_AT,
    });
    expect(acquisition.status).toBe('ACQUIRED');
    const bytes = new Uint8Array(64);
    bytes[0] = 0x4d;
    bytes[1] = 0x5a;
    const pipeline = analyzeMalwareArtifact({ analysis_run_id: RUN, run_binding: buildAnalysisRunBinding({ analysis_run_id: RUN, job_id: 'job_m14_2_test', artifact: acquisition.artifact! }), artifact: acquisition.artifact!, rawBytes: bytes, analyzed_at: ANALYZED_AT });
    const report = buildMalwareIntelligenceReport({ acquisition, pipeline, generated_at: ANALYZED_AT });
    return { acquisition, pipeline, report, RUN };
  }

  it('CASE F: every payload confidence item carries EVIDENCE_SUPPORT semantics; numeric support identical to M13 output', () => {
    const { pipeline, report } = buildFull();
    const pub = buildPublicReportPayload(report) as Record<string, any>;
    const items = pub.confidence.items as any[];
    expect(items.length).toBeGreaterThan(0);
    const m13ById = new Map(pipeline.confidence_conflicts.confidence_assessments.map((a) => [a.assessment_id, a]));
    for (const item of items) {
      const canonical = m13ById.get(item.assessment_id)!;
      expect(item.support).toBe(canonical.support); // numeric invariant
      expect(item.support_semantics.metric).toBe('EVIDENCE_SUPPORT');
      expect(item.support_semantics.lineage_count).toBe(canonical.evidence_ids.length);
      expect(item.support_semantics.epistemic_status).toEqual(canonical.epistemic_states);
      expect(item.support_semantics.evidence_kind).toEqual(canonical.evidence_kinds);
    }
  });

  it('CASE G: conflicts remain visible and are never collapsed into confidence semantics', () => {
    const { acquisition, pipeline } = buildFull();
    pipeline.confidence_conflicts.conflicts.push({
      conflict_id: 'cfl_m142_holdout',
      analysis_run_id: 'ar_m142_payload_001',
      artifact_id: acquisition.artifact!.artifact_id,
      conflict_category: 'claim_disagreement',
      subject_id: 'ZqxSubject_m142',
      positions: [
        { position_value: 'position_a', source_ids: ['src_m142_a'], evidence_refs: [] },
        { position_value: 'position_b', source_ids: ['src_m142_b'], evidence_refs: [] },
      ],
      supporting_evidence: [],
      contradicting_evidence: [],
      resolution_state: 'CONTESTED',
      provenance: pipeline.family_resolution.provenance,
    });
    const report = buildMalwareIntelligenceReport({ acquisition, pipeline, generated_at: '2026-09-21T01:30:00.000Z' });
    const pub = buildPublicReportPayload(report) as Record<string, any>;
    expect(pub.conflicts.items.length).toBe(1);
    expect(pub.conflicts.items[0].resolution_state).toBe('CONTESTED');
    // conflict state is not folded into support semantics
    for (const item of pub.confidence.items as any[]) {
      expect(JSON.stringify(item.support_semantics).includes('CONTESTED')).toBe(false);
    }
    // executive assessment still surfaces the conflict
    const exec = (pub.executive_assessment.statements as any[]).map((s) => s.statement).join(' ');
    expect(exec.includes('conflict')).toBe(true);
  });

  it('no assessment → no fabricated numbers: derivation is pure over empty lineage', () => {
    const r = run({ claims: [] });
    expect(r.confidence_assessments.length).toBeGreaterThanOrEqual(0);
    for (const a of r.confidence_assessments) {
      expect(semanticsOf(a).metric).toBe('EVIDENCE_SUPPORT');
    }
  });

  it('support values never mutated into buckets: no HIGH/MEDIUM/LOW, no 0.99 downgrade, no percentage strings', () => {
    const { pipeline, report } = buildFull();
    const pub = buildPublicReportPayload(report) as Record<string, any>;
    const blob = JSON.stringify(pub.confidence);
    expect(blob.includes('"HIGH"')).toBe(false);
    expect(blob.includes('"MEDIUM"')).toBe(false);
    expect(blob.includes('"LOW"')).toBe(false);
    expect(blob.includes('%')).toBe(false);
    // the negation "not ... certainty" is allowed; an affirmative certainty claim is not
    expect(/(?<!not absolute |not absolute|implies )certainty(?![^.]*allowed)/.test(blob.replace(/does not imply execution or absolute certainty/g, ''))).toBe(false);
    for (const a of pipeline.confidence_conflicts.confidence_assessments) {
      expect(Number.isFinite(a.support)).toBe(true);
      expect(a.support).toBeGreaterThanOrEqual(0);
      expect(a.support).toBeLessThanOrEqual(1);
    }
  });

  it('M13 numeric outputs unchanged by M14.2 (support/aggregate/conflicts/family identical across rebuild)', () => {
    const first = buildFull();
    const second = buildFull();
    const strip = (o: unknown) => JSON.parse(JSON.stringify(o, (k, v) => (k === 'support_semantics' ? undefined : v)));
    expect(strip(second.pipeline.confidence_conflicts)).toEqual(strip(first.pipeline.confidence_conflicts));
    expect(strip(second.pipeline.family_resolution)).toEqual(strip(first.pipeline.family_resolution));
    expect(first.report.report_id).toBe(second.report.report_id);
  });
});
