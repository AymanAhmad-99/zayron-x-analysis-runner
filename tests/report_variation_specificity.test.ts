import { describe, it, expect } from 'vitest';
import { executeDeepIntelligenceAnalysisV2 } from '../packages/intelligence/src/engine_v2/index';

describe('Z.X.Intelligence Report Specificity, Anti-Repetition & Case Variation Suite', () => {

  // Case A: Vendor Vulnerability Advisory (Red Hat OpenSSL memory corruption)
  const caseA = {
    rawText: `Red Hat Security Advisory: Critical vulnerability in OpenSSL package
CVE-2024-0553: A flaw was found in openssl where memory corruption occurs during TLS handshake.
CVSS Base Score: 9.8 (CRITICAL) CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H
Advisory URL: https://access.redhat.com/security/cve/CVE-2024-0553
Mitigation: Upgrade openssl package to version 3.0.7-27 or later immediately.`,
    sourceId: 'src_redhat_live_01',
    sourceTrust: 0.95,
    channelTitle: 'Red Hat Security Errata',
    publishedAt: '2026-09-04T12:00:00Z',
  };

  // Case B: In-The-Wild Incident Telemetry with C2 beaconing and public-facing ingress exploit
  const caseB = {
    rawText: `NEW CRITICAL RCE: CVE-2026-3819 affects Apache ActiveMQ Artemis before 2.38.0.
Public-facing web server ingress exploitation observed targeting port 8161.
Unauthenticated remote code execution via serialized Jolokia agent. Exploit PoC released.
Active C2 beaconing observed to 198.51.100.42 with payload hash 7f83b1657ff1fc53b92dc18148a1d65dfc2d4b1fa3d677284addd200126d9069 (T1190).
Advisory URL: https://t.me/cveNotify/109283`,
    sourceId: 'src_cvenotify_109283',
    sourceTrust: 0.85,
    channelTitle: 'CVE Notify Telemetry',
    publishedAt: '2026-09-05T08:00:00Z',
  };

  // Case C: Endpoint Memory Forensics / In-Memory Malware (Process Injection T1055, Volatility, Process Hollowing)
  const caseC = {
    rawText: `ENDPOINT FORENSICS ALERT: In-memory evasion activity detected on finance-srv-04.
Host telemetry and memory dump analysis via volatility identified process injection targeting lsass.exe via CreateRemoteThread.
Observed process hollowing with reflective DLL injection in volatile memory.
Malware payload beaconing confirmed. Zero public web ingress observed; execution initiated from compromised internal workstation.
Advisory URL: https://internal.soc.telemetry/alerts/2026-09-05-mem01`,
    sourceId: 'src_endpoint_telemetry_04',
    sourceTrust: 0.90,
    channelTitle: 'Internal SOC Endpoint Detection',
    publishedAt: '2026-09-05T09:30:00Z',
  };

  it('proves case-specific variation, anti-repetition, and distinct analytical conclusions across 3 materially different cases', () => {
    const resA = executeDeepIntelligenceAnalysisV2(caseA);
    const resB = executeDeepIntelligenceAnalysisV2(caseB);
    const resC = executeDeepIntelligenceAnalysisV2(caseC);

    const reportA = resA.report;
    const reportB = resB.report;
    const reportC = resC.report;

    // 1. All 3 reports must pass the 7-Stage Quality Gate
    expect(resA.qualityGate.passed).toBe(true);
    expect(resB.qualityGate.passed).toBe(true);
    expect(resC.qualityGate.passed).toBe(true);

    // 2. Proves Case Specificity in Identification & Report Types
    expect(reportA.report_type).toBe('VULNERABILITY');
    expect(reportB.report_type).toBe('VULNERABILITY');
    expect(reportC.report_type).toBe('MALWARE');

    expect(reportA.enrichment.cve_id).toBe('CVE-2024-0553');
    expect(reportB.enrichment.cve_id).toBe('CVE-2026-3819');
    expect(reportC.enrichment.cve_id).toBeNull(); // Case C is malware/intrusion without CVE

    // 3. Proves Analytical Variation in ATT&CK Mappings
    // Case A: No behavioral telemetry -> 0 techniques
    expect(reportA.attack_mappings.length).toBe(0);
    // Case B: Public-facing ingress telemetry -> T1190
    expect(reportB.attack_mappings.some(m => m.technique_id === 'T1190')).toBe(true);
    expect(reportB.attack_mappings.some(m => m.technique_id === 'T1055')).toBe(false);
    // Case C: Process injection & memory dump -> T1055
    expect(reportC.attack_mappings.some(m => m.technique_id === 'T1055')).toBe(true);
    expect(reportC.attack_mappings.some(m => m.technique_id === 'T1190')).toBe(false);

    // 4. Proves Actionable Defensive & Detection Guidance Variation
    const defA = reportA.sections.find(s => s.section_number === '07')?.content || '';
    const defB = reportB.sections.find(s => s.section_number === '07')?.content || '';
    const defC = reportC.sections.find(s => s.section_number === '07')?.content || '';

    // Case A: Vendor upgrade guidance for OpenSSL
    expect(defA).toContain('OpenSSL');
    // Case B: Web perimeter blocking and hash YARA rule
    expect(defB).toContain('CVE-2026-3819');
    expect(defB).toContain('YARA / EDR Rule Artifact');
    // Case C: EDR Sigma rule for Process Injection targeting lsass.exe
    expect(defC).toContain('Sigma / EDR Query: Process Injection');
    expect(defC).toContain('\\lsass.exe');

    // 5. Proves Anti-Repetition: Distinct purpose across all 10 Canonical Sections for all 3 cases
    for (const rep of [reportA, reportB, reportC]) {
      const secNumbers = rep.sections.map(s => s.section_number);
      expect(new Set(secNumbers).size).toBe(10);
      for (const sec of rep.sections) {
        expect(sec.content.length).toBeGreaterThan(10);
      }
    }

    // 6. Proves Knowledge Retrieval Domain Differentiation
    // Case A: NVD standards & CVSS
    // Case B: T1190 Exploit Public-Facing Application STIX
    // Case C: Memory Forensics (Art of Memory Forensics doc_ref_04_amf / Volatility)
    const chunksA = new Set(reportA.knowledge_trace.map(k => k.chunk_id));
    const chunksB = new Set(reportB.knowledge_trace.map(k => k.chunk_id));
    const chunksC = new Set(reportC.knowledge_trace.map(k => k.chunk_id));

    expect(chunksA).not.toEqual(chunksB);
    expect(chunksB).not.toEqual(chunksC);
    expect(chunksA).not.toEqual(chunksC);

    const hasMemoryBookC = reportC.knowledge_trace.some(k => k.document_id === 'doc_ref_04_amf' || k.domain === 'MEMORY_FORENSICS');
    expect(hasMemoryBookC).toBe(true);

    // 7. Proves Epistemic Separation across all 3 cases
    for (const rep of [reportA, reportB, reportC]) {
      const factClaims = rep.claims.filter(c => c.claim_type === 'CONFIRMED_FACT' || c.claim_type === 'VERIFIED_FACT');
      const infClaims = rep.claims.filter(c => c.claim_type === 'INFERENCE' || c.claim_type === 'SUPPORTED_INFERENCE');
      const unkClaims = rep.claims.filter(c => c.claim_type === 'UNKNOWN');

      expect(factClaims.length).toBeGreaterThan(0);
      expect(infClaims.length).toBeGreaterThan(0);
      expect(unkClaims.length).toBeGreaterThan(0);
    }
  });
});
