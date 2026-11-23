import { beforeEach, describe, expect, it } from 'bun:test';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import {
  __resetAIProviderCircuits,
  providerAttemptErrorCode,
  runGroundedCveAnalysis,
  runGroundedInterpretation,
  type AIInterpretationRequest,
  type AIProviderAttempt,
  type GroundedCveAnalysisInput,
} from '../../packages/intelligence/src/ai/adapter';
import {
  PROVIDER_REASON_DAILY_ALLOCATION_EXHAUSTED,
  quotaPeriodFor,
  type AIProviderName,
  type AIProviderStatePort,
  type AIProviderStateRecord,
} from '../../packages/intelligence/src/ai/providerState';

/**
 * PROVIDER FAILURE ORIGIN — telemetry attribution.
 *
 * The measured defect: `AI_PROVIDER_ATTEMPT` persisted `error_message =
 * "retry_count=N"`, so a local circuit-open rejection and a real upstream provider
 * error were both recorded as `failure_class = UNAVAILABLE`. On 2026-10-13 that
 * made 268 immediate circuit rejections indistinguishable from 268 upstream
 * failures, and the Cloudflare outage could not be diagnosed from D1 at all.
 *
 * These tests pin the redacted origin token and prove routing is unchanged.
 */

const API_WORKER_SRC = readFileSync(
  fileURLToPath(new URL('../../workers/api/src/index.ts', import.meta.url)),
  'utf8',
);

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

function collector(): { attempts: AIProviderAttempt[]; onProviderAttempt: (a: AIProviderAttempt) => void } {
  const attempts: AIProviderAttempt[] = [];
  return { attempts, onProviderAttempt: (a: AIProviderAttempt) => { attempts.push(a); } };
}

beforeEach(() => {
  __resetAIProviderCircuits();
});

describe('providerAttemptErrorCode — the redacted origin token', () => {
  it('prefers the explicit adapter marker', () => {
    expect(providerAttemptErrorCode(Object.assign(new Error('provider circuit open'), { providerErrorCode: 'CIRCUIT_OPEN' }))).toBe('CIRCUIT_OPEN');
    expect(providerAttemptErrorCode(Object.assign(new Error('cloudflare skipped: x'), { providerErrorCode: 'PROVIDER_SKIPPED' }))).toBe('PROVIDER_SKIPPED');
  });

  it('reports the provider HTTP status when there is no marker', () => {
    expect(providerAttemptErrorCode(Object.assign(new Error('service unavailable'), { status: 503 }))).toBe('HTTP_503');
    expect(providerAttemptErrorCode(Object.assign(new Error('bad gateway'), { status: 502 }))).toBe('HTTP_502');
  });

  it('returns null when nothing is known, and never throws on odd input', () => {
    expect(providerAttemptErrorCode(new Error('plain failure'))).toBeNull();
    expect(providerAttemptErrorCode(null)).toBeNull();
    expect(providerAttemptErrorCode(undefined)).toBeNull();
    expect(providerAttemptErrorCode('string failure')).toBeNull();
    // A 2xx status is not a failure origin.
    expect(providerAttemptErrorCode(Object.assign(new Error('ok'), { status: 200 }))).toBeNull();
  });
});

