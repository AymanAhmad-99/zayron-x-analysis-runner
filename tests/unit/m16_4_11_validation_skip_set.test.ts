import { describe, expect, it } from 'bun:test';

async function sha256HexBun(bytes: Uint8Array): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', bytes as unknown as ArrayBuffer);
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0')).join('');
}
import {
  handleValidationAcquire,
  VALIDATION_ARTIFACT_BUCKET_NAME,
} from '../../workers/malware-validation/src/index';

// ── Fixtures ─────────────────────────────────────────────────────────────

const TOKEN = 'v'.repeat(40);
const COMMIT = 'c'.repeat(40);

function hex(n: number): Uint8Array {
  const b = new Uint8Array(n);
  for (let i = 0; i < n; i++) b[i] = i & 0xff;
  return b;
}

const SAMPLE_A = hex(16384);
const SAMPLE_B = hex(20000);
const SHA_A = await sha256HexBun(SAMPLE_A);
const SHA_B = await sha256HexBun(SAMPLE_B);
/** SHA_A lowercased/uppercased variants used in skip-set case tests. */
const SHA_A_UPPER = SHA_A.toUpperCase();

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

function makeDb(jobs: JobRow[] = [], identities: IdentityRow[] = []) {
  const jobsById = new Map(jobs.map((j) => [j.job_id, j]));
  const identityById = new Map(identities.map((i) => [i.job_id, i]));
  function prepare(sql: string) {
    const exec = (params: unknown[]): unknown => {
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
            status: 'QUEUED',
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
      if (/UPDATE malware_validation_identity/.test(sql)) {
        const jobId = String(params[3]);
        const row = identityById.get(jobId);
        if (row) {
          row.expected_ref = String(params[0]);
          row.expected_commit_sha = String(params[1]);
        }
        return { meta: row ? 1 : 0 };
      }
      if (/SET status = 'DISPATCHED', dispatched_at/.test(sql)) {
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
      if (/UPDATE malware_validation_jobs/.test(sql) && /workflow_run_id/.test(sql)) {
        const jobId = String(params[2]);
        const row = jobsById.get(jobId);
        if (row) row.workflow_run_id = String(params[0]);
        return { meta: row ? 1 : 0 };
      }
      if (/UPDATE malware_validation_jobs/.test(sql) && /status/.test(sql)) {
        const jobId = String(params[params.length - 1]);
        const row = jobsById.get(jobId);
        if (row) row.status = String(params[0]);
        return { meta: row ? 1 : 0 };
      }
      if (/FROM malware_validation_identity/.test(sql)) {
        const jobId = String(params[0]);
        return identityById.get(jobId) ?? null;
      }
      if (/toolchain_version FROM malware_validation_jobs WHERE job_id = \?/.test(sql)) {
        return jobsById.get(String(params[0])) ?? null;
      }
      if (/FROM malware_validation_jobs WHERE analysis_run_id = \?/.test(sql)) {
        const runId = String(params[0]);
        return [...jobsById.values()].find((j) => j.analysis_run_id === runId) ?? null;
      }
      if (/FROM malware_validation_jobs WHERE sha256 = \? LIMIT 1/.test(sql) || /FROM malware_validation_jobs WHERE sha256 = \?/.test(sql)) {
        const sha = String(params[0]);
        const row = [...jobsById.values()].find((j) => j.sha256 === sha) ?? null;
        return row ? { job_id: row.job_id, status: row.status } : null;
      }
      if (/FROM malware_validation_jobs WHERE job_id = \? LIMIT 1/.test(sql)) {
        return jobsById.get(String(params[0])) ?? null;
      }
      throw new Error('unexpected D1 statement in test: ' + sql.slice(0, 90));
    };
    return {
      bind: (...params: unknown[]) => ({
        run: async () => exec(params),
        first: async () => exec(params),
        all: async () => ({ results: [] }),
      }),
    };
  }
  return { prepare, __jobs: jobsById, __identities: identityById };
}

function makeEnv(overrides: Record<string, unknown> = {}) {
  const db = makeDb();
  let rawPutCount = 0;
  const bucket = {
    bucket_name: VALIDATION_ARTIFACT_BUCKET_NAME,
    objects: new Map<string, { size: number; customMetadata?: Record<string, string> }>(),
    async get(key: string) {
      const o = (this.objects as Map<string, { size: number; customMetadata?: Record<string, string> }>).get(key);
      return o ? { body: new ReadableStream(), size: o.size, httpEtag: 'etag', customMetadata: o.customMetadata } : null;
    },
    async head(key: string) {
      return (this.objects as Map<string, { size: number; customMetadata?: Record<string, string> }>).get(key) ?? null;
    },
    async put(key: string, value: unknown, options?: { customMetadata?: Record<string, string> }) {
      rawPutCount += 1;
      const size = value instanceof Uint8Array ? value.length : 0;
      (this.objects as Map<string, { size: number; customMetadata?: Record<string, string> }>).set(key, {
        size,
        customMetadata: options?.customMetadata,
      });
      return {};
    },
  };
  return {
    DB: db,
    ARTIFACT_BUCKET: bucket,
    __rawPutCount: () => rawPutCount,
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
        return { dispatched: true, workflow_run_id: '5555555555', error_code: null };
      },
      async getWorkflowRunId() {
        return { status: 'bound' as const, workflow_run_id: '5555555555' };
      },
    },
    ...overrides,
  } as unknown as import('../../workers/malware-validation/src/index').Env & {
    DB: ReturnType<typeof makeDb>;
    __rawPutCount: () => number;
  };
}

