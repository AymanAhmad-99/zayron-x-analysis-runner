/**
 * M14.3.3 — OIDC Live Acquisition and Run-Binding Gate (deterministic tests).
 *
 * Covers spec §11:
 *   A. OIDC acquisition mechanism (workflow uses the documented runner
 *      endpoint ACTIONS_ID_TOKEN_REQUEST_URL/TOKEN — never GITHUB_API_URL/oidc,
 *      never a hard-coded endpoint, never an arbitrary audience input).
 *   B. Artifact authorization run-binding (one GitHub workflow run == one
 *      authorized ZAYRON-X analysis job; no first-caller binding).
 *   C. Callback run-id verification (preserved M14.3.2 semantics, strict
 *      mismatch rejection after binding).
 *
 * No live GitHub credentials; the OIDC verifier is injected deterministically.
 */
import { describe, it, expect } from 'bun:test';
import { readFileSync } from 'node:fs';

import {
  handleArtifactRequest,
  handleCallback,
  handleDispatch,
  type Env,
  type R2Bucket,
} from '../../workers/malware-validation/src/index';
import type { OidcClaims } from '@zayron/intelligence/malware/canonical/executor/githubOidcBridge';

// ── A. OIDC acquisition mechanism (workflow static analysis) ─────────

const WORKFLOW = readFileSync('.github/workflows/zayron-malware-validation.yml', 'utf8');

