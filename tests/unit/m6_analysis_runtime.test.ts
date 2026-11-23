/**
 * M6 — Deterministic Analysis Runtime Tests
 *
 * Scenarios (per M6 spec):
 *  1. STATIC executes
 *  2. EXTERNAL_TOOL executes
 *  3. FUTURE_PHASE does not execute
 *  4. DEFERRED does not execute
 *  5. unavailable tool remains unavailable/deferred
 *  6. one tool error does not stop other steps
 *  7. existing static observation prevents duplicate execution
 *  8. existing tool observation prevents duplicate execution
 *  9. YARA/FLOSS/capa outputs remain observations only
 * 10. entropy does not become confirmed packing
 * 11. all five result states remain distinguishable
 * 12. identical input is deterministic
 * 13. no family/hash-specific logic
 * 14. dynamic/emulation/network/memory never execute
 *
 * Holdout artifacts use novel identities (never reused from M1–M5 fixtures).
 */
import { describe, it, expect } from 'bun:test';
import { readFileSync } from 'node:fs';

import {
  planAnalysis,
  KNOWN_TOOL_IDS,
  runAnalysisPlan,
  runStaticAnalysis,
  detectFormat,
} from '../../packages/intelligence/src/malware/canonical';
import type {
  Artifact,
  AnalysisPlan,
  ExternalToolRunner,
  ToolAvailabilityReport,
  ToolExecutionContext,
  ToolRunOutcome,
} from '../../packages/intelligence/src/malware/canonical';

const RUN_ID = 'ar_m6_holdout_001';
const PLANNED_AT = '2026-09-20T14:00:00.000Z';

// Novel holdout artifact identity (never used in M1–M5 fixtures).
function makeArtifact(): Artifact {
  return {
    artifact_id: 'art_m6_holdout',
    identity_key: `sha256:${'c9'.repeat(32)}`,
    format_class: 'PE',
    file_names: ['m6_holdout_sample.exe'],
    hashes: { sha256: 'c9'.repeat(32) },
    file_size_bytes: undefined,
    mime_type: 'application/x-dosexec',
    format_attributes: {},
    provenance: {
      evidence_refs: [],
      source_ids: [],
      authority_tier: 'TIER_2',
      snapshot_ids: [],
      derived_at: PLANNED_AT,
    },
  };
}

// ── PE fixtures ──────────────────────────────────────────────────

function buildPe(fill: 'low_entropy' | 'high_entropy'): Uint8Array {
  const dosHeader = new Uint8Array(0x40);
  dosHeader[0] = 0x4d;
  dosHeader[1] = 0x5a;
  const peOff = 0x80;
  new DataView(dosHeader.buffer).setUint32(0x3c, peOff, true);
  const optSize = 112 + 16 * 8;
  const numSections = 1;
  const headerSize = peOff + 24 + optSize + numSections * 40;
  const pe = new Uint8Array(headerSize + 2048);
  pe.set(dosHeader, 0);
  pe[peOff] = 0x50; pe[peOff + 1] = 0x45;
  const pdv = new DataView(pe.buffer);
  pdv.setUint16(peOff + 4, 0x8664, true);
  pdv.setUint16(peOff + 6, numSections, true);
  pdv.setUint16(peOff + 20, optSize, true);
  const opt = peOff + 24;
  pdv.setUint16(opt, 0x20b, true);
  pdv.setUint32(opt + 16, 0x1000, true);
  pe[opt + 2] = 14; pe[opt + 3] = 29;
  const st = opt + optSize;
  pe.subarray(st, st + 8).set(new TextEncoder().encode('.text'));
  pdv.setUint32(st + 8, 0x10, true);
  pdv.setUint32(st + 16, 0x400, true);
  pdv.setUint32(st + 20, headerSize, true);
  if (fill === 'low_entropy') {
    for (let i = headerSize; i < pe.length; i++) pe[i] = 0x42;
  } else {
    let x = 98765;
    for (let i = headerSize; i < pe.length; i++) {
      x = (x * 1103515245 + 12345) & 0x7fffffff;
      pe[i] = (x >>> 16) & 0xff;
    }
  }
  return pe;
}

// ── Availability / stub helpers ──────────────────────────────────

