/**
 * M15.5 — Plan / external execution contract tests.
 *
 * The platform has TWO execution surfaces:
 *   1. the canonical analysis runtime (m6), which executes ONLY the steps the
 *      planner scheduled for it, and
 *   2. the external analysis plane (the containerized runner), whose analyzer
 *      set is FIXED and FORMAT-INDEPENDENT and whose recorded outcomes are
 *      projected verbatim into the report's `tool_results` table.
 *
 * Before M15.5 the second surface had no plan representation. A report could
 * therefore publish analyzer results that no plan step accounted for, which the
 * stored-report contract rejects (`tool_state:no_plan_step`). That is exactly
 * what happened to the first genuinely fresh samples: RAR5 and ZIP artifacts,
 * formats no structural analyzer accepts.
 *
 * Invariants pinned here:
 *   - every tool in `tool_results` has a corresponding `tool:<id>` plan step;
 *   - tools outside the canonical format scope are declared with EXTERNAL
 *     EXECUTION AUTHORITY, never silently dropped and never scheduled for
 *     canonical execution;
 *   - the external state does NOT invoke the canonical tool runner and produces
 *     no observation;
 *   - recorded outcomes survive verbatim (OBSERVED / NO_RESULT / ERROR stay
 *     distinct and are never flattened into absence);
 *   - PE behaviour is unchanged (all six analyzers canonically scheduled);
 *   - the published report passes validateStoredMalwareReport with zero
 *     rejections, i.e. the read gate serves it.
 *
 * Synthetic fixtures with novel holdout identities. The container-result shapes
 * mirror the real recorded ones (a content-type label, not sample content).
 */
import { describe, it, expect, beforeAll } from 'bun:test';

import {
  materializeCanonicalReport,
  acquisitionContextFromCanonicalRecord,
  type MaterializeReportInput,
} from '../../packages/intelligence/src/malware/canonical/reportMaterialization';
import { validateStoredMalwareReport } from '../../packages/intelligence/src/malware/canonical/storedReportValidation';
import { planAnalysis } from '../../packages/intelligence/src/malware/canonical/analysisPlanner';
import { runAnalysisPlan } from '../../packages/intelligence/src/malware/canonical/analysisRuntime';
import type { ContainerToolResult } from '../../packages/intelligence/src/malware/canonical/executor/containerToolExecutor';

const RUN_ID = 'ar_m155_holdout_001';
const RUNNER = 'gh-runner-m155';
const ANALYZED_AT = '2026-09-25T04:00:00.000Z';

type Fmt = 'rar' | 'zip' | 'pe';

// ── fixtures: real-format magic bytes for the three shapes under test ──

function rarBytes(size = 4096): Uint8Array {
  const bytes = new Uint8Array(size);
  bytes.set([0x52, 0x61, 0x72, 0x21, 0x1a, 0x07, 0x01, 0x00], 0); // "Rar!" v5 → UNSUPPORTED
  for (let i = 16; i < 256; i++) bytes[i] = (i * 31 + 7) & 0xff;
  return bytes;
}

function zipBytes(size = 4096): Uint8Array {
  const bytes = new Uint8Array(size);
  bytes.set([0x50, 0x4b, 0x03, 0x04, 0x14, 0x00, 0x00, 0x00], 0); // "PK\x03\x04" → UNSUPPORTED
  for (let i = 16; i < 256; i++) bytes[i] = (i * 17 + 3) & 0xff;
  return bytes;
}

function peBytes(size = 4096): Uint8Array {
  const bytes = new Uint8Array(size);
  bytes.set([0x4d, 0x5a, 0x90, 0x00], 0); // MZ → PE
  const text = 'Mozilla/5.0 http://holdout.invalid/a 192.0.2.10 GetProcAddress';
  for (let i = 0; i < text.length; i++) bytes[512 + i] = text.charCodeAt(i);
  return bytes;
}

async function identityOf(bytes: Uint8Array): Promise<{ sha: string; artifactId: string }> {
  const digest = await crypto.subtle.digest('SHA-256', bytes as unknown as ArrayBuffer);
  const sha = Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0')).join('');
  return { sha, artifactId: `art_gmf_${sha.slice(0, 16)}` };
}

const IDENTITY: Record<Fmt, { sha: string; artifactId: string }> = {
  rar: { sha: '', artifactId: '' },
  zip: { sha: '', artifactId: '' },
  pe: { sha: '', artifactId: '' },
};

const BYTES_OF = { rar: rarBytes, zip: zipBytes, pe: peBytes } as const;

beforeAll(async () => {
  IDENTITY.rar = await identityOf(rarBytes());
  IDENTITY.zip = await identityOf(zipBytes());
  IDENTITY.pe = await identityOf(peBytes());
});

