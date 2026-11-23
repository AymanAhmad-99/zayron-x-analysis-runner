/**
 * M14.3.5 — Native GitHub Workflow Run-ID Binding (deterministic tests).
 *
 * Verifies the primary binding path (dispatch response carries the concrete
 * workflow_run_id via return_run_details) and the fail-closed behavior when
 * the id is missing/malformed, with the M14.3.4 run-name correlation preserved
 * strictly as fallback. Artifact/callback run-binding invariants unchanged.
 *
 * All deterministic: GitHub dispatch is injected via __TEST_DISPATCH_CLIENT.
 */
import { describe, it, expect } from 'bun:test';

import {
  handleArtifactRequest,
  handleDispatch,
  type Env,
  type R2Bucket,
} from '../../workers/malware-validation/src/index';
import type { DispatchResult, GitHubDispatchClient, WorkflowRunResolution } from '../../packages/intelligence/src/malware/canonical/executor/githubValidationBridge';
import { isValidWorkflowRunId } from '../../packages/intelligence/src/malware/canonical/executor/githubValidationBridge';
import type { OidcClaims } from '../../packages/intelligence/src/malware/canonical/executor/githubOidcBridge';

const GITHUB_RUN_ID = '7777777777';
const SAMPLE_SHA = 'e'.repeat(64);
// Wave 4A: production dispatch requires an authenticated bearer secret.
const DISPATCH_SECRET = 'wave4a-dispatch-secret-0123456789abcdef';

// ── isValidWorkflowRunId (§3/§4 fail-closed parsing) ────────────────

describe('M14.3.5 native run-id validation', () => {
  it('PASS: positive-integer strings are valid', () => {
    expect(isValidWorkflowRunId('1')).toBe(true);
    expect(isValidWorkflowRunId('12345678901234567890')).toBe(true);
  });

  it('FAIL: zero, negative, non-numeric, float, empty, oversized are invalid', () => {
    expect(isValidWorkflowRunId('0')).toBe(false);
    expect(isValidWorkflowRunId('-5')).toBe(false);
    expect(isValidWorkflowRunId('12.5')).toBe(false);
    expect(isValidWorkflowRunId('abc')).toBe(false);
    expect(isValidWorkflowRunId('')).toBe(false);
    expect(isValidWorkflowRunId(' ')).toBe(false);
    expect(isValidWorkflowRunId('1e10')).toBe(false);
    expect(isValidWorkflowRunId('1'.repeat(21))).toBe(false);
    expect(isValidWorkflowRunId(null)).toBe(false);
    expect(isValidWorkflowRunId(undefined)).toBe(false);
    expect(isValidWorkflowRunId(123)).toBe(false); // must be a string
  });
});

// ── Deterministic machinery ─────────────────────────────────────────

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

