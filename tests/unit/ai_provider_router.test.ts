import { beforeEach, describe, expect, it } from 'bun:test';
import {
  AUTOMATIC_FAILOVER_CLASSES,
  NON_FAILOVER_CLASSES,
  PREVIEW_AUTOMATIC_FAILOVER_CLASSES,
  __resetAIProviderCircuits,
  GEMINI_CVE_MODEL,
  allowsAutomaticFailover,
  resolveProviderPreference,
  runGroundedCveAnalysis,
  type AIProviderAttempt,
  type GroundedCveAnalysisInput,
} from '@zayron/intelligence';

/**
 * Provider router contract (Phase 5 / Phase 7, revised 2026-10-13).
 *
 * Semantics under test:
 *  - Cloudflare Workers AI is the primary provider.
 *  - An AUTOMATIC transition to Gemini happens only for a positively confirmed,
 *    current-period exhaustion of Cloudflare's daily free allocation
 *    (`AUTOMATIC_FAILOVER_CLASSES`). Capacity overload, a generic rate limit, a
 *    timeout, circuit-open, authentication, malformed-request and unknown failures
 *    are reported as failures and are NEVER re-routed.
 *  - An explicit `providerPreference` is not "automatic" routing and is unaffected:
 *    `gemini` never touches Cloudflare, `cloudflare` never substitutes.
 *  - fallback_used === true ONLY when the primary provider failed and execution
 *    actually transitioned to the secondary provider.
 *  - retry_count is the attempt index (0 = primary, 1 = secondary), not a retry storm.
 *  - exactly one AI_PROVIDER_ATTEMPT record per logical provider attempt, with
 *    `success` describing that attempt's own outcome.
 *  - bounded: at most one attempt per provider.
 */

const PASS_PAYLOAD = JSON.stringify({
  vulnerability_type: 'Template Injection',
  root_cause: 'Unsafe template evaluation',
  attack_surface: 'Network-accessible web endpoints',
  attack_vector: 'NETWORK',
  executive_assessment: 'Critical unauthenticated remote code execution.',
  technical_assessment: 'Adversaries submit crafted expressions evaluated by the template engine.',
});

/**
 * Cloudflare's documented daily free-allocation exhaustion evidence (HTTP 429 /
 * internal code 3036). This is the ONLY condition that may trigger an automatic
 * provider transition, so it is stated once and reused rather than re-typed.
 */
const DAILY_ALLOCATION_EVIDENCE =
  'You have used up your daily free allocation of 10,000 neurons. Your free allocation resets at 00:00 UTC.';

function baseInput(): Omit<GroundedCveAnalysisInput, 'aiBinding'> {
  return {
    cveId: 'CVE-2023-22527',
    vendor: 'Atlassian',
    product: 'Confluence Data Center and Server',
    vulnerabilityName: 'Atlassian Confluence Template Injection',
    description: 'Template injection vulnerability leading to remote code execution.',
    cweDetails: [{ id: 'CWE-74', name: 'Improper Neutralization of Special Elements' }],
    cvssScore: '9.8',
    isKev: true,
  };
}

function cloudflareOk(counter: { n: number }) {
  return {
    run: async () => {
      counter.n += 1;
      return { response: PASS_PAYLOAD, usage: { prompt_tokens: 120, completion_tokens: 80 } };
    },
  };
}

function geminiOk(counter: { n: number }) {
  return (async () => {
    counter.n += 1;
    return {
      ok: true,
      status: 200,
      json: async () => ({
        candidates: [{ content: { parts: [{ text: PASS_PAYLOAD }] } }],
        usageMetadata: { promptTokenCount: 21, candidatesTokenCount: 13 },
      }),
    };
  }) as unknown as typeof fetch;
}

function geminiFails(counter: { n: number }, status: number, message: string) {
  return (async () => {
    counter.n += 1;
    return { ok: false, status, json: async () => ({ error: { status: 'ERROR', message } }) };
  }) as unknown as typeof fetch;
}

/** Collect telemetry the same way the API worker's onProviderAttempt does. */
function collector(): { attempts: AIProviderAttempt[]; onProviderAttempt: (a: AIProviderAttempt) => void } {
  const attempts: AIProviderAttempt[] = [];
  return { attempts, onProviderAttempt: (a: AIProviderAttempt) => { attempts.push(a); } };
}

beforeEach(() => {
  __resetAIProviderCircuits();
});