describe('attempt telemetry separates an upstream error from a circuit rejection', () => {
  it('a real provider HTTP error is recorded as HTTP_503, not as a circuit rejection', async () => {
    const { attempts, onProviderAttempt } = collector();

    const result = await runGroundedCveAnalysis({
      ...baseInput(),
      aiBinding: { run: async () => { throw Object.assign(new Error('service unavailable'), { status: 503 }); } },
      onProviderAttempt,
    });

    expect(result.status).toBe('FAIL');
    expect(result.error_class).toBe('UNAVAILABLE');
    expect(attempts.length).toBe(1);
    expect(attempts[0].failure_class).toBe('UNAVAILABLE');
    expect(attempts[0].error_code).toBe('HTTP_503');
  });

  it('an immediate circuit-open rejection is recorded as CIRCUIT_OPEN', async () => {
    // First call: confirmed daily-allocation exhaustion opens the Cloudflare
    // circuit for the quota cooldown (5 minutes).
    await runGroundedCveAnalysis({
      ...baseInput(),
      aiBinding: { run: async () => { throw new Error('you have used up your daily free allocation of 10,000 neurons'); } },
    });

    const { attempts, onProviderAttempt } = collector();
    const second = await runGroundedCveAnalysis({
      ...baseInput(),
      cveId: 'CVE-2026-40001',
      aiBinding: { run: async () => { throw new Error('should never be called'); } },
      onProviderAttempt,
    });

    expect(second.status).toBe('FAIL');
    expect(attempts.length).toBe(1);
    // Same failure class as a real upstream failure — THAT is why the origin token
    // is required; the class alone cannot separate the two.
    expect(attempts[0].failure_class).toBe('UNAVAILABLE');
    expect(attempts[0].error_code).toBe('CIRCUIT_OPEN');
  });

  it('a successful attempt carries no failure origin', async () => {
    const { attempts, onProviderAttempt } = collector();
    const payload = JSON.stringify({
      vulnerability_type: 'Template Injection',
      root_cause: 'Unsafe template evaluation',
      attack_surface: 'Network-accessible web endpoints',
      attack_vector: 'NETWORK',
      executive_assessment: 'Critical unauthenticated remote code execution.',
      technical_assessment: 'Adversaries submit crafted expressions.',
    });

    const result = await runGroundedCveAnalysis({
      ...baseInput(),
      aiBinding: { run: async () => ({ response: payload }) },
      onProviderAttempt,
    });

    expect(result.status).toBe('PASS');
    expect(attempts[0].success).toBe(true);
    expect(attempts[0].error_code).toBeNull();
  });

  it('routing is unchanged: on the ONE permitted transition the attempt count and order are identical', async () => {
    const { attempts, onProviderAttempt } = collector();
    const cf = { n: 0 };
    const gm = { n: 0 };

    const result = await runGroundedCveAnalysis({
      ...baseInput(),
      // Confirmed daily-allocation exhaustion is the only automatic transition, so it
      // is the only case in which a SECOND attempt's origin can be observed at all.
      aiBinding: { run: async () => { cf.n += 1; throw new Error('You have used up your daily free allocation of 10,000 neurons. Your free allocation resets at 00:00 UTC.'); } },
      geminiApiKey: 'test-key',
      fetchFn: (async () => { gm.n += 1; return { ok: false, status: 503, json: async () => ({ error: { status: 'UNAVAILABLE', message: 'high demand' } }) }; }) as unknown as typeof fetch,
      onProviderAttempt,
    });

    // The telemetry change must not alter the bounded Cloudflare→Gemini transition.
    expect(cf.n).toBe(1);
    expect(gm.n).toBe(1);
    expect(result.fallback_used).toBe(true);
    expect(result.retry_count).toBe(1);
    expect(attempts.length).toBe(2);
    expect(attempts[0].failure_class).toBe('QUOTA_EXHAUSTED');
    // The quota evidence carries no HTTP status, so no HTTP token is invented for it;
    // the secondary attempt's real upstream 503 still is recorded as such.
    expect(attempts[0].error_code).toBeNull();
    expect(attempts[1].error_code).toBe('HTTP_503');
  });

  it('a transient primary failure is not re-routed, so no secondary attempt or origin exists', async () => {
    const { attempts, onProviderAttempt } = collector();
    const cf = { n: 0 };
    const gm = { n: 0 };

    const result = await runGroundedCveAnalysis({
      ...baseInput(),
      aiBinding: { run: async () => { cf.n += 1; throw Object.assign(new Error('service unavailable'), { status: 503 }); } },
      geminiApiKey: 'test-key',
      fetchFn: (async () => { gm.n += 1; return { ok: false, status: 503, json: async () => ({ error: { status: 'UNAVAILABLE', message: 'high demand' } }) }; }) as unknown as typeof fetch,
      onProviderAttempt,
    });

    expect(cf.n).toBe(1);
    expect(gm.n).toBe(0);
    expect(result.fallback_used).toBe(false);
    expect(attempts.length).toBe(1);
    expect(attempts[0].error_code).toBe('HTTP_503');
  });
});

