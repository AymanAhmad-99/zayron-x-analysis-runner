import { beforeEach, describe, expect, it } from 'bun:test';
import {
  __resetAIProviderCircuits,
  runGroundedCveAnalysis,
  type AIProviderAttempt,
  type GroundedCveAnalysisInput,
} from '@zayron/intelligence';

/**
 * Phase 12.23 controlled failover drill — gating contract.
 *
 * The drill replaces ONLY the Cloudflare primary attempt with one synthetic,
 * marker-labelled UNAVAILABLE, and only when the environment is exactly
 * `preview` AND the CVE matches the pinned identifier. Every other combination
 * must behave exactly like an ordinary Cloudflare call (fail closed).
 */

const PASS_PAYLOAD = JSON.stringify({
  vulnerability_type: 'Template Injection',
  root_cause: 'Unsafe template evaluation',
  attack_surface: 'Network-accessible web endpoints',
  attack_vector: 'NETWORK',
  executive_assessment: 'Critical unauthenticated remote code execution.',
  technical_assessment: 'Adversaries submit crafted expressions evaluated by the template engine.',
});

const PINNED_CVE = 'CVE-2023-22527';

function baseInput(): Omit<GroundedCveAnalysisInput, 'aiBinding'> {
  return {
    cveId: PINNED_CVE,
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

function collector(): { attempts: AIProviderAttempt[]; onProviderAttempt: (a: AIProviderAttempt) => void } {
  const attempts: AIProviderAttempt[] = [];
  return { attempts, onProviderAttempt: (a: AIProviderAttempt) => { attempts.push(a); } };
}

beforeEach(() => {
  __resetAIProviderCircuits();
});

describe('PHASE 12.23 — primary-failure drill is Preview-only and CVE-pinned', () => {
  it('D1: in Preview with the pinned CVE, the Cloudflare primary is replaced by a marked UNAVAILABLE and Gemini is reached', async () => {
    const cf = { n: 0 };
    const gm = { n: 0 };
    const { attempts, onProviderAttempt } = collector();

    const result = await runGroundedCveAnalysis({
      ...baseInput(),
      environment: 'preview',
      primaryFailureDrill: { cveId: PINNED_CVE },
      aiBinding: cloudflareOk(cf),
      geminiApiKey: 'test-key',
      fetchFn: geminiOk(gm),
      onProviderAttempt,
    });

    // The synthetic failure short-circuits the Cloudflare binding entirely.
    expect(cf.n).toBe(0);
    expect(gm.n).toBe(1);
    expect(result.provider).toBe('gemini');
    expect(result.fallback_used).toBe(true);
    expect(attempts.length).toBe(2);
    expect(attempts[0]).toMatchObject({
      provider: 'cloudflare',
      success: false,
      failure_class: 'UNAVAILABLE',
      error_code: 'TEST_INJECTED_PRIMARY_UNAVAILABLE',
    });
    expect(attempts[1]).toMatchObject({ provider: 'gemini', success: true });
  });

  it('D2: in production the drill field is ignored and Cloudflare serves the request normally', async () => {
    const cf = { n: 0 };
    const gm = { n: 0 };

    const result = await runGroundedCveAnalysis({
      ...baseInput(),
      environment: 'production',
      primaryFailureDrill: { cveId: PINNED_CVE },
      aiBinding: cloudflareOk(cf),
      geminiApiKey: 'test-key',
      fetchFn: geminiOk(gm),
    });

    expect(cf.n).toBe(1);
    expect(gm.n).toBe(0);
    expect(result.provider).toBe('cloudflare');
    expect(result.fallback_used).toBe(false);
  });

  it('D3: when the environment is unset or ambiguous the drill is ignored (fail closed)', async () => {
    for (const environment of [undefined, '', 'staging', 'PREVIEW']) {
      __resetAIProviderCircuits();
      const cf = { n: 0 };
      const gm = { n: 0 };

      const result = await runGroundedCveAnalysis({
        ...baseInput(),
        environment,
        primaryFailureDrill: { cveId: PINNED_CVE },
        aiBinding: cloudflareOk(cf),
        geminiApiKey: 'test-key',
        fetchFn: geminiOk(gm),
      });

      expect(cf.n).toBe(1);
      expect(gm.n).toBe(0);
      expect(result.provider).toBe('cloudflare');
    }
  });

  it('D4: in Preview a different CVE is never injected', async () => {
    const cf = { n: 0 };
    const gm = { n: 0 };

    const result = await runGroundedCveAnalysis({
      ...baseInput(),
      cveId: 'CVE-2024-0001',
      environment: 'preview',
      primaryFailureDrill: { cveId: PINNED_CVE },
      aiBinding: cloudflareOk(cf),
      geminiApiKey: 'test-key',
      fetchFn: geminiOk(gm),
    });

    expect(cf.n).toBe(1);
    expect(gm.n).toBe(0);
    expect(result.provider).toBe('cloudflare');
    expect(result.fallback_used).toBe(false);
  });
});
