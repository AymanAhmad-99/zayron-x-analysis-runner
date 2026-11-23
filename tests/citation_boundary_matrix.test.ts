import { describe, it, expect } from 'vitest';
import { executeDeepIntelligenceAnalysisV2 } from '../packages/intelligence/src/engine_v2/index';
import { evaluateDeepQualityGateV2 } from '../packages/intelligence/src/engine_v2/quality_gate';
import { compileCanonicalReportV2 } from '../packages/intelligence/src/engine_v2/compiler';
import { GroundedClaimV2 } from '../packages/intelligence/src/engine_v2/types';

describe('Z.X.Intelligence Citation Boundary Regression Matrix', () => {
  const rawTelemetry = `Red Hat Security Advisory: Critical vulnerability in OpenSSL package
CVE-2024-0553: A flaw was found in openssl where memory corruption occurs during TLS handshake.
CVSS Base Score: 9.8 (CRITICAL) CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H
Advisory URL: https://access.redhat.com/security/cve/CVE-2024-0553
Mitigation: Upgrade openssl package to version 3.0.7-27 or later immediately.`;

  // Base real execution to retrieve canonical baseline report objects
  const baseResult = executeDeepIntelligenceAnalysisV2({
    rawText: rawTelemetry,
    sourceId: 'src_redhat_live_01',
    sourceTrust: 0.95,
    channelTitle: 'Red Hat Security Errata',
    publishedAt: '2026-09-04T12:00:00Z',
  });

  const validKnowledgeTrace = baseResult.report.knowledge_trace.filter(k => k.status === 'USED');
  const validChunk = validKnowledgeTrace[0];

  it('verifies Case 1: CONFIRMED FACT with valid quote and chunk is accepted', () => {
    const claim: GroundedClaimV2 = {
      claim_id: 'clm_case1',
      claim_type: 'CONFIRMED_FACT',
      statement: 'Vulnerability tracked under identifier CVE-2024-0553 with CVSS 9.8.',
      evidence_ids: ['evi_test_01'],
      book_citations: [{
        document_id: validChunk.document_id,
        chunk_id: validChunk.chunk_id,
        quoted_fragment: validChunk.chunk_text!.slice(0, 30),
        authority_tier: 0,
      }],
      confidence: 1.0,
      rationale: 'Primary fact with valid knowledge citation',
    };

    const testReport = {
      ...baseResult.report,
      claims: [claim],
    };

    const gateResult = evaluateDeepQualityGateV2(testReport, rawTelemetry);
    expect(gateResult.stage_results.knowledge_validation.passed).toBe(true);
    expect(gateResult.passed).toBe(true);

    const compiled = compileCanonicalReportV2({
      ...baseResult.report,
      rawText: rawTelemetry,
      headline: baseResult.report.headline,
      executiveSummary: baseResult.report.executive_summary,
      affectedProduct: 'openssl',
      claims: [claim],
      reportId: 'rep_case1',
      evidenceId: 'evi_test_01',
      evidenceSnippet: rawTelemetry,
      sourceId: 'src_redhat_live_01',
      indicators: [],
      attackMappings: baseResult.report.attack_mappings,
      knowledgeTrace: baseResult.report.knowledge_trace,
    } as any);

    expect(compiled.sections[8].content).toContain(validChunk.chunk_id);
    expect(compiled.sections[8].content).toContain(validChunk.chunk_text!.slice(0, 30));
  });

  it('verifies Case 2: INFERENCE supported by supplied knowledge is accepted', () => {
    const claim: GroundedClaimV2 = {
      claim_id: 'clm_case2',
      claim_type: 'INFERENCE',
      statement: 'Vulnerability severity rated critical requiring immediate emergency triage.',
      evidence_ids: ['evi_test_01'],
      book_citations: [{
        document_id: validChunk.document_id,
        chunk_id: validChunk.chunk_id,
        quoted_fragment: validChunk.chunk_text!.slice(0, 25),
        authority_tier: 0,
      }],
      confidence: 0.90,
      rationale: 'Inference grounded in methodology',
    };

    const testReport = {
      ...baseResult.report,
      claims: [claim],
    };

    const gateResult = evaluateDeepQualityGateV2(testReport, rawTelemetry);
    expect(gateResult.stage_results.knowledge_validation.passed).toBe(true);
    expect(gateResult.passed).toBe(true);
  });

  it('verifies Case 3: UNKNOWN without citations is accepted as UNKNOWN', () => {
    const claim: GroundedClaimV2 = {
      claim_id: 'clm_case3',
      claim_type: 'UNKNOWN',
      statement: 'Specific threat actor attribution remains unestablished from available telemetry.',
      evidence_ids: ['evi_test_01'],
      book_citations: [],
      confidence: 0.95,
      rationale: 'Absence of actor telemetry preserves unresolved attribution.',
    };

    const testReport = {
      ...baseResult.report,
      claims: [claim],
    };

    const gateResult = evaluateDeepQualityGateV2(testReport, rawTelemetry);
    expect(gateResult.stage_results.claim_validation.passed).toBe(true);
    expect(gateResult.stage_results.knowledge_validation.passed).toBe(true);
    expect(gateResult.passed).toBe(true);

    const compiled = compileCanonicalReportV2({
      ...baseResult.report,
      rawText: rawTelemetry,
      headline: baseResult.report.headline,
      executiveSummary: baseResult.report.executive_summary,
      affectedProduct: 'openssl',
      claims: [claim],
      reportId: 'rep_case3',
      evidenceId: 'evi_test_01',
      evidenceSnippet: rawTelemetry,
      sourceId: 'src_redhat_live_01',
      indicators: [],
      attackMappings: baseResult.report.attack_mappings,
      knowledgeTrace: baseResult.report.knowledge_trace,
    } as any);

    expect(compiled.sections[7].content).toContain('threat actor attribution remains unestablished');
  });

  it('verifies Case 4: FABRICATED CHUNK is rejected by quality gate and omitted by compiler', () => {
    const claim: GroundedClaimV2 = {
      claim_id: 'clm_case4',
      claim_type: 'INFERENCE',
      statement: 'Attacker activity represents an espionage campaign.',
      evidence_ids: ['evi_test_01'],
      book_citations: [{
        document_id: 'doc_ref_fake',
        chunk_id: 'chk_fabricated_chunk_id_999',
        quoted_fragment: 'Some fabricated quote that looks plausible',
        authority_tier: 1,
      }],
      confidence: 0.85,
      rationale: 'Hallucinated citation',
    };

    const testReport = {
      ...baseResult.report,
      claims: [claim],
    };

    const gateResult = evaluateDeepQualityGateV2(testReport, rawTelemetry);
    expect(gateResult.stage_results.knowledge_validation.passed).toBe(false);
    expect(gateResult.violations.some(v => v.includes('FABRICATED CITATION DEFECT'))).toBe(true);

    const compiled = compileCanonicalReportV2({
      ...baseResult.report,
      rawText: rawTelemetry,
      headline: baseResult.report.headline,
      executiveSummary: baseResult.report.executive_summary,
      affectedProduct: 'openssl',
      claims: [claim],
      reportId: 'rep_case4',
      evidenceId: 'evi_test_01',
      evidenceSnippet: rawTelemetry,
      sourceId: 'src_redhat_live_01',
      indicators: [],
      attackMappings: baseResult.report.attack_mappings,
      knowledgeTrace: baseResult.report.knowledge_trace,
    } as any);

    // Compiler must not render unsupplied/fabricated chunk ID
    expect(compiled.sections[2].content).not.toContain('chk_fabricated_chunk_id_999');
  });

  it('verifies Case 5: FABRICATED QUOTE from real chunk is rejected', () => {
    const claim: GroundedClaimV2 = {
      claim_id: 'clm_case5',
      claim_type: 'INFERENCE',
      statement: 'Vulnerability is exploited by state actors.',
      evidence_ids: ['evi_test_01'],
      book_citations: [{
        document_id: validChunk.document_id,
        chunk_id: validChunk.chunk_id,
        quoted_fragment: 'This exact sentence does not exist in the book chunk text at all.',
        authority_tier: 0,
      }],
      confidence: 0.85,
      rationale: 'Fake quote in real chunk',
    };

    const testReport = {
      ...baseResult.report,
      claims: [claim],
    };

    const gateResult = evaluateDeepQualityGateV2(testReport, rawTelemetry);
    expect(gateResult.stage_results.knowledge_validation.passed).toBe(false);
    expect(gateResult.violations.some(v => v.includes('CITATION VERIFICATION FAILED'))).toBe(true);
  });

  it('verifies Case 6: MULTIPLE VALID CITATIONS are accepted and preserved', () => {
    if (validKnowledgeTrace.length >= 2) {
      const chunk1 = validKnowledgeTrace[0];
      const chunk2 = validKnowledgeTrace[1];

      const claim: GroundedClaimV2 = {
        claim_id: 'clm_case6',
        claim_type: 'INFERENCE',
        statement: 'Multi-criteria evaluation confirms high severity and requires structured tracking.',
        evidence_ids: ['evi_test_01'],
        book_citations: [
          {
            document_id: chunk1.document_id,
            chunk_id: chunk1.chunk_id,
            quoted_fragment: chunk1.chunk_text!.slice(0, 20),
            authority_tier: 0,
          },
          {
            document_id: chunk2.document_id,
            chunk_id: chunk2.chunk_id,
            quoted_fragment: chunk2.chunk_text!.slice(0, 20),
            authority_tier: 0,
          }
        ],
        confidence: 0.90,
        rationale: 'Dual chunk grounding',
      };

      const testReport = {
        ...baseResult.report,
        claims: [claim],
      };

      const gateResult = evaluateDeepQualityGateV2(testReport, rawTelemetry);
      expect(gateResult.stage_results.knowledge_validation.passed).toBe(true);
      expect(gateResult.passed).toBe(true);
    }
  });

  it('verifies Case 7: REAL SOURCE PROVENANCE is preserved and distinct from knowledge citation', () => {
    const testReport = baseResult.report;

    expect(testReport.provenance.length).toBeGreaterThan(0);
    const prov = testReport.provenance[0];
    expect(prov.source_id).toBe('src_redhat_live_01');
    expect(prov.issuing_authority).toBe('Red Hat');
    expect(prov.reference_url).toBe('https://access.redhat.com/security/cve/CVE-2024-0553');

    // Section 10 (REFERENCES & PROVENANCE) must render the primary source reference
    const sec10 = testReport.sections.find(s => s.section_number === '10');
    expect(sec10).toBeDefined();
    expect(sec10?.content).toContain('https://access.redhat.com/security/cve/CVE-2024-0553');
    expect(sec10?.content).toContain('Red Hat');

    // Provenance validation in quality gate passes without confusion with book chunks
    const gateResult = evaluateDeepQualityGateV2(testReport, rawTelemetry);
    expect(gateResult.stage_results.provenance_validation.passed).toBe(true);
  });
});
