/**
 * REGRESSION SUITE — measured defects from the live Preview Gemini analysis.
 *
 * The measured run persisted, for a genuinely newly published non-KEV CVE:
 *   provider gemini, model gemini-3.8-flash, HTTP 200, latency 9215 ms,
 *   input 1693 / output 317 tokens, `status: FAIL`, `error_code: JSON_PARSE_ERROR`,
 *   `analysis: null`, `grounding: { required: false, evidence_supplied: 0, error_code: null }`,
 *   semantic gate `BLOCKED` (CLM-02/03/31 "UNKNOWN value but was asserted as
 *   SOURCE_FACT"), `remediation.remediation_source: "CISA KEV Binding Directive"`
 *   on a non-KEV vulnerability, and the row published as ANALYZED/PUBLISHED so the
 *   website rendered a deterministic fallback as an analyst-grade report.
 *
 * Every test below asserts one of those defects is now impossible, or that the
 * behaviour the fix must NOT change (the CISA KEV contract) is unchanged.
 */
import { describe, it, expect, beforeEach } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import {
  __resetAIProviderCircuits,
  runGroundedCveAnalysis,
  type GroundedCveAnalysisInput,
} from '@zayron/intelligence';
import {
  isKnownUnknownValue,
  normalizeUnknownClaimTruthTypes,
  projectReportForPrimaryAuthority,
} from '../../packages/intelligence/src/vulnerability/nonKevAuthorityProjection';
import {
  CISA_KEV_AUTHORITY,
  NVD_CVE_AUTHORITY,
} from '../../packages/intelligence/src/vulnerability/analysisAuthority';

const API_WORKER_SOURCE = readFileSync(join(__dirname, '../../workers/api/src/index.ts'), 'utf8');

const BASE_INPUT: Omit<GroundedCveAnalysisInput, 'aiBinding'> = {
  cveId: 'CVE-2026-108770',
  vendor: 'Unknown',
  product: 'Unknown',
  vulnerabilityName: 'Appwrite Browser Screenshot Service (CWE-918) Vulnerability',
  description: 'Server-side request forgery in the Browser Screenshot Service url parameter.',
  cweDetails: [{ id: 'CWE-918', name: 'Server-Side Request Forgery (SSRF)' }],
  cvssScore: '5.3',
  cvssVector: 'CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:L/I:N/A:N',
  isKev: false,
};

/** A well-formed completion with the three core fields the shape gate requires. */
const COMPLETE_ANALYSIS = {
  vulnerability_type: 'Server-Side Request Forgery (SSRF)',
  root_cause: 'Improper validation of the url parameter in the screenshot service.',
  attack_surface: 'HTTP endpoint accepting a url parameter.',
  prerequisites: 'Network reachability of the service.',
  authentication_required: false,
  privileges_required: 'none',
  user_interaction: 'none',
  attack_vector: 'NETWORK',
  technical_impact: 'Server-side request forgery against internal services.',
  affected_versions: 'up to 2.3.0',
  fixed_versions: '2.4.0',
  exploitation_context: 'No exploitation observed in the consulted sources.',
  attack_exposure: 'Network-accessible HTTP service',
  observable_behaviors: 'Outbound requests to internal addresses.',
  defensive_signals: 'Review screenshot-service access logs.',
  detection_confidence: 'MODERATE',
  executive_assessment: 'Network-reachable screenshot service permits server-side requests.',
  technical_assessment: 'The url argument is used without validation, allowing SSRF.',
  confidence_basis: 'Grounded in the NVD record for CVE-2026-108770',
  uncertainties: ['No CPE identity data was available in the source record.'],
  evidence_used: ['SOURCE_FACT:vendor'],
};

/** A real truncated completion: the exact failure shape of the measured run. */
const TRUNCATED_COMPLETION = '{\n  "vulnerability_type": "Server-Side Request Forgery (SSRF)",\n  "root_cause": "Improper validation of the \'url\' parameter';

