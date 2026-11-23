/**
 * THE PROVIDER BOUND ON THE GROUNDED CVE ANALYSIS — configured, recorded, explicit.
 *
 * MEASURED DEFECT this suite locks down: the reviewed Preview run failed with
 * `AI provider timeout` after 30,098 ms because the API route called
 * `runGroundedCveAnalysis` without a `timeoutMs`, so the adapter default (30 s)
 * applied while the request must generate up to 1,200 output tokens. The bound is
 * now call-specific, inside the range the adapter already supports (1–60 s), and
 * recorded in the completion telemetry of EVERY result — including a provider that
 * never answered — so a timeout is attributable to the budget the caller set.
 *
 * This suite also re-asserts the surrounding invariants the bound must not break:
 * an explicit Gemini selection never touches Cloudflare, retries stay bounded,
 * incomplete JSON never becomes a parsed analysis, and a failed analysis can never
 * be published.
 */
import { describe, it, expect, beforeEach } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  __resetAIProviderCircuits,
  runGroundedCveAnalysis,
  type GroundedCveAnalysisInput,
} from '@zayron/intelligence';

const API_WORKER_SOURCE = readFileSync(join(__dirname, '../../workers/api/src/index.ts'), 'utf8');

const BASE_INPUT: Omit<GroundedCveAnalysisInput, 'aiBinding'> = {
  cveId: 'CVE-2026-108804',
  vendor: 'acme',
  product: 'widget_server',
  vulnerabilityName: 'acme widget_server (CWE-77) Vulnerability',
  description: 'Command injection in the web management backend of the widget server.',
  cweDetails: [{ id: 'CWE-77', name: 'Improper Neutralization of Special Elements used in a Command' }],
  cvssScore: '10.0',
  cvssVector: 'CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:C/C:H/I:H/A:H',
  isKev: false,
  attackVector: 'NETWORK',
  privilegesRequired: 'NONE',
  userInteraction: 'NONE',
  affectedVersions: [],
  fixedVersions: [],
};

const GEMINI_KEY = 'test-key-never-logged';

function geminiResponse(text: string, opts: { finishReason?: string; thoughts?: number | null; candidates?: number } = {}) {
  return JSON.stringify({
    candidates: [{ content: { parts: [{ text }] }, finishReason: opts.finishReason ?? 'STOP' }],
    usageMetadata: {
      promptTokenCount: 1693,
      candidatesTokenCount: opts.candidates ?? 420,
      thoughtsTokenCount: opts.thoughts ?? null,
    },
  });
}

const COMPLETE_ANALYSIS = JSON.stringify({
  executive_assessment: 'Unauthenticated command injection reachable over the network.',
  root_cause: 'The service argument is passed to a shell without validation.',
  attack_vector: 'NETWORK',
  uncertainty: [],
});

/** A provider that never answers: the request can only end by the configured bound. */
const neverAnswers = () => new Promise<Response>(() => { /* intentionally pending */ });

