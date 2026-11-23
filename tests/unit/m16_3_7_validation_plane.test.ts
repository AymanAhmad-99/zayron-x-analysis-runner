/**
 * M16.3.7 — ISOLATED MALWARE VALIDATION PLANE (deterministic proof tests).
 *
 * Proves the architectural isolation controls WITHOUT executing anything:
 *   §5  VALIDATION_MODE environment gating (production unchanged)
 *   §6  D1 isolation (validation database ≠ production database)
 *   §7  R2 isolation (validation bucket ≠ production bucket)
 *   §8  dispatch authentication (fail-closed, constant-time)
 *   §9  ref allowlist (single constant ref; no request-controlled ref)
 *   §10/§11 job identity binding (expected ref + commit SHA)
 *   §12/§14 OIDC VALUE comparison of run_id / ref / sha
 *   §13 artifact-release gate (no validation R2 read when identity mismatches)
 *
 * No network, no GitHub dispatch, no malware execution.
 */
import { describe, it, expect } from 'bun:test';
import { readFileSync } from 'node:fs';

import {
  ALLOWED_VALIDATION_REF,
  EXPECTED_VALIDATION_COMMIT_SHA,
  VALIDATION_IDENTITY_TABLE_DDL,
  authenticateDispatchRequest,
  handleArtifactRequest,
  handleDispatch,
  isValidationMode,
  resolveDispatchRef,
  validationBindingMismatch,
  type Env,
  type R2Bucket,
} from '../../workers/malware-validation/src/index';
import type { OidcClaims } from '@zayron/intelligence/malware/canonical/executor/githubOidcBridge';

const WRANGLER = readFileSync('workers/malware-validation/wrangler.toml', 'utf8');
const MIGRATION = readFileSync('workers/malware-validation/migrations/0001_validation_plane.sql', 'utf8');

const PRODUCTION_D1_ID = 'c19c8f45-801b-4034-bd76-402e5e5389b5';
const PRODUCTION_R2_BUCKET = 'zayron-x-storage';
const VALIDATION_D1_ID = '985bfcf9-9745-40d3-bd34-379ea00e4778';
const VALIDATION_R2_BUCKET = 'zayron-x-malware-validation-storage';
const VALIDATION_DISPATCH_SECRET = 'v'.repeat(48);

// ── §5/§6/§7 — configuration isolation (static, read-only) ───────────

describe('M16.3.7 — configuration isolation', () => {
  it('declares a distinct [env.validation] environment with VALIDATION_MODE=true', () => {
    expect(WRANGLER).toContain('[env.validation]');
    expect(WRANGLER).toContain('VALIDATION_MODE = "true"');
  });

  it('§6 — binds a dedicated validation D1 whose id differs from production', () => {
    expect(WRANGLER).toContain(VALIDATION_D1_ID);
    expect(PRODUCTION_D1_ID).not.toBe(VALIDATION_D1_ID);
    // The validation D1 id appears after the validation env header, and the
    // production id is not redeclared inside the validation block.
    const block = WRANGLER.split('[env.validation]')[1] ?? '';
    expect(block).toContain(VALIDATION_D1_ID);
    expect(block).not.toContain(PRODUCTION_D1_ID);
  });

  it('§7 — binds a dedicated validation R2 whose bucket differs from production', () => {
    expect(WRANGLER).toContain(VALIDATION_R2_BUCKET);
    expect(PRODUCTION_R2_BUCKET).not.toBe(VALIDATION_R2_BUCKET);
    const block = WRANGLER.split('[env.validation]')[1] ?? '';
    expect(block).toContain(VALIDATION_R2_BUCKET);
  });

  it('§11 — the validation-only migration creates the identity table and never targets production', () => {
    expect(MIGRATION).toContain('malware_validation_identity');
    expect(MIGRATION).toContain('expected_ref');
    expect(MIGRATION).toContain('expected_commit_sha');
    expect(MIGRATION).toContain(VALIDATION_D1_ID);
    expect(MIGRATION).toContain('NEVER applied to the production database');
    expect(MIGRATION).not.toContain(PRODUCTION_D1_ID);
  });

  it('§9/§10 — the allowlisted ref and expected commit are fixed constants', () => {
    expect(ALLOWED_VALIDATION_REF).toBe('m16-3-1-bounded-diagnostics-sync');
    // PIN ACKNOWLEDGMENT (Phase 12.27): re-pointed from M16.4.29 (5ceb3232, capa
    // 9.4.0 adapter repair) to the M16.6 D1 runner head (9e08b6a, vendored capa
    // FLIRT signatures). Verified 2026-10-16: 5ceb3232 is an ancestor of the live
    // runner branch head m16-3-1-bounded-diagnostics-sync @ 9e08b6a, and the
    // implementation pin already equals that head — so this update ratifies the
    // current live state rather than changing it. Any future pin move must
    // update this expectation in the same change (that is this test's purpose).
    expect(EXPECTED_VALIDATION_COMMIT_SHA).toBe('9e08b6a412f6bddf7de2418038669ef849ad0351');
    expect(ALLOWED_VALIDATION_REF).not.toContain('*');
    expect(VALIDATION_IDENTITY_TABLE_DDL).toContain('malware_validation_identity');
  });
});