function geminiFetch(body: {
  text: string;
  finishReason?: string;
  promptTokenCount?: number;
  candidatesTokenCount?: number;
  thoughtsTokenCount?: number;
}): typeof fetch {
  return (async () => ({
    ok: true,
    status: 200,
    json: async () => ({
      candidates: [
        {
          content: { parts: [{ text: body.text }] },
          ...(body.finishReason ? { finishReason: body.finishReason } : {}),
        },
      ],
      usageMetadata: {
        promptTokenCount: body.promptTokenCount ?? 1693,
        candidatesTokenCount: body.candidatesTokenCount ?? 317,
        ...(typeof body.thoughtsTokenCount === 'number'
          ? { thoughtsTokenCount: body.thoughtsTokenCount }
          : {}),
      },
    }),
  })) as unknown as typeof fetch;
}

const geminiInput = (extra: Partial<GroundedCveAnalysisInput>) => ({
  ...BASE_INPUT,
  providerPreference: 'gemini' as const,
  geminiApiKey: 'test-key-not-a-secret',
  ...extra,
});

describe('GEMINI COMPLETION TELEMETRY AND INCOMPLETE-OUTPUT HANDLING', () => {
  beforeEach(() => {
    __resetAIProviderCircuits();
  });

  it('accepts a complete valid completion and records the provider completion signals', async () => {
    const result = await runGroundedCveAnalysis(
      geminiInput({
        fetchFn: geminiFetch({ text: JSON.stringify(COMPLETE_ANALYSIS), finishReason: 'STOP' }),
        suppliedEvidenceIds: ['SOURCE_FACT:vendor'],
      }),
    );

    expect(result.status).toBe('PASS');
    expect(result.analysis?.root_cause).toContain('Improper validation');
    expect(result.provider).toBe('gemini');
    expect(result.completion?.finish_reason).toBe('STOP');
    expect(result.completion?.output_limit).toBe(1200);
    expect(result.completion?.response_mime_type).toBe('application/json');
    expect(result.input_tokens).toBe(1693);
    expect(result.output_tokens).toBe(317);
  });

  it('rejects an incomplete completion and never returns a partially valid analysis', async () => {
    const result = await runGroundedCveAnalysis(
      geminiInput({
        fetchFn: geminiFetch({ text: TRUNCATED_COMPLETION, finishReason: 'STOP' }),
      }),
    );

    expect(result.status).toBe('FAIL');
    expect(result.analysis).toBeNull();
    expect(result.error_code).toBe('JSON_PARSE_ERROR');
    expect(result.error_class).toBe('MODEL_FAILURE');
  });

  it('names a token-limit stop for what it is: OUTPUT_TRUNCATED, with the truncation signal recorded', async () => {
    const result = await runGroundedCveAnalysis(
      geminiInput({
        fetchFn: geminiFetch({
          text: TRUNCATED_COMPLETION,
          finishReason: 'MAX_TOKENS',
          thoughtsTokenCount: 883,
        }),
      }),
    );

    expect(result.status).toBe('FAIL');
    expect(result.analysis).toBeNull();
    // The measured run reported only JSON_PARSE_ERROR, so the cause was invisible.
    expect(result.error_code).toBe('OUTPUT_TRUNCATED');
    expect(result.completion?.finish_reason).toBe('MAX_TOKENS');
    expect(result.completion?.thoughts_tokens).toBe(883);
    expect(result.completion?.output_limit).toBe(1200);
    expect(result.output_tokens).toBe(317);
  });

  it('reports a provider failure explicitly instead of silently degrading', async () => {
    const failing = (async () => ({
      ok: false,
      status: 500,
      json: async () => ({ error: { status: 'INTERNAL', message: 'provider unavailable' } }),
    })) as unknown as typeof fetch;

    const result = await runGroundedCveAnalysis(geminiInput({ fetchFn: failing }));

    expect(result.status).toBe('FAIL');
    expect(result.analysis).toBeNull();
    expect(result.error_code).not.toBeNull();
    expect(result.error_class).not.toBeNull();
    // An explicit Gemini selection must never cascade into a Cloudflare generation.
    expect(result.fallback_used).toBe(false);
    expect(result.provider).toBe('gemini');
  });
});