describe('grounded CVE analysis — call-specific provider bound', () => {
  beforeEach(() => {
    __resetAIProviderCircuits();
  });

  it('applies the configured bound and fails explicitly when the provider does not answer', async () => {
    const result = await runGroundedCveAnalysis({
      ...BASE_INPUT,
      providerPreference: 'gemini',
      geminiApiKey: GEMINI_KEY,
      timeoutMs: 120,
      fetchFn: (() => neverAnswers()) as any,
    });

    expect(result.status).toBe('FAIL');
    expect(result.analysis).toBeNull();
    expect(result.error_code).toBe('AI provider timeout');
    expect(result.error_class).toBe('TIMEOUT');
    // The telemetry records the EFFECTIVE budget the provider call was given, not
    // the raw request: the adapter floors a provider budget at 1s (it is a
    // provider-call bound, not a millisecond knob), so a sub-second request is
    // clamped up and 1000 is what the timeout is attributable to. A request inside
    // the supported 1–60s range is recorded verbatim (see the 60s route test and
    // the 12s case below).
    expect(result.completion?.timeout_ms).toBe(1000);
    expect(result.completion?.output_limit).toBe(1200);
    expect(result.completion?.finish_reason).toBeNull();
    expect(result.completion?.parse_outcome).toBe('NOT_EVALUATED');
    expect(result.retry_count).toBe(0);
    expect(result.fallback_used).toBe(false);
  });

  it('records the bound on a successful completion as well', async () => {
    const result = await runGroundedCveAnalysis({
      ...BASE_INPUT,
      providerPreference: 'gemini',
      geminiApiKey: GEMINI_KEY,
      timeoutMs: 12_000,
      fetchFn: (async () => new Response(geminiResponse(COMPLETE_ANALYSIS), { status: 200 })) as any,
    });

    expect(result.status).toBe('PASS');
    expect(result.analysis).not.toBeNull();
    expect(result.completion?.timeout_ms).toBe(12_000);
    expect(result.completion?.finish_reason).toBe('STOP');
    expect(result.completion?.parse_outcome).toBe('PASS');
    expect(JSON.stringify(result.completion)).not.toContain(GEMINI_KEY);
  });

  it('makes exactly ONE provider request on an explicit Gemini selection and never falls back to Cloudflare', async () => {
    let geminiRequests = 0;
    let cloudflareRuns = 0;

    const result = await runGroundedCveAnalysis({
      ...BASE_INPUT,
      providerPreference: 'gemini',
      geminiApiKey: GEMINI_KEY,
      timeoutMs: 120,
      aiBinding: { run: async () => { cloudflareRuns++; return { response: COMPLETE_ANALYSIS }; } } as any,
      fetchFn: (() => { geminiRequests++; return neverAnswers(); }) as any,
    });

    expect(geminiRequests).toBe(1);
    expect(cloudflareRuns).toBe(0);
    expect(result.provider).toBe('gemini');
    expect(result.status).toBe('FAIL');
  });

  it('makes NO Gemini attempt on the automatic path when the primary fails transiently', async () => {
    let geminiRequests = 0;

    // No `aiBinding` → Cloudflare is UNAVAILABLE, which is a condition of the
    // request and NOT current-period quota exhaustion, so the automatic path issues
    // no Gemini request at all and reports the failure with its own class.
    const result = await runGroundedCveAnalysis({
      ...BASE_INPUT,
      providerPreference: 'auto',
      geminiApiKey: GEMINI_KEY,
      timeoutMs: 120,
      fetchFn: (() => { geminiRequests++; return neverAnswers(); }) as any,
    });

    expect(geminiRequests).toBe(0);
    expect(result.retry_count).toBe(0);
    expect(result.provider).toBe('cloudflare');
    expect(result.status).toBe('FAIL');
    expect(result.error_class).toBe('UNAVAILABLE');
    expect(result.fallback_used).toBe(false);
  });

  it('keeps retries bounded on the automatic path: exactly one Gemini attempt after a confirmed exhaustion', async () => {
    let geminiRequests = 0;

    const result = await runGroundedCveAnalysis({
      ...BASE_INPUT,
      providerPreference: 'auto',
      geminiApiKey: GEMINI_KEY,
      timeoutMs: 120,
      // Cloudflare's documented daily free-allocation exhaustion evidence: the only
      // condition that may transition automatically.
      aiBinding: {
        run: async () => {
          throw new Error('You have used up your daily free allocation of 10,000 neurons. Your free allocation resets at 00:00 UTC.');
        },
      },
      fetchFn: (() => { geminiRequests++; return neverAnswers(); }) as any,
    });

    expect(geminiRequests).toBe(1);   // exactly one secondary attempt, never a retry storm
    expect(result.retry_count).toBe(1);
    expect(result.provider).toBe('gemini');
    expect(result.status).toBe('FAIL');
    expect(result.fallback_used).toBe(true);
  });

  it('never turns an incomplete completion into a parsed analysis', async () => {
    const truncated = '{"executive_assessment":"partial","root_cause":"x","attack_vector":"NET';
    const result = await runGroundedCveAnalysis({
      ...BASE_INPUT,
      providerPreference: 'gemini',
      geminiApiKey: GEMINI_KEY,
      timeoutMs: 5_000,
      fetchFn: (async () => new Response(
        geminiResponse(truncated, { finishReason: 'MAX_TOKENS', thoughts: 883, candidates: 317 }),
        { status: 200 },
      )) as any,
    });

    expect(result.status).toBe('FAIL');
    expect(result.analysis).toBeNull();
    expect(result.error_code).toBe('OUTPUT_TRUNCATED');
    expect(result.completion?.finish_reason).toBe('MAX_TOKENS');
    expect(result.completion?.thoughts_tokens).toBe(883);
    expect(result.completion?.timeout_ms).toBe(5_000);
  });

  it('never turns a malformed JSON completion into a parsed analysis', async () => {
    const result = await runGroundedCveAnalysis({
      ...BASE_INPUT,
      providerPreference: 'gemini',
      geminiApiKey: GEMINI_KEY,
      timeoutMs: 5_000,
      fetchFn: (async () => new Response(geminiResponse('not json at all'), { status: 200 })) as any,
    });

    expect(result.status).toBe('FAIL');
    expect(result.analysis).toBeNull();
    expect(result.error_code).toBe('JSON_PARSE_ERROR');
    expect(result.completion?.timeout_ms).toBe(5_000);
  });
});

