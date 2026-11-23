/**
 * ZAYRON-X — DEEP INTELLIGENCE ANALYSIS ENGINE v2 ACCEPTANCE SUITE
 * Validates Cases A through G, the 12 Core Knowledge Assets,
 * Claim Centricity, Precondition Gating, Contradiction Detection,
 * and Multi-Stage Quality Gate.
 */

import { describe, test, expect } from 'bun:test';
import {
  executeDeepIntelligenceAnalysisV2,
  classifyAnalyticalDomainsV2,
  evaluateKnowledgePreconditions,
  executePreconditionGatedRetrieval,
  enrichAuthoritativeData,
  detectContradictions,
  generateStructuredClaims,
  validateClaims,
  evaluateDeepQualityGateV2,
  compileCanonicalReportV2,
} from '../packages/intelligence/src/engine_v2';
import { KNOWLEDGE_MANIFEST_20 } from '../packages/intelligence/src/knowledge/manifest';
import { createKevEvidenceFixturePort } from './fixtures/kev_evidence_fixture';

describe('ZAYRON-X Deep Intelligence Analysis Engine v2 — Architectural Acceptance Suite', () => {

  // ── CASE A: Medium CVSS Vulnerability (No Severity Inflation) ───────────────
  test('Case A: Medium CVSS (5.9) vulnerability does not undergo severity inflation', () => {
    const rawSignal = `
Red Hat Security Advisory: Moderate severity flaw found in component libtiff.
CVE-2024-12345
CVSS Base Score: 5.9 (MEDIUM)
CVSS:3.1/AV:N/AC:H/PR:N/UI:R/S:U/C:N/I:L/A:H
Remotely Exploitable: True
A vulnerability in libtiff allows an attacker to cause denial of service via a crafted TIFF file.
Remote attackers might exploit this under specific race conditions.
Official errata available at https://access.redhat.com/security/cve/CVE-2024-12345
    `.trim();

    const { report, qualityGate } = executeDeepIntelligenceAnalysisV2({
      sourceId: 'tg_cveNotify',
      channelTitle: 'cveNotify',
      handle: 'cveNotify',
      messageId: '1001',
      rawText: rawSignal,
      sourceTrust: 0.90,
    });

    // 1. Severity must strictly adhere to authoritative CVSS (MEDIUM), NOT CRITICAL
    expect(report.severity).toBe('MEDIUM');
    expect(report.enrichment.cvss_score).toBe(5.9);
    expect(report.enrichment.cvss_severity).toBe('MEDIUM');
    expect(report.enrichment.exploit_status).toBe('VULNERABILITY_EXISTS');

    // 2. Vector breakdown must parse accurately
    expect(report.enrichment.vector_breakdown?.attack_vector).toBe('NETWORK');
    expect(report.enrichment.vector_breakdown?.attack_complexity).toBe('HIGH');
    expect(report.enrichment.vector_breakdown?.user_interaction).toBe('REQUIRED');

    // 3. Provenance must identify Red Hat as issuing authority, not Telegram
    expect(report.provenance[0].issuing_authority).toBe('Red Hat');
    expect(report.provenance[0].collection_channel).toBe('@cveNotify');

    // 4. Quality gate must pass with 0 violations
    expect(qualityGate.passed).toBe(true);
    expect(qualityGate.violations.length).toBe(0);
  });

  // ── CASE B: Vulnerability with No ATT&CK Evidence ────────────────────────────
  test('Case B: Vulnerability advisory lacking behavioral server telemetry maps ZERO ATT&CK techniques', () => {
    const rawSignal = `
Debian Security Advisory DSA-5501-1:
CVE-2023-9999
CVSS Base Score: 6.2 (MEDIUM)
Package: libxml2
A buffer over-read vulnerability was found in the xmlParseElement function of libxml2.
Applications processing untrusted XML documents may crash resulting in denial of service.
No known active exploitation reported.
    `.trim();

    const { report, qualityGate } = executeDeepIntelligenceAnalysisV2({
      sourceId: 'tg_debian_sec',
      channelTitle: 'Debian Security',
      handle: 'debian_sec',
      messageId: '1002',
      rawText: rawSignal,
    });

    // ATT&CK mapping must be strictly empty because no web/server ingress telemetry exists
    expect(report.attack_mappings.length).toBe(0);
    const attkSection = report.sections.find(s => s.title === 'ATT&CK MAPPING');
    expect(attkSection).toBeDefined();
    expect(attkSection!.content).toContain('No validated ATT&CK mapping established');

    // Gate must pass Stage 4 (attack_validation)
    expect(qualityGate.stage_results.attack_validation.passed).toBe(true);
    expect(qualityGate.passed).toBe(true);
  });

  // ── CASE C: Malware Telemetry with Process Injection Evidence ───────────────
  test('Case C: Malware telemetry with process injection maps T1055 only with empirical evidence', () => {
    const rawSignal = `
Incident Alert: Observed Lumma Stealer activity on workstation endpoint.
Lumma payload executed via PowerShell and performed process injection into svchost.exe.
Observed memory allocation with PAGE_EXECUTE_READWRITE and CreateRemoteThread invocation.
SHA256: 7f83b1657ff1fc53b92dc18148a1d65dfc2d4b1fa3d677284addd200126d9069
C2 IP: 198.51.100.45:443
    `.trim();

    const { report, qualityGate } = executeDeepIntelligenceAnalysisV2({
      sourceId: 'tg_blueteamalerts',
      channelTitle: 'Blue Team Alerts',
      handle: 'blueteamalerts',
      messageId: '1003',
      rawText: rawSignal,
    });

    // Must map T1055 due to explicit process injection evidence
    const t1055 = report.attack_mappings.find(m => m.technique_id === 'T1055');
    expect(t1055).toBeDefined();
    expect(t1055!.technique_name).toBe('Process Injection');
    expect(t1055!.evidence_id).toBeDefined();

    // Must NOT map T1190 because this is endpoint execution, not public web exploitation
    const t1190 = report.attack_mappings.find(m => m.technique_id === 'T1190');
    expect(t1190).toBeUndefined();

    // Quality gate must pass
    expect(qualityGate.passed).toBe(true);
  });

  // ── CASE D: Memory Forensics Case with Memory Dump ──────────────────────────
  test('Case D: Incident with memory dump artifact allows Memory Forensics knowledge to be marked USED', () => {
    const rawSignal = `
DFIR Telemetry: Analysis of raw memory dump from compromised domain controller DC01.
Volatility 3 framework used with windows.vadinfo and windows.malfind plugins.
Identified reflective DLL injection in lsass dump at virtual address 0x00040000.
VAD tree exhibits hidden executable pages without backing file on disk.
    `.trim();

    const { report, qualityGate } = executeDeepIntelligenceAnalysisV2({
      sourceId: 'tg_dfir_daily',
      channelTitle: 'DFIR Daily',
      handle: 'dfir_daily',
      messageId: '1004',
      rawText: rawSignal,
    });

    // The Art of Memory Forensics must be retrieved AND marked USED
    const amfTrace = report.knowledge_trace.find(k => k.document_id === 'doc_ref_04_amf');
    expect(amfTrace).toBeDefined();
    expect(amfTrace!.status).toBe('USED');
    expect(amfTrace!.reason_retrieved).toBeDefined();

    // Section 09 Knowledge Applied must reflect AMF
    const sec09 = report.sections.find(s => s.title === 'KNOWLEDGE APPLIED');
    expect(sec09!.content).toContain('The Art of Memory Forensics');

    // Quality gate Stage 3 (knowledge validation) must pass
    expect(qualityGate.stage_results.knowledge_validation.passed).toBe(true);
    expect(qualityGate.passed).toBe(true);
  });

  // ── CASE E: Simple Vendor Advisory with Minimal Detail ──────────────────────
  test('Case E: Simple vendor advisory results in truthful LOW depth report rather than fabricated deep analysis', () => {
    const rawSignal = `
SonicWall Security Advisory:
CVE-2024-9001
CVSS Base Score: 4.8 (MEDIUM)
Issue affecting SonicOS management GUI.
A potential information disclosure condition exists.
Customers are advised to apply SonicOS 7.1.1-7058 maintenance release.
    `.trim();

    const { report, qualityGate } = executeDeepIntelligenceAnalysisV2({
      sourceId: 'tg_sonicwall_advisories',
      channelTitle: 'SonicWall Advisories',
      handle: 'sonicwall_advisories',
      messageId: '1005',
      rawText: rawSignal,
    });

    // Must scale depth to LOW / fact-centered
    expect(report.depth).toBe('LOW');
    expect(report.severity).toBe('MEDIUM');
    expect(report.enrichment.exploit_status).toBe('VULNERABILITY_EXISTS');

    // Unknowns must explicitly acknowledge visibility boundaries
    expect(report.sections.find(s => s.title === 'UNKNOWN / UNRESOLVED')?.content).toContain('threat actor');

    expect(qualityGate.passed).toBe(true);
  });

  // ── CASE F: Conflicting Vendor vs. Community Reporting ──────────────────────
  test('Case F: Conflicting vendor vs community reporting applies source hierarchy and preserves dispute', () => {
    const rawSignal = `
Vendor bulletin from Cisco: CVE-2024-5555 has CVSS Base Score: 5.3 (MEDIUM).
Vendor reports no known exploitation in the wild.
However, community feed flags this as Critical Severity Zero-Day under active exploitation by threat actors.
    `.trim();

    const { report, qualityGate } = executeDeepIntelligenceAnalysisV2({
      sourceId: 'tg_aggr_news',
      channelTitle: 'Threat Aggregator',
      handle: 'aggr_news',
      messageId: '1006',
      rawText: rawSignal,
    });

    // Severity must stay MEDIUM according to vendor authoritative score
    expect(report.severity).toBe('MEDIUM');
    expect(report.enrichment.cvss_score).toBe(5.3);

    // Contradiction must be formally detected and recorded
    expect(report.contradictions.length).toBeGreaterThanOrEqual(1);
    const contra = report.contradictions.find(c => c.topic.includes('Severity') || c.topic.includes('Exploitation'));
    expect(contra).toBeDefined();
    expect(contra!.source_a.authority).toContain('Cisco');
    expect(contra!.resolution_status).toBe('SUPERSEDED_BY_PRIMARY');

    // Section 04 must preserve the contradiction analysis
    const sec04 = report.sections.find(s => s.title === 'THREAT & EXPLOITATION CONTEXT');
    expect(sec04!.content).toContain('[Contradiction Analysis]');

    expect(qualityGate.passed).toBe(true);
  });

  // ── CASE G: Unretrieved Knowledge Asset Must NOT Appear as USED ─────────────
  test('Case G: If knowledge retrieval is skipped or unexecuted, knowledge_trace is empty and no book is marked USED', () => {
    const rawSignal = `
Telemetry update: CVE-2024-8888 released by Microsoft.
CVSS Base Score: 7.5 (HIGH).
Patch available.
    `.trim();

    const { report, qualityGate } = executeDeepIntelligenceAnalysisV2({
      sourceId: 'tg_ms_alerts',
      channelTitle: 'MS Alerts',
      messageId: '1007',
      rawText: rawSignal,
      skipKnowledgeRetrieval: true, // Retrieval bypassed
    });

    // Knowledge trace MUST be completely empty per Principle #4
    expect(report.knowledge_trace).toEqual([]);

    // Section 09 must state no external knowledge was applied
    const sec09 = report.sections.find(s => s.title === 'KNOWLEDGE APPLIED');
    expect(sec09!.content).toContain('No external knowledge corpus documents satisfied evidentiary preconditions');

    expect(qualityGate.passed).toBe(true);
  });

  // ── TEST THE 12 CURRENT KNOWLEDGE ASSETS ────────────────────────────────────
  test('The 12 Core Knowledge Assets: Controlled precondition validation and domain routing', () => {
    const manifestIds = KNOWLEDGE_MANIFEST_20.map(m => m.id);

    // 1. Memory Forensics precondition check
    const amfPreNo = evaluateKnowledgePreconditions({
      documentId: 'doc_ref_04_amf',
      rawText: 'Simple router firmware bug CVE-2024-0001 with no memory telemetry',
    });
    expect(amfPreNo.satisfied).toBe(false);
    expect(amfPreNo.reason).toContain('Precondition not met');

    const amfPreYes = evaluateKnowledgePreconditions({
      documentId: 'doc_ref_04_amf',
      rawText: 'Captured raw memory dump analyzed via Volatility VAD tree',
    });
    expect(amfPreYes.satisfied).toBe(true);

    // 2. Practical Malware Analysis precondition check
    const pmaPreNo = evaluateKnowledgePreconditions({
      documentId: 'doc_ref_02_pma',
      rawText: 'Policy advisory regarding cloud IAM permissions',
    });
    expect(pmaPreNo.satisfied).toBe(false);

    const pmaPreYes = evaluateKnowledgePreconditions({
      documentId: 'doc_ref_02_pma',
      rawText: 'Disassembled malicious PE header with suspicious IAT imports and packed payload',
      malware: [{ name: 'AgentTesla' }] as any,
    });
    expect(pmaPreYes.satisfied).toBe(true);

    // 3. CISA KEV / NVD precondition check requires CVE
    const kevPreNo = evaluateKnowledgePreconditions({
      documentId: 'doc_ref_16_cisa_kev',
      rawText: 'Phishing campaign targeting banking customers',
    });
    expect(kevPreNo.satisfied).toBe(false);

    const kevPreYes = evaluateKnowledgePreconditions({
      documentId: 'doc_ref_16_cisa_kev',
      rawText: 'Vulnerability CVE-2023-34362 in MOVEit Transfer',
      cves: ['CVE-2023-34362'],
    });
    expect(kevPreYes.satisfied).toBe(true);

    // 4. Network Security Monitoring (PNSM) requires network indicators
    const pnsmPreNo = evaluateKnowledgePreconditions({
      documentId: 'doc_ref_03_pnsm',
      rawText: 'Local registry key modification for privilege escalation',
    });
    expect(pnsmPreNo.satisfied).toBe(false);

    const pnsmPreYes = evaluateKnowledgePreconditions({
      documentId: 'doc_ref_03_pnsm',
      rawText: 'Zeek network connection log shows C2 beaconing over TCP port 443 with PCAP attached',
      indicators: [{ type: 'ipv4', value: '198.51.100.1' }],
    });
    expect(pnsmPreYes.satisfied).toBe(true);
  });

  // ── MEASUREMENT METRICS VALIDATION ──────────────────────────────────────────
  test('Engine v2 Evaluation Metrics: Evidence Grounding and Claim Support Rates', () => {
    const rawSignal = `
Palo Alto Networks Security Advisory:
CVE-2024-3400
CVSS Base Score: 10.0 (CRITICAL)
CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:C/C:H/I:H/A:H
A command injection vulnerability in the GlobalProtect feature of PAN-OS allows an unauthenticated attacker to execute arbitrary code with root privileges.
Confirmed exploitation in the wild listed in CISA KEV.
Recommended action: Apply PAN-OS hotfix immediately.
    `.trim();

    const { report, qualityGate } = executeDeepIntelligenceAnalysisV2({
      sourceId: 'tg_panw',
      channelTitle: 'PANW Advisories',
      messageId: '1008',
      rawText: rawSignal,
      // P0.1: KEV state now requires injected catalog evidence (text mentions are telemetry only)
      kevEvidence: createKevEvidenceFixturePort(),
    });

    // Metric 1: Evidence Grounding Score (EGS) = Verified Claims backed by Evidence / Total Claims
    const supportedClaims = report.claims.filter(c => c.evidence_ids.length > 0);
    const nonUnknownClaims = report.claims.filter(c => c.claim_type !== 'UNKNOWN');
    const claimSupportRate = supportedClaims.length / Math.max(1, nonUnknownClaims.length);
    expect(claimSupportRate).toBe(1.0); // 100% of non-unknown claims must have evidence

    // Metric 2: Unsupported Claim Rate (UCR) must be 0%
    const unsupportedFacts = report.claims.filter(c => c.claim_type === 'VERIFIED_FACT' && c.evidence_ids.length === 0);
    expect(unsupportedFacts.length).toBe(0);

    // Metric 3: CISA KEV & Exploit Status Separation
    expect(report.enrichment.exploit_status).toBe('EXPLOITATION_IN_THE_WILD');
    expect(report.enrichment.cisa_kev.is_in_kev).toBe(true);
    expect(report.priority).toBe('P1');

    // Metric 4: All 10 Canonical Sections Present
    expect(report.sections.length).toBe(10);

    // Metric 5: Publication Safety Gate
    expect(qualityGate.passed).toBe(true);
  });
});
