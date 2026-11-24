import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import React from 'react';
import { renderToStaticMarkup } from '../../apps/web/node_modules/react-dom/server.node.js';
import { __resetAIProviderCircuits, runGroundedCveAnalysis } from '../../packages/intelligence/src/ai/adapter';
import { attackMappingClaim, buildStructuredAttackMappings, calculateQualityMetrics, computeClaimMetrics, formatClaimMetricBasis, reconcileOpenSourceEnrichment, verifyClaimsLedger, verifyMetricsConsistency, type ClaimRecord } from '../../packages/intelligence/src/sources/adapters';
import { CISA_KEV_AUTHORITY, NVD_CVE_AUTHORITY } from '../../packages/intelligence/src/vulnerability/analysisAuthority';
import { projectReportForPrimaryAuthority } from '../../packages/intelligence/src/vulnerability/nonKevAuthorityProjection';
import { assessDetectionEvidence, attackMappingPresentation, decodeStoredAnalysis, decodeStoredStructuredReport, projectVulnerabilityReportRead, reportAnalysisAvailability } from '../../packages/intelligence/src/vulnerability/reportIntegrity';
import { formatEpss, getVulnerabilityDetail, type VulnerabilityDetail } from '../../apps/web/app/lib/api';
import { VulnerabilityReportView } from '../../apps/web/app/components/VulnerabilityDetail';

const root = resolve(import.meta.dir, '../..');
const apiSource = readFileSync(resolve(root, 'workers/api/src/index.ts'), 'utf8');
const webSource = readFileSync(resolve(root, 'apps/web/app/components/VulnerabilityDetail.tsx'), 'utf8');
const originalFetch = globalThis.fetch;
afterEach(() => { globalThis.fetch = originalFetch; });
beforeEach(() => { __resetAIProviderCircuits(); });

function report(): VulnerabilityDetail {
  return {
    intelligence_id: 'CVE-2023-46805', title: 'Ivanti authentication bypass', summary: 'Valid source-grounded summary',
    status: 'ANALYZED', publication_status: 'PUBLISHED',
    structured_report: {
      identity: { cve: 'CVE-2023-46805', title: 'Ivanti authentication bypass', vendor: 'Ivanti', product: 'Connect Secure', vulnerability_type: 'Authentication bypass', cwe_ids: ['CWE-287'] },
      severity: { severity: 'HIGH', cvss: { score: '8.2', vector: '', version: '3.1', status: 'CONFIRMED', truth_type: 'SOURCE_FACT' }, epss: { score: 'NOT_AVAILABLE', percentile: 'NOT_AVAILABLE', status: 'NOT_AVAILABLE', truth_type: 'NOT_AVAILABLE' } },
      exploitation: { known_exploited: true, exploitation_status: 'KNOWN_EXPLOITED', exploitation_context: 'KEV listing', ransomware_association: 'Unknown', attack_exposure: 'UNKNOWN' },
      technical: { root_cause: 'Authentication bypass', attack_surface: 'Web', prerequisites: 'Network', authentication_required: false, privileges_required: 'NONE', user_interaction: 'NONE', attack_vector: 'NETWORK', technical_impact: 'Authentication bypass' },
      affected: { affected_versions: '9.x', fixed_versions: '9.1' },
      remediation: { vendor_advisory: 'https://vendor.example/advisory', cisa_action: 'Apply mitigations', due_date: '2024-01-22', recommended_action: 'Apply vendor mitigations' },
      detection: { observable_behaviors: 'UNKNOWN', defensive_signals: 'UNKNOWN', detection_confidence: 'HIGH', vendor_detection_guidance: 'Consult vendor advisory for detection guidance: https://vendor.example/advisory', recommended_monitoring: 'Monitor gateway traffic', truth_states: { vendor_detection_guidance: 'SOURCE_FACT' } },
      assessment: { executive_assessment: 'Valid source-grounded summary', technical_assessment: 'Source-grounded technical assessment', confidence: { score: 0.9, rating: 'HIGH', basis: 'Authoritative sources' }, uncertainty: ['Versions not completely established'] },
      provenance: { claims: [{ id: 'CLM-02', field: 'vendor', value: 'Ivanti', truth_type: 'SOURCE_FACT', confidence: 1 }], evidence: [], sources: ['cisa-kev'] },
    },
  };
}

