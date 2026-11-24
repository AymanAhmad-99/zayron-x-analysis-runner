import { describe, expect, it } from 'bun:test';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import React from 'react';
import { renderToStaticMarkup } from '../../apps/web/node_modules/react-dom/server.node.js';
import { getVulnerabilityDetail } from '../../apps/web/app/lib/api';
import { VulnerabilityReportView } from '../../apps/web/app/components/VulnerabilityDetail';

import {
  PUBLIC_ANALYSIS_PENDING_NOTICE,
  WITHHELD_FORBIDDEN_AI_FIELDS,
  WITHHELD_FORBIDDEN_FIELDS,
  WITHHELD_SAFE_AI_FIELDS,
  WITHHELD_SAFE_FIELDS,
  buildAuthoritativeAdvisory,
  decodeStoredAnalysis,
  decodeStoredStructuredReport,
  projectVulnerabilityReportPublicRead,
  projectVulnerabilityReportRead,
  reportAnalysisAvailability,
} from '../../packages/intelligence/src/vulnerability/reportIntegrity';

/**
 * WITHHELD REPORT CONTENT DISCLOSURE GUARD.
 *
 * Phase 9 proved against the live Preview API that a report marked `WITHHELD` /
 * `ANALYSIS_UNAVAILABLE` still returned its complete dossier — `body`, `summary`,
 * Gemini's `ai_analysis.parsed` and the full `structured_report` with 31 claims — to any
 * unauthenticated caller. This suite drives the REAL route blocks (not a reimplementation of
 * their response shape) with a unique sentinel in every sensitive field, including nested
 * copies, and requires that none of them survive into the serialized response.
 *
 * Marker namespaces are deliberately DISJOINT: `SENTINEL_*` marks dossier content that must
 * never be served for a withheld report, and `PUBLISHED_*` marks a legitimately published
 * report's content that MUST still be served. That is what lets a single whole-payload
 * assertion ("no SENTINEL_ anywhere") sit next to proof that published content survives.
 *
 * The Worker cannot be imported whole (workerd-only Workflow/WASM imports), so the bounded
 * seam used here supplies synthetic D1 reads plus the same production projection functions —
 * the identical harness `gemini_analysis_integrity_close.test.tsx` uses.
 */

const root = resolve(import.meta.dir, '../..');
const apiSource = readFileSync(resolve(root, 'workers/api/src/index.ts'), 'utf8');
const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;
const transpiler = new Bun.Transpiler({ loader: 'ts' });

/** Marker for dossier content that must never cross the withheld boundary. */
const S = (field: string) => `SENTINEL_${field.replace(/[^A-Za-z0-9]+/g, '_')}_8f3a21`;
/** Marker for a legitimately published report's content, which must still be served. */
const P = (field: string) => `PUBLISHED_${field.replace(/[^A-Za-z0-9]+/g, '_')}_4c7b`;
/**
 * Marker for GATE RATIONALE text — the violation/warning strings that are deliberately
 * surfaced in `analysis_availability.reasons` so a caller can see WHY a report is withheld.
 * This is a bounded, intended channel (the live UI renders exactly this list), so it is
 * marked separately from dossier content: `REASON_` must SURVIVE redaction, `SENTINEL_` must
 * not.
 */
const R = (field: string) => `REASON_${field.replace(/[^A-Za-z0-9]+/g, '_')}_5d19`;

function routeBlock(startMarker: string, endMarker?: string): string {
  const start = apiSource.indexOf(startMarker);
  if (start < 0) throw new Error(`route marker not found: ${startMarker}`);
  if (endMarker) {
    const end = apiSource.indexOf(endMarker, start);
    if (end < 0) throw new Error(`route end marker not found: ${endMarker}`);
    return apiSource.slice(start, end);
  }
  const candidates = [
    apiSource.indexOf('\n      // ──', start),
    apiSource.indexOf('\n      if (path', start),
  ].filter((index) => index > start);
  return apiSource.slice(start, candidates.length ? Math.min(...candidates) : apiSource.length);
}