function availability(availableTools: Array<'yara-x' | 'floss' | 'capa' | 'lief' | 'die'>): ToolAvailabilityReport {
  return {
    generated_at: PLANNED_AT,
    environment: 'bun-test',
    tools: KNOWN_TOOL_IDS.map((t) => ({
      tool_id: t,
      available: availableTools.includes(t),
      version: availableTools.includes(t) ? '2.0.0-stub' : null,
      probe: availableTools.includes(t) ? `${t} present` : `${t}: not found on PATH`,
    })),
  };
}

function stubRunner(
  tool: 'yara-x' | 'floss' | 'capa' | 'lief' | 'die',
  run: (ctx: ToolExecutionContext) => ToolRunOutcome,
  formats: Array<'PE' | 'ELF' | 'MACH_O'> = ['PE', 'ELF']
): ExternalToolRunner {
  return {
    descriptor: { tool_id: tool, display_name: tool, version: '2.0.0-stub' },
    supported_formats: formats,
    run,
  };
}

const yaraOk = stubRunner('yara-x', () => ({
  status: 'OBSERVED',
  output: { kind: 'yara', matches: [{ rule: 'M6_Test_Rule', namespace: null, meta: {} }] },
}));
const flossOk = stubRunner('floss', () => ({
  status: 'OBSERVED',
  output: { kind: 'floss', strings: { stack: [], decoded: [], tight: [] }, total_extracted: 0 },
}));
const capaNoResult = stubRunner('capa', () => ({ status: 'NO_RESULT', output: null }));
const flossThrows = stubRunner('floss', () => {
  throw new Error('floss stub crash');
});

function buildPlan(
  bytes: Uint8Array | null,
  observations: readonly ReturnType<typeof runStaticAnalysis>['observations'],
  avail: ToolAvailabilityReport
): AnalysisPlan {
  return planAnalysis({
    analysis_run_id: RUN_ID,
    artifact: makeArtifact(),
    rawBytes: bytes,
    existing_observations: observations,
    toolAvailability: avail,
    planned_at: PLANNED_AT,
  });
}

function runRuntime(
  bytes: Uint8Array | null,
  observations: readonly ReturnType<typeof runStaticAnalysis>['observations'],
  avail: ToolAvailabilityReport,
  tools: ExternalToolRunner[],
  plan?: AnalysisPlan
) {
  return runAnalysisPlan({
    analysis_run_id: RUN_ID,
    artifact: makeArtifact(),
    rawBytes: bytes,
    existing_observations: observations,
    plan: plan ?? buildPlan(bytes, observations, avail),
    toolAvailability: avail,
    tools,
  });
}

const rec = (r: ReturnType<typeof runRuntime>, type: string) => r.steps.filter((s) => s.step_type === type);

// ── Tests ────────────────────────────────────────────────────────