const complete = { executive_assessment: 'Grounded assessment', root_cause: 'Input validation weakness', attack_vector: 'NETWORK', evidence_used: ['SOURCE_FACT:description'] };
async function analysis(text: string, finishReason?: string, overrides: Record<string, unknown> = {}) {
  let requestBody: Record<string, any> = {};
  const result = await runGroundedCveAnalysis({
    cveId: 'CVE-2026-108770', vendor: 'Unknown', product: 'Unknown', vulnerabilityName: 'SSRF', description: 'Supplied upstream description', cweDetails: [], cvssScore: '5.3', isKev: false,
    providerPreference: 'gemini', geminiApiKey: 'synthetic-key', suppliedEvidenceIds: ['SOURCE_FACT:description'], requireEvidenceCitation: true,
    fetchFn: (async (_url: unknown, init?: RequestInit) => {
      requestBody = JSON.parse(String(init?.body));
      return Response.json({ candidates: [{ finishReason, content: { parts: [{ text }] } }], usageMetadata: { promptTokenCount: 1693, candidatesTokenCount: 317, thoughtsTokenCount: 883 }, ...overrides });
    }) as typeof fetch,
  });
  return { result, requestBody };
}

// Execute the actual GET route block, not a reimplementation of its response shape.
// The complete Worker has workerd-only Workflow/WASM imports. This bounded seam
// supplies synthetic D1 reads and the same production projection functions.
const detailStart = apiSource.indexOf('      // GET /api/v1/intelligence/:id');
const detailEnd = apiSource.indexOf('      // GET /api/v1/intelligence (Primary Feed', detailStart);
const detailBlock = apiSource.slice(detailStart, detailEnd);
const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;
const transpiler = new Bun.Transpiler({ loader: 'ts' });
async function detailRead(row: Record<string, unknown>) {
  const calls: string[] = [];
  const env = { DB: { prepare(sql: string) {
    calls.push(sql);
    return { bind: (..._values: unknown[]) => ({ first: async () => structuredClone(row) }) };
  } } };
  const routeBody = transpiler.transformSync(`async function readRoute() {\n${detailBlock}\n}`);
  const route = new AsyncFunction('path', 'request', 'env', 'jsonResponse', 'decodeStoredAnalysis', 'decodeStoredStructuredReport', 'projectVulnerabilityReportRead', 'computeClaimMetrics', 'verifyClaimMetricConsistency', `${routeBody}\nreturn readRoute();`);
  const response: Response = await route('/api/v1/intelligence/CVE-2026-108770', new Request('http://localhost/api/v1/intelligence/CVE-2026-108770'), env, (value: unknown) => Response.json(value), decodeStoredAnalysis, decodeStoredStructuredReport, projectVulnerabilityReportRead, () => ({}), () => []);
  return { payload: await response.json() as { status: string; report: VulnerabilityDetail }, calls };
}
function storedRow(r: VulnerabilityDetail) {
  return { ...r, ai_analysis_json: r.ai_analysis ? JSON.stringify(r.ai_analysis) : null, structured_report_json: JSON.stringify(r.structured_report) };
}

describe('EPSS presentation', () => {
  it('renders unavailable for all missing, sentinel, malformed and non-finite values', () => {
    for (const score of [undefined, null, '', ' ', 'NOT_AVAILABLE', 'UNKNOWN', 'NaN', NaN, Infinity, '0.3bad', -0.1, 1.1]) {
      expect(formatEpss({ score }).value).toBe('UNAVAILABLE');
      expect(JSON.stringify(formatEpss({ score }))).not.toContain('NaN');
    }
    expect(formatEpss().value).toBe('UNAVAILABLE');
  });
  it('retains zero and valid probabilities, with an independent unavailable percentile', () => {
    expect(formatEpss({ score: 0, percentile: 0 })).toEqual({ value: '0.0%', sub: 'percentile 0' });
    expect(formatEpss({ score: '0.123', percentile: '0.91' })).toEqual({ value: '12.3%', sub: 'percentile 91' });
    expect(formatEpss({ score: '.2', percentile: 'NOT_AVAILABLE' }).sub).toBe('percentile unavailable');
  });
  it('renders the actual report hero with an explicit unavailable state', () => {
    const html = renderToStaticMarkup(<VulnerabilityReportView report={report()} id="fixture" />);
    expect(html).toContain('EPSS'); expect(html).toContain('UNAVAILABLE'); expect(html).not.toContain('NaN');
  });
});

