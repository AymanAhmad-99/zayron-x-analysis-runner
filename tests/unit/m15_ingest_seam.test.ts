/**
 * M15.2 — Trusted GitHub acquisition gate tests (deterministic mocks).
 *
 * Proves the caller-bytes path is GONE: the platform fetches the artifact
 * bytes itself from the fixed allowlisted GitHub origins at an immutable
 * commit; request fields are candidate hints only; every gate fails closed
 * with zero writes.
 */
import { describe, it, expect, beforeEach, afterEach } from 'bun:test';

import {
  handleIngest,
  GITHUB_FEED_API_ORIGIN,
  GITHUB_FEED_RAW_ORIGIN,
  GITHUB_FEED_REPO_SLUG,
  INGEST_DISPATCH_DEADLINE_SECONDS,
  type Env,
} from '../../workers/malware-validation/src/index';

// ── Mocks ────────────────────────────────────────────────────────

type Row = Record<string, unknown>;

function makeEnv() {
  const jobs = new Map<string, Row>();
  const reports = new Map<string, Row>();
  const r2 = new Map<string, { size: number; customMetadata: Record<string, string> }>();
  const dispatchCalls: unknown[] = [];
  const fetchLog: Array<{ url: string; init?: RequestInit }> = [];

  const db = {
    prepare(sql: string) {
      return {
        bind(...args: unknown[]) {
          return {
            async first<T>(): Promise<T | null> {
              if (sql.includes('FROM malware_validation_jobs WHERE sha256 = ?')) {
                const sha = args[0] as string;
                for (const j of jobs.values()) if (j.sha256 === sha) return j as T;
                return null;
              }
              if (sql.includes('FROM malware_reports WHERE sha256 = ?')) {
                const sha = args[0] as string;
                for (const r of reports.values()) if (r.sha256 === sha) return r as T;
                return null;
              }
              return null;
            },
            async all<T>(): Promise<{ results: T[] }> { return { results: [] as T[] }; },
            async run(): Promise<unknown> {
              if (sql.startsWith('INSERT INTO malware_validation_jobs') && sql.includes('WHERE NOT EXISTS')) {
                const sha = args[7] as string;
                for (const j of jobs.values()) {
                  if (String(j.sha256).toLowerCase() === sha) return { meta: { changes: 0 } };
                }
                jobs.set(args[0] as string, {
                  job_id: args[0], analysis_run_id: args[1], artifact_id: args[2],
                  sha256: args[3], status: 'QUEUED', workflow_run_id: null,
                  created_at: args[4], updated_at: args[5], dispatched_at: null,
                  dispatch_deadline_epoch: args[6], toolchain_version: 'toolchain-1.0.0',
                });
                return { meta: { changes: 1 } };
              }
              return {};
            },
          };
        },
      };
    },
    all<T>(): Promise<{ results: T[] }> { return Promise.resolve({ results: [] as T[] }); },
    exec(): Promise<unknown> { return Promise.resolve({}); },
  };

  const bucket = {
    async get(key: string) {
      const o = r2.get(key);
      if (!o) return null;
      return { body: new ReadableStream(), size: o.size };
    },
    async head(key: string) {
      const o = r2.get(key);
      if (!o) return null;
      return { size: o.size, customMetadata: o.customMetadata };
    },
    async put(key: string, value: unknown, options?: { customMetadata?: Record<string, string> }) {
      // Simulates an R2 write failure when injected by a test.
      if (r2Fail) throw new Error('r2_put_failed');
      const byteLength = value instanceof Uint8Array ? value.length : (value as { byteLength?: number })?.byteLength ?? 0;
      r2.set(key, { size: injectedSizeOverride ?? byteLength, customMetadata: options?.customMetadata ?? {} });
      return {};
    },
  };
  let r2Fail = false;
  let injectedSizeOverride: number | null = null;

  const env: Env = {
    DB: db as unknown as Env['DB'],
    GITHUB_APP_ID: '',
    GITHUB_APP_INSTALLATION_ID: '',
    GITHUB_APP_PRIVATE_KEY: '',
    ANALYSIS_CALLBACK_SECRET: 'm152-test-secret',
    STAGING_CALLBACK_BASE_URL: 'https://staging.test',
    STAGING_ARTIFACT_BASE_URL: 'https://staging.test',
    ARTIFACT_BUCKET: bucket as unknown as Env['ARTIFACT_BUCKET'],
    __TEST_DISPATCH_CLIENT: {
      async dispatchWorkflow() { dispatchCalls.push(1); return { ok: true }; },
    } as never,
  };

  return {
    env, jobs, reports, r2, dispatchCalls, fetchLog,
    setR2Fail: (v: boolean) => { r2Fail = v; },
    setSizeOverride: (v: number | null) => { injectedSizeOverride = v; },
  };
}

