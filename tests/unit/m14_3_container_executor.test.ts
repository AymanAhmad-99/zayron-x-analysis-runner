/**
 * M14.3 — Hardened Container Analysis Plane Tests
 *
 * Validates the canonical container executor (M4 boundary), the no-unsafe-
 * fallback policy, per-tool status mapping, provenance preservation, and the
 * M14.1/M14.2 semantic invariants when external-tool evidence flows through
 * M4→M5→M6→M7–M13. Synthetic fixtures with novel holdout identities only;
 * no real sample is executed on the developer host (forbidden by policy).
 */
import { describe, it, expect } from 'bun:test';

import {
  createContainerToolRunners,
  buildContainerAvailabilityReport,
  runContainerToolAnalysis,
  APPROVED_CONTAINER_TOOLS,
  CONTAINER_EXECUTOR_VERSION,
} from '../../packages/intelligence/src/malware/canonical';
import type { ContainerToolResult } from '../../packages/intelligence/src/malware/canonical';
import { runStaticAnalysis, detectFormat } from '../../packages/intelligence/src/malware/canonical/staticAnalysis';
import { planAnalysis } from '../../packages/intelligence/src/malware/canonical/analysisPlanner';
import { runAnalysisPlan } from '../../packages/intelligence/src/malware/canonical/analysisRuntime';
import type { Artifact } from '../../packages/intelligence/src/malware/canonical/artifact';
import type { ToolId } from '../../packages/intelligence/src/malware/canonical/toolBridge';

const RUN_ID = 'ar_m143_executor_001';
const AT = '2026-09-21T02:00:00.000Z';
const SHA = 'a'.repeat(64);

function makeArtifact(): Artifact {
  return {
    artifact_id: 'art_m143_holdout',
    identity_key: `sha256:${SHA}`,
    format_class: 'PE',
    file_names: ['m143_holdout.bin'],
    hashes: { sha256: SHA },
    file_size_bytes: 2048,
    mime_type: 'application/x-dosexec',
    format_attributes: {},
    provenance: { evidence_refs: [], source_ids: [], authority_tier: 'TIER_1', snapshot_ids: [RUN_ID], derived_at: AT },
  } as unknown as Artifact;
}

/** Minimal valid PE fixture (deterministic; synthetic, not malware). */
function buildPe(): Uint8Array {
  const bytes = new Uint8Array(512);
  bytes[0] = 0x4d; bytes[1] = 0x5a; // 'MZ'
  const peOff = 0x80;
  bytes[0x3c] = peOff & 0xff; bytes[0x3c + 1] = peOff >> 8;
  bytes[peOff] = 0x50; bytes[peOff + 1] = 0x45; bytes[peOff + 2] = 0; bytes[peOff + 3] = 0;
  return bytes;
}

// ── container-result fixtures (normalized shapes from the container contract) ──

function containerResult(tool: ToolId, over: Partial<ContainerToolResult> = {}): ContainerToolResult {
  const outputs: Record<ToolId, ContainerToolResult['output']> = {
    lief: { kind: 'lief', metadata: { format: 'PE', architecture: 'X86', entry_point: '4096', image_base: '4194304', section_count: 5, import_library_count: 3, import_libraries: 'KERNEL32.dll,USER32.dll,msvcrt.dll' } },
    floss: { kind: 'floss', strings: { stack: [], decoded: ['https://example.com/zqx'], tight: [], static: 42 }, total_extracted: 1 },
    die: { kind: 'die', detections: [{ type: 'PE', value: 'Compiler: MSVC C++', method: 'pattern' }] },
    'yara-x': { kind: 'yara', matches: [] },
    capa: { kind: 'capa', capabilities: [{ name: 'Zqx_Holdout_Capability', address: '0x1000', source_rule: 'create-thread', attack: ['T1055.003'], mbc: null }] },
  };
  return {
    tool_id: tool,
    tool_version: '1.2.3-container-fixture',
    status: 'OBSERVED',
    output: outputs[tool],
    note: null,
    provenance: {
      tool_id: tool,
      tool_version: '1.2.3-container-fixture',
      analysis_run_id: RUN_ID,
      artifact_id: 'art_m143_holdout',
      input_sha256: SHA,
      runner_identity: 'zx-runner-fixture-01',
      ruleset_version: tool === 'capa' ? '9.4.0' : tool === 'yara-x' ? 'none' : null,
      ruleset_digest: null,
      tool_binary_digest: null,
    },
    ...over,
  };
}

// ── executor contract ──

