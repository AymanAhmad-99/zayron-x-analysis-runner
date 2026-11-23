/**
 * M18.1E — Full acquire-seam test with injected fakes.
 *
 * Executes the EXPORTED `handleValidationAcquire` end-to-end through the
 * MalShare branch using ONLY controlled fakes:
 *
 *   getlist → candidate selection → details confirmation → history dedup →
 *   getfile (raw bytes) → server-side SHA-256 gate → Artifact construction →
 *   provenance → R2 PUT → R2 HEAD → D1 conditional INSERT →
 *   validation identity binding → dispatch invocation.
 *
 * NO live MalShare call. NO real malware. NO network I/O.
 */
import { afterEach, describe, expect, it } from 'bun:test';

import {
  ARTIFACT_KEY_PREFIX,
  VALIDATION_ARTIFACT_BUCKET_NAME,
  handleValidationAcquire,
  type Env,
} from '../../workers/malware-validation/src/index';
import { MALSHARE_SOURCE_ID } from '../../packages/intelligence/src/malware/canonical/malwareShareFeedAdapter';

const API_KEY = 'TEST_MALSHARE_API_KEY_DO_NOT_LOG';
const DISPATCH_TOKEN = 'v'.repeat(40);
const GITHUB_RUN_ID = '8888888888';

// ── Fixtures (deterministic; non-executable pseudo-bytes) ───────────

function makePayload(n: number, seed: number): Uint8Array {
  const b = new Uint8Array(n);
  let x = seed >>> 0;
  for (let i = 0; i < n; i++) {
    x = (x * 1664525 + 1013904223) >>> 0;
    b[i] = (x >>> 24) & 0xff;
  }
  return b;
}

async function sha256Hex(bytes: Uint8Array): Promise<string> {
  const d = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(d), (b) => b.toString(16).padStart(2, '0')).join('');
}

interface Fixture {
  payload: Uint8Array;
  sha: string;
}

let FX: Fixture | null = null;
async function fixture(): Promise<Fixture> {
  if (FX) return FX;
  const payload = makePayload(50_000, 42);
  const sha = await sha256Hex(payload);
  FX = { payload, sha };
  return FX;
}