// ── Deterministic fixtures ───────────────────────────────────────────

const FIXED_NOW = Date.now();
const RUN_ID = '3333333333';
const JOB_ID = 'job_val_001';
const SAMPLE_SHA = 'b'.repeat(64);

function claims(overrides: Partial<OidcClaims> = {}): OidcClaims {
  return {
    iss: 'https://token.actions.githubusercontent.com',
    aud: 'zayron-x-analysis-validation',
    exp: Math.floor(FIXED_NOW / 1000) + 600,
    iat: Math.floor(FIXED_NOW / 1000) - 10,
    jti: 'jti-val',
    repository: 'AymanAhmad-99/zayron-x-analysis-runner',
    repository_owner: 'AymanAhmad-99',
    workflow: '.github/workflows/zayron-malware-validation.yml',
    workflow_ref: 'AymanAhmad-99/zayron-x-analysis-runner@refs/heads/m16-3-1-bounded-diagnostics-sync',
    ref: `refs/heads/${ALLOWED_VALIDATION_REF}`,
    ref_type: 'branch',
    run_id: RUN_ID,
    run_attempt: '1',
    sha: EXPECTED_VALIDATION_COMMIT_SHA,
    repository_visibility: 'public',
    event: 'workflow_dispatch',
    actor: 'AymanAhmad-99',
    ...overrides,
  };
}

