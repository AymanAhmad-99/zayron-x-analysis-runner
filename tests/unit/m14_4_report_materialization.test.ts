/**
 * M14.4 — Canonical report materialization tests.
 *
 * Proves the materialization boundary: an executed analysis run's recorded
 * tool outcomes are replayed through the UNCHANGED M4 bridge into the M5–M13
 * chain, producing a grounded canonical report and public projection.
 *
 * Invariants pinned here:
 *   - tool statuses are preserved verbatim (UNAVAILABLE / NO_RESULT / ERROR are
 *     never converted into clean, negative, or absence);
 *   - tool provenance (run id, artifact id, input sha256, version, runner,
 *     ruleset) is preserved exactly;
 *   - the input sha256 is recomputed from the actual bytes and enforced;
 *   - the materialized artifact identity must equal the job's artifact id;
 *   - malformed / mismatched evidence fails CLOSED — no partial report exists;
 *   - the public projection never exposes raw bytes or private storage paths.
 *
 * Synthetic fixtures, novel holdout identities only.
 */
import { describe, it, expect, beforeAll } from 'bun:test';

import {
  materializeCanonicalReport,
  acquisitionContextFromCanonicalRecord,
  type MaterializeReportInput,
} from '../../packages/intelligence/src/malware/canonical/reportMaterialization';
import type { ContainerToolResult } from '../../packages/intelligence/src/malware/canonical/executor/containerToolExecutor';

// Novel holdout identity — DERIVED from the synthetic fixture bytes, so the
// fixture exercises the real recompute-and-compare integrity gate (no real
// sample anchor exists anywhere).
let SHA = '';
let ARTIFACT_ID = '';
const RUN_ID = 'ar_m144_holdout_001';
const RUNNER = 'gh-runner-35684081429';
const ANALYZED_AT = '2026-09-22T04:00:00.000Z';

/** Minimal MZ-prefixed payload so the canonical static layer classifies PE. */
/** Deterministic fixture bytes; the identity used in tests is their real sha256. */
const FIXTURE_BYTES = peBytes();

beforeAll(async () => {
  const digest = await crypto.subtle.digest('SHA-256', FIXTURE_BYTES as unknown as ArrayBuffer);
  SHA = Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0')).join('');
  ARTIFACT_ID = `art_gmf_${SHA.slice(0, 16)}`;
});

function peBytes(size = 4096): Uint8Array {
  const bytes = new Uint8Array(size);
  bytes[0] = 0x4d;
  bytes[1] = 0x5a;
  bytes[2] = 0x90;
  bytes[3] = 0x00;
  // A couple of ASCII strings so the string-indicator pass has material.
  const text = 'Mozilla/5.0 http://holdout.invalid/a 192.0.2.10 GetProcAddress';
  for (let i = 0; i < text.length; i++) bytes[512 + i] = text.charCodeAt(i);
  return bytes;
}

function provenance(tool_id: string, over: Partial<ContainerToolResult['provenance']> = {}): ContainerToolResult['provenance'] {
  return {
    tool_id: tool_id as never,
    tool_version: `${tool_id}-9.9.9`,
    analysis_run_id: RUN_ID,
    artifact_id: ARTIFACT_ID,
    input_sha256: SHA,
    runner_identity: RUNNER,
    ruleset_version: tool_id === 'capa' ? 'capa-rules-1.0.0' : tool_id === 'yara-x' ? 'zx-yara-2026.09' : null,
    ruleset_digest: 'UNKNOWN',
    tool_binary_digest: 'UNKNOWN',
    ...over,
  };
}