describe('EVIDENCE GROUNDING — HONEST REPORTING AND FABRICATION REJECTION', () => {
  beforeEach(() => {
    __resetAIProviderCircuits();
  });

  it('reports the REAL supplied-evidence count when an attempted analysis could not be evaluated', async () => {
    const supplied = ['KNOWLEDGE_CHUNK_1', 'SOURCE_FACT:vendor', 'SOURCE_FACT:product'];
    const result = await runGroundedCveAnalysis(
      geminiInput({
        fetchFn: geminiFetch({ text: TRUNCATED_COMPLETION, finishReason: 'MAX_TOKENS' }),
        suppliedEvidenceIds: supplied,
      }),
    );

    // Measured defect: the failure path returned emptyGrounding(), which stored
    // `evidence_supplied: 0` even though three identifiers had been supplied.
    expect(result.grounding.evidence_supplied).toBe(supplied.length);
    expect(result.grounding.required).toBe(true);
    expect(result.grounding.error_code).toBe('EVIDENCE_NOT_EVALUATED');
    expect(result.grounding.cited_evidence).toEqual([]);
  });

  it('does not let zero supplied evidence satisfy a mandatory grounding contract', async () => {
    const result = await runGroundedCveAnalysis(
      geminiInput({
        fetchFn: geminiFetch({ text: JSON.stringify({ ...COMPLETE_ANALYSIS, evidence_used: undefined }) }),
        suppliedEvidenceIds: [],
        requireEvidenceCitation: true,
      }),
    );

    expect(result.grounding.error_code).toBe('EVIDENCE_UNAVAILABLE');
    expect(result.status).toBe('UNGROUNDED');
  });

  it('rejects an evidence identifier that was never supplied', async () => {
    const result = await runGroundedCveAnalysis(
      geminiInput({
        fetchFn: geminiFetch({
          text: JSON.stringify({ ...COMPLETE_ANALYSIS, evidence_used: ['SOURCE_FACT:not_supplied'] }),
        }),
        suppliedEvidenceIds: ['SOURCE_FACT:vendor'],
      }),
    );

    expect(result.status).toBe('UNGROUNDED');
    expect(result.grounding.error_code).toBe('UNKNOWN_EVIDENCE_CITATION');
    expect(result.grounding.unknown_citations).toEqual(['SOURCE_FACT:not_supplied']);
  });

  it('rejects an analysis that cites none of the evidence it was given', async () => {
    const result = await runGroundedCveAnalysis(
      geminiInput({
        fetchFn: geminiFetch({ text: JSON.stringify({ ...COMPLETE_ANALYSIS, evidence_used: [] }) }),
        suppliedEvidenceIds: ['SOURCE_FACT:vendor'],
      }),
    );

    expect(result.status).toBe('UNGROUNDED');
    expect(result.grounding.error_code).toBe('UNGROUNDED_ANALYSIS');
    expect(result.grounding.evidence_supplied).toBe(1);
  });
});

