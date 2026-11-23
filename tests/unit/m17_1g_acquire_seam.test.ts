/**
 * M17.1G — Full acquire-seam test with injected fakes (GATE 1 / GATE 3).
 *
 * Executes the EXPORTED `handleValidationAcquire` end-to-end through the
 * MalwareBazaar branch using ONLY controlled fakes:
 *
 *   get_recent → candidate selection → get_info → history dedup → get_file →
 *   WinZip AES-128 decode → decoded SHA-256 → exact SHA-256 gate →
 *   Artifact construction → provenance → R2 PUT → R2 HEAD → D1 conditional
 *   INSERT → validation identity binding → dispatch invocation.
 *
 * NO live MalwareBazaar call. NO real specimen. NO GitHub workflow.
 * NO network at all: `globalThis.fetch` is replaced by a deterministic stub.
 *
 * GATE 3 (SHA-gate order): the mismatch case proves canonical R2 is never
 * written before the decoded-payload SHA-256 equals the source SHA-256.
 */
import { afterEach, describe, expect, it } from 'bun:test';
import { ZipWriter, Uint8ArrayReader, Uint8ArrayWriter } from '@zip.js/zip.js';

import {
  ALLOWED_VALIDATION_REF,
  ARTIFACT_KEY_PREFIX,
  MALWAREBAZAAR_MAX_ARCHIVE_BYTES,
  MALWAREBAZAAR_MAX_PAYLOAD_BYTES,
  MALWAREBAZAAR_MAX_SAMPLE_BYTES,
  VALIDATION_ARTIFACT_BUCKET_NAME,
  handleValidationAcquire,
  type Env,
} from '../../workers/malware-validation/src/index';
import {
  MALWAREBAZAAR_ARCHIVE_MAX_BYTES,
  decodeMalwareBazaarArchive,
} from '../../packages/intelligence/src/malware/canonical/malwareBazaarZip';
import { TRUSTED_REPOSITORY } from '../../packages/intelligence/src/malware/canonical/executor/githubOidcBridge';

const MiB = 1024 * 1024;
const AUTH_KEY = 'TEST_MALWAREBAZAAR_AUTH_KEY_VALUE_DO_NOT_LOG';
const DISPATCH_TOKEN = 'v'.repeat(40);
const MB_URL = 'https://mb-api.abuse.ch/api/v1/';
const GITHUB_RUN_ID = '7777777777';
const SHA_X = 'f'.repeat(64);

// ── Fixtures (deterministic; no real specimen) ──────────────────────

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

async function makeAesZip(
  entries: Array<{ name: string; bytes: Uint8Array }>,
  password = 'infected',
  encryptionStrength = 1
): Promise<Uint8Array> {
  const w = new ZipWriter(new Uint8ArrayWriter(), { password, encryptionStrength, zipCrypto: false });
  for (const e of entries) await w.add(e.name, new Uint8ArrayReader(e.bytes), { level: 0 });
  return (await w.close()) as Uint8Array;
}

interface Fixture {
  payload: Uint8Array;
  sha: string;
  zip: Uint8Array;
}

let FX: Fixture | null = null;
async function fixture(): Promise<Fixture> {
  if (FX) return FX;
  const payload = makePayload(50_000, 7);
  const sha = await sha256Hex(payload);
  const zip = await makeAesZip([{ name: 'sample.bin', bytes: payload }]);
  FX = { payload, sha, zip };
  return FX;
}

function jsonResponse(obj: unknown, status = 200): Response {
  return new Response(new TextEncoder().encode(JSON.stringify(obj)), { status });
}

function recentJson(sha: string, firstSeen = '2026-10-02 06:00:00'): Response {
  return jsonResponse({
    query_status: 'ok',
    data: [
      {
        sha256_hash: sha,
        first_seen: firstSeen,
        file_name: `${sha}.bin`,
        file_size: 50_000,
        file_type: 'exe',
        file_type_mime: 'application/x-dosexec',
        signature: 'AgentTesla',
        tags: ['exe'],
        reporter: 'tester',
        origin_country: 'DE',
        delivery_method: 'web',
      },
    ],
  });
}