// ── GitHub mocks ─────────────────────────────────────────────────

const COMMIT = 'a'.repeat(40);
const TREE_SHA = 'b'.repeat(40);

async function sha256HexOf(bytes: Uint8Array): Promise<string> {
  const d = await crypto.subtle.digest('SHA-256', bytes as unknown as ArrayBuffer);
  return Array.from(new Uint8Array(d), (b) => b.toString(16).padStart(2, '0')).join('');
}

function makeSample(size = 20_000): Uint8Array {
  const bytes = new Uint8Array(size);
  bytes[0] = 0x4d; bytes[1] = 0x5a; // PE magic
  for (let i = 2; i < size; i++) bytes[i] = (i * 7) % 251;
  return bytes;
}

function treeEntryFor(sha: string, size = 20_000): { path: string; type: string; size: number } {
  return { path: `2020.06.22_FBI-FLASH/${sha}`, type: 'blob', size };
}

/**
 * A SELF-CONSISTENT fixture: bytes whose actual SHA-256 equals the tree
 * basename — i.e. what the real Malware-Feed naming contract guarantees.
 * (In the trusted path a tree-declared identity that differs from the fetched
 * bytes is exactly the github_sha256_mismatch gate — see CASE C.)
 */
async function makeValidFixture(size = 20_000): Promise<{ bytes: Uint8Array; sha: string }> {
  const bytes = makeSample(size);
  return { bytes, sha: await sha256HexOf(bytes) };
}

/** Installs a global fetch mock covering the API + raw allowlisted origins. */
function installGithubFetch(
  ctx: ReturnType<typeof makeEnv>,
  opts: {
    treeEntries?: Array<{ path: string; type: string; size: number }>;
    truncated?: boolean;
    blobBytes?: Uint8Array | null;
    blobStatus?: number;
    redirect?: string | null;
    repoStatus?: number;
  } = {}
): void {
  const treeEntries = opts.treeEntries ?? [treeEntryFor('c'.repeat(64))];
  const realFetch = globalThis.fetch;
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const url = String(input);
    ctx.fetchLog.push({ url, init });
    if (url.startsWith(GITHUB_FEED_API_ORIGIN)) {
      if (url.endsWith(`/repos/${GITHUB_FEED_REPO_SLUG}`)) {
        if (opts.repoStatus) return new Response('nope', { status: opts.repoStatus });
        return Response.json({ default_branch: 'master' });
      }
      if (url.includes('/git/ref/heads/')) {
        return Response.json({ object: { sha: COMMIT } });
      }
      if (url.includes('/git/commits/')) {
        return Response.json({ sha: COMMIT, commit: { tree: { sha: TREE_SHA } } });
      }
      if (url.includes('/git/trees/')) {
        return Response.json({ sha: TREE_SHA, truncated: opts.truncated ?? false, tree: treeEntries });
      }
      return new Response('not found', { status: 404 });
    }
    if (url.startsWith(GITHUB_FEED_RAW_ORIGIN)) {
      if (opts.redirect) {
        return new Response(null, { status: 301, headers: { Location: opts.redirect } });
      }
      if (opts.blobStatus) return new Response('err', { status: opts.blobStatus });
      if (!opts.blobBytes) return new Response('not found', { status: 404 });
      return new Response(new Blob([opts.blobBytes as unknown as BlobPart]));
    }
    throw new Error(`unexpected fetch: ${url}`);
  }) as typeof fetch;
  return () => { globalThis.fetch = realFetch; };
}

async function signIngest(env: Env, ts: string, rawBody: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw', new TextEncoder().encode(env.ANALYSIS_CALLBACK_SECRET), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(`${ts}.${rawBody}`));
  return Array.from(new Uint8Array(sig), (b) => b.toString(16).padStart(2, '0')).join('');
}

async function ingestRequest(
  env: Env,
  over: Record<string, unknown> = {},
  rawBody?: string
): Promise<Request> {
  const body = rawBody ?? JSON.stringify({
    source_id: 'src_github_malware_feed',
    ...over,
  });
  const ts = String(Date.now());
  const signature = await signIngest(env, ts, body);
  return new Request('https://staging.test/internal/analysis/github/ingest', {
    method: 'POST',
    headers: { 'X-ZX-Ingest-Timestamp': ts, 'X-ZX-Ingest-Signature': signature, 'Content-Type': 'application/json' },
    body,
  });
}