describe('AI PROVIDER ROUTER — Cloudflare primary; Gemini only on confirmed quota exhaustion', () => {
  it('A: Cloudflare healthy — single attempt, PASS, no transition', async () => {
    const cf = { n: 0 };
    const gm = { n: 0 };
    const { attempts, onProviderAttempt } = collector();

    const result = await runGroundedCveAnalysis({
      ...baseInput(),
      aiBinding: cloudflareOk(cf),
      geminiApiKey: 'test-key',
      fetchFn: geminiOk(gm),
      onProviderAttempt,
    });

    expect(result.status).toBe('PASS');
    expect(result.provider).toBe('cloudflare');
    expect(result.model).toBe('@cf/qwen/qwen3.8-27b');
    expect(result.fallback_used).toBe(false);
    expect(result.retry_count).toBe(0);
    expect(cf.n).toBe(1);
    expect(gm.n).toBe(0);

    expect(attempts.length).toBe(1);
    expect(attempts[0].provider).toBe('cloudflare');
    expect(attempts[0].success).toBe(true);
    expect(attempts[0].failure_class).toBeNull();
    expect(attempts[0].retry_count).toBe(0);
  });

  it('B: same provider is never retried, and deterministic failures do not fall back', async () => {
    const cf = { n: 0 };
    const gm = { n: 0 };
    const { attempts, onProviderAttempt } = collector();

    const result = await runGroundedCveAnalysis({
      ...baseInput(),
      aiBinding: { run: async () => { cf.n += 1; throw new Error('model not found'); } },
      geminiApiKey: 'test-key',
      fetchFn: geminiOk(gm),
      onProviderAttempt,
    });

    expect(cf.n).toBe(1);           // bounded: exactly one primary attempt
    expect(gm.n).toBe(0);           // MODEL_FAILURE is not fallback-eligible
    expect(result.status).toBe('FAIL');
    expect(result.provider).toBe('cloudflare');
    expect(result.error_class).toBe('MODEL_FAILURE');
    expect(result.fallback_used).toBe(false);  // no provider transition happened
    expect(result.retry_count).toBe(0);

    expect(attempts.length).toBe(1);
    expect(attempts[0].success).toBe(false);
    expect(attempts[0].failure_class).toBe('MODEL_FAILURE');
  });

  it('C: Cloudflare unavailable — the failure is reported, NOT re-routed to Gemini', async () => {
    const cf = { n: 0 };
    const gm = { n: 0 };
    const { attempts, onProviderAttempt } = collector();

    const result = await runGroundedCveAnalysis({
      ...baseInput(),
      aiBinding: { run: async () => { cf.n += 1; throw Object.assign(new Error('service unavailable'), { status: 503 }); } },
      geminiApiKey: 'test-key',
      fetchFn: geminiOk(gm),
      onProviderAttempt,
    });

    expect(cf.n).toBe(1);           // one primary attempt, no same-provider retry
    expect(gm.n).toBe(0);           // UNAVAILABLE is a request condition, not spent quota
    expect(result.status).toBe('FAIL');
    expect(result.provider).toBe('cloudflare');
    expect(result.error_class).toBe('UNAVAILABLE');
    expect(result.fallback_used).toBe(false);
    expect(result.retry_count).toBe(0);
    expect(result.analysis).toBeNull();

    expect(attempts.length).toBe(1);
    expect(attempts[0]).toMatchObject({ provider: 'cloudflare', success: false, failure_class: 'UNAVAILABLE', retry_count: 0 });
  });

  it('D: Cloudflare quota exhausted — Gemini fallback, and the Cloudflare circuit opens', async () => {
    const cf = { n: 0 };
    const gm = { n: 0 };
    const { attempts, onProviderAttempt } = collector();

    const aiBinding = { run: async () => { cf.n += 1; throw new Error('quota exceeded: daily neuron limit'); } };

    const first = await runGroundedCveAnalysis({
      ...baseInput(),
      aiBinding,
      geminiApiKey: 'test-key',
      fetchFn: geminiOk(gm),
      onProviderAttempt,
    });

    expect(first.provider).toBe('gemini');
    expect(first.fallback_used).toBe(true);
    expect(first.retry_count).toBe(1);
    expect(attempts[0].failure_class).toBe('QUOTA_EXHAUSTED');

    // Circuit is open: the next call must skip Cloudflare entirely. A circuit-open
    // rejection is one of the classes that must not BY ITSELF trigger a switch, so
    // without a durable record this call fails explicitly with its own class. The
    // durable record — not the in-isolate circuit — is what carries the exhaustion
    // evidence into later requests, asserted by
    // ai_provider_failover_state.test.ts "B: subsequent CVEs do NOT re-attempt
    // Cloudflare".
    const second = await runGroundedCveAnalysis({
      ...baseInput(),
      aiBinding,
      geminiApiKey: 'test-key',
      fetchFn: geminiOk(gm),
      onProviderAttempt,
    });

    expect(cf.n).toBe(1);          // skipped by the open circuit
    expect(gm.n).toBe(1);          // unchanged: circuit-open alone is not exhaustion
    expect(second.provider).toBe('cloudflare');
    expect(second.error_class).toBe('UNAVAILABLE');
    expect(second.fallback_used).toBe(false);
  });

  it('E: Cloudflare timeout — the bound still ends the request, and Gemini is NOT invoked', async () => {
    const gm = { n: 0 };
    const { attempts, onProviderAttempt } = collector();

    const result = await runGroundedCveAnalysis({
      ...baseInput(),
      // resolves after the 1000ms provider budget, so the timeout path wins
      aiBinding: { run: () => new Promise((resolve) => setTimeout(() => resolve({ response: PASS_PAYLOAD }), 1200)) },
      geminiApiKey: 'test-key',
      fetchFn: geminiOk(gm),
      timeoutMs: 1000,
      onProviderAttempt,
    });

    expect(gm.n).toBe(0);                 // TIMEOUT is transient, not exhaustion
    expect(result.provider).toBe('cloudflare');
    expect(result.status).toBe('FAIL');
    expect(result.error_class).toBe('TIMEOUT');
    expect(result.fallback_used).toBe(false);
    expect(result.retry_count).toBe(0);
    expect(attempts.length).toBe(1);
    expect(attempts[0].failure_class).toBe('TIMEOUT');
  });

  it('E2: missing Cloudflare binding — UNAVAILABLE is reported and a healthy Gemini is not reached automatically', async () => {
    const gm = { n: 0 };
    const { attempts, onProviderAttempt } = collector();

    const result = await runGroundedCveAnalysis({
      ...baseInput(),
      geminiApiKey: 'test-key',
      fetchFn: geminiOk(gm),
      onProviderAttempt,
    });

    expect(gm.n).toBe(0);
    expect(result.provider).toBe('cloudflare');
    expect(result.status).toBe('FAIL');
    expect(result.error_class).toBe('UNAVAILABLE');
    expect(result.fallback_used).toBe(false);
    expect(result.retry_count).toBe(0);
    expect(attempts.length).toBe(1);
    expect(attempts[0]).toMatchObject({ provider: 'cloudflare', success: false, failure_class: 'UNAVAILABLE' });
  });

  it('F: after a CONFIRMED exhaustion, a Gemini failure surfaces FAIL with the transition recorded', async () => {
    const cf = { n: 0 };
    const gm = { n: 0 };
    const { attempts, onProviderAttempt } = collector();

    const result = await runGroundedCveAnalysis({
      ...baseInput(),
      // The one automatic path on which the secondary provider is reached at all.
      aiBinding: { run: async () => { cf.n += 1; throw new Error(DAILY_ALLOCATION_EVIDENCE); } },
      geminiApiKey: 'test-key',
      fetchFn: geminiFails(gm, 401, 'API key not valid'),
      onProviderAttempt,
    });

    expect(gm.n).toBe(1);
    expect(result.status).toBe('FAIL');
    expect(result.provider).toBe('gemini');
    expect(result.error_class).toBe('AUTH_FAILURE');
    expect(result.fallback_used).toBe(true);
    expect(result.retry_count).toBe(1);
    expect(result.analysis).toBeNull();

    expect(attempts.length).toBe(2);
    expect(attempts[0]).toMatchObject({ provider: 'cloudflare', success: false, failure_class: 'QUOTA_EXHAUSTED', retry_count: 0 });
    expect(attempts[1]).toMatchObject({ provider: 'gemini', success: false, failure_class: 'AUTH_FAILURE', retry_count: 1 });
  });

  it('G: both providers unavailable — only the primary is attempted and the failure is explicit', async () => {
    const cf = { n: 0 };
    const gm = { n: 0 };
    const { attempts, onProviderAttempt } = collector();

    const result = await runGroundedCveAnalysis({
      ...baseInput(),
      aiBinding: { run: async () => { cf.n += 1; throw Object.assign(new Error('internal error'), { status: 502 }); } },
      geminiApiKey: 'test-key',
      fetchFn: geminiFails(gm, 503, 'model overloaded'),
      onProviderAttempt,
    });

    expect(cf.n).toBe(1);
    // A 502 is transparent capacity pressure on the primary. Reaching a second
    // provider here would spend a quota the policy reserves for confirmed
    // exhaustion, so the secondary is NOT attempted and the failure is surfaced.
    expect(gm.n).toBe(0);
    expect(result.status).toBe('FAIL');
    expect(result.provider).toBe('cloudflare');
    expect(result.error_class).toBe('UNAVAILABLE');
    expect(result.fallback_used).toBe(false);
    expect(result.retry_count).toBe(0);
    expect(attempts.length).toBe(1);
    expect(attempts[0].success).toBe(false);
  });

  it('G2: neither binding nor key — no transition, single failed attempt', async () => {
    const { attempts, onProviderAttempt } = collector();

    const result = await runGroundedCveAnalysis({
      ...baseInput(),
      onProviderAttempt,
    });

    expect(result.status).toBe('FAIL');
    expect(result.provider).toBe('cloudflare');
    expect(result.fallback_used).toBe(false);
    expect(result.retry_count).toBe(0);
    expect(result.error_class).toBe('UNAVAILABLE');
    expect(attempts.length).toBe(1);
    expect(attempts[0]).toMatchObject({ provider: 'cloudflare', success: false, failure_class: 'UNAVAILABLE', retry_count: 0 });
  });

  it('T1: a successful call with unparseable output emits exactly one SUCCESS attempt', async () => {
    const { attempts, onProviderAttempt } = collector();

    const result = await runGroundedCveAnalysis({
      ...baseInput(),
      aiBinding: { run: async () => ({ response: 'not json at all' }) },
      onProviderAttempt,
    });

    expect(result.status).toBe('FAIL');
    expect(result.error_code).toBe('JSON_PARSE_ERROR');
    expect(result.fallback_used).toBe(false);
    expect(result.retry_count).toBe(0);

    // The provider call itself succeeded; the parse outcome is not a provider attempt.
    expect(attempts.length).toBe(1);
    expect(attempts[0].success).toBe(true);
    expect(attempts[0].failure_class).toBeNull();
  });

  it('H: an UNKNOWN failure is never re-routed', async () => {
    const cf = { n: 0 };
    const gm = { n: 0 };
    const { attempts, onProviderAttempt } = collector();

    const result = await runGroundedCveAnalysis({
      ...baseInput(),
      aiBinding: { run: async () => { cf.n += 1; throw new Error('the provider said something unrecognisable'); } },
      geminiApiKey: 'test-key',
      fetchFn: geminiOk(gm),
      onProviderAttempt,
    });

    expect(cf.n).toBe(1);
    expect(gm.n).toBe(0);
    expect(result.error_class).toBe('UNKNOWN');   // preserved, not relabelled
    expect(result.provider).toBe('cloudflare');
    expect(result.fallback_used).toBe(false);
    expect(attempts.length).toBe(1);
  });

  it('I: a generic rate limit is not exhaustion and is not re-routed', async () => {
    const cf = { n: 0 };
    const gm = { n: 0 };
    const { attempts, onProviderAttempt } = collector();

    const result = await runGroundedCveAnalysis({
      ...baseInput(),
      // HTTP 429 with no quota/daily-allocation evidence: a bare 429 is transient.
      aiBinding: { run: async () => { cf.n += 1; throw Object.assign(new Error('Too many requests'), { status: 429 }); } },
      geminiApiKey: 'test-key',
      fetchFn: geminiOk(gm),
      onProviderAttempt,
    });

    expect(cf.n).toBe(1);
    expect(gm.n).toBe(0);
    expect(result.error_class).toBe('RATE_LIMITED');
    expect(result.fallback_used).toBe(false);
    expect(attempts.length).toBe(1);
  });
});