describe('deployed route wiring — the bound and its telemetry', () => {
  it('passes the 60s bound the adapter supports, and persists the recorded bound', () => {
    expect(API_WORKER_SOURCE).toContain('const CVE_ANALYSIS_TIMEOUT_MS = 60_000;');

    const declared = /const CVE_ANALYSIS_TIMEOUT_MS = ([\d_]+);/.exec(API_WORKER_SOURCE)?.[1];
    const bound = Number(String(declared).replace(/_/g, ''));
    expect(Number.isFinite(bound)).toBe(true);
    // Inside the adapter's own supported range: Math.max(1000, Math.min(input.timeoutMs || 30_000, 60_000))
    expect(bound).toBeGreaterThanOrEqual(1_000);
    expect(bound).toBeLessThanOrEqual(60_000);

    const callStart = API_WORKER_SOURCE.indexOf('runGroundedCveAnalysis({');
    expect(callStart).toBeGreaterThan(-1);
    // Window sized with margin: the explanatory comment block between the call
    // start and the timeoutMs line already spans ~872 chars (Phase 12.27), so a
    // fixed 900-char window clipped the assertion by 7 chars without any wiring
    // change. Anchor on the call's closing brace instead of a magic width.
    const callEnd = API_WORKER_SOURCE.indexOf('});', callStart);
    expect(callEnd).toBeGreaterThan(callStart);
    expect(API_WORKER_SOURCE.slice(callStart, callEnd)).toContain('timeoutMs: CVE_ANALYSIS_TIMEOUT_MS,');

    // Recorded in the persisted analysis diagnostics (both upsert paths).
    const persistCount = API_WORKER_SOURCE.split('timeout_ms: groundedAiResult?.completion?.timeout_ms ?? null,').length - 1;
    expect(persistCount).toBe(2);
  });

  it('a failed analysis can never be published', () => {
    // Wiring assertion against the deployed publication gate: a DEEP_ANALYSIS row
    // is publishable only when a model-authored analysis exists (`PASS` + non-null),
    // and an unusable analysis converts the row to REJECTED/WITHHELD with the reason
    // recorded in the persisted diagnostics.
    expect(API_WORKER_SOURCE).toContain("const analysisUsable = aiStatus === 'PASS' && aiAnalysis !== null;");
    expect(API_WORKER_SOURCE).toContain("const publishable = !gateBlocked && (processDecision !== 'DEEP_ANALYSIS' || analysisUsable);");
    expect(API_WORKER_SOURCE).toContain("const reportRowStatus = publishable ? 'ANALYZED' : 'REJECTED';");
    expect(API_WORKER_SOURCE).toContain("const reportPublicationStatus = publishable ? 'PUBLISHED' : 'WITHHELD';");
    expect(API_WORKER_SOURCE).toContain('AI_ANALYSIS_NOT_USABLE:${aiStatus}');
    expect(API_WORKER_SOURCE).toContain('`PUBLICATION_WITHHELD: ${withholdReason}`');
  });
});