let restoreFetch: (() => void) | null = null;
beforeEach(() => { restoreFetch = null; });
afterEach(() => { if (restoreFetch) restoreFetch(); });

// ── Security cases (Step 17) ─────────────────────────────────────

describe('M15.2 trusted acquisition — security gates', () => {
  it('invalid auth → 401, zero writes, ZERO GitHub fetches', async () => {
    const ctx = makeEnv();
    const sha = 'c'.repeat(64);
    restoreFetch = installGithubFetch(ctx, { treeEntries: [treeEntryFor(sha)] });
    // Sign body A, transmit body B: the signature must not verify.
    const signedBody = JSON.stringify({ source_id: 'src_github_malware_feed' });
    const ts = String(Date.now());
    const signature = await signIngest(ctx.env, ts, signedBody);
    const req = new Request('https://staging.test/internal/analysis/github/ingest', {
      method: 'POST',
      headers: { 'X-ZX-Ingest-Timestamp': ts, 'X-ZX-Ingest-Signature': signature },
      body: `${signedBody}tampered`,
    });
    const res = await handleIngest(req, ctx.env);
    expect(res.status).toBe(401);
    expect(ctx.jobs.size).toBe(0);
    expect(ctx.r2.size).toBe(0);
    expect(ctx.fetchLog.length).toBe(0); // auth precedes ALL GitHub transport
  });

  it('CASE A — fake repo_path hint (not in tree) → candidate_not_found, 0 writes', async () => {
    const ctx = makeEnv();
    const sha = 'c'.repeat(64);
    restoreFetch = installGithubFetch(ctx, { treeEntries: [treeEntryFor(sha)] });
    const req = await ingestRequest(ctx.env, { repo_path: `nonexistent/path/${sha}` });
    const res = await handleIngest(req, ctx.env);
    expect(res.status).toBe(404);
    expect(await res.json()).toMatchObject({ code: 'candidate_not_found' });
    expect(ctx.jobs.size).toBe(0);
    expect(ctx.r2.size).toBe(0);
  });

  it('CASE B — valid path + wrong declared SHA hint → candidate_identity_mismatch, 0 writes', async () => {
    const ctx = makeEnv();
    const sha = 'c'.repeat(64);
    restoreFetch = installGithubFetch(ctx, { treeEntries: [treeEntryFor(sha)] });
    const req = await ingestRequest(ctx.env, { declared_sha256: 'd'.repeat(64) });
    const res = await handleIngest(req, ctx.env);
    expect(res.status).toBe(409);
    expect(await res.json()).toMatchObject({ code: 'candidate_identity_mismatch' });
    expect(ctx.jobs.size).toBe(0);
    expect(ctx.r2.size).toBe(0);
  });

  it('CASE C — tree-declared identity != fetched bytes hash → github_sha256_mismatch, 0 writes', async () => {
    const ctx = makeEnv();
    const declared = 'c'.repeat(64); // tree basename declares this…
    const actual = makeSample();     // …but the blob bytes hash to something else
    restoreFetch = installGithubFetch(ctx, {
      treeEntries: [treeEntryFor(declared)],
      blobBytes: actual,
    });
    const req = await ingestRequest(ctx.env);
    const res = await handleIngest(req, ctx.env);
    expect(res.status).toBe(400);
    expect(await res.json()).toMatchObject({ code: 'github_sha256_mismatch' });
    expect(ctx.jobs.size).toBe(0);
    expect(ctx.r2.size).toBe(0);
  });

  it('CASE D — NO request field can inject bytes: arbitrary-byte bodies are inert hints', async () => {
    const ctx = makeEnv();
    const { bytes, sha } = await makeValidFixture();
    restoreFetch = installGithubFetch(ctx, { treeEntries: [treeEntryFor(sha)], blobBytes: bytes });
    const req = await ingestRequest(ctx.env, {
      artifact_bytes_base64: 'UEsDBBQAAAAI', // legacy byte-injection field, ignored
      sample_locator: 'https://attacker.example/payload',
      bytes: 'anything',
    });
    const res = await handleIngest(req, ctx.env);
    // The legacy field is simply absent from the contract — the platform
    // fetched the canonical candidate's real bytes instead.
    expect(res.status).toBe(201);
    const payload = await res.json() as Record<string, unknown>;
    expect(payload.sha256).toBe(sha);
    // The fetched URL was derived from the fixed repo + commit + canonical path.
    expect(ctx.fetchLog.some((f) => f.url.includes(GITHUB_FEED_RAW_ORIGIN))).toBe(true);
    expect(ctx.fetchLog.every((f) => !f.url.includes('attacker.example'))).toBe(true);
  });

  it('CASE E — arbitrary hostname in hints can never be fetched (origin allowlist)', async () => {
    const ctx = makeEnv();
    const { bytes, sha } = await makeValidFixture();
    restoreFetch = installGithubFetch(ctx, { treeEntries: [treeEntryFor(sha)], blobBytes: bytes });
    const req = await ingestRequest(ctx.env, { repo_path: 'https://attacker.example/x' });
    const res = await handleIngest(req, ctx.env);
    expect(res.status).toBe(404); // hint fails tree validation → candidate_not_found
    expect(ctx.fetchLog.every((f) => f.url.startsWith(GITHUB_FEED_API_ORIGIN) || f.url.startsWith(GITHUB_FEED_RAW_ORIGIN))).toBe(true);
  });

  it('CASE F — acquisition URL pins the IMMUTABLE commit SHA, never the branch', async () => {
    const ctx = makeEnv();
    const { bytes, sha } = await makeValidFixture();
    restoreFetch = installGithubFetch(ctx, { treeEntries: [treeEntryFor(sha)], blobBytes: bytes });
    const req = await ingestRequest(ctx.env);
    const res = await handleIngest(req, ctx.env);
    expect(res.status).toBe(201);
    const rawUrl = ctx.fetchLog.map((f) => f.url).find((u) => u.startsWith(GITHUB_FEED_RAW_ORIGIN))!;
    expect(rawUrl).toBe(`${GITHUB_FEED_RAW_ORIGIN}/${GITHUB_FEED_REPO_SLUG}/${COMMIT}/2020.06.22_FBI-FLASH/${sha}`);
    expect(rawUrl).not.toContain('/master/');
  });

  it('CASE G — candidate metadata vs bytes: platform fetches BY the candidate, mismatch is impossible by construction', async () => {
    // With caller bytes removed, the A-metadata/B-bytes attack has no vector:
    // bytes come from the same URL the candidate path produced. The remaining
    // mismatch (repo mutated) is CASE C. Assert the platform ignores any
    // caller "byte-ish" hint and acquires the candidate it selected.
    const ctx = makeEnv();
    const a = await makeValidFixture();
    const b = await makeValidFixture(25_000);
    // The mock raw origin serves EACH candidate's own bytes by basename —
    // mirroring the real feed, where a path's bytes are that file's bytes.
    const blobByBasename = new Map([[a.sha, a.bytes], [b.sha, b.bytes]]);
    restoreFetch = installGithubFetch(ctx, {
      treeEntries: [treeEntryFor(a.sha), treeEntryFor(b.sha, 25_000)],
    });
    const realFetch = globalThis.fetch;
    globalThis.fetch = (async (input: RequestInfo | URL): Promise<Response> => {
      const url = String(input);
      if (url.startsWith(GITHUB_FEED_RAW_ORIGIN)) {
        const bytes = blobByBasename.get(url.split('/').pop() ?? '');
        return bytes
          ? new Response(new Blob([bytes as unknown as BlobPart]))
          : new Response('not found', { status: 404 });
      }
      return realFetch(input as Request);
    }) as typeof fetch;
    // The deterministic selector sorts by repo_path — compute which candidate
    // that is rather than assuming insertion order.
    const firstPath = [a.sha, b.sha].sort()[0];
    const expectedSha = firstPath === a.sha ? a.sha : b.sha;
    const req = await ingestRequest(ctx.env, { declared_sha256: expectedSha });
    const res = await handleIngest(req, ctx.env);
    // The selector's chosen candidate is fetched by ITS canonical path and
    // its identity is enforced against the fetched bytes.
    expect(res.status).toBe(201);
    expect((await res.json() as Record<string, unknown>).sha256).toBe(expectedSha);
  });

  it('CASE H — duplicate SHA → 409, no second job, no R2 overwrite', async () => {
    const ctx = makeEnv();
    const { bytes, sha } = await makeValidFixture();
    restoreFetch = installGithubFetch(ctx, { treeEntries: [treeEntryFor(sha)], blobBytes: bytes });
    ctx.jobs.set('job_pre', {
      job_id: 'job_pre', sha256: sha, status: 'SUCCEEDED', workflow_run_id: null,
      created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
      dispatched_at: new Date().toISOString(), dispatch_deadline_epoch: 0,
      analysis_run_id: 'ar_pre', artifact_id: 'art_pre', toolchain_version: 'toolchain-1.0.0',
    });
    const req = await ingestRequest(ctx.env);
    const res = await handleIngest(req, ctx.env);
    expect(res.status).toBe(409);
    expect(ctx.jobs.size).toBe(1);
    expect(ctx.r2.size).toBe(0);
  });

  it('CASE I — GitHub unavailable → bounded failure, no partial R2/D1 state', async () => {
    const ctx = makeEnv();
    restoreFetch = installGithubFetch(ctx, { repoStatus: 500 });
    const req = await ingestRequest(ctx.env);
    const res = await handleIngest(req, ctx.env);
    // HTTP 500 from the API maps to the bounded github_fetch_failed family;
    // the invariant under test is zero partial state.
    expect(res.status).toBe(502);
    expect(await res.json()).toMatchObject({ code: 'github_fetch_failed' });
    expect(ctx.jobs.size).toBe(0);
    expect(ctx.r2.size).toBe(0);
  });

  it('CASE J — R2 failure after successful GitHub fetch → no D1 job', async () => {
    const ctx = makeEnv();
    const { bytes, sha } = await makeValidFixture();
    restoreFetch = installGithubFetch(ctx, { treeEntries: [treeEntryFor(sha)], blobBytes: bytes });
    ctx.setR2Fail(true);
    const req = await ingestRequest(ctx.env);
    let caught = false;
    try {
      await handleIngest(req, ctx.env);
    } catch {
      caught = true; // handler surfaces the storage failure (fail-closed)
    }
    expect(caught).toBe(true);
    expect(ctx.jobs.size).toBe(0);
  });

  it('oversized GitHub response → bounded failure, 0 writes', async () => {
    const ctx = makeEnv();
    restoreFetch = installGithubFetch(ctx, { treeEntries: [treeEntryFor('c'.repeat(64))] });
    // Stream > the 64 MiB cap: the loop-based reader must abort mid-stream and
    // the handler must fail closed with zero writes.
    const realFetch = globalThis.fetch;
    globalThis.fetch = (async (input: RequestInfo | URL): Promise<Response> => {
      const url = String(input);
      if (url.startsWith(GITHUB_FEED_RAW_ORIGIN)) {
        const big = new ReadableStream({
          start(c) {
            const mb = new Uint8Array(1024 * 1024);
            for (let i = 0; i < 70; i++) c.enqueue(mb); // 70 MiB > cap
            c.close();
          },
        });
        return new Response(big);
      }
      return realFetch(input as Request);
    }) as typeof fetch;
    const req = await ingestRequest(ctx.env);
    const res = await handleIngest(req, ctx.env);
    expect(res.status).toBe(413);
    expect(await res.json()).toMatchObject({ code: 'github_response_too_large' });
    expect(ctx.jobs.size).toBe(0);
    expect(ctx.r2.size).toBe(0);
  });

  it('redirect from raw origin → rejected (redirect: error), 0 writes', async () => {
    const ctx = makeEnv();
    const sha = 'c'.repeat(64);
    restoreFetch = installGithubFetch(ctx, {
      treeEntries: [treeEntryFor(sha)],
      blobBytes: makeSample(),
      redirect: 'https://attacker.example/payload',
    });
    const req = await ingestRequest(ctx.env);
    let caught = false;
    try {
      await handleIngest(req, ctx.env);
    } catch {
      caught = true; // bun fetch throws on redirect:'error' — fail-closed
    }
    expect(caught || ctx.r2.size === 0).toBe(true);
    expect(ctx.jobs.size).toBe(0);
  });
});