describe('ATT&CK epistemic status', () => {
  const base = { cveId: 'CVE-2026-108770', cweIds: ['CWE-78'], attackVector: 'NETWORK', privilegesRequired: 'NONE', isKev: false, evidenceIds: ['source-record'], description: 'Command injection is possible' };
  it('does not promote CWE or KEV membership into observed technique source facts', () => {
    for (const isKev of [true, false]) {
      const mappings = buildStructuredAttackMappings({ ...base, isKev });
      expect(mappings.some(m => m.status === 'CONFIRMED')).toBe(false);
      expect(mappings.some(m => m.truth_type === 'SOURCE_FACT')).toBe(false);
      expect(attackMappingClaim(mappings).verification_status).toBe('UNKNOWN');
    }
  });
  it('distinguishes supported capability from possible network exposure', () => {
    const mappings = buildStructuredAttackMappings(base);
    expect(mappings.find(m => m.technique_id === 'T1059')?.status).toBe('SUPPORTED');
    expect(mappings.find(m => m.technique_id === 'T1190')?.status).toBe('CANDIDATE');
    expect(attackMappingClaim(mappings).truth_type).toBe('ANALYST_ASSESSMENT');
  });
  it('keeps zero-evidence mappings unestablished and confidence zero', () => {
    const mappings = buildStructuredAttackMappings({ ...base, evidenceIds: [] });
    expect(mappings.every(m => m.status === 'UNESTABLISHED' && m.truth_type === 'UNKNOWN' && m.confidence === 0)).toBe(true);
  });
  it('preserves explicit authoritative CTI mappings with evidence and excludes duplicates', () => {
    const mappings = buildStructuredAttackMappings({ ...base, authoritativeTechniques: [{ technique_id: 'T1059', technique_name: 'Interpreter', tactic: 'Execution', source: 'retrieved-vendor-cti', rationale: 'CTI explicitly maps this CVE' }] });
    const confirmed = mappings.filter(m => m.technique_id === 'T1059');
    expect(confirmed).toHaveLength(1); expect(confirmed[0].status).toBe('CONFIRMED'); expect(confirmed[0].truth_type).toBe('SOURCE_FACT');
    expect(attackMappingClaim(confirmed).source_ids).toEqual(['retrieved-vendor-cti']);
  });
  it('rejects elevation of source-less explicit mappings and absent evidence', () => {
    for (const source of ['', 'vendor-cti']) {
      const mappings = buildStructuredAttackMappings({ ...base, evidenceIds: [], authoritativeTechniques: [{ technique_id: 'T1059', technique_name: 'Interpreter', tactic: 'Execution', source }] });
      expect(mappings.some(m => m.status === 'CONFIRMED')).toBe(false);
    }
  });
  it('rejected and unestablished mappings cannot become verified aggregate claims', () => {
    const mapping = buildStructuredAttackMappings(base)[0];
    for (const status of ['REJECTED', 'UNESTABLISHED', 'UNKNOWN'] as const) {
      const claim = attackMappingClaim([{ ...mapping, status }]);
      expect(claim.truth_type).toBe('UNKNOWN'); expect(claim.confidence).toBe(0); expect(claim.verification_status).toBe('UNKNOWN');
    }
  });
  it('does not render legacy heuristic CONFIRMED mappings as source facts', () => {
    const r = report();
    const mapping = { technique_id: 'T1190', technique_name: 'Exploit Public-Facing Application', tactic: 'Initial Access', relationship: 'Legacy heuristic', status: 'CONFIRMED', confidence: 0.9, evidence_ids: ['kev-record'], source_ids: ['cisa-kev', 'nvd-cpe'] };
    r.structured_report!.threat_context = { attack_mappings: [mapping] };
    expect(attackMappingPresentation(mapping)).toEqual({ status: 'POSSIBLE', truth_type: 'ANALYST_ASSESSMENT' });
    const html = renderToStaticMarkup(<VulnerabilityReportView report={r} id="fixture" />);
    expect(html).toContain('POSSIBLE'); expect(html).toContain('Observed technique use is not established');
    expect(attackMappingPresentation({ ...mapping, source_ids: ['retrieved-vendor-cti'], attribution_basis: 'EXPLICIT_CTI' }).status).toBe('CONFIRMED');
    expect(attackMappingPresentation({ status: 'REJECTED' }).status).toBe('REJECTED');
  });
  it('does not invent a network vector or discovery from file upload', () => {
    expect(buildStructuredAttackMappings({ ...base, cweIds: [], attackVector: undefined, description: '' })).toEqual([]);
    expect(buildStructuredAttackMappings({ ...base, cweIds: ['CWE-22'], description: 'Path traversal allows upload' }).some(m => m.technique_id === 'T1083')).toBe(false);
  });
});

