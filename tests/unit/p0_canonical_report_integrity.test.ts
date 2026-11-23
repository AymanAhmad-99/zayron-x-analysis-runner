/**
 * P0 — Canonical Malware Report Integrity Regression Tests (A–G)
 *
 * Locks the report/evidence materialization layer against the audited
 * canonical-report integrity regression:
 *
 *   A. LIEF observed    → tool_state OBSERVED; Limitations must NOT say
 *                         LIEF unavailable; consistency gate stays silent.
 *   B. LIEF unavailable → zero LIEF-derived claims may be published.
 *   C. Infrastructure rejection → entropy / PE / section names / architecture
 *                         / analyzer names / error statuses produce ZERO
 *                         infrastructure relationships.
 *   D. Missing lineage  → a relationship without evidence lineage fails
 *                         validation and never reaches the report.
 *   E. Support metric   → an assessment without evidence lineage receives NO
 *                         default support (never `support ?? 1`) and is
 *                         rejected at the report gate.
 *   F. Cross-run isolation → evidence from run A never appears in the
 *                         canonical report for run B; exclusions are surfaced.
 *   G. Empty category   → no evidence ⇒ Infrastructure = empty, no synthetic
 *                         fallback records.
 *
 * Defect-specific locks:
 *   1. ERROR is never collapsed into NO_RESULT_ANALYZER (ERROR_ANALYZER code).
 *   2. NO_CONTAINER_RESULT survives verbatim into tool_results.
 *   3. Semantic grounding validates type correctness (entropy can never be
 *      infrastructure) and support-without-lineage is a validation failure.
 *   4. Analyzed Artifact is separated from Detection-Relevant Artifacts; the
 *      sample's own hash never appears as a detection artifact.
 *   5. Foreign-run observations are filtered with an explicit count.
 *
 * Report-level consistency gate: a tool must never be simultaneously published
 * as UNAVAILABLE_ANALYZER/ERROR_ANALYZER and cited as claim evidence.
 * Synthetic fixtures, novel holdout identities only.
 */
import { describe, it, expect } from 'bun:test';
import { readFileSync } from 'node:fs';

import {
  analyzeMalwareArtifact,
  buildAnalysisRunBinding,
  buildMalwareIntelligenceReport,
  buildPublicReportPayload,
  groundReport,
  acquireMalwareSample,
  correlateInfrastructure,
  classifyEvidenceValueType,
} from '../../packages/intelligence/src/malware/canonical';
import { materializeCanonicalReport } from '../../packages/intelligence/src/malware/canonical/reportMaterialization';
import {
  createContainerToolRunners,
  buildContainerAvailabilityReport,
  type ContainerToolResult,
} from '../../packages/intelligence/src/malware/canonical/executor/containerToolExecutor';
import type { Observation, InfrastructureRelationship } from '../../packages/intelligence/src/malware/canonical';
import type { Artifact } from '../../packages/intelligence/src/malware/canonical/artifact';

const AT = '2026-09-22T00:00:00.000Z';
const SHA_A = 'a'.repeat(64);
const RUN_A = 'ar_p0_regression_001';

// ── shared synthetic fixtures (holdout identities only) ──────────