describe('the persisted trace carries the origin without leaking content', () => {
  it('the API worker writes provider_error next to retry_count', () => {
    expect(API_WORKER_SRC).toContain('provider_error=${attempt.error_code}');
  });

  it('the telemetry statement keeps 11 placeholders and interpolates no secrets', () => {
    // Mechanical placeholder/bind equality for this statement is already asserted
    // by tests/unit/sql_bind_arity.test.ts; this pins the SQL shape the origin token
    // was added to, so a rewrite cannot silently drop the column set.
    // The file has two event_trace INSERT statements — the provider telemetry one and
    // the `trace()` helper — so enumerate them and select the 11-column telemetry one
    // (the same way tests/unit/sql_bind_arity.test.ts classifies them).
    const found: Array<{ sql: string; close: number }> = [];
    let cursor = API_WORKER_SRC.indexOf('INSERT INTO event_trace');
    while (cursor >= 0) {
      found.push({
        sql: API_WORKER_SRC.slice(API_WORKER_SRC.lastIndexOf('`', cursor) + 1, API_WORKER_SRC.indexOf('`', cursor)),
        close: API_WORKER_SRC.indexOf('`', cursor),
      });
      cursor = API_WORKER_SRC.indexOf('INSERT INTO event_trace', cursor + 1);
    }
    expect(found.length).toBe(2);

    const telemetry = found.find((statement) => (statement.sql.match(/\?/g) || []).length === 11);
    expect(telemetry).toBeDefined();
    expect(telemetry!.sql).toContain('error_message');
    const end = telemetry!.close;

    // The bound message may only carry the retry index and the origin token — no
    // credential, prompt or response body.
    const bindEnd = API_WORKER_SRC.indexOf(').run();', end);
    const binds = API_WORKER_SRC.slice(end, bindEnd);
    expect(binds).toContain('provider_error=${attempt.error_code}');
    expect(binds).not.toMatch(/apiKey|API_KEY|raw_response|prompt/);
  });
});

/**
 * The SHARED INTERPRETATION BOUNDARY must carry the same origin taxonomy as the
 * CVE boundary. It did not: it threw with `normalizedClass` only, so a circuit
 * rejection and a quota skip there persisted `error_code = null` and could not be
 * told apart from an unattributed failure. These tests pin the corrected marker.
 */