// ── Happy path + semantics ───────────────────────────────────────

describe('M15.2 trusted acquisition — happy path', () => {
  it('valid acquisition → 201, R2 object with GitHub provenance, exactly one QUEUED job, deadline ≈ +3600, zero dispatches', async () => {
    const ctx = makeEnv();
    const { bytes, sha } = await makeValidFixture();
    restoreFetch = installGithubFetch(ctx, { treeEntries: [treeEntryFor(sha)], blobBytes: bytes });
    const req = await ingestRequest(ctx.env);
    const res = await handleIngest(req, ctx.env);
    expect(res.status).toBe(201);

    const payload = await res.json() as Record<string, unknown>;
    expect(payload.status).toBe('QUEUED');
    expect(payload.sha256).toBe(sha);
    expect(payload.dispatched_at).toBeNull();
    expect(payload.workflow_run_id).toBeNull();
    expect((payload.github as Record<string, unknown>).commit).toBe(COMMIT);
    expect((payload.github as Record<string, unknown>).repo).toBe(GITHUB_FEED_REPO_SLUG);
    expect(String(payload.artifact_id)).toMatch(/^art_gmf_/);

    expect(ctx.r2.size).toBe(1);
    const obj = [...ctx.r2.values()][0];
    expect(obj.customMetadata.sha256).toBe(sha);
    expect(obj.customMetadata.source_repo).toBe(GITHUB_FEED_REPO_SLUG);
    expect(obj.customMetadata.source_commit).toBe(COMMIT);
    expect(obj.customMetadata.source_branch).toBe('master');
    expect(obj.customMetadata.source_id).toBe('src_github_malware_feed');
    expect(obj.customMetadata.source_path).toContain(sha);

    expect(ctx.jobs.size).toBe(1);
    const job = [...ctx.jobs.values()][0];
    expect(job.status).toBe('QUEUED');
    expect(job.dispatched_at).toBeNull();
    const deadline = job.dispatch_deadline_epoch as number;
    const nowEpoch = Math.floor(Date.now() / 1000);
    expect(deadline).toBeGreaterThan(nowEpoch + INGEST_DISPATCH_DEADLINE_SECONDS - 30);
    expect(deadline).toBeLessThan(nowEpoch + INGEST_DISPATCH_DEADLINE_SECONDS + 30);
    expect(ctx.dispatchCalls.length).toBe(0);
  });

  it('wrong source_id → 400 before ANY GitHub fetch', async () => {
    const ctx = makeEnv();
    restoreFetch = installGithubFetch(ctx, { treeEntries: [treeEntryFor('c'.repeat(64))] });
    const req = await ingestRequest(ctx.env, { source_id: 'src_other' });
    const res = await handleIngest(req, ctx.env);
    expect(res.status).toBe(400);
    expect(ctx.fetchLog.length).toBe(0);
  });

  it('tree truncated → bounded github_tree_unavailable, 0 writes', async () => {
    const ctx = makeEnv();
    restoreFetch = installGithubFetch(ctx, { truncated: true });
    const req = await ingestRequest(ctx.env);
    const res = await handleIngest(req, ctx.env);
    expect(res.status).toBe(502);
    expect(await res.json()).toMatchObject({ code: 'github_tree_unavailable' });
    expect(ctx.jobs.size).toBe(0);
  });

  it('acceptance semantics: distinct candidates via skip-set hints produce distinct jobs (3 iterations)', async () => {
    const ctx = makeEnv();
    // Three SELF-CONSISTENT candidates, served per-basename by the mock raw origin.
    const fixtures = [await makeValidFixture(20_000), await makeValidFixture(21_000), await makeValidFixture(22_000)];
    const blobByBasename = new Map(fixtures.map((f) => [f.sha, f.bytes]));
    restoreFetch = installGithubFetch(ctx, {
      treeEntries: fixtures.map((f, i) => treeEntryFor(f.sha, 20_000 + i)),
    });
    const realFetch = globalThis.fetch;
    globalThis.fetch = (async (input: RequestInfo | URL): Promise<Response> => {
      const url = String(input);
      if (url.startsWith(GITHUB_FEED_RAW_ORIGIN)) {
        const base = url.split('/').pop() ?? '';
        const bytes = blobByBasename.get(base);
        return bytes
          ? new Response(new Blob([bytes as unknown as BlobPart]))
          : new Response('not found', { status: 404 });
      }
      return realFetch(input as Request);
    }) as typeof fetch;
    const seen: string[] = [];
    for (let i = 0; i < 3; i++) {
      const req = await ingestRequest(ctx.env, { already_analyzed_sha256: seen });
      const res = await handleIngest(req, ctx.env);
      expect(res.status).toBe(201);
      const payload = await res.json() as Record<string, unknown>;
      expect(payload.sha256).toBe(fixtures[i].sha); // deterministic sorted-path order
      seen.push(fixtures[i].sha);
    }
    expect(ctx.jobs.size).toBe(3);
    expect(new Set([...ctx.jobs.values()].map((j) => j.sha256)).size).toBe(3);
    expect(ctx.dispatchCalls.length).toBe(0);
  });
});
