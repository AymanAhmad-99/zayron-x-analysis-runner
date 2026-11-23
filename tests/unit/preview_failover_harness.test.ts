/**
 * PREVIEW-ONLY durable failover verification harness — regression suite.
 *
 * Proves the properties that make the harness SAFE to arm on Preview, and that
 * the transitions it demonstrates are the PRODUCTION ones. Every assertion here
 * uses injected, network-free providers: no Cloudflare neuron and no Gemini
 * request is consumed by this file.
 *
 * Required proofs (task §3):
 *   1. a synthetic confirmed daily-allocation signal is classified correctly
 *   2. the shared state-transition function persists the correct UTC-period state
 *   3. a separate request context reloads the state from the store, not memory
 *   4. subsequent requests in the isolated context bypass Cloudflare
 *   5. temporary capacity errors remain transient
 *   6. period rollover permits Cloudflare to be attempted again
 *   7. a missing secondary credential fails explicitly, never looping back
 *   8. embedding operations remain unaffected
 *   9. the harness cannot affect production configuration or live provider state
 */
import { beforeEach, describe, expect, it } from 'bun:test';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import {
  __resetAIProviderCircuits,
  classifyAIError,
  evaluateHarnessAccess,
  HARNESS_CODE_DISABLED,
  HARNESS_CODE_PREVIEW_ONLY,
  HARNESS_DISABLED_VALUE,
  HARNESS_ENABLED_VALUE,
  HARNESS_ENABLE_VAR,
  HARNESS_GROUNDED_PAYLOAD,
  HARNESS_SCOPE_PREFIX,
  HARNESS_SYNTHETIC_CAPACITY_CODE,
  HARNESS_SYNTHETIC_ERROR_CODE,
  PROVIDER_REASON_DAILY_ALLOCATION_EXHAUSTED,
  nextQuotaReset,
  quotaPeriodFor,
  runPreviewFailoverHarness,
  scopedProviderStatePort,
  syntheticCapacityError,
  syntheticQuotaExhaustionError,
  type AIProviderName,
  type AIProviderStatePort,
  type AIProviderStateRecord,
  type HarnessRunResult,
} from '@zayron/intelligence';
// The REAL D1-backed port the Preview route uses (not a re-implementation), so
// the harness is exercised through the code that actually ships.
import { createD1ProviderStatePort } from '../../workers/api/src/aiProviderState';

// ── a store double that models D1: durable across separate port instances ────

interface MockStore {
  rows: Map<string, AIProviderStateRecord>;
  /** A fresh port over the SAME backing store = a separate request/instance. */
  newPort(): AIProviderStatePort;
}

function makeStore(seed?: Array<[string, AIProviderStateRecord]>): MockStore {
  const rows = new Map<string, AIProviderStateRecord>(seed ?? []);
  return {
    rows,
    newPort(): AIProviderStatePort {
      return {
        async load(provider: AIProviderName) {
          const row = rows.get(provider);
          return row ? { ...row } : null;
        },
        async save(record) {
          rows.set(record.provider, { ...record });
        },
      };
    },
  };
}

async function runHarness(store: MockStore, now: Date = new Date()): Promise<HarnessRunResult> {
  return runPreviewFailoverHarness({ port: store.newPort(), now });
}

function check(result: HarnessRunResult, id: string) {
  const found = result.checks.find((c) => c.id === id);
  if (!found) throw new Error(`harness check '${id}' was not reported`);
  return found;
}

/** Keys the harness owns: everything under the namespace prefix, and nothing else. */
function nonHarnessKeys(store: MockStore): string[] {
  return [...store.rows.keys()].filter((key) => !key.startsWith(HARNESS_SCOPE_PREFIX));
}

beforeEach(() => {
  __resetAIProviderCircuits();
});

// ── 1. the synthetic signal is the real condition, classified by the real code ─