type EnvT = ReturnType<typeof makeEnv>;

/** Mock the pinned GitHub feed: two sha256-named candidates in one tree. */
function mockFeedTwoCandidates() {
  const tree = {
    tree: [
      { path: SHA_A, type: 'blob', size: SAMPLE_A.length, sha: 'a' },
      { path: SHA_B, type: 'blob', size: SAMPLE_B.length, sha: 'b' },
      { path: 'notes/readme.txt', type: 'blob', size: 10, sha: 'r' },
    ],
    truncated: false,
  };
  const origFetch = globalThis.fetch;
  let rawFetches = 0;
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
      rawFetches += 1;
      if (u.includes(SHA_A)) return new Response(SAMPLE_A as unknown as BodyInit, { status: 200 });
      if (u.includes(SHA_B)) return new Response(SAMPLE_B as unknown as BodyInit, { status: 200 });
      return new Response('not found', { status: 404 });
    }
    throw new Error('unexpected fetch in test: ' + u.slice(0, 80));
  }) as typeof fetch;
  return { restore: () => { globalThis.fetch = origFetch; }, rawFetchCount: () => rawFetches };
}

function post(body: unknown): Request {
  return new Request('https://internal.zayron-x.invalid/internal/analysis/validation/acquire', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${TOKEN}` },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  });
}

describe('M16.4.11 — bounded tree-validated operator skip set', () => {
  it('1. absent skip_sha256 preserves current behavior (first candidate selected)', async () => {
    const feed = mockFeedTwoCandidates();
    try {
      const env = makeEnv();
      const res = await handleValidationAcquire(post({}), env);
      expect(res.status).toBe(201);
      const doc = (await res.json()) as Record<string, unknown>;
      expect(doc['sha256']).toBe(SHA_B); // deterministic first: '2' sorts before 'a'
      expect(doc['skip_count']).toBe(0);
    } finally {
      feed.restore();
    }
  });

  it('2. one-item skip set excludes the matching candidate', async () => {
    const feed = mockFeedTwoCandidates();
    try {
      const env = makeEnv();
      // Skip the DEFAULT first candidate (SHA_B) -> the next deterministic
      // candidate (SHA_A) must be selected. This proves the filter applied.
      const res = await handleValidationAcquire(post({ skip_sha256: [SHA_B] }), env);
      expect(res.status).toBe(201);
      const doc = (await res.json()) as Record<string, unknown>;
      expect(doc['sha256']).toBe(SHA_A);
      expect(doc['skip_count']).toBe(1);
    } finally {
      feed.restore();
    }
  });

  it('3+4. multi-item skip set works; case is normalized (UPPER skips lower sha)', async () => {
    const feed = mockFeedTwoCandidates();
    try {
      const env = makeEnv();
      const res = await handleValidationAcquire(post({ skip_sha256: [SHA_A_UPPER, SHA_B] }), env);
      // BOTH candidates excluded -> NO_ELIGIBLE (see test 9); case-normalization
      // proven by SHA_A_UPPER matching SHA_A. Expect the distinct code:
      expect(res.status).toBe(409);
      const doc = (await res.json()) as { code?: string; skip_count?: number };
      expect(doc.code).toBe('NO_ELIGIBLE_VALIDATION_CANDIDATE');
      expect(doc.skip_count).toBe(2);
    } finally {
      feed.restore();
    }
  });

  it('5. duplicate skip values are rejected (no silent dedup)', async () => {
    const feed = mockFeedTwoCandidates();
    try {
      const env = makeEnv();
      const res = await handleValidationAcquire(post({ skip_sha256: [SHA_A, SHA_A] }), env);
      expect(res.status).toBe(400);
      const doc = (await res.json()) as { code?: string };
      expect(doc.code).toBe('invalid_metadata:skip_sha256');
    } finally {
      feed.restore();
    }
  });

  it('6. invalid SHA strings are rejected', async () => {
    const feed = mockFeedTwoCandidates();
    try {
      for (const bad of ['not-a-sha', 'z'.repeat(64), SHA_A.slice(0, 63), SHA_A + '0']) {
        const env = makeEnv();
        const res = await handleValidationAcquire(post({ skip_sha256: [bad] }), env);
        expect(res.status).toBe(400);
        const doc = (await res.json()) as { code?: string };
        expect(doc.code).toBe('invalid_metadata:skip_sha256');
      }
    } finally {
      feed.restore();
    }
  });

  it('7. more than 32 values are rejected (no truncation)', async () => {
    const feed = mockFeedTwoCandidates();
    try {
      const many = Array.from({ length: 33 }, (_, i) => (i.toString(16).padStart(1, '0') + 'a'.repeat(63)).slice(0, 64));
      const env = makeEnv();
      const res = await handleValidationAcquire(post({ skip_sha256: many }), env);
      expect(res.status).toBe(400);
      const doc = (await res.json()) as { code?: string };
      expect(doc.code).toBe('invalid_metadata:skip_sha256');
    } finally {
      feed.restore();
    }
  });

  it('8. non-string/path/URL/object/non-array inputs are rejected', async () => {
    const feed = mockFeedTwoCandidates();
    try {
      for (const bad of [SHA_A, { path: SHA_A }, { url: 'https://evil.invalid/x' }, 'path/to/file', { skip_sha256: 'x' }]) {
        const env = makeEnv();
        const res = await handleValidationAcquire(post({ skip_sha256: bad }), env);
        expect(res.status).toBe(400);
        const doc = (await res.json()) as { code?: string };
        expect(doc.code).toBe('invalid_metadata:skip_sha256');
      }
    } finally {
      feed.restore();
    }
  });

  it('9. all candidates excluded -> NO_ELIGIBLE_VALIDATION_CANDIDATE (no substitution)', async () => {
    const feed = mockFeedTwoCandidates();
    try {
      const env = makeEnv();
      const res = await handleValidationAcquire(post({ skip_sha256: [SHA_A.toLowerCase(), SHA_B.toUpperCase()] }), env);
      expect(res.status).toBe(409);
      const doc = (await res.json()) as { code?: string };
      expect(doc.code).toBe('NO_ELIGIBLE_VALIDATION_CANDIDATE');
      expect((env as unknown as EnvT).__rawPutCount()).toBe(0); // no artifact write
    } finally {
      feed.restore();
    }
  });

  it('10. skipped candidate is NEVER fetched (zero raw fetches for it)', async () => {
    const feed = mockFeedTwoCandidates();
    try {
      const env = makeEnv();
      const res = await handleValidationAcquire(post({ skip_sha256: [SHA_B] }), env);
      expect(res.status).toBe(201);
      expect((await res.json() as Record<string, unknown>)['sha256']).toBe(SHA_A);
      expect(feed.rawFetchCount()).toBe(1); // only SHA_A's bytes were fetched; SHA_B never touched
    } finally {
      feed.restore();
    }
  });

  it('11+12. selected candidate passes SHA verification; skip does NOT bypass the duplicate guard', async () => {
    // Pre-existing job for SHA_B: even though SHA_A is skipped and SHA_B is
    // selected, the duplicate guard must still reject (409 duplicate_sample).
    const feed = mockFeedTwoCandidates();
    try {
      const env = makeEnv();
      (env as unknown as EnvT).DB.prepare(
        "INSERT INTO malware_validation_jobs (job_id, analysis_run_id, artifact_id, sha256, status, workflow_run_id, created_at, updated_at, dispatched_at, dispatch_deadline_epoch, toolchain_version) SELECT ?, ?, ?, ?, 'QUEUED', NULL, ?, ?, NULL, ?, 'toolchain-1.0.0' WHERE NOT EXISTS (SELECT 1 FROM malware_validation_jobs WHERE sha256 = ?)"
      ).bind('job_gva_' + SHA_B.slice(0, 16), 'ar_gva_' + SHA_B.slice(0, 16), 'art_gmf_' + SHA_B.slice(0, 16), SHA_B, new Date().toISOString(), new Date().toISOString(), 0, SHA_B).run();
      const res = await handleValidationAcquire(post({ skip_sha256: [SHA_A] }), env);
      expect(res.status).toBe(409);
      const doc = (await res.json()) as { code?: string; existing_job_id?: string };
      expect(doc.code).toBe('duplicate_sample');
      expect(doc.existing_job_id).toBe('job_gva_' + SHA_B.slice(0, 16));
    } finally {
      feed.restore();
    }
  });

  it('13+14+15. exactly ONE candidate selected, ONE artifact written, ONE job, ONE dispatch handoff', async () => {
    const feed = mockFeedTwoCandidates();
    try {
      const env = makeEnv();
      const res = await handleValidationAcquire(post({ skip_sha256: [SHA_B] }), env);
      expect(res.status).toBe(201);
      const doc = (await res.json()) as Record<string, unknown>;
      expect(doc['sha256']).toBe(SHA_A);
      expect((env as unknown as EnvT).__rawPutCount()).toBe(1);
      expect(feed.rawFetchCount()).toBe(1);
      const db = (env as unknown as EnvT).DB;
      expect(db.__jobs.size).toBe(1);
      expect([...db.__jobs.values()][0].sha256).toBe(SHA_A);
      expect(db.__identities.size).toBe(1);
      const dispatch = (env as unknown as EnvT).__TEST_DISPATCH_CLIENT as { dispatched: unknown[] };
      expect(dispatch.dispatched.length).toBe(1);
    } finally {
      feed.restore();
    }
  });

  it('16. production mode unchanged: acquire still 503 regardless of skip set', async () => {
    const feed = mockFeedTwoCandidates();
    try {
      const env = makeEnv({ VALIDATION_MODE: undefined });
      const res = await handleValidationAcquire(post({ skip_sha256: [SHA_A] }), env);
      expect(res.status).toBe(503);
      const doc = (await res.json()) as { code?: string };
      expect(doc.code).toBe('VALIDATION_MODE_REQUIRED');
    } finally {
      feed.restore();
    }
  });

  it('17. skip set is ephemeral: nothing persisted to D1 or R2 on rejection paths', async () => {
    const feed = mockFeedTwoCandidates();
    try {
      const env = makeEnv();
      await handleValidationAcquire(post({ skip_sha256: [SHA_A, SHA_B] }), env); // NO_ELIGIBLE
      const db = (env as unknown as EnvT).DB;
      expect(db.__jobs.size).toBe(0);
      expect(db.__identities.size).toBe(0);
      expect((env as unknown as EnvT).__rawPutCount()).toBe(0);
      expect((env as unknown as EnvT).ARTIFACT_BUCKET.objects.size).toBe(0);
    } finally {
      feed.restore();
    }
  });

  it('18. validation mode still required and production bindings still rejected with skip set present', async () => {
    const feed = mockFeedTwoCandidates();
    try {
      const envNoMode = makeEnv({ VALIDATION_MODE: undefined });
      const res1 = await handleValidationAcquire(post({ skip_sha256: [SHA_A] }), envNoMode);
      expect(res1.status).toBe(503);
      // Production-named bucket triggers the isolation guard even with a valid skip set.
      const envProdBinding = makeEnv({
        ARTIFACT_BUCKET: { bucket_name: 'zayron-x-storage', objects: new Map(), async head() { return null; }, async get() { return null; }, async put() { return {}; } },
      });
      const res2 = await handleValidationAcquire(post({ skip_sha256: [SHA_A] }), envProdBinding);
      expect(res2.status).toBe(500);
      const doc2 = (await res2.json()) as { code?: string };
      expect(doc2.code).toBe('PRODUCTION_BINDING_DETECTED');
    } finally {
      feed.restore();
    }
  });

  it('19. canonical publication remains unreachable: no malware_reports surface touched', async () => {
    // Structural: the seam writes only to validation D1 (jobs/identity) and
    // validation R2; the D1 mock throws on ANY unexpected statement, so any
    // canonical-table access would have failed test 13. Assert once more:
    const feed = mockFeedTwoCandidates();
    try {
      const env = makeEnv();
      const res = await handleValidationAcquire(post({ skip_sha256: [SHA_B] }), env);
      expect(res.status).toBe(201);
      const db = (env as unknown as EnvT).DB;
      expect(db.__jobs.size).toBe(1); // validation job table only
      expect((env as unknown as EnvT).__rawPutCount()).toBe(1); // validation R2 only
    } finally {
      feed.restore();
    }
  });
});