describe('the interpretation boundary records the same origin taxonomy as the CVE boundary', () => {
  const request = (overrides: Partial<AIInterpretationRequest>): AIInterpretationRequest => ({
    systemPrompt: 'system',
    userContent: 'user',
    geminiApiKey: 'test-key',
    ...overrides,
  });

  const geminiMustNotBeReached = (async () => {
    throw new Error('gemini must not be reached on this path');
  }) as unknown as typeof fetch;

  const exhaustedNow = (now: Date): AIProviderStateRecord => ({
    provider: 'cloudflare',
    availability: 'EXHAUSTED',
    quota_period: quotaPeriodFor(now),
    reason: PROVIDER_REASON_DAILY_ALLOCATION_EXHAUSTED,
    evidence: '4006: you have used up your daily free allocation of 10,000 neurons',
    observed_at: now.toISOString(),
    reset_at: new Date(now.getTime() + 86_400_000).toISOString(),
  });

  function statePort(record: AIProviderStateRecord | null): AIProviderStatePort {
    const rows = new Map<string, AIProviderStateRecord>();
    return {
      load: async (provider: AIProviderName) => {
        if (record && record.provider === provider) return record;
        return rows.get(provider) ?? null;
      },
      save: async (next: AIProviderStateRecord) => {
        rows.set(next.provider, next);
      },
    };
  }

  it('a local circuit-open rejection is recorded as CIRCUIT_OPEN, not as an unattributed failure', async () => {
    // Trip the Cloudflare circuit with a transient upstream failure.
    await runGroundedInterpretation(request({
      aiBinding: { run: async () => { throw Object.assign(new Error('service unavailable'), { status: 503 }); } },
      fetchFn: geminiMustNotBeReached,
    }));

    // The next request must be rejected locally, and must say so.
    const { attempts, onProviderAttempt } = collector();
    const cf = { n: 0 };
    const result = await runGroundedInterpretation(request({
      aiBinding: { run: async () => { cf.n += 1; return {}; } },
      fetchFn: geminiMustNotBeReached,
      onProviderAttempt,
    }));

    expect(cf.n).toBe(0);
    expect(result.status).toBe('FAIL');
    expect(attempts.length).toBe(1);
    expect(attempts[0].failure_class).toBe('UNAVAILABLE');
    expect(attempts[0].error_code).toBe('CIRCUIT_OPEN');
  });

  it('a confirmed current-period quota skip is recorded as PROVIDER_SKIPPED and still fails over', async () => {
    const { attempts, onProviderAttempt } = collector();
    const cf = { n: 0 };
    const gm = { n: 0 };

    await runGroundedInterpretation(request({
      aiBinding: { run: async () => { cf.n += 1; return {}; } },
      fetchFn: (async () => {
        gm.n += 1;
        return { ok: false, status: 503, json: async () => ({ error: { status: 'UNAVAILABLE', message: 'high demand' } }) };
      }) as unknown as typeof fetch,
      providerState: statePort(exhaustedNow(new Date())),
      onProviderAttempt,
    }));

    expect(cf.n).toBe(0); // skipped, never contacted
    expect(gm.n).toBe(1); // the ONE permitted automatic transition still happens
    const primary = attempts.find((a) => a.provider === 'cloudflare');
    expect(primary).toBeDefined();
    expect(primary!.failure_class).toBe('QUOTA_EXHAUSTED');
    expect(primary!.error_code).toBe('PROVIDER_SKIPPED');
  });

  it('a real upstream error is recorded as its HTTP status, never as a local decision', async () => {
    const { attempts, onProviderAttempt } = collector();
    await runGroundedInterpretation(request({
      aiBinding: { run: async () => { throw Object.assign(new Error('service unavailable'), { status: 503 }); } },
      fetchFn: geminiMustNotBeReached,
      onProviderAttempt,
    }));

    expect(attempts[0].failure_class).toBe('UNAVAILABLE');
    expect(attempts[0].error_code).toBe('HTTP_503');
  });
});

describe('the failure class alone cannot identify a cause; the origin can', () => {
  it('a circuit rejection and a real upstream failure share UNAVAILABLE but differ in error_code', async () => {
    const upstream = collector();
    await runGroundedInterpretation({
      systemPrompt: 'system',
      userContent: 'user',
      aiBinding: { run: async () => { throw Object.assign(new Error('x'), { status: 503 }); } },
      fetchFn: (async () => { throw new Error('no'); }) as unknown as typeof fetch,
      onProviderAttempt: upstream.onProviderAttempt,
    });

    // Same class, same provider — now the origin separates them.
    const circuit = collector();
    await runGroundedInterpretation({
      systemPrompt: 'system',
      userContent: 'user',
      aiBinding: { run: async () => ({}) },
      fetchFn: (async () => { throw new Error('no'); }) as unknown as typeof fetch,
      onProviderAttempt: circuit.onProviderAttempt,
    });

    expect(upstream.attempts[0].failure_class).toBe(circuit.attempts[0].failure_class);
    expect(upstream.attempts[0].error_code).not.toBe(circuit.attempts[0].error_code);
    expect([upstream.attempts[0].error_code, circuit.attempts[0].error_code].sort()).toEqual([
      'CIRCUIT_OPEN',
      'HTTP_503',
    ]);
  });
});
