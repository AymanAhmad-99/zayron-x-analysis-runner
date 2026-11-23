/**
 * Control-plane autonomy tests (deterministic; no network, no GitHub creds).
 *
 * Covers the repaired lifecycle: JOB CREATED → AUTOMATIC DISPATCH → RUN →
 * CALLBACK → CANONICAL REPORT, including idempotency and bounded recovery:
 *
 *  1. a created-but-never-dispatched job is dispatched automatically
 *  2. duplicate dispatch of the same job is idempotent (no second workflow run)
 *  3. a replayed successful callback creates no second canonical result
 *  4. a bounded transient dispatch failure never duplicates reports
 *  5. a stale job always reaches a terminal state (never stuck QUEUED/RUNNING)
 *  6. a permanent validation failure is never retried
 */
import { describe, it, expect } from 'bun:test';

import worker, {
  AUTO_DISPATCH_MAX_ATTEMPTS,
  UNDISPATCHED_GRACE_MS,
  autoDispatchOrphanedJobs,
  handleDispatch,
  handleCallback,
  reconcileStaleJobs,
  type Env,
} from '../../workers/malware-validation/src/index';
import { decideCallback } from '../../packages/intelligence/src/malware/canonical/executor/githubValidationBridge';

type Row = Record<string, unknown>;

const RUN_ID = 'ar-p7-0001';
const OTHER_RUN_ID = 'ar-p7-0002';
const JOB_ID = 'job-p7-0001';
const ARTIFACT_ID = 'art_gmf_test_p7';
const SHA = 'a'.repeat(64);
const RUN_NAME = 'wfr_h_111';

const iso = (offsetSeconds: number) => new Date(Date.now() + offsetSeconds * 1000).toISOString();
const epoch = (offsetSeconds: number) => Math.floor(Date.now() / 1000) + offsetSeconds;

interface FakeClient {
  readonly calls: Record<string, unknown>[];
  dispatchWorkflow(): Promise<{ dispatched: boolean; workflow_run_id?: string; error_code?: string }>;
  getWorkflowRunId(): Promise<{ status: string; run_id?: string; run_ids?: string[] }>;
}

function fakeClient(outcome: 'ok' | 'transient_failure' = 'ok'): FakeClient {
  const calls: Record<string, unknown>[] = [];
  return {
    calls,
    async dispatchWorkflow() {
      calls.push({ at: new Date().toISOString() });
      return outcome === 'ok'
        ? { dispatched: true, workflow_run_id: RUN_NAME }
        : { dispatched: false, error_code: 'server_error' };
    },
    async getWorkflowRunId() {
      return { status: 'resolved', run_id: RUN_NAME };
    },
  };
}

