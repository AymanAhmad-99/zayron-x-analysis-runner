/**
 * M14.3.1 — Staging control-plane handler tests (deterministic mocks).
 *
 * Exercises the worker's dispatch/callback/job-status/reconciliation handlers
 * against an in-memory D1 mock. No network, no live GitHub credentials (§28).
 */
import { describe, it, expect } from 'bun:test';

import {
  handleCallback,
  handleJobStatus,
  reconcileStaleJobs,
  type Env,
} from '../../workers/malware-validation/src/index';

// ── In-memory D1 mock ────────────────────────────────────────────

type Row = Record<string, unknown>;

function makeEnv(): { env: Env; tables: Map<string, Map<string, Row>> } {
  const jobs = new Map<string, Row>();
  const env: Env = {
    DB: {
      prepare(sql: string) {
        return {
          bind(...args: unknown[]) {
            return {
              async all<T>(): Promise<{ results: T[] }> {
                if (sql.includes("status = 'DISPATCHED'") || sql.includes("status IN ('DISPATCHED','RUNNING')")) {
                  return { results: [...jobs.values()].filter((j) => j.status === 'DISPATCHED') as T[] };
                }
                if (sql.includes('workflow_run_id IS NOT NULL')) {
                  const rows = [...jobs.values()]
                    .filter((j) => j.workflow_run_id)
                    .map((j) => ({ job_id: j.job_id, workflow_run_id: j.workflow_run_id }));
                  return { results: rows as T[] };
                }
                return { results: [] };
              },
              async first<T>(): Promise<T | null> {
                if (sql.includes('WHERE job_id = ?')) {
                  const id = args[0] as string;
                  return (jobs.get(id) as T) ?? null;
                }
                return null;
              },
              async all<T>(): Promise<{ results: T[] }> {
                if (sql.includes("status = 'DISPATCHED'") || sql.includes("status IN ('DISPATCHED','RUNNING')")) {
                  return { results: [...jobs.values()].filter((j) => j.status === 'DISPATCHED') as T[] };
                }
                if (sql.includes('workflow_run_id IS NOT NULL')) {
                  const rows = [...jobs.values()]
                    .filter((j) => j.workflow_run_id)
                    .map((j) => ({ job_id: j.job_id, workflow_run_id: j.workflow_run_id }));
                  return { results: rows as T[] };
                }
                return { results: [] };
              },
              async run(): Promise<unknown> {
                if (sql.startsWith('INSERT INTO malware_validation_jobs')) {
                  jobs.set(args[0] as string, {
                    job_id: args[0], analysis_run_id: args[1], artifact_id: args[2],
                    sha256: args[3], status: args[4], workflow_run_id: args[5],
                    created_at: args[6], updated_at: args[7], dispatched_at: args[8],
                    dispatch_deadline_epoch: args[9], toolchain_version: args[10],
                  });
                } else if (sql.startsWith('UPDATE malware_validation_jobs SET status')) {
                  const job = jobs.get(args[args.length - 1] as string);
                  if (job) {
                    if (sql.includes("status = 'EXECUTION_UNAVAILABLE'")) job.status = 'EXECUTION_UNAVAILABLE';
                    else if (sql.includes('results_json')) {
                      job.status = args[0]; job.workflow_run_id = args[1] ?? job.workflow_run_id;
                      job.updated_at = args[2]; job.results_json = args[3];
                    } else if (sql.includes('dispatched_at = ?')) {
                      job.status = 'DISPATCHED'; job.dispatched_at = args[0];
                      job.updated_at = args[1];
                      if (args[2]) job.workflow_run_id = args[2];
                    } else {
                      job.status = args[0]; job.updated_at = args[1];
                    }
                  }
                }
                return {};
              },
            };
          },
        };
      },
      all<T>(): Promise<{ results: T[] }> { return Promise.resolve({ results: [] as T[] }); },
      exec(): Promise<unknown> { return Promise.resolve({}); },
    },
    GITHUB_APP_ID: 'app_test',
    GITHUB_APP_INSTALLATION_ID: 'inst_test',
    GITHUB_APP_PRIVATE_KEY: '-----BEGIN PRIVATE KEY-----\nTEST\n-----END PRIVATE KEY-----',
    ANALYSIS_CALLBACK_SECRET: 'holdout-secret',
    STAGING_CALLBACK_BASE_URL: 'https://staging.test',
    STAGING_ARTIFACT_BASE_URL: 'https://staging.test',
    // M14.3.2: callback auth is now GitHub OIDC. The test verifier accepts a
    // well-formed v1.<exp>.<mac> token as a stand-in OIDC identity and enforces
    // the same expiry semantics (expired → expired=true → rejected).
    __TEST_VERIFY_OIDC: (async (token: string) => {
      const parts = token.split('.');
      if (parts.length !== 3 || parts[0] !== 'v1') return { valid: false, code: 'malformed_jwt' };
      const exp = Number(parts[1]);
      if (!Number.isFinite(exp)) return { valid: false, code: 'malformed_jwt' };
      if (exp <= Math.floor(Date.now() / 1000)) return { valid: false, code: 'expired' };
      return { valid: true, claims: { run_id: 'wfr_h_111', repository: 'r', workflow: 'w' } };
    }) as never,
  };
  return { env, tables: new Map([['malware_validation_jobs', jobs]]) };
}

