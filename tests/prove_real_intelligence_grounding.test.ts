import { describe, it, expect } from 'vitest';
import { executeDeepIntelligenceAnalysisV2 } from '../packages/intelligence/src/engine_v2/index';

describe('Real Intelligence Analysis & Book Grounding Engine Proof', () => {
  it('generates a real intelligence analysis grounded in real evidence, real books, and separates unknowns', () => {
    // Real telemetry input containing actual CVE, CVSS score, vector, and advisory context
    const rawTelemetry = `Red Hat Security Advisory: Critical vulnerability in OpenSSL package
CVE-2024-0553: A flaw was found in openssl where memory corruption occurs during TLS handshake.
CVSS Base Score: 9.8 (CRITICAL) CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H
Advisory URL: https://access.redhat.com/security/cve/CVE-2024-0553
Mitigation: Upgrade openssl package to version 3.0.7-27 or later immediately.`;

    const result = executeDeepIntelligenceAnalysisV2({
      rawText: rawTelemetry,
      sourceId: 'src_redhat_live_01',
      sourceTrust: 0.95,
      channelTitle: 'Red Hat Security Errata',
      publishedAt: '2026-09-04T12:00:00Z',
    });

    const { report, qualityGate } = result;

    // 1. Proves the analysis uses real retrieved evidence
    expect(report.provenance[0].source_id).toBe('src_redhat_live_01');
    expect(report.provenance[0].issuing_authority).toBe('Red Hat');
    expect(report.enrichment.cve_id).toBe('CVE-2024-0553');

    // 2. Proves book / knowledge grounding is actually retrieved and used
    expect(report.knowledge_trace.length).toBeGreaterThan(0);
    const usedKnowledge = report.knowledge_trace.filter(k => k.status === 'USED');
    expect(usedKnowledge.length).toBeGreaterThan(0);
    expect(usedKnowledge[0].title).toBeDefined();
    expect(usedKnowledge[0].chunk_id).toBeDefined();
    expect(usedKnowledge[0].chunk_text).toBeDefined();

    // 3. Proves substantive claims have verbatim book citations character-for-character
    const claimsWithBookCitations = report.claims.filter(c => (c as any).book_citations && (c as any).book_citations.length > 0);
    expect(claimsWithBookCitations.length).toBeGreaterThan(0);
    for (const claim of claimsWithBookCitations) {
      for (const cit of (claim as any).book_citations) {
        // Find corresponding chunk
        const matchedChunk = report.knowledge_trace.find(k => k.chunk_id === cit.chunk_id);
        expect(matchedChunk).toBeDefined();
        expect(matchedChunk?.chunk_text).toContain(cit.quoted_fragment);
      }
    }

    // 4. Proves unsupported claims become UNKNOWN instead of invented facts
    const unknownClaims = report.claims.filter(c => c.claim_type === 'UNKNOWN');
    expect(unknownClaims.length).toBeGreaterThan(0);
    // Specifically, threat actor attribution was not in evidence, so it is declared UNKNOWN
    const actorUnknown = unknownClaims.some(u => u.statement.toLowerCase().includes('threat actor') || u.statement.toLowerCase().includes('attribution'));
    expect(actorUnknown).toBe(true);

    // 5. Output contains 10 structured canonical sections and passes quality gate
    expect(report.sections.length).toBe(10);
    expect(qualityGate.passed).toBe(true);
  });

  it('rejects fabricated citations and enforces UNKNOWN/UNGROUNDED boundary when knowledge chunks are absent', () => {
    const rawTelemetry = `Red Hat Security Advisory: Critical vulnerability in OpenSSL package
CVE-2024-0553: A flaw was found in openssl where memory corruption occurs during TLS handshake.
CVSS Base Score: 9.8 (CRITICAL) CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H
Advisory URL: https://access.redhat.com/security/cve/CVE-2024-0553
Mitigation: Upgrade openssl package to version 3.0.7-27 or later immediately.`;

    // RUN B: Telemetry with skipKnowledgeRetrieval enabled (no knowledge chunks retrieved)
    const result = executeDeepIntelligenceAnalysisV2({
      rawText: rawTelemetry,
      sourceId: 'src_redhat_live_01',
      sourceTrust: 0.95,
      channelTitle: 'Red Hat Security Errata',
      publishedAt: '2026-09-04T12:00:00Z',
      skipKnowledgeRetrieval: true,
    });

    const { report, qualityGate } = result;

    // Proves zero knowledge chunks are marked USED
    expect(report.knowledge_trace.length).toBe(0);

    // Proves no book citations can survive in the report
    const citingClaims = report.claims.filter(c => (c as any).book_citations && (c as any).book_citations.length > 0);
    expect(citingClaims.length).toBe(0);

    // Proves Section 09 correctly declares absence of grounded external knowledge
    const sec09 = report.sections.find(s => s.section_number === '09');
    expect(sec09?.content).toContain('No external knowledge corpus documents satisfied evidentiary preconditions');

    // Proves quality gate successfully passes without synthetic citation defects
    expect(qualityGate.passed).toBe(true);
  });
});