describe('detection evidence contract', () => {
  it('general recommendations, links, unavailable data and retrieval alone cannot establish HIGH or tested coverage', () => {
    for (const guidance of [null, [], 'NOT_AVAILABLE', 'https://vendor.example/advisory', 'Consult vendor advisory for guidance']) {
      const result = assessDetectionEvidence(guidance);
      expect(result.detection_confidence).toBe('LOW'); expect(result.tested_detection).toBe(false); expect(result.coverage_status).toBe('NOT_ESTABLISHED');
    }
    expect(apiSource).not.toContain("detection_confidence: effectiveVendorAdvisoryUrl ? 'HIGH'");
  });
  it('actual source guidance is at most MEDIUM, never a claim of a tested detector', () => {
    const result = assessDetectionEvidence(['Review appliance audit events for unusual sessions']);
    expect(result.detection_confidence).toBe('MEDIUM'); expect(result.tested_detection).toBe(false); expect(result.confidence_basis).toContain('not established');
  });
  it('final verification and metric accounting retain untested monitoring and inferred mappings as non-verified assessments', () => {
    const claims: ClaimRecord[] = [
      { id: 'DETECT', field: 'detection', value: 'Review access logs', truth_type: 'ANALYST_ASSESSMENT', confidence: 0.5, source: 'Analyst defensive recommendation', source_ids: [], evidence_scope: 'PRODUCT', verification_status: 'UNKNOWN' },
      { id: 'POSSIBLE', field: 'attack_technique', value: 'T1190 (CANDIDATE)', truth_type: 'ANALYST_ASSESSMENT', confidence: 0.5, source: 'Analyst mapping', source_ids: [], evidence_scope: 'CVE', verification_status: 'UNKNOWN' },
      { id: 'SUPPORTED', field: 'attack_technique', value: 'T1059 (SUPPORTED)', truth_type: 'SUPPORTED_INFERENCE', confidence: 0.75, source: 'Analyst capability inference', source_ids: [], evidence_scope: 'CVE', verification_status: 'UNKNOWN' },
      { id: 'CONFIRMED', field: 'attack_technique', value: 'T1190 (CONFIRMED)', truth_type: 'SOURCE_FACT', confidence: 1, source: 'Retrieved CTI advisory', source_ids: ['retrieved-cti'], evidence_scope: 'CVE', verification_status: 'VERIFIED' },
      { id: 'VENDOR', field: 'vendor', value: 'Ivanti', truth_type: 'SOURCE_FACT', confidence: 1, source: 'CISA KEV', source_ids: ['cisa-kev'], evidence_scope: 'CVE', verification_status: 'VERIFIED' },
    ];
    for (let pass = 0; pass < 2; pass++) { // Both validator passes in the real pipeline must preserve the state.
      const verification = verifyClaimsLedger(claims, 'CVE-2023-46805');
      expect(verification.is_valid).toBe(true);
      expect(verification.verified_claims).toBe(2);
      expect(claims.slice(0, 3).every(claim => claim.verification_status === 'UNKNOWN')).toBe(true);
      expect(claims.slice(3).every(claim => claim.verification_status === 'VERIFIED')).toBe(true);
    }
    const metrics = computeClaimMetrics(claims);
    const quality = calculateQualityMetrics(claims);
    expect(metrics.unclassified_claims).toBe(0);
    expect(metrics.by_truth_type.ANALYST_ASSESSMENT).toBe(2);
    expect(metrics.supported_claims).toBe(2);
    expect(metrics.validated_claims).toBe(2);
    expect(quality.inference_claims).toBe(3);
    expect(verifyMetricsConsistency(quality)).toEqual([]);
    expect(formatClaimMetricBasis(metrics)).toContain('3 inference');
  });
  it('does not render a legacy advisory-only HIGH as tested or high coverage', () => {
    const html = renderToStaticMarkup(<VulnerabilityReportView report={report()} id="fixture" />);
    expect(html).toContain('Detection confidence: LOW'); expect(html).toContain('tested coverage not established'); expect(html).not.toContain('Detection confidence: HIGH');
  });
});