/** Minimal in-memory D1 mock covering the SQL shapes the control plane uses. */
function makeEnv(client: FakeClient) {
  const jobs = new Map<string, Row>();
  let writes = 0;
  const prepare = (sql: string) => ({
    bind: (...args: unknown[]) => ({
      async all() {
        if (sql.includes("status IN ('DISPATCHED','RUNNING')")) {
          return {
            results: [...jobs.values()].filter((j) => j.status === 'DISPATCHED' || j.status === 'RUNNING'),
          };
        }
        if (sql.includes("status IN ('QUEUED','EXECUTION_UNAVAILABLE')")) {
          return {
            results: [...jobs.values()].filter(
              (j) => (j.status === 'QUEUED' || j.status === 'EXECUTION_UNAVAILABLE') && j.dispatched_at === null
            ),
          };
        }
        if (sql.includes('workflow_run_id IS NOT NULL')) {
          return {
            results: [...jobs.values()]
              .filter((j) => j.workflow_run_id)
              .map((j) => ({ job_id: j.job_id, workflow_run_id: j.workflow_run_id })),
          };
        }
        return { results: [] };
      },
      async first() {
        if (sql.includes('WHERE analysis_run_id = ?')) {
          return [...jobs.values()].find((j) => j.analysis_run_id === args[0]) ?? null;
        }
        if (sql.includes('WHERE job_id = ?')) return jobs.get(String(args[0])) ?? null;
        return null;
      },
      async run() {
        writes += 1;
        if (sql.startsWith('INSERT INTO malware_validation_jobs')) {
          jobs.set(String(args[0]), {
            job_id: args[0], analysis_run_id: args[1], artifact_id: args[2], sha256: args[3],
            status: args[4], workflow_run_id: args[5], created_at: args[6], updated_at: args[7],
            dispatched_at: args[8], dispatch_deadline_epoch: args[9], toolchain_version: args[10],
          });
          return {};
        }
        const job = jobs.get(String(args[args.length - 1])) ?? null;
        if (!job) return {};
        if (sql.includes("SET status = 'DISPATCHED'")) {
          job.status = 'DISPATCHED';
          job.dispatched_at = args[0];
          job.updated_at = args[1];
          if (args[2]) job.workflow_run_id = args[2];
        } else if (sql.includes("SET status = 'EXECUTION_UNAVAILABLE'")) {
          job.status = 'EXECUTION_UNAVAILABLE';
          job.updated_at = args[0];
        } else if (sql.includes("SET status = 'QUEUED'")) {
          job.status = 'QUEUED';
          job.updated_at = args[0];
        } else if (sql.includes('SET dispatch_deadline_epoch = ?')) {
          job.dispatch_deadline_epoch = args[0];
          job.updated_at = args[1];
        } else if (sql.includes('SET workflow_run_id = ?')) {
          job.workflow_run_id = args[0];
          job.updated_at = args[1];
        } else if (sql.includes('results_json')) {
          job.status = args[0];
          job.workflow_run_id = args[1] ?? job.workflow_run_id;
          job.updated_at = args[2];
          job.results_json = args[3];
        } else if (sql.includes('SET status = ?')) {
          job.status = args[0];
          job.updated_at = args[1];
        }
        return {};
      },
    }),
  });
  const env = {
    DB: { prepare },
    GITHUB_APP_ID: 'app_test',
    GITHUB_APP_INSTALLATION_ID: 'inst_test',
    GITHUB_APP_PRIVATE_KEY: 'test-key',
    ANALYSIS_CALLBACK_SECRET: 'test-secret',
    DISPATCH_SHARED_SECRET: 'wave4a-dispatch-secret-0123456789abcdef',
    STAGING_CALLBACK_BASE_URL: 'https://staging.test',
    STAGING_ARTIFACT_BASE_URL: 'https://staging.test',
    __TEST_DISPATCH_CLIENT: client,
    __TEST_VERIFY_OIDC: async () => ({
      valid: true,
      claims: {
        run_id: RUN_NAME,
        repository: 'AymanAhmad-99/zayron-x-analysis-runner',
        workflow: '.github/workflows/zayron-malware-validation.yml',
      },
    }),
  } as unknown as Env;
  return { env, jobs, writes: () => writes };
}

function seed(jobs: Map<string, Row>, over: Row = {}): Row {
  const row: Row = {
    job_id: JOB_ID,
    analysis_run_id: RUN_ID,
    artifact_id: ARTIFACT_ID,
    sha256: SHA,
    status: 'QUEUED',
    workflow_run_id: null,
    created_at: iso(-600),
    updated_at: iso(-600),
    dispatched_at: null,
    dispatch_deadline_epoch: epoch(300),
    toolchain_version: 'toolchain-1.0.0',
    ...over,
  };
  jobs.set(String(row.job_id), row);
  return row;
}

function dispatchRequest(jobId = JOB_ID, runId = RUN_ID) {
  return new Request('https://internal.test/internal/analysis/github/dispatch', {
    method: 'POST',
    headers: { 'content-type': 'application/json', Authorization: 'Bearer wave4a-dispatch-secret-0123456789abcdef' },
    body: JSON.stringify({
      job_id: jobId,
      analysis_run_id: runId,
      artifact_id: ARTIFACT_ID,
      sha256: SHA,
      toolchain_version: 'toolchain-1.0.0',
    }),
  });
}

function callbackRequest(status = 'SUCCEEDED') {
  return new Request('https://internal.test/internal/analysis/github/callback', {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: 'Bearer v1.9999999999.mac' },
    body: JSON.stringify({
      job_id: JOB_ID,
      analysis_run_id: RUN_ID,
      artifact_id: ARTIFACT_ID,
      expected_sha256: SHA,
      actual_sha256: SHA,
      workflow_run_id: RUN_NAME,
      repository: 'AymanAhmad-99/zayron-x-analysis-runner',
      commit_sha: null,
      toolchain_version: 'toolchain-1.0.0',
      status,
      results: { ok: true },
    }),
  });
}