// ── recorded container outcomes ──
// The structural analyzers cannot parse an archive; the outcomes below mirror
// what the live plane recorded (NO_RESULT / ERROR / OBSERVED, never collapsed).

const OUTCOME: Record<Fmt, Record<string, ContainerToolResult['status']>> = {
  rar: { lief: 'NO_RESULT', floss: 'ERROR', die: 'OBSERVED', 'yara-x': 'NO_RESULT', capa: 'ERROR', magika: 'OBSERVED' },
  zip: { lief: 'NO_RESULT', floss: 'ERROR', die: 'OBSERVED', 'yara-x': 'NO_RESULT', capa: 'ERROR', magika: 'OBSERVED' },
  pe: { lief: 'OBSERVED', floss: 'ERROR', die: 'OBSERVED', 'yara-x': 'NO_RESULT', capa: 'ERROR', magika: 'OBSERVED' },
};

const TOOLS = ['lief', 'floss', 'die', 'yara-x', 'capa', 'magika'] as const;

/** Content-type labels as the classifier actually reports them. */
const MAGIKA: Record<Fmt, Record<string, unknown>> = {
  rar: {
    content_type: 'rar',
    content_type_description: 'RAR archive data',
    content_type_group: 'archive',
    mime_type: 'application/x-rar',
    model_prediction: 'rar',
  },
  zip: {
    content_type: 'zip',
    content_type_description: 'Zip archive data',
    content_type_group: 'archive',
    mime_type: 'application/zip',
    model_prediction: 'zip',
  },
  pe: {
    content_type: 'pebin',
    content_type_description: 'PE Windows executable',
    content_type_group: 'executable',
    mime_type: 'application/x-dosexec',
    model_prediction: 'pebin',
  },
};

function toolOutput(fmt: Fmt, tool: string, status: string): unknown {
  if (status !== 'OBSERVED') return null;
  if (tool === 'magika') {
    return {
      kind: 'magika',
      ...MAGIKA[fmt],
      is_text: false,
      prediction_score: 0.99,
      prediction_mode: 'HIGH_CONFIDENCE',
      overwrite_reason: 'NONE',
      model_version: 'standard_v3_3',
      package_version: '1.0.3',
      execution_duration_ms: 31,
    };
  }
  if (tool === 'lief') {
    return fmt === 'pe'
      ? { kind: 'lief', metadata: { format: 'PE', architecture: 'x86-64', entrypoint: 4096 } }
      : null;
  }
  if (tool === 'die') {
    return {
      kind: 'die',
      detections: fmt === 'pe' ? [{ type: 'compiler', value: 'MSVC 19.3x', method: 'heuristic' }] : [],
    };
  }
  return null;
}

function provenance(tool_id: string, sha: string, artifact_id: string): ContainerToolResult['provenance'] {
  return {
    tool_id: tool_id as never,
    tool_version: `${tool_id}-9.9.9`,
    analysis_run_id: RUN_ID,
    artifact_id,
    input_sha256: sha,
    runner_identity: RUNNER,
    ruleset_version: tool_id === 'capa' ? 'capa-rules-1.0.0' : tool_id === 'yara-x' ? 'zx-yara-2026.09' : null,
    ruleset_digest: 'UNKNOWN',
    tool_binary_digest: 'UNKNOWN',
  };
}

function containerResults(fmt: Fmt): ContainerToolResult[] {
  const { sha, artifactId } = IDENTITY[fmt];
  return TOOLS.map((tool_id) => {
    const status = OUTCOME[fmt][tool_id];
    return {
      tool_id: tool_id as never,
      tool_version: `${tool_id}-9.9.9`,
      status,
      output: toolOutput(fmt, tool_id, status),
      note: status === 'OBSERVED' ? null : `${tool_id} produced no usable result`,
      provenance: provenance(tool_id, sha, artifactId),
    };
  }) as ContainerToolResult[];
}

function inputFor(fmt: Fmt, over: Partial<MaterializeReportInput> = {}): MaterializeReportInput {
  const bytes = BYTES_OF[fmt]();
  const { sha, artifactId } = IDENTITY[fmt];
  return {
    job: {
      job_id: 'job_m155_holdout_001',
      analysis_run_id: RUN_ID,
      artifact_id: artifactId,
      sha256: sha,
      toolchain_version: 'toolchain-1.0.0',
    },
    rawBytes: bytes,
    container_results: containerResults(fmt),
    runner_identity: RUNNER,
    acquisition_context: acquisitionContextFromCanonicalRecord({
      sha256: sha,
      acquisition_source_sample_id: `2020.06.22_FBI-FLASH-MI-000124-MW/${sha}`,
      sample_identity_file_names: [`2020.06.22_FBI-FLASH-MI-000124-MW/${sha}`],
      sample_identity_size_bytes: bytes.length,
    }),
    analyzed_at: ANALYZED_AT,
    generated_at: ANALYZED_AT,
    ...over,
  };
}

