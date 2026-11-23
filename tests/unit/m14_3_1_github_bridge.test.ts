/**
 * M14.3.1 — Deterministic tests: GitHub dispatch adapter, callback replay
 * protection, reconciliation, security invariants, and provenance correction.
 *
 * Spec §28/§29: no live GitHub credentials; deterministic mocks only.
 * Synthetic fixtures, novel holdout identities; no real sample anchors.
 */
import { describe, it, expect } from 'bun:test';

import {
  APPROVED_TOOLS,
  RUNNER_REPOSITORY,
  RUNNER_WORKFLOW,
  decideDispatch,
  decideCallback,
  reconcileJobs,
  mapWorkflowOutcomeToJobStatus,
  type BridgeJobRecord,
  type AnalysisCallbackPayload,
  type GitHubDispatchClient,
  type WorkflowDispatchRequest,
  type WorkflowRunResolution,
} from '../../packages/intelligence/src/malware/canonical/executor/githubValidationBridge';

// ── Fixture factory (novel holdout identities) ───────────────────

function makeJob(overrides: Partial<BridgeJobRecord> = {}): BridgeJobRecord {
  return {
    job_id: 'job_holdout_0001',
    analysis_run_id: 'ar_holdout_m1431_001',
    artifact_id: 'art_holdout_m1431_001',
    sha256: 'a'.repeat(64),
    status: 'QUEUED',
    workflow_run_id: null,
    created_at: '2026-09-21T00:00:00.000Z',
    updated_at: '2026-09-21T00:00:00.000Z',
    dispatched_at: null,
    dispatch_deadline_epoch: 1700 + 900,
    toolchain_version: 'toolchain-1.0.0',
    ...overrides,
  };
}

function makeCallback(job: BridgeJobRecord, overrides: Partial<AnalysisCallbackPayload> = {}): AnalysisCallbackPayload {
  return {
    job_id: job.job_id,
    analysis_run_id: job.analysis_run_id,
    artifact_id: job.artifact_id,
    expected_sha256: job.sha256,
    actual_sha256: job.sha256,
    workflow_run_id: 'wfr_holdout_9001',
    repository: RUNNER_REPOSITORY,
    commit_sha: 'c'.repeat(40),
    toolchain_version: 'toolchain-1.0.0',
    status: 'SUCCEEDED',
    results: { tools: [] },
    ...overrides,
  };
}

const VALID_TOKEN = { valid: true, expired: false, bound_job_id: 'job_holdout_0001' };

// ── Dispatch decision gate (§22/§24/§26) ─────────────────────────

describe('M14.3.1 dispatch decision', () => {
  it('dispatches a valid QUEUED job', () => {
    const job = makeJob();
    const d = decideDispatch({
      job, sha256: job.sha256, toolchain_version: 'toolchain-1.0.0',
      sample_locator_present: true, callback_url_present: true, callback_token_present: true,
      token_expires_at_epoch: 1700 + 600, now_epoch: 1700,
    });
    expect(d).toEqual({ action: 'dispatch' });
  });

  it('rejects unknown job', () => {
    const d = decideDispatch({
      job: null, sha256: 'a'.repeat(64), toolchain_version: 'toolchain-1.0.0',
      sample_locator_present: true, callback_url_present: true, callback_token_present: true,
      token_expires_at_epoch: 1700 + 600, now_epoch: 1700,
    });
    expect(d).toEqual({ action: 'reject', code: 'job_not_found' });
  });

  it('rejects duplicate dispatch (already DISPATCHED)', () => {
    const job = makeJob({ status: 'DISPATCHED' });
    const d = decideDispatch({
      job, sha256: job.sha256, toolchain_version: 'toolchain-1.0.0',
      sample_locator_present: true, callback_url_present: true, callback_token_present: true,
      token_expires_at_epoch: 1700 + 600, now_epoch: 1700,
    });
    expect(d).toEqual({ action: 'reject', code: 'job_already_dispatched' });
  });

  it('rejects terminal-state job re-dispatch', () => {
    const job = makeJob({ status: 'SUCCEEDED' });
    const d = decideDispatch({
      job, sha256: job.sha256, toolchain_version: 'toolchain-1.0.0',
      sample_locator_present: true, callback_url_present: true, callback_token_present: true,
      token_expires_at_epoch: 1700 + 600, now_epoch: 1700,
    });
    expect(d).toEqual({ action: 'reject', code: 'job_terminal_state' });
  });

  it('rejects missing/invalid sha256', () => {
    const job = makeJob();
    const d = decideDispatch({
      job, sha256: 'not-a-sha', toolchain_version: 'toolchain-1.0.0',
      sample_locator_present: true, callback_url_present: true, callback_token_present: true,
      token_expires_at_epoch: 1700 + 600, now_epoch: 1700,
    });
    expect(d).toEqual({ action: 'reject', code: 'missing_sha256' });
  });

  it('rejects invalid toolchain version', () => {
    const job = makeJob();
    const d = decideDispatch({
      job, sha256: job.sha256, toolchain_version: 'toolchain-9.9.9-UNAPPROVED',
      sample_locator_present: true, callback_url_present: true, callback_token_present: true,
      token_expires_at_epoch: 1700 + 600, now_epoch: 1700,
    });
    expect(d).toEqual({ action: 'reject', code: 'invalid_toolchain' });
  });

  it('rejects expired GitHub installation token', () => {
    const job = makeJob();
    const d = decideDispatch({
      job, sha256: job.sha256, toolchain_version: 'toolchain-1.0.0',
      sample_locator_present: true, callback_url_present: true, callback_token_present: true,
      token_expires_at_epoch: 1699, now_epoch: 1700,
    });
    expect(d).toEqual({ action: 'reject', code: 'token_expired' });
  });

  it('rejects missing callback token transport', () => {
    const job = makeJob();
    const d = decideDispatch({
      job, sha256: job.sha256, toolchain_version: 'toolchain-1.0.0',
      sample_locator_present: true, callback_url_present: true, callback_token_present: false,
      token_expires_at_epoch: 1700 + 600, now_epoch: 1700,
    });
    expect(d).toEqual({ action: 'reject', code: 'missing_callback_token' });
  });
});