describe('control plane — automatic dispatch', () => {
  it('1. a created-but-never-dispatched job is dispatched automatically by the cron sweep', async () => {
    const client = fakeClient();
    const { env, jobs } = makeEnv(client);
    seed(jobs, { status: 'QUEUED', dispatched_at: null, workflow_run_id: null });

    // The existing scheduled() entrypoint is the only trigger.
    await worker.scheduled({} as never, env);

    expect(client.calls.length).toBe(1);
    expect(jobs.get(JOB_ID)!.status).toBe('DISPATCHED');
    expect(jobs.get(JOB_ID)!.workflow_run_id).toBe(RUN_NAME);
    expect(jobs.get(JOB_ID)!.dispatched_at).not.toBeNull();
  });

  it('2. duplicate dispatch of the same job is idempotent — no second workflow run', async () => {
    const client = fakeClient();
    const { env, jobs } = makeEnv(client);
    seed(jobs, { status: 'QUEUED', dispatched_at: null, workflow_run_id: null });

    const first = await handleDispatch(dispatchRequest(), env);
    expect(first.status).toBe(200);
    expect(client.calls.length).toBe(1);

    // Same canonical identity again: rejected, GitHub untouched.
    const second = await handleDispatch(dispatchRequest(), env);
    expect(second.status).toBe(409);
    expect((await second.json() as { code: string }).code).toBe('job_already_dispatched');
    expect(client.calls.length).toBe(1);

    // The sweep must not re-dispatch a job that already reached GitHub either.
    await autoDispatchOrphanedJobs(env);
    expect(client.calls.length).toBe(1);
    expect(jobs.get(JOB_ID)!.status).toBe('DISPATCHED');
  });

  it('3. a replayed successful callback is accepted once and creates no second canonical result', async () => {
    const { env, jobs, writes } = makeEnv(fakeClient());
    const recorded = seed(jobs, {
      status: 'SUCCEEDED',
      workflow_run_id: RUN_NAME,
      dispatched_at: iso(-590),
      results_json: JSON.stringify({ ok: true }),
    });

    // The canonical replay decision owns "one canonical result per run".
    const decision = decideCallback(
      {
        job_id: JOB_ID, analysis_run_id: RUN_ID, artifact_id: ARTIFACT_ID,
        expected_sha256: SHA, actual_sha256: SHA, workflow_run_id: RUN_NAME,
        repository: 'AymanAhmad-99/zayron-x-analysis-runner', commit_sha: null,
        toolchain_version: 'toolchain-1.0.0', status: 'SUCCEEDED', results: { ok: true },
      } as never,
      recorded as never,
      new Map([[RUN_NAME, JOB_ID]]),
      { valid: true, expired: false, bound_job_id: JOB_ID }
    );
    expect(decision.action).toBe('idempotent_accept');

    // And the handler short-circuits: no write, no materialization.
    const writesBefore = writes();
    const response = await handleCallback(callbackRequest(), env);
    expect(response.status).toBe(200);
    expect((await response.json() as { status: string }).status).toBe('already_accepted');
    expect(writes()).toBe(writesBefore);
    expect(jobs.get(JOB_ID)!.results_json).toBe(recorded.results_json);
  });
});

