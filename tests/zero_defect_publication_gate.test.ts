import { describe, it, expect } from 'bun:test';
import { executeDeepIntelligenceAnalysisV2 } from '../packages/intelligence/src/engine_v2/index';
import { 
  evaluateDeepQualityGateV2, 
  auditZeroDefectPublicationStandard 
} from '../packages/intelligence/src/engine_v2/quality_gate';

describe('Zero-Defect Operational Standard Test Suite (Mandate Part 4)', () => {
  const cleanVulnSignal = `Red Hat Security Advisory: Critical vulnerability in OpenSSL package
CVE-2024-0553: A flaw was found in openssl where memory corruption occurs during TLS handshake.
CVSS Base Score: 9.8 (CRITICAL) CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H
Advisory URL: https://access.redhat.com/security/cve/CVE-2024-0553
Mitigation: Upgrade openssl package to version 3.0.7-27 or later immediately.`;

  it('1. Approves compliant report and logs affirmative Zero-Defect metric', () => {
    const analysis = executeDeepIntelligenceAnalysisV2({
      sourceId: 'src_openssl',
      channelTitle: 'Red Hat Advisory Feed',
      messageId: 'msg_01',
      rawText: cleanVulnSignal,
    });

    const metric = auditZeroDefectPublicationStandard(analysis.report, cleanVulnSignal);

    expect(metric.passed).toBe(true);
    expect(metric.checks.zero_citation_violations).toBe(true);
    expect(metric.checks.zero_unsupported_claims).toBe(true);
    expect(metric.checks.zero_irrelevant_citations).toBe(true);
    expect(metric.checks.zero_generic_duplicates).toBe(true);
    expect(metric.rejection_reasons.length).toBe(0);
  });

  it('2. Rejects report citing an irrelevant chunk (Relevance Sanity Gate)', () => {
    const analysis = executeDeepIntelligenceAnalysisV2({
      sourceId: 'src_openssl',
      channelTitle: 'Red Hat Advisory Feed',
      messageId: 'msg_01',
      rawText: cleanVulnSignal,
    });

    // Injected irrelevant KEV chunk marked USED
    analysis.report.knowledge_trace.push({
      document_id: 'doc-cisa-kev',
      chunk_id: 'doc-cisa-kev-record-640',
      title: 'CISA KEV Record: CVE-2023-33063 (Qualcomm)',
      status: 'USED',
      reason_retrieved: 'Semantic proximity',
      section_influenced: ['03 — TECHNICAL ANALYSIS'],
      claim_influenced: ['Vulnerability mechanics'],
    });

    const metric = auditZeroDefectPublicationStandard(analysis.report, cleanVulnSignal);

    expect(metric.passed).toBe(false);
    expect(metric.checks.zero_irrelevant_citations).toBe(false);
    expect(metric.rejection_reasons.some(r => r.includes('ZERO-DEFECT VIOLATION (IRRELEVANT CITATION)'))).toBe(true);
  });

  it('3. Rejects report containing banned generic boilerplate (Anti-Genericness Gate)', () => {
    const analysis = executeDeepIntelligenceAnalysisV2({
      sourceId: 'src_openssl',
      channelTitle: 'Red Hat Advisory Feed',
      messageId: 'msg_01',
      rawText: cleanVulnSignal,
    });

    // Inject generic advice into Section 01
    const sec01 = analysis.report.sections.find(s => s.section_number === '01');
    if (sec01) {
      sec01.content += '\nDefenders should remain vigilant and ensure all systems are updated.';
    }

    const metric = auditZeroDefectPublicationStandard(analysis.report, cleanVulnSignal);

    expect(metric.passed).toBe(false);
    expect(metric.checks.zero_generic_duplicates).toBe(false);
    expect(metric.rejection_reasons.some(r => r.includes('ZERO-DEFECT VIOLATION (GENERIC BOILERPLATE)'))).toBe(true);
  });

  it('4. Rejects report with active exploitation claim unsupported by empirical telemetry', () => {
    const analysis = executeDeepIntelligenceAnalysisV2({
      sourceId: 'src_openssl',
      channelTitle: 'Red Hat Advisory Feed',
      messageId: 'msg_01',
      rawText: cleanVulnSignal,
    });

    // Assert exploitation in the wild without KEV or telemetry
    analysis.report.enrichment.exploit_status = 'EXPLOITATION_IN_THE_WILD';

    const metric = auditZeroDefectPublicationStandard(analysis.report, cleanVulnSignal);

    expect(metric.passed).toBe(false);
    expect(metric.checks.zero_unsupported_claims).toBe(false);
    expect(metric.rejection_reasons.some(r => r.includes('Active in-the-wild exploitation asserted without empirical incident telemetry'))).toBe(true);
  });

  it('5. Publication Path Integration: publishCanonicalReportV2 publishes compliant report and generates distribution packages', async () => {
    const { publishCanonicalReportV2 } = await import('../packages/intelligence/src/publishing/publisher');
    const analysis = executeDeepIntelligenceAnalysisV2({
      sourceId: 'src_openssl',
      channelTitle: 'Red Hat Advisory Feed',
      messageId: 'msg_01',
      rawText: cleanVulnSignal,
    });

    const result = await publishCanonicalReportV2(analysis.report, {
      rawTelemetryText: cleanVulnSignal,
    });

    expect(result.status).toBe('PUBLISHED');
    expect(result.article).toBeDefined();
    expect(result.article?.title).toContain('CVE-2024-0553');
    expect(result.derivatives?.telegram).toBeDefined();
    expect(result.zeroDefectMetric.passed).toBe(true);
  });

  it('6. Publication Path Integration: publishCanonicalReportV2 blocks non-compliant report with REJECTED status and halts distribution', async () => {
    const { publishCanonicalReportV2 } = await import('../packages/intelligence/src/publishing/publisher');
    const analysis = executeDeepIntelligenceAnalysisV2({
      sourceId: 'src_openssl',
      channelTitle: 'Red Hat Advisory Feed',
      messageId: 'msg_01',
      rawText: cleanVulnSignal,
    });

    // Contaminate with banned generic boilerplate
    const sec01 = analysis.report.sections.find(s => s.section_number === '01');
    if (sec01) {
      sec01.content += '\nPractice good cyber hygiene and audit your network perimeter.';
    }

    const result = await publishCanonicalReportV2(analysis.report, {
      rawTelemetryText: cleanVulnSignal,
    });

    expect(result.status).toBe('REJECTED');
    expect(result.article).toBeNull();
    expect(result.derivatives).toBeNull();
    expect(result.zeroDefectMetric.passed).toBe(false);
    expect(result.zeroDefectMetric.checks.zero_generic_duplicates).toBe(false);
  });
});
