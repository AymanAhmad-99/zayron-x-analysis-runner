/**
 * M5 — Deterministic Analysis Planner Tests
 *
 * Required coverage:
 *  - PE known/simple plan
 *  - PE suspicious/high-entropy plan (deeper analysis scheduled as motivation)
 *  - ELF plan (format-scoped tool applicability)
 *  - unsupported artifact (minimal identity-only plan)
 *  - unavailable tool (DEFERRED, never clean)
 *  - deterministic plan (identical input → identical output)
 *  - no duplicate steps (sufficient evidence / already-observed tool)
 *  - deferred/future dynamic steps (PLANNED|DEFERRED only, never COMPLETED)
 *  - no family/ATT&CK/actor/campaign conclusions anywhere in the plan
 */
import { describe, it, expect } from 'bun:test';

import {
  planAnalysis,
  runStaticAnalysis,
  detectFormat,
  KNOWN_TOOL_IDS,
} from '../../packages/intelligence/src/malware/canonical';
import type {
  Artifact,
  AnalysisPlan,
  AnalysisPlannerInput,
  ToolAvailabilityReport,
} from '../../packages/intelligence/src/malware/canonical';

const RUN_ID = 'ar_m5_test_001';
const PLANNED_AT = '2026-09-20T12:00:00.000Z';

function makeArtifact(): Artifact {
  return {
    artifact_id: 'art_m5_test',
    identity_key: `sha256:${'b'.repeat(64)}`,
    format_class: 'PE',
    file_names: ['m5_sample.exe'],
    hashes: { sha256: 'b'.repeat(64) },
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
    for (let i = headerSize; i < pe.length; i++) pe[i] = 0x41;
  } else {
    let x = 12345;
    for (let i = headerSize; i < pe.length; i++) {
      x = (x * 1103515245 + 12345) & 0x7fffffff;
      pe[i] = (x >>> 16) & 0xff;
    }
  }
  return pe;
}

function buildElf(): Uint8Array {
  const b = new Uint8Array(256);
  b.set([0x7f, 0x45, 0x4c, 0x46], 0);
  b[4] = 2;
  b[5] = 1;
  new DataView(b.buffer).setUint16(18, 62, true);
  return b;
}

// ── Availability helpers ─────────────────────────────────────────

function availability(availableTools: Array<'yara-x' | 'floss' | 'capa' | 'lief'>): ToolAvailabilityReport {
  return {
    generated_at: PLANNED_AT,
    environment: 'bun-test',
    tools: KNOWN_TOOL_IDS.map((t) => ({
      tool_id: t,
      available: availableTools.includes(t),
      version: availableTools.includes(t) ? '1.0.0' : null,
      probe: availableTools.includes(t) ? `${t} present` : `${t}: not found on PATH`,
    })),
  };
}

// ── Helpers ──────────────────────────────────────────────────────

function staticPass(bytes: Uint8Array) {
  return runStaticAnalysis({
    analysis_run_id: RUN_ID,
    artifact: makeArtifact(),
    rawBytes: bytes,
    analyzed_at: PLANNED_AT,
  }).observations;
}

function planFor(
  bytes: Uint8Array | null,
  observations: readonly ReturnType<typeof staticPass> = [],
  availabilityReport: ToolAvailabilityReport | null = availability(['yara-x', 'capa', 'lief'])
): AnalysisPlan {
  return planAnalysis({
    analysis_run_id: RUN_ID,
    artifact: makeArtifact(),
    rawBytes: bytes,
    existing_observations: observations,
    toolAvailability: availabilityReport,
    planned_at: PLANNED_AT,
  });
}

const byType = (p: AnalysisPlan, t: string) => p.steps.filter((s) => s.step_type === t);

// ── Tests ────────────────────────────────────────────────────────

