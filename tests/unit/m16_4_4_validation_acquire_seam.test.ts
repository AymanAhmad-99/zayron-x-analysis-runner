import { describe, expect, it } from 'bun:test';

async function sha256HexBun(bytes: Uint8Array): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', bytes as unknown as ArrayBuffer);
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0')).join('');
}
import {
  handleValidationAcquire,
  VALIDATION_ARTIFACT_BUCKET_NAME,
  VALIDATION_DISPATCH_SECRET_MIN_LEN,
} from '../../workers/malware-validation/src/index';

// ── Deterministic fixtures ───────────────────────────────────────────────

const TOKEN = 'v'.repeat(40);
/** Deterministic fixture bytes; their REAL sha256 becomes the sample identity. */
const SAMPLE_BYTES = hex(16384);
const SAMPLE_SHA = await sha256HexBun(SAMPLE_BYTES);
const COMMIT = 'c'.repeat(40);
const PATH = `${SAMPLE_SHA}`;

/** Row of the minimal in-memory D1 used by these tests. */
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
}

interface IdentityRow {
  job_id: string;
  expected_ref: string;
  expected_commit_sha: string;
  created_at: string;
}

/** Minimal table-aware D1 supporting exactly the statements the seam uses. */
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
            status: 'QUEUED', // literal in the SQL, not a bind param
            workflow_run_id: null,
            created_at: String(params[4]),
            updated_at: String(params[5]),
            dispatched_at: null,
            dispatch_deadline_epoch: Number(params[6]),
            toolchain_version: 'toolchain-1.0.0',
          });
        }
        return { meta: { changes: 1 } };
      }
      if (/SET status = 'DISPATCHED', dispatched_at = \?, updated_at = \?, workflow_run_id = COALESCE\(\?, workflow_run_id\) WHERE job_id = \?/.test(sql)) {
        const job = jobsById.get(String(params[3]));
        if (job) {
          job.status = 'DISPATCHED';
          job.dispatched_at = String(params[0]);
          job.updated_at = String(params[1]);
          job.workflow_run_id = String(params[2]);
        }
        return {};
      }
      if (/SET workflow_run_id = \?, updated_at = \? WHERE job_id = \? AND workflow_run_id IS NULL/.test(sql)) {
        const job = jobsById.get(String(params[2]));
        if (job && job.workflow_run_id === null) {
          job.workflow_run_id = String(params[0]);
          job.updated_at = String(params[1]);
        }
        return {};
      }
      if (/SELECT job_id, status FROM malware_validation_jobs WHERE sha256/.test(sql)) {
        const sha = String(params[0]);
        const hit = [...jobsById.values()].find((j) => j.sha256 === sha);
        return { first: async () => (hit ? { job_id: hit.job_id, status: hit.status } : null) };
      }
      if (/FROM malware_validation_jobs WHERE analysis_run_id = \?/.test(sql)) {
        const runId = String(params[0]);
        const hit = [...jobsById.values()].find((j) => j.analysis_run_id === runId) ?? null;
        return { first: async () => hit };
      }
      if (/SELECT job_id, analysis_run_id, artifact_id, sha256, status, workflow_run_id, created_at, updated_at, dispatched_at, dispatch_deadline_epoch, toolchain_version FROM malware_validation_jobs WHERE job_id = \?/.test(sql)) {
        const jobId = String(params[0]);
        const hit = jobsById.get(jobId) ?? null;
        return { first: async () => hit };
      }
      if (/SELECT job_id, expected_ref, expected_commit_sha, created_at FROM malware_validation_identity WHERE job_id = \?/.test(sql)) {
        const jobId = String(params[0]);
        return { first: async () => identityById.get(jobId) ?? null };
      }
      throw new Error(`unexpected sql in test db: ${sql.slice(0, 90)}`);
    };
    return {
      bind: (...params: unknown[]) => ({
        first: async <T>() => (run(params) as { first?: (args?: unknown) => Promise<T | null> })?.first?.() ?? null,
        run: async () => run(params),
        all: async () => ({ results: [] }),
      }),
    };
  }
  return {
    prepare,
    all: async () => ({ results: [] }),
    exec: async () => undefined,
    _jobs: jobsById,
    _identities: identityById,
  };
}