interface JobRow {
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

function makeJob(overrides: Partial<JobRow> = {}): JobRow {
  return {
    job_id: JOB_ID,
    analysis_run_id: 'ar_val_001',
    artifact_id: 'art_val_001',
    sha256: SAMPLE_SHA,
    status: 'DISPATCHED',
    workflow_run_id: RUN_ID,
    created_at: new Date(FIXED_NOW - 60_000).toISOString(),
    updated_at: new Date(FIXED_NOW - 60_000).toISOString(),
    dispatched_at: new Date(FIXED_NOW - 60_000).toISOString(),
    dispatch_deadline_epoch: Math.floor(FIXED_NOW / 1000) + 900,
    toolchain_version: 'toolchain-1.0.0',
    ...overrides,
  };
}

interface IdentityRow {
  job_id: string;
  expected_ref: string;
  expected_commit_sha: string;
  created_at: string;
}

/** Minimal table-aware in-memory D1 supporting exactly the statements used. */
function makeDb(jobs: JobRow[] = [], identities: IdentityRow[] = []) {
  const jobsById = new Map(jobs.map((j) => [j.job_id, j]));
  const identityById = new Map(identities.map((i) => [i.job_id, i]));

  function prepare(sql: string) {
    const run = (params: unknown[]) => {
      if (/INSERT OR IGNORE INTO malware_validation_identity/.test(sql)) {
        const jobId = String(params[0]);
        if (!identityById.has(jobId)) {
          identityById.set(jobId, {
            job_id: jobId,
            expected_ref: String(params[1]),
            expected_commit_sha: String(params[2]),
            created_at: String(params[3]),
          });
        }
        return {};
      }
      if (/INSERT INTO malware_validation_jobs/.test(sql)) {
        const jobId = String(params[0]);
        if (!jobsById.has(jobId)) {
          jobsById.set(jobId, {
            job_id: jobId,
            analysis_run_id: String(params[1]),
            artifact_id: String(params[2]),
            sha256: String(params[3]),
            status: String(params[4]),
            workflow_run_id: params[5] === null ? null : String(params[5]),
            created_at: String(params[6]),
            updated_at: String(params[7]),
            dispatched_at: params[8] === null ? null : String(params[8]),
            dispatch_deadline_epoch: params[9] === null ? null : Number(params[9]),
            toolchain_version: String(params[10]),
          });
        }
        return {};
      }
      if (/UPDATE malware_validation_jobs/.test(sql)) {
        const jobId = String(params[params.length - 1]);
        const job = jobsById.get(jobId);
        if (job) {
          if (/SET status = \?/.test(sql)) job.status = String(params[0]);
          if (/SET workflow_run_id = \?/.test(sql)) job.workflow_run_id = String(params[0]);
        }
        return {};
      }
      return {};
    };
    const first = (params: unknown[]) => {
      if (/FROM malware_validation_identity WHERE job_id = \?/.test(sql)) {
        return identityById.get(String(params[0])) ?? null;
      }
      if (/FROM malware_validation_jobs WHERE job_id = \?/.test(sql)) {
        return jobsById.get(String(params[0])) ?? null;
      }
      if (/FROM malware_validation_jobs WHERE analysis_run_id = \?/.test(sql)) {
        return [...jobsById.values()].find((j) => j.analysis_run_id === String(params[0])) ?? null;
      }
      return null;
    };
    const all = () => (
      /FROM malware_validation_jobs WHERE workflow_run_id IS NOT NULL/.test(sql)
        ? { results: [...jobsById.values()].filter((j) => j.workflow_run_id !== null) }
        : { results: [...jobsById.values()] }
    );
    return {
      bind: (...args: unknown[]) => ({
        first: async <T,>() => first(args) as unknown as T | null,
        all: async <T,>() => all() as unknown as { results: T[] },
        run: async () => run(args),
      }),
      all: async <T,>() => all() as unknown as { results: T[] },
    };
  }

  return {
    prepare,
    all: async <T,>() => ({ results: [...jobsById.values()] as unknown as T[] }),
    exec: async () => ({}),
  };
}

interface DispatchRecord {
  repo: string;
  workflow: string;
  ref: string;
  inputs: Record<string, string>;
}

function makeEnv(
  opts: {
    jobs?: JobRow[];
    identities?: IdentityRow[];
    validationMode?: boolean;
    dispatchToken?: string;
    productionSecret?: string;
    verify?: (token: string) => Promise<{ valid: true; claims: OidcClaims } | { valid: false; code: string }>;
    bucket?: R2Bucket;
    dispatched?: DispatchRecord[];
  } = {}
): Env {
  const dispatched = opts.dispatched ?? [];
  return {
    DB: makeDb(opts.jobs ?? [], opts.identities ?? []) as unknown as Env['DB'],
    GITHUB_APP_ID: '',
    GITHUB_APP_INSTALLATION_ID: '',
    GITHUB_APP_PRIVATE_KEY: '',
    ANALYSIS_CALLBACK_SECRET: 'x',
    STAGING_CALLBACK_BASE_URL: 'https://example.invalid',
    STAGING_ARTIFACT_BASE_URL: 'https://example.invalid',
    ARTIFACT_BUCKET: opts.bucket,
    VALIDATION_MODE: opts.validationMode === false ? undefined : 'true',
    VALIDATION_DISPATCH_TOKEN: opts.dispatchToken,
    DISPATCH_SHARED_SECRET: opts.productionSecret,
    __TEST_DISPATCH_CLIENT: {
      async dispatchWorkflow(repo, workflowFile, ref, req) {
        dispatched.push({ repo, workflow: workflowFile, ref, inputs: req as unknown as Record<string, string> });
        return { dispatched: true, workflow_run_id: RUN_ID, error_code: null };
      },
      async getWorkflowRunId() {
        return { status: 'resolved' as const, run_id: RUN_ID };
      },
    },
    __TEST_VERIFY_OIDC:
      opts.verify ?? (async () => ({ valid: true, claims: claims() })),
  };
}

function dispatchRequest(headers: Record<string, string> = {}): Request {
  return new Request('https://internal.zayron-x.invalid/internal/analysis/github/dispatch', {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...headers },
    body: JSON.stringify({
      job_id: JOB_ID,
      analysis_run_id: 'ar_val_001',
      artifact_id: 'art_val_001',
      sha256: SAMPLE_SHA,
      toolchain_version: 'toolchain-1.0.0',
    }),
  });
}