describe('M5 planner — PE known/simple', () => {
  const bytes = buildPe('low_entropy');
  const plan = planFor(bytes, staticPass(bytes));

  it('sufficient static evidence → no duplicate STATIC step', () => {
    expect(byType(plan, 'STATIC')).toHaveLength(0);
  });

  it('available applicable tools are PLANNED; unavailable tool is DEFERRED with probe reason', () => {
    const yara = byType(plan, 'EXTERNAL_TOOL').find((s) => s.tool_id === 'yara-x');
    const floss = byType(plan, 'EXTERNAL_TOOL').find((s) => s.tool_id === 'floss');
    expect(yara?.status).toBe('PLANNED');
    expect(floss?.status).toBe('DEFERRED');
    expect(floss?.defer_reason).toContain('not found on PATH');
    expect(floss?.defer_reason).toContain('NOT a clean result');
  });

  it('no deeper-analysis steps for a low-entropy, indicator-free simple PE', () => {
    expect(byType(plan, 'EMULATION')).toHaveLength(0);
    expect(byType(plan, 'DYNAMIC')).toHaveLength(0);
    expect(byType(plan, 'MEMORY_ANALYSIS')).toHaveLength(0);
    expect(byType(plan, 'CONFIG_EXTRACTION')).toHaveLength(0);
    expect(byType(plan, 'NETWORK_ANALYSIS')).toHaveLength(0);
  });

  it('steps are ordered 1..n with ascending priority', () => {
    expect(plan.steps.map((s) => s.order)).toEqual(plan.steps.map((_, i) => i + 1));
    const priorities = plan.steps.map((s) => s.priority);
    expect([...priorities].sort((a, b) => a - b)).toEqual(priorities);
  });
});

describe('M5 planner — PE suspicious/high-entropy', () => {
  const bytes = buildPe('high_entropy');
  const plan = planFor(bytes, staticPass(bytes));

  it('entropy/packing indicators schedule deeper analysis as investigation, not assertion', () => {
    const emu = byType(plan, 'EMULATION');
    const dyn = byType(plan, 'DYNAMIC');
    const mem = byType(plan, 'MEMORY_ANALYSIS');
    expect(emu).toHaveLength(1);
    expect(dyn).toHaveLength(1);
    expect(mem).toHaveLength(1);
    expect(emu[0].status).toBe('PLANNED');
    expect(emu[0].phase).toBe('FUTURE_PHASE');
    expect(emu[0].reason).toContain('motivation');
    expect(emu[0].reason).toContain('no packing or capability fact is asserted');
    expect(mem[0].reason).toContain('NOT asserted as fact');
  });

  it('no string indicators → no CONFIG_EXTRACTION/NETWORK_ANALYSIS steps', () => {
    expect(byType(plan, 'CONFIG_EXTRACTION')).toHaveLength(0);
    expect(byType(plan, 'NETWORK_ANALYSIS')).toHaveLength(0);
  });
});

describe('M5 planner — ELF', () => {
  const bytes = buildElf();
  const plan = planFor(bytes, []);

  it('STATIC pass planned when no observations exist yet', () => {
    const s = byType(plan, 'STATIC');
    expect(s).toHaveLength(1);
    expect(s[0].status).toBe('PLANNED');
    expect(s[0].required_capability).toBe('static_analyzer');
  });

  it('format-scoped tools only: capa (PE-only) is never canonically scheduled for ELF', () => {
    const toolSteps = byType(plan, 'EXTERNAL_TOOL');
    const tools = toolSteps.map((s) => s.tool_id);
    expect(tools).toContain('yara-x');
    expect(tools).toContain('floss');
    expect(tools).toContain('lief');
    // M15.5 — capa is DECLARED with explicit external execution authority, never
    // scheduled for canonical execution (no analyzer is forced onto ELF) and
    // never omitted: the external analysis plane's analyzer set is
    // format-independent, so its recorded capa result must have a corresponding
    // plan representation or the stored-report contract rejects the report.
    expect(toolSteps.find((s) => s.tool_id === 'capa')?.status).toBe('EXTERNAL_EXECUTION');
    expect(toolSteps.filter((s) => s.status === 'PLANNED').map((s) => s.tool_id)).not.toContain('capa');
  });
});

describe('M5 planner — unsupported artifact', () => {
  const bytes = new Uint8Array(64).map((_, i) => (i * 31 + 7) & 0xff);
  it('minimal identity-only plan: one DEFERRED STATIC step, no canonical tool steps, no future steps', () => {
    expect(detectFormat(bytes)).toBe('UNSUPPORTED');
    const plan = planFor(bytes, []);
    const staticSteps = byType(plan, 'STATIC');
    expect(staticSteps).toHaveLength(1);
    expect(staticSteps[0].status).toBe('DEFERRED');
    expect(staticSteps[0].reason).toContain('minimal identity plan only');
    // Phase 4.7: the content-type classifier is content-agnostic, so it is the
    // ONE tool scheduled for canonical execution on a format no structural
    // analyzer accepts. No future-phase step appears.
    const toolSteps = byType(plan, 'EXTERNAL_TOOL');
    const magika = toolSteps.find((s) => s.tool_id === 'magika');
    expect(magika).toBeDefined();
    expect(magika?.status).not.toBe('EXTERNAL_EXECUTION');
    // M15.5 — no analyzer is forced onto the artifact, but none is silently
    // dropped either: every other known analyzer is DECLARED with external
    // execution authority, so the external plane's recorded lief/floss/die/
    // yara-x/capa results are accounted for by the plan.
    for (const tool of ['lief', 'floss', 'die', 'yara-x', 'capa']) {
      expect(toolSteps.find((s) => s.tool_id === tool)?.status).toBe('EXTERNAL_EXECUTION');
    }
    expect(
      toolSteps.filter((s) => s.status === 'PLANNED').map((s) => s.tool_id).every((t) => t === 'magika')
    ).toBe(true);
    expect(plan.steps.every((s) => s.phase === 'CURRENT_PHASE')).toBe(true);
  });
});