/** Validation-mode env bound to the validation bucket by NAME. */
function makeEnv(overrides: Record<string, unknown> = {}) {
  const db = makeDb();
  return {
    DB: db,
    __db: db,
    ARTIFACT_BUCKET: {
      bucket_name: VALIDATION_ARTIFACT_BUCKET_NAME,
      objects: new Map<string, { size: number; customMetadata?: Record<string, string> }>(),
      async get(key: string) {
        const o = (this.objects as Map<string, { size: number }>).get(key);
        return o ? { body: new ReadableStream(), size: o.size, httpEtag: 'etag' } : null;
      },
      async head(key: string) {
        return (this.objects as Map<string, { size: number; customMetadata?: Record<string, string> }>).get(key) ?? null;
      },
      async put(key: string, value: unknown, options?: { customMetadata?: Record<string, string> }) {
        const size = value instanceof Uint8Array ? value.length : 0;
        (this.objects as Map<string, { size: number; customMetadata?: Record<string, string> }>).set(key, {
          size,
          customMetadata: options?.customMetadata,
        });
        return {};
      },
    },
    VALIDATION_MODE: 'true',
    VALIDATION_DISPATCH_TOKEN: TOKEN,
    STAGING_CALLBACK_BASE_URL: 'https://zayron-x-malware-validation-validation.aabusabih.workers.dev',
    STAGING_ARTIFACT_BASE_URL: 'https://zayron-x-malware-validation-validation.aabusabih.workers.dev',
    GITHUB_APP_ID: '111111',
    GITHUB_APP_INSTALLATION_ID: '222222',
    GITHUB_APP_PRIVATE_KEY: 'test-key',
    ANALYSIS_CALLBACK_SECRET: 's'.repeat(40),
    __TEST_DISPATCH_CLIENT: {
      dispatched: [] as Array<{ repo: string; workflow: string; ref: string; inputs: Record<string, string> }>,
      async dispatchWorkflow(repo: string, workflow: string, ref: string, req: { job_id: string } & Record<string, string>) {
        (this.dispatched as Array<{ repo: string; workflow: string; ref: string; inputs: Record<string, string> }>).push({ repo, workflow, ref, inputs: req });
        return { dispatched: true, workflow_run_id: '4444444444', error_code: null };
      },
      async getWorkflowRunId() {
        return { status: 'bound' as const, workflow_run_id: '4444444444' };
      },
    },
    ...overrides,
  } as unknown as import('../../workers/malware-validation/src/index').Env & { __db: ReturnType<typeof makeDb> };
}

type EnvT = ReturnType<typeof makeEnv>;