const DETAIL_BLOCK = routeBlock('      // GET /api/v1/intelligence/:id', '      // GET /api/v1/intelligence (Primary Feed');
const FEED_BLOCK = routeBlock('      // GET /api/v1/intelligence (Primary Feed', '      // ── GET /api/v1/articles');
const SEARCH_BLOCK = routeBlock("      if (path === '/api/v1/search')");
const VULN_DETAIL_BLOCK = routeBlock('      // ── GET /api/v1/vulnerabilities/:id');

const jsonResponse = (value: unknown) => Response.json(value);
const errorResponse = (message: string, status = 400, code = 'BAD_REQUEST') => Response.json({ error: { code, message } }, { status });
const noop = () => ({});

/** Shape the route receives from the Collector DO / a decoded report: objects, not JSON text. */
function decoded<T extends Record<string, unknown>>(row: T) {
  return {
    ...row,
    ai_analysis: decodeStoredAnalysis(row.ai_analysis_json),
    structured_report: decodeStoredStructuredReport(row.structured_report_json),
  };
}

/** Build the D1 `prepare().bind().first()` stub the route uses. */
function dbStub(row: Record<string, unknown> | null, statements: string[], rejectRead = false) {
  return {
    prepare(statement: string) {
      statements.push(statement);
      const result = async () => {
        if (rejectRead) throw new Error('D1 read failed');
        return row === null ? null : structuredClone(row);
      };
      return {
        bind: () => ({ first: result, all: async () => ({ results: [] }) }),
        first: result,
        all: async () => ({ results: [] }),
      };
    },
  };
}

/** Execute the real detail-route block with a synthetic D1 / Collector. */
async function runDetailRoute(row: Record<string, unknown> | null, options: { rejectRead?: boolean; collectorReport?: Record<string, unknown>; feed?: Record<string, unknown>[] } = {}) {
  const sql: string[] = [];
  const env: Record<string, unknown> = { DB: dbStub(row, sql, options.rejectRead) };
  if (options.collectorReport) {
    env.TELEGRAM_COLLECTOR_SERVICE = { fetch: async () => jsonResponse({ status: 'SUCCESS', report: options.collectorReport, reports: options.feed ?? [options.collectorReport] }) };
  }
  const body = transpiler.transformSync(`async function readRoute() {\n${DETAIL_BLOCK}\n}`);
  const route = new AsyncFunction('path', 'request', 'env', 'jsonResponse', 'errorResponse', 'decodeStoredAnalysis', 'decodeStoredStructuredReport', 'projectVulnerabilityReportRead', 'projectVulnerabilityReportPublicRead', 'reportAnalysisAvailability', 'buildAuthoritativeAdvisory', 'computeClaimMetrics', 'verifyClaimMetricConsistency', `${body}\nreturn readRoute();`);
  const response: Response = await route(
    '/api/v1/intelligence/CVE-2022-24706',
    new Request('http://localhost/api/v1/intelligence/CVE-2022-24706'),
    env,
    jsonResponse,
    errorResponse,
    decodeStoredAnalysis,
    decodeStoredStructuredReport,
    projectVulnerabilityReportRead,
    projectVulnerabilityReportPublicRead,
    reportAnalysisAvailability,
    buildAuthoritativeAdvisory,
    noop,
    () => [],
  );
  return { response, payload: await response.json() as any, sql };
}

/** Execute the real Primary Feed list-route block. */
async function runFeedRoute(rows: Record<string, unknown>[]) {
  const env = { DB: { prepare: () => ({ bind: () => ({ all: async () => ({ results: rows.map(structuredClone) }) }) }) } };
  const body = transpiler.transformSync(`async function feedRoute() {\n${FEED_BLOCK}\n}`);
  const route = new AsyncFunction('path', 'request', 'url', 'env', 'jsonResponse', 'decodeStoredAnalysis', 'decodeStoredStructuredReport', 'projectVulnerabilityReportRead', `${body}\nreturn feedRoute();`);
  const response: Response = await route('/api/v1/intelligence', new Request('http://localhost/api/v1/intelligence'), new URL('http://localhost/api/v1/intelligence'), env, jsonResponse, decodeStoredAnalysis, decodeStoredStructuredReport, projectVulnerabilityReportRead);
  return { response, payload: await response.json() as any };
}