describe('M6 runtime — execution basics', () => {
  it('1. STATIC executes via the existing analyzer', () => {
    const bytes = buildPe('low_entropy');
    const result = runRuntime(bytes, [], availability([]));
    const staticRec = rec(result, 'STATIC');
    expect(staticRec).toHaveLength(1);
    expect(staticRec[0].execution_status).toBe('EXECUTED');
    expect(staticRec[0].result_status).toBe('OBSERVED');
    expect(staticRec[0].observation_ids.length).toBeGreaterThan(0);
    expect(result.new_observations.length).toBeGreaterThan(0);
    // provenance preserved on every new observation
    for (const o of result.new_observations) {
      expect(o.provenance.evidence_refs.length).toBeGreaterThan(0);
      expect(o.analysis_run_id).toBe(RUN_ID);
      expect(o.artifact_id).toBe('art_m6_holdout');
    }
  });

  it('2. EXTERNAL_TOOL executes for the requested tool only', () => {
    const bytes = buildPe('low_entropy');
    const obs = runStaticAnalysis({
      analysis_run_id: RUN_ID, artifact: makeArtifact(), rawBytes: bytes, analyzed_at: PLANNED_AT,
    }).observations; // static covered so only tool steps execute
    const result = runRuntime(bytes, obs, availability(['yara-x']), [yaraOk]);
    const toolRecs = rec(result, 'EXTERNAL_TOOL');
    expect(toolRecs.filter((s) => s.execution_status === 'EXECUTED')).toHaveLength(1);
    const executed = toolRecs.find((s) => s.execution_status === 'EXECUTED');
    expect(executed?.tool_id).toBe('yara-x');
    expect(executed?.result_status).toBe('OBSERVED');
    expect(executed?.observation_ids.length).toBeGreaterThan(0);
    expect(result.new_observations.every((o) => o.attributes.tool_name === 'yara-x')).toBe(true);
    expect(result.new_observations[0].attributes.match_0_rule).toBe('M6_Test_Rule');
  });

  it('3. FUTURE_PHASE steps do not execute', () => {
    const bytes = buildPe('high_entropy');
    const obs = runStaticAnalysis({
      analysis_run_id: RUN_ID, artifact: makeArtifact(), rawBytes: bytes, analyzed_at: PLANNED_AT,
    }).observations;
    const result = runRuntime(bytes, obs, availability([]), []);
    const future = result.steps.filter((s) => s.execution_status === 'SKIPPED_FUTURE_PHASE');
    expect(future.length).toBeGreaterThan(0);
    // no observations may come from future-phase step types
    expect(result.new_observations.every((o) => o.observation_type !== 'dynamic_event')).toBe(true);
    expect(result.executed_steps.every((s) => ['STATIC', 'EXTERNAL_TOOL'].includes(s.step_type))).toBe(true);
  });

  it('4. DEFERRED steps do not execute and are never reinterpreted', () => {
    const bytes = buildPe('low_entropy');
    const obs = runStaticAnalysis({
      analysis_run_id: RUN_ID, artifact: makeArtifact(), rawBytes: bytes, analyzed_at: PLANNED_AT,
    }).observations;
    // Every tool other than the available yara-x is deferred (floss/capa/lief/
    // die, plus the content-type classifier magika).
    const result = runRuntime(bytes, obs, availability(['yara-x']), [yaraOk]);
    const deferred = result.steps.filter((s) => s.execution_status === 'DEFERRED');
    expect(deferred).toHaveLength(KNOWN_TOOL_IDS.length - 1);
    expect(deferred.some((s) => s.tool_id === 'floss')).toBe(true);
    expect(deferred[0].observation_ids).toHaveLength(0);
    expect(result.new_observations.some((o) => o.attributes.tool_name === 'floss')).toBe(false);
  });

  it('5. unavailable tool remains unavailable/deferred — never clean', () => {
    const bytes = buildPe('low_entropy');
    const obs = runStaticAnalysis({
      analysis_run_id: RUN_ID, artifact: makeArtifact(), rawBytes: bytes, analyzed_at: PLANNED_AT,
    }).observations;
    const result = runRuntime(bytes, obs, availability([]), []);
    expect(result.steps.some((s) => s.execution_status === 'DEFERRED' && s.tool_id === 'floss')).toBe(true);
    const json = JSON.stringify(result);
    expect(json).not.toContain('"clean"');
    expect(json).not.toContain("'clean'");
  });
});

describe('M6 runtime — failure isolation and dedup', () => {
  it('6. one tool error does not stop other steps', () => {
    const bytes = buildPe('low_entropy');
    const obs = runStaticAnalysis({
      analysis_run_id: RUN_ID, artifact: makeArtifact(), rawBytes: bytes, analyzed_at: PLANNED_AT,
    }).observations;
    const result = runRuntime(bytes, obs, availability(['yara-x', 'floss']), [yaraOk, flossThrows]);
    const yara = rec(result, 'EXTERNAL_TOOL').find((s) => s.tool_id === 'yara-x');
    const floss = rec(result, 'EXTERNAL_TOOL').find((s) => s.tool_id === 'floss');
    expect(yara?.execution_status).toBe('EXECUTED');
    expect(yara?.result_status).toBe('OBSERVED');
    expect(yara?.observation_ids.length).toBeGreaterThan(0);
    expect(floss?.execution_status).toBe('EXECUTED');
    expect(floss?.result_status).toBe('ERROR'); // isolated failure, bridge-captured
    expect(floss?.observation_ids.length).toBeGreaterThan(0); // ERROR observation recorded
    // both tools produced/recorded results; neither blocked the other
    expect(result.new_observations.some((o) => o.attributes.tool_name === 'yara-x')).toBe(true);
  });

  it('7. existing static observation prevents duplicate static execution', () => {
    const bytes = buildPe('low_entropy');
    const plan = buildPlan(bytes, [], availability([])); // plan includes STATIC
    const fullObs = runStaticAnalysis({
      analysis_run_id: RUN_ID, artifact: makeArtifact(), rawBytes: bytes, analyzed_at: PLANNED_AT,
    }).observations;
    const result = runRuntime(bytes, fullObs, availability([]), [], plan);
    const staticRec = rec(result, 'STATIC');
    expect(staticRec).toHaveLength(1);
    expect(staticRec[0].execution_status).toBe('SKIPPED_DUPLICATE');
    expect(result.new_observations.filter((o) => o.observation_type === 'binary_metadata')).toHaveLength(0);
  });

  it('8. existing tool observation prevents duplicate tool execution', () => {
    const bytes = buildPe('low_entropy');
    // existing observations already contain an OBSERVED yara result
    const obsWithTool = runStaticAnalysis({
      analysis_run_id: RUN_ID, artifact: makeArtifact(), rawBytes: bytes, analyzed_at: PLANNED_AT,
      tools: [yaraOk], toolAvailability: availability(['yara-x', 'floss', 'capa', 'lief']),
    }).observations;
    const plan = buildPlan(bytes, [], availability(['yara-x'])); // plan contains a yara step
    // runtime receives observations that already cover yara → runtime must skip it (rule 6)
    const result = runRuntime(bytes, obsWithTool, availability(['yara-x']), [yaraOk], plan);
    const yara = rec(result, 'EXTERNAL_TOOL').filter((s) => s.tool_id === 'yara-x');
    expect(yara).toHaveLength(1);
    expect(yara[0].execution_status).toBe('SKIPPED_DUPLICATE');
    expect(result.new_observations.some((o) => o.attributes.tool_name === 'yara-x')).toBe(false);
  });
});