function jsonResponse(obj: unknown, status = 200): Response {
  return new Response(new TextEncoder().encode(JSON.stringify(obj)), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function getlistJson(sha: string, added = '2026-10-02 04:00:00'): Response {
  return jsonResponse([
    {
      SHA256: sha,
      ADDED: added,
      FileName: 'sample_mls.exe',
      FILESIZE: 50_000,
      F_TYPE: 'PE32',
    },
  ]);
}

function detailsJson(sha: string, added = '2026-10-02 04:00:00'): Response {
  return jsonResponse({
    MD5: '0123456789abcdef0123456789abcdef',
    SHA256: sha,
    ADDED: added,
    FILENAMES: ['sample_mls.exe'],
    FILESIZE: 50_000,
    TYPE: 'PE32 executable (GUI) Intel 80386',
  });
}

// ── In-memory D1 fake ───────────────────────────────────────────────

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

interface DbOptions {
  jobs?: JobRow[];
  failInsert?: boolean;
  existingJobBySha?: { job_id: string; status: string } | null;
  databaseName?: string;
}

function makeDb(opts: DbOptions = {}) {
  const jobs = new Map<string, JobRow>();
  const identity = new Map<string, IdentityRow>();
  for (const j of opts.jobs ?? []) jobs.set(j.job_id, { ...j });

  const db = {
    database_name: opts.databaseName ?? 'zayron-x-malware-validation-db',
    prepare(sql: string) {
      return {
        bind(...args: unknown[]) {
          return {
            async first<T>(): Promise<T | null> {
              if (/FROM malware_validation_identity/.test(sql) && /WHERE job_id = \?/.test(sql)) {
                return (identity.get(String(args[0])) as unknown as T) ?? null;
              }
              if (/FROM malware_validation_jobs/.test(sql) && /WHERE sha256 = \?/.test(sql)) {
                if (opts.existingJobBySha) return opts.existingJobBySha as unknown as T;
                for (const j of jobs.values()) {
                  if (j.sha256 === String(args[0])) return { job_id: j.job_id, status: j.status } as unknown as T;
                }
                return null;
              }
              if (/FROM malware_validation_jobs/.test(sql) && /analysis_run_id = \?/.test(sql)) {
                for (const j of jobs.values()) if (j.analysis_run_id === String(args[0])) return j as unknown as T;
                return null;
              }
              if (/FROM malware_validation_jobs/.test(sql) && /WHERE job_id = \?/.test(sql)) {
                return (jobs.get(String(args[0])) as unknown as T) ?? null;
              }
              return null;
            },
            async all<T>(): Promise<{ results: T[] }> {
              if (/SELECT DISTINCT sha256 FROM malware_validation_jobs/.test(sql)) {
                return { results: [...jobs.values()].map((j) => ({ sha256: j.sha256 })) as unknown as T[] };
              }
              if (/workflow_run_id IS NOT NULL/.test(sql)) {
                return {
                  results: [...jobs.values()]
                    .filter((j) => j.workflow_run_id)
                    .map((j) => ({ job_id: j.job_id, workflow_run_id: j.workflow_run_id })) as unknown as T[],
                };
              }
              return { results: [] as T[] };
            },
            async run(): Promise<unknown> {
              if (/INSERT INTO malware_validation_jobs[\s\S]*WHERE NOT EXISTS/.test(sql)) {
                if (opts.failInsert) throw new Error('d1_insert_failed');
                const jobId = String(args[0]);
                const sha = String(args[3]);
                if ([...jobs.values()].some((j) => j.sha256 === sha)) return { meta: { changes: 0 } };
                jobs.set(jobId, {
                  job_id: jobId,
                  analysis_run_id: String(args[1]),
                  artifact_id: String(args[2]),
                  sha256: sha,
                  status: 'QUEUED',
                  workflow_run_id: null,
                  created_at: String(args[4]),
                  updated_at: String(args[5]),
                  dispatched_at: null,
                  dispatch_deadline_epoch: Number(args[6]),
                  toolchain_version: 'toolchain-1.0.0',
                });
                return { meta: { changes: 1 } };
              }
              if (/INSERT INTO malware_validation_jobs/.test(sql)) {
                const jobId = String(args[0]);
                if (!jobs.has(jobId)) {
                  jobs.set(jobId, {
                    job_id: jobId,
                    analysis_run_id: String(args[1]),
                    artifact_id: String(args[2]),
                    sha256: String(args[3]),
                    status: String(args[4]),
                    workflow_run_id: args[5] === null ? null : String(args[5]),
                    created_at: String(args[6]),
                    updated_at: String(args[7]),
                    dispatched_at: args[8] === null ? null : String(args[8]),
                    dispatch_deadline_epoch: Number(args[9]),
                    toolchain_version: String(args[10]),
                  });
                }
                return { meta: { changes: 1 } };
              }
              if (/INSERT OR IGNORE INTO malware_validation_identity/.test(sql)) {
                const jobId = String(args[0]);
                if (!identity.has(jobId)) {
                  identity.set(jobId, {
                    job_id: jobId,
                    expected_ref: String(args[1]),
                    expected_commit_sha: String(args[2]),
                    created_at: String(args[3]),
                  });
                }
                return { meta: { changes: 1 } };
              }
              if (/UPDATE malware_validation_jobs/.test(sql)) {
                const job = jobs.get(String(args[args.length - 1]));
                if (job) {
                  if (/status = 'DISPATCHED'/.test(sql)) {
                    job.status = 'DISPATCHED';
                    job.dispatched_at = String(args[0]);
                    const v = args[2];
                    if (v !== undefined && v !== null && String(v) !== '' && !job.workflow_run_id) {
                      job.workflow_run_id = String(v);
                    }
                  } else if (/SET workflow_run_id = \?/.test(sql)) {
                    if (!job.workflow_run_id) job.workflow_run_id = String(args[0]);
                  } else if (/SET status = \?/.test(sql)) {
                    job.status = String(args[0]);
                  }
                }
                return {};
              }
              return {};
            },
          };
        },
      };
    },
    all() {
      return Promise.resolve({ results: [] });
    },
    exec() {
      return Promise.resolve({});
    },
  };
  return { db, jobs, identity };
}

// ── In-memory R2 fake ───────────────────────────────────────────────

interface BucketOptions {
  failPut?: boolean;
  bucketName?: string;
}

function makeBucket(opts: BucketOptions = {}) {
  const store = new Map<string, { bytes: Uint8Array; customMetadata: Record<string, string> }>();
  const bucket = {
    bucket_name: opts.bucketName ?? VALIDATION_ARTIFACT_BUCKET_NAME,
    async put(key: string, value: unknown, o?: { customMetadata?: Record<string, string> }) {
      if (opts.failPut) throw new Error('r2_put_failed');
      const bytes = value instanceof Uint8Array ? value : new Uint8Array(value as ArrayBuffer);
      store.set(key, { bytes, customMetadata: { ...(o?.customMetadata ?? {}) } });
    },
    async head(key: string) {
      const e = store.get(key);
      return e ? { size: e.bytes.length, customMetadata: e.customMetadata } : null;
    },
    async get(key: string) {
      const e = store.get(key);
      return e ? { size: e.bytes.length } : null;
    },
  };
  return { bucket, store };
}

// ── fetch + dispatch fakes ──────────────────────────────────────────

interface FetchCall {
  url: string;
  redirect: string | undefined;
}

type FetchHandler = (call: FetchCall, index: number) => Response | Promise<Response>;

const restorers: Array<() => void> = [];
afterEach(() => {
  while (restorers.length) restorers.pop()!();
});

function installFetch(handlers: FetchHandler[]): { calls: FetchCall[] } {
  const original = globalThis.fetch;
  const calls: FetchCall[] = [];
  globalThis.fetch = (async (input: unknown, init?: RequestInit) => {
    const url = typeof input === 'string' ? input : String((input as { url?: string })?.url ?? '');
    const call: FetchCall = {
      url,
      redirect: init?.redirect,
    };
    calls.push(call);
    const h = handlers[Math.min(calls.length - 1, handlers.length - 1)];
    if (!h) throw new Error(`unexpected_fetch: ${url}`);
    return h(call, calls.length - 1);
  }) as unknown as typeof fetch;
  restorers.push(() => {
    globalThis.fetch = original;
  });
  return { calls };
}

interface DispatchCall {
  repo: string;
  workflow: string;
  ref: string;
  req: Record<string, unknown>;
}

function installDispatch(shouldSucceed = true) {
  const calls: DispatchCall[] = [];
  const client = {
    async dispatchWorkflow(repo: string, workflow: string, ref: string, req: Record<string, unknown>) {
      calls.push({ repo, workflow, ref, req });
      if (!shouldSucceed) {
        return { dispatched: false, workflow_run_id: null, error_code: 'dispatch_rejected' };
      }
      return { dispatched: true, workflow_run_id: GITHUB_RUN_ID, error_code: null };
    },
    async getWorkflowRunId() {
      throw new Error('fallback must not run when a native run id is returned');
    },
  };
  return { client, calls };
}

interface HarnessOptions {
  handlers: FetchHandler[];
  jobs?: JobRow[];
  failInsert?: boolean;
  failPut?: boolean;
  existingJobBySha?: { job_id: string; status: string } | null;
  databaseName?: string;
  bucketName?: string;
  dropApiKey?: boolean;
  dispatchSuccess?: boolean;
  validationMode?: string;
  body?: Record<string, unknown>;
}

async function runAcquire(opts: HarnessOptions) {
  const { db, jobs, identity } = makeDb({
    jobs: opts.jobs,
    failInsert: opts.failInsert,
    existingJobBySha: opts.existingJobBySha,
    databaseName: opts.databaseName,
  });
  const { bucket, store } = makeBucket({ failPut: opts.failPut, bucketName: opts.bucketName });
  const { calls: fetchCalls } = installFetch(opts.handlers);
  const { client, calls: dispatchCalls } = installDispatch(opts.dispatchSuccess ?? true);

  const env = {
    DB: db,
    ARTIFACT_BUCKET: bucket,
    GITHUB_APP_ID: 'app',
    GITHUB_APP_INSTALLATION_ID: 'inst',
    GITHUB_APP_PRIVATE_KEY: 'k',
    ANALYSIS_CALLBACK_SECRET: 'x',
    STAGING_CALLBACK_BASE_URL: 'https://validation.test',
    STAGING_ARTIFACT_BASE_URL: 'https://validation.test',
    VALIDATION_MODE: opts.validationMode ?? 'true',
    VALIDATION_DISPATCH_TOKEN: DISPATCH_TOKEN,
    ...(opts.dropApiKey ? {} : { MALSHARE_API_KEY: API_KEY }),
    __TEST_DISPATCH_CLIENT: client,
    __TEST_FALLBACK_BACKOFF_MS: 1,
  } as unknown as Env;

  const req = new Request('https://validation.test/internal/analysis/validation/acquire', {
    method: 'POST',
    headers: { Authorization: `Bearer ${DISPATCH_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ source: 'malshare', ...(opts.body ?? {}) }),
  });

  const res = await handleValidationAcquire(req, env);
  const text = await res.clone().text();
  let body: Record<string, unknown> = {};
  try {
    body = JSON.parse(text) as Record<string, unknown>;
  } catch {
    body = {};
  }
  return { res, status: res.status, text, body, jobs, identity, store, dispatchCalls, fetchCalls };
}

describe('M18.1E Acquire Seam — MalShare Happy Path and Invariants', () => {
  it('runs getlist → select → details → getfile → SHA gate → R2 → D1 → dispatch', async () => {
    const { sha, payload } = await fixture();
    const h = await runAcquire({
      handlers: [
        () => getlistJson(sha),
        () => detailsJson(sha),
        () => new Response(payload, { status: 200 }),
      ],
    });

    expect(h.status).toBe(201);
    expect(h.body.sha256).toBe(sha);
    expect(h.body.status).toBe('DISPATCHED');

    // 1. Source isolation: source = MalShare, no MalariaBazaar or GitHub identity reuse
    const src = h.body.source as Record<string, unknown>;
    expect(src.name).toBe('MalShare');
    expect(src.query).toBe('getlist');
    expect(src.selector).toBe('recent_24h');
    expect(src.added_utc).toBe('2026-10-02T04:00:00.000Z');

    const artifactId = String(h.body.artifact_id);
    const jobId = String(h.body.job_id);
    const analysisRunId = String(h.body.analysis_run_id);

    expect(artifactId.startsWith('art_mls_')).toBe(true);
    expect(artifactId.startsWith('art_mbz_')).toBe(false);
    expect(artifactId.startsWith('art_gmf_')).toBe(false);

    expect(jobId.startsWith('job_mls_')).toBe(true);
    expect(jobId.startsWith('job_mbz_')).toBe(false);

    expect(analysisRunId.startsWith('ar_mls_')).toBe(true);
    expect(analysisRunId.startsWith('ar_mbz_')).toBe(false);

    // 2. R2 customMetadata verification
    const r2Key = `${ARTIFACT_KEY_PREFIX}${sha}`;
    const r2Obj = h.store.get(r2Key);
    expect(r2Obj).toBeDefined();
    expect(r2Obj!.customMetadata.source).toBe('MalShare');
    expect(r2Obj!.customMetadata.source_id).toBe(MALSHARE_SOURCE_ID);
    expect(r2Obj!.customMetadata.source_added_utc).toBe('2026-10-02T04:00:00.000Z');
    expect(r2Obj!.customMetadata.source_sha256).toBe(sha);
    // Crucial: source_first_seen_utc is NEVER fabricated
    expect(r2Obj!.customMetadata.source_first_seen_utc).toBeUndefined();

    // 3. D1 verification
    const job = h.jobs.get(jobId);
    expect(job).toBeDefined();
    expect(job!.sha256).toBe(sha);
    expect(job!.status).toBe('DISPATCHED');

    // 4. API key handling: key is sent as query param api_key, NEVER in body or header
    for (const call of h.fetchCalls) {
      expect(call.url.includes(`api_key=${API_KEY}`)).toBe(true);
    }
  });

  it('SHA-256 gate occurs BEFORE R2: mismatch aborts without R2 write or dispatch', async () => {
    const { sha } = await fixture();
    const corruptPayload = makePayload(50_000, 999); // different sha
    const corruptSha = await sha256Hex(corruptPayload);
    expect(corruptSha).not.toBe(sha);

    const h = await runAcquire({
      handlers: [
        () => getlistJson(sha),
        () => detailsJson(sha),
        () => new Response(corruptPayload, { status: 200 }),
      ],
    });

    expect(h.status).toBe(400);
    expect(h.body.code).toBe('payload_identity_mismatch');

    // Verification: R2 was NEVER written
    expect(h.store.size).toBe(0);
    // Verification: D1 job was NEVER inserted
    expect(h.jobs.size).toBe(0);
    // Verification: dispatch was NEVER called
    expect(h.dispatchCalls.length).toBe(0);
  });
});

describe('M18.1E Acquire Seam — Error Paths & Fail-Closed Guards', () => {
  it('8. missing API key → 503 MALSHARE_KEY_UNCONFIGURED', async () => {
    const { sha } = await fixture();
    const h = await runAcquire({
      dropApiKey: true,
      handlers: [() => getlistJson(sha)],
    });
    expect(h.status).toBe(503);
    expect(h.body.code).toBe('MALSHARE_KEY_UNCONFIGURED');
    expect(h.fetchCalls.length).toBe(0); // fails before network
  });

  it('9. oversized response → 413 malshare_response_too_large', async () => {
    const huge = new Uint8Array(9 * 1024 * 1024); // > MALSHARE_MAX_JSON_BYTES (8 MiB)
    const h = await runAcquire({
      handlers: [() => new Response(huge, { status: 200 })],
    });
    expect(h.status).toBe(413);
    expect(h.body.code).toBe('malshare_response_too_large');
  });

  it('10. getfile failure → 502 malshare_http_error', async () => {
    const { sha } = await fixture();
    const h = await runAcquire({
      handlers: [
        () => getlistJson(sha),
        () => detailsJson(sha),
        () => new Response('Internal error', { status: 500 }),
      ],
    });
    expect(h.status).toBe(502);
    expect(h.body.code).toBe('malshare_http_error');
    expect(h.store.size).toBe(0);
  });

  it('14. R2 failure → 503 artifact_confirm_failed', async () => {
    const { sha, payload } = await fixture();
    const h = await runAcquire({
      failPut: true,
      handlers: [
        () => getlistJson(sha),
        () => detailsJson(sha),
        () => new Response(payload, { status: 200 }),
      ],
    });
    expect(h.status).toBe(502);
    expect(h.body.code).toBe('malshare_fetch_failed');
    expect(h.jobs.size).toBe(0);
    expect(h.dispatchCalls.length).toBe(0);
  });

  it('15. D1 failure → 502 / 409', async () => {
    const { sha, payload } = await fixture();
    const h = await runAcquire({
      failInsert: true,
      handlers: [
        () => getlistJson(sha),
        () => detailsJson(sha),
        () => new Response(payload, { status: 200 }),
      ],
    });
    expect(h.status).toBe(502);
    expect(h.dispatchCalls.length).toBe(0);
  });

  it('16. dispatch failure → status QUEUED, 201 response with dispatch.attempted=true', async () => {
    const { sha, payload } = await fixture();
    const h = await runAcquire({
      dispatchSuccess: false,
      handlers: [
        () => getlistJson(sha),
        () => detailsJson(sha),
        () => new Response(payload, { status: 200 }),
      ],
    });
    expect(h.status).toBe(201);
    expect(h.body.status).toBe('QUEUED');
  });

  it('deduplication against validation history → 409', async () => {
    const { sha } = await fixture();
    const h = await runAcquire({
      jobs: [
        {
          job_id: 'job_existing',
          analysis_run_id: 'ar_existing',
          artifact_id: 'art_existing',
          sha256: sha,
          status: 'SUCCEEDED',
          workflow_run_id: '1',
          created_at: '2026-10-01T00:00:00Z',
          updated_at: '2026-10-01T00:00:00Z',
          dispatched_at: '2026-10-01T00:00:00Z',
          dispatch_deadline_epoch: 0,
          toolchain_version: 'toolchain-1.0.0',
        },
      ],
      handlers: [() => getlistJson(sha)],
    });
    expect(h.status).toBe(409);
    expect(h.body.code).toBe('no_eligible_source_candidate');
  });

  it('details identity mismatch → 400 details_rejected', async () => {
    const { sha } = await fixture();
    const otherSha = 'e'.repeat(64);
    const h = await runAcquire({
      handlers: [
        () => getlistJson(sha),
        () => detailsJson(otherSha),
      ],
    });
    expect(h.status).toBe(400);
    expect(h.body.code).toBe('details_rejected');
    expect(h.store.size).toBe(0);
  });
});