/**
 * The live Phase 9 shape: outer `ANALYZED`/`PUBLISHED` with an inner `BLOCKED` structured
 * report and a complete stored dossier (the CVE-2022-24706 case). Every dossier field carries
 * a sentinel, including a nested copy of the body under an unexpected key and unknown
 * top-level columns. Only genuinely safe metadata (title, severity, categories) is benign —
 * and it is asserted PRESENT, so a redaction that blanked the response would fail too.
 */
function withheldRow(): Record<string, unknown> {
  const ai = {
    status: 'FAIL',
    error_code: 'JSON_PARSE_ERROR',
    failure_class: 'MODEL_FAILURE',
    provider: 'gemini',
    retry_count: 0,
    fallback_used: true,
    latency_ms: 11967,
    parsed: {
      executive_assessment: S('ai.parsed.executive_assessment'),
      root_cause: S('ai.parsed.root_cause'),
      technical_assessment: S('ai.parsed.technical_assessment'),
      body: S('ai.parsed.body'),
    },
    raw: S('ai.raw'),
    grounding: { required: true, evidence_supplied: 20, cited_evidence: [S('ai.grounding.cited_evidence')], error_code: R('grounding.error_code') },
    summary_source: S('ai.summary_source'),
    completion: { parse_outcome: S('ai.completion') },
  };
  const structured = {
    status: 'BLOCKED',
    identity: { cve: 'CVE-2022-24706', title: S('structured.identity.title') },
    assessment: {
      executive_assessment: S('structured.assessment.executive_assessment'),
      technical_assessment: S('structured.assessment.technical_assessment'),
    },
    remediation: { recommended_action: S('structured.remediation') },
    detection: { recommended_monitoring: S('structured.detection') },
    semantic_gate: { isValid: false, violations: [R('semantic_gate.violations')] },
    claims_verification: { is_valid: false, violations: [{ issue: R('claims_verification') }] },
    provenance: { claims: [{ id: 'CLM-01', value: S('structured.provenance.claims') }], evidence: [{ id: S('structured.provenance.evidence') }] },
    evidence: [{ id: S('structured.evidence') }],
    // Nested copy of dossier content under an unexpected key: an allowlist must not carry it.
    report: { body: S('structured.report.body') },
    diagnostics: { warnings: [R('diagnostics.warnings')] },
    legacy_summary: S('structured.legacy_summary'),
  };
  return {
    intelligence_id: 'CVE-2022-24706',
    schema_version: '2.0.0',
    source_id: 'cisa-kev',
    source_title: 'CISA Known Exploited Vulnerabilities',
    title: 'Apache CouchDB Insecure Default Initialization of Resource Vulnerability',
    body: S('body'),
    summary: S('summary'),
    severity: 'HIGH',
    priority: 'P1',
    status: 'ANALYZED',
    publication_status: 'PUBLISHED',
    intelligence_type: 'vulnerabilities',
    // Safe metadata: served, and asserted present rather than blanked.
    categories_json: JSON.stringify(['vulnerabilities']),
    subcategories_json: JSON.stringify(['database']),
    confidence_vector_json: JSON.stringify({ overall_confidence: 0.95, basis: S('confidence') }),
    entities_json: JSON.stringify({ cves: [S('entities')] }),
    indicators_json: JSON.stringify([S('indicators')]),
    evidence_json: JSON.stringify([{ id: S('evidence') }]),
    citations_json: JSON.stringify([S('citations')]),
    source_references_json: JSON.stringify([{ url: S('source_references') }]),
    knowledge_trace_json: JSON.stringify([{ step: S('knowledge_trace') }]),
    epistemic_breakdown_json: JSON.stringify({ quality_metrics: { supported_claims: 1, basis: S('epistemic_breakdown') } }),
    ai_analysis_json: JSON.stringify(ai),
    structured_report_json: JSON.stringify(structured),
    // Unknown/legacy columns that must never reach the response either.
    canonical_report: { body: S('canonical_report.body') },
    legacy_report_body: S('legacy_report_body'),
    created_at: '2026-10-11T02:50:43Z',
    updated_at: '2026-10-11T02:50:56Z',
  };
}