describe('M14.3 — container executor (M4 boundary)', () => {
  it('approved tool set is exactly the five structural analyzers plus the content-type classifier', () => {
    expect([...APPROVED_CONTAINER_TOOLS].sort()).toEqual(['capa', 'die', 'floss', 'lief', 'magika', 'yara-x']);
    expect(CONTAINER_EXECUTOR_VERSION).toContain('containerexecutor-canonical');
  });

  it('no endpoint configured → every runner resolves UNAVAILABLE (never clean), execution flagged', async () => {
    const { runners, execution } = await createContainerToolRunners({
      config: null,
      analysis_run_id: RUN_ID,
      artifact: makeArtifact(),
      rawBytes: buildPe(),
      requested_tools: [...APPROVED_CONTAINER_TOOLS],
    });
    expect(execution).toMatchObject({ kind: 'UNREACHABLE', error_class: 'EXECUTION_UNAVAILABLE' });
    expect(runners).toHaveLength(APPROVED_CONTAINER_TOOLS.length);
    for (const runner of runners) {
      const outcome = runner.run({} as never);
      expect(outcome.status).toBe('UNAVAILABLE');
      expect(outcome.note).toContain('host execution is forbidden');
      expect(outcome.output).toBeNull();
    }
  });

  it('pre-resolved container results map onto the M4 status vocabulary verbatim (no invented states)', async () => {
    const results: ReadonlyMap<ToolId, ContainerToolResult> = new Map([
      ['lief', containerResult('lief')],
      ['floss', containerResult('floss')],
      ['die', containerResult('die')],
      ['yara-x', containerResult('yara-x', { status: 'NO_RESULT', output: { kind: 'yara', matches: [] }, note: 'no canonical YARA ruleset is configured' })],
      ['capa', containerResult('capa', { status: 'ERROR', output: null, note: 'capa timed out' })],
    ]);
    const { runners } = await createContainerToolRunners({
      config: { endpoint: 'http://zx-container-fixture.invalid' },
      analysis_run_id: RUN_ID,
      artifact: makeArtifact(),
      rawBytes: buildPe(),
      requested_tools: [...APPROVED_CONTAINER_TOOLS],
      fixedResults: results as never,
    });
    // Map through the M4 bridge to observations, verifying statuses verbatim.
    const artifact = makeArtifact();
    const bridge = (await import('../../packages/intelligence/src/malware/canonical/toolBridge')).runExternalToolAnalysis;
    const result = bridge({
      analysis_run_id: RUN_ID,
      artifact,
      detected_format: 'PE',
      rawBytes: buildPe(),
      analyzed_at: AT,
      tools: runners,
      toolAvailability: buildContainerAvailabilityReport({
        endpoint_config: { endpoint: 'http://zx-container-fixture.invalid' },
        generated_at: AT,
        health: { reachable: true, runner_identity: 'zx-runner-fixture-01' },
      }),
    });
    const statusByTool = new Map(result.observations.filter((o) => o.observation_type === 'tool_analysis').map((o) => [String(o.attributes.tool_name), String(o.attributes.analysis_status)]));
    expect(statusByTool.get('lief')).toBe('OBSERVED');
    expect(statusByTool.get('floss')).toBe('OBSERVED');
    expect(statusByTool.get('die')).toBe('OBSERVED');
    expect(statusByTool.get('yara-x')).toBe('NO_RESULT'); // no ruleset: NO_RESULT, never clean
    expect(statusByTool.get('capa')).toBe('ERROR'); // timeout: ERROR, run continues
  });

  it('availability report marks every approved tool unavailable when the plane is down (never clean)', () => {
    const report = buildContainerAvailabilityReport({ endpoint_config: null, generated_at: AT, health: { reachable: false, error_class: 'EXECUTION_UNAVAILABLE' } });
    expect(report.tools).toHaveLength(APPROVED_CONTAINER_TOOLS.length);
    for (const t of report.tools) {
      expect(t.available).toBe(false);
      expect(t.probe).toContain('FORBIDDEN by policy');
    }
  });

  it('container results outside the approved vocabulary are ignored (defense in depth)', async () => {
    const bogus = { ...containerResult('lief'), tool_id: 'speakeasy' as ToolId };
    const results = new Map<ToolId, ContainerToolResult>([['speakeasy', bogus], ['lief', containerResult('lief')]]);
    const { runners } = await createContainerToolRunners({
      config: { endpoint: 'http://zx-container-fixture.invalid' },
      analysis_run_id: RUN_ID,
      artifact: makeArtifact(),
      rawBytes: buildPe(),
      requested_tools: ['lief', 'speakeasy' as ToolId],
      fixedResults: results,
    });
    // Only the approved tool produces a runner; speakeasy is not executable.
    expect(runners.map((r) => r.descriptor.tool_id)).toEqual(['lief']);
  });
});

// ── full-plane integration through M4→M5→M6→M7–M13 ──