function jobReq(over: Record<string, unknown> = {}): Request {
  const body = {
    job_id: 'job_h_001',
    analysis_run_id: 'ar_h_001',
    artifact_id: 'art_h_001',
    sha256: 'c'.repeat(64),
    sample_locator: 'https://r2.test/signed/holdout',
    toolchain_version: 'toolchain-1.0.0',
    ...over,
  };
  return new Request('https://staging.test/internal/analysis/github/dispatch', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

// Mint a token via the worker's own scheme (mirror of the HMAC construction).
async function mintToken(env: Env, job: Record<string, unknown>, expiresAt: number): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw', new TextEncoder().encode(env.ANALYSIS_CALLBACK_SECRET), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
  );
  const msg = `${job.job_id}|${job.analysis_run_id}|${job.artifact_id}|${job.sha256}|${expiresAt}`;
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(msg));
  const mac = Array.from(new Uint8Array(sig), (b) => b.toString(16).padStart(2, '0')).join('');
  return `v1.${expiresAt}.${mac}`;
}

function cbReq(job: Record<string, unknown>, token: string, over: Record<string, unknown> = {}): Request {
  const payload = {
    job_id: job.job_id,
    analysis_run_id: job.analysis_run_id,
    artifact_id: job.artifact_id,
    expected_sha256: job.sha256,
    actual_sha256: job.sha256,
    workflow_run_id: 'wfr_h_111',
    repository: 'zayron-x-analysis-runner',
    commit_sha: 'b'.repeat(40),
    toolchain_version: 'toolchain-1.0.0',
    status: 'SUCCEEDED',
    results: { tools: [{ tool: 'lief', status: 'OBSERVED' }] },
    ...over,
  };
  return new Request('https://staging.test/internal/analysis/github/callback', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
}

// ── Tests ────────────────────────────────────────────────────────

describe('M14.3.1 control-plane handlers (mocked D1)', () => {
  it('callback: token minted by dispatch verifies and completes the job end-to-end', async () => {
    const { env, tables } = makeEnv();
    // Seed a DISPATCHED job (as handleDispatch leaves it).
    const job = {
      job_id: 'job_h_002', analysis_run_id: 'ar_h_002', artifact_id: 'art_h_002',
      sha256: 'd'.repeat(64), status: 'DISPATCHED', workflow_run_id: null,
      created_at: 't', updated_at: 't', dispatched_at: 't',
      dispatch_deadline_epoch: null, toolchain_version: 'toolchain-1.0.0',
    };
    tables.get('malware_validation_jobs')!.set(job.job_id, job);

    const token = await mintToken(env, job, Math.floor(Date.now() / 1000) + 600);
    const res = await handleCallback(cbReq(job, token), env);
    expect(res.status).toBe(200);
    const body = (await res.json()) as { status: string };
    expect(body.status).toBe('SUCCEEDED');

    // Idempotent replay of the same callback.
    const res2 = await handleCallback(cbReq(job, token), env);
    expect(res2.status).toBe(200);
  });

  it('callback: sha integrity mismatch is rejected and job is not completed', async () => {
    const { env, tables } = makeEnv();
    const job = {
      job_id: 'job_h_003', analysis_run_id: 'ar_h_003', artifact_id: 'art_h_003',
      sha256: 'e'.repeat(64), status: 'DISPATCHED', workflow_run_id: null,
      created_at: 't', updated_at: 't', dispatched_at: 't',
      dispatch_deadline_epoch: null, toolchain_version: 'toolchain-1.0.0',
    };
    tables.get('malware_validation_jobs')!.set(job.job_id, job);
    const token = await mintToken(env, job, Math.floor(Date.now() / 1000) + 600);
    const res = await handleCallback(cbReq(job, token, { actual_sha256: '9'.repeat(64) }), env);
    expect(res.status).toBe(409);
    const body = (await res.json()) as { code: string };
    expect(body.code).toBe('sha_integrity_failure');
    expect(job.status).toBe('DISPATCHED');
  });

  it('callback: expired token is rejected', async () => {
    const { env, tables } = makeEnv();
    const job = {
      job_id: 'job_h_004', analysis_run_id: 'ar_h_004', artifact_id: 'art_h_004',
      sha256: 'a'.repeat(64), status: 'DISPATCHED', workflow_run_id: null,
      created_at: 't', updated_at: 't', dispatched_at: 't',
      dispatch_deadline_epoch: null, toolchain_version: 'toolchain-1.0.0',
    };
    tables.get('malware_validation_jobs')!.set(job.job_id, job);
    const token = await mintToken(env, job, Math.floor(Date.now() / 1000) - 10);
    const res = await handleCallback(cbReq(job, token), env);
    // M14.3.2: expired identity → 401 unauthorized (auth layer, pre-decision).
    expect(res.status).toBe(401);
  });

  it('callback: forged identity (invalid signature structure) is rejected', async () => {
    const { env, tables } = makeEnv();
    const job = {
      job_id: 'job_h_005', analysis_run_id: 'ar_h_005', artifact_id: 'art_h_005',
      sha256: 'b'.repeat(64), status: 'DISPATCHED', workflow_run_id: null,
      created_at: 't', updated_at: 't', dispatched_at: 't',
      dispatch_deadline_epoch: null, toolchain_version: 'toolchain-1.0.0',
    };
    tables.get('malware_validation_jobs')!.set(job.job_id, job);
    // M14.3.2: forged OIDC token (garbage signature section) → 401.
    const token = `not.a.jwt`;
    const res = await handleCallback(cbReq(job, token), env);
    expect(res.status).toBe(401);
  });

  it('job status: known and unknown jobs', async () => {
    const { env, tables } = makeEnv();
    const job = { job_id: 'job_h_006', status: 'SUCCEEDED' };
    tables.get('malware_validation_jobs')!.set('job_h_006', job);
    const ok = await handleJobStatus(env, 'job_h_006');
    expect(ok.status).toBe(200);
    const missing = await handleJobStatus(env, 'job_nope');
    expect(missing.status).toBe(404);
  });

  it('reconciliation transitions stale DISPATCHED jobs, never to success', async () => {
    const { env, tables } = makeEnv();
    const stale = {
      job_id: 'job_stale', analysis_run_id: 'ar_s', artifact_id: 'art_s',
      sha256: 'f'.repeat(64), status: 'DISPATCHED', workflow_run_id: 'wfr_1',
      created_at: 't', updated_at: 't', dispatched_at: 't',
      dispatch_deadline_epoch: 100, toolchain_version: 'toolchain-1.0.0',
    };
    tables.get('malware_validation_jobs')!.set('job_stale', stale);
    const out = await reconcileStaleJobs(env);
    expect(out.transitions).toBe(1);
    expect(stale.status === 'TIMEOUT' || stale.status === 'EXECUTION_UNAVAILABLE').toBe(true);
  });
});