function infoJson(sha: string, firstSeen = '2026-10-02 06:00:00'): Response {
  return jsonResponse({ query_status: 'ok', data: [{ sha256_hash: sha, first_seen: firstSeen, file_size: 50_000 }] });
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
  /** Simulates a pre-existing job discovered by the post-selection sha guard. */
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
  body: string;
  authKey: string | undefined;
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
    const headers = (init?.headers ?? {}) as Record<string, string>;
    const call: FetchCall = {
      url,
      body: String(init?.body ?? ''),
      authKey: headers['Auth-Key'],
      redirect: init?.redirect,
    };
    calls.push(call);
    const h = handlers[Math.min(calls.length - 1, handlers.length - 1)];
    if (!h) throw new Error('unexpected_fetch');
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

function installDispatch() {
  const calls: DispatchCall[] = [];
  const client = {
    async dispatchWorkflow(repo: string, workflow: string, ref: string, req: Record<string, unknown>) {
      calls.push({ repo, workflow, ref, req });
      return { dispatched: true, workflow_run_id: GITHUB_RUN_ID, error_code: null };
    },
    async getWorkflowRunId() {
      throw new Error('fallback must not run when a native run id is returned');
    },
  };
  return { client, calls };
}

function captureConsole() {
  const original = console.log;
  const lines: string[] = [];
  console.log = (...args: unknown[]) => {
    lines.push(args.map((a) => (typeof a === 'string' ? a : JSON.stringify(a))).join(' '));
  };
  restorers.push(() => {
    console.log = original;
  });
  return lines;
}

// ── Harness ─────────────────────────────────────────────────────────

interface HarnessOptions {
  handlers: FetchHandler[];
  jobs?: JobRow[];
  failInsert?: boolean;
  failPut?: boolean;
  existingJobBySha?: { job_id: string; status: string } | null;
  databaseName?: string;
  bucketName?: string;
  dropAuthKey?: boolean;
  validationMode?: string;
  body?: Record<string, unknown>;
  captureLogs?: boolean;
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
  const { client, calls: dispatchCalls } = installDispatch();
  const logLines = opts.captureLogs ? captureConsole() : [];

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
    ...(opts.dropAuthKey ? {} : { MALWAREBAZAAR_AUTH_KEY: AUTH_KEY }),
    __TEST_DISPATCH_CLIENT: client,
    __TEST_FALLBACK_BACKOFF_MS: 1,
  } as unknown as Env;

  const req = new Request('https://validation.test/internal/analysis/validation/acquire', {
    method: 'POST',
    headers: { Authorization: `Bearer ${DISPATCH_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ source: 'malwarebazaar', ...(opts.body ?? {}) }),
  });

  const res = await handleValidationAcquire(req, env);
  const text = await res.clone().text();
  let body: Record<string, unknown> = {};
  try {
    body = JSON.parse(text) as Record<string, unknown>;
  } catch {
    body = {};
  }
  return { res, status: res.status, text, body, jobs, identity, store, dispatchCalls, fetchCalls, logLines };
}

// ── GATE 1 — happy path ────────────────────────────────────────────

describe('M17.1G GATE 1 — acquire seam happy path (fake dependencies only)', () => {
  it('runs get_recent → select → get_info → get_file → AES-128 decode → SHA gate → R2 → D1 → dispatch', async () => {
    const { sha, zip } = await fixture();
    const h = await runAcquire({
      handlers: [
        () => recentJson(sha),
        () => infoJson(sha),
        () => new Response(zip, { status: 200 }),
      ],
      captureLogs: true,
    });

    expect(h.status).toBe(201);
    expect(h.body.sha256).toBe(sha);
    expect(h.body.status).toBe('DISPATCHED');

    // Provenance: source / query / selector / first_seen / sha256.
    const src = h.body.source as Record<string, unknown>;
    expect(src.name).toBe('MalwareBazaar');
    expect(src.query).toBe('get_recent');
    expect(src.selector).toBe('time');
    expect(src.first_seen_utc).toBe('2026-10-02T06:00:00.000Z');
    expect(h.body.size_bytes).toBe(50_000);

    // Wire calls: exactly one get_recent, one get_info, one get_file — no more.
    expect(h.fetchCalls.length).toBe(3);
    expect(h.fetchCalls[0]!.url).toBe(MB_URL);
    expect(h.fetchCalls[0]!.body).toBe('query=get_recent&selector=time');
    expect(h.fetchCalls[1]!.body).toBe(`query=get_info&hash=${sha}`);
    expect(h.fetchCalls[2]!.body).toBe(`query=get_file&sha256_hash=${sha}`);
    expect(h.fetchCalls.every((c) => c.redirect === 'manual')).toBe(true);
    expect(h.fetchCalls.every((c) => c.authKey === AUTH_KEY)).toBe(true);

    // R2 key + server-derived metadata.
    const key = `${ARTIFACT_KEY_PREFIX}${sha}`;
    expect(h.store.has(key)).toBe(true);
    const meta = h.store.get(key)!.customMetadata;
    expect(meta.sha256).toBe(sha);
    expect(meta.source_sha256).toBe(sha);
    expect(meta.source_query).toBe('get_recent');
    expect(meta.source_selector).toBe('time');
    expect(meta.source_first_seen_utc).toBe('2026-10-02T06:00:00.000Z');
    expect(meta.source_repo).toBe('MalwareBazaar');
    expect(h.store.get(key)!.bytes.length).toBe(50_000);

    // D1: exactly one validation job + one identity binding.
    expect(h.jobs.size).toBe(1);
    const job = [...h.jobs.values()][0]!;
    expect(job.status).toBe('DISPATCHED');
    expect(job.sha256).toBe(sha);
    expect(job.workflow_run_id).toBe(GITHUB_RUN_ID);
    expect(h.identity.size).toBe(1);

    // Dispatch received the exact validation artifact/job identity.
    expect(h.dispatchCalls.length).toBe(1);
    const d = h.dispatchCalls[0]!;
    expect(d.repo).toBe(TRUSTED_REPOSITORY);
    expect(d.ref).toBe(ALLOWED_VALIDATION_REF);
    expect(d.req.sha256).toBe(sha);
    expect(d.req.job_id).toBe(job.job_id);
    expect(d.req.artifact_id).toBe(`art_mbz_${sha.slice(0, 16)}`);

    // Auth-Key is never returned, persisted, or logged.
    expect(h.text.includes(AUTH_KEY)).toBe(false);
    expect(JSON.stringify(meta).includes(AUTH_KEY)).toBe(false);
    expect(JSON.stringify([...h.jobs.values()]).includes(AUTH_KEY)).toBe(false);
    expect(h.logLines.join('\n').includes(AUTH_KEY)).toBe(false);

    // Only validation-plane stores are referenced.
    expect(VALIDATION_ARTIFACT_BUCKET_NAME).toBe('zayron-x-malware-validation-storage');
  });
});

// ── GATE 3 — SHA gate ordering ─────────────────────────────────────

describe('M17.1G GATE 3 — SHA-256 gate precedes canonical R2', () => {
  it('decoded SHA != source SHA → 400 and NO R2 write, NO D1 job, NO dispatch', async () => {
    const { zip } = await fixture();
    // Source claims SHA_X; the decoded payload hashes to something else.
    const h = await runAcquire({
      handlers: [
        () => recentJson(SHA_X),
        () => infoJson(SHA_X),
        () => new Response(zip, { status: 200 }),
      ],
    });
    expect(h.status).toBe(400);
    expect(h.body.code).toBe('payload_identity_mismatch');
    expect(h.store.size).toBe(0); // payload never reached canonical R2
    expect(h.jobs.size).toBe(0);
    expect(h.dispatchCalls.length).toBe(0);
    // The decoded payload was still verified server-side (hash computed).
    expect(h.fetchCalls.length).toBe(3);
  });
});

// ── GATE 1 — failure paths (every one must terminate before dispatch) ─

describe('M17.1G GATE 1 — failure paths fail closed (no dispatch)', () => {
  async function assertNoDispatch(h: Awaited<ReturnType<typeof runAcquire>>) {
    expect(h.dispatchCalls.length).toBe(0);
    expect(h.status).not.toBe(201);
  }

  it('missing Auth-Key secret → 503 MALWAREBAZAAR_KEY_UNCONFIGURED', async () => {
    const { sha } = await fixture();
    const h = await runAcquire({ dropAuthKey: true, handlers: [() => recentJson(sha)] });
    expect(h.status).toBe(503);
    expect(h.body.code).toBe('MALWAREBAZAAR_KEY_UNCONFIGURED');
    expect(h.fetchCalls.length).toBe(0);
    await assertNoDispatch(h);
  });

  it('MalwareBazaar 401 → auth rejected, no further calls', async () => {
    const h = await runAcquire({ handlers: [() => new Response(null, { status: 401 })] });
    expect(h.status).toBe(401);
    expect(h.body.code).toBe('malwarebazaar_auth_rejected');
    expect(h.fetchCalls.length).toBe(1);
    await assertNoDispatch(h);
  });

  it('malformed get_recent JSON → 502', async () => {
    const h = await runAcquire({ handlers: [() => new Response(new TextEncoder().encode('{not json'), { status: 200 })] });
    expect(h.status).toBe(502);
    expect(h.body.code).toBe('malwarebazaar_malformed_json');
    await assertNoDispatch(h);
  });

  it('no fresh candidate → 404 no_source_candidates', async () => {
    const h = await runAcquire({ handlers: [() => jsonResponse({ query_status: 'ok', data: [] })] });
    expect(h.status).toBe(404);
    expect(h.body.code).toBe('no_source_candidates');
    await assertNoDispatch(h);
  });

  it('duplicate SHA-256 known in validation history → 409, no get_info/get_file', async () => {
    const { sha } = await fixture();
    const h = await runAcquire({
      handlers: [() => recentJson(sha)],
      jobs: [
        {
          job_id: 'job_prior',
          analysis_run_id: 'ar_prior',
          artifact_id: 'art_prior',
          sha256: sha,
          status: 'SUCCEEDED',
          workflow_run_id: '1',
          created_at: 't',
          updated_at: 't',
          dispatched_at: 't',
          dispatch_deadline_epoch: 1,
          toolchain_version: 'toolchain-1.0.0',
        },
      ],
    });
    expect(h.status).toBe(409);
    expect(h.body.code).toBe('no_eligible_source_candidate');
    expect(h.fetchCalls.length).toBe(1);
    expect(h.store.size).toBe(0);
    await assertNoDispatch(h);
  });

  it('duplicate discovered at the post-selection D1 guard → 409, no R2/D1/dispatch', async () => {
    const { sha, zip } = await fixture();
    const h = await runAcquire({
      handlers: [() => recentJson(sha), () => infoJson(sha), () => new Response(zip, { status: 200 })],
      existingJobBySha: { job_id: 'job_existing', status: 'QUEUED' },
    });
    expect(h.status).toBe(409);
    expect(h.body.code).toBe('duplicate_sample');
    expect(h.store.size).toBe(0);
    expect(h.jobs.size).toBe(0);
    await assertNoDispatch(h);
  });

  it('get_info hash mismatch → 400 get_info_rejected', async () => {
    const { sha } = await fixture();
    const h = await runAcquire({
      handlers: [() => recentJson(sha), () => infoJson(SHA_X)],
    });
    expect(h.status).toBe(400);
    expect(h.body.code).toBe('get_info_rejected');
    expect(h.fetchCalls.length).toBe(2);
    await assertNoDispatch(h);
  });

  it('get_file transport failure → 502, no decode/R2/dispatch', async () => {
    const { sha } = await fixture();
    const h = await runAcquire({
      handlers: [() => recentJson(sha), () => infoJson(sha), () => new Response(null, { status: 500 })],
    });
    expect(h.status).toBe(502);
    expect(h.body.code).toBe('malwarebazaar_http_error');
    expect(h.store.size).toBe(0);
    await assertNoDispatch(h);
  });

  it('wrong ZIP password → 400 archive_decode_failed', async () => {
    const { sha, payload } = await fixture();
    const wrongZip = await makeAesZip([{ name: 'sample.bin', bytes: payload }], 'not-infected');
    const h = await runAcquire({
      handlers: [() => recentJson(sha), () => infoJson(sha), () => new Response(wrongZip, { status: 200 })],
    });
    expect(h.status).toBe(400);
    expect(h.body.code).toBe('archive_decode_failed');
    expect(h.store.size).toBe(0);
    await assertNoDispatch(h);
  });

  it('malformed ZIP → 400 archive_decode_failed', async () => {
    const { sha } = await fixture();
    const garbage = makePayload(4096, 99);
    const h = await runAcquire({
      handlers: [() => recentJson(sha), () => infoJson(sha), () => new Response(garbage, { status: 200 })],
    });
    expect(h.status).toBe(400);
    expect(h.body.code).toBe('archive_decode_failed');
    await assertNoDispatch(h);
  });

  it('multiple payload entries → 400 archive_decode_failed', async () => {
    const { sha, payload } = await fixture();
    const multi = await makeAesZip([
      { name: 'sample.bin', bytes: payload },
      { name: 'extra.bin', bytes: payload.slice(0, 16) },
    ]);
    const h = await runAcquire({
      handlers: [() => recentJson(sha), () => infoJson(sha), () => new Response(multi, { status: 200 })],
    });
    expect(h.status).toBe(400);
    expect(h.body.code).toBe('archive_decode_failed');
    expect(h.store.size).toBe(0);
    await assertNoDispatch(h);
  });

  it('unsafe entry name (path traversal) → 400 archive_decode_failed', async () => {
    const { sha, payload } = await fixture();
    const unsafe = await makeAesZip([{ name: '../evil.bin', bytes: payload }]);
    const h = await runAcquire({
      handlers: [() => recentJson(sha), () => infoJson(sha), () => new Response(unsafe, { status: 200 })],
    });
    expect(h.status).toBe(400);
    expect(h.body.code).toBe('archive_decode_failed');
    await assertNoDispatch(h);
  });

  it('R2 write failure → 502, no D1 job, no dispatch', async () => {
    const { sha, zip } = await fixture();
    const h = await runAcquire({
      handlers: [() => recentJson(sha), () => infoJson(sha), () => new Response(zip, { status: 200 })],
      failPut: true,
    });
    expect(h.status).toBe(502);
    expect(h.jobs.size).toBe(0);
    await assertNoDispatch(h);
  });

  it('D1 conditional insert failure → 502, no dispatch', async () => {
    const { sha, zip } = await fixture();
    const h = await runAcquire({
      handlers: [() => recentJson(sha), () => infoJson(sha), () => new Response(zip, { status: 200 })],
      failInsert: true,
    });
    expect(h.status).toBe(502);
    expect(h.jobs.size).toBe(0);
    expect(h.identity.size).toBe(0);
    await assertNoDispatch(h);
  });

  it('operator skip-set can never force dispatch of an already-skipped identity', async () => {
    const { sha } = await fixture();
    const h = await runAcquire({
      handlers: [() => recentJson(sha)],
      body: { skip_sha256: [sha] },
    });
    expect(h.status).toBe(409);
    expect(h.body.code).toBe('no_eligible_source_candidate');
    await assertNoDispatch(h);
  });
});

// ── Isolation / mode guards ──────────────────────────────────────────

describe('M17.1G GATE 1 — validation-plane isolation guards', () => {
  it('production D1 binding → 500 PRODUCTION_BINDING_DETECTED, no network', async () => {
    const { sha } = await fixture();
    const h = await runAcquire({ handlers: [() => recentJson(sha)], databaseName: 'zayron-x-db' });
    expect(h.status).toBe(500);
    expect(h.body.code).toBe('PRODUCTION_BINDING_DETECTED');
    expect(h.fetchCalls.length).toBe(0);
    expect(h.dispatchCalls.length).toBe(0);
  });

  it('production R2 binding → 500 PRODUCTION_BINDING_DETECTED, no network', async () => {
    const { sha } = await fixture();
    const h = await runAcquire({ handlers: [() => recentJson(sha)], bucketName: 'zayron-x-storage' });
    expect(h.status).toBe(500);
    expect(h.body.code).toBe('PRODUCTION_BINDING_DETECTED');
    expect(h.fetchCalls.length).toBe(0);
  });

  it('non-validation mode → 503 VALIDATION_MODE_REQUIRED, no network', async () => {
    const { sha } = await fixture();
    const h = await runAcquire({ handlers: [() => recentJson(sha)], validationMode: 'false' });
    expect(h.status).toBe(503);
    expect(h.body.code).toBe('VALIDATION_MODE_REQUIRED');
    expect(h.fetchCalls.length).toBe(0);
  });
});

// ── GATE 2 — memory budget of the transport + decode path ───────────

describe('M17.1G GATE 2 — bounded peak memory', () => {
  it('bounds the transport + decode working set well under the 128 MiB isolate limit', () => {
    const MiB = 1024 * 1024;
    // read phase ~= 2x archive; decode phase ~= archive + 2x payload.
    const peakWorkingSet = Math.max(
      2 * MALWAREBAZAAR_MAX_ARCHIVE_BYTES,
      MALWAREBAZAAR_MAX_ARCHIVE_BYTES + 2 * MALWAREBAZAAR_MAX_PAYLOAD_BYTES
    );
    expect(peakWorkingSet).toBeLessThanOrEqual(64 * MiB);
    expect(MALWAREBAZAAR_MAX_ARCHIVE_BYTES).toBeLessThanOrEqual(32 * MiB);
    expect(MALWAREBAZAAR_MAX_PAYLOAD_BYTES).toBeLessThanOrEqual(16 * MiB);
    // A candidate larger than the payload cap must never be selected.
    expect(MALWAREBAZAAR_MAX_SAMPLE_BYTES).toBeLessThanOrEqual(MALWAREBAZAAR_MAX_PAYLOAD_BYTES);
    // The decoder module default must not exceed the enforced worker cap.
    expect(MALWAREBAZAAR_ARCHIVE_MAX_BYTES).toBeLessThanOrEqual(MALWAREBAZAAR_MAX_PAYLOAD_BYTES);
  });
});

// ── Decoder size bounds (GATE 2 companion coverage) ──────────────────

describe('M17.1G decoder size bounds (fail closed)', () => {
  it('rejects a payload whose declared uncompressed size exceeds maxBytes', async () => {
    const payload = makePayload(200_000, 3);
    const zip = await makeAesZip([{ name: 'sample.bin', bytes: payload }]);
    const r = await decodeMalwareBazaarArchive(zip, { maxBytes: 1024 });
    expect(r.status).toBe('REJECTED_TOO_LARGE');
    expect(r.bytes).toBeNull();
  });

  it('rejects a stored entry whose compressed size exceeds maxBytes', async () => {
    const payload = makePayload(200_000, 4);
    const zip = await makeAesZip([{ name: 'sample.bin', bytes: payload }]);
    const r = await decodeMalwareBazaarArchive(zip, { maxBytes: 1024 });
    expect(r.status).toBe('REJECTED_TOO_LARGE');
    expect(r.bytes).toBeNull();
  });

  it('bounds BOTH compressed and uncompressed entry sizes (AES container overhead included)', async () => {
    const payload = makePayload(4096, 5);
    const zip = await makeAesZip([{ name: 'sample.bin', bytes: payload }]);
    // A stored WinZip-AES entry stores encrypted data = payload + salt + auth
    // code, so the compressed size is slightly larger than the payload. Both
    // the compressed and the uncompressed bound must be honoured.
    expect((await decodeMalwareBazaarArchive(zip, { maxBytes: 4096 + 64 })).status).toBe('DECODED');
    expect((await decodeMalwareBazaarArchive(zip, { maxBytes: 4096 })).status).toBe('REJECTED_TOO_LARGE');
  });
});