describe('EPISTEMIC CORRECTNESS — UNKNOWN VALUES ARE NEVER SOURCE FACTS', () => {
  beforeEach(() => {
    __resetAIProviderCircuits();
  });

  it('recognises the pipeline unknown tokens, including NaN from a missing numeric source', () => {
    for (const value of ['Unknown', 'UNKNOWN', 'unknown', 'NOT_AVAILABLE', 'not applicable', 'n/a', 'NaN', '', '   ', null, undefined, Number.NaN]) {
      expect(isKnownUnknownValue(value)).toBe(true);
    }
    for (const value of ['Appwrite', '2.4.0', 'CWE-918', 0, false, 5.3]) {
      expect(isKnownUnknownValue(value)).toBe(false);
    }
  });

  it('downgrades a false source-fact assertion and leaves real values untouched', () => {
    const claims = [
      { id: 'CLM-02', field: 'vendor', value: 'Unknown', truth_type: 'SOURCE_FACT', confidence: 1 },
      { id: 'CLM-03', field: 'product', value: 'Unknown', truth_type: 'SOURCE_FACT', confidence: 1 },
      { id: 'CLM-31', field: 'products_affected', value: 'UNKNOWN', truth_type: 'SOURCE_FACT', confidence: 1 },
      { id: 'CLM-EPSS', field: 'epss', value: Number.NaN, truth_type: 'SOURCE_FACT', confidence: 1 },
      { id: 'CLM-01', field: 'identity', value: 'CVE-2026-108770', truth_type: 'SOURCE_FACT', confidence: 1 },
    ];

    const normalized = normalizeUnknownClaimTruthTypes(claims);

    expect(normalized.map((c) => c.truth_type)).toEqual([
      'UNKNOWN', 'UNKNOWN', 'UNKNOWN', 'UNKNOWN', 'SOURCE_FACT',
    ]);
    expect(normalized.map((c) => c.confidence)).toEqual([0, 0, 0, 0, 1]);
    // Order and the untouched claim's value are preserved — the normaliser may only downgrade.
    expect(normalized[4]).toBe(claims[4]);
    expect(normalized[4].value).toBe('CVE-2026-108770');
  });

  it('removes the measured non-KEV report defects without inventing an advisory', () => {
    const report: Record<string, any> = {
      remediation: {
        vendor_advisory: 'NOT_AVAILABLE',
        remediation_source: 'CISA KEV Binding Directive',
        advisory_source: 'CISA KEV',
        fixed_version_source: 'CISA KEV Binding Directive',
        recommended_action: 'Apply mitigations per CISA KEV Binding Directive',
        canonical_advisory: { provenance_source: 'CISA KEV Binding Directive' },
      },
      provenance: {
        claims: [{ id: 'CLM-02', field: 'vendor', value: 'Unknown', truth_type: 'SOURCE_FACT', confidence: 1 }],
        evidence: [{ id: 'evi_CVE-2026-108770_kev', source: CISA_KEV_AUTHORITY.claimSource, source_ids: ['cisa-kev'] }],
      },
    };

    projectReportForPrimaryAuthority(report, NVD_CVE_AUTHORITY, 'CVE-2026-108770');

    const rendered = JSON.stringify(report);
    expect(rendered).not.toMatch(/CISA KEV Binding Directive/);
    expect(report.remediation.remediation_source).toContain('NVD');
    expect(report.provenance.claims[0].truth_type).toBe('UNKNOWN');
    expect(report.provenance.claims[0].confidence).toBe(0);
    // No advisory was supplied, so none may be named.
    expect(report.remediation.remediation_source).not.toMatch(/advisory at/i);
  });

  it('keeps the CISA KEV authority a strict no-op (existing KEV report contract intact)', () => {
    const report: Record<string, any> = {
      dates: { cisa_kev_added_at: '2026-01-01', cisa_due_at: '2026-01-22' },
      signals: { kev_listed: true, observed_in_wild: true },
      remediation: { remediation_source: 'CISA KEV Binding Directive' },
      provenance: {
        claims: [{ id: 'CLM-02', field: 'vendor', value: 'Atlassian', truth_type: 'SOURCE_FACT', confidence: 1 }],
      },
    };
    const before = JSON.stringify(report);

    projectReportForPrimaryAuthority(report, CISA_KEV_AUTHORITY, 'CVE-2023-22527');

    expect(JSON.stringify(report)).toBe(before);
  });
});