describe('1 — the synthetic exhaustion signal is the documented condition', () => {
  it('reproduces Cloudflare\u2019s own 429/3036 daily-allocation evidence', () => {
    const error = syntheticQuotaExhaustionError();
    expect((error as any).code).toBe(HARNESS_SYNTHETIC_ERROR_CODE);
    expect(error.message).toContain('daily free allocation of 10,000 neurons');
  });

  it('is classified QUOTA_EXHAUSTED by the production classifier \u2014 not RATE_LIMITED', () => {
    // The exact regression the whole feature exists for: a bare 429 was transient.
    expect(classifyAIError(syntheticQuotaExhaustionError())).toBe('QUOTA_EXHAUSTED');
    expect(classifyAIError(syntheticQuotaExhaustionError(), 429)).toBe('QUOTA_EXHAUSTED');
  });

  it('keeps capacity overload distinct from a spent daily allocation', () => {
    expect((syntheticCapacityError() as any).code).toBe(HARNESS_SYNTHETIC_CAPACITY_CODE);
    expect(classifyAIError(syntheticCapacityError())).toBe('UNAVAILABLE');
    expect(classifyAIError(syntheticCapacityError())).not.toBe('QUOTA_EXHAUSTED');
  });
});

// ── 2. persistence through the shared reducer ────────────────────────────────

describe('2 — the shared state-transition function persists the UTC period', () => {
  it('writes EXHAUSTED with the correct period, reason and reset instant', async () => {
    // The adapter deliberately has NO injected-clock seam: production must record the
    // period it is actually in (`baseAnalysisInput` states this outright — "no
    // timestamp is injected into the analysis input itself"). A frozen fixture date
    // therefore asserted a guarantee this contract does not make, and could only pass
    // on the single calendar day whose UTC date happened to match the literal. Anchor
    // on the current UTC period, and assert the invariant the literal could not
    // express: the reset instant belongs to that period and falls within 24h of the
    // moment the failure was observed.
    const now = new Date();
    const store = makeStore();
    const result = await runHarness(store, now);

    const persisted = result.persisted_state;
    expect(persisted).not.toBeNull();
    expect(persisted?.availability).toBe('EXHAUSTED');
    expect(persisted?.quota_period).toBe(quotaPeriodFor(now));
    expect(persisted?.reason).toBe(PROVIDER_REASON_DAILY_ALLOCATION_EXHAUSTED);
    expect(persisted?.reset_at).toBe(nextQuotaReset(now));
    const observedMs = Date.parse(persisted!.observed_at);
    const resetMs = Date.parse(persisted!.reset_at);
    expect(resetMs).toBeGreaterThan(observedMs);
    expect(resetMs - observedMs).toBeLessThanOrEqual(86_400_000);
    // The reset instant is the next 00:00Z after the persisted period, not merely
    // some later timestamp that happens to satisfy the bound above.
    expect(persisted?.reset_at.slice(0, 10)).toBe(
      new Date(Date.parse(`${persisted?.quota_period}T00:00:00.000Z`) + 86_400_000).toISOString().slice(0, 10),
    );
    // The evidence persisted is the provider's OWN message, never a synthesis.
    expect(persisted?.evidence).toContain('daily free allocation');
  });

  it('records the transition steps it claims to have exercised', async () => {
    const result = await runHarness(makeStore());
    const ids = result.steps.map((s) => s.id);
    expect(ids).toEqual([
      'EXHAUSTION_CLASSIFIED_AND_PERSISTED',
      'SECOND_REQUEST_BYPASSES_PRIMARY',
      'MISSING_SECONDARY_CREDENTIAL_FAILS',
      'TRANSIENT_CAPACITY_STAYS_TRANSIENT',
      'PERIOD_ROLLOVER_RETRIES_PRIMARY',
    ]);
    expect(result.scenario).toBe('SYNTHETIC_DAILY_NEURON_ALLOCATION_EXHAUSTION');
    expect(result.synthetic).toBe(true);
  });
});

// ── 3 + 4. the durable store, not an in-memory circuit, produces the skip ────