/**
 * The EXACT stored document the worker persists (index.ts:1525-1529): the
 * canonical public payload plus two mechanically-derived presentation fields.
 * The read gate validates THIS shape, so the regression must too.
 */
function publishedOf(r: { public_payload: unknown; tool_results: unknown }): Record<string, unknown> {
  return {
    ...(r.public_payload as Record<string, unknown>),
    overall_status: 'SUCCEEDED',
    tool_results: r.tool_results,
  };
}

const planStepsOf = (payload: any): Array<{ step_id: string; capability: string; status: string }> =>
  payload.analysis_status.plan_steps;

const toolStepsOf = (payload: any) => planStepsOf(payload).filter((s) => s.capability.startsWith('tool:'));

const statusOf = (payload: any, tool: string) =>
  toolStepsOf(payload).find((s) => s.capability === `tool:${tool}`)?.status;

// ══════════════ planner: non-PE declares external authority ══════════════

describe('M15.5 planner — out-of-scope analyzers are declared, not dropped', () => {
  const availability = {
    generated_at: ANALYZED_AT,
    environment: 'bun-test',
    tools: TOOLS.map((t) => ({ tool_id: t, available: true, version: '1.0.0', probe: `${t} present` })),
  } as never;

  function planFor(fmt: 'rar' | 'zip') {
    const bytes = BYTES_OF[fmt]();
    const { sha, artifactId } = IDENTITY[fmt];
    return planAnalysis({
      analysis_run_id: RUN_ID,
      artifact: {
        artifact_id: artifactId,
        identity_key: `sha256:${sha}`,
        hashes: { sha256: sha },
        file_names: [`holdout.${fmt}`],
        file_size_bytes: bytes.length,
        format_class: 'OTHER',
      } as never,
      rawBytes: bytes,
      existing_observations: [],
      toolAvailability: availability,
      planned_at: ANALYZED_AT,
    });
  }

  for (const fmt of ['rar', 'zip'] as const) {
    it(`${fmt.toUpperCase()} plan declares every externally executed analyzer`, () => {
      const plan = planFor(fmt);
      const byTool = new Map(plan.steps.filter((s) => s.step_type === 'EXTERNAL_TOOL').map((s) => [s.tool_id, s.status] as const));
      // The five structural analyzers reject this format: never canonically
      // scheduled, but declared with external execution authority.
      for (const tool of ['lief', 'floss', 'die', 'yara-x', 'capa']) {
        expect(byTool.get(tool as never)).toBe('EXTERNAL_EXECUTION');
      }
      // magika is content-agnostic (Phase 4.7): canonically scheduled instead.
      expect(byTool.get('magika' as never)).not.toBe('EXTERNAL_EXECUTION');
      // Nothing is forced onto the artifact: no out-of-scope tool is PLANNED.
      expect(plan.steps.filter((s) => s.status === 'PLANNED').map((s) => s.tool_id)).not.toContain('capa' as never);
      // Every declared step is current-phase, uniquely identified and ordered.
      expect(plan.steps.every((s) => s.phase === 'CURRENT_PHASE')).toBe(true);
      expect(new Set(plan.steps.map((s) => s.step_id)).size).toBe(plan.steps.length);
      expect(plan.steps.map((s) => s.order)).toEqual(plan.steps.map((_, i) => i + 1));
    });
  }

  it('external authority does NOT invoke the canonical tool runner', () => {
    const plan = planFor('rar');
    const bytes = rarBytes();
    const { sha, artifactId } = IDENTITY.rar;
    let invoked = 0;
    // A runner for every tool: if the canonical runtime executed an
    // EXTERNAL_EXECUTION step it would have to reach one of these.
    const runners = TOOLS.map((tool_id) => ({
      descriptor: { tool_id },
      run: () => {
        invoked += 1;
        return { status: 'NO_RESULT', output: null, note: 'stub', provenance: null };
      },
    })) as never;

    const exec = runAnalysisPlan({
      analysis_run_id: RUN_ID,
      artifact: {
        artifact_id: artifactId,
        identity_key: `sha256:${sha}`,
        hashes: { sha256: sha },
        file_names: ['holdout.rar'],
        file_size_bytes: bytes.length,
        format_class: 'OTHER',
      } as never,
      rawBytes: bytes,
      existing_observations: [],
      plan,
      toolAvailability: null,
      tools: runners,
    });

    const external = exec.steps.filter((s) => s.execution_status === 'EXTERNAL_EXECUTION');
    expect(external.map((s) => s.tool_id).sort()).toEqual(['capa', 'die', 'floss', 'lief', 'yara-x']);
    // A declaration produces no observation, no evidence and no execution.
    expect(external.every((s) => s.observation_ids.length === 0)).toBe(true);
    expect(external.some((s) => s.result_status !== undefined)).toBe(false);
    expect(exec.executed_steps.some((s) => ['lief', 'floss', 'die', 'yara-x', 'capa'].includes(s.tool_id as string))).toBe(false);
    expect(exec.new_observations.some((o) => ['lief', 'floss', 'die', 'yara-x', 'capa'].includes(o.attributes?.tool_name as string))).toBe(false);
    // Only magika was canonically scheduled, so at most one tool ran here.
    expect(invoked).toBeLessThanOrEqual(1);
  });
});