// ── §5 — environment gating ──────────────────────────────────────────

describe('M16.3.7 — run-mode gating', () => {
  it('production mode (no VALIDATION_MODE) is not the validation plane', () => {
    const env = makeEnv({ validationMode: false });
    expect(isValidationMode(env)).toBe(false);
    expect(resolveDispatchRef(env)).toBe('main');
  });

  it('validation mode resolves the ONE allowlisted ref', () => {
    const env = makeEnv();
    expect(isValidationMode(env)).toBe(true);
    expect(resolveDispatchRef(env)).toBe(ALLOWED_VALIDATION_REF);
  });
});

// ── §8 — dispatch authentication ─────────────────────────────────────

describe('M16.3.7 — dispatch authentication', () => {
  it('validation mode without a configured secret fails closed (503)', async () => {
    const verdict = authenticateDispatchRequest(dispatchRequest(), makeEnv());
    expect(verdict.ok).toBe(false);
    if (!verdict.ok) expect(verdict.response.status).toBe(503);
  });

  it('validation mode with a wrong token is rejected (401)', () => {
    const env = makeEnv({ dispatchToken: VALIDATION_DISPATCH_SECRET });
    const verdict = authenticateDispatchRequest(dispatchRequest({ Authorization: 'Bearer nope' }), env);
    expect(verdict.ok).toBe(false);
    if (!verdict.ok) expect(verdict.response.status).toBe(401);
  });

  it('validation mode with the exact secret is accepted', () => {
    const env = makeEnv({ dispatchToken: VALIDATION_DISPATCH_SECRET });
    const verdict = authenticateDispatchRequest(
      dispatchRequest({ Authorization: `Bearer ${VALIDATION_DISPATCH_SECRET}` }),
      env
    );
    expect(verdict.ok).toBe(true);
  });

  it('production mode now REQUIRES a bearer secret (Wave 4A fail-closed)', () => {
    // Unconfigured secret ⇒ 503, never anonymous dispatch.
    const unconfigured = authenticateDispatchRequest(dispatchRequest(), makeEnv({ validationMode: false }));
    expect(unconfigured.ok).toBe(false);
    if (!unconfigured.ok) expect(unconfigured.response.status).toBe(503);

    const env = makeEnv({ validationMode: false, productionSecret: 'wave4a-dispatch-secret-0123456789abcdef' });
    // No credential ⇒ 401.
    const anonymous = authenticateDispatchRequest(dispatchRequest(), env);
    expect(anonymous.ok).toBe(false);
    if (!anonymous.ok) expect(anonymous.response.status).toBe(401);
    // Correct bearer ⇒ accepted.
    const authenticated = authenticateDispatchRequest(
      dispatchRequest({ Authorization: 'Bearer wave4a-dispatch-secret-0123456789abcdef' }),
      env
    );
    expect(authenticated.ok).toBe(true);
  });

  it('handleDispatch REJECTS an unauthenticated validation request (no dispatch occurs)', async () => {
    const dispatched: DispatchRecord[] = [];
    const env = makeEnv({ dispatchToken: VALIDATION_DISPATCH_SECRET, dispatched });
    const res = await handleDispatch(dispatchRequest(), env);
    expect(res.status).toBe(401);
    expect(dispatched).toHaveLength(0);
  });

  it('handleDispatch dispatches to the allowlisted ref and binds identity', async () => {
    const dispatched: DispatchRecord[] = [];
    const env = makeEnv({ dispatchToken: VALIDATION_DISPATCH_SECRET, dispatched });
    const res = await handleDispatch(
      dispatchRequest({ Authorization: `Bearer ${VALIDATION_DISPATCH_SECRET}` }),
      env
    );
    expect(res.status).toBe(200);
    expect(dispatched).toHaveLength(1);
    expect(dispatched[0].ref).toBe(ALLOWED_VALIDATION_REF);
    const identity = await (env.DB as unknown as {
      prepare: (s: string) => { bind: (...a: unknown[]) => { first: <T>() => Promise<T | null> } };
    })
      .prepare('SELECT job_id, expected_ref, expected_commit_sha, created_at FROM malware_validation_identity WHERE job_id = ?')
      .bind(JOB_ID)
      .first<IdentityRow>();
    expect(identity?.expected_ref).toBe(ALLOWED_VALIDATION_REF);
    expect(identity?.expected_commit_sha).toBe(EXPECTED_VALIDATION_COMMIT_SHA);
  });
});

