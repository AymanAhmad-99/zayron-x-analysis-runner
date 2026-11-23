/**
 * M16.3.9 — CONTRACT A ENFORCEMENT (deterministic proof tests).
 *
 * The isolated validation plane is execution + authenticated result acceptance
 * ONLY. It must never read or write the canonical `malware_reports` store,
 * materialize a canonical report, or publish one. Non-validation keeps the
 * existing canonical materialization path byte-identical.
 *
 * No network, GitHub dispatch, D1/R2 mutation, or malware execution.
 */
import { describe, it, expect } from 'bun:test';

import {
  ALLOWED_VALIDATION_REF,
  EXPECTED_VALIDATION_COMMIT_SHA,
  handleCallback,
  handleIngest,
  handleRematerialize,
  type Env,
} from '../../workers/malware-validation/src/index';
import { GITHUB_MALWARE_FEED_SOURCE_ID } from '../../packages/intelligence/src/malware/canonical/githubMalwareFeedAdapter';
import type { OidcClaims } from '@zayron/intelligence/malware/canonical/executor/githubOidcBridge';

const RUN_ID = '4444444444';
const JOB_ID = 'job_m169_001';
const SAMPLE_SHA = 'a'.repeat(64);

interface JobRow extends Record<string, unknown> {
  job_id: string;
  analysis_run_id: string;
  artifact_id: string;
  sha256: string;
  status: string;
  workflow_run_id: string | null;
  created_at: string;
  updated_at: string;
  dispatched_at: string | null;
  dispatch_deadline_epoch: number | null;
  toolchain_version: string;
  results_json?: string | null;
}

interface IdentityRow {
  job_id: string;
  expected_ref: string;
  expected_commit_sha: string;
  created_at: string;
}

function makeJob(over: Partial<JobRow> = {}): JobRow {
  return {
    job_id: JOB_ID,
    analysis_run_id: 'ar_m169_001',
    artifact_id: 'art_m169_001',
    sha256: SAMPLE_SHA,
    status: 'DISPATCHED',
    workflow_run_id: RUN_ID,
    created_at: '2026-09-27T00:00:00.000Z',
    updated_at: '2026-09-27T00:00:00.000Z',
    dispatched_at: '2026-09-27T00:00:00.000Z',
    dispatch_deadline_epoch: null,
    toolchain_version: 'toolchain-1.0.0',
    ...over,
  };
}

const IDENTITY: IdentityRow = {
  job_id: JOB_ID,
  expected_ref: ALLOWED_VALIDATION_REF,
  expected_commit_sha: EXPECTED_VALIDATION_COMMIT_SHA,
  created_at: '2026-09-27T00:00:00.000Z',
};

interface MockCtx {
  env: Env;
  jobs: Map<string, JobRow>;
  malwareReportsAccesses: string[];
  bucketPuts: string[];
  jobInserts: string[];
}

/**
 * Minimal table-aware in-memory D1. Every statement that references the
 * canonical `malware_reports` store is recorded (and returns no row) so tests
 * can prove the validation plane never touches it.
 */