// ══════════════ materialization: gate-valid non-PE reports ══════════════

describe('M15.5 materialization — non-PE reports satisfy the stored-report contract', () => {
  for (const fmt of ['rar', 'zip'] as const) {
    it(`${fmt.toUpperCase()}: tool_results is fully represented in plan_steps, gate returns zero rejections`, async () => {
      const r = await materializeCanonicalReport(inputFor(fmt));
      expect(r.status).toBe('MATERIALIZED');
      if (r.status !== 'MATERIALIZED') return;

      const payload = publishedOf(r) as any;
      const toolResults: Array<{ tool_id: string; status: string }> = payload.tool_results;
      const represented = new Set(toolStepsOf(payload).map((s) => s.capability));

      // Direct regression assertion: every recorded analyzer result has a
      // corresponding plan representation.
      for (const t of toolResults) {
        expect(represented.has(`tool:${t.tool_id}`)).toBe(true);
      }
      expect(toolResults.map((t) => t.tool_id).sort()).toEqual([...TOOLS].sort());

      // The five format-inapplicable analyzers carry external authority...
      for (const tool of ['lief', 'floss', 'die', 'yara-x', 'capa']) {
        expect(statusOf(payload, tool)).toBe('EXTERNAL_EXECUTION');
      }
      // ...and that authority is never laundered into a capability gap.
      for (const tool of ['lief', 'floss', 'die', 'yara-x', 'capa']) {
        expect(statusOf(payload, tool)).not.toBe('UNAVAILABLE');
        expect(statusOf(payload, tool)).not.toBe('ERROR');
      }

      // The recorded content-type prediction survives (an archive, not a PE).
      expect(payload.content_type_assessment.content_type).toBe(fmt);
      expect(payload.content_type_assessment.observation_status).toBe('OBSERVED');

      // Recorded outcomes survive verbatim and stay distinguishable.
      const byTool = Object.fromEntries(toolResults.map((t) => [t.tool_id, t.status]));
      expect(byTool.lief).toBe('NO_RESULT');
      expect(byTool.floss).toBe('ERROR');
      expect(byTool.die).toBe('OBSERVED');
      expect(byTool['yara-x']).toBe('NO_RESULT');
      expect(byTool.capa).toBe('ERROR');
      expect(byTool.magika).toBe('OBSERVED');
      expect(new Set(Object.values(byTool)).size).toBe(3);

      // The gate that was rejecting these reports now accepts them.
      expect(
        validateStoredMalwareReport({
          stored_id: payload.report_id,
          stored_sha256: IDENTITY[fmt].sha,
          payload,
        })
      ).toEqual([]);
    });
  }

  it('the external state is deterministic across repeated materializations', async () => {
    const first = await materializeCanonicalReport(inputFor('rar'));
    const second = await materializeCanonicalReport(inputFor('rar'));
    expect(first.status).toBe('MATERIALIZED');
    expect(second.status).toBe('MATERIALIZED');
    if (first.status !== 'MATERIALIZED' || second.status !== 'MATERIALIZED') return;
    expect(planStepsOf(second.public_payload)).toEqual(planStepsOf(first.public_payload));
  });
});

// ══════════════ PE regression: behaviour unchanged ══════════════

describe('M15.5 PE regression — supported formats keep canonical scheduling', () => {
  it('every approved analyzer is canonically scheduled; no external-authority step appears', async () => {
    const r = await materializeCanonicalReport(inputFor('pe'));
    expect(r.status).toBe('MATERIALIZED');
    if (r.status !== 'MATERIALIZED') return;

    const payload = publishedOf(r) as any;
    expect(toolStepsOf(payload).map((s) => s.capability).sort()).toEqual(TOOLS.map((t) => `tool:${t}`).sort());
    expect(toolStepsOf(payload).some((s) => s.status === 'EXTERNAL_EXECUTION')).toBe(false);
    // static_analyzer + the six analyzers = 7 current plan steps, as served today.
    expect(planStepsOf(payload)).toHaveLength(7);
    expect(planStepsOf(payload).find((s) => s.capability === 'static_analyzer')?.status).toBe('OBSERVED');

    expect(
      validateStoredMalwareReport({ stored_id: payload.report_id, stored_sha256: IDENTITY.pe.sha, payload })
    ).toEqual([]);
  });
});