// ── §12/§14 — OIDC value comparison ──────────────────────────────────

describe('M16.3.7 — OIDC identity VALUE comparison', () => {
  const identity: IdentityRow = {
    job_id: JOB_ID,
    expected_ref: ALLOWED_VALIDATION_REF,
    expected_commit_sha: EXPECTED_VALIDATION_COMMIT_SHA,
    created_at: new Date().toISOString(),
  };

  it('accepts the exact bound identity', () => {
    expect(validationBindingMismatch(claims(), identity, { workflow_run_id: RUN_ID })).toBeNull();
  });

  it('rejects the right repository/workflow on the WRONG branch', () => {
    expect(
      validationBindingMismatch(claims({ ref: 'refs/heads/main' }), identity, { workflow_run_id: RUN_ID })
    ).toBe('ref_mismatch');
  });

  it('rejects the right branch with the WRONG commit SHA', () => {
    expect(
      validationBindingMismatch(claims({ sha: 'c'.repeat(40) }), identity, { workflow_run_id: RUN_ID })
    ).toBe('commit_mismatch');
  });

  it('rejects a mismatched run_id', () => {
    expect(
      validationBindingMismatch(claims({ run_id: '9999999999' }), identity, { workflow_run_id: RUN_ID })
    ).toBe('run_id_mismatch');
  });

  it('fails closed when the run id is not yet bound', () => {
    expect(validationBindingMismatch(claims(), identity, { workflow_run_id: null })).toBe('run_id_unbound');
  });

  it('production (no identity row) is unaffected', () => {
    expect(validationBindingMismatch(claims({ ref: 'refs/heads/main', sha: 'd'.repeat(40) }), null, null)).toBeNull();
  });
});

// ── §13 — artifact-release gate ──────────────────────────────────────

describe('M16.3.7 — artifact release gate', () => {
  it('a token with a wrong ref never triggers a validation R2 read', async () => {
    let bucketReads = 0;
    const bucket: R2Bucket = {
      async get() {
        bucketReads += 1;
        return { body: new ReadableStream({ start(c) { c.enqueue(new Uint8Array([1])); c.close(); } }), size: 1 };
      },
      async head() {
        return null;
      },
      async put() {
        return {};
      },
    };
    const env = makeEnv({
      jobs: [makeJob()],
      identities: [
        {
          job_id: JOB_ID,
          expected_ref: ALLOWED_VALIDATION_REF,
          expected_commit_sha: EXPECTED_VALIDATION_COMMIT_SHA,
          created_at: new Date().toISOString(),
        },
      ],
      bucket,
      verify: async () => ({ valid: true, claims: claims({ ref: 'refs/heads/main' }) }),
    });
    const res = await handleArtifactRequest(
      new Request(`https://internal.zayron-x.invalid/internal/analysis/github/artifact?job_id=${JOB_ID}`, {
        headers: { Authorization: 'Bearer token' },
      }),
      env
    );
    expect(res.status).toBe(409);
    expect(bucketReads).toBe(0);
    const body = (await res.json()) as { code?: string };
    expect(body.code).toBe('ref_mismatch');
  });

  it('the exact bound identity releases the artifact', async () => {
    const bucket: R2Bucket = {
      async get() {
        return { body: new ReadableStream({ start(c) { c.enqueue(new Uint8Array([1, 2, 3])); c.close(); } }), size: 3 };
      },
      async head() {
        return null;
      },
      async put() {
        return {};
      },
    };
    const env = makeEnv({
      jobs: [makeJob()],
      identities: [
        {
          job_id: JOB_ID,
          expected_ref: ALLOWED_VALIDATION_REF,
          expected_commit_sha: EXPECTED_VALIDATION_COMMIT_SHA,
          created_at: new Date().toISOString(),
        },
      ],
      bucket,
    });
    const res = await handleArtifactRequest(
      new Request(`https://internal.zayron-x.invalid/internal/analysis/github/artifact?job_id=${JOB_ID}`, {
        headers: { Authorization: 'Bearer token' },
      }),
      env
    );
    expect(res.status).toBe(200);
  });
});