function makeEnv(opts: { validationMode?: boolean; job?: JobRow | null; identity?: IdentityRow | null } = {}): MockCtx {
  const jobs = new Map<string, JobRow>();
  if (opts.job !== null) jobs.set((opts.job ?? makeJob()).job_id, opts.job ?? makeJob());
  const identities = new Map<string, IdentityRow>();
  if (opts.identity !== null) {
    const identity = opts.identity ?? IDENTITY;
    identities.set(identity.job_id, identity);
  }
  const malwareReportsAccesses: string[] = [];
  const bucketPuts: string[] = [];
  const jobInserts: string[] = [];

  const env = {
    DB: {
      prepare(sql: string) {
        const first = (args: unknown[]): unknown => {
          if (/FROM malware_reports/.test(sql)) {
            malwareReportsAccesses.push(sql);
            return null;
          }
          if (/FROM malware_validation_identity WHERE job_id = \?/.test(sql)) {
            return identities.get(String(args[0])) ?? null;
          }
          if (/FROM malware_validation_jobs WHERE job_id = \?/.test(sql)) {
            return jobs.get(String(args[0])) ?? null;
          }
          if (/FROM malware_validation_jobs WHERE analysis_run_id = \?/.test(sql)) {
            return [...jobs.values()].find((j) => j.analysis_run_id === String(args[0])) ?? null;
          }
          return null;
        };
        const all = () => {
          if (/FROM malware_validation_jobs WHERE workflow_run_id IS NOT NULL/.test(sql)) {
            return { results: [...jobs.values()].filter((j) => j.workflow_run_id) };
          }
          return { results: [...jobs.values()] };
        };
        const run = (args: unknown[]) => {
          if (/INSERT INTO malware_validation_jobs/.test(sql)) {
            jobInserts.push(sql);
          }
          if (/UPDATE malware_validation_jobs/.test(sql)) {
            const job = jobs.get(String(args[args.length - 1]));
            if (job) {
              if (/results_json = \?/.test(sql)) {
                job.status = String(args[0]);
                job.workflow_run_id = (args[1] as string) ?? job.workflow_run_id;
                job.updated_at = String(args[2]);
                job.results_json = String(args[3]);
              } else if (/SET workflow_run_id = \?/.test(sql)) {
                job.workflow_run_id = String(args[0]);
              }
            }
          }
          return {};
        };
        return {
          bind: (...args: unknown[]) => ({
            first: async <T,>() => first(args) as unknown as T | null,
            all: async <T,>() => all() as unknown as { results: T[] },
            run: async () => run(args),
          }),
          all: async <T,>() => all() as unknown as { results: T[] },
        };
      },
      all: async <T,>() => ({ results: [] as T[] }),
      exec: async () => ({}),
    },
    GITHUB_APP_ID: 'app_test',
    GITHUB_APP_INSTALLATION_ID: 'inst_test',
    GITHUB_APP_PRIVATE_KEY: '-----BEGIN PRIVATE KEY-----\nTEST\n-----END PRIVATE KEY-----',
    ANALYSIS_CALLBACK_SECRET: 'holdout-secret-m169',
    STAGING_CALLBACK_BASE_URL: 'https://staging.test',
    STAGING_ARTIFACT_BASE_URL: 'https://staging.test',
    // A bucket whose head() resolves to null: a materialization attempt still
    // resolves the acquisition context to null and rejects explicitly, without
    // throwing, while letting tests assert that NO R2 write occurs.
    ARTIFACT_BUCKET: {
      put: async (key: string) => { bucketPuts.push(key); return {}; },
      head: async () => null,
      get: async () => null,
    },
    VALIDATION_MODE: opts.validationMode === false ? undefined : 'true',
    __TEST_VERIFY_OIDC: (async () => ({
      valid: true,
      claims: {
        run_id: RUN_ID,
        repository: 'AymanAhmad-99/zayron-x-analysis-runner',
        workflow: '.github/workflows/zayron-malware-validation.yml',
        ref: `refs/heads/${ALLOWED_VALIDATION_REF}`,
        sha: EXPECTED_VALIDATION_COMMIT_SHA,
        aud: 'zayron-x-analysis-validation',
      } as unknown as OidcClaims,
    })) as Env['__TEST_VERIFY_OIDC'],
  } as unknown as Env;
  return { env, jobs, malwareReportsAccesses, bucketPuts, jobInserts };
}