describe('synthetic Gemini completion contract', () => {
  it('records the actual MIME-only request, limit, counters and validation outcomes', async () => {
    const { result, requestBody } = await analysis(JSON.stringify(complete), 'STOP');
    expect(requestBody.generationConfig).toEqual({ responseMimeType: 'application/json', maxOutputTokens: 1200, temperature: 0.1 });
    expect(requestBody.generationConfig.responseSchema).toBeUndefined();
    expect(result.status).toBe('PASS'); expect(result.input_tokens).toBe(1693); expect(result.output_tokens).toBe(317);
    expect(result.completion).toMatchObject({ finish_reason: 'STOP', thoughts_tokens: 883, output_limit: 1200, structured_output: 'JSON_MIME_ONLY', parse_outcome: 'PASS', schema_outcome: 'PASS' });
    expect(JSON.stringify(result.completion)).not.toContain('synthetic-key');
  });
  it('MAX_TOKENS remains a failed completion even if the JSON happens to close', async () => {
    const { result } = await analysis(JSON.stringify(complete), 'MAX_TOKENS');
    expect(result.status).toBe('FAIL'); expect(result.analysis).toBeNull(); expect(result.error_code).toBe('OUTPUT_TRUNCATED'); expect(result.completion?.parse_outcome).toBe('PASS');
  });
  it('incomplete JSON fails with or without a supplied token-limit signal', async () => {
    for (const finishReason of ['MAX_TOKENS', 'STOP', undefined]) {
      const { result } = await analysis('{"root_cause":"unfinished', finishReason);
      expect(result.status).toBe('FAIL'); expect(result.analysis).toBeNull();
      expect(result.error_code).toBe(finishReason === 'MAX_TOKENS' ? 'OUTPUT_TRUNCATED' : 'JSON_PARSE_ERROR');
      expect(result.completion?.finish_reason).toBe(finishReason ?? null); expect(result.completion?.parse_outcome).toBe('FAIL');
    }
  });
  it('does not salvage a valid nested object or ignore an incomplete second document', async () => {
    for (const raw of [`{"partial":${JSON.stringify(complete)}`, `${JSON.stringify(complete)}\n{"partial":`]) {
      const { result } = await analysis(raw, 'STOP'); expect(result.status).toBe('FAIL'); expect(result.analysis).toBeNull();
    }
  });
  it('excludes thought parts and joins only visible response text', async () => {
    const { result } = await analysis('', 'STOP', { candidates: [{ finishReason: 'STOP', content: { parts: [{ text: 'Internal reasoning is not report JSON', thought: true }, { text: JSON.stringify(complete).slice(0, 35) }, { text: JSON.stringify(complete).slice(35) }] } }] });
    expect(result.status).toBe('PASS'); expect(result.raw_response).not.toContain('Internal reasoning'); expect(result.analysis?.root_cause).toBe(complete.root_cause);
  });
  it('preserves non-token provider termination without misclassifying it as MAX_TOKENS', async () => {
    const { result } = await analysis(JSON.stringify(complete), 'SAFETY');
    expect(result.status).toBe('FAIL'); expect(result.error_code).toBe('PROVIDER_COMPLETION_REJECTED'); expect(result.completion?.finish_reason).toBe('SAFETY'); expect(result.analysis).toBeNull();
  });
  it('rejects non-string core fields and records schema failure', async () => {
    const { result } = await analysis(JSON.stringify({ ...complete, root_cause: { invented: true } }), 'STOP');
    expect(result.status).toBe('PARTIAL'); expect(result.error_code).toBe('INVALID_OBJECT_SHAPE'); expect(result.completion?.schema_outcome).toBe('FAIL');
    expect(reportAnalysisAvailability({ ai_analysis: { status: result.status } }).state).toBe('FAILED');
  });
});

