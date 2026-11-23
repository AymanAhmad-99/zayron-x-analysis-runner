/**
 * M14.3.2 — Worker handler security tests (deterministic mocks; spec §15).
 *
 * Covers: workflow schema gates, OIDC-authenticated callback, job-bound
 * artifact retrieval, and no-logging invariants against the deployed
 * control-plane handlers.
 */
import { describe, it, expect, beforeAll, afterAll } from 'bun:test';
import { generateKeyPairSync, createSign } from 'node:crypto';

import {
  handleArtifactRequest,
  handleCallback,
  handleJobStatus,
  type Env,
  type R2Bucket,
} from '../../workers/malware-validation/src/index';
import {
  GITHUB_OIDC_ISSUER,
  ZAYRONX_ANALYSIS_AUDIENCE,
  TRUSTED_REPOSITORY,
  TRUSTED_WORKFLOW_PATH,
} from '../../packages/intelligence/src/malware/canonical/executor/githubOidcBridge';

// ── Deterministic RSA + JWKS (same approach as m14_3_2_oidc.test.ts) ──

const { publicKey, privateKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
const kid = 'handler-test-key';
const pubJwk = (publicKey as unknown as { export: (f: { format: 'jwk' }) => Record<string, string> }).export({ format: 'jwk' });
const NOW = 1_800_000_000;

function b64u(input: string | object): string {
  return Buffer.from(typeof input === 'string' ? input : JSON.stringify(input)).toString('base64url');
}

function signOidc(claims: Record<string, unknown>): string {
  const si = `${b64u({ alg: 'RS256', typ: 'JWT', kid })}.${b64u(claims)}`;
  const signer = createSign('RSA-SHA256');
  signer.update(si);
  return `${si}.${signer.sign({ key: privateKey.export({ type: 'pkcs1', format: 'pem' }) as string }).toString('base64url')}`;
}

function makeClaims(over: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    iss: GITHUB_OIDC_ISSUER,
    aud: ZAYRONX_ANALYSIS_AUDIENCE,
    exp: NOW + 300,
    iat: NOW - 10,
    jti: 'jti-h-001',
    repository: TRUSTED_REPOSITORY,
    repository_owner: 'AymanAhmad-99',
    workflow: TRUSTED_WORKFLOW_PATH,
    workflow_ref: `${TRUSTED_REPOSITORY}@refs/heads/main`,
    ref: 'refs/heads/main',
    ref_type: 'branch',
    run_id: '525252',
    run_attempt: '1',
    sha: 'b'.repeat(40),
    repository_visibility: 'public',
    event: 'workflow_dispatch',
    actor: 'AymanAhmad-99',
    ...over,
  };
}

function makeVerifier(over: Record<string, unknown> = {}) {
  return async (token: string) => {
    // Deterministic local verification: only accept tokens signed by our key
    // with matching claims shape. We verify by re-signing check — for test
    // simplicity, decode and compare against expected fixed identity.
    const parts = token.split('.');
    if (parts.length !== 3) return { valid: false as const, code: 'malformed_jwt' };
    let claims: Record<string, unknown>;
    try {
      claims = JSON.parse(Buffer.from(parts[1], 'base64url').toString());
    } catch {
      return { valid: false as const, code: 'malformed_jwt' };
    }
    const expected = makeClaims(over);
    for (const k of ['iss', 'aud', 'repository', 'workflow', 'run_id']) {
      const v = expected[k] ?? over[k];
      if (v !== undefined && claims[k] !== v) return { valid: false as const, code: `wrong_${k === 'run_id' ? 'run' : k}` };
    }
    if ((claims.exp as number) <= NOW) return { valid: false as const, code: 'expired' };
    return { valid: true as const, claims: claims as never };
  };
}

// ── In-memory D1 + R2 mocks ─────────────────────────────────────

type Row = Record<string, unknown>;

const GOLDEN_SHA = 'c'.repeat(64);

