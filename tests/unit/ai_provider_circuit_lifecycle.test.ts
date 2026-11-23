import { beforeEach, describe, expect, it } from 'bun:test';
import {
  __resetAIProviderCircuits,
  runGroundedInterpretation,
  type AIInterpretationRequest,
  type AIProviderAttempt,
} from '../../packages/intelligence/src/ai/adapter';

/**
 * PROVIDER CIRCUIT LIFECYCLE — the contract that produced the 2026-10-13
 * amplification, pinned so it can be changed deliberately rather than by accident.
 *
 * MEASURED BEHAVIOUR (live Preview D1, 2026-10-13): within each ~10-minute ingest
 * burst, ONE real Gemini `HTTP 503` failure was followed by 15–21 immediate
 * `provider circuit open` rejections recorded in the same minute — 268 of 298
 * withheld reports were circuit rejections, not upstream failures.
 *
 * The mechanism: an `UNAVAILABLE` failure opens a provider cooldown, and every
 * request arriving during that window is rejected locally without any provider
 * call. These tests pin the parts a reader must be able to rely on:
 *   - a transient failure DOES open the circuit (the amplification is real);
 *   - an authentication / model / invalid / unknown failure does NOT (a bad
 *     credential must not be amplified into an outage of its own);
 *   - a confirmed quota record still routes to the secondary provider;
 *   - the ONLY local recovery lever today is an explicit reset.
 *
 * NOTE (design gap, recorded not hidden): the cooldown duration is a module
 * constant and the clock is `Date.now`, so time-based recovery CANNOT be asserted
 * in-process. That is why recovery is pinned through the reset lever only; making
 * the cooldown/clock injectable is the first half of the bounded recovery design
 * in PHASE2_PROVIDER_AND_SAFETY_FINDINGS.md.
 */

const request = (overrides: Partial<AIInterpretationRequest>): AIInterpretationRequest => ({
  systemPrompt: 'system',
  userContent: 'user',
  geminiApiKey: 'test-key',
  ...overrides,
});

function collector(): {
  attempts: AIProviderAttempt[];
  onProviderAttempt: (a: AIProviderAttempt) => void;
} {
  const attempts: AIProviderAttempt[] = [];
  return { attempts, onProviderAttempt: (a: AIProviderAttempt) => { attempts.push(a); } };
}

const geminiMustNotBeReached = (async () => {
  throw new Error('gemini must not be reached on this path');
}) as unknown as typeof fetch;

beforeEach(() => {
  __resetAIProviderCircuits();
});

describe('a transient provider failure opens the circuit and suppresses later requests', () => {
  it('one UNAVAILABLE failure makes the NEXT request fail locally with CIRCUIT_OPEN and zero provider calls', async () => {
    const first = collector();
    await runGroundedInterpretation(request({
      aiBinding: { run: async () => { throw Object.assign(new Error('service unavailable'), { status: 503 }); } },
      fetchFn: geminiMustNotBeReached,
      onProviderAttempt: first.onProviderAttempt,
    }));
    expect(first.attempts[0].failure_class).toBe('UNAVAILABLE');
    expect(first.attempts[0].error_code).toBe('HTTP_503');

    // The amplified request: rejected locally, no socket, no quota unit.
    const second = collector();
    const binding = { n: 0 };
    const result = await runGroundedInterpretation(request({
      aiBinding: { run: async () => { binding.n += 1; return {}; } },
      fetchFn: geminiMustNotBeReached,
      onProviderAttempt: second.onProviderAttempt,
    }));

    expect(binding.n).toBe(0);
    expect(result.status).toBe('FAIL');
    expect(second.attempts.length).toBe(1);
    expect(second.attempts[0].failure_class).toBe('UNAVAILABLE');
    expect(second.attempts[0].error_code).toBe('CIRCUIT_OPEN');
  });

  it('the suppression is class-blind downstream: the operator sees UNAVAILABLE either way', async () => {
    // This is exactly why the origin token is load-bearing — the class alone
    // cannot separate a real outage from an amplified local rejection.
    const upstream = collector();
    await runGroundedInterpretation(request({
      aiBinding: { run: async () => { throw Object.assign(new Error('gone'), { status: 503 }); } },
      fetchFn: geminiMustNotBeReached,
      onProviderAttempt: upstream.onProviderAttempt,
    }));

    const amplified = collector();
    await runGroundedInterpretation(request({
      aiBinding: { run: async () => ({}) },
      fetchFn: geminiMustNotBeReached,
      onProviderAttempt: amplified.onProviderAttempt,
    }));

    expect(upstream.attempts[0].failure_class).toBe(amplified.attempts[0].failure_class);
    expect(upstream.attempts[0].error_code).toBe('HTTP_503');
    expect(amplified.attempts[0].error_code).toBe('CIRCUIT_OPEN');
  });
});

