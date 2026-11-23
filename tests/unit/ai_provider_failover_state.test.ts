/**
 * AI PROVIDER FAILOVER — durable switch state machine
 *
 * Covers the contract in VULNERABILITY_PROVIDER_FAILOVER_REPORT.md:
 *   1. quota period arithmetic (UTC day; Cloudflare's free allocation resets 00:00 UTC)
 *   2. exhaustion evidence: the DAILY-allocation condition is recognised by its own
 *      evidence (HTTP 429 / code 3036, 4006 observed, "daily free allocation of
 *      10,000 neurons") and is NOT conflated with a transient 429
 *   3. only a CONFIRMED daily-allocation exhaustion establishes a durable switch
 *   4. the switch survives across requests/instances, so Cloudflare is not
 *      re-attempted per CVE once the period is exhausted
 *   5. the period rollover (or nothing else) clears it
 *   6. an explicit provider selection and a missing Gemini credential both produce
 *      an observable failure instead of a silent loop back to Cloudflare
 *   7. evidence grounding through the SAME shared boundary
 */
import { beforeEach, describe, expect, it } from 'bun:test';
import {
  __resetAIProviderCircuits,
  GEMINI_CVE_MODEL,
  PROVIDER_REASON_DAILY_ALLOCATION_EXHAUSTED,
  availableRecordFor,
  dailyAllocationExhaustionEvidence,
  isPersistentProviderFailure,
  nextQuotaReset,
  providerAvailabilityDecision,
  providerErrorCode,
  quotaPeriodFor,
  reduceProviderState,
  resolveProviderPreference,
  runGroundedCveAnalysis,
  type AIProviderStatePort,
  type AIProviderStateRecord,
  type GroundedCveAnalysisInput,
} from '@zayron/intelligence';

// ── Cloudflare's own documented error for a spent daily allocation ──────────
const DAILY_ALLOCATION_MESSAGE =
  'You have used up your daily free allocation of 10,000 neurons. Please upgrade to Cloudflare\'s Workers Paid plan if you would like to continue usage.';

function dailyAllocationExhausted(): Error {
  return Object.assign(new Error(DAILY_ALLOCATION_MESSAGE), { code: 3036 });
}

function capacityOverloaded(): Error {
  return Object.assign(new Error('Capacity temporarily exceeded, please try again.'), { code: 3040 });
}

const PASS_PAYLOAD = JSON.stringify({
  vulnerability_type: 'Template Injection',
  root_cause: 'Unsafe template evaluation',
  attack_surface: 'Network-accessible web endpoints',
  attack_vector: 'NETWORK',
  executive_assessment: 'Critical unauthenticated remote code execution.',
  technical_assessment: 'Adversaries submit crafted expressions evaluated by the template engine.',
});

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