/** A legitimately published, gate-passing row whose content MUST remain readable. */
function publishedRow(): Record<string, unknown> {
  return {
    intelligence_id: 'CVE-2026-104935',
    schema_version: '2.0.0',
    source_id: 'cisa-kev',
    source_title: 'CISA Known Exploited Vulnerabilities',
    title: 'Ivanti Connect Secure Authentication Bypass by Spoofing Vulnerability',
    body: P('body'),
    summary: P('summary'),
    severity: 'HIGH',
    status: 'ANALYZED',
    publication_status: 'PUBLISHED',
    intelligence_type: 'vulnerabilities',
    categories_json: JSON.stringify(['vulnerabilities']),
    ai_analysis_json: JSON.stringify({ status: 'PASS', parsed: { executive_assessment: P('ai.parsed'), evidence_used: ['SOURCE_FACT:description'] } }),
    structured_report_json: JSON.stringify({
      status: 'PUBLISHED',
      identity: { cve: 'CVE-2026-104935', title: 'Ivanti Connect Secure Authentication Bypass', vendor: 'Ivanti', product: 'Connect Secure' },
      assessment: { executive_assessment: P('assessment'), technical_assessment: P('technical'), confidence: { score: 0.9, rating: 'HIGH', basis: 'Authoritative sources' } },
      remediation: { vendor_advisory: 'https://vendor.example/advisory', recommended_action: 'Apply mitigations' },
      claims_verification: { is_valid: true, violations: [] },
      semantic_gate: { isValid: true, violations: [] },
      provenance: { claims: [], evidence: [], sources: ['cisa-kev'] },
    }),
    created_at: '2026-10-13T15:01:10Z',
    updated_at: '2026-10-13T15:01:34Z',
  };
}

const serialized = (value: unknown) => JSON.stringify(value);
const sentinelsIn = (value: unknown) => serialized(value).match(/SENTINEL_[A-Za-z0-9_]+/g) ?? [];