function callbackRequest(over: Record<string, unknown> = {}, job: JobRow = makeJob()): Request {
  const payload = {
    job_id: job.job_id,
    analysis_run_id: job.analysis_run_id,
    artifact_id: job.artifact_id,
    expected_sha256: job.sha256,
    actual_sha256: job.sha256,
    workflow_run_id: RUN_ID,
    repository: 'AymanAhmad-99/zayron-x-analysis-runner',
    commit_sha: EXPECTED_VALIDATION_COMMIT_SHA,
    toolchain_version: 'toolchain-1.0.0',
    status: 'SUCCEEDED',
    results: [{ tool: 'lief', status: 'OBSERVED', provenance: { runner_identity: 'gh-runner-1' } }],
    ...over,
  };
  return new Request('https://ctl.internal/internal/analysis/github/callback', {
    method: 'POST',
    headers: { Authorization: 'Bearer test-token', 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
}

// ── TEST A — validation success: accepted, persisted, NOT materialized ──

describe('M16.3.9 TEST A — validation-mode success callback does not materialize', () => {
  it('accepts the bound run, persists results + SUCCEEDED, and skips canonical publication', async () => {
    const ctx = makeEnv({ validationMode: true });
    const res = await handleCallback(callbackRequest(), ctx.env);
    expect(res.status).toBe(200);

    const body = (await res.json()) as { status: string; report_materialization: { status: string; reason?: string } };
    expect(body.status).toBe('SUCCEEDED');
    expect(body.report_materialization.status).toBe('NOT_ATTEMPTED');
    expect(body.report_materialization.reason).toBe('validation_plane_no_canonical_materialization');

    const job = ctx.jobs.get(JOB_ID)!;
    expect(job.status).toBe('SUCCEEDED');
    expect(typeof job.results_json).toBe('string');
    expect(job.results_json).toContain('lief');
    // Contract A: the canonical malware_reports store is never queried.
    expect(ctx.malwareReportsAccesses).toHaveLength(0);
  });

  it('is idempotent: a replay of the same completion returns already_accepted', async () => {
    const ctx = makeEnv({ validationMode: true });
    await handleCallback(callbackRequest(), ctx.env);
    const replay = await handleCallback(callbackRequest(), ctx.env);
    expect(replay.status).toBe(200);
    expect(((await replay.json()) as { status: string }).status).toBe('already_accepted');
  });
});

// ── TEST B — non-validation success: materialization still attempted ──

describe('M16.3.9 TEST B — non-validation-mode success callback still materializes', () => {
  it('attempts canonical materialization through the existing path', async () => {
    const ctx = makeEnv({ validationMode: false, identity: null });
    const res = await handleCallback(callbackRequest(), ctx.env);
    expect(res.status).toBe(200);

    const body = (await res.json()) as { status: string; report_materialization: { status: string; code?: string } };
    expect(body.status).toBe('SUCCEEDED');
    // The materializer ran (not skipped): with no acquisition context available
    // it rejects explicitly rather than reporting NOT_ATTEMPTED.
    expect(body.report_materialization.status).toBe('REJECTED');
    expect(body.report_materialization.code).toBe('acquisition_context_missing');
    // Proof the canonical store was reached by the non-validation path.
    expect(ctx.malwareReportsAccesses.length).toBeGreaterThan(0);
    expect(ctx.jobs.get(JOB_ID)!.status).toBe('SUCCEEDED');
  });
});

// ── TEST C — validation rematerialize is refused before any canonical access ──

async function hmacHex(secret: string, msg: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(msg));
  return Array.from(new Uint8Array(sig), (b) => b.toString(16).padStart(2, '0')).join('');
}

async function rematerializeRequest(env: Env, jobId: string): Promise<Request> {
  const raw = JSON.stringify({ job_id: jobId });
  const ts = String(Date.now());
  const sig = await hmacHex(env.ANALYSIS_CALLBACK_SECRET, `${ts}.${raw}`);
  return new Request('https://ctl.internal/internal/analysis/rematerialize', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-ZX-Ingest-Timestamp': ts, 'X-ZX-Ingest-Signature': sig },
    body: raw,
  });
}

describe('M16.3.9 TEST C — validation-mode rematerialize never reaches canonical publication', () => {
  it('fails closed with an explicit rejection and no malware_reports access', async () => {
    const succeeded = makeJob({ status: 'SUCCEEDED', results_json: '[{"tool":"lief","status":"OBSERVED"}]' });
    const ctx = makeEnv({ validationMode: true, job: succeeded });
    const res = await handleRematerialize(await rematerializeRequest(ctx.env, JOB_ID), ctx.env);
    expect(res.status).toBe(409);
    const body = (await res.json()) as { error: string; code: string };
    expect(body.error).toBe('rematerialization_rejected');
    expect(body.code).toBe('validation_plane_no_canonical_materialization');
    expect(ctx.malwareReportsAccesses).toHaveLength(0);
    // The job row is read-only here: status/results are untouched.
    expect(ctx.jobs.get(JOB_ID)!.status).toBe('SUCCEEDED');
  });

  it('non-validation rematerialize is unchanged (reaches the canonical path)', async () => {
    const succeeded = makeJob({ status: 'SUCCEEDED', results_json: '[{"tool":"lief","status":"OBSERVED"}]' });
    const ctx = makeEnv({ validationMode: false, job: succeeded, identity: null });
    const res = await handleRematerialize(await rematerializeRequest(ctx.env, JOB_ID), ctx.env);
    // With no acquisition context it rejects via the materializer's own contract,
    // which proves the canonical path was actually entered.
    expect(res.status).toBe(409);
    const body = (await res.json()) as { code: string };
    expect(body.code).toBe('acquisition_context_missing');
    expect(ctx.malwareReportsAccesses.length).toBeGreaterThan(0);
  });
});

// ── TEST D — failure callback semantics unchanged ──

describe('M16.3.9 TEST D — failure callback semantics unchanged', () => {
  it('a well-formed FAILED callback sets the job FAILED and returns 200 (validation mode)', async () => {
    const ctx = makeEnv({ validationMode: true });
    const res = await handleCallback(callbackRequest({ status: 'FAILED' }), ctx.env);
    expect(res.status).toBe(200);
    expect(((await res.json()) as { status: string }).status).toBe('FAILED');
    expect(ctx.jobs.get(JOB_ID)!.status).toBe('FAILED');
    // A failure carries no tool evidence: materialization is not attempted.
    expect(ctx.malwareReportsAccesses).toHaveLength(0);
  });

  it('the runner failure payload form (actual_sha256=UNKNOWN) is rejected exactly as before', async () => {
    const ctx = makeEnv({ validationMode: true });
    const res = await handleCallback(
      callbackRequest({ status: 'FAILED', actual_sha256: 'UNKNOWN' }),
      ctx.env
    );
    expect(res.status).toBe(409);
    expect(((await res.json()) as { code: string }).code).toBe('sha_integrity_failure');
    expect(ctx.jobs.get(JOB_ID)!.status).toBe('DISPATCHED');
  });

  it('failure after an accepted success is rejected and the job stays SUCCEEDED', async () => {
    const ctx = makeEnv({ validationMode: true });
    await handleCallback(callbackRequest(), ctx.env);
    const res = await handleCallback(callbackRequest({ status: 'FAILED' }), ctx.env);
    expect(res.status).toBe(409);
    expect(((await res.json()) as { code: string }).code).toBe('job_already_completed');
    expect(ctx.jobs.get(JOB_ID)!.status).toBe('SUCCEEDED');
  });
});

// ── TEST E — validation ingest fails closed before any acquisition/canonical access ──

async function ingestRequest(env: Env): Promise<Request> {
  const raw = JSON.stringify({ source_id: GITHUB_MALWARE_FEED_SOURCE_ID });
  const ts = String(Date.now());
  const sig = await hmacHex(env.ANALYSIS_CALLBACK_SECRET, `${ts}.${raw}`);
  return new Request('https://ctl.internal/internal/analysis/github/ingest', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-ZX-Ingest-Timestamp': ts, 'X-ZX-Ingest-Signature': sig },
    body: raw,
  });
}

describe('M16.3.9 TEST E — validation-mode ingest is refused before acquisition', () => {
  it('rejects a valid authenticated ingest request with zero canonical or acquisition access', async () => {
    const ctx = makeEnv({ validationMode: true });
    let fetchCount = 0;
    const realFetch = globalThis.fetch;
    globalThis.fetch = (async (...args: Parameters<typeof fetch>) => {
      fetchCount += 1;
      return realFetch(...args);
    }) as typeof fetch;
    try {
      const res = await handleIngest(await ingestRequest(ctx.env), ctx.env);
      expect(res.status).toBe(409);
      const body = (await res.json()) as { error: string; code: string };
      expect(body.error).toBe('ingest_rejected');
      expect(body.code).toBe('validation_plane_no_acquisition');
      // Contract A: no canonical store access, no R2 write, no job insert, no
      // GitHub feed enumeration.
      expect(ctx.malwareReportsAccesses).toHaveLength(0);
      expect(ctx.bucketPuts).toHaveLength(0);
      expect(ctx.jobInserts).toHaveLength(0);
      expect(fetchCount).toBe(0);
    } finally {
      globalThis.fetch = realFetch;
    }
  });
});