describe('M6 runtime — semantic boundaries', () => {
  it('9. YARA/FLOSS/capa outputs remain observations only (no claims/behaviors/family)', () => {
    const bytes = buildPe('low_entropy');
    const obs = runStaticAnalysis({
      analysis_run_id: RUN_ID, artifact: makeArtifact(), rawBytes: bytes, analyzed_at: PLANNED_AT,
    }).observations;
    const capaOk = stubRunner('capa', () => ({
      status: 'OBSERVED',
      output: { kind: 'capa', capabilities: [{ name: 'write file', address: null, source_rule: null }] },
    }));
    const result = runRuntime(bytes, obs, availability(['yara-x', 'floss', 'capa']), [yaraOk, flossOk, capaOk]);
    const json = JSON.stringify(result);
    expect(json).not.toContain('"claims"');
    expect(json).not.toContain('"behaviors"');
    expect(json).not.toContain('family_candidate');
    for (const o of result.new_observations) {
      expect(o.observation_type).toBe('tool_analysis');
      expect(o.evidence_refs.every((e) => e.kind === 'STATIC')).toBe(true);
    }
  });

  it('10. high entropy / packing indicators never become confirmed packing', () => {
    const bytes = buildPe('high_entropy');
    const result = runRuntime(bytes, [], availability([]));
    const packing = result.new_observations.find((o) => o.observation_type === 'packing_indicators');
    expect(packing).toBeDefined();
    // indicator evidence only — no fabrication of a "packed" verdict
    expect(Object.keys(packing!.attributes).some((k) => k.includes('confirmed') || k.includes('verdict'))).toBe(false);
    const json = JSON.stringify(result).toLowerCase();
    expect(json).not.toContain('malicious');
    expect(json).not.toContain('benign');
    expect(json).not.toContain('packed":true');
  });

  it('11. all five result states remain distinguishable', () => {
    // lief runner scoped to ELF only → UNSUPPORTED on PE; capa stub → NO_RESULT;
    // capa has no runner despite being "available" → UNAVAILABLE is emitted for it
    // by the bridge... but the runtime filters per-tool, so instead: no capa runner
    // registered while planned → UNAVAILABLE comes through the scoped bridge call.
    const bytes = buildPe('low_entropy');
    const obs = runStaticAnalysis({
      analysis_run_id: RUN_ID, artifact: makeArtifact(), rawBytes: bytes, analyzed_at: PLANNED_AT,
    }).observations;
    const liefElfOnly = stubRunner('lief', () => ({
      status: 'OBSERVED',
      output: { kind: 'lief', metadata: {} },
    }), ['ELF']);
    const result = runRuntime(bytes, obs, availability(['yara-x', 'floss', 'capa', 'lief']), [
      yaraOk,       // OBSERVED
      capaNoResult, // NO_RESULT
      liefElfOnly,  // UNSUPPORTED on PE (wrong format scope)
      // floss available but NO runner registered → UNAVAILABLE
    ]);
    const statuses = new Set(rec(result, 'EXTERNAL_TOOL').map((s) => s.result_status).filter(Boolean));
    expect(statuses.has('OBSERVED')).toBe(true);
    expect(statuses.has('NO_RESULT')).toBe(true);
    expect(statuses.has('UNSUPPORTED')).toBe(true);
    // ERROR and UNAVAILABLE from the failure-isolation scenario + no-runner path:
    const errResult = runRuntime(bytes, obs, availability(['yara-x', 'floss']), [yaraOk, flossThrows]);
    expect(rec(errResult, 'EXTERNAL_TOOL').some((s) => s.result_status === 'ERROR')).toBe(true);
    const unavailResult = runRuntime(bytes, obs, availability(['yara-x', 'floss']), [yaraOk]);
    expect(rec(unavailResult, 'EXTERNAL_TOOL').some((s) => s.result_status === 'UNAVAILABLE')).toBe(true);
    // M14.3: die is planned too. With die listed unavailable it is DEFERRED by
    // the planner (never executed, never reinterpreted) — semantics unchanged.
    const dieStep = rec(result, 'EXTERNAL_TOOL').find((s) => s.tool_id === 'die');
    expect(dieStep?.execution_status).toBe('DEFERRED');
    // All five analyzer states remain distinct — no sixth state was introduced.
    expect(new Set([...statuses, 'ERROR', 'UNAVAILABLE']).size).toBe(5);
  });

  it('12. identical input produces identical output', () => {
    const bytes = buildPe('high_entropy');
    const obs = runStaticAnalysis({
      analysis_run_id: RUN_ID, artifact: makeArtifact(), rawBytes: bytes, analyzed_at: PLANNED_AT,
    }).observations;
    const avail = availability(['yara-x', 'floss']);
    const a = runRuntime(bytes, obs, avail, [yaraOk, flossOk]);
    const b = runRuntime(bytes, obs, avail, [yaraOk, flossOk]);
    expect(a).toEqual(b);
  });

  it('13. no family/hash-specific logic in the runtime source or output', () => {
    // Source-level: the runtime contains no forbidden comparators or vocabularies
    // (comment lines excluded — the rule list in the header mentions these words).
    const src = readFileSync('packages/intelligence/src/malware/canonical/analysisRuntime.ts', 'utf8')
      .split('\n')
      .filter((line) => !/^\s*(\/\/|\*|\/\*)/.test(line))
      .join('\n');
    for (const forbidden of ['family ===', 'sha256 ===', 'malwareName', 'sampleId ===', 'ATT&CK', 'MBC', 'campaign', 'actor']) {
      expect(src.includes(forbidden)).toBe(false);
    }
    // Output-level: no verdicts or conclusions.
    const bytes = buildPe('low_entropy');
    const result = runRuntime(bytes, [], availability(['yara-x', 'floss']), [yaraOk, flossOk]);
    const json = JSON.stringify(result).toLowerCase();
    // NB: the word "family" legitimately appears inside epistemic BOUNDARY notes
    // ("not malware-family confirmation..."); assert on conclusion-shaped content only.
    for (const word of ['"family"', 'family_id', 'resolvedfamily', 'verdict', 'malicious', 'benign', 'attribution']) {
      expect(json).not.toContain(word);
    }
  });

  it('14. dynamic/emulation/network/memory/config steps never execute', () => {
    const bytes = buildPe('high_entropy'); // triggers EMULATION/DYNAMIC/MEMORY planning
    const obs = runStaticAnalysis({
      analysis_run_id: RUN_ID, artifact: makeArtifact(), rawBytes: bytes, analyzed_at: PLANNED_AT,
    }).observations;
    const result = runRuntime(bytes, obs, availability([]), []);
    for (const type of ['EMULATION', 'DYNAMIC', 'NETWORK_ANALYSIS', 'MEMORY_ANALYSIS', 'CONFIG_EXTRACTION']) {
      for (const s of rec(result, type)) {
        expect(s.execution_status).toBe('SKIPPED_FUTURE_PHASE');
        expect(s.observation_ids).toHaveLength(0);
      }
    }
    expect(result.executed_steps.every((s) => ['STATIC', 'EXTERNAL_TOOL'].includes(s.step_type))).toBe(true);
    // no dynamic-source observations may appear
    expect(result.new_observations.every((o) => o.source !== 'DYNAMIC_ANALYSIS' && o.source !== 'EMULATION')).toBe(true);
  });
});