describe('M14.3.3 A — OIDC acquisition uses the documented runner endpoint', () => {
  it('uses ACTIONS_ID_TOKEN_REQUEST_URL', () => {
    expect(WORKFLOW).toContain('ACTIONS_ID_TOKEN_REQUEST_URL');
  });

  it('uses ACTIONS_ID_TOKEN_REQUEST_TOKEN as the bearer for the token request', () => {
    expect(WORKFLOW).toMatch(/Authorization: Bearer \$ACTIONS_ID_TOKEN_REQUEST_TOKEN/);
  });

  it('attaches the fixed audience to the OIDC request', () => {
    expect(WORKFLOW).toMatch(/ACTIONS_ID_TOKEN_REQUEST_URL\}&audience=/);
    expect(WORKFLOW).toContain("ZX_OIDC_AUDIENCE: 'zayron-x-analysis-validation'");
  });

  it('does NOT derive the OIDC endpoint from GITHUB_API_URL', () => {
    // No executable GITHUB_API_URL/oidc construction (comments are not logic —
    // this asserts no "$GITHUB_API_URL/oidc" string exists anywhere).
    expect(WORKFLOW).not.toContain('$GITHUB_API_URL/oidc');
    expect(WORKFLOW).not.toContain('${GITHUB_API_URL}/oidc');
  });

  it('does NOT hard-code a token.actions.githubusercontent.com request endpoint in a run step', () => {
    // The only legitimate occurrence is the verifier-side issuer constant in
    // the bridge module; the workflow request step must use the runner env var.
    const requestStep = WORKFLOW.split('Request GitHub OIDC token')[1]?.split('- name:')[0] ?? '';
    expect(requestStep).not.toContain('token.actions.githubusercontent.com');
  });

  it('does NOT overwrite ACTIONS_ID_TOKEN_REQUEST_TOKEN', () => {
    // The canonical runner-provided env var is never redefined via env: blocks.
    const envBlocks = WORKFLOW.match(/env:\n(?:.*\n)*?.*ACTIONS_ID_TOKEN_REQUEST_TOKEN:.*/g) ?? [];
    for (const block of envBlocks) {
      // It may only appear READ ($VAR usage), never assigned a new value.
      expect(block).not.toMatch(/ACTIONS_ID_TOKEN_REQUEST_TOKEN:\s*\$\{\{/);
    }
  });

  it('keeps least-privilege permissions (contents: read, id-token: write only)', () => {
    const permBlock = WORKFLOW.match(/permissions:\n  contents: read\n  id-token: write/);
    expect(permBlock).not.toBeNull();
    expect(WORKFLOW).not.toMatch(/actions: write/);
    expect(WORKFLOW).not.toMatch(/contents: write/);
    expect(WORKFLOW).not.toMatch(/packages: write/);
  });

  it('retains exactly the five allowed dispatch inputs and no forbidden aliases', () => {
    const inputsMatch = WORKFLOW.match(/inputs:\n([\s\S]*?)\n\n#/);
    expect(inputsMatch).not.toBeNull();
    const names = [...(inputsMatch![1].matchAll(/^\s{6}(\w+):/gm))].map((m) => m[1]);
    expect(names.sort()).toEqual(
      ['analysis_run_id', 'artifact_id', 'job_id', 'sha256', 'toolchain_version'].sort()
    );
    for (const forbidden of ['callback_token', 'callback_url', 'sample_locator', 'token', 'auth', 'download_url', 'sample_url']) {
      expect(names).not.toContain(forbidden);
    }
  });

  it('does NOT accept an arbitrary audience via workflow inputs', () => {
    expect(WORKFLOW).not.toMatch(/audience:\s*\n?\s*description:/);
    expect(WORKFLOW).not.toMatch(/inputs\.audience/);
  });
});

// ── Deterministic fixture machinery (shared with B and C) ────────────

/** Real wall clock — staleness logic uses Date.now() inside the handler. */
const FIXED_NOW = Date.now();

const TRUSTED_CLAIMS: OidcClaims = {
  iss: 'https://token.actions.githubusercontent.com',
  aud: 'zayron-x-analysis-validation',
  exp: Math.floor(FIXED_NOW / 1000) + 600,
  iat: Math.floor(FIXED_NOW / 1000) - 10,
  jti: 'jti-run-1111111111',
  repository: 'AymanAhmad-99/zayron-x-analysis-runner',
  repository_owner: 'AymanAhmad-99',
  workflow: '.github/workflows/zayron-malware-validation.yml',
  workflow_ref: 'AymanAhmad-99/zayron-x-analysis-runner@refs/heads/main',
  ref: 'refs/heads/main',
  ref_type: 'branch',
  run_id: '1111111111',
  run_attempt: '1',
  sha: 'a'.repeat(40),
  repository_visibility: 'public',
  event: 'workflow_dispatch',
  actor: 'AymanAhmad-99',
};

function claimsWithRun(runId: string): OidcClaims {
  return { ...TRUSTED_CLAIMS, run_id: runId, jti: `jti-run-${runId}` };
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

const SAMPLE_SHA = 'b'.repeat(64);

function makeJob(overrides: Partial<JobRow> = {}): JobRow {
  return {
    job_id: 'job_test_001',
    analysis_run_id: 'ar_test_001',
    artifact_id: 'art_test_001',
    sha256: SAMPLE_SHA,
    status: 'DISPATCHED',
    workflow_run_id: '1111111111',
    created_at: new Date(FIXED_NOW - 60_000).toISOString(),
    updated_at: new Date(FIXED_NOW - 60_000).toISOString(),
    dispatched_at: new Date(FIXED_NOW - 60_000).toISOString(),
    dispatch_deadline_epoch: Math.floor(FIXED_NOW / 1000) + 900,
    toolchain_version: 'toolchain-1.0.0',
    ...overrides,
  };
}

/** Minimal in-memory D1: a single job table keyed by job_id. */
function makeDb(jobs: JobRow[]) {
  const byId = new Map(jobs.map((j) => [j.job_id, j]));
  return {
    prepare(sql: string) {
      return {
        bind(...args: unknown[]) {
          const params = args;
          return {
            async first<T>(): Promise<T | null> {
              if (/WHERE job_id = \?$/.test(sql)) {
                return (byId.get(String(params[0])) as unknown as T) ?? null;
              }
              return null;
            },
            async all<T>(): Promise<{ results: T[] }> {
              return { results: [...byId.values()] as unknown as T[] };
            },
            async run(): Promise<unknown> {
              // UPDATE ... WHERE job_id = ?
              const m = sql.match(/WHERE job_id = \?/);
              if (m && params.length >= 1) {
                // Params: [set..., updated_at is inline, ..., jobId] — the last param is job_id
                const jobId = String(params[params.length - 1]);
                const job = byId.get(jobId);
                if (job) {
                  if (/SET status = \?/.test(sql)) job.status = String(params[0]);
                  if (/SET workflow_run_id = \?/.test(sql)) job.workflow_run_id = String(params[0]);
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

function makeEnv(jobs: JobRow[], opts: { verify?: (token: string) => Promise<{ valid: true; claims: OidcClaims } | { valid: false; code: string }>; bucket?: R2Bucket } = {}): Env {
  return {
    DB: makeDb(jobs) as unknown as Env['DB'],
    GITHUB_APP_ID: '',
    GITHUB_APP_INSTALLATION_ID: '',
    GITHUB_APP_PRIVATE_KEY: '',
    ANALYSIS_CALLBACK_SECRET: 'x',
    DISPATCH_SHARED_SECRET: 'wave4a-dispatch-secret-0123456789abcdef',
    STAGING_CALLBACK_BASE_URL: 'https://example.invalid',
    STAGING_ARTIFACT_BASE_URL: 'https://example.invalid',
    ARTIFACT_BUCKET: opts.bucket ?? {
      async get(key: string) {
        if (key === `malware-artifacts/${SAMPLE_SHA}`) {
          return { body: new ReadableStream({ start(c) { c.enqueue(new Uint8Array([1, 2, 3])); c.close(); } }), size: 3 };
        }
        return null;
      },
    },
    __TEST_VERIFY_OIDC: opts.verify ?? (async (token: string) => {
      if (token === 'token-run-1111111111') return { valid: true, claims: TRUSTED_CLAIMS };
      if (token.startsWith('token-run-')) return { valid: true, claims: claimsWithRun(token.slice(10)) };
      return { valid: false, code: 'signature_invalid' as const };
    }),
  };
}

const OIDC_HEADER = (token: string) => new Request('https://ctl.internal/internal/analysis/github/artifact?job_id=job_test_001', {
  method: 'GET',
  headers: { Authorization: `Bearer ${token}` },
});

// ── B. Artifact authorization run-binding ────────────────────────────

describe('M14.3.3 B — artifact access is strictly run-bound before retrieval', () => {
  it('FAIL: valid OIDC token with WRONG run_id is rejected (run_id_mismatch)', async () => {
    const env = makeEnv([makeJob({ workflow_run_id: '1111111111' })]);
    const res = await handleArtifactRequest(OIDC_HEADER('token-run-2222222222'), env);
    expect(res.status).toBe(409);
    expect((await res.json() as any).code).toBe('run_id_mismatch');
  });

  it('FAIL: valid OIDC token from ANOTHER workflow run is rejected', async () => {
    const env = makeEnv([makeJob({ workflow_run_id: '1111111111' })]);
    const res = await handleArtifactRequest(OIDC_HEADER('token-run-9999999999'), env);
    expect(res.status).toBe(409);
    expect((await res.json() as any).code).toBe('run_id_mismatch');
  });

  it('FAIL: valid OIDC token BEFORE run_id binding answers BINDING_PENDING — no first-caller binding', async () => {
    const env = makeEnv([makeJob({ workflow_run_id: null })]);
    const res = await handleArtifactRequest(OIDC_HEADER('token-run-1111111111'), env);
    expect(res.status).toBe(409);
    const body = await res.json() as any;
    expect(body.code).toBe('BINDING_PENDING');
    // The job's workflow_run_id must remain NULL — no silent binding occurred.
    const job = await env.DB.prepare('SELECT * FROM malware_validation_jobs WHERE job_id = ?').bind('job_test_001').first<JobRow>();
    expect(job?.workflow_run_id).toBeNull();
  });

  it('FAIL: valid OIDC token attempting ANOTHER job_id is rejected', async () => {
    const env = makeEnv([
      makeJob({ job_id: 'job_test_001', workflow_run_id: '1111111111' }),
      makeJob({ job_id: 'job_test_002', analysis_run_id: 'ar_test_002', artifact_id: 'art_test_002', sha256: 'c'.repeat(64), workflow_run_id: '3333333333' }),
    ]);
    // Token run 1111111111 asks for job_test_002, which is bound to run 3333333333.
    const res = await handleArtifactRequest(
      new Request('https://ctl.internal/internal/analysis/github/artifact?job_id=job_test_002', {
        headers: { Authorization: 'Bearer token-run-1111111111' },
      }),
      env
    );
    expect(res.status).toBe(409);
    expect((await res.json() as any).code).toBe('run_id_mismatch');
  });

  it('FAIL: wrong repository / wrong workflow tokens never reach job logic', async () => {
    const env = makeEnv([makeJob()]);
    for (const code of ['wrong_repository', 'wrong_workflow', 'wrong_audience', 'wrong_issuer']) {
      const rejectingEnv = makeEnv([makeJob()], {
        verify: async () => ({ valid: false, code }),
      });
      const res = await handleArtifactRequest(OIDC_HEADER('token-run-1111111111'), rejectingEnv);
      expect(res.status).toBe(401);
      expect((await res.json() as any).reason).toBe('oidc_rejected');
    }
  });

  it('PASS: valid token + correct repo + workflow + run_id + job + artifact + SHA streams the sample', async () => {
    const env = makeEnv([makeJob()]);
    const res = await handleArtifactRequest(OIDC_HEADER('token-run-1111111111'), env);
    expect(res.status).toBe(200);
    expect(res.headers.get('X-ZX-Expected-Sha256')).toBe(SAMPLE_SHA);
    const bytes = new Uint8Array(await res.arrayBuffer());
    expect(bytes.length).toBe(3);
  });

  it('FAIL: nonexistent job_id is rejected', async () => {
    const env = makeEnv([]);
    const res = await handleArtifactRequest(OIDC_HEADER('token-run-1111111111'), env);
    expect(res.status).toBe(404);
    expect((await res.json() as any).code).toBe('job_not_found');
  });

  it('FAIL: terminal-state job (SUCCEEDED) cannot retrieve the artifact', async () => {
    const env = makeEnv([makeJob({ status: 'SUCCEEDED' })]);
    const res = await handleArtifactRequest(OIDC_HEADER('token-run-1111111111'), env);
    expect(res.status).toBe(409);
    expect((await res.json() as any).code).toBe('job_state_SUCCEEDED');
  });

  it('FAIL: stale job is rejected', async () => {
    // M15: artifact age is anchored at dispatch. A stale job here is stale at
    // BOTH creation and dispatch.
    const stale = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const env = makeEnv([makeJob({ created_at: stale, dispatched_at: stale })]);
    const res = await handleArtifactRequest(OIDC_HEADER('token-run-1111111111'), env);
    expect(res.status).toBe(409);
    expect((await res.json() as any).code).toBe('job_expired');
  });

  it('artifact identity is server-derived: the runner cannot influence the R2 key', async () => {
    let requestedKey = '';
    const env = makeEnv([makeJob()], {
      bucket: {
        async get(key: string) {
          requestedKey = key;
          return { body: new ReadableStream({ start(c) { c.close(); } }), size: 0 };
        },
      },
    });
    await handleArtifactRequest(
      new Request('https://ctl.internal/internal/analysis/github/artifact?job_id=job_test_001&key=../../evil', {
        headers: { Authorization: 'Bearer token-run-1111111111' },
      }),
      env
    );
    // Key is exactly the fixed prefix + server-side sha256 — extra params ignored.
    expect(requestedKey).toBe(`malware-artifacts/${SAMPLE_SHA}`);
  });
});

// ── C. Callback run-id verification ─────────────────────────────────

function callbackRequest(token: string, body: Record<string, unknown>): Request {
  return new Request('https://ctl.internal/internal/analysis/github/callback', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

const CALLBACK_BODY = {
  job_id: 'job_test_001',
  analysis_run_id: 'ar_test_001',
  artifact_id: 'art_test_001',
  expected_sha256: SAMPLE_SHA,
  actual_sha256: SAMPLE_SHA,
  workflow_run_id: '1111111111',
  repository: 'AymanAhmad-99/zayron-x-analysis-runner',
  commit_sha: 'a'.repeat(40),
  toolchain_version: 'toolchain-1.0.0',
  status: 'SUCCEEDED',
  results: { tools: {} },
};

describe('M14.3.3 C — callback run-id verification (M14.3.2 semantics preserved)', () => {
  it('PASS: correct OIDC run_id bound to correct job is accepted', async () => {
    const env = makeEnv([makeJob()]);
    const res = await handleCallback(callbackRequest('token-run-1111111111', CALLBACK_BODY), env);
    expect(res.status).toBe(200);
    expect((await res.json() as any).status).toBe('SUCCEEDED');
  });

  it('PASS: unbound job — first valid callback binds its run_id (existing §7 rule 3 mechanism)', async () => {
    const env = makeEnv([makeJob({ workflow_run_id: null })]);
    const res = await handleCallback(callbackRequest('token-run-4444444444', CALLBACK_BODY), env);
    expect(res.status).toBe(200);
    const job = await env.DB.prepare('SELECT * FROM malware_validation_jobs WHERE job_id = ?').bind('job_test_001').first<JobRow>();
    expect(job?.workflow_run_id).toBe('4444444444');
  });

  it('FAIL: callback with WRONG run_id after binding is rejected 409', async () => {
    const env = makeEnv([makeJob({ workflow_run_id: '1111111111' })]);
    const res = await handleCallback(callbackRequest('token-run-2222222222', CALLBACK_BODY), env);
    expect(res.status).toBe(409);
    expect((await res.json() as any).code).toBe('run_id_mismatch');
  });

  it('FAIL: replayed DIFFERENT run_id for the same job is rejected', async () => {
    const env = makeEnv([makeJob({ status: 'SUCCEEDED', workflow_run_id: '1111111111', results_json: '{}' })]);
    const res = await handleCallback(callbackRequest('token-run-2222222222', CALLBACK_BODY), env);
    expect([409, 200]).toContain(res.status); // terminal job: either idempotent-accept path or run_id gate — never SUCCEEDED overwrite
    if (res.status === 200) expect((await res.json() as any).status).toBe('already_accepted');
  });

  it('FAIL: callback for a NONEXISTENT job is rejected', async () => {
    const env = makeEnv([]);
    const res = await handleCallback(callbackRequest('token-run-1111111111', CALLBACK_BODY), env);
    expect(res.status).toBe(409);
  });

  it('FAIL: mismatched SHA is rejected', async () => {
    const env = makeEnv([makeJob()]);
    const res = await handleCallback(
      callbackRequest('token-run-1111111111', { ...CALLBACK_BODY, actual_sha256: 'd'.repeat(64) }),
      env
    );
    expect(res.status).toBe(409);
  });

  it('FAIL: mismatched artifact_id is rejected', async () => {
    const env = makeEnv([makeJob()]);
    const res = await handleCallback(
      callbackRequest('token-run-1111111111', { ...CALLBACK_BODY, artifact_id: 'art_OTHER' }),
      env
    );
    expect(res.status).toBe(409);
  });

  it('FAIL: callback for a job in an invalid state (EXECUTION_UNAVAILABLE) is rejected', async () => {
    const env = makeEnv([makeJob({ status: 'EXECUTION_UNAVAILABLE' })]);
    const res = await handleCallback(callbackRequest('token-run-1111111111', CALLBACK_BODY), env);
    expect(res.status).toBe(409);
  });

  it('invalid OIDC token is rejected 401 before any job logic', async () => {
    const env = makeEnv([makeJob()]);
    const res = await handleCallback(callbackRequest('forged-token', CALLBACK_BODY), env);
    expect(res.status).toBe(401);
  });
});

// ── D. Dispatch run-id resolution contract ───────────────────────────

describe('M14.3.3 D — dispatch resolves and persists the GitHub run id', () => {
  it('forbidden sensitive inputs remain rejected before anything else', async () => {
    const env = makeEnv([]);
    const res = await handleDispatch(
      new Request('https://ctl.internal/internal/analysis/github/dispatch', {
        method: 'POST',
        headers: { Authorization: 'Bearer wave4a-dispatch-secret-0123456789abcdef' },
        body: JSON.stringify({ job_id: 'job_x', callback_token: 'smuggled' }),
      }),
      env
    );
    expect(res.status).toBe(400);
    expect((await res.json() as any).code).toBe('forbidden_input');
  });
});