describe('WITHHELD DISCLOSURE GUARD — the live detail route serves no dossier', () => {
  it('a withheld report returns NO sentinel from any dossier field, including nested copies', async () => {
    const { response, payload } = await runDetailRoute(withheldRow());
    expect(response.status).toBe(200);
    expect(payload.status).toBe('ANALYSIS_UNAVAILABLE');
    expect(payload.report.publication_status).toBe('WITHHELD');
    expect(payload.report.content_withheld).toBe(true);

    // Whole-response assertion: not one sentinel survives serialization.
    expect(sentinelsIn(payload)).toEqual([]);
    // The whole class of dossier fields is absent, not merely the first one found.
    for (const field of WITHHELD_FORBIDDEN_FIELDS) expect(payload.report[field]).toBeUndefined();
    for (const field of WITHHELD_FORBIDDEN_AI_FIELDS) expect(payload.report.ai_analysis?.[field]).toBeUndefined();
    expect(payload.report).not.toHaveProperty('epistemic_breakdown');
    expect(payload.report).not.toHaveProperty('canonical_report');
    expect(payload.report).not.toHaveProperty('legacy_report_body');
    expect(payload.report.confidence).toBeUndefined();
  });

  it('the withheld response keeps safe metadata and the failure diagnostics a caller needs', async () => {
    const { payload } = await runDetailRoute(withheldRow());
    // Minimal safe metadata survives — the response is redacted, not blanked.
    expect(payload.report.title).toBe('Apache CouchDB Insecure Default Initialization of Resource Vulnerability');
    expect(payload.report.intelligence_id).toBe('CVE-2022-24706');
    expect(payload.report.severity).toBe('HIGH');
    expect(payload.report.created_at).toBe('2026-10-11T02:50:43Z');
    expect(payload.report.categories).toEqual(['vulnerabilities']);
    // Gate 3A.3 — the PUBLIC response carries no provider/model diagnostics at all:
    // provider name, model id and error codes are operator data. The server keeps the
    // full rationale; the visitor gets one calm, stable notice.
    expect(payload.report.ai_analysis).toBeUndefined();
    expect(payload.report.analysis_availability.state).not.toBe('AVAILABLE');
    expect(payload.report.analysis_availability.reasons).toEqual([PUBLIC_ANALYSIS_PENDING_NOTICE]);
    const reasons = serialized(payload.report.analysis_availability);
    for (const marker of ['REASON_grounding_error_code_5d19', 'REASON_semantic_gate_violations_5d19', 'REASON_claims_verification_5d19', 'REASON_diagnostics_warnings_5d19', 'JSON_PARSE_ERROR', 'gemini', 'provider circuit open']) {
      expect(reasons).not.toContain(marker);
    }
  });

  it('a valid published report is returned unchanged — the fix does not blank legitimate publications', async () => {
    const { payload } = await runDetailRoute(publishedRow());
    expect(payload.status).toBe('SUCCESS');
    expect(payload.report.publication_status).toBe('PUBLISHED');
    expect(payload.report.body).toBe(P('body'));
    expect(payload.report.summary).toBe(P('summary'));
    expect(payload.report.structured_report.assessment.executive_assessment).toBe(P('assessment'));
    expect(payload.report.ai_analysis.parsed.executive_assessment).toBe(P('ai.parsed'));
    expect(payload.report.content_withheld).toBeUndefined();
  });
});

describe('WITHHELD DISCLOSURE GUARD — fail closed on missing, blank, contradictory or malformed state', () => {
  it('a missing publication status is not a publication claim', async () => {
    const row = withheldRow();
    delete row.publication_status;
    const { payload } = await runDetailRoute(row);
    expect(payload.status).toBe('ANALYSIS_UNAVAILABLE');
    expect(payload.report.publication_status).toBe('WITHHELD');
    expect(sentinelsIn(payload)).toEqual([]);
  });

  it('blank and non-string publication states fail closed too', async () => {
    for (const value of ['', '   ', 42, null, undefined]) {
      const row = withheldRow();
      row.publication_status = value;
      const { payload } = await runDetailRoute(row);
      expect(payload.report.publication_status).toBe('WITHHELD');
      expect(sentinelsIn(payload)).toEqual([]);
    }
  });

  it('an unknown publication status fails closed', async () => {
    const row = withheldRow();
    row.publication_status = 'DRAFT';
    const { payload } = await runDetailRoute(row);
    expect(payload.report.publication_status).toBe('WITHHELD');
    expect(sentinelsIn(payload)).toEqual([]);
  });

  it('a malformed stored structured report fails closed instead of reading another record', () => {
    const report = decoded({ ...withheldRow(), structured_report_json: '{not valid json' });
    const projected: any = projectVulnerabilityReportRead(report as any);
    expect(projected.publication_status).toBe('WITHHELD');
    expect(projected.body).toBeUndefined();
    expect(projected.structured_report).toBeUndefined();
    expect(sentinelsIn(projected)).toEqual([]);
  });

  it('an attached AVAILABLE label cannot unlock withheld content', () => {
    const report = {
      intelligence_id: 'CVE-2022-24706',
      status: 'ANALYZED',
      publication_status: 'PUBLISHED',
      body: S('unlock.body'),
      summary: S('unlock.summary'),
      structured_report: { status: 'BLOCKED' },
      analysis_availability: { state: 'AVAILABLE' as const, reasons: [], analysis_provenance: 'MODEL' as const },
    };
    const projected: any = projectVulnerabilityReportRead(report as any);
    expect(projected.publication_status).toBe('WITHHELD');
    expect(projected.body).toBeUndefined();
    expect(sentinelsIn(projected)).toEqual([]);
  });

  it('re-projecting a withheld response is sticky and idempotent, and never mutates the input', () => {
    const first: any = projectVulnerabilityReportRead(decoded(withheldRow()) as any);
    expect(first.publication_status).toBe('WITHHELD');
    const second: any = projectVulnerabilityReportRead(first);
    expect(second.publication_status).toBe('WITHHELD');
    expect(second.analysis_availability).toEqual(first.analysis_availability);
    expect(sentinelsIn(second)).toEqual([]);
    // The projection never mutates the caller's stored row or report object.
    const row = withheldRow();
    const beforeRow = serialized(row);
    const report = decoded(row);
    const beforeReport = serialized(report);
    projectVulnerabilityReportRead(report as any);
    expect(serialized(row)).toBe(beforeRow);
    expect(serialized(report)).toBe(beforeReport);
  });
});