// ── Preview-only broadened failover (Phase 12.22) ───────────────────────────
//
// Under `environment: 'preview'` the transient, request-independent provider
// conditions also fail over to Gemini. Production (no environment, or any other
// environment) keeps the quota-only contract asserted above.

describe('PREVIEW broadened automatic failover (environment = preview)', () => {
  it('P1: a generic 429 fails over to Gemini exactly once and the attempts are attributed', async () => {
    const cf = { n: 0 };
    const gm = { n: 0 };
    const { attempts, onProviderAttempt } = collector();

    const result = await runGroundedCveAnalysis({
      ...baseInput(),
      environment: 'preview',
      aiBinding: { run: async () => { cf.n += 1; throw Object.assign(new Error('Too many requests'), { status: 429 }); } },
      geminiApiKey: 'test-key',
      fetchFn: geminiOk(gm),
      onProviderAttempt,
    });

    expect(cf.n).toBe(1);
    expect(gm.n).toBe(1);
    expect(result.status).toBe('PASS');
    expect(result.provider).toBe('gemini');
    expect(result.fallback_used).toBe(true);
    expect(attempts.length).toBe(2);
    expect(attempts[0]).toMatchObject({ provider: 'cloudflare', success: false, failure_class: 'RATE_LIMITED' });
    expect(attempts[1]).toMatchObject({ provider: 'gemini', success: true });
  });

  it('P2: a 503 provider-unavailable failure fails over to Gemini in Preview', async () => {
    const cf = { n: 0 };
    const gm = { n: 0 };

    const result = await runGroundedCveAnalysis({
      ...baseInput(),
      environment: 'preview',
      aiBinding: { run: async () => { cf.n += 1; throw Object.assign(new Error('Service Unavailable'), { status: 503 }); } },
      geminiApiKey: 'test-key',
      fetchFn: geminiOk(gm),
    });

    expect(cf.n).toBe(1);
    expect(gm.n).toBe(1);
    expect(result.provider).toBe('gemini');
    expect(result.fallback_used).toBe(true);
  });

  it('P3: healthy Cloudflare never reaches Gemini in Preview', async () => {
    const cf = { n: 0 };
    const gm = { n: 0 };

    const result = await runGroundedCveAnalysis({
      ...baseInput(),
      environment: 'preview',
      aiBinding: cloudflareOk(cf),
      geminiApiKey: 'test-key',
      fetchFn: geminiOk(gm),
    });

    expect(result.provider).toBe('cloudflare');
    expect(result.fallback_used).toBe(false);
    expect(cf.n).toBe(1);
    expect(gm.n).toBe(0);
  });

  it('P4: a Preview rate limit with no Gemini credential fails explicitly, with no transition', async () => {
    const cf = { n: 0 };
    const gm = { n: 0 };
    const { attempts, onProviderAttempt } = collector();

    const result = await runGroundedCveAnalysis({
      ...baseInput(),
      environment: 'preview',
      aiBinding: { run: async () => { cf.n += 1; throw Object.assign(new Error('Too many requests'), { status: 429 }); } },
      fetchFn: geminiOk(gm),
      onProviderAttempt,
    });

    expect(cf.n).toBe(1);
    expect(gm.n).toBe(0);
    expect(result.status).toBe('FAIL');
    expect(result.error_class).toBe('RATE_LIMITED');
    expect(result.fallback_used).toBe(false);
    expect(attempts.length).toBe(1);
  });

  it('P5: non-eligible classes never fail over in Preview (auth, model, malformed, unknown)', async () => {
    for (const [status, message] of [[401, 'Unauthorized'], [400, 'Bad request'], [404, 'model not found']] as const) {
      const cf = { n: 0 };
      const gm = { n: 0 };
      const result = await runGroundedCveAnalysis({
        ...baseInput(),
        environment: 'preview',
        aiBinding: { run: async () => { cf.n += 1; throw Object.assign(new Error(message), { status }); } },
        geminiApiKey: 'test-key',
        fetchFn: geminiOk(gm),
      });
      expect(cf.n).toBe(1);
      expect(gm.n).toBe(0);
      expect(result.fallback_used).toBe(false);
    }
  });

  it('P6: production (no environment) still does not re-route a generic 429', async () => {
    const gm = { n: 0 };
    const result = await runGroundedCveAnalysis({
      ...baseInput(),
      environment: 'production',
      aiBinding: { run: async () => { throw Object.assign(new Error('Too many requests'), { status: 429 }); } },
      geminiApiKey: 'test-key',
      fetchFn: geminiOk(gm),
    });
    expect(gm.n).toBe(0);
    expect(result.error_class).toBe('RATE_LIMITED');
    expect(result.fallback_used).toBe(false);
  });

  it('the Preview set is exactly the transient set plus quota; non-eligible classes stay blocked', () => {
    expect([...PREVIEW_AUTOMATIC_FAILOVER_CLASSES].sort()).toEqual(['QUOTA_EXHAUSTED', 'RATE_LIMITED', 'TIMEOUT', 'UNAVAILABLE']);
    for (const c of ['AUTH_FAILURE', 'MODEL_FAILURE', 'INVALID_REQUEST', 'UNKNOWN'] as const) {
      expect(allowsAutomaticFailover(c, 'preview')).toBe(false);
      expect(allowsAutomaticFailover(c, 'production')).toBe(false);
    }
    expect(allowsAutomaticFailover('RATE_LIMITED', 'production')).toBe(false);
    expect(allowsAutomaticFailover('RATE_LIMITED')).toBe(false);
  });
});

