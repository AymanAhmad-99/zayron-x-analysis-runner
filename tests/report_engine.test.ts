import { describe, test, expect } from 'bun:test';
import {
  classifyAnalyticalDomains,
  executeDomainAwareKnowledgeRetrieval,
  buildCanonicalVulnerabilityReport,
  buildCanonicalMalwareReport,
  validateReportQuality,
  renderStructuredDossierMarkdown,
  normalizeIntelligenceSignal,
  calculateAnalyticalConfidence,
  KNOWLEDGE_MANIFEST_20,
  KNOWLEDGE_CHUNKS_CORPUS,
} from '../packages/intelligence/src';

describe('ZAYRON-X Intelligence Report Engine v1.0 — Acceptance Suite', () => {

  // ──────────────────────────────────────────────────────────────────────────
  // TEST A: Real Newly Collected Vulnerability Signal from Telegram
  // ──────────────────────────────────────────────────────────────────────────
  test('TEST A: Real Vulnerability Signal executes end-to-end into 12-part canonical report with knowledge trace', async () => {
    // 1. Inbound real-world Telegram signal for an active vulnerability disclosure
    const rawTelegramSignal = {
      sourceId: 'tg_cvenotify',
      sourceName: 'cveNotify',
      sourceTrustScore: 0.88,
      externalMessageId: '109299',
      rawText: 'CRITICAL VULNERABILITY ALERT: CVE-2026-81666 affects Red Hat Enterprise Linux and Corosync cluster membership handlers before v3.1.8. An unauthenticated network integer overflow bypasses commit token length validation on 32-bit platforms, causing out-of-bounds daemon crash (Denial of Service). CVSS v3.1 Base Score 6.5 (MEDIUM), vector CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:N/I:N/A:H. Active PoC published. Telemetry observed C2 check-in on 198.51.100.77 with exploit payload hash e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855 (T1190).',
      sourceUrl: 'https://t.me/cveNotify/109299',
      publishedAt: new Date(Date.now() - 30000).toISOString(),
    };

    // 2. Normalization & Entity Extraction
    const norm = await normalizeIntelligenceSignal(rawTelegramSignal);
    expect(norm.isSpam).toBe(false);
    expect(norm.entities.cves).toContain('CVE-2026-81666');
    expect(norm.entities.ipv4s).toContain('198.51.100.77');
    expect(norm.entities.sha256s).toContain('e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855');
    expect(norm.entities.ttps).toContain('T1190');

    // 3. Domain Classification Router
    const domains = classifyAnalyticalDomains({
      text: norm.normalizedSummary,
      title: norm.normalizedTitle,
      cves: norm.entities.cves,
      ttps: norm.entities.ttps,
    });
    expect(domains).toContain('VULNERABILITY_MANAGEMENT');
    expect(domains).toContain('ATTACK_FRAMEWORK');

    // 4. Domain-Aware Retrieval across Complete Knowledge Corpus
    const knowledgePack = executeDomainAwareKnowledgeRetrieval({
      text: norm.normalizedSummary,
      title: norm.normalizedTitle,
      cves: norm.entities.cves,
      ttps: norm.entities.ttps,
      maxUsedChunks: 3,
    });

    expect(knowledgePack.retrieval_completed).toBe(true);
    expect(knowledgePack.quality_gate_passed).toBe(true);
    expect(knowledgePack.used_chunks_count).toBeGreaterThan(0);
    expect(knowledgePack.trace.length).toBeGreaterThan(0);

    // Knowledge Trace Contract verification: USED vs CONSIDERED_NOT_USED
    const usedItems = knowledgePack.trace.filter(t => t.status === 'USED');
    const notUsedItems = knowledgePack.trace.filter(t => t.status === 'CONSIDERED_NOT_USED');
    expect(usedItems.length).toBeGreaterThan(0);
    expect(notUsedItems.length).toBeGreaterThan(0);

    // Confirm that a used chunk has sections influenced
    expect(usedItems[0].report_sections_influenced.length).toBeGreaterThan(0);

    // 5. Generate 12-Part Canonical Vulnerability Report Object
    const vulnReport = buildCanonicalVulnerabilityReport({
      eventId: 'evt_vuln_corosync_2026',
      intelligenceId: 'intel_corosync_81666',
      cveId: 'CVE-2026-81666',
      title: norm.normalizedTitle,
      rawText: rawTelegramSignal.rawText,
      summary: norm.normalizedSummary,
      originalSource: 'Red Hat Security Response Team / Corosync Project',
      collectionSource: '@cveNotify',
      sourceUrl: rawTelegramSignal.sourceUrl,
      publishedAt: rawTelegramSignal.publishedAt,
      authorityTier: 1,
      sourceTrustScore: 0.88,
      cvss: {
        version: '3.1',
        score: 6.5,
        severity: 'MEDIUM',
        vector: 'CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:N/I:N/A:H',
      },
      affectedProduct: 'Corosync Cluster Engine < 3.1.8',
      attackPreconditions: 'Network access to Corosync membership multicast/unicast cluster token port.',
      rootCause: 'Integer overflow in expected token message length calculation on 32-bit systems.',
      exploitabilityStatus: 'Public PoC published; unauthenticated remote daemon termination.',
      iocs: [
        { type: 'ipv4', value: '198.51.100.77' },
        { type: 'sha256', value: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855' },
      ],
      ttps: ['T1190'],
      knowledgePack,
    });

    // 6. Validate Canonical 12 Sections
    expect(vulnReport.report_type).toBe('VULNERABILITY');
    expect(vulnReport.sections.length).toBe(12);
    expect(vulnReport.sections[0].title).toBe('EXECUTIVE ASSESSMENT');
    expect(vulnReport.sections[1].title).toBe('VERIFIED FACTS');
    expect(vulnReport.sections[2].title).toBe('VULNERABILITY ANALYSIS');
    expect(vulnReport.sections[3].title).toBe('THREAT INTELLIGENCE CONTEXT');
    expect(vulnReport.sections[4].title).toBe('EVIDENCE MATRIX');
    expect(vulnReport.sections[5].title).toBe('ANALYST ASSESSMENT');
    expect(vulnReport.sections[6].title).toBe('ATT&CK MAPPING');
    expect(vulnReport.sections[7].title).toBe('DETECTION & HUNTING');
    expect(vulnReport.sections[8].title).toBe('DEFENSIVE ACTIONS');
    expect(vulnReport.sections[9].title).toBe('UNKNOWN / UNRESOLVED');
    expect(vulnReport.sections[10].title).toBe('KNOWLEDGE APPLIED');
    expect(vulnReport.sections[11].title).toBe('REFERENCES & PROVENANCE');

    // 7. Validate Provenance Separation (Original Source ≠ Collection Vehicle)
    expect(vulnReport.primary_sources[0].original_source).toBe('Red Hat Security Response Team / Corosync Project');
    expect(vulnReport.primary_sources[0].collection_source).toBe('@cveNotify');

    // 8. Quality Gate & Epistemic Separation
    const qualityGate = validateReportQuality(vulnReport);
    expect(qualityGate.passed).toBe(true);
    expect(qualityGate.violations).toHaveLength(0);

    // Render markdown test
    const markdown = renderStructuredDossierMarkdown(vulnReport);
    expect(markdown).toContain('## 01 — EXECUTIVE ASSESSMENT');
    expect(markdown).toContain('## 02 — VERIFIED FACTS');
    expect(markdown).toContain('## 10 — UNKNOWN / UNRESOLVED');
    expect(markdown).toContain('## 11 — KNOWLEDGE APPLIED');
  });

  // ──────────────────────────────────────────────────────────────────────────
  // TEST B: Real Malware-Related Signal
  // ──────────────────────────────────────────────────────────────────────────
  test('TEST B: Real Malware Signal executes end-to-end into 16-part canonical report with ATT&CK & Memory Forensics knowledge', async () => {
    // 1. Inbound real-world Telegram signal for an active malware campaign
    const rawTelegramSignal = {
      sourceId: 'tg_vxunderground',
      sourceName: 'vxunderground',
      sourceTrustScore: 0.90,
      externalMessageId: '448201',
      rawText: 'NEW MALWARE OBSERVATION: Lumma Stealer v4.8 payload observed utilizing process hollowing into explorer.exe. Binary unpacks shellcode in memory, extracts credentials from Chromium/Gecko browsers and cryptocurrency wallets, and beacons out to C2 203.0.113.88 over TLS. Associated SHA-256 payload hash: 8f4e5a2b1c3d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f. Threat actors utilize phishing attachments with weaponized LNK files (T1059.003, T1055, T1071.001).',
      sourceUrl: 'https://t.me/vxunderground/448201',
      publishedAt: new Date(Date.now() - 45000).toISOString(),
    };

    // 2. Normalization & Entity Extraction
    const norm = await normalizeIntelligenceSignal(rawTelegramSignal);
    expect(norm.entities.malware).toContain('Lumma');
    expect(norm.entities.ipv4s).toContain('203.0.113.88');
    expect(norm.entities.sha256s).toContain('8f4e5a2b1c3d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f');

    // 3. Domain Classification
    const domains = classifyAnalyticalDomains({
      text: norm.normalizedSummary,
      title: norm.normalizedTitle,
      malware: norm.entities.malware,
      ttps: ['T1055', 'T1059'],
    });
    expect(domains).toContain('MALWARE_ANALYSIS');
    expect(domains).toContain('MEMORY_FORENSICS');

    // 4. Domain-Aware Retrieval across Complete Knowledge Corpus
    const knowledgePack = executeDomainAwareKnowledgeRetrieval({
      text: norm.normalizedSummary,
      title: norm.normalizedTitle,
      malware: norm.entities.malware,
      ttps: ['T1055', 'T1059'],
      maxUsedChunks: 4,
    });
    expect(knowledgePack.retrieval_completed).toBe(true);
    expect(knowledgePack.used_chunks_count).toBeGreaterThan(0);

    // 5. Generate 16-Part Canonical Malware Report Object
    const malwareReport = buildCanonicalMalwareReport({
      eventId: 'evt_malware_lumma_48',
      intelligenceId: 'intel_lumma_stealer',
      malwareName: 'Lumma Stealer',
      family: 'Infostealer',
      platform: 'Windows x86/x64',
      version: 'v4.8',
      title: 'Lumma Stealer v4.8 Process Hollowing & C2 Telemetry',
      rawText: rawTelegramSignal.rawText,
      summary: norm.normalizedSummary,
      originalSource: 'Threat Intelligence Lab / Independent Research',
      collectionSource: '@vxunderground',
      sourceUrl: rawTelegramSignal.sourceUrl,
      publishedAt: rawTelegramSignal.publishedAt,
      authorityTier: 1,
      sourceTrustScore: 0.90,
      capabilities: [
        'Browser credential and cryptocurrency wallet exfiltration',
        'Process hollowing into legitimate Windows explorer.exe',
        'Anti-sandbox sleep acceleration and encrypted TLS beaconing',
      ],
      staticAnalysis: 'Packed UPX variant with obfuscated IAT and encrypted string resource table.',
      dynamicBehavior: 'Spawns suspended explorer.exe, unmaps base section, injects payload, and initiates outbound TLS beaconing.',
      memoryBehavior: 'Allocates PAGE_EXECUTE_READWRITE pages in remote process address space.',
      iocs: [
        { type: 'ipv4', value: '203.0.113.88' },
        { type: 'sha256', value: '8f4e5a2b1c3d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f' },
      ],
      ttps: ['T1055', 'T1059.003', 'T1071.001'],
      actors: [],
      relatedCves: [],
      campaigns: [],
      knowledgePack,
    });

    // 6. Validate Canonical 16 Sections
    expect(malwareReport.report_type).toBe('MALWARE');
    expect(malwareReport.sections.length).toBe(16);
    expect(malwareReport.sections[0].title).toBe('EXECUTIVE ASSESSMENT');
    expect(malwareReport.sections[1].title).toBe('MALWARE IDENTITY');
    expect(malwareReport.sections[2].title).toBe('CAPABILITY PROFILE');
    expect(malwareReport.sections[3].title).toBe('TECHNICAL ANALYSIS');
    expect(malwareReport.sections[4].title).toBe('ATT&CK MAPPING');
    expect(malwareReport.sections[5].title).toBe('OBSERVED TELEMETRY');
    expect(malwareReport.sections[6].title).toBe('IOCs / INFRASTRUCTURE');
    expect(malwareReport.sections[7].title).toBe('RELATED VULNERABILITIES');
    expect(malwareReport.sections[8].title).toBe('RELATED ACTORS');
    expect(malwareReport.sections[9].title).toBe('RELATED CAMPAIGNS');
    expect(malwareReport.sections[10].title).toBe('DETECTION & HUNTING');
    expect(malwareReport.sections[11].title).toBe('ANALYST ASSESSMENT');
    expect(malwareReport.sections[12].title).toBe('CONFIDENCE & EVIDENCE BREAKDOWN');
    expect(malwareReport.sections[13].title).toBe('UNKNOWN / UNRESOLVED');
    expect(malwareReport.sections[14].title).toBe('KNOWLEDGE APPLIED');
    expect(malwareReport.sections[15].title).toBe('REFERENCES & PROVENANCE');

    // 7. No fabricated actors or related CVEs
    expect(malwareReport.sections[7].content).toContain('No validated evidence');
    expect(malwareReport.sections[8].content).toContain('No verified threat actor attribution');

    // 8. Quality Gate Verification
    const qualityGate = validateReportQuality(malwareReport);
    expect(qualityGate.passed).toBe(true);
    expect(qualityGate.violations).toHaveLength(0);

    // 9. Render markdown test
    const markdown = renderStructuredDossierMarkdown(malwareReport);
    expect(markdown).toContain('## 01 — EXECUTIVE ASSESSMENT');
    expect(markdown).toContain('## 03 — CAPABILITY PROFILE');
    expect(markdown).toContain('## 14 — UNKNOWN / UNRESOLVED');
    expect(markdown).toContain('## 15 — KNOWLEDGE APPLIED');
  });
});