describe('3+4 — a separate request context reloads state and bypasses Cloudflare', () => {
  it('does not contact the primary for the second CVE after a fresh port reloads the record', async () => {
    const store = makeStore();
    const result = await runHarness(store);

    const second = result.steps.find((s) => s.id === 'SECOND_REQUEST_BYPASSES_PRIMARY')!;
    // Zero primary attempts: the store (shared across two separate port
    // instances) is the only possible explanation, and the harness clears the
    // isolate-local circuit before this step.
    expect(second.cloudflare_attempts).toBe(0);
    expect(second.secondary_attempts).toBe(1);
    expect(second.provider).toBe('gemini');
    expect(second.status).toBe('PASS');
    expect(check(result, 'NO_PRIMARY_ATTEMPT_IN_EXHAUSTED_PERIOD').ok).toBe(true);
  });

  it('proves the skip survives an independent port instance created after the write', async () => {
    // Drive the transition, then reload through a brand-new port over the same
    // store. This is the cross-instance property an in-memory circuit cannot give.
    const store = makeStore();
    const result = await runHarness(store);
    expect(result.scope.startsWith(HARNESS_SCOPE_PREFIX)).toBe(true);
    const scoped = scopedProviderStatePort(store.newPort(), result.scope);
    const reloaded = await scoped.load('cloudflare');
    expect(reloaded?.availability).toBe('EXHAUSTED');
    expect(reloaded?.quota_period).toBe(quotaPeriodFor(new Date()));
  });

  it('persists only the switch transition and the seeded rollover fixture', async () => {
    // A precise count is the proof that steps 2 (durable skip), 3 (missing
    // credential) and 4 (transient capacity) wrote NOTHING — including that an
    // already-recorded period is not rewritten.
    const store = makeStore();
    const result = await runHarness(store);
    expect(result.isolation.saved_keys).toEqual([
      `${result.scope}cloudflare`,
      `${HARNESS_SCOPE_PREFIX}rollover::cloudflare`,
    ]);
  });

  it('gives every run a cold namespace, so a re-run is still a real demonstration', async () => {
    const store = makeStore();
    const first = await runHarness(store);
    const second = await runHarness(store);
    expect(second.scope).not.toBe(first.scope);
    // Both runs attempt the primary first and both pass: neither inherited the
    // other's exhaustion record.
    expect(first.steps[0].cloudflare_attempts).toBe(1);
    expect(second.steps[0].cloudflare_attempts).toBe(1);
    expect(first.verdict).toBe('PASS');
    expect(second.verdict).toBe('PASS');
  });
});

// ── 5. transient stays transient ─────────────────────────────────────────────

describe('5 — temporary capacity errors remain transient', () => {
  it('persists nothing for a 429/3040 and retries the primary afterwards', async () => {
    const store = makeStore();
    const result = await runHarness(store);

    expect(check(result, 'TRANSIENT_WRITES_NO_STATE').ok).toBe(true);
    const transient = result.steps.find((s) => s.id === 'TRANSIENT_CAPACITY_STAYS_TRANSIENT')!;
    expect(transient.cloudflare_attempts).toBe(2); // attempted, then retried
    expect(check(result, 'PRIMARY_RETRIED_AFTER_TRANSIENT').ok).toBe(true);

    // Nothing was written under the transient scope.
    const transientKeys = [...store.rows.keys()].filter((k) => k.includes('transient'));
    expect(transientKeys).toEqual([]);
  });
});

// ── 6. rollover ──────────────────────────────────────────────────────────────

describe('6 — a record from an earlier quota period does not block the primary', () => {
  it('attempts Cloudflare again after rollover and never falls back', async () => {
    const result = await runHarness(makeStore());
    const rollover = result.steps.find((s) => s.id === 'PERIOD_ROLLOVER_RETRIES_PRIMARY')!;
    expect(rollover.provider).toBe('cloudflare');
    expect(rollover.cloudflare_attempts).toBe(1);
    expect(rollover.secondary_attempts).toBe(0);
    expect(check(result, 'ROLLED_OVER_PERIOD_PERMITS_PRIMARY').ok).toBe(true);
  });
});