// ── Callback + replay protection (§22) ───────────────────────────

describe('M14.3.1 callback replay protection', () => {
  it('accepts a first valid callback for a DISPATCHED job', () => {
    const job = makeJob({ status: 'DISPATCHED', dispatch_deadline_epoch: null });
    const d = decideCallback(makeCallback(job), job, new Map(), VALID_TOKEN);
    expect(d).toEqual({ action: 'accept', next_status: 'SUCCEEDED' });
  });

  it('rejects analysis_run_id mismatch', () => {
    const job = makeJob({ status: 'DISPATCHED', dispatch_deadline_epoch: null });
    const cb = makeCallback(job, { analysis_run_id: 'ar_OTHER' });
    const d = decideCallback(cb, job, new Map(), VALID_TOKEN);
    expect(d).toEqual({ action: 'reject', code: 'analysis_run_mismatch' });
  });

  it('rejects artifact_id mismatch', () => {
    const job = makeJob({ status: 'DISPATCHED', dispatch_deadline_epoch: null });
    const cb = makeCallback(job, { artifact_id: 'art_OTHER' });
    const d = decideCallback(cb, job, new Map(), VALID_TOKEN);
    expect(d).toEqual({ action: 'reject', code: 'artifact_mismatch' });
  });

  it('rejects sha256 integrity failure (analyzed bytes differ)', () => {
    const job = makeJob({ status: 'DISPATCHED', dispatch_deadline_epoch: null });
    const cb = makeCallback(job, { actual_sha256: 'b'.repeat(64) });
    const d = decideCallback(cb, job, new Map(), VALID_TOKEN);
    expect(d).toEqual({ action: 'reject', code: 'sha_integrity_failure' });
  });

  it('rejects workflow_run replay owned by a different job', () => {
    const job = makeJob({ status: 'DISPATCHED', dispatch_deadline_epoch: null });
    const known = new Map([['wfr_holdout_9001', 'job_OTHER']]);
    const d = decideCallback(makeCallback(job), job, known, VALID_TOKEN);
    expect(d).toEqual({ action: 'reject', code: 'workflow_run_replay' });
  });

  it('rejects re-completion of an already completed job (different run)', () => {
    const job = makeJob({ status: 'SUCCEEDED', workflow_run_id: 'wfr_holdout_9001' });
    const cb = makeCallback(job, { workflow_run_id: 'wfr_holdout_9999' });
    const d = decideCallback(cb, job, new Map(), VALID_TOKEN);
    expect(d).toEqual({ action: 'reject', code: 'job_already_completed' });
  });

  it('is idempotent for the exact same accepted completion', () => {
    const job = makeJob({ status: 'SUCCEEDED', workflow_run_id: 'wfr_holdout_9001' });
    const d = decideCallback(makeCallback(job), job, new Map(), VALID_TOKEN);
    expect(d).toEqual({ action: 'idempotent_accept' });
  });

  it('rejects expired callback token', () => {
    const job = makeJob({ status: 'DISPATCHED', dispatch_deadline_epoch: null });
    const d = decideCallback(makeCallback(job), job, new Map(), { ...VALID_TOKEN, expired: true });
    expect(d).toEqual({ action: 'reject', code: 'token_expired' });
  });

  it('rejects invalid callback token', () => {
    const job = makeJob({ status: 'DISPATCHED', dispatch_deadline_epoch: null });
    const d = decideCallback(makeCallback(job), job, new Map(), { ...VALID_TOKEN, valid: false });
    expect(d).toEqual({ action: 'reject', code: 'token_invalid' });
  });

  it('rejects token bound to a different job', () => {
    const job = makeJob({ status: 'DISPATCHED', dispatch_deadline_epoch: null });
    const d = decideCallback(makeCallback(job), job, new Map(), { ...VALID_TOKEN, bound_job_id: 'job_OTHER' });
    expect(d).toEqual({ action: 'reject', code: 'token_invalid' });
  });

  it('rejects callback for unknown job', () => {
    const cb = makeCallback(makeJob());
    const d = decideCallback(cb, null, new Map(), VALID_TOKEN);
    expect(d).toEqual({ action: 'reject', code: 'job_not_found' });
  });
});