// ── the canonical contract itself ────────────────────────────────────────────

describe('the canonical automatic-failover contract', () => {
  it('permits an automatic transition for QUOTA_EXHAUSTED only', () => {
    expect([...AUTOMATIC_FAILOVER_CLASSES]).toEqual(['QUOTA_EXHAUSTED']);
    expect(allowsAutomaticFailover('QUOTA_EXHAUSTED')).toBe(true);
  });

  it('enumerates every class that must never trigger a transition', () => {
    expect(NON_FAILOVER_CLASSES).toEqual([
      'RATE_LIMITED', 'TIMEOUT', 'UNAVAILABLE', 'AUTH_FAILURE', 'MODEL_FAILURE', 'INVALID_REQUEST', 'UNKNOWN',
    ]);
    for (const failureClass of NON_FAILOVER_CLASSES) {
      expect(allowsAutomaticFailover(failureClass)).toBe(false);
    }
  });

  it('partitions the WHOLE AIErrorClass domain, so a new class cannot become failover-eligible by omission', () => {
    const classified = [...NON_FAILOVER_CLASSES, ...AUTOMATIC_FAILOVER_CLASSES];
    // Every class is accounted for exactly once, and the union is exhaustive:
    // adding a class to AIErrorClass without deciding its routing fails this test.
    expect(new Set(classified).size).toBe(classified.length);
    expect(classified.slice().sort()).toEqual([
      'AUTH_FAILURE', 'INVALID_REQUEST', 'MODEL_FAILURE', 'QUOTA_EXHAUSTED',
      'RATE_LIMITED', 'TIMEOUT', 'UNAVAILABLE', 'UNKNOWN',
    ]);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Explicit provider policy — preview selects Gemini as the primary provider
// ─────────────────────────────────────────────────────────────────────────────
describe('AI PROVIDER POLICY — explicit provider selection', () => {
  it('resolveProviderPreference: an explicit preference always wins', () => {
    expect(resolveProviderPreference({ AI_PROVIDER_PREFERENCE: 'gemini' })).toBe('gemini');
    expect(resolveProviderPreference({ AI_PROVIDER_PREFERENCE: 'cloudflare' })).toBe('cloudflare');
    expect(resolveProviderPreference({ AI_PROVIDER_PREFERENCE: 'auto' })).toBe('auto');
  });

  it('resolveProviderPreference: a credential alone never selects Gemini — Cloudflare is used first', () => {
    // POLICY CHANGE (required by the failover objective): previously `preview` +
    // a Gemini credential returned 'gemini', so the Cloudflare free daily
    // allocation was never even attempted once a key existed. The durable provider
    // state machine now owns that decision: Cloudflare stays primary while its
    // allocation is available, and Gemini takes over only for the remainder of the
    // period after the allocation is CONFIRMED exhausted. An operator who wants
    // Gemini outright still sets AI_PROVIDER_PREFERENCE=gemini explicitly.
    expect(resolveProviderPreference({ ENVIRONMENT: 'preview', GEMINI_API_KEY: 'k' })).toBe('auto');
    expect(resolveProviderPreference({ ENVIRONMENT: 'preview' })).toBe('auto');
    expect(resolveProviderPreference({ ENVIRONMENT: 'preview', GEMINI_API_KEY: '   ' })).toBe('auto');
    expect(resolveProviderPreference({ ENVIRONMENT: 'production', GEMINI_API_KEY: 'k' })).toBe('auto');
    expect(resolveProviderPreference({ GEMINI_API_KEY: 'k' })).toBe('auto');
  });

  it('resolveProviderPreference: unknown or absent configuration fails safe to historical routing', () => {
    expect(resolveProviderPreference({ AI_PROVIDER_PREFERENCE: 'gemini!!' })).toBe('auto');
    expect(resolveProviderPreference({ AI_PROVIDER_PREFERENCE: 'GEMINI' })).toBe('auto');
    expect(resolveProviderPreference({})).toBe('auto');
    expect(resolveProviderPreference(null)).toBe('auto');
    expect(resolveProviderPreference(undefined)).toBe('auto');
  });

  it('explicit gemini primary never attempts Cloudflare, even with a healthy binding', async () => {
    const cf = { n: 0 };
    const gm = { n: 0 };
    const { attempts, onProviderAttempt } = collector();

    const result = await runGroundedCveAnalysis({
      ...baseInput(),
      providerPreference: 'gemini',
      aiBinding: cloudflareOk(cf),
      geminiApiKey: 'test-key',
      fetchFn: geminiOk(gm),
      onProviderAttempt,
    });

    expect(cf.n).toBe(0);
    expect(gm.n).toBe(1);
    expect(result.status).toBe('PASS');
    expect(result.provider).toBe('gemini');
    expect(result.model).toBe(GEMINI_CVE_MODEL);
    expect(result.retry_count).toBe(0);
    expect(result.fallback_used).toBe(false);
    expect(attempts.length).toBe(1);
    expect(attempts[0]).toMatchObject({ provider: 'gemini', success: true, retry_count: 0 });
  });

  it('explicit gemini primary with no credential fails explicitly and observably', async () => {
    const cf = { n: 0 };
    const { attempts, onProviderAttempt } = collector();

    const result = await runGroundedCveAnalysis({
      ...baseInput(),
      providerPreference: 'gemini',
      aiBinding: cloudflareOk(cf),
      onProviderAttempt,
    });

    expect(cf.n).toBe(0); // no silent substitution of another provider
    expect(result.status).toBe('FAIL');
    expect(result.provider).toBe('gemini');
    expect(result.error_code).toBe('GEMINI_UNCONFIGURED');
    expect(result.error_class).toBe('AUTH_FAILURE');
    expect(result.analysis).toBeNull();
    expect(attempts.length).toBe(1);
    expect(attempts[0]).toMatchObject({ provider: 'gemini', success: false, failure_class: 'AUTH_FAILURE' });
  });

  it('explicit gemini primary failure never cascades into a Cloudflare generation', async () => {
    const cf = { n: 0 };
    const gm = { n: 0 };
    const { attempts, onProviderAttempt } = collector();

    const result = await runGroundedCveAnalysis({
      ...baseInput(),
      providerPreference: 'gemini',
      aiBinding: cloudflareOk(cf),
      geminiApiKey: 'test-key',
      fetchFn: geminiFails(gm, 503, 'model overloaded'),
      onProviderAttempt,
    });

    // The forbidden Cloudflare→Gemini→Cloudflare loop is structurally impossible.
    expect(cf.n).toBe(0);
    expect(gm.n).toBe(1);
    expect(result.status).toBe('FAIL');
    expect(result.provider).toBe('gemini');
    expect(result.error_class).toBe('UNAVAILABLE');
    expect(result.fallback_used).toBe(false);
    expect(attempts.length).toBe(1);
  });

  it('explicit cloudflare selection never substitutes Gemini', async () => {
    const cf = { n: 0 };
    const gm = { n: 0 };
    const { attempts, onProviderAttempt } = collector();

    const result = await runGroundedCveAnalysis({
      ...baseInput(),
      providerPreference: 'cloudflare',
      aiBinding: { run: async () => { cf.n += 1; throw Object.assign(new Error('service unavailable'), { status: 503 }); } },
      geminiApiKey: 'test-key',
      fetchFn: geminiOk(gm),
      onProviderAttempt,
    });

    expect(cf.n).toBe(1);
    expect(gm.n).toBe(0);
    expect(result.status).toBe('FAIL');
    expect(result.provider).toBe('cloudflare');
    expect(result.fallback_used).toBe(false);
    expect(attempts.length).toBe(1);
  });

  it('providerModel overrides the Gemini model id (default is the verified current model)', async () => {
    const gm = { n: 0 };
    const result = await runGroundedCveAnalysis({
      ...baseInput(),
      providerPreference: 'gemini',
      providerModel: 'gemini-3.5-flash-lite',
      geminiApiKey: 'test-key',
      fetchFn: geminiOk(gm),
    });
    expect(result.model).toBe('gemini-3.5-flash-lite');
  });

  it('provider telemetry carries provider, model, outcome, latency window and token usage', async () => {
    const gm = { n: 0 };
    const { attempts, onProviderAttempt } = collector();

    const result = await runGroundedCveAnalysis({
      ...baseInput(),
      providerPreference: 'gemini',
      geminiApiKey: 'test-key',
      fetchFn: geminiOk(gm),
      onProviderAttempt,
    });

    expect(attempts[0].provider).toBe('gemini');
    expect(attempts[0].model).toBe(GEMINI_CVE_MODEL);
    expect(attempts[0].success).toBe(true);
    expect(attempts[0].input_tokens).toBe(21);
    expect(attempts[0].output_tokens).toBe(13);
    expect(Date.parse(attempts[0].finished_at)).toBeGreaterThanOrEqual(Date.parse(attempts[0].started_at));
    expect(result.latency_ms).toBeGreaterThanOrEqual(0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Evidence grounding — citations must reference evidence actually supplied
// ─────────────────────────────────────────────────────────────────────────────
function groundedPayload(evidence: unknown): string {
  return JSON.stringify({
    root_cause: 'Unsafe template evaluation',
    attack_vector: 'NETWORK',
    executive_assessment: 'Critical unauthenticated remote code execution.',
    evidence_used: evidence,
  });
}

function cloudflareText(text: string) {
  return { run: async () => ({ response: text, usage: { prompt_tokens: 10, completion_tokens: 5 } }) };
}

describe('GROUNDED CVE ANALYSIS — evidence grounding contract', () => {
  const EVIDENCE = ['KNOWLEDGE_CHUNK_1', 'KNOWLEDGE_CHUNK_2', 'SOURCE_FACT:cvss'];

  it('accepts an analysis that cites evidence it was actually given', async () => {
    const result = await runGroundedCveAnalysis({
      ...baseInput(),
      suppliedEvidenceIds: EVIDENCE,
      aiBinding: cloudflareText(groundedPayload(['KNOWLEDGE_CHUNK_2'])),
    });

    expect(result.status).toBe('PASS');
    expect(result.error_code).toBeNull();
    expect(result.error_class).toBeNull();
    expect(result.grounding.required).toBe(true);
    expect(result.grounding.evidence_supplied).toBe(3);
    expect(result.grounding.cited_evidence).toEqual(['KNOWLEDGE_CHUNK_2']);
    expect(result.grounding.unknown_citations).toEqual([]);
  });

  it('rejects an analysis that cites nothing it was given (unsupported, not unavailable)', async () => {
    const result = await runGroundedCveAnalysis({
      ...baseInput(),
      suppliedEvidenceIds: EVIDENCE,
      aiBinding: cloudflareText(groundedPayload([])),
    });

    expect(result.status).toBe('UNGROUNDED');
    expect(result.error_code).toBe('UNGROUNDED_ANALYSIS');
    expect(result.error_class).toBeNull(); // explicitly NOT a provider/model failure
    expect(result.grounding.evidence_supplied).toBe(3);
    expect(result.grounding.cited_evidence).toEqual([]);
  });

  it('rejects a fabricated evidence identifier', async () => {
    const result = await runGroundedCveAnalysis({
      ...baseInput(),
      suppliedEvidenceIds: EVIDENCE,
      aiBinding: cloudflareText(groundedPayload(['KNOWLEDGE_CHUNK_2', 'KNOWLEDGE_CHUNK_9'])),
    });

    expect(result.status).toBe('UNGROUNDED');
    expect(result.error_code).toBe('UNKNOWN_EVIDENCE_CITATION');
    expect(result.error_class).toBeNull();
    expect(result.grounding.unknown_citations).toEqual(['KNOWLEDGE_CHUNK_9']);
    expect(result.grounding.cited_evidence).toEqual(['KNOWLEDGE_CHUNK_2', 'KNOWLEDGE_CHUNK_9']);
  });

  it('rejects a malformed citation list', async () => {
    const result = await runGroundedCveAnalysis({
      ...baseInput(),
      suppliedEvidenceIds: EVIDENCE,
      aiBinding: cloudflareText(groundedPayload([{ id: 'KNOWLEDGE_CHUNK_1' }])),
    });

    expect(result.status).toBe('UNGROUNDED');
    expect(result.error_code).toBe('MALFORMED_EVIDENCE_CITATION');
    expect(result.error_class).toBeNull();
  });

  it('distinguishes an unsupported conclusion from an unavailable model', async () => {
    const ungrounded = await runGroundedCveAnalysis({
      ...baseInput(),
      suppliedEvidenceIds: EVIDENCE,
      aiBinding: cloudflareText(groundedPayload([])),
    });
    const modelFailure = await runGroundedCveAnalysis({
      ...baseInput(),
      suppliedEvidenceIds: EVIDENCE,
      aiBinding: { run: async () => { throw Object.assign(new Error('model not found'), { status: 404 }); } },
    });

    expect(ungrounded.status).toBe('UNGROUNDED');
    expect(ungrounded.error_class).toBeNull();
    expect(modelFailure.status).toBe('FAIL');
    expect(modelFailure.error_class).toBe('MODEL_FAILURE');
    expect(ungrounded.status).not.toBe(modelFailure.status);
  });

  it('does not require citations when no evidence identifiers were supplied', async () => {
    const result = await runGroundedCveAnalysis({
      ...baseInput(),
      aiBinding: cloudflareText(PASS_PAYLOAD),
    });

    expect(result.status).toBe('PASS');
    expect(result.grounding.required).toBe(false);
    expect(result.error_code).toBeNull();
  });

  it('requireEvidenceCitation forces the check even with no supplied identifiers', async () => {
    const result = await runGroundedCveAnalysis({
      ...baseInput(),
      requireEvidenceCitation: true,
      aiBinding: cloudflareText(groundedPayload(['KNOWLEDGE_CHUNK_1'])),
    });

    // A mandatory grounding contract with ZERO supplied evidence cannot be satisfied
    // at all, so the request itself is ungroundable: `EVIDENCE_UNAVAILABLE` is the
    // specific, truthful outcome, and the citation of an identifier that was never
    // supplied is derivative of it. This assertion changed only its error-code
    // expectation — the outcome was and remains a fail-closed `UNGROUNDED` with a
    // non-null error code, and no assertion was weakened or removed.
    expect(result.status).toBe('UNGROUNDED');
    expect(result.error_code).toBe('EVIDENCE_UNAVAILABLE');
  });
});