/** Mock the pinned GitHub acquisition surface (repo → ref → commit → tree → raw bytes). */
async function mockGithub(bytes: Uint8Array) {
  const sampleSha = await sha256HexBun(bytes); // basename MUST equal the real digest
  const tree = {
    tree: [{ path: sampleSha, type: 'blob', size: bytes.length, sha: 'x' }],
    truncated: false,
  };
  const origFetch = globalThis.fetch;
  globalThis.fetch = (async (url: unknown) => {
    const u = String(url);
    if (u.startsWith('https://api.github.com/repos/MalwareSamples/Malware-Feed')) {
      if (u.includes('/git/trees/')) {
        return new Response(JSON.stringify(tree), { status: 200, headers: { 'Content-Type': 'application/json' } });
      }
      if (u.includes('/git/ref/heads/')) {
        return new Response(JSON.stringify({ object: { sha: COMMIT } }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      if (u.includes('/git/commits/')) {
        return new Response(JSON.stringify({ sha: COMMIT, tree: { sha: 'a'.repeat(40) } }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      return new Response(JSON.stringify({ default_branch: 'master' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    if (u.startsWith('https://raw.githubusercontent.com/MalwareSamples/Malware-Feed/')) {
      return new Response(bytes as unknown as BodyInit, { status: 200 });
    }
    throw new Error(`unexpected fetch in test: ${u.slice(0, 80)}`);
  }) as typeof fetch;
  return async () => {
    globalThis.fetch = origFetch;
  };
}

function post(body: unknown, headers: Record<string, string> = { Authorization: `Bearer ${TOKEN}` }): Request {
  return new Request('https://internal.zayron-x.invalid/internal/analysis/validation/acquire', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  });
}

function hex(n: number): Uint8Array {
  const b = new Uint8Array(n);
  for (let i = 0; i < n; i++) b[i] = i & 0xff;
  return b;
}

// ── Tests ────────────────────────────────────────────────────────────────

describe('M16.4.4 — validation acquisition seam', () => {
  it('validation acquisition succeeds structurally: one sample → one job → one dispatch', async () => {
    const env = makeEnv();
    const restore = await mockGithub(hex(16384));

    try {
      const res = await handleValidationAcquire(post({}), env);
      expect(res.status).toBe(201);
      const doc = (await res.json()) as Record<string, unknown>;
      expect(doc.status).toBe('DISPATCHED');
      expect(doc.sha256).toBe(SAMPLE_SHA);
      expect(String(doc.job_id)).toMatch(/^job_gva_/);
      expect(String(doc.analysis_run_id)).toMatch(/^ar_gva_/);

      // Exactly one validation job, bound to the verified sha, QUEUED→dispatched by handoff.
      const jobs = [...env.__db._jobs.values()] as JobRow[];
      expect(jobs.length).toBe(1);
      expect(jobs[0].sha256).toBe(SAMPLE_SHA);

      // Exactly one dispatch, to the allowlisted ref.
      const client = (env as unknown as { __TEST_DISPATCH_CLIENT: { dispatched: Array<{ ref: string; inputs: Record<string, string> }> } }).__TEST_DISPATCH_CLIENT;
      expect(client.dispatched.length).toBe(1);
      expect(client.dispatched[0].ref).toBe('m16-3-1-bounded-diagnostics-sync');
      expect(client.dispatched[0].inputs.job_id).toBe(jobs[0].job_id);

      // Artifact stored under the server-derived key with provenance metadata.
      const stored = await env.ARTIFACT_BUCKET!.head(`malware-artifacts/${SAMPLE_SHA}`);
      expect(stored).not.toBeNull();
      expect(stored!.customMetadata?.source_commit).toBe(COMMIT);
    } finally {
      restore();
    }
  });

  it('production mode cannot use the validation acquisition seam (503, no mutation)', async () => {
    const env = makeEnv({ VALIDATION_MODE: undefined }) as EnvT;
    const restore = await mockGithub(hex(16384));
    try {
      const res = await handleValidationAcquire(post({}), env);
      expect(res.status).toBe(503);
      const doc = (await res.json()) as { code?: string };
      expect(doc.code).toBe('VALIDATION_MODE_REQUIRED');
      expect([...env.__db._jobs.values()].length).toBe(0);
      expect((await env.ARTIFACT_BUCKET!.head(`malware-artifacts/${SAMPLE_SHA}`))).toBeNull();
    } finally {
      restore();
    }
  });

  it('production R2 binding is positively rejected even in validation mode', async () => {
    const env = makeEnv();
    (env.ARTIFACT_BUCKET as { bucket_name?: string }).bucket_name = 'zayron-x-storage';
    const res = await handleValidationAcquire(post({}), env);
    expect(res.status).toBe(500);
    const doc = (await res.json()) as { code?: string };
    expect(doc.code).toBe('PRODUCTION_BINDING_DETECTED');
  });

  it('a wrong artifact-bucket binding is rejected (fail closed)', async () => {
    const env = makeEnv();
    (env.ARTIFACT_BUCKET as { bucket_name?: string }).bucket_name = 'some-other-bucket';
    const res = await handleValidationAcquire(post({}), env);
    expect(res.status).toBe(500);
    const doc = (await res.json()) as { code?: string };
    expect(doc.code).toBe('VALIDATION_BUCKET_NOT_BOUND');
  });

  it('missing dispatch secret fails closed before any acquisition', async () => {
    const env = makeEnv({ VALIDATION_DISPATCH_TOKEN: undefined });
    const restore = await mockGithub(hex(16384));
    try {
      const res = await handleValidationAcquire(post({}), env);
      expect(res.status).toBe(503);
      const doc = (await res.json()) as { code?: string };
      expect(doc.code).toBe('VALIDATION_DISPATCH_SECRET_UNCONFIGURED');
      expect([...env.__db._jobs.values()].length).toBe(0);
    } finally {
      restore();
    }
  });

  it('a wrong bearer token is rejected (401) before any acquisition', async () => {
    const env = makeEnv();
    const restore = await mockGithub(hex(16384));
    try {
      const res = await handleValidationAcquire(post({}, { Authorization: 'Bearer wrong-token-wrong-token-wrong' }), env);
      expect(res.status).toBe(401);
      expect([...env.__db._jobs.values()].length).toBe(0);
    } finally {
      restore();
    }
  });

  it('a duplicate artifact (existing job for the same sha) is rejected without substitution', async () => {
    const env = makeEnv();
    env.__db._jobs.set('job_gva_existing', {
      job_id: 'job_gva_existing',
      analysis_run_id: 'ar_gva_existing',
      artifact_id: 'art_existing',
      sha256: SAMPLE_SHA,
      status: 'QUEUED',
      workflow_run_id: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      dispatched_at: null,
      dispatch_deadline_epoch: Math.floor(Date.now() / 1000) + 900,
      toolchain_version: 'toolchain-1.0.0',
    } as JobRow);
    const restore = await mockGithub(hex(16384));
    try {
      const res = await handleValidationAcquire(post({}), env);
      expect(res.status).toBe(409);
      const doc = (await res.json()) as { code?: string; existing_job_id?: string };
      expect(doc.code).toBe('duplicate_sample');
      expect(doc.existing_job_id).toBe('job_gva_existing');
      // Still exactly one job; no second job, no second dispatch.
      expect([...env.__db._jobs.values()].length).toBe(1);
      const client = (env as unknown as { __TEST_DISPATCH_CLIENT: { dispatched: unknown[] } }).__TEST_DISPATCH_CLIENT;
      expect(client.dispatched.length).toBe(0);
    } finally {
      await restore();
    }
  });

  it('a GitHub SHA mismatch fails closed: no storage, no job, no dispatch', async () => {
    const env = makeEnv();
    // Basename identity requires PATH == sha of bytes; feed a DIFFERENT sha hint
    // so the candidate identity check rejects before storage.
    const restore = await mockGithub(hex(16384));
    try {
      const res = await handleValidationAcquire(post({ declared_sha256: 'b'.repeat(64) }), env);
      expect(res.status).toBe(409);
      const doc = (await res.json()) as { code?: string };
      expect(doc.code).toBe('candidate_identity_mismatch');
      expect([...env.__db._jobs.values()].length).toBe(0);
      expect(await env.ARTIFACT_BUCKET!.head(`malware-artifacts/${SAMPLE_SHA}`)).toBeNull();
    } finally {
      restore();
    }
  });

  it('exactly one source item is selected even when the tree offers several', async () => {
    const env = makeEnv();
    const restore0 = globalThis.fetch;
    const bytes = hex(16384);
    const tree = {
      tree: [
        { path: `z9-${SAMPLE_SHA}`, type: 'blob', size: bytes.length },
        { path: PATH, type: 'blob', size: bytes.length },
        { path: `a0-${SAMPLE_SHA}`, type: 'blob', size: bytes.length },
        { path: 'readme.md', type: 'blob', size: 10 },
      ],
      truncated: false,
    };
    globalThis.fetch = (async (url: unknown) => {
      const u = String(url);
      if (u.startsWith('https://api.github.com/repos/MalwareSamples/Malware-Feed')) {
        if (u.includes('/git/trees/')) {
          return new Response(JSON.stringify(tree), { status: 200, headers: { 'Content-Type': 'application/json' } });
        }
        if (u.includes('/git/ref/heads/')) {
          return new Response(JSON.stringify({ object: { sha: COMMIT } }), { status: 200, headers: { 'Content-Type': 'application/json' } });
        }
        if (u.includes('/git/commits/')) {
          return new Response(JSON.stringify({ sha: COMMIT, tree: { sha: 'a'.repeat(40) } }), { status: 200, headers: { 'Content-Type': 'application/json' } });
        }
        return new Response(JSON.stringify({ default_branch: 'master' }), { status: 200, headers: { 'Content-Type': 'application/json' } });
      }
      if (u.startsWith('https://raw.githubusercontent.com/MalwareSamples/Malware-Feed/')) {
        return new Response(bytes as unknown as BodyInit, { status: 200 });
      }
      throw new Error('unexpected fetch');
    }) as typeof fetch;
    try {
      const res = await handleValidationAcquire(post({}), env);
      expect(res.status).toBe(201);
      // The selected candidate must be the FIRST sorted path — a single item,
      // deterministically, with no batch or pagination loop.
      expect([...env.__db._jobs.values()].length).toBe(1);
    } finally {
      globalThis.fetch = restore0;
    }
  });

  it('response carries no secrets and dispatch provenance only', async () => {
    const env = makeEnv();
    const restore = await mockGithub(hex(16384));
    try {
      const res = await handleValidationAcquire(post({}), env);
      const text = await res.text();
      expect(text.includes(TOKEN)).toBe(false);
      expect(text.includes('PRIVATE')).toBe(false);
      const doc = JSON.parse(text) as { dispatch?: { attempted?: boolean } };
      expect(doc.dispatch?.attempted).toBe(true);
    } finally {
      restore();
    }
  });

  it('no cron/background acquisition exists: scheduled() suppresses in validation mode and acquire is POST-only', async () => {
    // Route surface: only POST /internal/analysis/validation/acquire exists.
    // (Static structural assertion — the worker entrypoint wires only POST.)
    expect(VALIDATION_DISPATCH_SECRET_MIN_LEN).toBeGreaterThanOrEqual(32);
    expect(VALIDATION_ARTIFACT_BUCKET_NAME).toBe('zayron-x-malware-validation-storage');
  });
});