// ── Reconciliation (§25) + timeout mapping (§24) ─────────────────

describe('M14.3.1 reconciliation', () => {
  it('maps stale DISPATCHED job with confirmed run to TIMEOUT', () => {
    const job = makeJob({ status: 'DISPATCHED', workflow_run_id: 'wfr_1', dispatch_deadline_epoch: 1700 });
    expect(reconcileJobs([job], 1701)).toEqual([
      { job_id: job.job_id, from: 'DISPATCHED', to: 'TIMEOUT', reason: 'dispatch_deadline_exceeded' },
    ]);
  });

  it('maps stale DISPATCHED job without run confirmation to EXECUTION_UNAVAILABLE', () => {
    const job = makeJob({ status: 'DISPATCHED', workflow_run_id: null, dispatch_deadline_epoch: 1700 });
    expect(reconcileJobs([job], 1701)).toEqual([
      { job_id: job.job_id, from: 'DISPATCHED', to: 'EXECUTION_UNAVAILABLE', reason: 'dispatch_never_confirmed' },
    ]);
  });

  it('leaves jobs within deadline and terminal jobs untouched', () => {
    const open = makeJob({ status: 'DISPATCHED', dispatch_deadline_epoch: 2000, workflow_run_id: 'wfr_1' });
    const done = makeJob({ status: 'SUCCEEDED' });
    expect(reconcileJobs([open, done], 1700)).toEqual([]);
  });
});

describe('M14.3.1 workflow outcome mapping (§24)', () => {
  it('maps workflow timeout to TIMEOUT — never SUCCESS/NO_RESULT/CLEAN', () => {
    expect(mapWorkflowOutcomeToJobStatus('timed_out')).toBe('TIMEOUT');
    expect(mapWorkflowOutcomeToJobStatus('timed_out')).not.toBe('SUCCEEDED');
  });
  it('maps success/failure/cancel deterministically', () => {
    expect(mapWorkflowOutcomeToJobStatus('success')).toBe('SUCCEEDED');
    expect(mapWorkflowOutcomeToJobStatus('failure')).toBe('FAILED');
    expect(mapWorkflowOutcomeToJobStatus('cancelled')).toBe('FAILED');
    expect(mapWorkflowOutcomeToJobStatus('startup_failure')).toBe('EXECUTION_UNAVAILABLE');
  });
});

// ── Dispatch client behavior (deterministic mock, §28) ───────────

describe('M14.3.1 dispatch client (mocked)', () => {
  function makeClient(opts: { ok: boolean; runId?: string }): GitHubDispatchClient & { calls: Array<[string, string, string, WorkflowDispatchRequest]> } {
    const calls: Array<[string, string, string, WorkflowDispatchRequest]> = [];
    return {
      calls,
      async dispatchWorkflow(repo, workflow, ref, req) {
        calls.push([repo, workflow, ref, req]);
        return opts.ok ? { dispatched: true, workflow_run_id: opts.runId ?? null, error_code: null } : { dispatched: false, workflow_run_id: null, error_code: 'http_403' };
      },
      async getWorkflowRunId(repo, workflow, jobId): Promise<WorkflowRunResolution> {
        // M14.3.5: deterministic resolution contract (pending | resolved | ambiguous).
        return opts.runId ? { status: 'resolved', run_id: opts.runId } : { status: 'pending' };
      },
    };
  }

  it('issues dispatch against the dedicated runner repo/workflow with the fixed tool set context', async () => {
    const client = makeClient({ ok: true, runId: 'wfr_holdout_9001' });
    const job = makeJob();
    // M14.3.6 §1: dispatch carries EXACTLY the five non-sensitive inputs.
    const req: WorkflowDispatchRequest = {
      job_id: job.job_id, analysis_run_id: job.analysis_run_id, artifact_id: job.artifact_id,
      sha256: job.sha256, toolchain_version: 'toolchain-1.0.0',
    };
    const res = await client.dispatchWorkflow(RUNNER_REPOSITORY, RUNNER_WORKFLOW, 'main', req);
    expect(res.dispatched).toBe(true);
    expect(res.workflow_run_id).toBe('wfr_holdout_9001');
    expect(client.calls[0][0]).toBe(RUNNER_REPOSITORY);
    expect(client.calls[0][1]).toBe(RUNNER_WORKFLOW);
    expect(APPROVED_TOOLS).toEqual(['lief', 'floss', 'die', 'yara-x', 'capa']);
  });

  it('reports dispatch rejection without fabricating a run id', async () => {
    const client = makeClient({ ok: false });
    const res = await client.dispatchWorkflow(RUNNER_REPOSITORY, RUNNER_WORKFLOW, 'main', {
      job_id: 'j', analysis_run_id: 'a', artifact_id: 'x', sha256: 'a'.repeat(64),
      toolchain_version: 'toolchain-1.0.0',
    });
    expect(res.dispatched).toBe(false);
    expect(res.workflow_run_id).toBeNull();
    expect(res.error_code).toBe('http_403');
  });
});