describe('PUBLICATION GATE — A FAILED ANALYSIS IS NEVER A PUBLISHED REPORT', () => {
  it('derives the persisted status and publication status from the analysis and the gates', () => {
    expect(API_WORKER_SOURCE).toContain(
      "const analysisUsable = aiStatus === 'PASS' && aiAnalysis !== null;",
    );
    expect(API_WORKER_SOURCE).toContain(
      "const publishable = !gateBlocked && (processDecision !== 'DEEP_ANALYSIS' || analysisUsable);",
    );
    expect(API_WORKER_SOURCE).toContain(
      "const reportRowStatus = publishable ? 'ANALYZED' : 'REJECTED';",
    );
    expect(API_WORKER_SOURCE).toContain(
      "const reportPublicationStatus = publishable ? 'PUBLISHED' : 'WITHHELD';",
    );
  });

  it('no longer hardcodes ANALYZED / PUBLISHED in either report upsert', () => {
    // The measured defect: both writes set `status = 'ANALYZED', publication_status = 'PUBLISHED'`
    // unconditionally, so a FAIL / BLOCKED analysis was stored and rendered as a valid report.
    expect(API_WORKER_SOURCE).not.toContain("'ANALYZED', 'PUBLISHED'");
    expect(API_WORKER_SOURCE).not.toContain("status = 'ANALYZED',");
    expect(API_WORKER_SOURCE).not.toContain("publication_status = 'PUBLISHED',");
    expect(API_WORKER_SOURCE).toContain('status = excluded.status,');
    expect(API_WORKER_SOURCE).toContain('publication_status = excluded.publication_status,');
    expect(API_WORKER_SOURCE).toContain('reportRowStatus, reportPublicationStatus,');
  });

  it('labels deterministic fallback content and keeps it out of the published status', () => {
    expect(API_WORKER_SOURCE).toContain(
      "const analysisProvenance = analysisUsable ? 'MODEL' : 'DETERMINISTIC_FALLBACK';",
    );
    // The persisted analysis must carry the provenance and the decision, so a fallback
    // narrative can never be read as model-authored output.
    expect(API_WORKER_SOURCE).toContain('analysis_provenance: analysisProvenance,');
    expect(API_WORKER_SOURCE).toContain('publication_decision: reportPublicationStatus,');
    expect(API_WORKER_SOURCE).toContain('PUBLICATION_WITHHELD');
  });

  it('persists the completion telemetry the previous run could not record', () => {
    for (const field of ['finish_reason', 'thoughts_tokens', 'output_limit', 'response_mime_type']) {
      expect(API_WORKER_SOURCE).toContain(`${field}: groundedAiResult?.completion?.${field} ?? null,`);
    }
    expect(API_WORKER_SOURCE).toContain('ai_completion: groundedAiResult?.completion ?? null,');
  });

  it('never constructs an affected-products source fact from an unknown identity', () => {
    expect(API_WORKER_SOURCE).toContain("value: affectedProductsValue || 'UNKNOWN',");
    expect(API_WORKER_SOURCE).toContain('truth_type: affectedProductsTruthType,');
    expect(API_WORKER_SOURCE).not.toContain("join('; ') || reconciled.identity.product");
  });

  it('keeps report reads generation-free', () => {
    const detailStart = API_WORKER_SOURCE.indexOf("const rawId = decodeURIComponent(path.replace('/api/v1/intelligence/'");
    expect(detailStart).toBeGreaterThan(-1);
    const detailWindow = API_WORKER_SOURCE.slice(detailStart, detailStart + 4000);
    expect(detailWindow).toContain('SELECT * FROM intelligence_reports WHERE intelligence_id = ?');
    expect(detailWindow).not.toContain('runGroundedCveAnalysis');
    expect(detailWindow).not.toContain('env.AI.run');
    expect(detailWindow).not.toContain('geminiApiKey');
  });
});