/** Five recorded results in mixed statuses — the shape the container returns. */
function containerResults(): ContainerToolResult[] {
  return [
    {
      tool_id: 'lief', tool_version: 'lief-9.9.9', status: 'OBSERVED',
      output: { kind: 'lief', metadata: { format: 'PE', architecture: 'x86-64', entrypoint: 4096 } },
      note: null, provenance: provenance('lief'),
    },
    {
      tool_id: 'floss', tool_version: 'floss-9.9.9', status: 'OBSERVED',
      output: { kind: 'floss', strings: { stack: ['holdout.stack'], decoded: ['holdout.decoded'], tight: [] }, total_extracted: 2 },
      note: null, provenance: provenance('floss'),
    },
    {
      tool_id: 'die', tool_version: 'die-9.9.9', status: 'OBSERVED',
      output: { kind: 'die', detections: [{ type: 'compiler', value: 'MSVC 19.3x', method: 'heuristic' }] },
      note: null, provenance: provenance('die'),
    },
    {
      // Recorded NO_RESULT — must stay NO_RESULT, never "clean".
      tool_id: 'yara-x', tool_version: 'yara-x-9.9.9', status: 'NO_RESULT',
      output: null, note: 'no rule matched; this is NOT evidence of absence',
      provenance: provenance('yara-x'),
    },
    {
      // Recorded ERROR — must stay ERROR, never "clean".
      tool_id: 'capa', tool_version: 'capa-9.9.9', status: 'ERROR',
      output: null, note: 'capa exit 2',
      provenance: provenance('capa'),
    },
  ];
}

function baseInput(over: Partial<MaterializeReportInput> = {}): MaterializeReportInput {
  const bytes = peBytes();
  if (!SHA) throw new Error('fixture identity not initialized (beforeAll has not run)');
  return {
    job: {
      job_id: 'job_m144_holdout_001',
      analysis_run_id: RUN_ID,
      artifact_id: ARTIFACT_ID,
      sha256: SHA,
      toolchain_version: 'toolchain-1.0.0',
    },
    rawBytes: bytes,
    container_results: containerResults(),
    runner_identity: RUNNER,
    acquisition_context: acquisitionContextFromCanonicalRecord({
      sha256: SHA,
      acquisition_source_sample_id: `2020.06.22_FBI-FLASH-MI-000124-MW/${SHA}`,
      sample_identity_file_names: [`2020.06.22_FBI-FLASH-MI-000124-MW/${SHA}`],
      sample_identity_size_bytes: bytes.length,
    }),
    analyzed_at: ANALYZED_AT,
    generated_at: ANALYZED_AT,
    ...over,
  };
}

// ══════════════ materialized report ══════════════