describe('WITHHELD DISCLOSURE GUARD — list, fallback and error paths', () => {
  it('the Primary Feed list cannot carry withheld dossier content', async () => {
    const failed = withheldRow();
    failed.ai_analysis_json = JSON.stringify({ status: 'FAIL', error_code: 'JSON_PARSE_ERROR', parsed: null });
    failed.structured_report_json = JSON.stringify({ status: 'BLOCKED' });
    const { payload } = await runFeedRoute([failed, publishedRow()]);
    expect(payload.total).toBe(1);
    expect(payload.reports).toHaveLength(1);
    expect(sentinelsIn(payload)).toEqual([]);
    // The surviving record is the legitimately published one, served intact.
    expect(payload.reports[0].intelligence_id).toBe('CVE-2026-104935');
    expect(payload.reports[0].body).toBe(P('body'));
  });

  it('the Collector DO fallback applies the same redaction', async () => {
    const { payload } = await runDetailRoute(null, { collectorReport: decoded(withheldRow()) });
    expect(payload.status).toBe('ANALYSIS_UNAVAILABLE');
    expect(payload.report.publication_status).toBe('WITHHELD');
    expect(sentinelsIn(payload)).toEqual([]);
  });

  it('a D1 read failure never returns the raw stored row', async () => {
    const { response, payload } = await runDetailRoute(withheldRow(), { rejectRead: true });
    expect(response.status).toBe(404);
    expect(payload.report).toBeUndefined();
    expect(payload.reports).toBeUndefined();
    expect(sentinelsIn(payload)).toEqual([]);
  });

  it('alternate handlers that do not read the dossier store cannot leak it', () => {
    // Structural proof: the search and canonical-vulnerability routes never select from the
    // dossier table, so no withheld report can be reached through them.
    for (const block of [SEARCH_BLOCK, VULN_DETAIL_BLOCK]) {
      expect(block.length).toBeGreaterThan(0);
      expect(block).not.toContain('intelligence_reports');
      expect(block).not.toContain('structured_report_json');
      expect(block).not.toContain('ai_analysis_json');
    }
    // ...while every handler that DOES read it routes the response through the projection.
    for (const block of [DETAIL_BLOCK, FEED_BLOCK]) {
      expect(block).toContain('projectVulnerabilityReportRead');
    }
  });
});