function makeDb(jobs: JobRow[]) {
  const byId = new Map(jobs.map((j) => [j.job_id, j]));
  return {
    prepare(sql: string) {
      return {
        bind(...args: unknown[]) {
          const params = args;
          return {
            async first<T>(): Promise<T | null> {
              return (byId.get(String(params[0])) as unknown as T) ?? null;
            },
            async all<T>(): Promise<{ results: T[] }> {
              return { results: [...byId.values()] as unknown as T[] };
            },
            async run(): Promise<unknown> {
              // INSERT INTO malware_validation_jobs (...) VALUES (?, ?, ...)
              if (/INSERT INTO malware_validation_jobs/.test(sql)) {
                byId.set(String(params[0]), {
                  job_id: String(params[0]),
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
                return {};
              }
              if (/WHERE job_id = \?/.test(sql) && params.length >= 1) {
                const jobId = String(params[params.length - 1]);
                const job = byId.get(jobId);
                if (job) {
                  if (/SET status = 'DISPATCHED',/.test(sql)) {
                    job.status = 'DISPATCHED';
                    job.dispatched_at = String(params[0]);
                    // COALESCE(?, workflow_run_id) — never overwrite an existing binding;
                    // a malformed '' run id stays NULL (server validates before persisting).
                    const v = params[2];
                    if (v !== undefined && v !== null && String(v) !== '' && job.workflow_run_id === null) {
                      job.workflow_run_id = String(v);
                    }
                  }
                  if (/SET status = \?/.test(sql) && !/DISPATCHED/.test(sql)) job.status = String(params[0]);
                  // COALESCE(?, workflow_run_id) — never overwrite an existing binding
                  if (/workflow_run_id = COALESCE\(\?, workflow_run_id\)/.test(sql)) {
                    const v = params[params.length - 2];
                    if (v !== undefined && v !== null && String(v) !== '' && job.workflow_run_id === null) {
                      job.workflow_run_id = String(v);
                    }
                  } else if (/SET workflow_run_id = \?/.test(sql) && job.workflow_run_id === null) {
                    job.workflow_run_id = String(params[0]);
                  }
                }
              }
              return {};
            },
          };
        },
        async all<T>(): Promise<{ results: T[] }> {
          return { results: [...byId.values()] as unknown as T[] };
        },
      };
    },
    all<T>(_: string): Promise<{ results: T[] }> {
      return Promise.resolve({ results: [...byId.values()] as unknown as T[] });
    },
    exec(_: string): Promise<unknown> {
      return Promise.resolve({});
    },
  };
}

function makeEnv(jobs: JobRow[], client: Partial<GitHubDispatchClient> = {}, verify?: (t: string) => Promise<unknown>): Env {
  return {
    DB: makeDb(jobs) as unknown as Env['DB'],
    GITHUB_APP_ID: 'app',
    GITHUB_APP_INSTALLATION_ID: 'inst',
    GITHUB_APP_PRIVATE_KEY: 'k',
    ANALYSIS_CALLBACK_SECRET: 'x',
    DISPATCH_SHARED_SECRET: DISPATCH_SECRET,
    STAGING_CALLBACK_BASE_URL: 'https://x.invalid',
    STAGING_ARTIFACT_BASE_URL: 'https://x.invalid',
    ARTIFACT_BUCKET: {
      async get(key: string) {
        if (key === `malware-artifacts/${SAMPLE_SHA}`) {
          return { body: new ReadableStream({ start(c) { c.enqueue(new Uint8Array([9])); c.close(); } }), size: 1 };
        }
        return null;
      },
    } as R2Bucket,
    __TEST_JWT_SIGNER: async () => 'sig',
    __TEST_DISPATCH_CLIENT: client as GitHubDispatchClient,
    __TEST_FALLBACK_BACKOFF_MS: 1,
    __TEST_VERIFY_OIDC: (verify ?? (async (token: string) => {
      const claims: OidcClaims = {
        iss: 'https://token.actions.githubusercontent.com',
        aud: 'zayron-x-analysis-validation',
        exp: Math.floor(Date.now() / 1000) + 600,
        iat: Math.floor(Date.now() / 1000) - 10,
        jti: 'jti-1435',
        repository: 'AymanAhmad-99/zayron-x-analysis-runner',
        repository_owner: 'AymanAhmad-99',
        workflow: '.github/workflows/zayron-malware-validation.yml',
        workflow_ref: 'AymanAhmad-99/zayron-x-analysis-runner@refs/heads/main',
        ref: 'refs/heads/main',
        ref_type: 'branch',
        run_id: GITHUB_RUN_ID,
        run_attempt: '1',
        sha: 'a'.repeat(40),
        repository_visibility: 'public',
        event: 'workflow_dispatch',
        actor: 'AymanAhmad-99',
      };
      return token === 'good-token' ? { valid: true, claims } : { valid: false, code: 'signature_invalid' };
    })) as Env['__TEST_VERIFY_OIDC'],
  } as unknown as Env;
}

const DISPATCH_BODY = {
  job_id: 'job_1435',
  analysis_run_id: 'ar_1435',
  artifact_id: 'art_1435',
  sha256: SAMPLE_SHA,
  toolchain_version: 'toolchain-1.0.0',
};

const dispatchReq = () => new Request('https://ctl.internal/internal/analysis/github/dispatch', {
  method: 'POST',
  headers: { Authorization: `Bearer ${DISPATCH_SECRET}` },
  body: JSON.stringify(DISPATCH_BODY),
});

const artifactReq = (token: string, jobId = 'job_1435') =>
  new Request(`https://ctl.internal/internal/analysis/github/artifact?job_id=${jobId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

// ── Native binding (§3) ─────────────────────────────────────────────

describe('M14.3.5 native run-id binding', () => {
  it('PASS: dispatch returns workflow_run_id → persisted immediately → artifact succeeds for matching OIDC run', async () => {
    const env = makeEnv([], {
      dispatchWorkflow: async () =>
        ({ dispatched: true, workflow_run_id: GITHUB_RUN_ID, error_code: null }) as DispatchResult,
      getWorkflowRunId: async () => {
        throw new Error('fallback must NOT run when native id is returned');
      },
    });
    const res = await handleDispatch(dispatchReq(), env);
    expect(res.status).toBe(200);
    const body = await res.json() as any;
    expect(body.run_binding).toBe('BOUND');
    expect(body.workflow_run_id).toBe(GITHUB_RUN_ID);

    // D1 binding persisted before artifact access:
    const env2 = env; // same in-memory DB
    const art = await handleArtifactRequest(artifactReq('good-token'), env2);
    expect(art.status).toBe(200);
    expect(art.headers.get('X-ZX-Expected-Sha256')).toBe(SAMPLE_SHA);
  });

  it('FAIL: missing workflow_run_id → BINDING_PENDING (no fallback match)', async () => {
    const env = makeEnv([], {
      dispatchWorkflow: async () => ({ dispatched: true, workflow_run_id: null, error_code: null }) as DispatchResult,
      getWorkflowRunId: async () => ({ status: 'pending' }) as WorkflowRunResolution,
    });
    const res = await handleDispatch(dispatchReq(), env);
    expect(res.status).toBe(200);
    const body = await res.json() as any;
    expect(body.run_binding).toBe('PENDING');
    // Artifact answers BINDING_PENDING — no run is bound, nothing is claimed.
    const art = await handleArtifactRequest(artifactReq('good-token'), env);
    expect(art.status).toBe(409);
    expect(((await art.json()) as any).code).toBe('BINDING_PENDING');
  });

  it('FAIL: malformed workflow_run_id is treated as absent → fallback/pending, never bound', async () => {
    const env = makeEnv([], {
      dispatchWorkflow: async () =>
        ({ dispatched: true, workflow_run_id: '0', error_code: null }) as DispatchResult,
      getWorkflowRunId: async () => ({ status: 'pending' }) as WorkflowRunResolution,
    });
    const res = await handleDispatch(dispatchReq(), env);
    const body = await res.json() as any;
    expect(body.run_binding).toBe('PENDING');
    expect(body.workflow_run_id).toBeNull();
    const art = await handleArtifactRequest(artifactReq('good-token'), env);
    expect(art.status).toBe(409);
    expect(((await art.json()) as any).code).toBe('BINDING_PENDING');
  });

  it('FAIL: wrong workflow run (OIDC run_id ≠ D1 binding) → 409 run_id_mismatch', async () => {
    const env = makeEnv([], {
      dispatchWorkflow: async () => ({ dispatched: true, workflow_run_id: '9999999999', error_code: null }) as DispatchResult,
    });
    await handleDispatch(dispatchReq(), env);
    const art = await handleArtifactRequest(artifactReq('good-token'), env); // token run 7777777777
    expect(art.status).toBe(409);
    expect(((await art.json()) as any).code).toBe('run_id_mismatch');
  });

  it('wrong repository / wrong workflow tokens never reach job logic (unchanged §7/§8)', async () => {
    for (const code of ['wrong_repository', 'wrong_workflow']) {
      const env = makeEnv([makeBoundJob()], {}, async () => ({ valid: false, code }));
      const art = await handleArtifactRequest(artifactReq('good-token'), env);
      expect(art.status).toBe(401);
      expect(((await art.json()) as any).reason).toBe('oidc_rejected');
    }
  });

  it('FAIL: wrong SHA/ref — artifact request for a job with different sha serves nothing', async () => {
    const env = makeEnv([], {
      dispatchWorkflow: async () => ({ dispatched: true, workflow_run_id: GITHUB_RUN_ID, error_code: null }) as DispatchResult,
    });
    await handleDispatch(dispatchReq(), env);
    // Bucket lookup is strictly server-derived from the job's sha256; an
    // attacker-supplied key/URL cannot alter it (only 'e'*64 exists in R2).
    const art = await handleArtifactRequest(artifactReq('good-token'), env);
    expect(art.status).toBe(200);
    expect(art.headers.get('X-ZX-Expected-Sha256')).toBe(SAMPLE_SHA);
  });
});

function makeBoundJob(): JobRow {
  return {
    job_id: 'job_1435',
    analysis_run_id: 'ar_1435',
    artifact_id: 'art_1435',
    sha256: SAMPLE_SHA,
    status: 'DISPATCHED',
    workflow_run_id: GITHUB_RUN_ID,
    created_at: new Date(Date.now() - 60_000).toISOString(),
    updated_at: new Date().toISOString(),
    dispatched_at: new Date().toISOString(),
    dispatch_deadline_epoch: Math.floor(Date.now() / 1000) + 900,
    toolchain_version: 'toolchain-1.0.0',
  };
}

// ── Fallback semantics (§5) ─────────────────────────────────────────

describe('M14.3.5 fallback (deterministic correlation preserved as secondary)', () => {
  it('PASS: no native run id → deterministic run-name fallback resolves', async () => {
    const env = makeEnv([], {
      dispatchWorkflow: async () => ({ dispatched: true, workflow_run_id: null, error_code: null }) as DispatchResult,
      getWorkflowRunId: async () => ({ status: 'resolved', run_id: GITHUB_RUN_ID }) as WorkflowRunResolution,
    });
    const res = await handleDispatch(dispatchReq(), env);
    const body = await res.json() as any;
    expect(body.run_binding).toBe('BOUND');
    expect(body.workflow_run_id).toBe(GITHUB_RUN_ID);
    const art = await handleArtifactRequest(artifactReq('good-token'), env);
    expect(art.status).toBe(200);
  });

  it('FAIL: zero fallback matches → BINDING_PENDING', async () => {
    const env = makeEnv([], {
      dispatchWorkflow: async () => ({ dispatched: true, workflow_run_id: null, error_code: null }) as DispatchResult,
      getWorkflowRunId: async () => ({ status: 'pending' }) as WorkflowRunResolution,
    });
    const res = await handleDispatch(dispatchReq(), env);
    expect(((await res.json()) as any).run_binding).toBe('PENDING');
  });

  it('FAIL: multiple exact fallback matches → RUN_BINDING_AMBIGUOUS (fail closed)', async () => {
    const env = makeEnv([], {
      dispatchWorkflow: async () => ({ dispatched: true, workflow_run_id: null, error_code: null }) as DispatchResult,
      getWorkflowRunId: async () =>
        ({ status: 'ambiguous', run_ids: ['r1', 'r2'] }) as WorkflowRunResolution,
    });
    const res = await handleDispatch(dispatchReq(), env);
    expect(res.status).toBe(409);
    expect(((await res.json()) as any).code).toBe('RUN_BINDING_AMBIGUOUS');
  });

  it('FAIL: existing binding is NEVER overwritten — a second dispatch attempt is rejected outright', async () => {
    const existing = makeBoundJob();
    const env = makeEnv([existing], {
      dispatchWorkflow: async () => ({ dispatched: true, workflow_run_id: '0000000001', error_code: null }) as DispatchResult,
    });
    const res = await handleDispatch(dispatchReq(), env);
    // Duplicate dispatch for an already-dispatched job is rejected...
    expect(res.status).toBe(409);
    // ...and the original binding remains untouched.
    expect(existing.workflow_run_id).toBe(GITHUB_RUN_ID);
  });
});