describe('M14.4 materialization — MATERIAized path', () => {
  it('materializes a grounded canonical report bound to the job identity', async () => {
    const r = await materializeCanonicalReport(baseInput());
    expect(r.status).toBe('MATERIALIZED');
    if (r.status !== 'MATERIALIZED') return;
    expect(r.report.artifact_id).toBe(ARTIFACT_ID);
    expect(r.report.analysis_run_id).toBe(RUN_ID);
    expect(r.report.sha256).toBe(SHA);
    expect(r.report.report_id.startsWith('mir_')).toBe(true);
    // Grounding: every rendered statement references a canonical object id.
    expect(r.report.grounding.ai_generated_facts).toBe(0);
    expect(r.report.grounding.all_statements_grounded).toBe(true);
  });

  it('preserves every tool status verbatim and records provenance exactly', async () => {
    const r = await materializeCanonicalReport(baseInput());
    expect(r.status).toBe('MATERIALIZED');
    if (r.status !== 'MATERIALIZED') return;

    expect(r.summary.tool_status).toEqual({
      lief: 'OBSERVED', floss: 'OBSERVED', die: 'OBSERVED', 'yara-x': 'NO_RESULT', capa: 'ERROR',
      // phase 4.7: this fixture records no content-type result, so magika keeps
      // its own explicit status — never reinterpreted as UNAVAILABLE or clean.
      magika: 'NO_CONTAINER_RESULT',
    });

    const byTool = new Map(r.tool_results.map((t) => [t.tool_id, t]));
    expect(byTool.get('yara-x')!.status).toBe('NO_RESULT');
    expect(byTool.get('capa')!.status).toBe('ERROR');
    expect(byTool.get('capa')!.note).toBe('capa exit 2');

    for (const t of r.tool_results) {
      expect(t.provenance.analysis_run_id).toBe(RUN_ID);
      expect(t.provenance.artifact_id).toBe(ARTIFACT_ID);
      expect(t.provenance.input_sha256).toBe(SHA);
      expect(t.provenance.runner_identity).toBe(RUNNER);
      if (t.status === 'NO_CONTAINER_RESULT') {
        // No container record ⇒ the version is unknown, never fabricated.
        expect(t.tool_version).toBeNull();
        continue;
      }
      expect(t.tool_version).toBe(`${t.tool_id}-9.9.9`);
    }
    expect(byTool.get('capa')!.provenance.ruleset_version).toBe('capa-rules-1.0.0');
    expect(byTool.get('yara-x')!.provenance.ruleset_version).toBe('zx-yara-2026.09');
  });

  it('does NOT treat NO_RESULT / ERROR as clean absence', async () => {
    const r = await materializeCanonicalReport(baseInput());
    if (r.status !== 'MATERIALIZED') throw new Error('expected materialized');
    expect(r.summary.limitation_codes).toContain('NO_RESULT_ANALYZER');
    const toolSteps = (r.report.analysis_status.plan_steps ?? []).filter((s) => s.capability.startsWith('tool:'));
    const yara = toolSteps.find((s) => s.capability === 'tool:yara-x');
    const capa = toolSteps.find((s) => s.capability === 'tool:capa');
    expect(yara?.status).toBe('NO_RESULT');
    expect(capa?.status).toBe('ERROR');
  });

  it('public projection carries identity + evidence, and never raw bytes or private paths', async () => {
    const r = await materializeCanonicalReport(baseInput());
    if (r.status !== 'MATERIALIZED') throw new Error('expected materialized');
    const json = JSON.stringify(r.public_payload);
    expect(r.public_payload.report_id).toBe(r.report.report_id);
    expect(r.public_payload.analysis_run_id).toBe(RUN_ID);
    expect(r.public_payload.artifact_id).toBe(ARTIFACT_ID);
    expect(r.public_payload.sha256).toBe(SHA);
    expect(json).not.toContain('private://');
    expect(json).not.toContain('archive_password');
    expect((r.public_payload.evidence as any).evidence_refs_publicly_exposed).toBe(false);
    expect((r.public_payload.acquisition as any).raw_sample_publicly_exposed).toBe(false);
  });

  it('is deterministic: identical inputs produce an identical report identity', async () => {
    const a = await materializeCanonicalReport(baseInput());
    const b = await materializeCanonicalReport(baseInput());
    if (a.status !== 'MATERIALIZED' || b.status !== 'MATERIALIZED') throw new Error('expected materialized');
    expect(a.report.report_id).toBe(b.report.report_id);
  });
});

// ══════════════ fail-closed gates ══════════════