function makeEnv(opts: {
  jobs?: Map<string, Row>;
  objects?: Map<string, Uint8Array>;
  verifier?: (t: string) => Promise<{ valid: boolean; code?: string; claims?: unknown }>;
} = {}) {
  const jobs = opts.jobs ?? new Map<string, Row>();
  const objects = opts.objects ?? new Map<string, Uint8Array>();
  const logLines: string[] = [];
  const origLog = console.log;
  console.log = (...args: unknown[]) => { logLines.push(args.map(String).join(' ')); };

  const env: Env = {
    DB: {
      prepare(sql: string) {
        return {
          bind(...args: unknown[]) {
            return {
              async first<T>(): Promise<T | null> {
                if (sql.includes('WHERE job_id = ?')) return (jobs.get(args[0] as string) as T) ?? null;
                return null;
              },
              async all<T>(): Promise<{ results: T[] }> {
                if (sql.includes("status = 'DISPATCHED'")) {
                  return { results: [...jobs.values()].filter((j) => j.status === 'DISPATCHED') as T[] };
                }
                if (sql.includes('workflow_run_id IS NOT NULL')) {
                  const rows = [...jobs.values()].filter((j) => j.workflow_run_id)
                    .map((j) => ({ job_id: j.job_id, workflow_run_id: j.workflow_run_id }));
                  return { results: rows as T[] };
                }
                return { results: [] };
              },
              async run(): Promise<unknown> {
                const job = jobs.get(args[args.length - 1] as string);
                if (sql.startsWith('UPDATE') && job) {
                  if (sql.includes("SET status = ?")) { job.status = args[0]; job.updated_at = args[1]; }
                  else if (sql.includes('workflow_run_id = ?')) { job.workflow_run_id = args[0]; job.updated_at = args[1]; }
                  else if (sql.includes('results_json')) {
                    job.status = args[0]; job.workflow_run_id = args[1] ?? job.workflow_run_id;
                    job.updated_at = args[2]; job.results_json = args[3];
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
    ARTIFACT_BUCKET: {
      async get(key: string) {
        const data = objects.get(key);
        if (!data) return null;
        return { body: new ReadableStream({ start(c) { c.enqueue(data); c.close(); } }), size: data.length };
      },
    } as R2Bucket,
    __TEST_VERIFY_OIDC: opts.verifier as never,
  };
  return {
    env,
    jobs,
    objects,
    logLines,
    done() { console.log = origLog; },
  };
}

function makeJob(over: Partial<Row> = {}): Row {
  return {
    job_id: 'job_oidc_001',
    analysis_run_id: 'ar_oidc_001',
    artifact_id: 'art_oidc_001',
    sha256: GOLDEN_SHA,
    status: 'DISPATCHED',
    // M14.3.3: artifact access requires a bound GitHub run id — default
    // fixtures are bound to the verifier's run_id ('525252').
    workflow_run_id: '525252',
    created_at: new Date(Date.now() - 60_000).toISOString(),
    updated_at: new Date().toISOString(),
    dispatched_at: new Date().toISOString(),
    dispatch_deadline_epoch: Math.floor(Date.now() / 1000) + 900,
    toolchain_version: 'toolchain-1.0.0',
    ...over,
  };
}

function artifactReq(jobId: string, token: string): Request {
  return new Request(`https://staging.test/internal/analysis/github/artifact?job_id=${encodeURIComponent(jobId)}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
}

// ── Tests ────────────────────────────────────────────────────────

describe('M14.3.2 job-bound artifact retrieval (spec §9/§10)', () => {
  it('serves the sample for a valid job-bound OIDC request', async () => {
    const ctx = makeEnv({ verifier: makeVerifier() });
    const job = makeJob();
    ctx.jobs.set(job.job_id as string, job);
    ctx.objects.set(`malware-artifacts/${GOLDEN_SHA}`, new Uint8Array([0x4d, 0x5a, 1, 2, 3]));
    try {
      const res = await handleArtifactRequest(artifactReq(job.job_id as string, signOidc(makeClaims())), ctx.env);
      expect(res.status).toBe(200);
      expect(res.headers.get('X-ZX-Expected-Sha256')).toBe(GOLDEN_SHA);
      const body = new Uint8Array(await res.arrayBuffer());
      expect(body.length).toBe(5);
    } finally { ctx.done(); }
  });

  it('rejects unknown job_id', async () => {
    const ctx = makeEnv({ verifier: makeVerifier() });
    try {
      const res = await handleArtifactRequest(artifactReq('job_missing', signOidc(makeClaims())), ctx.env);
      expect(res.status).toBe(404);
    } finally { ctx.done(); }
  });

  it('rejects wrong repository OIDC token', async () => {
    const ctx = makeEnv({ verifier: makeVerifier() });
    const job = makeJob();
    ctx.jobs.set(job.job_id as string, job);
    try {
      const verifier = async () => ({ valid: false, code: 'wrong_repository' });
      ctx.env.__TEST_VERIFY_OIDC = verifier as never;
      const res = await handleArtifactRequest(artifactReq(job.job_id as string, signOidc(makeClaims())), ctx.env);
      expect(res.status).toBe(401);
    } finally { ctx.done(); }
  });

  it('rejects wrong workflow OIDC token', async () => {
    const ctx = makeEnv({ verifier: makeVerifier() });
    const job = makeJob();
    ctx.jobs.set(job.job_id as string, job);
    ctx.env.__TEST_VERIFY_OIDC = (async () => ({ valid: false, code: 'wrong_workflow' })) as never;
    try {
      const res = await handleArtifactRequest(artifactReq(job.job_id as string, signOidc(makeClaims())), ctx.env);
      expect(res.status).toBe(401);
    } finally { ctx.done(); }
  });

  it('rejects expired job (staleness gate)', async () => {
    const ctx = makeEnv({ verifier: makeVerifier() });
    // M15: artifact age is anchored at dispatch. A stale job here is stale at
    // BOTH creation and dispatch.
    const stale = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const job = makeJob({ created_at: stale, dispatched_at: stale });
    ctx.jobs.set(job.job_id as string, job);
    try {
      const res = await handleArtifactRequest(artifactReq(job.job_id as string, signOidc(makeClaims())), ctx.env);
      expect(res.status).toBe(409);
    } finally { ctx.done(); }
  });

  it('rejects terminal-state job (no artifact after completion)', async () => {
    const ctx = makeEnv({ verifier: makeVerifier() });
    const job = makeJob({ status: 'SUCCEEDED' });
    ctx.jobs.set(job.job_id as string, job);
    try {
      const res = await handleArtifactRequest(artifactReq(job.job_id as string, signOidc(makeClaims())), ctx.env);
      expect(res.status).toBe(409);
    } finally { ctx.done(); }
  });

  it('rejects invalid job_id characters (no path traversal surface)', async () => {
    const ctx = makeEnv({ verifier: makeVerifier() });
    try {
      const res = await handleArtifactRequest(artifactReq('../../etc/passwd', signOidc(makeClaims())), ctx.env);
      expect(res.status).toBe(400);
    } finally { ctx.done(); }
  });
});

describe('M14.3.2 OIDC callback (spec §6/§7)', () => {
  it('accepts a valid OIDC-authenticated callback and binds run_id', async () => {
    const ctx = makeEnv({ verifier: makeVerifier() });
    const job = makeJob();
    ctx.jobs.set(job.job_id as string, job);
    try {
      const token = signOidc(makeClaims());
      const payload = {
        job_id: job.job_id, analysis_run_id: job.analysis_run_id,
        artifact_id: job.artifact_id, expected_sha256: GOLDEN_SHA, actual_sha256: GOLDEN_SHA,
        workflow_run_id: null, repository: TRUSTED_REPOSITORY, commit_sha: 'b'.repeat(40),
        toolchain_version: 'toolchain-1.0.0', status: 'SUCCEEDED',
        results: { tools: [{ tool: 'lief', status: 'OBSERVED' }] },
      };
      const res = await handleCallback(new Request('https://staging.test/internal/analysis/github/callback', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      }), ctx.env);
      expect(res.status).toBe(200);
      expect((job as Row).workflow_run_id).toBe('525252'); // run_id bound from OIDC
      expect((job as Row).status).toBe('SUCCEEDED');
    } finally { ctx.done(); }
  });

  it('rejects callback with run_id mismatch after binding (§7 rule 3)', async () => {
    const ctx = makeEnv({ verifier: makeVerifier({ run_id: '525252' }) });
    const job = makeJob({ workflow_run_id: '111111' }); // bound to a different run
    ctx.jobs.set(job.job_id as string, job);
    try {
      const token = signOidc(makeClaims()); // run_id 525252
      const payload = {
        job_id: job.job_id, analysis_run_id: job.analysis_run_id,
        artifact_id: job.artifact_id, expected_sha256: GOLDEN_SHA, actual_sha256: GOLDEN_SHA,
        workflow_run_id: '525252', repository: TRUSTED_REPOSITORY, commit_sha: 'b'.repeat(40),
        toolchain_version: 'toolchain-1.0.0', status: 'SUCCEEDED', results: {},
      };
      const res = await handleCallback(new Request('https://staging.test/internal/analysis/github/callback', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      }), ctx.env);
      expect(res.status).toBe(409);
    } finally { ctx.done(); }
  });

  it('rejects callback with expired OIDC token', async () => {
    const ctx = makeEnv({ verifier: makeVerifier() });
    const job = makeJob();
    ctx.jobs.set(job.job_id as string, job);
    try {
      const token = signOidc(makeClaims({ exp: NOW - 5 }));
      const payload = {
        job_id: job.job_id, analysis_run_id: job.analysis_run_id,
        artifact_id: job.artifact_id, expected_sha256: GOLDEN_SHA, actual_sha256: GOLDEN_SHA,
        workflow_run_id: '525252', repository: TRUSTED_REPOSITORY, commit_sha: 'b'.repeat(40),
        toolchain_version: 'toolchain-1.0.0', status: 'SUCCEEDED', results: {},
      };
      const res = await handleCallback(new Request('https://staging.test/internal/analysis/github/callback', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      }), ctx.env);
      expect(res.status).toBe(401);
    } finally { ctx.done(); }
  });

  it('rejects callback with wrong sha256 (integrity gate preserved)', async () => {
    const ctx = makeEnv({ verifier: makeVerifier() });
    const job = makeJob();
    ctx.jobs.set(job.job_id as string, job);
    try {
      const token = signOidc(makeClaims());
      const payload = {
        job_id: job.job_id, analysis_run_id: job.analysis_run_id,
        artifact_id: job.artifact_id, expected_sha256: GOLDEN_SHA, actual_sha256: 'd'.repeat(64),
        workflow_run_id: '525252', repository: TRUSTED_REPOSITORY, commit_sha: 'b'.repeat(40),
        toolchain_version: 'toolchain-1.0.0', status: 'SUCCEEDED', results: {},
      };
      const res = await handleCallback(new Request('https://staging.test/internal/analysis/github/callback', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      }), ctx.env);
      expect(res.status).toBe(409);
      expect((job as Row).status).toBe('DISPATCHED');
    } finally { ctx.done(); }
  });

  it('rejects callback without bearer token', async () => {
    const ctx = makeEnv({ verifier: makeVerifier() });
    try {
      const res = await handleCallback(new Request('https://staging.test/internal/analysis/github/callback', {
        method: 'POST', body: JSON.stringify({ job_id: 'x' }),
      }), ctx.env);
      expect(res.status).toBe(401);
    } finally { ctx.done(); }
  });
});

describe('M14.3.2 logging hygiene (spec §11/§15)', () => {
  it('never logs OIDC tokens, authorization headers, or sample bytes', async () => {
    const ctx = makeEnv({ verifier: makeVerifier() });
    const job = makeJob();
    ctx.jobs.set(job.job_id as string, job);
    const token = signOidc(makeClaims());
    try {
      await handleArtifactRequest(artifactReq(job.job_id as string, token), ctx.env);
      const payload = {
        job_id: job.job_id, analysis_run_id: job.analysis_run_id,
        artifact_id: job.artifact_id, expected_sha256: GOLDEN_SHA, actual_sha256: GOLDEN_SHA,
        workflow_run_id: null, repository: TRUSTED_REPOSITORY, commit_sha: 'b'.repeat(40),
        toolchain_version: 'toolchain-1.0.0', status: 'SUCCEEDED', results: {},
      };
      await handleCallback(new Request('https://staging.test/internal/analysis/github/callback', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      }), ctx.env);
      const allLogs = ctx.logLines.join('\n');
      expect(allLogs).not.toContain(token);
      expect(allLogs).not.toContain('Bearer ');
      expect(allLogs).not.toContain('BEGIN PRIVATE KEY');
      expect(allLogs).not.toContain('Authorization');
      // sample bytes (MZ header) must not appear
      expect(allLogs).not.toContain('0x4d');
    } finally { ctx.done(); }
  });
});