/** Binding that always fails with the supplied error and counts attempts. */
function cloudflareFails(error: () => Error, counter: { n: number }) {
  return {
    run: async () => {
      counter.n += 1;
      throw error();
    },
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

function geminiReturns(payload: string, counter: { n: number }) {
  return (async () => {
    counter.n += 1;
    return {
      ok: true,
      status: 200,
      json: async () => ({ candidates: [{ content: { parts: [{ text: payload }] } }] }),
    };
  }) as unknown as typeof fetch;
}

/**
 * Durable-store test double. NOTE: an in-memory map is acceptable ONLY as a test
 * double — the production implementation is D1 (`workers/api/src/aiProviderState.ts`),
 * because isolate memory is precisely what failed before.
 */
function testPort(): AIProviderStatePort & { rows: Map<string, AIProviderStateRecord>; saves: number } {
  const rows = new Map<string, AIProviderStateRecord>();
  return {
    rows,
    saves: 0,
    async load(provider) {
      return rows.get(provider) ?? null;
    },
    async save(record) {
      (this as any).saves += 1;
      rows.set(record.provider, record);
    },
  };
}

beforeEach(() => {
  __resetAIProviderCircuits();
});

describe('1 — quota period arithmetic (Cloudflare free allocation resets 00:00 UTC)', () => {
  it('keys the period on the UTC day', () => {
    expect(quotaPeriodFor(new Date('2026-10-11T00:00:00.000Z'))).toBe('2026-10-11');
    expect(quotaPeriodFor(new Date('2026-10-11T23:59:59.999Z'))).toBe('2026-10-11');
    expect(quotaPeriodFor(new Date('2026-10-12T00:00:00.000Z'))).toBe('2026-10-12');
  });

  it('resets at the NEXT 00:00 UTC, including across month and year boundaries', () => {
    expect(nextQuotaReset(new Date('2026-10-11T13:20:00.000Z'))).toBe('2026-10-12T00:00:00.000Z');
    expect(nextQuotaReset(new Date('2026-10-31T23:10:00.000Z'))).toBe('2026-11-01T00:00:00.000Z');
    expect(nextQuotaReset(new Date('2026-12-31T23:10:00.000Z'))).toBe('2027-01-01T00:00:00.000Z');
  });
});

describe('2 — exhaustion evidence is specific, and transient 429s are excluded', () => {
  it("recognises Cloudflare's documented daily-allocation error (429 / 3036)", () => {
    const evidence = dailyAllocationExhaustionEvidence(dailyAllocationExhausted());
    expect(evidence).not.toBeNull();
    expect(String(evidence)).toContain('daily free allocation');
  });

  it('recognises the observed 4006 variant and message-only variants', () => {
    expect(dailyAllocationExhaustionEvidence(Object.assign(new Error('quota'), { code: 4006 }))).not.toBeNull();
    expect(dailyAllocationExhaustionEvidence(new Error('Used up your daily free allocation of 10,000 neurons'))).not.toBeNull();
    expect(dailyAllocationExhaustionEvidence(new Error('You are out of neurons for today'))).not.toBeNull();
  });

  it('does NOT treat capacity overload (429 / 3040) as a spent allocation', () => {
    expect(dailyAllocationExhaustionEvidence(capacityOverloaded())).toBeNull();
    expect(dailyAllocationExhaustionEvidence(new Error('Capacity temporarily exceeded, please try again.'))).toBeNull();
  });

  it('does NOT treat a generic rate limit, timeout, auth, model or malformed error as a spent allocation', () => {
    expect(dailyAllocationExhaustionEvidence(Object.assign(new Error('Too many requests'), { status: 429 }))).toBeNull();
    expect(dailyAllocationExhaustionEvidence(new Error('AI provider timeout'))).toBeNull();
    expect(dailyAllocationExhaustionEvidence(new Error('unauthorized: invalid api key'))).toBeNull();
    expect(dailyAllocationExhaustionEvidence(new Error('model not found'))).toBeNull();
    expect(dailyAllocationExhaustionEvidence(new Error('invalid request body'))).toBeNull();
  });

  it('reads a numeric provider code from the error, its body, or inline in the message', () => {
    expect(providerErrorCode(Object.assign(new Error('x'), { code: 3036 }))).toBe(3036);
    expect(providerErrorCode({ error: { code: 3040 } })).toBe(3040);
    expect(providerErrorCode(new Error('Workers AI error code 3036'))).toBe(3036);
    expect(providerErrorCode(new Error('no code here'))).toBeNull();
  });

  it('only QUOTA_EXHAUSTED is a persistent failure class', () => {
    expect(isPersistentProviderFailure('QUOTA_EXHAUSTED')).toBe(true);
    for (const transient of ['RATE_LIMITED', 'TIMEOUT', 'UNAVAILABLE', 'AUTH_FAILURE', 'MODEL_FAILURE', 'INVALID_REQUEST', 'UNKNOWN', null]) {
      expect(isPersistentProviderFailure(transient)).toBe(false);
    }
  });
});

describe('3 — availability decision', () => {
  it('skips a provider exhausted in the CURRENT period', () => {
    const now = new Date('2026-10-11T10:00:00.000Z');
    const record = reduceProviderState(null, {
      provider: 'cloudflare', success: false, failureClass: 'QUOTA_EXHAUSTED', error: dailyAllocationExhausted(),
    }, now);
    expect(record).not.toBeNull();
    expect(record!.reason).toBe(PROVIDER_REASON_DAILY_ALLOCATION_EXHAUSTED);
    expect(record!.reset_at).toBe('2026-10-12T00:00:00.000Z');

    const decision = providerAvailabilityDecision(record, now);
    expect(decision.skip).toBe(true);
    expect(decision.reason).toBe(PROVIDER_REASON_DAILY_ALLOCATION_EXHAUSTED);
    expect(decision.periodRolledOver).toBe(false);
  });

  it('ignores a record from an EARLIER period and reports the rollover', () => {
    const previous = reduceProviderState(null, {
      provider: 'cloudflare', success: false, failureClass: 'QUOTA_EXHAUSTED', error: dailyAllocationExhausted(),
    }, new Date('2026-10-11T09:00:00.000Z'))!;
    const decision = providerAvailabilityDecision(previous, new Date('2026-10-12T09:00:00.000Z'));
    expect(decision.skip).toBe(false);
    expect(decision.periodRolledOver).toBe(true);
  });

  it('never skips without a record', () => {
    expect(providerAvailabilityDecision(null).skip).toBe(false);
    expect(providerAvailabilityDecision(availableRecordFor('cloudflare')).skip).toBe(false);
  });
});

describe('4 — reducer writes only on a CONFIRMED exhaustion', () => {
  const now = new Date('2026-10-11T12:00:00.000Z');

  it('persists on confirmed daily-allocation exhaustion', () => {
    const record = reduceProviderState(null, {
      provider: 'cloudflare', success: false, failureClass: 'QUOTA_EXHAUSTED', error: dailyAllocationExhausted(),
    }, now);
    expect(record?.availability).toBe('EXHAUSTED');
    expect(record?.quota_period).toBe('2026-10-11');
  });

  it('writes NOTHING for capacity, rate-limit, timeout, auth, model or malformed failures', () => {
    const cases: Array<{ failureClass: string; error: unknown }> = [
      { failureClass: 'UNAVAILABLE', error: capacityOverloaded() },
      { failureClass: 'RATE_LIMITED', error: Object.assign(new Error('Too many requests'), { status: 429 }) },
      { failureClass: 'TIMEOUT', error: new Error('AI provider timeout') },
      { failureClass: 'AUTH_FAILURE', error: new Error('unauthorized') },
      { failureClass: 'MODEL_FAILURE', error: new Error('model not found') },
      { failureClass: 'INVALID_REQUEST', error: new Error('invalid request') },
    ];
    for (const testCase of cases) {
      expect(reduceProviderState(null, { provider: 'cloudflare', success: false, failureClass: testCase.failureClass, error: testCase.error }, now)).toBeNull();
    }
  });

  it('writes nothing on success and does not clear an existing switch', () => {
    const previous = reduceProviderState(null, {
      provider: 'cloudflare', success: false, failureClass: 'QUOTA_EXHAUSTED', error: dailyAllocationExhausted(),
    }, now)!;
    expect(reduceProviderState(previous, { provider: 'cloudflare', success: true, failureClass: null }, now)).toBeNull();
    expect(previous.availability).toBe('EXHAUSTED');
  });

  it('does not rewrite an already-recorded period', () => {
    const previous = reduceProviderState(null, {
      provider: 'cloudflare', success: false, failureClass: 'QUOTA_EXHAUSTED', error: dailyAllocationExhausted(),
    }, now)!;
    expect(reduceProviderState(previous, {
      provider: 'cloudflare', success: false, failureClass: 'QUOTA_EXHAUSTED', error: dailyAllocationExhausted(),
    }, now)).toBeNull();
  });
});

describe('5 — adapter routing honours the durable switch', () => {
  it('A: first request — Cloudflare attempted once, falls back to Gemini, persists the switch', async () => {
    const cf = { n: 0 };
    const gm = { n: 0 };
    const port = testPort();

    const result = await runGroundedCveAnalysis({
      ...baseInput(),
      aiBinding: cloudflareFails(dailyAllocationExhausted, cf),
      geminiApiKey: 'test-key',
      fetchFn: geminiOk(gm),
      providerState: port,
    });

    expect(cf.n).toBe(1);
    expect(gm.n).toBe(1);
    expect(result.status).toBe('PASS');
    expect(result.provider).toBe('gemini');
    expect(result.model).toBe(GEMINI_CVE_MODEL);
    expect(result.fallback_used).toBe(true);
    expect(result.retry_count).toBe(1);

    const stored = port.rows.get('cloudflare');
    expect(stored?.availability).toBe('EXHAUSTED');
    expect(stored?.reason).toBe(PROVIDER_REASON_DAILY_ALLOCATION_EXHAUSTED);
    expect(port.saves).toBe(1);
  });

  it('B: subsequent CVEs do NOT re-attempt Cloudflare — even after the in-memory circuit is cleared', async () => {
    const cf = { n: 0 };
    const gm = { n: 0 };
    const port = testPort();

    // First request establishes the durable switch.
    await runGroundedCveAnalysis({
      ...baseInput(),
      aiBinding: cloudflareFails(dailyAllocationExhausted, cf),
      geminiApiKey: 'test-key',
      fetchFn: geminiOk(gm),
      providerState: port,
    });
    expect(cf.n).toBe(1);

    // Drop the isolate-local circuit so ONLY the durable record can explain the
    // behaviour below. This is the regression that matters: the previous
    // implementation kept the fact in memory with a 5-minute cooldown, so a fresh
    // isolate (or a later request) retried Cloudflare every time.
    __resetAIProviderCircuits();

    const second = await runGroundedCveAnalysis({
      ...baseInput(),
      cveId: 'CVE-2026-40001',
      aiBinding: cloudflareFails(dailyAllocationExhausted, cf),
      geminiApiKey: 'test-key',
      fetchFn: geminiOk(gm),
      providerState: port,
    });

    // THE load-bearing assertion: no Cloudflare request was issued for the second
    // CVE. `fallback_used`/`retry_count` still describe the transition to the
    // secondary provider (the skipped primary produced no answer), so they are not
    // the right signal for "was Cloudflare contacted?" — `cf.n` is.
    expect(cf.n).toBe(1); // unchanged: Cloudflare was NOT contacted again
    expect(gm.n).toBe(2);
    expect(second.provider).toBe('gemini');
    expect(second.status).toBe('PASS');
    expect(second.retry_count).toBe(1);
    expect(port.saves).toBe(1); // no redundant rewrite
  });

  it('C: an explicit cloudflare selection fails observably and never substitutes Gemini', async () => {
    const cf = { n: 0 };
    const gm = { n: 0 };
    const port = testPort();
    await runGroundedCveAnalysis({
      ...baseInput(),
      aiBinding: cloudflareFails(dailyAllocationExhausted, cf),
      geminiApiKey: 'test-key',
      fetchFn: geminiOk(gm),
      providerState: port,
    });
    __resetAIProviderCircuits();

    const result = await runGroundedCveAnalysis({
      ...baseInput(),
      providerPreference: 'cloudflare',
      aiBinding: cloudflareFails(dailyAllocationExhausted, cf),
      geminiApiKey: 'test-key',
      fetchFn: geminiOk(gm),
      providerState: port,
    });

    expect(result.status).toBe('FAIL');
    expect(result.error_class).toBe('QUOTA_EXHAUSTED');
    expect(result.provider).toBe('cloudflare');
    expect(gm.n).toBe(1); // unchanged from the first request
  });

  it('D: exhausted period with NO Gemini credential fails explicitly instead of looping back to Cloudflare', async () => {
    const cf = { n: 0 };
    const port = testPort();
    await runGroundedCveAnalysis({
      ...baseInput(),
      aiBinding: cloudflareFails(dailyAllocationExhausted, cf),
      geminiApiKey: 'test-key',
      fetchFn: geminiOk({ n: 0 }),
      providerState: port,
    });
    __resetAIProviderCircuits();

    const result = await runGroundedCveAnalysis({
      ...baseInput(),
      aiBinding: cloudflareFails(dailyAllocationExhausted, cf),
      providerState: port,
    });

    expect(result.status).toBe('FAIL');
    expect(result.error_class).toBe('QUOTA_EXHAUSTED');
    expect(cf.n).toBe(1); // still exactly one Cloudflare attempt in the whole test
  });

  it('E: when the quota period rolls over, Cloudflare is attempted again', async () => {
    const cf = { n: 0 };
    const gm = { n: 0 };
    const port = testPort();
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
    port.rows.set('cloudflare', {
      provider: 'cloudflare',
      availability: 'EXHAUSTED',
      quota_period: quotaPeriodFor(yesterday),
      reason: PROVIDER_REASON_DAILY_ALLOCATION_EXHAUSTED,
      evidence: DAILY_ALLOCATION_MESSAGE,
      observed_at: yesterday.toISOString(),
      reset_at: nextQuotaReset(yesterday),
    });
    __resetAIProviderCircuits();

    const result = await runGroundedCveAnalysis({
      ...baseInput(),
      aiBinding: cloudflareOk(cf),
      geminiApiKey: 'test-key',
      fetchFn: geminiOk(gm),
      providerState: port,
    });

    expect(cf.n).toBe(1);
    expect(gm.n).toBe(0);
    expect(result.provider).toBe('cloudflare');
    expect(result.status).toBe('PASS');
  });

  it('F: a capacity 429 stays transient — nothing is persisted, Gemini is not invoked, and Cloudflare is retried', async () => {
    const cf = { n: 0 };
    const gm = { n: 0 };
    const port = testPort();

    const first = await runGroundedCveAnalysis({
      ...baseInput(),
      aiBinding: cloudflareFails(capacityOverloaded, cf),
      geminiApiKey: 'test-key',
      fetchFn: geminiOk(gm),
      providerState: port,
    });
    // Capacity overload is a condition of the request, not spent quota: it is
    // reported with its own class, never re-routed to another provider, and never
    // made durable.
    expect(first.provider).toBe('cloudflare');
    expect(first.error_class).toBe('UNAVAILABLE');
    expect(first.fallback_used).toBe(false);
    expect(gm.n).toBe(0);
    expect(port.rows.has('cloudflare')).toBe(false);
    expect(port.saves).toBe(0);

    __resetAIProviderCircuits();
    const second = await runGroundedCveAnalysis({
      ...baseInput(),
      aiBinding: cloudflareOk(cf),
      geminiApiKey: 'test-key',
      fetchFn: geminiOk(gm),
      providerState: port,
    });
    expect(cf.n).toBe(2); // Cloudflare was retried: the condition was not durable
    expect(second.provider).toBe('cloudflare');
  });

  it('G: a healthy store read is a no-op and Cloudflare keeps primary routing', async () => {
    const cf = { n: 0 };
    const gm = { n: 0 };
    const port = testPort();
    const result = await runGroundedCveAnalysis({
      ...baseInput(),
      aiBinding: cloudflareOk(cf),
      geminiApiKey: 'test-key',
      fetchFn: geminiOk(gm),
      providerState: port,
    });
    expect(result.provider).toBe('cloudflare');
    expect(cf.n).toBe(1);
    expect(gm.n).toBe(0);
    expect(port.saves).toBe(0);
  });
});

describe('6 — provider preference policy', () => {
  it('an explicit preference always wins', () => {
    expect(resolveProviderPreference({ AI_PROVIDER_PREFERENCE: 'gemini', ENVIRONMENT: 'preview', GEMINI_API_KEY: 'k' })).toBe('gemini');
    expect(resolveProviderPreference({ AI_PROVIDER_PREFERENCE: 'cloudflare', ENVIRONMENT: 'preview', GEMINI_API_KEY: 'k' })).toBe('cloudflare');
  });

  it('preview + a Gemini credential NO LONGER auto-selects Gemini (Cloudflare is used first)', () => {
    // Regression: this used to return 'gemini', which meant the Cloudflare free
    // allocation was never consumed at all once a key existed.
    expect(resolveProviderPreference({ ENVIRONMENT: 'preview', GEMINI_API_KEY: 'k' })).toBe('auto');
  });

  it('production and unconfigured environments stay on the historical routing', () => {
    expect(resolveProviderPreference({ ENVIRONMENT: 'production' })).toBe('auto');
    expect(resolveProviderPreference({ ENVIRONMENT: 'preview' })).toBe('auto');
    expect(resolveProviderPreference(undefined)).toBe('auto');
  });
});

describe('7 — evidence grounding through the same shared boundary', () => {
  const fabricated = JSON.stringify({
    root_cause: 'x', attack_vector: 'NETWORK', executive_assessment: 'y',
    evidence_used: ['KNOWLEDGE_CHUNK_9'],
  });
  const missing = JSON.stringify({
    root_cause: 'x', attack_vector: 'NETWORK', executive_assessment: 'y', evidence_used: [],
  });
  const malformed = JSON.stringify({
    root_cause: 'x', attack_vector: 'NETWORK', executive_assessment: 'y', evidence_used: { chunk: 1 },
  });

  async function analyse(payload: string) {
    return runGroundedCveAnalysis({
      ...baseInput(),
      suppliedEvidenceIds: ['KNOWLEDGE_CHUNK_1', 'SOURCE_FACT:cve_id'],
      aiBinding: { run: async () => ({ response: payload }) },
      fetchFn: geminiOk({ n: 0 }),
    });
  }

  it('rejects a citation that was never supplied', async () => {
    const result = await analyse(fabricated);
    expect(result.status).toBe('UNGROUNDED');
    expect(result.error_code).toBe('UNKNOWN_EVIDENCE_CITATION');
    expect(result.grounding.unknown_citations).toContain('KNOWLEDGE_CHUNK_9');
    expect(result.error_class).toBeNull(); // never confused with an unavailable model
  });

  it('rejects an analysis that cites no supplied evidence', async () => {
    const result = await analyse(missing);
    expect(result.status).toBe('UNGROUNDED');
    expect(result.error_code).toBe('UNGROUNDED_ANALYSIS');
    expect(result.error_class).toBeNull();
  });

  it('rejects a malformed citation block rather than coercing it', async () => {
    const result = await analyse(malformed);
    expect(result.status).toBe('UNGROUNDED');
    expect(result.error_code).toBe('MALFORMED_EVIDENCE_CITATION');
  });

  it('accepts an analysis that cites only supplied evidence identifiers', async () => {
    const result = await analyse(JSON.stringify({
      root_cause: 'x', attack_vector: 'NETWORK', executive_assessment: 'y',
      evidence_used: ['KNOWLEDGE_CHUNK_1'],
    }));
    expect(result.status).toBe('PASS');
    expect(result.grounding.cited_evidence).toEqual(['KNOWLEDGE_CHUNK_1']);
  });

  it('fails on malformed (non-JSON) model output instead of inventing a verdict', async () => {
    const result = await runGroundedCveAnalysis({
      ...baseInput(),
      aiBinding: { run: async () => ({ response: 'I think this is probably very dangerous.' }) },
      fetchFn: geminiOk({ n: 0 }),
    });
    expect(result.status).toBe('FAIL');
    expect(result.analysis).toBeNull();
  });
});