describe('WITHHELD DISCLOSURE GUARD — the allowlist itself', () => {
  it('the safe and forbidden lists are disjoint (a field is never both)', () => {
    const safe = new Set<string>(WITHHELD_SAFE_FIELDS);
    for (const field of WITHHELD_FORBIDDEN_FIELDS) expect(safe.has(field)).toBe(false);
    const safeAi = new Set<string>(WITHHELD_SAFE_AI_FIELDS);
    for (const field of WITHHELD_FORBIDDEN_AI_FIELDS) expect(safeAi.has(field)).toBe(false);
  });

  it('no dossier-carrying field is allowlisted', () => {
    const safe = new Set<string>(WITHHELD_SAFE_FIELDS);
    for (const field of ['body', 'summary', 'structured_report', 'ai_analysis', 'evidence', 'citations', 'source_references', 'entities', 'indicators', 'knowledge_trace', 'epistemic_breakdown', 'confidence', 'relations', 'content_hash']) {
      expect(safe.has(field)).toBe(false);
    }
    const safeAi = new Set<string>(WITHHELD_SAFE_AI_FIELDS);
    for (const field of ['parsed', 'raw', 'grounding', 'completion', 'summary_source']) expect(safeAi.has(field)).toBe(false);
  });

  it('a field that is not allowlisted is dropped even when it is not on the forbidden list', () => {
    const report = {
      intelligence_id: 'CVE-2022-24706',
      status: 'ANALYZED',
      publication_status: 'PUBLISHED',
      structured_report: { status: 'BLOCKED' },
      // A dossier field invented after this module was written.
      future_dossier_field: S('future_dossier_field'),
    };
    const projected: any = projectVulnerabilityReportRead(report as any);
    expect(projected.publication_status).toBe('WITHHELD');
    expect(projected.future_dossier_field).toBeUndefined();
    expect(sentinelsIn(projected)).toEqual([]);
  });

  it('availability is recomputed from stored signals, never read from a bare label', () => {
    expect(reportAnalysisAvailability({ status: 'ANALYZED', publication_status: 'PUBLISHED' }).state).toBe('AVAILABLE');
    expect(reportAnalysisAvailability({ status: 'ANALYZED' }).state).not.toBe('AVAILABLE');
    expect(reportAnalysisAvailability({ publication_status: 'PUBLISHED', structured_report: { status: 'BLOCKED' } }).state).toBe('BLOCKED');
    expect(reportAnalysisAvailability({ publication_status: 'PUBLISHED', status: 'REJECTED' }).state).toBe('BLOCKED');
  });
});

describe('WITHHELD DISCLOSURE GUARD — end to end: API response to rendered UI', () => {
  it('the withheld API response renders the advisory notice with no internal rationale and never the dossier', async () => {
    const { payload } = await runDetailRoute(withheldRow());
    const originalFetch = globalThis.fetch;
    globalThis.fetch = (async (input: unknown) => {
      // Serve the REAL withheld API payload through the web client's own fetch path.
      if (String(input).includes('/intelligence/')) return Response.json(payload);
      return Response.json({ data: null });
    }) as typeof fetch;
    try {
      const result = await getVulnerabilityDetail('CVE-2022-24706');
      expect(result.state).toBe('success');
      const html = renderToStaticMarkup(
        React.createElement(VulnerabilityReportView as any, { report: result.data, id: 'CVE-2022-24706' }),
      );
      // The withheld presentation is a clean advisory, not an error dump.
      expect(html).toContain('Apache CouchDB');
      expect(html).toContain('DEEP ANALYST ASSESSMENT PENDING VERIFICATION');
      expect(html).toContain(PUBLIC_ANALYSIS_PENDING_NOTICE);
      // ... the internal gate rationale never reaches public HTML ...
      expect(html).not.toContain('REASON_semantic_gate_violations_5d19');
      expect(html).not.toContain('REASON_grounding_error_code_5d19');
      expect(html).not.toContain('Gemini');
      // ... and no dossier sentinel is rendered anywhere.
      expect(html).not.toContain('SENTINEL_');
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it('the published API response still renders the full report body', async () => {
    const { payload } = await runDetailRoute(publishedRow());
    const originalFetch = globalThis.fetch;
    globalThis.fetch = (async (input: unknown) => {
      if (String(input).includes('/intelligence/')) return Response.json(payload);
      return Response.json({ data: null });
    }) as typeof fetch;
    try {
      const result = await getVulnerabilityDetail('CVE-2026-104935');
      const html = renderToStaticMarkup(
        React.createElement(VulnerabilityReportView as any, { report: result.data, id: 'CVE-2026-104935' }),
      );
      expect(html).not.toContain('PUBLICATION WITHHELD');
      expect(html).toContain('PUBLISHED_assessment_4c7b');
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});
