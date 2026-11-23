import { describe, test, expect } from 'bun:test';
import {
  parseAdvisoryMetadata,
  evaluatePublicationGate,
  extractCanonicalEntities,
  evaluateSignalQuality,
  TelegramCollectorDO,
  CanonicalIntelligenceObject,
} from '../workers/telegram-collector-do/src/collector-do';

describe('ZAYRON-X Phase 10 — Production Truthfulness Regression Suite', () => {

  // Test 1: CVSS 5.9 cannot become CRITICAL because raw text contains "remote" or "exploit"
  test('1. CVSS 5.9 cannot become CRITICAL because raw text contains "remote" or "exploit"', () => {
    const text = 'Vulnerability advisory for CVE-2026-9999. A flaw in apache httpd allows remote exploit. CVSS Base Score: 5.9 (MEDIUM). Remotely Exploitable: True';
    const meta = parseAdvisoryMetadata(text);
    expect(meta.cvssScore).toBe(5.9);
    expect(meta.cvssSeverity).toBe('MEDIUM');
    expect(meta.remotelyExploitable).toBe(true);

    // Mock an object to verify ensureStructuredFields behavior
    const mockDO = Object.create(TelegramCollectorDO.prototype);
    (mockDO as any).intelligenceReports = new Map();
    const rawReport: CanonicalIntelligenceObject = {
      intelligence_id: 'intel_test_01',
      schema_version: '1.0.0',
      source_id: 'tg_cveNotify',
      telegram_source_id: null,
      source_handle: 'cveNotify',
      source_title: 'CVE Notify',
      source_category: 'VULNERABILITIES',
      source_language: 'en',
      source_region: 'GLOBAL',
      message_id: '123',
      message_timestamp: new Date().toISOString(),
      ingested_at: new Date().toISOString(),
      processed_at: new Date().toISOString(),
      title: 'CVE-2026-9999 Vulnerability',
      summary: text,
      body: text,
      intelligence_type: 'vulnerabilities',
      categories: ['VULNERABILITIES'],
      subcategories: [],
      severity: 'CRITICAL', // Inflated by old keyword parser
      priority: 'P1',
      confidence: { source_reliability: 0.9, content_confidence: 0.9, entity_confidence: 0.9, overall_confidence: 0.9, rating: 'VERY_HIGH' },
      entities: { actors: [], malware: [], cves: [{ cve_id: 'CVE-2026-9999', status: 'OBSERVED' }], campaigns: [], tools: [], techniques: [], victims: [], organizations: [], regions: ['GLOBAL'] },
      indicators: [],
      evidence: [],
      citations: [],
      source_references: [],
      ai_model: 'test',
      ai_model_version: '1',
      ai_prompt_version: '1',
      deduplication_key: 'test',
      content_hash: 'abcdef1234567890',
      status: 'PUBLISHED',
      publication_status: 'PUBLISHED',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const sanitized = (mockDO as any).ensureStructuredFields(rawReport);
    expect(sanitized.severity).toBe('MEDIUM');
  });

  // Test 2: Telegram cannot become issuing authority when the message forwards a vendor advisory
  test('2. Telegram cannot become issuing authority when the message forwards a vendor advisory', () => {
    const text = 'Source: Red Hat Security Advisory. A flaw was found in kernel-rt. CVE-2026-1234. CVSS Base Score: 7.8 (HIGH).';
    const meta = parseAdvisoryMetadata(text);
    expect(meta.vendor).toBe('Red Hat');

    const mockDO = Object.create(TelegramCollectorDO.prototype);
    const rawReport: CanonicalIntelligenceObject = {
      intelligence_id: 'intel_test_02',
      schema_version: '1.0.0',
      source_id: 'tg_cveNotify',
      telegram_source_id: null,
      source_handle: 'cveNotify',
      source_title: 'cveNotify Channel',
      source_category: 'VULNERABILITIES',
      source_language: 'en',
      source_region: 'GLOBAL',
      message_id: '124',
      message_timestamp: new Date().toISOString(),
      ingested_at: new Date().toISOString(),
      processed_at: new Date().toISOString(),
      title: 'CVE-2026-1234 Flaw',
      summary: text,
      body: text,
      intelligence_type: 'vulnerabilities',
      categories: ['VULNERABILITIES'],
      subcategories: [],
      severity: 'HIGH',
      priority: 'P2',
      confidence: { source_reliability: 0.9, content_confidence: 0.9, entity_confidence: 0.9, overall_confidence: 0.9, rating: 'VERY_HIGH' },
      entities: { actors: [], malware: [], cves: [{ cve_id: 'CVE-2026-1234', status: 'OBSERVED' }], campaigns: [], tools: [], techniques: [], victims: [], organizations: [], regions: ['GLOBAL'] },
      indicators: [],
      evidence: [],
      citations: [],
      source_references: [],
      ai_model: 'test',
      ai_model_version: '1',
      ai_prompt_version: '1',
      deduplication_key: 'test2',
      content_hash: 'abcdef1234567891',
      status: 'PUBLISHED',
      publication_status: 'PUBLISHED',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const sanitized = (mockDO as any).ensureStructuredFields(rawReport);
    expect(sanitized.structured_report.claims[0].source_provenance.original_source).toBe('Red Hat');
    expect(sanitized.structured_report.claims[0].source_provenance.collection_source).toBe('@cveNotify');
  });

  // Test 3: T1190 cannot appear without behavioral web/server evidence
  test('3. T1190 cannot appear without behavioral web/server evidence', () => {
    const text = 'Local kernel privilege escalation in Linux kernel af_packet socket handler. CVE-2026-7777.';
    const mockDO = Object.create(TelegramCollectorDO.prototype);
    const rawReport: CanonicalIntelligenceObject = {
      intelligence_id: 'intel_test_03',
      schema_version: '1.0.0',
      source_id: 'tg_cveNotify',
      telegram_source_id: null,
      source_handle: 'cveNotify',
      source_title: 'cveNotify',
      source_category: 'VULNERABILITIES',
      source_language: 'en',
      source_region: 'GLOBAL',
      message_id: '125',
      message_timestamp: new Date().toISOString(),
      ingested_at: new Date().toISOString(),
      processed_at: new Date().toISOString(),
      title: 'CVE-2026-7777 Kernel Bug',
      summary: text,
      body: text,
      intelligence_type: 'vulnerabilities',
      categories: ['VULNERABILITIES'],
      subcategories: [],
      severity: 'HIGH',
      priority: 'P2',
      confidence: { source_reliability: 0.9, content_confidence: 0.9, entity_confidence: 0.9, overall_confidence: 0.9, rating: 'VERY_HIGH' },
      entities: { actors: [], malware: [], cves: [{ cve_id: 'CVE-2026-7777', status: 'OBSERVED' }], campaigns: [], tools: [], techniques: [{ id: 'T1190', name: 'Exploit Public-Facing Application', tactic: 'Initial Access' }], victims: [], organizations: [], regions: ['GLOBAL'] },
      indicators: [],
      evidence: [],
      citations: [],
      source_references: [],
      ai_model: 'test',
      ai_model_version: '1',
      ai_prompt_version: '1',
      deduplication_key: 'test3',
      content_hash: 'abcdef1234567892',
      status: 'PUBLISHED',
      publication_status: 'PUBLISHED',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const sanitized = (mockDO as any).ensureStructuredFields(rawReport);
    const attkSection = sanitized.structured_report.sections.find((s: any) => s.title === 'ATT&CK MAPPING');
    expect(attkSection.content).not.toContain('T1190');
    expect(attkSection.content).toContain('No validated ATT&CK mapping established');
  });

  // Test 4: Knowledge trace remains empty when retrieval did not execute
  test('4. Knowledge trace remains empty when retrieval did not execute', () => {
    const mockDO = Object.create(TelegramCollectorDO.prototype);
    const rawReport: CanonicalIntelligenceObject = {
      intelligence_id: 'intel_test_04',
      schema_version: '1.0.0',
      source_id: 'tg_cveNotify',
      telegram_source_id: null,
      source_handle: 'cveNotify',
      source_title: 'cveNotify',
      source_category: 'VULNERABILITIES',
      source_language: 'en',
      source_region: 'GLOBAL',
      message_id: '126',
      message_timestamp: new Date().toISOString(),
      ingested_at: new Date().toISOString(),
      processed_at: new Date().toISOString(),
      title: 'Advisory Alert',
      summary: 'CVE-2026-0001 advisory report',
      body: 'CVE-2026-0001 advisory report text',
      intelligence_type: 'vulnerabilities',
      categories: ['VULNERABILITIES'],
      subcategories: [],
      severity: 'MEDIUM',
      priority: 'P3',
      confidence: { source_reliability: 0.9, content_confidence: 0.9, entity_confidence: 0.9, overall_confidence: 0.9, rating: 'VERY_HIGH' },
      entities: { actors: [], malware: [], cves: [{ cve_id: 'CVE-2026-0001', status: 'OBSERVED' }], campaigns: [], tools: [], techniques: [], victims: [], organizations: [], regions: ['GLOBAL'] },
      indicators: [],
      evidence: [],
      citations: [],
      source_references: [],
      ai_model: 'test',
      ai_model_version: '1',
      ai_prompt_version: '1',
      deduplication_key: 'test4',
      content_hash: 'abcdef1234567893',
      status: 'PUBLISHED',
      publication_status: 'PUBLISHED',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const sanitized = (mockDO as any).ensureStructuredFields(rawReport);
    expect(sanitized.knowledge_trace).toEqual([]);
    const ktSection = sanitized.structured_report.sections.find((s: any) => s.title === 'KNOWLEDGE APPLIED');
    expect(ktSection.content).toBe('No knowledge corpus documents utilized for this raw advisory signal.');
  });

  // Test 5: Static boilerplate is rejected by Quality Gate
  test('5. Static boilerplate is rejected by Quality Gate', () => {
    const badReport: any = {
      schema_version: '1.0.0',
      source_id: 'tg_test',
      title: 'Valid Security Advisory Title',
      summary: 'This is a sufficiently long valid summary for the quality gate evaluation.',
      confidence: { overall_confidence: 0.8 },
      evidence: [{ evidence_id: 'evi_1' }],
      source_references: [{ source_id: 'tg_test' }],
      structured_report: {
        sections: [
          { title: 'VULNERABILITY ANALYSIS', content: 'Technical risk analysis indicates immediate exploitation feasibility.' }
        ]
      }
    };

    const gate = evaluatePublicationGate(badReport);
    expect(gate.passed).toBe(false);
    expect(gate.violations.some(v => v.includes('BANNED BOILERPLATE DETECTED'))).toBe(true);
  });

  // Test 6: Job recruitment spam is filtered out of intelligence pipeline
  test('6. Job recruitment spam is filtered out of intelligence pipeline', () => {
    const russianJobText = 'Вакансия: Аналитик уязвимостей в Альфа-Банк. Опыт: 3 года. Зарплата обсуждается на собеседовании. CV отправлять @hr';
    const quality = evaluateSignalQuality({
      text: russianJobText,
      hasEntities: false,
      cveCount: 0,
      indicatorCount: 0,
      sourceTrust: 0.8,
    });
    expect(quality.isPublishable).toBe(false);
    expect(quality.grade).toBe('NOISE');
  });

  // Test 7: Adversary with behavioral public-facing evidence CAN retain T1190
  test('7. Adversary with behavioral public-facing evidence CAN retain T1190', () => {
    const text = 'Attackers actively exploiting public-facing web server running vulnerable nginx version via HTTP daemon overflow.';
    const mockDO = Object.create(TelegramCollectorDO.prototype);
    const rawReport: CanonicalIntelligenceObject = {
      intelligence_id: 'intel_test_07',
      schema_version: '1.0.0',
      source_id: 'tg_cveNotify',
      telegram_source_id: null,
      source_handle: 'cveNotify',
      source_title: 'cveNotify',
      source_category: 'THREAT_INTELLIGENCE',
      source_language: 'en',
      source_region: 'GLOBAL',
      message_id: '127',
      message_timestamp: new Date().toISOString(),
      ingested_at: new Date().toISOString(),
      processed_at: new Date().toISOString(),
      title: 'Active Ingress Web Server Exploitation',
      summary: text,
      body: text,
      intelligence_type: 'threat_intelligence',
      categories: ['THREAT_INTELLIGENCE'],
      subcategories: [],
      severity: 'HIGH',
      priority: 'P2',
      confidence: { source_reliability: 0.9, content_confidence: 0.9, entity_confidence: 0.9, overall_confidence: 0.9, rating: 'VERY_HIGH' },
      entities: { actors: [], malware: [], cves: [], campaigns: [], tools: [], techniques: [{ id: 'T1190', name: 'Exploit Public-Facing Application', tactic: 'Initial Access' }], victims: [], organizations: [], regions: ['GLOBAL'] },
      indicators: [],
      evidence: [],
      citations: [],
      source_references: [],
      ai_model: 'test',
      ai_model_version: '1',
      ai_prompt_version: '1',
      deduplication_key: 'test7',
      content_hash: 'abcdef1234567894',
      status: 'PUBLISHED',
      publication_status: 'PUBLISHED',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const sanitized = (mockDO as any).ensureStructuredFields(rawReport);
    const attkSection = sanitized.structured_report.sections.find((s: any) => s.title === 'ATT&CK MAPPING');
    expect(attkSection.content).toContain('T1190: Exploit Public-Facing Application');
  });

  // Test 8: Remediated report passes Quality Gate with zero violations
  test('8. Remediated report passes Quality Gate with zero violations', () => {
    const text = 'Source: Microsoft Security Advisory. CVE-2026-4444. CVSS Base Score: 8.1 (HIGH). Vector: CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:N. Remotely Exploitable: True. A flaw in Windows SMB allows remote code execution.';
    const mockDO = Object.create(TelegramCollectorDO.prototype);
    const rawReport: CanonicalIntelligenceObject = {
      intelligence_id: 'intel_test_08',
      schema_version: '1.0.0',
      source_id: 'tg_cveNotify',
      telegram_source_id: null,
      source_handle: 'cveNotify',
      source_title: 'CVE Notify Broadcast',
      source_category: 'VULNERABILITIES',
      source_language: 'en',
      source_region: 'GLOBAL',
      message_id: '128',
      message_timestamp: new Date().toISOString(),
      ingested_at: new Date().toISOString(),
      processed_at: new Date().toISOString(),
      title: 'CVE-2026-4444 Remote Code Execution in SMB',
      summary: text,
      body: text,
      intelligence_type: 'vulnerabilities',
      categories: ['VULNERABILITIES'],
      subcategories: [],
      severity: 'CRITICAL', // Inflated by old keyword parser
      priority: 'P1',
      confidence: { source_reliability: 0.9, content_confidence: 0.9, entity_confidence: 0.9, overall_confidence: 0.9, rating: 'VERY_HIGH' },
      entities: { actors: [], malware: [], cves: [{ cve_id: 'CVE-2026-4444', status: 'OBSERVED' }], campaigns: [], tools: [], techniques: [], victims: [], organizations: [], regions: ['GLOBAL'] },
      indicators: [],
      evidence: [{
        evidence_id: 'evi_08',
        intelligence_id: 'intel_test_08',
        claim: 'CVE-2026-4444 Remote Code Execution in SMB',
        evidence_type: 'CVE_DISCLOSURE',
        source_message_id: '128',
        source_id: 'tg_cveNotify',
        quoted_excerpt: text.slice(0, 100),
        source_timestamp: new Date().toISOString(),
        source_url: 'https://t.me/cveNotify/128',
        confidence: 0.9,
        created_at: new Date().toISOString(),
      }],
      citations: ['https://msrc.microsoft.com'],
      source_references: [{
        source_id: 'tg_cveNotify',
        handle: 'cveNotify',
        title: 'cveNotify',
        url: 'https://t.me/cveNotify',
        message_id: '128',
        published_at: new Date().toISOString(),
        authority_tier: 1,
      }],
      ai_model: 'test',
      ai_model_version: '1',
      ai_prompt_version: '1',
      deduplication_key: 'test8',
      content_hash: 'abcdef1234567895',
      status: 'PUBLISHED',
      publication_status: 'PUBLISHED',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const sanitized = (mockDO as any).ensureStructuredFields(rawReport);
    expect(sanitized.severity).toBe('HIGH'); // Restored from CVSS 8.1
    expect(sanitized.knowledge_trace).toEqual([]); // Zero fake knowledge trace

    const gate = evaluatePublicationGate(sanitized);
    expect(gate.passed).toBe(true);
    expect(gate.violations).toHaveLength(0);
  });
});