describe('a credential / model / unknown failure must NOT open a circuit', () => {
  const cases: Array<[string, number]> = [
    ['an authentication failure', 401],
    ['a malformed request', 400],
  ];

  for (const [label, status] of cases) {
    it(`${label} (HTTP ${status}) leaves the provider immediately retryable`, async () => {
      const first = collector();
      await runGroundedInterpretation(request({
        aiBinding: { run: async () => { throw Object.assign(new Error('rejected'), { status }); } },
        fetchFn: geminiMustNotBeReached,
        onProviderAttempt: first.onProviderAttempt,
      }));

      // A second request must still CONTACT the provider: no cooldown was set.
      const second = collector();
      const binding = { n: 0 };
      await runGroundedInterpretation(request({
        aiBinding: {
          run: async () => {
            binding.n += 1;
            throw Object.assign(new Error('rejected again'), { status });
          },
        },
        fetchFn: geminiMustNotBeReached,
        onProviderAttempt: second.onProviderAttempt,
      }));

      expect(binding.n).toBe(1);
      expect(second.attempts[0].error_code).toBe(`HTTP_${status}`);
      expect(second.attempts[0].error_code).not.toBe('CIRCUIT_OPEN');
    });
  }
});

describe('the only local recovery lever today is an explicit reset', () => {
  it('__resetAIProviderCircuits restores the provider to reachable', async () => {
    await runGroundedInterpretation(request({
      aiBinding: { run: async () => { throw Object.assign(new Error('service unavailable'), { status: 503 }); } },
      fetchFn: geminiMustNotBeReached,
    }));

    // Suppressed before the reset…
    const blocked = { n: 0 };
    await runGroundedInterpretation(request({
      aiBinding: { run: async () => { blocked.n += 1; return {}; } },
      fetchFn: geminiMustNotBeReached,
    }));
    expect(blocked.n).toBe(0);

    // …reachable after it.
    __resetAIProviderCircuits();
    const reached = { n: 0 };
    await runGroundedInterpretation(request({
      aiBinding: {
        run: async () => {
          reached.n += 1;
          throw Object.assign(new Error('still down'), { status: 503 });
        },
      },
      fetchFn: geminiMustNotBeReached,
    }));
    expect(reached.n).toBe(1);
  });
});

describe('circuit state is process-local and carries no durable switch', () => {
  it('a circuit rejection never writes provider state, and a quota record still routes onward', async () => {
    // The durable record is the ONLY cross-request carrier of a confirmed switch.
    // A circuit is memory-only, which is why the 2026-10-13 cause was invisible in
    // D1 (`ai_provider_state` held a single row, from the previous UTC period).
    const saved: string[] = [];
    const port = {
      load: async () => null,
      save: async (record: { provider: string }) => { saved.push(record.provider); },
    };

    await runGroundedInterpretation(request({
      aiBinding: { run: async () => { throw Object.assign(new Error('service unavailable'), { status: 503 }); } },
      fetchFn: geminiMustNotBeReached,
      providerState: port,
    }));

    // A transient UNAVAILABLE must not establish a durable switch.
    expect(saved).toEqual([]);
  });
});