function evidence(id: string) {
  return [
    {
      evidence_id: id,
      source_id: 'src_p0_holdout',
      source_snapshot_id: 'ar_p0_holdout',
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
    file_names: [`p0_holdout_${sha.slice(0, 8)}.bin`],
    hashes: { sha256: sha },
    file_size_bytes: null, // set by callers that need the size gate
    mime_type: 'application/x-dosexec',
    format_attributes: {},
    provenance: prov(evidence(`ev_art_${sha.slice(0, 8)}`)),
  } as unknown as Artifact;
}

function tinyPe(): Uint8Array {
  const b = new Uint8Array(64);
  b[0] = 0x4d; // 'MZ'
  b[1] = 0x5a;
  return b;
}

async function sha256HexOf(bytes: Uint8Array): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', bytes as unknown as ArrayBuffer);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

function makeObs(runId: string, artifactId: string, over: { observation_id: string; observation_type?: string; attributes: Record<string, string | number | boolean | null> }): Observation {
  const ev = evidence(`ev_${over.observation_id}`);
  const id = over.observation_id;
  return {
    observation_id: id,
    analysis_run_id: runId,
    artifact_id: artifactId,
    source: 'STATIC_ANALYSIS',
    observation_type: over.observation_type ?? 'tool_analysis',
    observed_at: AT,
    attributes: over.attributes,
    evidence_refs: ev,
    provenance: prov(ev),
  } as unknown as Observation;
}

function acquireFor(sha: string) {
  return acquireMalwareSample({
    metadata: {
      source: 'MALWAREBAZAAR',
      source_sample_id: `p0_holdout_${sha.slice(0, 8)}`,
      declared_sha256: sha,
      file_name: `p0_holdout_${sha.slice(0, 8)}.bin`,
      first_seen: AT,
    },
    raw: { downloaded_sha256: sha },
    acquired_at: AT,
  });
}

/** Pre-resolved container results for `statuses`; every unlisted tool is absent entirely (NOT_RUN). */
function buildFixed(runId: string, sha: string, statuses: Record<string, ContainerToolResult['status']>, artifactId?: string): Map<string, ContainerToolResult> {
  const aid = artifactId ?? `art_p0_${sha.slice(0, 12)}`;
  const out = new Map<string, ContainerToolResult>();
  for (const tool of ['lief', 'floss', 'die', 'yara-x', 'capa'] as const) {
    const status = statuses[tool];
    if (!status) continue; // no container record at all for this tool
    out.set(tool, {
      tool_id: tool,
      tool_version: '1.2.3',
      status,
      output: status === 'OBSERVED' && tool === 'lief' ? { kind: 'lief', metadata: { binary_metadata: 'PE32', entry_point: 4096, entropy: 6.1, sections: '.text,.rdata' } } : null,
      note: status === 'OBSERVED' ? null : `recorded ${status}`,
      provenance: {
        tool_id: tool,
        tool_version: '1.2.3',
        analysis_run_id: runId,
        artifact_id: aid,
        input_sha256: sha,
        runner_identity: 'p0-test-runner',
        ruleset_version: null,
        ruleset_digest: null,
        tool_binary_digest: null,
      },
    });
  }
  return out;
}

/** Full M5→M13 chain over synthetic PE bytes with pre-resolved tool outcomes (no container round-trip). */
async function analyzeWithFixed(runId: string, sha: string, statuses: Record<string, ContainerToolResult['status']>) {
  // The pipeline must analyze the SAME artifact the report is built from:
  // the run binding (artifact_id + sha256) is validated against the analyzed
  // artifact and the report gate rejects a mismatch.
  const artifact = acquireFor(sha).artifact ?? makeArtifact(sha);
  const bytes = tinyPe();
  const { runners } = await createContainerToolRunners({
    config: null,
    analysis_run_id: runId,
    artifact,
    rawBytes: bytes,
    requested_tools: ['lief', 'floss', 'die', 'yara-x', 'capa'],
    fixedResults: buildFixed(runId, sha, statuses, artifact.artifact_id),
    runner_identity: 'p0-test-runner',
  });
  const availability = buildContainerAvailabilityReport({
    endpoint_config: null,
    generated_at: AT,
    health: { reachable: true, runner_identity: 'p0-test-runner' },
  });
  return analyzeMalwareArtifact({
    analysis_run_id: runId,
    run_binding: buildAnalysisRunBinding({ analysis_run_id: runId, job_id: 'job_p0_fixed', artifact }),
    artifact,
    rawBytes: bytes,
    tools: runners,
    toolAvailability: availability,
    analyzed_at: AT,
  });
}

// ═══════════════ Test A — LIEF observed ═══════════════

describe('P0 Test A — LIEF observed', () => {
  it('tool_state = OBSERVED and Limitations must NOT say LIEF unavailable', async () => {
    const acquisition = acquireFor(SHA_A);
    const pipeline = await analyzeWithFixed(RUN_A, SHA_A, { lief: 'OBSERVED' });
    const report = buildMalwareIntelligenceReport({ acquisition, pipeline, generated_at: AT });
    const pub = buildPublicReportPayload(report) as Record<string, any>;
    const liefStep = (pub.analysis_status.plan_steps as any[]).find((s) => s.capability === 'tool:lief');
    expect(liefStep).toBeDefined();
    expect(liefStep.status).toBe('OBSERVED');
    const liefLimitation = (pub.limitations as any[]).find((l) => l.code === 'UNAVAILABLE_ANALYZER' && l.detail.includes('lief'));
    expect(liefLimitation).toBeUndefined();
    // Consistency gate stays silent: an OBSERVED tool with derived claims is coherent.
    const gateErrors = groundReport(report, { pipeline, acquisition });
    expect(gateErrors.filter((e) => e.includes('consistency_gate'))).toEqual([]);
  });
});

// ═══════════════ Test B — LIEF unavailable ═══════════════

describe('P0 Test B — LIEF unavailable', () => {
  it('no LIEF-derived claims may be published', async () => {
    const sha = 'b'.repeat(64);
    const run = 'ar_p0_b_001';
    const acquisition = acquireFor(sha);
    const pipeline = await analyzeWithFixed(run, sha, { lief: 'UNAVAILABLE' });
    const report = buildMalwareIntelligenceReport({ acquisition, pipeline, generated_at: AT });
    const pub = buildPublicReportPayload(report) as Record<string, any>;
    // M7 produced no claim from the LIEF evidence source.
    const liefClaims = pipeline.claims.new_claims.filter((c) => c.evidence_refs.some((e) => e.source_id === 'src_tool_lief'));
    expect(liefClaims).toHaveLength(0);
    // And no published statement references LIEF tool evidence.
    const liefGrounded = (pub.static_findings.statements as any[]).some((s) =>
      (s.grounds as any[]).some((g) => liefClaims.some((c) => c.claim_id === g.canonical_id)),
    );
    expect(liefGrounded).toBe(false);
    // The UNAVAILABLE limitation IS recorded (truthful status semantics).
    expect((pub.limitations as any[]).some((l) => l.code === 'UNAVAILABLE_ANALYZER' && l.detail.includes('lief'))).toBe(true);
  });
});

// ═══════════════ Test C — Infrastructure rejection ═══════════════

describe('P0 Test C — infrastructure rejection', () => {
  const cases: Array<{ name: string; attributes: Record<string, string | number | boolean | null> }> = [
    { name: 'entropy', attributes: { overall_entropy_high: '11.0' } },
    { name: 'PE format', attributes: { format: 'PE' } },
    { name: 'section names', attributes: { sections: '.text,.rdata,.data,.rsrc,.reloc' } },
    { name: 'architecture', attributes: { architecture: 'i386' } },
    { name: 'analyzer names', attributes: { tool_name: 'floss', note: 'capa lief yara-x' } },
    { name: 'error statuses', attributes: { status: 'ERROR', analysis_status: 'UNAVAILABLE' } },
    { name: 'image base', attributes: { image_base: '0x400000' } },
    { name: 'static parser message', attributes: { reason: 'import/export table parsing not implemented' } },
  ];

  for (const c of cases) {
    it(`produces 0 relationships for ${c.name}`, () => {
      const artifact = makeArtifact('c'.repeat(64));
      const r = correlateInfrastructure({
        analysis_run_id: RUN_A,
        artifact,
        observations: [makeObs(RUN_A, artifact.artifact_id, { observation_id: `obs_p0_${c.name.replace(/\s/g, '_')}`, attributes: c.attributes })],
        correlated_at: AT,
      });
      expect(r.new_relationships).toHaveLength(0);
    });
  }

  it('semantic type classifier: structural values are never infrastructure', () => {
    expect(classifyEvidenceValueType('11.0')).toBe('STRUCTURAL');
    expect(classifyEvidenceValueType('.text,.rdata,.data,.rsrc,.reloc')).toBe('STRUCTURAL');
    expect(classifyEvidenceValueType('0x400000')).toBe('STRUCTURAL');
    expect(classifyEvidenceValueType('i386')).toBe('STRUCTURAL');
    expect(classifyEvidenceValueType('lief')).toBe('STRUCTURAL');
    expect(classifyEvidenceValueType('UNAVAILABLE')).toBe('STRUCTURAL');
  });
});

// ═══════════════ Test D — Missing lineage ═══════════════

describe('P0 Test D — missing evidence lineage', () => {
  it('a lineage-less relationship never reaches the report', () => {
    const artifact = makeArtifact('d'.repeat(64));
    // M11 with a lineage-less input produces no relationship (evidence-first rule).
    const noEvidence = makeObs('ar_p0_d_001', artifact.artifact_id, { observation_id: 'obs_stripped', attributes: { c2_host: '198.51.100.10' }, observation_type: 'network_connection' });
    noEvidence.evidence_refs = [];
    const r2 = correlateInfrastructure({
      analysis_run_id: 'ar_p0_d_001',
      artifact,
      observations: [noEvidence],
      correlated_at: AT,
    });
    expect(r2.new_relationships).toHaveLength(0); // without evidence → refused
    expect(r2.rejected_inputs.some((x) => x.reason_code === 'no_evidence')).toBe(true);
  });

  it('a lineage-less relationship injected into a report is rejected by the grounding gate', () => {
    const sha = 'd'.repeat(64);
    const acquisition = acquireFor(sha);
    const pipeline = analyzeMalwareArtifact({ analysis_run_id: 'ar_p0_d_002', run_binding: buildAnalysisRunBinding({ analysis_run_id: 'ar_p0_d_002', job_id: 'job_p0_d', artifact: acquisition.artifact! }), artifact: acquisition.artifact!, rawBytes: tinyPe(), analyzed_at: AT });
    const report = buildMalwareIntelligenceReport({ acquisition, pipeline, generated_at: AT });
    const tampered = JSON.parse(JSON.stringify(report)) as typeof report;
    tampered.infrastructure_section.items.push({
      infrastructure_id: 'infra_p0_lineage_less',
      role: 'UNKNOWN',
      indicator_type: 'IPV4',
      indicator_value: '198.51.100.11',
      status: 'DERIVED',
      evidence_count: 0,
    });
    const errors = groundReport(tampered, { pipeline, acquisition });
    expect(errors.some((e) => e.startsWith('unknown_ioc:infra_p0_lineage_less'))).toBe(true);
  });
});

// ═══════════════ Test E — Support metric ═══════════════

describe('P0 Test E — support metric semantics', () => {
  it('a confidence item without evidence lineage is a gate failure, never a default of 1', () => {
    const sha = 'e'.repeat(64);
    const acquisition = acquireFor(sha);
    const pipeline = analyzeMalwareArtifact({ analysis_run_id: 'ar_p0_e_001', run_binding: buildAnalysisRunBinding({ analysis_run_id: 'ar_p0_e_001', job_id: 'job_p0_e', artifact: acquisition.artifact! }), artifact: acquisition.artifact!, rawBytes: tinyPe(), analyzed_at: AT });
    const report = buildMalwareIntelligenceReport({ acquisition, pipeline, generated_at: AT });
    for (const item of report.confidence_section.items) {
      expect(item.evidence_ids.length).toBeGreaterThan(0);
    }
    const tampered = JSON.parse(JSON.stringify(report)) as typeof report;
    tampered.confidence_section.items[0].evidence_ids = [];
    const errors = groundReport(tampered, { pipeline, acquisition });
    expect(errors.some((e) => e.startsWith('semantic_grounding:support_without_evidence_lineage:'))).toBe(true);
  });

  it('no `support ?? 1` default exists anywhere in the canonical chain', () => {
    for (const f of ['confidenceResolution.ts', 'malwareProductionPipeline.ts', 'reportMaterialization.ts']) {
      const text = readFileSync(new URL(`../../packages/intelligence/src/malware/canonical/${f}`, import.meta.url), 'utf8');
      expect(text.includes('?? 1')).toBe(false);
      expect(text.includes('??1')).toBe(false);
    }
  });
});

// ═══════════════ Test F — Cross-run isolation ═══════════════

describe('P0 Test F — cross-run isolation', () => {
  it('evidence from run A never appears in the canonical report for run B', () => {
    const sha = 'f'.repeat(64);
    // Analyzed artifact and reported artifact must be the SAME canonical
    // artifact: the run binding is validated against the analyzed artifact.
    const artifact = acquireFor(sha).artifact ?? makeArtifact(sha);
    const runA = 'ar_p0_run_A';
    const runB = 'ar_p0_run_B';
    const foreignObservation = makeObs(runA, artifact.artifact_id, {
      observation_id: 'obs_tool_lief_foreign',
      attributes: { analysis_status: 'OBSERVED', tool_name: 'lief', binary_metadata: 'PE32', entropy: 6.1 },
    });
    const pipeline = analyzeMalwareArtifact({
      analysis_run_id: runB,
      run_binding: buildAnalysisRunBinding({ analysis_run_id: runB, job_id: 'job_p0_f', artifact }),
      artifact,
      rawBytes: tinyPe(),
      existing_observations: [foreignObservation],
      analyzed_at: AT,
    });
    expect(pipeline.filtered_foreign_run_observations.count).toBe(1);
    expect(pipeline.filtered_foreign_run_observations.observation_ids).toContain('obs_tool_lief_foreign');
    const liefLeaks = pipeline.claims.new_claims.filter((c) => c.evidence_refs.some((e) => e.source_id === 'src_tool_lief'));
    expect(liefLeaks).toHaveLength(0);
    const report = buildMalwareIntelligenceReport({ acquisition: acquireFor(sha), pipeline, generated_at: AT });
    expect(report.analysis_run_id).toBe(runB);
    expect(report.static_findings.statements.some((s) => s.statement.toLowerCase().includes('lief'))).toBe(false);
  });
});

// ═══════════════ Test G — Empty intelligence category ═══════════════

describe('P0 Test G — empty intelligence category', () => {
  it('no infrastructure evidence → Infrastructure = empty, no synthetic fallback records', async () => {
    const sha = '9'.repeat(64);
    const run = 'ar_p0_g_001';
    const acquisition = acquireFor(sha);
    const pipeline = await analyzeWithFixed(run, sha, { lief: 'OBSERVED', 'yara-x': 'OBSERVED' });
    const report = buildMalwareIntelligenceReport({ acquisition, pipeline, generated_at: AT });
    const pub = buildPublicReportPayload(report) as Record<string, any>;
    expect(pub.infrastructure.items).toHaveLength(0);
    expect((pub.limitations as any[]).some((l) => l.code === 'EMPTY_SECTION' && l.subject_id === 'infrastructure')).toBe(true);
  });
});

// ═══════════════ Defect-specific locks ═══════════════

describe('P0 defect locks — five live defects', () => {
  it('lock 1: ERROR never collapses into NO_RESULT_ANALYZER', async () => {
    const sha = '1'.repeat(64);
    const acquisition = acquireFor(sha);
    // LIEF genuinely crashes in the container: recorded status ERROR for this run.
    const pipeline = await analyzeWithFixed('ar_p0_l1', sha, { lief: 'ERROR' });
    const report = buildMalwareIntelligenceReport({ acquisition, pipeline, generated_at: AT });
    const errorSteps = report.analysis_status.plan_steps.filter((s) => s.status === 'ERROR');
    expect(errorSteps.length).toBeGreaterThan(0);
    for (const s of errorSteps) {
      const asNoResult = report.limitations.find((l) => l.code === 'NO_RESULT_ANALYZER' && l.subject_id === s.step_id);
      expect(asNoResult).toBeUndefined();
      const asError = report.limitations.find((l) => l.code === 'ERROR_ANALYZER' && l.subject_id === s.step_id);
      expect(asError).toBeDefined();
    }
  });

  it('lock 2: NO_CONTAINER_RESULT survives verbatim into tool_results', async () => {
    const bytes = tinyPe();
    const sha = await sha256HexOf(bytes); // materializer recomputes and enforces identity
    const run = 'ar_p0_l2';
    // The canonical artifact id convention for feed acquisitions: art_gmf_<sha16>.
    const artifactId = `art_gmf_${sha.slice(0, 16)}`;
    // Only lief has a container record; the other four have NO record at all.
    const result = await materializeCanonicalReport({
      job: { job_id: 'job_p0_l2', analysis_run_id: run, artifact_id: artifactId, sha256: sha, toolchain_version: null },
      rawBytes: bytes,
      container_results: [...buildFixed(run, sha, { lief: 'OBSERVED' }, artifactId).values()],
      runner_identity: 'p0-test-runner',
      acquisition_context: {
        source_sample_id: `p0_holdout_${sha.slice(0, 8)}`,
        file_names: [`p0_holdout_${sha.slice(0, 8)}.bin`],
        size_bytes: bytes.length,
      },
      analyzed_at: AT,
      generated_at: AT,
    });
    expect(result.status).toBe('MATERIALIZED');
    if (result.status !== 'MATERIALIZED') return;
    const tools = result.tool_results as Array<{ tool_id: string; status: string }>;
    for (const tool of ['floss', 'capa', 'die', 'yara-x']) {
      const t = tools.find((x) => x.tool_id === tool);
      expect(t?.status).toBe('NO_CONTAINER_RESULT'); // NOT_RUN — NOT UNAVAILABLE
    }
    // The published row = canonical public payload + verbatim tool_results,
    // merged exactly as materializeAndPublish stores it.
    const stored = { ...(result.public_payload as Record<string, any>), tool_results: result.tool_results };
    const storedFloss = (stored.tool_results as Array<{ tool_id: string; status: string }>).find((t) => t.tool_id === 'floss');
    expect(storedFloss?.status).toBe('NO_CONTAINER_RESULT');
  });

  it('lock 3: semantic grounding — structural values can never ground infrastructure', () => {
    const sha = '3'.repeat(64);
    const acquisition = acquireFor(sha);
    const pipeline = analyzeMalwareArtifact({ analysis_run_id: 'ar_p0_l3', run_binding: buildAnalysisRunBinding({ analysis_run_id: 'ar_p0_l3', job_id: 'job_p0_l3', artifact: acquisition.artifact! }), artifact: acquisition.artifact!, rawBytes: tinyPe(), analyzed_at: AT });
    const report = buildMalwareIntelligenceReport({ acquisition, pipeline, generated_at: AT });
    const tampered = JSON.parse(JSON.stringify(report)) as typeof report;
    tampered.infrastructure_section.items.push({
      infrastructure_id: 'infra_p0_structural',
      role: 'UNKNOWN',
      indicator_type: 'OTHER',
      indicator_value: '11.0',
      status: 'DERIVED',
      evidence_count: 1,
    });
    const errors = groundReport(tampered, { pipeline, acquisition });
    expect(errors.some((e) => e.includes('structural_value_cannot_be_infrastructure'))).toBe(true);
  });

  it('lock 4: analyzed artifact is separated from detection-relevant artifacts', async () => {
    const sha = '4'.repeat(64);
    const acquisition = acquireFor(sha);
    const pipeline = await analyzeWithFixed('ar_p0_l4', sha, { lief: 'OBSERVED' });
    const report = buildMalwareIntelligenceReport({ acquisition, pipeline, generated_at: AT });
    const pub = buildPublicReportPayload(report) as Record<string, any>;
    expect(pub.analyzed_artifact.sha256).toBe(sha);
    const derived = pub.detection_artifacts.derived_artifacts as Array<{ hashes: Record<string, string>; file_names: string[] }>;
    const blob = JSON.stringify(derived).toLowerCase();
    expect(blob.includes(sha)).toBe(false);
    expect(derived).toHaveLength(0); // empty when no analysis-derived artifacts exist
  });

  it('lock 5: foreign-run observations are filtered with an explicit count (not silently discarded)', () => {
    const sha = '5'.repeat(64);
    const artifact = makeArtifact(sha);
    const foreign = [
      makeObs('ar_p0_other_A', artifact.artifact_id, { observation_id: 'obs_foreign_A', attributes: { analysis_status: 'OBSERVED', detected_format: 'PE' } }),
      makeObs('ar_p0_other_B', artifact.artifact_id, { observation_id: 'obs_foreign_B', attributes: { analysis_status: 'OBSERVED', overall_entropy: 6.0 } }),
    ];
    const pipeline = analyzeMalwareArtifact({
      analysis_run_id: 'ar_p0_this_run',
      run_binding: buildAnalysisRunBinding({ analysis_run_id: 'ar_p0_this_run', job_id: 'job_p0_f_002', artifact }),
      artifact,
      rawBytes: tinyPe(),
      existing_observations: foreign,
      analyzed_at: AT,
    });
    expect(pipeline.filtered_foreign_run_observations.count).toBe(2);
    expect(pipeline.filtered_foreign_run_observations.analysis_run_ids.sort()).toEqual(['ar_p0_other_A', 'ar_p0_other_B']);
  });
});

// ═══════════════ Report-level consistency gate ═══════════════

describe('P0 report-level consistency gate', () => {
  it('rejects a report whose tool is UNAVAILABLE in limitations while a claim cites that tool', async () => {
    const sha = '6'.repeat(64);
    const acquisition = acquireFor(sha);
    // LIEF actually produced evidence → a LIEF-derived claim exists.
    const pipeline = await analyzeWithFixed('ar_p0_gate', sha, { lief: 'OBSERVED' });
    const report = buildMalwareIntelligenceReport({ acquisition, pipeline, generated_at: AT });
    const hasLiefClaim = pipeline.claims.new_claims.some((c) => c.evidence_refs.some((e) => e.source_id === 'src_tool_lief'));
    expect(hasLiefClaim).toBe(true);

    // Forge the contradiction: mark the LIEF step UNAVAILABLE + limitation.
    const tampered = JSON.parse(JSON.stringify(report)) as typeof report;
    const liefStep = tampered.analysis_status.plan_steps.find((s: any) => s.capability === 'tool:lief');
    expect(liefStep).toBeDefined();
    liefStep.status = 'UNAVAILABLE';
    tampered.limitations.push({ code: 'UNAVAILABLE_ANALYZER', subject_id: liefStep.step_id, detail: 'Capability tool:lief was unavailable for this run.' });

    const errors = groundReport(tampered, { pipeline, acquisition });
    expect(errors.some((e) => e.includes("consistency_gate:tool 'lief'"))).toBe(true);
    // The coherent report passes the gate.
    expect(groundReport(report, { pipeline, acquisition }).filter((e) => e.includes('consistency_gate'))).toEqual([]);
  });
});