// ── 7. explicit failure, never a silent loop back ────────────────────────────

describe('7 — a missing secondary credential fails explicitly', () => {
  it('reports FAIL/QUOTA_EXHAUSTED without re-contacting Cloudflare', async () => {
    const result = await runHarness(makeStore());
    const step = result.steps.find((s) => s.id === 'MISSING_SECONDARY_CREDENTIAL_FAILS')!;
    expect(step.status).toBe('FAIL');
    expect(step.error_class).toBe('QUOTA_EXHAUSTED');
    expect(step.cloudflare_attempts).toBe(0);
    expect(check(result, 'NO_SILENT_LOOP_BACK_TO_PRIMARY').ok).toBe(true);
  });
});

// ── 8. embeddings remain outside the failover boundary ───────────────────────

describe('8 — embedding operations remain unaffected', () => {
  it('never routes an embedding model through the provider router', async () => {
    const result = await runHarness(makeStore());
    // Every attempt is a CVE-analysis model; no embedding model appears.
    for (const attempt of result.attempts) {
      expect(['@cf/qwen/qwen3.8-27b', 'gemini-3.8-flash']).toContain(attempt.model);
      expect(attempt.model).not.toContain('bge');
    }
    expect(check(result, 'NO_REAL_PROVIDER_MODEL_REACHED').ok).toBe(true);
  });

  it('keeps the workers\u2019 embedding call sites independent of the provider-state port', () => {
    // Regression guard on the boundary itself: the embedding calls are direct
    // `env.AI.run(<embedding model>, …)` calls that never receive a providerState
    // port, so a future refactor cannot silently route them through the switch.
    const embedModel = '@cf/baai/bge-base-en-v1.5';
    for (const rel of ['workers/ingest/src/index.ts', 'workers/api/src/index.ts']) {
      const source = readFileSync(resolve(__dirname, '../../', rel), 'utf-8');
      expect(source).toContain(embedModel);
      // The embedding invocation never mentions the provider-state port.
      const lines = source.split('\n').filter((line) => line.includes(`env.AI.run('${embedModel}'`) || line.includes(`env.AI.run("${embedModel}"`));
      expect(lines.length).toBeGreaterThan(0);
      for (const line of lines) expect(line).not.toContain('providerState');
    }
  });

  it('is unaffected even while the harness namespace already holds a record', async () => {
    const store = makeStore();
    await runHarness(store);
    const result = await runHarness(store);
    expect(result.verdict).toBe('PASS');
    expect(result.attempts.every((a) => !a.model.includes('bge'))).toBe(true);
    expect(HARNESS_GROUNDED_PAYLOAD).toContain('Synthetic');
  });
});

// ── 9. containment: no production configuration, no live state pollution ─────