describe('M14.4 materialization — fail-closed gates', () => {
  it('rejects when the bytes do not hash to the job sha256', async () => {
    const other = peBytes(4096);
    other[600] = (other[600] as number) ^ 0x01; // perturb, identity no longer matches
    const r = await materializeCanonicalReport(baseInput({ rawBytes: other }));
    expect(r).toEqual({
      status: 'REJECTED', code: 'sha256_mismatch',
      detail: expect.stringContaining(SHA),
    } as never);
  });

  it('rejects an acquisition context that belongs to a different sample identity', async () => {
    const r = await materializeCanonicalReport(baseInput({
      acquisition_context: acquisitionContextFromCanonicalRecord({
        sha256: SHA,
        acquisition_source_sample_id: `other-dir/${'0'.repeat(64)}`,
        sample_identity_file_names: null,
        sample_identity_size_bytes: null,
      }),
    }));
    expect(r.status).toBe('REJECTED');
    if (r.status !== 'REJECTED') return;
    expect(r.code).toBe('acquisition_context_mismatch');
  });

  it('rejects a job artifact_id that cannot be derived from the job sha256', async () => {
    // Keep tool provenance consistent with the (bogus) job identity so the
    // provenance gate passes and the canonical-artifact derivation gate is the
    // one under test.
    const bogusArtifact = 'art_gmf_deadbeefdeadbeef';
    const results = containerResults().map((r) => ({
      ...r,
      provenance: { ...r.provenance, artifact_id: bogusArtifact },
    }));
    const r = await materializeCanonicalReport(baseInput({
      job: { job_id: 'j', analysis_run_id: RUN_ID, artifact_id: bogusArtifact, sha256: SHA },
      container_results: results,
    }));
    expect(r.status).toBe('REJECTED');
    if (r.status !== 'REJECTED') return;
    expect(r.code).toBe('artifact_identity_mismatch');
  });

  it('rejects a missing acquisition context (no source identity anywhere)', async () => {
    const r = await materializeCanonicalReport(baseInput({
      acquisition_context: acquisitionContextFromCanonicalRecord({
        sha256: SHA, acquisition_source_sample_id: null, sample_identity_file_names: null, sample_identity_size_bytes: null,
      }),
    }));
    expect(r.status).toBe('REJECTED');
    if (r.status !== 'REJECTED') return;
    expect(r.code).toBe('acquisition_context_missing');
  });

  it('rejects a recorded acquired size that disagrees with the stored bytes', async () => {
    const r = await materializeCanonicalReport(baseInput({
      acquisition_context: acquisitionContextFromCanonicalRecord({
        sha256: SHA, acquisition_source_sample_id: `dir/${SHA}`, sample_identity_file_names: null, sample_identity_size_bytes: 999,
      }),
    }));
    expect(r.status).toBe('REJECTED');
    if (r.status !== 'REJECTED') return;
    expect(r.code).toBe('acquired_size_mismatch');
  });

  it('rejects tool provenance bound to a different run', async () => {
    const results = containerResults();
    results[0] = { ...results[0], provenance: provenance('lief', { analysis_run_id: 'ar_other_run' }) };
    const r = await materializeCanonicalReport(baseInput({ container_results: results }));
    expect(r.status).toBe('REJECTED');
    if (r.status !== 'REJECTED') return;
    expect(r.code).toBe('tool_provenance_mismatch');
  });

  it('rejects tool provenance bound to a different input sha256', async () => {
    const results = containerResults();
    results[1] = { ...results[1], provenance: provenance('floss', { input_sha256: 'ff'.repeat(32) }) };
    const r = await materializeCanonicalReport(baseInput({ container_results: results }));
    expect(r.status).toBe('REJECTED');
    if (r.status !== 'REJECTED') return;
    expect(r.code).toBe('tool_provenance_mismatch');
  });

  it('rejects malformed tool results (unknown status / unapproved tool / duplicates)', async () => {
    const unknownStatus = containerResults();
    (unknownStatus[0] as any).status = 'CLEAN';
    expect((await materializeCanonicalReport(baseInput({ container_results: unknownStatus }))).status).toBe('REJECTED');

    const unapproved = [{ ...containerResults()[0], tool_id: 'upx-tool' }];
    expect((await materializeCanonicalReport(baseInput({ container_results: unapproved }))).status).toBe('REJECTED');

    const duped = [...containerResults(), containerResults()[0]];
    expect((await materializeCanonicalReport(baseInput({ container_results: duped }))).status).toBe('REJECTED');

    expect((await materializeCanonicalReport(baseInput({ container_results: [] }))).status).toBe('REJECTED');
    expect((await materializeCanonicalReport(baseInput({ container_results: { reason: 'workflow_step_failure' } }))).status).toBe('REJECTED');
  });

  it('rejects empty or invalid sample bytes', async () => {
    const empty = await materializeCanonicalReport(baseInput({ rawBytes: new Uint8Array(0) }));
    expect(empty.status === 'REJECTED' && empty.code).toBe('empty_sample_bytes');

    const badSha = await materializeCanonicalReport(baseInput({
      job: { job_id: 'j', analysis_run_id: RUN_ID, artifact_id: ARTIFACT_ID, sha256: 'not-a-sha' },
    }));
    expect(badSha.status === 'REJECTED' && badSha.code).toBe('invalid_sha256');
  });

  it('reports a missing tool record as explicit UNAVAILABLE, never as clean', async () => {
    const partial = containerResults().filter((r) => r.tool_id !== 'capa');
    const r = await materializeCanonicalReport(baseInput({ container_results: partial }));
    expect(r.status).toBe('MATERIALIZED');
    if (r.status !== 'MATERIALIZED') return;
    expect(r.summary.tool_status.capa).toBe('NO_CONTAINER_RESULT');
    // P0 regression lock #2: a missing container record is NOT_RUN — its own
    // verbatim status, never collapsed into UNAVAILABLE (which would falsely
    // claim the analysis plane itself reported the tool unavailable).
    expect(r.tool_results.find((t) => t.tool_id === 'capa')!.status).toBe('NO_CONTAINER_RESULT');
  });
});