describe('read API and Preview UI fail closed without mutation', () => {
  it('withholds the measured legacy PUBLISHED row and exposes its failure reason', async () => {
    const r = report(); r.ai_analysis = { status: 'FAIL', error_code: 'JSON_PARSE_ERROR', parsed: null };
    const row = storedRow(r); const before = JSON.stringify(row);
    const { payload, calls } = await detailRead(row);
    expect(payload.status).toBe('ANALYSIS_UNAVAILABLE'); expect(payload.report.publication_status).toBe('WITHHELD');
    // Gate 3A.3 — the public verdict is a state plus one notice. The provider error
    // code is operator data and is not shipped to the browser.
    expect(payload.report.analysis_availability?.state).toBe('FAILED');
    expect(payload.report.analysis_availability?.reasons.join(' ')).not.toContain('JSON_PARSE_ERROR');
    expect(calls).toHaveLength(1); expect(calls[0]).toMatch(/^SELECT /); expect(JSON.stringify(row)).toBe(before);
    const html = renderToStaticMarkup(<VulnerabilityReportView report={payload.report} id="fixture" />);
    expect(html).toContain('DEEP ANALYST ASSESSMENT PENDING VERIFICATION');
    expect(html).not.toContain('JSON_PARSE_ERROR'); expect(html).not.toContain('Gemini'); expect(html).not.toContain('Valid source-grounded summary'); expect(html).not.toContain('vx-hero');
  });
  it('semantic and kernel rejection stay blocked even if stale row flags say PUBLISHED', async () => {
    for (const failure of ['semantic', 'kernel'] as const) {
      const r = report(); r.ai_analysis = { status: 'PASS', parsed: complete, analysis_provenance: 'MODEL' };
      if (failure === 'semantic') r.structured_report!.semantic_gate = { isValid: false, violations: ['Unknown vendor asserted as fact'] };
      else r.structured_report!.validation = { kernel_validation: { executed: true, status: 'CONFLICT', lifecycle_state: 'REJECTED', conflicts: ['Identity conflict'] } };
      const { payload } = await detailRead(storedRow(r));
      expect(payload.status).toBe('ANALYSIS_UNAVAILABLE'); expect(payload.report.analysis_availability?.state).toBe('BLOCKED');
      expect(renderToStaticMarkup(<VulnerabilityReportView report={payload.report} id="fixture" />)).toContain('ANALYSIS BLOCKED');
    }
  });
  it('malformed stored analysis does not fall through to an apparently valid alternative report', async () => {
    const { payload, calls } = await detailRead({ ...storedRow(report()), ai_analysis_json: '{"status":' });
    expect(payload.status).toBe('ANALYSIS_UNAVAILABLE'); expect(payload.report.analysis_availability?.reasons.join(' ')).toContain('STORED_ANALYSIS_JSON_INVALID'); expect(calls).toHaveLength(1);
  });
  it('front-end reads and refreshes use only GET, retain failure diagnostics and never request generation or fallback', async () => {
    const r = report(); r.ai_analysis = { status: 'FAIL', error_code: 'JSON_PARSE_ERROR', parsed: null };
    const calls: Array<{ url: string; method: string }> = [];
    globalThis.fetch = (async (input: unknown, init?: RequestInit) => {
      calls.push({ url: String(input), method: init?.method || 'GET' }); return Response.json({ status: 'SUCCESS', report: r });
    }) as typeof fetch;
    for (let i = 0; i < 2; i++) {
      const result = await getVulnerabilityDetail('CVE-2026-108770');
      expect(result.data?.publication_status).toBe('WITHHELD'); expect(result.data?.ai_analysis?.error_code).toBe('JSON_PARSE_ERROR');
    }
    expect(calls).toHaveLength(2); expect(calls.every(c => c.method === 'GET' && c.url.endsWith('/intelligence/CVE-2026-108770'))).toBe(true);
    expect(detailBlock).not.toMatch(/runGroundedCveAnalysis|env\.AI\.run|\.run\(|\.batch\(/);
    expect(webSource).not.toMatch(/runGroundedCveAnalysis|\/canary\//);
  });
  it('published feed filters legacy failed rows instead of exposing fallback summaries', async () => {
    const start = apiSource.indexOf('      // GET /api/v1/intelligence (Primary Feed');
    const end = apiSource.indexOf('      // ── GET /api/v1/articles', start);
    const body = transpiler.transformSync(`async function feedRoute() {\n${apiSource.slice(start, end)}\n}`);
    const route = new AsyncFunction('path', 'request', 'url', 'env', 'jsonResponse', 'decodeStoredAnalysis', 'decodeStoredStructuredReport', 'projectVulnerabilityReportRead', `${body}\nreturn feedRoute();`);
    const failed = report(); failed.ai_analysis = { status: 'FAIL', error_code: 'JSON_PARSE_ERROR', parsed: null };
    const response: Response = await route('/api/v1/intelligence', new Request('http://localhost/api/v1/intelligence'), new URL('http://localhost/api/v1/intelligence'), { DB: { prepare: () => ({ bind: () => ({ all: async () => ({ results: [storedRow(failed), storedRow(report())] }) }) }) } }, (v: unknown) => Response.json(v), decodeStoredAnalysis, decodeStoredStructuredReport, projectVulnerabilityReportRead);
    const payload = await response.json() as { reports: VulnerabilityDetail[]; total: number };
    expect(payload.total).toBe(1); expect(payload.reports).toHaveLength(1); expect(payload.reports[0].ai_analysis).toBeUndefined();
  });
  it('Collector fallback applies the same unsuccessful-analysis read gate', async () => {
    const failed = report(); failed.ai_analysis = { status: 'FAIL', error_code: 'JSON_PARSE_ERROR', parsed: null };
    const body = transpiler.transformSync(`async function fallbackRoute() {\n${detailBlock}\n}`);
    const route = new AsyncFunction('path', 'request', 'env', 'jsonResponse', 'decodeStoredAnalysis', 'decodeStoredStructuredReport', 'projectVulnerabilityReportRead', `${body}\nreturn fallbackRoute();`);
    const response: Response = await route('/api/v1/intelligence/CVE-2026-108770', new Request('http://localhost/api/v1/intelligence/CVE-2026-108770'), { DB: { prepare: () => ({ bind: () => ({ first: async () => null }) }) }, TELEGRAM_COLLECTOR_SERVICE: { fetch: async () => Response.json({ status: 'SUCCESS', report: failed }) } }, (v: unknown) => Response.json(v), decodeStoredAnalysis, decodeStoredStructuredReport, projectVulnerabilityReportRead);
    const payload = await response.json() as { status: string; report: VulnerabilityDetail };
    expect(payload.status).toBe('ANALYSIS_UNAVAILABLE'); expect(payload.report.publication_status).toBe('WITHHELD');
  });
  it('a mandatory zero-evidence contract cannot be shown as available', () => {
    expect(reportAnalysisAvailability({ ai_analysis: { status: 'PASS', grounding: { required: true, evidence_supplied: 0 } } }).state).toBe('BLOCKED');
  });
  it('STORE_ONLY preserves compatibility only when no gate rejected the source record', () => {
    const r = report(); r.ai_analysis = { status: 'SKIPPED', analysis_provenance: 'DETERMINISTIC_FALLBACK' };
    expect(projectVulnerabilityReportRead(r)).toBe(r);
    r.structured_report!.status = 'BLOCKED'; expect(projectVulnerabilityReportRead(r).publication_status).toBe('WITHHELD');
    expect(apiSource).toContain("const publishable = !gateBlocked && (processDecision !== 'DEEP_ANALYSIS' || analysisUsable);");
  });
});

describe('valid KEV compatibility and authority scope', () => {
  it('retains known KEV identity, source facts, remediation, exploitation and report shape', () => {
    const reconciliation = reconcileOpenSourceEnrichment({ cveId: 'CVE-2023-46805', cisaKev: { vendorProject: 'Ivanti', product: 'Connect Secure', requiredAction: 'Apply mitigations', dueDate: '2024-01-22', knownRansomwareCampaignUse: 'Unknown' } });
    expect(reconciliation.identity.vendor).toBe('Ivanti'); expect(reconciliation.identity.product).toBe('Connect Secure'); expect(reconciliation.identity.truth_types.vendor).toBe('SOURCE_FACT'); expect(reconciliation.identity.truth_types.product).toBe('SOURCE_FACT');
    const r = report(); const before = JSON.stringify(r);
    projectReportForPrimaryAuthority(r, CISA_KEV_AUTHORITY, 'CVE-2023-46805');
    expect(JSON.stringify(r)).toBe(before); expect(projectVulnerabilityReportRead(r)).toBe(r);
    expect(r.structured_report?.exploitation.known_exploited).toBe(true); expect(r.structured_report?.remediation.due_date).toBe('2024-01-22');
  });
  it('scopes the new reconciliation normalization to the explicit non-KEV authority', () => {
    const base = { cveId: 'CVE-2026-108770', cisaKev: undefined };
    expect(reconcileOpenSourceEnrichment(base).identity.truth_types.vendor).toBe('SOURCE_FACT');
    expect(reconcileOpenSourceEnrichment({ ...base, primaryAuthority: NVD_CVE_AUTHORITY }).identity.truth_types.vendor).toBe('UNKNOWN');
    expect(reconcileOpenSourceEnrichment({ ...base, primaryAuthority: NVD_CVE_AUTHORITY }).identity.truth_types.product).toBe('UNKNOWN');
    expect(apiSource).toContain('primaryAuthority: authority,');
  });
  it('valid historical KEV reads retain the established API success contract and source facts', async () => {
    const r = report(); const { payload } = await detailRead(storedRow(r));
    expect(payload.status).toBe('SUCCESS'); expect(payload.report.status).toBe('ANALYZED'); expect(payload.report.publication_status).toBe('PUBLISHED');
    expect(payload.report.structured_report).toEqual(r.structured_report); expect(payload.report.analysis_availability).toBeUndefined();
  });
  it('existing production configuration and database bindings remain byte-identical to this phase baseline', () => {
    const hashes: Record<string, string> = {
      'workers/api/wrangler.toml': 'b71e6805f4e51615f3e5726f708ec1dd0e89284a0597ad47c6f75f032c645b6a',
      'workers/ingest/wrangler.toml': '865923871c3d0d3e9fd0cdd50ce7c828e8b71d9ab3d4b9ca57116cf67b6aaf9a',
      'apps/web/wrangler.jsonc': '36c878678de53792e5152bd9b8da24f6dfcc4768a9747ff79b6869c53e3107d2',
      'apps/web/wrangler.holding.jsonc': '89987a9bbd07e5925500de21f88c3910bb83b607ad3b869fca3933e09e507349',
    };
    for (const [path, expected] of Object.entries(hashes)) {
      const actual = new Bun.CryptoHasher('sha256').update(readFileSync(resolve(root, path))).digest('hex');
      expect(actual).toBe(expected);
    }
  });
});