describe('9 — the harness cannot affect production or live provider state', () => {
  it('is refused in production even with the flag explicitly enabled', () => {
    const decision = evaluateHarnessAccess({ ENVIRONMENT: 'production', [HARNESS_ENABLE_VAR]: HARNESS_ENABLED_VALUE });
    expect(decision.allowed).toBe(false);
    expect(decision.status).toBe(403);
    expect(decision.code).toBe(HARNESS_CODE_PREVIEW_ONLY);
  });

  it('is DISABLED BY DEFAULT on Preview (flag absent, and when explicitly disabled)', () => {
    expect(evaluateHarnessAccess({ ENVIRONMENT: 'preview' }).code).toBe(HARNESS_CODE_DISABLED);
    expect(evaluateHarnessAccess({ ENVIRONMENT: 'preview', [HARNESS_ENABLE_VAR]: 'disabled' }).allowed).toBe(false);
    expect(evaluateHarnessAccess(null).allowed).toBe(false);
    expect(evaluateHarnessAccess(undefined).allowed).toBe(false);
  });

  it('is reachable only when Preview AND explicitly enabled', () => {
    const decision = evaluateHarnessAccess({ ENVIRONMENT: 'preview', [HARNESS_ENABLE_VAR]: HARNESS_ENABLED_VALUE });
    expect(decision.allowed).toBe(true);
  });

  it('writes only inside its own namespace, so live routing cannot be flipped', async () => {
    const store = makeStore();
    const result = await runHarness(store);
    expect(result.isolation.violations).toEqual([]);
    expect(result.isolation.saved_keys.length).toBeGreaterThan(0);
    expect(result.isolation.saved_keys.every((k) => k.startsWith(HARNESS_SCOPE_PREFIX))).toBe(true);
    // The unprefixed keys the live analysis path reads are untouched.
    expect(nonHarnessKeys(store)).toEqual([]);
    expect(check(result, 'LIVE_STATE_UNTOUCHED').ok).toBe(true);
    expect(check(result, 'ISOLATION_ENFORCED').ok).toBe(true);
  });

  it('leaves a REAL existing exhaustion record byte-identical', async () => {
    const now = new Date('2026-10-11T12:00:00.000Z');
    const live: AIProviderStateRecord = {
      provider: 'cloudflare',
      availability: 'EXHAUSTED',
      quota_period: quotaPeriodFor(now),
      reason: PROVIDER_REASON_DAILY_ALLOCATION_EXHAUSTED,
      evidence: 'live production-shaped record, must not be rewritten',
      observed_at: now.toISOString(),
      reset_at: nextQuotaReset(now),
    };
    const store = makeStore([['cloudflare', live]]);
    const result = await runHarness(store, now);
    expect(result.live_state_before).toEqual(live);
    expect(result.live_state_after).toEqual(live);
    expect(store.rows.get('cloudflare')).toEqual(live);
    expect(check(result, 'LIVE_STATE_UNTOUCHED').ok).toBe(true);
  });

  it('declares the enable flag as config, not a request parameter, and ignores the body', () => {
    const api = readFileSync(resolve(__dirname, '../../workers/api/src/index.ts'), 'utf-8');
    const anchor = "if (path === '/api/v1/admin/provider-failover-harness' && request.method === 'POST')";
    const start = api.indexOf(anchor);
    expect(start).toBeGreaterThan(-1);
    // Bound the block to THIS route: stop at the next route declaration.
    const next = api.indexOf('// ── POST /api/v1/admin/preview-vulnerability-supply', start);
    const block = api.slice(start, next > start ? next : start + 1200);
    // The enable decision comes from configuration only.
    expect(block).toContain('evaluateHarnessAccess(env)');
    // The handler never reads the request body, so no caller can choose a fault.
    expect(block).not.toContain('request.json()');
    expect(block).not.toContain('body');
    for (const forbidden of ['statusCode', 'provider:', 'database_id', 'cveId', 'model:', 'status:']) {
      expect(block).not.toContain(forbidden);
    }
  });

  it('does not declare the enable flag in wrangler.toml at all', () => {
    // Absence is the default. Declaring it — at ANY value — would change this
    // file's audited production-safety digest, which an existing Preview-isolation
    // test pins as proof that no phase silently altered the deploy target.
    const toml = readFileSync(resolve(__dirname, '../../workers/api/wrangler.toml'), 'utf-8');
    expect(toml).not.toContain(HARNESS_ENABLE_VAR);
  });

  it('fails closed on every value except the literal `enabled`', () => {
    for (const value of [undefined, '', 'disabled', 'TRUE', 'true', 'Enabled', '1', 'yes']) {
      const decision = evaluateHarnessAccess({ ENVIRONMENT: 'preview', [HARNESS_ENABLE_VAR]: value });
      expect(decision.allowed).toBe(false);
      expect(decision.code).toBe(HARNESS_CODE_DISABLED);
    }
    expect(evaluateHarnessAccess({ ENVIRONMENT: 'preview', [HARNESS_ENABLE_VAR]: HARNESS_ENABLED_VALUE }).allowed).toBe(true);
    expect(HARNESS_DISABLED_VALUE).toBe('disabled');
  });

  it('reports an overall PASS verdict for the fixed scenario', async () => {
    const result = await runHarness(makeStore());
    const failed = result.checks.filter((c) => !c.ok).map((c) => `${c.id}: ${c.detail}`);
    expect(failed).toEqual([]);
    expect(result.verdict).toBe('PASS');
  });
});