describe('control plane — bounded recovery', () => {
  it('4. a transient dispatch failure is retried at most once and never duplicates a report', async () => {
    const client = fakeClient('transient_failure');
    const { env, jobs, writes } = makeEnv(client);
    seed(jobs, { status: 'QUEUED', dispatched_at: null, workflow_run_id: null });

    // Attempt 1 (automatic): GitHub dispatch fails → never-dispatched state.
    await autoDispatchOrphanedJobs(env);
    expect(client.calls.length).toBe(1);
    expect(jobs.get(JOB_ID)!.status).toBe('EXECUTION_UNAVAILABLE');
    expect(jobs.get(JOB_ID)!.dispatched_at).toBeNull();

    // Immediate second tick: inside the grace period → no racing retry.
    await autoDispatchOrphanedJobs(env);
    expect(client.calls.length).toBe(1);

    // Bounded retry once the grace period has elapsed and the window is still open.
    jobs.get(JOB_ID)!.updated_at = iso(-2 * (UNDISPATCHED_GRACE_MS / 1000) - 1);
    await autoDispatchOrphanedJobs(env);
    expect(client.calls.length).toBe(2);
    expect(jobs.get(JOB_ID)!.status).toBe('EXECUTION_UNAVAILABLE');

    // Deadline passed → terminal, and no further attempt is ever made. The
    // already-terminal row is never re-written (no repeated transition events).
    jobs.get(JOB_ID)!.updated_at = iso(-600);
    jobs.get(JOB_ID)!.dispatch_deadline_epoch = epoch(-1);
    const writesBefore = writes();
    const sweep = await autoDispatchOrphanedJobs(env);
    expect(sweep).toEqual({ attempted: 0, terminalized: 0 });
    expect(writes()).toBe(writesBefore);
    expect(jobs.get(JOB_ID)!.status).toBe('EXECUTION_UNAVAILABLE');
    await autoDispatchOrphanedJobs(env);
    expect(client.calls.length).toBe(2);

    // Bound is fixed and small, and no report can exist without a callback.
    expect(AUTO_DISPATCH_MAX_ATTEMPTS).toBe(1);
  });

  it('5. stale jobs always reach a terminal state — never stuck QUEUED or RUNNING', async () => {
    const client = fakeClient();
    const { env, jobs } = makeEnv(client);
    // A healthy run in flight: its bound is the workflow's timeout-minutes.
    seed(jobs, { job_id: 'job-running', status: 'RUNNING', workflow_run_id: 'wfr_live', dispatched_at: iso(-1200), dispatch_deadline_epoch: epoch(-1) });
    // An incoherent RUNNING row with no bound run could never otherwise terminate.
    seed(jobs, { job_id: 'job-running-unbound', analysis_run_id: 'ar-p7-0003', status: 'RUNNING', workflow_run_id: null, dispatched_at: null, dispatch_deadline_epoch: epoch(-1) });
    seed(jobs, { job_id: 'job-dispatched', analysis_run_id: 'ar-p7-0004', status: 'DISPATCHED', workflow_run_id: 'wfr_bound', dispatched_at: iso(-1200), dispatch_deadline_epoch: epoch(-1) });
    // Created but abandoned before GitHub ever saw it.
    seed(jobs, { job_id: 'job-abandoned', analysis_run_id: OTHER_RUN_ID, status: 'QUEUED', dispatched_at: null, workflow_run_id: null, dispatch_deadline_epoch: epoch(-1) });

    const swept = await reconcileStaleJobs(env);
    expect(swept.transitions).toBe(2);
    expect(jobs.get('job-dispatched')!.status).toBe('TIMEOUT');
    expect(jobs.get('job-running-unbound')!.status).toBe('EXECUTION_UNAVAILABLE');
    expect(jobs.get('job-running')!.status).toBe('RUNNING');

    const recovered = await autoDispatchOrphanedJobs(env);
    expect(recovered).toEqual({ attempted: 0, terminalized: 1 });
    expect(jobs.get('job-abandoned')!.status).toBe('EXECUTION_UNAVAILABLE');

    // Every job is terminal, or an in-flight run bounded by the workflow itself.
    for (const row of jobs.values()) {
      expect(['RUNNING', 'TIMEOUT', 'EXECUTION_UNAVAILABLE']).toContain(String(row.status));
    }
    await worker.scheduled({} as never, env);
    expect(client.calls.length).toBe(0);
    expect(jobs.get('job-running')!.status).toBe('RUNNING');
  });

  it('6. a permanent validation failure is never retried', async () => {
    const client = fakeClient();
    const { env, jobs } = makeEnv(client);
    seed(jobs, { job_id: 'job-rejected', status: 'REJECTED', workflow_run_id: null, dispatched_at: null, dispatch_deadline_epoch: epoch(300) });
    seed(jobs, { job_id: 'job-failed', analysis_run_id: OTHER_RUN_ID, status: 'FAILED', workflow_run_id: 'wfr_failed', dispatched_at: iso(-600), dispatch_deadline_epoch: epoch(300) });

    const swept = await reconcileStaleJobs(env);
    const recovered = await autoDispatchOrphanedJobs(env);
    await worker.scheduled({} as never, env);

    expect(swept.transitions).toBe(0);
    expect(recovered).toEqual({ attempted: 0, terminalized: 0 });
    expect(client.calls.length).toBe(0);
    expect(jobs.get('job-rejected')!.status).toBe('REJECTED');
    expect(jobs.get('job-failed')!.status).toBe('FAILED');
  });
});