describe('M14.3 — semantic integrity with container tool evidence in the pipeline', () => {
  it('M6 consumes container-backed runners: statuses preserved, failure isolated, no clean-remapping', async () => {
    const artifact = makeArtifact();
    const bytes = buildPe();
    expect(detectFormat(bytes)).toBe('PE');
    const results: ReadonlyMap<ToolId, ContainerToolResult> = new Map([
      ['lief', containerResult('lief')],
      ['floss', containerResult('floss')],
      ['die', containerResult('die')],
      ['yara-x', containerResult('yara-x', { status: 'NO_RESULT', output: { kind: 'yara', matches: [] } })],
      ['capa', containerResult('capa', { status: 'ERROR', output: null, note: 'capa timed out' })],
    ]);
    const { runners } = await createContainerToolRunners({
      config: { endpoint: 'http://zx-container-fixture.invalid' },
      analysis_run_id: RUN_ID,
      artifact,
      rawBytes: bytes,
      requested_tools: [...APPROVED_CONTAINER_TOOLS],
      fixedResults: results as never,
    });
    const staticPass = runStaticAnalysis({ analysis_run_id: RUN_ID, artifact, rawBytes: bytes, analyzed_at: AT });
    const plan = planAnalysis({
      analysis_run_id: RUN_ID,
      artifact,
      rawBytes: bytes,
      existing_observations: staticPass.observations,
      toolAvailability: buildContainerAvailabilityReport({ endpoint_config: { endpoint: 'http://x' }, generated_at: AT, health: { reachable: true, runner_identity: 'zx-runner-fixture-01' } }),
      planned_at: AT,
    });
    const exec = runAnalysisPlan({
      analysis_run_id: RUN_ID,
      artifact,
      rawBytes: bytes,
      existing_observations: staticPass.observations,
      plan,
      toolAvailability: null,
      tools: runners,
    });
    const toolSteps = exec.steps.filter((s) => s.step_type === 'EXTERNAL_TOOL');
    expect(toolSteps.length).toBe(APPROVED_CONTAINER_TOOLS.length);
    const byTool = new Map(toolSteps.map((s) => [s.tool_id, s]));
    expect(byTool.get('lief')?.result_status).toBe('OBSERVED');
    expect(byTool.get('capa')?.result_status).toBe('ERROR'); // isolated; run continued
    expect(byTool.get('yara-x')?.result_status).toBe('NO_RESULT');
    // no tool failure aborted the other executable steps
    expect(exec.steps.every((s) => s.execution_status !== 'EXECUTION_ERROR' || s.error === undefined || s.tool_id !== 'lief')).toBe(true);
  });

  it('M14.1 invariant: tool evidence never becomes Infrastructure (floss URL + lief image base die at the M11 gate)', async () => {
    const { correlateInfrastructure } = await import('../../packages/intelligence/src/malware/canonical');
    const { processEvidenceToClaims } = await import('../../packages/intelligence/src/malware/canonical');
    const artifact = makeArtifact();
    const bytes = buildPe();
    const results: ReadonlyMap<ToolId, ContainerToolResult> = new Map([
      ['lief', containerResult('lief')],
      ['floss', containerResult('floss')],
      ['die', containerResult('die')],
      ['yara-x', containerResult('yara-x', { status: 'NO_RESULT', output: { kind: 'yara', matches: [] } })],
      ['capa', containerResult('capa')],
    ]);
    const { runners } = await createContainerToolRunners({
      config: { endpoint: 'http://zx-container-fixture.invalid' },
      analysis_run_id: RUN_ID,
      artifact,
      rawBytes: bytes,
      requested_tools: [...APPROVED_CONTAINER_TOOLS],
      fixedResults: results as never,
    });
    const bridge = (await import('../../packages/intelligence/src/malware/canonical/toolBridge')).runExternalToolAnalysis;
    const toolPass = bridge({
      analysis_run_id: RUN_ID, artifact, detected_format: 'PE', rawBytes: bytes, analyzed_at: AT, tools: runners,
      toolAvailability: buildContainerAvailabilityReport({ endpoint_config: { endpoint: 'http://x' }, generated_at: AT, health: { reachable: true, runner_identity: 'r' } }),
    });
    const staticPass = runStaticAnalysis({ analysis_run_id: RUN_ID, artifact, rawBytes: bytes, analyzed_at: AT });
    const observations = [...staticPass.observations, ...toolPass.observations];
    const claims = processEvidenceToClaims({ analysis_run_id: RUN_ID, artifact, observations, processed_at: AT });
    const infra = correlateInfrastructure({
      analysis_run_id: RUN_ID, artifact,
      claims: claims.new_claims, behaviors: [], configurations: [], observations,
      correlated_at: AT,
    });
    // The floss URL-shaped string, lief metadata, die detections, tool names and
    // statuses must all die at the M14.1 semantic gate (they enter as REPORTS_VALUE
    // claims / non-infra observation keys — never infrastructure-bearing semantics).
    expect(infra.new_relationships).toHaveLength(0);
    const blob = JSON.stringify(infra.new_relationships);
    for (const forbidden of ['https://example.com', '0x', 'MSVC', 'KERNEL32', 'UNAVAILABLE', 'yara', 'capa', 'floss', 'lief', 'die']) {
      expect(blob.includes(forbidden)).toBe(false);
    }
  });

  it('M14.2 invariant: evidence support semantics intact for container-produced claims; CAN_DO stays CAN_DO', async () => {
    const { resolveConfidenceAndConflicts, deriveSupportSemantics } = await import('../../packages/intelligence/src/malware/canonical');
    const artifact = makeArtifact();
    const bytes = buildPe();
    const results: ReadonlyMap<ToolId, ContainerToolResult> = new Map([
      ['capa', containerResult('capa')],
      ['lief', containerResult('lief')],
    ]);
    const { runners } = await createContainerToolRunners({
      config: { endpoint: 'http://zx-container-fixture.invalid' },
      analysis_run_id: RUN_ID,
      artifact,
      rawBytes: bytes,
      requested_tools: ['capa', 'lief'],
      fixedResults: results,
    });
    const bridge = (await import('../../packages/intelligence/src/malware/canonical/toolBridge')).runExternalToolAnalysis;
    const toolPass = bridge({
      analysis_run_id: RUN_ID, artifact, detected_format: 'PE', rawBytes: bytes, analyzed_at: AT, tools: runners,
      toolAvailability: buildContainerAvailabilityReport({ endpoint_config: { endpoint: 'http://x' }, generated_at: AT, health: { reachable: true, runner_identity: 'r' } }),
    });
    const { processEvidenceToClaims } = await import('../../packages/intelligence/src/malware/canonical');
    const claims = processEvidenceToClaims({
      analysis_run_id: RUN_ID, artifact,
      observations: [...runStaticAnalysis({ analysis_run_id: RUN_ID, artifact, rawBytes: bytes, analyzed_at: AT }).observations, ...toolPass.observations],
      processed_at: AT,
    });
    const capaClaim = claims.new_claims.find((c) => c.predicate === 'EXHIBITS_CAPABILITY');
    if (capaClaim) {
      expect(capaClaim.status).toBe('CAN_DO'); // never OBSERVED_DOING from static capa
    }
    const confidence = resolveConfidenceAndConflicts({
      analysis_run_id: RUN_ID, artifact, claims: claims.new_claims, behaviors: [], configurations: [], resolved_at: AT,
    });
    for (const a of confidence.confidence_assessments) {
      expect(a.support).toBeGreaterThanOrEqual(0);
      expect(a.support).toBeLessThanOrEqual(1);
      const sem = deriveSupportSemantics(a);
      expect(sem.metric).toBe('EVIDENCE_SUPPORT');
      expect(sem.lineage_count).toBe(a.evidence_ids.length);
    }
  });

  it('provenance: container-produced observations carry tool identity, STATIC evidence, artifact/run ids', async () => {
    const artifact = makeArtifact();
    const bytes = buildPe();
    const results: ReadonlyMap<ToolId, ContainerToolResult> = new Map([['lief', containerResult('lief')]]);
    const { runners } = await createContainerToolRunners({
      config: { endpoint: 'http://zx-container-fixture.invalid' },
      analysis_run_id: RUN_ID,
      artifact,
      rawBytes: bytes,
      requested_tools: ['lief'],
      fixedResults: results,
    });
    const bridge = (await import('../../packages/intelligence/src/malware/canonical/toolBridge')).runExternalToolAnalysis;
    const result = bridge({
      analysis_run_id: RUN_ID, artifact, detected_format: 'PE', rawBytes: bytes, analyzed_at: AT, tools: runners,
      toolAvailability: buildContainerAvailabilityReport({ endpoint_config: { endpoint: 'http://x' }, generated_at: AT, health: { reachable: true, runner_identity: 'r' } }),
    });
    const toolObs = result.observations.filter((x) => x.observation_type === 'tool_analysis' && x.attributes.analysis_status === 'OBSERVED');
    expect(toolObs).toHaveLength(1);
    for (const o of toolObs) {
      expect(o.analysis_run_id).toBe(RUN_ID);
      expect(o.artifact_id).toBe(artifact.artifact_id);
      expect(o.evidence_refs.every((e) => e.kind === 'STATIC')).toBe(true);
      expect(o.attributes.tool_name).toBe('lief');
      expect(typeof o.attributes.tool_version).toBe('string'); // version captured from the container result
    }
  });
});