describe('M5 planner — determinism, dedup, status discipline', () => {
  it('identical input → identical plan (deep equality)', () => {
    const bytes = buildPe('high_entropy');
    const obs = staticPass(bytes);
    expect(planFor(bytes, obs)).toEqual(planFor(bytes, obs));
  });

  it('already-observed tool is not scheduled again (no duplicate EXTERNAL_TOOL)', () => {
    const bytes = buildPe('low_entropy');
    // Produce real tool observations by running the static pass with a stub YARA runner.
    const yaraStub = {
      descriptor: { tool_id: 'yara-x' as const, display_name: 'yara-x', version: '1.0.0' },
      supported_formats: ['PE', 'ELF'] as const,
      run: () => ({ status: 'OBSERVED' as const, output: { kind: 'yara' as const, matches: [] } }),
    };
    const obs = runStaticAnalysis({
      analysis_run_id: RUN_ID,
      artifact: makeArtifact(),
      rawBytes: bytes,
      analyzed_at: PLANNED_AT,
      tools: [yaraStub],
      toolAvailability: availability(['yara-x', 'floss', 'capa', 'lief']),
    }).observations;
    const plan = planFor(bytes, obs, availability(['yara-x', 'floss', 'capa', 'lief']));
    const yaraSteps = byType(plan, 'EXTERNAL_TOOL').filter((s) => s.tool_id === 'yara-x');
    expect(yaraSteps).toHaveLength(0); // already OBSERVED → not rescheduled
    const flossSteps = byType(plan, 'EXTERNAL_TOOL').filter((s) => s.tool_id === 'floss');
    expect(flossSteps).toHaveLength(1); // never observed → still scheduled (deferred)
  });

  it('statuses are PLANNED|DEFERRED only — never COMPLETED; future steps are FUTURE_PHASE', () => {
    const bytes = buildPe('high_entropy');
    const plan = planFor(bytes, staticPass(bytes));
    for (const step of plan.steps) {
      expect(['PLANNED', 'DEFERRED']).toContain(step.status);
      expect(step.status).not.toBe('COMPLETED');
    }
    const future = plan.steps.filter((s) => s.phase === 'FUTURE_PHASE');
    expect(future.length).toBeGreaterThan(0);
    for (const step of future) {
      expect(step.status).toBe('PLANNED');
      expect(['EMULATION', 'DYNAMIC', 'CONFIG_EXTRACTION', 'NETWORK_ANALYSIS', 'MEMORY_ANALYSIS']).toContain(step.step_type);
    }
  });

  it('missing bytes → STATIC DEFERRED, never a clean/empty plan', () => {
    const plan = planFor(null, [], availability([]));
    const s = byType(plan, 'STATIC');
    expect(s).toHaveLength(1);
    expect(s[0].status).toBe('DEFERRED');
    expect(s[0].defer_reason).toContain('NOT a clean result');
  });

  it('no malware conclusions: no family, ATT&CK/MBC technique, actor, or campaign content', () => {
    const bytes = buildPe('high_entropy');
    const plan = planFor(bytes, staticPass(bytes), availability(['yara-x', 'floss', 'capa', 'lief']));
    const json = JSON.stringify(plan).toLowerCase();
    expect(json).not.toContain('family');
    expect(json).not.toContain('mbc');
    expect(json).not.toContain('att&ck');
    expect(json).not.toContain('actor');
    expect(json).not.toContain('campaign');
    expect(/t1[0-9]{3}/.test(json)).toBe(false);
    expect(/t10[0-9]{2}/.test(json)).toBe(false);
  });
});