// ── the REAL D1 port the route uses, against a D1 double ─────────────────────

interface FakeD1Row {
  provider: string;
  availability: string;
  quota_period: string;
  reason: string;
  evidence: string;
  observed_at: string;
  reset_at: string;
}

/**
 * A D1 double that models exactly the two statements `createD1ProviderStatePort`
 * issues. It is NOT a SQL engine: it asserts the statement shapes so the port and
 * the migration cannot drift apart unnoticed.
 */
function fakeProviderStateD1() {
  const rows = new Map<string, FakeD1Row>();
  return {
    rows,
    prepare(sql: string) {
      const statement = {
        args: [] as unknown[],
        bind(...args: unknown[]) {
          statement.args = args;
          return statement;
        },
        async first<T>() {
          if (!/^SELECT provider, availability, quota_period, reason, evidence, observed_at, reset_at FROM ai_provider_state WHERE provider = \?$/.test(sql.trim())) {
            throw new Error(`unexpected SELECT: ${sql}`);
          }
          const row = rows.get(String(statement.args[0]));
          return (row ? { ...row } as unknown as T : null);
        },
        async run() {
          if (!/^INSERT INTO ai_provider_state \(provider, availability, quota_period, reason, evidence, observed_at, reset_at\)/.test(sql.trim())) {
            throw new Error(`unexpected INSERT: ${sql}`);
          }
          const [provider, availability, quota_period, reason, evidence, observed_at, reset_at] = statement.args as string[];
          rows.set(provider, { provider, availability, quota_period, reason, evidence, observed_at, reset_at });
          return { success: true };
        },
      };
      return statement;
    },
  };
}

describe('10 — the harness runs through the REAL D1 provider-state port', () => {
  it('completes the scenario and keeps every D1 key inside the harness namespace', async () => {
    const db = fakeProviderStateD1();
    const diagnostics: string[] = [];
    const result = await runPreviewFailoverHarness({
      port: createD1ProviderStatePort(db as never, (message) => diagnostics.push(message)),
    });

    expect(result.verdict).toBe('PASS');
    // The port never had to report a load/save failure, so the statements matched.
    expect(diagnostics).toEqual([]);
    expect(db.rows.size).toBeGreaterThan(0);
    expect([...db.rows.keys()].every((k) => k.startsWith(HARNESS_SCOPE_PREFIX))).toBe(true);
    // The key live analysis reads is not present.
    expect(db.rows.has('cloudflare')).toBe(false);
    const switchRow = db.rows.get(`${result.scope}cloudflare`);
    expect(switchRow?.availability).toBe('EXHAUSTED');
    expect(switchRow?.reason).toBe(PROVIDER_REASON_DAILY_ALLOCATION_EXHAUSTED);
  });

  it('survives a missing table exactly as production does: fail open, but logged', async () => {
    // Before migration 0025 is applied the table does not exist. The port must
    // degrade to "no known exhaustion" and LOG, never pretend to be durable.
    const diagnostics: string[] = [];
    const broken = {
      prepare() {
        return {
          bind() { return this; },
          async first() { throw new Error('no such table: ai_provider_state'); },
          async run() { throw new Error('no such table: ai_provider_state'); },
        };
      },
    };
    const result = await runPreviewFailoverHarness({
      port: createD1ProviderStatePort(broken as never, (message) => diagnostics.push(message)),
    });
    expect(diagnostics.some((d) => d.startsWith('AI_PROVIDER_STATE_LOAD_FAILED'))).toBe(true);
    // Fail-open means the primary IS attempted first, and the run fails loudly
    // rather than claiming a durable switch it did not achieve.
    expect(result.steps[0].cloudflare_attempts).toBe(1);
    expect(result.verdict).toBe('FAIL');
    expect(check(result, 'STATE_PERSISTED_FOR_UTC_PERIOD').ok).toBe(false);
  });
});
