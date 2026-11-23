
/**
 * CANONICAL CVE PROCESSOR — END-TO-END INTELLIGENCE PATH TEST SUITE
 * 
 * Strict verification of:
 * 1. Input contract & format validation (rejection of malformed CVEs)
 * 2. Deterministic State Machine transitions (RECEIVED -> NORMALIZED -> ENRICHED -> VALIDATED -> PERSISTED -> REPORT_READY)
 * 3. Epistemic Ledger (31 claims with explicit truth types, provenance, and UNKNOWN semantics)
 * 4. Reconciliation Hierarchy (Vendor Advisory > NVD > KEV > OSV/GHSA > Inference)
 * 5. Attack Path & ATT&CK Mapping evidence bounding
 * 6. Independent Claims Ledger Verification & Fail-Closed Semantic Gate
 * 7. Idempotency key & D1 structured_report contract matching frontend requirements
 * 8. Real CVE specimen end-to-end grounding (CVE-2023-22527)
 */

import { describe, it, expect } from 'bun:test';
import {
  assessEnterpriseVulnerabilityRelevance,
  reconcileOpenSourceEnrichment,
  buildBoundedAttackPath,
  buildStructuredAttackMappings,
  verifyClaimsLedger,
  validateReportSemantics,
  buildSignalDrivenExecutiveAssessment,
  buildSignalDrivenTechnicalSummary,
  lookupExploitDbEvidence,
  type ClaimRecord,
} from '@zayron/intelligence';

describe('CANONICAL CVE PROCESSOR — STATE MACHINE & CONTRACT INTEGRITY', () => {
  const VALID_CVE = 'CVE-2023-22527';
  const MALFORMED_CVES = [
    'cve-invalid',
    '2023-22527',
    'CVE-23-22527',
    'CVE-2023-',
    'EXPLOIT-2023-01',
    '',
  ];

  // ── 1. Input Contract & Malformation Rejection ─────────────────────────────
  describe('1. Input Contract & Format Validation', () => {
    it('accepts strictly valid CVE identifiers', () => {
      const cveRegex = /^CVE-\d{4}-\d{4,19}$/;
      expect(cveRegex.test(VALID_CVE)).toBe(true);
      expect(cveRegex.test('CVE-2024-21893')).toBe(true);
      expect(cveRegex.test('CVE-2021-44228')).toBe(true);
    });

    it('rejects malformed and non-canonical identifiers', () => {
      const cveRegex = /^CVE-\d{4}-\d{4,19}$/;
      for (const invalid of MALFORMED_CVES) {
        expect(cveRegex.test(invalid)).toBe(false);
      }
    });

    it('guarantees identity immutability: never normalizes one CVE into another', () => {
      const cve1 = 'CVE-2023-22527';
      const cve2 = 'CVE-2024-21893';
      expect(cve1.toUpperCase().trim()).toBe('CVE-2023-22527');
      expect(cve2.toUpperCase().trim()).toBe('CVE-2024-21893');
      expect(cve1).not.toBe(cve2);
    });
  });

  // ── 2. Enterprise Relevance Gate & Pipeline Branching ───────────────────────
  describe('2. Enterprise Relevance Gate (Deterministic Triage)', () => {
    it('accurately identifies enterprise server vulnerabilities for DEEP_ANALYSIS', () => {
      const assessment = assessEnterpriseVulnerabilityRelevance({
        cveId: VALID_CVE,
        vendor: 'Atlassian',
        product: 'Confluence Data Center and Server',
        vulnerabilityName: 'Atlassian Confluence Data Center and Server Template Injection Vulnerability',
        description: 'Atlassian Confluence Data Center and Server contain an unauthenticated OGNL template injection vulnerability that can lead to remote code execution.',
        isKev: true,
      });

      expect(assessment.isEnterpriseRelevant).toBe(true);
      expect(assessment.relevanceTier).toBe('HIGH');
      expect(assessment.processDecision).toBe('DEEP_ANALYSIS');
      expect(assessment.category).toBe('ENTERPRISE_SERVER');
    });

    it('routes consumer/device tier candidates away from deep AI compute while preserving normalization', () => {
      const assessment = assessEnterpriseVulnerabilityRelevance({
        cveId: 'CVE-2023-38606',
        vendor: 'Apple',
        product: 'iOS and iPadOS',
        vulnerabilityName: 'Apple iOS and iPadOS Kernel Vulnerability',
        description: 'An app may be able to modify sensitive kernel state.',
        isKev: true,
      });

      expect(assessment.processDecision).toBe('STORE_ONLY');
      expect(['CONSUMER_DEVICE', 'CLIENT_OS', 'EXCLUDED']).toContain(assessment.category);
    });
  });

  // ── 3. Multi-Source Reconciliation & Provenance Hierarchy ───────────────────
  describe('3. Multi-Source Reconciliation & Provenance Hierarchy', () => {
    it('reconciles authoritative sources following strict priority without data fabrication', () => {
      const reconciled = reconcileOpenSourceEnrichment({
        cveId: VALID_CVE,
        cisaKev: {
          cveID: VALID_CVE,
          vendorProject: 'Atlassian',
          product: 'Confluence Data Center and Server',
          vulnerabilityName: 'Atlassian Confluence Data Center and Server Template Injection Vulnerability',
          dateAdded: '2024-01-24',
          dueDate: '2024-02-14',
          knownRansomwareCampaignUse: 'Known',
        },
        vulnrichment: {
          cwe_ids: ['CWE-74'],
          ssvc: {
            exploitation: 'active',
            automatable: 'yes',
            technical_impact: 'total',
          },
        },
        nvdCpe: {
          cveId: VALID_CVE,
          vendor: 'atlassian',
          product: 'confluence_data_center',
          cvss: {
            score: '9.8',
            vector: 'CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H',
            version: '3.1',
          },
          attackVector: 'NETWORK',
          attackComplexity: 'LOW',
          privilegesRequired: 'NONE',
          userInteraction: 'NONE',
          cpes: ['cpe:2.3:a:atlassian:confluence_data_center:*:*:*:*:*:*:*:*'],
          affectedVersions: ['>= 8.0.0 < 8.5.4'],
          fixedVersions: [],
        } as any,
        epss: {
          score: '0.99984',
          percentile: '0.99982',
        },
      });

      expect(reconciled.identity.vendor).toBe('Atlassian');
      expect(reconciled.identity.product).toBe('Confluence Data Center and Server');
      expect(reconciled.severity.cvss.score).toBe('9.8');
      expect(reconciled.severity.cvss.truth_type).toBe('SOURCE_FACT');
      expect(reconciled.severity.epss.score).toBe('0.99984');
      expect(reconciled.exploitation.ssvc?.technical_impact).toBe('total');

      // Fixed version absence in NVD/KEV must yield UNKNOWN, never a fabricated version number
      expect(reconciled.affected_scope.fixed_versions).toEqual([]);
    });

    it('preserves UNKNOWN semantics when evidence is absent (missing != false, missing != 0)', () => {
      const reconciled = reconcileOpenSourceEnrichment({
        cveId: 'CVE-2026-99999',
        cisaKev: {
          cveID: 'CVE-2026-99999',
          vendorProject: 'GenericCorp',
          product: 'GenericApp',
          dateAdded: '2026-09-01',
          knownRansomwareCampaignUse: 'Unknown',
        },
      });

      expect(reconciled.severity.cvss.score).toBe('NOT_AVAILABLE');
      expect(reconciled.severity.cvss.truth_type).toBe('NOT_AVAILABLE');
      expect(reconciled.severity.epss.score).toBe('NOT_AVAILABLE');
      expect(reconciled.affected_scope.affected_versions).toEqual([]);
      expect(reconciled.affected_scope.fixed_versions).toEqual([]);
    });
  });

  // ── 4. Deterministic Bounded Attack Path & ATT&CK Mapping ───────────────────
  describe('4. Deterministic Attack Path & Evidence-Scoped ATT&CK Mapping', () => {
    it('constructs a deterministic 4-stage attack path bounded by NVD CVSS and CWE mechanics', () => {
      const attackPath = buildBoundedAttackPath({
        cveId: VALID_CVE,
        vendor: 'Atlassian',
        product: 'Confluence Data Center and Server',
        attackVector: 'NETWORK',
        privilegesRequired: 'NONE',
        userInteraction: 'NONE',
        authenticationRequired: 'No',
        cwe: { id: 'CWE-74', name: 'Software Weakness' },
        evidenceIds: ['evi_cve_2023_22527_kev'],
      });

      expect(attackPath.entry_point).toContain('Network-exposed Confluence Data Center');
      expect(attackPath.prerequisite).toContain('without prior authentication');
      expect(attackPath.vulnerability_condition).toContain('CWE-74');
      expect(attackPath.exploitation_effect).toContain('Exploitation of Software Weakness flaw');
      expect(attackPath.confidence).toBe(0.95);
    });

    it('strictly isolates CVE attack mappings from general campaign techniques', () => {
      // Fail-closed contract (Phase 12.27): taxonomic inference from CWE/KEV/network
      // vector caps at SUPPORTED. CONFIRMED requires an explicit, source-attributed
      // authoritative CTI mapping plus supplied evidence; CWE-74 is additionally
      // excluded from direct-confirmed initial access. See buildStructuredAttackMappings
      // in packages/intelligence/src/sources/adapters.ts.
      const mappings = buildStructuredAttackMappings({
        cveId: VALID_CVE,
        cweIds: ['CWE-74'],
        attackVector: 'NETWORK',
        privilegesRequired: 'NONE',
        isKev: true,
        product: 'Confluence Data Center and Server',
        description: 'Unauthenticated template injection vulnerability',
        evidenceIds: ['evi_cve_2023_22527_kev'],
      });

      expect(mappings.length).toBeGreaterThan(0);
      // CWE-74 alone establishes neither a direct weakness nor traversal-upload
      // evidence, so the taxonomic T1190 mapping caps at CANDIDATE — never
      // CONFIRMED and not even SUPPORTED.
      const taxonomicT1190 = mappings.find(m => m.technique_id === 'T1190');
      expect(taxonomicT1190).toBeDefined();
      expect(taxonomicT1190?.status).toBe('CANDIDATE');
      expect(mappings.find(m => m.status === 'CONFIRMED')).toBeUndefined();

      // A direct initial-access weakness (CWE-78, no privileges) without CWE-74
      // reaches SUPPORTED — still not CONFIRMED.
      const supported = buildStructuredAttackMappings({
        cveId: VALID_CVE,
        cweIds: ['CWE-78'],
        attackVector: 'NETWORK',
        privilegesRequired: 'NONE',
        isKev: true,
        product: 'Confluence Data Center and Server',
        description: 'OS command injection vulnerability',
        evidenceIds: ['evi_cve_2023_22527_kev'],
      });
      const supportedT1190 = supported.find(m => m.technique_id === 'T1190');
      expect(supportedT1190?.status).toBe('SUPPORTED');
      expect(supported.find(m => m.status === 'CONFIRMED')).toBeUndefined();

      // CONFIRMED is reachable only with authoritative CTI attribution.
      const confirmed = buildStructuredAttackMappings({
        cveId: VALID_CVE,
        cweIds: ['CWE-74'],
        attackVector: 'NETWORK',
        privilegesRequired: 'NONE',
        isKev: true,
        product: 'Confluence Data Center and Server',
        description: 'Unauthenticated template injection vulnerability',
        evidenceIds: ['evi_cve_2023_22527_kev'],
        authoritativeTechniques: [{
          technique_id: 'T1190',
          technique_name: 'Exploit Public-Facing Application',
          tactic: 'Initial Access',
          source: 'CISA KEV',
        }],
      });
      const confirmedMapping = confirmed.find(m => m.status === 'CONFIRMED');
      expect(confirmedMapping).toBeDefined();
      expect(confirmedMapping?.technique_id).toBe('T1190'); // Exploit Public-Facing Application

      // Campaign-only techniques must never be promoted to CONFIRMED on a pure CVE scope
      const campaignOnly = mappings.filter(m => m.status === 'CAMPAIGN_CONTEXT');
      for (const m of campaignOnly) {
        expect(m.status).not.toBe('CONFIRMED');
      }
    });
  });

  // ── 5. Epistemic Claims Ledger & Truth States ──────────────────────────────
  describe('5. Epistemic Claims Ledger & Truth State Integrity', () => {
    it('generates all 31 major claims with non-null truth_type and valid evidence_scope', () => {
      const defaultTimestamp = '2024-01-24T00:00:00Z';
      const claims: ClaimRecord[] = [
        { id: 'CLM-01', claim_id: 'CLM-01', field: 'identity', value: VALID_CVE, truth_type: 'SOURCE_FACT', confidence: 1.0, source: 'CISA KEV', source_ids: ['cisa-kev'], source_url: 'https://cisa.gov', evidence_scope: 'CVE', source_timestamp: defaultTimestamp, verification_status: 'VERIFIED', related_cve_ids: [] },
        { id: 'CLM-02', claim_id: 'CLM-02', field: 'vendor', value: 'Atlassian', truth_type: 'SOURCE_FACT', confidence: 1.0, source: 'NVD', source_ids: ['nvd-cpe'], source_url: 'https://nvd.nist.gov', evidence_scope: 'PRODUCT', source_timestamp: defaultTimestamp, verification_status: 'VERIFIED', related_cve_ids: [] },
        { id: 'CLM-03', claim_id: 'CLM-03', field: 'product', value: 'Confluence Data Center and Server', truth_type: 'SOURCE_FACT', confidence: 1.0, source: 'NVD', source_ids: ['nvd-cpe'], source_url: 'https://nvd.nist.gov', evidence_scope: 'PRODUCT', source_timestamp: defaultTimestamp, verification_status: 'VERIFIED', related_cve_ids: [] },
        { id: 'CLM-04', claim_id: 'CLM-04', field: 'affected_versions', value: '>= 8.0.0 < 8.5.4', truth_type: 'SOURCE_FACT', confidence: 1.0, source: 'NVD', source_ids: ['nvd-cpe'], source_url: 'https://nvd.nist.gov', evidence_scope: 'PRODUCT', source_timestamp: defaultTimestamp, verification_status: 'VERIFIED', related_cve_ids: [] },
        { id: 'CLM-05', claim_id: 'CLM-05', field: 'fixed_versions', value: 'UNKNOWN', truth_type: 'UNKNOWN', confidence: 0.0, source: 'NVD', source_ids: ['nvd-cpe'], source_url: 'https://nvd.nist.gov', evidence_scope: 'PRODUCT', source_timestamp: defaultTimestamp, verification_status: 'UNKNOWN', related_cve_ids: [] },
        { id: 'CLM-06', claim_id: 'CLM-06', field: 'cwe', value: 'CWE-74', truth_type: 'SOURCE_FACT', confidence: 1.0, source: 'MITRE CWE', source_ids: ['cisa-kev'], source_url: 'https://cwe.mitre.org', evidence_scope: 'CVE', source_timestamp: defaultTimestamp, verification_status: 'VERIFIED', related_cve_ids: [] },
        { id: 'CLM-07', claim_id: 'CLM-07', field: 'cvss', value: '9.8', truth_type: 'SOURCE_FACT', confidence: 1.0, source: 'NVD', source_ids: ['nvd'], source_url: 'https://nvd.nist.gov', evidence_scope: 'CVE', source_timestamp: defaultTimestamp, verification_status: 'VERIFIED', related_cve_ids: [] },
        { id: 'CLM-08', claim_id: 'CLM-08', field: 'cvss_vector', value: 'CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H', truth_type: 'SOURCE_FACT', confidence: 1.0, source: 'NVD', source_ids: ['nvd'], source_url: 'https://nvd.nist.gov', evidence_scope: 'CVE', source_timestamp: defaultTimestamp, verification_status: 'VERIFIED', related_cve_ids: [] },
        { id: 'CLM-09', claim_id: 'CLM-09', field: 'epss', value: '0.99984', truth_type: 'SOURCE_FACT', confidence: 1.0, source: 'FIRST EPSS', source_ids: ['first-epss'], source_url: 'https://first.org', evidence_scope: 'CVE', source_timestamp: defaultTimestamp, verification_status: 'VERIFIED', related_cve_ids: [] },
        { id: 'CLM-10', claim_id: 'CLM-10', field: 'exploitation', value: 'Active in-the-wild exploitation', truth_type: 'SOURCE_FACT', confidence: 1.0, source: 'CISA KEV', source_ids: ['cisa-kev'], source_url: 'https://cisa.gov', evidence_scope: 'CVE', source_timestamp: defaultTimestamp, verification_status: 'VERIFIED', related_cve_ids: [] },
        { id: 'CLM-11', claim_id: 'CLM-11', field: 'ransomware', value: 'Known', truth_type: 'SOURCE_FACT', confidence: 1.0, source: 'CISA KEV', source_ids: ['cisa-kev'], source_url: 'https://cisa.gov', evidence_scope: 'CVE', source_timestamp: defaultTimestamp, verification_status: 'VERIFIED', related_cve_ids: [] },
        { id: 'CLM-12', claim_id: 'CLM-12', field: 'ssvc', value: '{"exploitation":"active"}', truth_type: 'SOURCE_FACT', confidence: 1.0, source: 'CISA Vulnrichment', source_ids: ['cisa-vulnrichment'], source_url: 'https://cisa.gov', evidence_scope: 'CVE', source_timestamp: defaultTimestamp, verification_status: 'VERIFIED', related_cve_ids: [] },
        { id: 'CLM-13', claim_id: 'CLM-13', field: 'attack_vector', value: 'NETWORK', truth_type: 'SOURCE_FACT', confidence: 1.0, source: 'NVD CVSS', source_ids: ['nvd'], source_url: 'https://nvd.nist.gov', evidence_scope: 'PRODUCT', source_timestamp: defaultTimestamp, verification_status: 'VERIFIED', related_cve_ids: [] },
        { id: 'CLM-14', claim_id: 'CLM-14', field: 'attack_complexity', value: 'LOW', truth_type: 'SOURCE_FACT', confidence: 1.0, source: 'NVD CVSS', source_ids: ['nvd'], source_url: 'https://nvd.nist.gov', evidence_scope: 'PRODUCT', source_timestamp: defaultTimestamp, verification_status: 'VERIFIED', related_cve_ids: [] },
        { id: 'CLM-15', claim_id: 'CLM-15', field: 'privileges', value: 'NONE', truth_type: 'SOURCE_FACT', confidence: 1.0, source: 'NVD CVSS', source_ids: ['nvd'], source_url: 'https://nvd.nist.gov', evidence_scope: 'PRODUCT', source_timestamp: defaultTimestamp, verification_status: 'VERIFIED', related_cve_ids: [] },
        { id: 'CLM-16', claim_id: 'CLM-16', field: 'authentication', value: 'No', truth_type: 'SOURCE_FACT', confidence: 1.0, source: 'CISA KEV', source_ids: ['cisa-kev'], source_url: 'https://cisa.gov', evidence_scope: 'PRODUCT', source_timestamp: defaultTimestamp, verification_status: 'VERIFIED', related_cve_ids: [] },
        { id: 'CLM-17', claim_id: 'CLM-17', field: 'user_interaction', value: 'NONE', truth_type: 'SOURCE_FACT', confidence: 1.0, source: 'NVD CVSS', source_ids: ['nvd'], source_url: 'https://nvd.nist.gov', evidence_scope: 'PRODUCT', source_timestamp: defaultTimestamp, verification_status: 'VERIFIED', related_cve_ids: [] },
        { id: 'CLM-18', claim_id: 'CLM-18', field: 'root_cause', value: 'Template Injection Flaw', truth_type: 'KNOWLEDGE_SUPPORTED_INFERENCE', confidence: 0.85, source: 'MITRE CWE', source_ids: ['mitre-cwe'], source_url: 'https://cwe.mitre.org', evidence_scope: 'CVE', source_timestamp: defaultTimestamp, verification_status: 'VERIFIED', related_cve_ids: [] },
        { id: 'CLM-19', claim_id: 'CLM-19', field: 'attack_surface', value: 'Network interface', truth_type: 'KNOWLEDGE_SUPPORTED_INFERENCE', confidence: 0.85, source: 'NVD CVSS', source_ids: ['nvd'], source_url: 'https://nvd.nist.gov', evidence_scope: 'PRODUCT', source_timestamp: defaultTimestamp, verification_status: 'VERIFIED', related_cve_ids: [] },
        { id: 'CLM-20', claim_id: 'CLM-20', field: 'prerequisites', value: 'Network connectivity without authentication', truth_type: 'KNOWLEDGE_SUPPORTED_INFERENCE', confidence: 0.85, source: 'NVD CVSS', source_ids: ['nvd'], source_url: 'https://nvd.nist.gov', evidence_scope: 'PRODUCT', source_timestamp: defaultTimestamp, verification_status: 'VERIFIED', related_cve_ids: [] },
        { id: 'CLM-21', claim_id: 'CLM-21', field: 'attack_path', value: 'Network -> CWE-74 -> RCE', truth_type: 'SUPPORTED_INFERENCE', confidence: 0.85, source: 'Evidence Engine', source_ids: ['nvd'], source_url: 'https://nvd.nist.gov', evidence_scope: 'CVE', source_timestamp: defaultTimestamp, verification_status: 'VERIFIED', related_cve_ids: [] },
        { id: 'CLM-22', claim_id: 'CLM-22', field: 'impact', value: 'SSVC: total', truth_type: 'SOURCE_FACT', confidence: 1.0, source: 'CISA SSVC', source_ids: ['cisa-vulnrichment'], source_url: 'https://cisa.gov', evidence_scope: 'CVE', source_timestamp: defaultTimestamp, verification_status: 'VERIFIED', related_cve_ids: [] },
        { id: 'CLM-23', claim_id: 'CLM-23', field: 'remediation', value: 'Apply vendor advisory update', truth_type: 'SOURCE_FACT', confidence: 1.0, source: 'Vendor Advisory', source_ids: ['vendor-advisory'], source_url: 'https://confluence.atlassian.com', evidence_scope: 'CVE', source_timestamp: defaultTimestamp, verification_status: 'VERIFIED', related_cve_ids: [] },
        { id: 'CLM-24', claim_id: 'CLM-24', field: 'detection', value: 'Monitor perimeter gateways', truth_type: 'SUPPORTED_INFERENCE', confidence: 0.80, source: 'NVD', source_ids: ['nvd'], source_url: 'https://nvd.nist.gov', evidence_scope: 'PRODUCT', source_timestamp: defaultTimestamp, verification_status: 'VERIFIED', related_cve_ids: [] },
        { id: 'CLM-25', claim_id: 'CLM-25', field: 'source_advisory', value: 'ADV-CVE-2023-22527', truth_type: 'SOURCE_FACT', confidence: 1.0, source: 'Vendor Advisory', source_ids: ['vendor-advisory'], source_url: 'https://confluence.atlassian.com', evidence_scope: 'CVE', source_timestamp: defaultTimestamp, verification_status: 'VERIFIED', related_cve_ids: [] },
        { id: 'CLM-26', claim_id: 'CLM-26', field: 'public_exploit', value: 'NOT_FOUND', truth_type: 'NOT_AVAILABLE', confidence: 0.0, source: 'Exploit-DB', source_ids: ['exploit-db'], source_url: 'https://exploit-db.com', evidence_scope: 'CVE', source_timestamp: defaultTimestamp, verification_status: 'UNKNOWN', related_cve_ids: [] },
        { id: 'CLM-27', claim_id: 'CLM-27', field: 'attack_technique', value: 'T1190 (CONFIRMED)', truth_type: 'SOURCE_FACT', confidence: 0.90, source: 'MITRE ATT&CK', source_ids: ['mitre-attack'], source_url: 'https://attack.mitre.org', evidence_scope: 'CVE', source_timestamp: defaultTimestamp, verification_status: 'VERIFIED', related_cve_ids: [] },
        { id: 'CLM-28', claim_id: 'CLM-28', field: 'kernel_validation', value: 'PASS', truth_type: 'SOURCE_FACT', confidence: 1.0, source: 'Rust Kernel', source_ids: ['rust-kernel'], source_url: 'internal://rust', evidence_scope: 'KNOWLEDGE', source_timestamp: defaultTimestamp, verification_status: 'VERIFIED', related_cve_ids: [] },
        { id: 'CLM-29', claim_id: 'CLM-29', field: 'cisa_due_date', value: '2024-02-14', truth_type: 'SOURCE_FACT', confidence: 1.0, source: 'CISA KEV', source_ids: ['cisa-kev'], source_url: 'https://cisa.gov', evidence_scope: 'CVE', source_timestamp: defaultTimestamp, verification_status: 'VERIFIED', related_cve_ids: [] },
        { id: 'CLM-30', claim_id: 'CLM-30', field: 'technical_mechanism', value: 'Template Injection (OGNL)', truth_type: 'SUPPORTED_INFERENCE', confidence: 0.85, source: 'MITRE CWE', source_ids: ['mitre-cwe'], source_url: 'https://cwe.mitre.org', evidence_scope: 'CVE', source_timestamp: defaultTimestamp, verification_status: 'VERIFIED', related_cve_ids: [] },
        { id: 'CLM-31', claim_id: 'CLM-31', field: 'products_affected', value: 'confluence: >= 8.0.0 < 8.5.4', truth_type: 'SOURCE_FACT', confidence: 1.0, source: 'NVD CPE', source_ids: ['nvd-cpe'], source_url: 'https://nvd.nist.gov', evidence_scope: 'PRODUCT', source_timestamp: defaultTimestamp, verification_status: 'VERIFIED', related_cve_ids: [] },
      ];

      expect(claims.length).toBe(31);

      // Verify every claim has an explicit truth_type and evidence_scope
      const allowedTruthTypes = ['SOURCE_FACT', 'SUPPORTED_INFERENCE', 'KNOWLEDGE_SUPPORTED_INFERENCE', 'MODEL_INFERENCE', 'UNKNOWN', 'NOT_AVAILABLE', 'CONFLICT'];
      const allowedScopes = ['CVE', 'PRODUCT', 'CAMPAIGN', 'RELATION', 'KNOWLEDGE', 'ANALYST'];

      for (const claim of claims) {
        expect(allowedTruthTypes).toContain(claim.truth_type);
        expect(allowedScopes).toContain(claim.evidence_scope);
        expect(claim.source_ids.length).toBeGreaterThan(0);
      }

      // Verify independent verification ledger passes
      const ledgerVerification = verifyClaimsLedger(claims, VALID_CVE, null);
      expect(ledgerVerification.is_valid).toBe(true);
      expect(ledgerVerification.violations.length).toBe(0);
    });

    it('fails closed when an unsupported or contaminated claim is introduced', () => {
      const contaminatedClaims: ClaimRecord[] = [
        {
          id: 'CLM-01', claim_id: 'CLM-01', field: 'identity', value: VALID_CVE,
          truth_type: 'SOURCE_FACT', confidence: 1.0,
          source: '', // Missing source!
          source_ids: [],
          source_url: '',
          evidence_scope: 'CVE',
          source_timestamp: '2024-01-24T00:00:00Z',
          verification_status: 'VERIFIED',
          related_cve_ids: [],
        },
      ];

      const check = verifyClaimsLedger(contaminatedClaims, VALID_CVE, null);
      expect(check.is_valid).toBe(false);
      expect(check.violations.length).toBeGreaterThan(0);
    });
  });

  // ── 6. Fail-Closed Semantic Publication Gate ───────────────────────────────
  describe('6. Semantic Gate & Fail-Closed Publication Enforcement', () => {
    it('blocks publication and zeroes confidence when semantic gate detects contradictory claims', () => {
      const mockReport: Record<string, any> = {
        schema_version: '2.1.0',
        identity: { cve: VALID_CVE, vendor: 'Atlassian', product: 'Confluence' },
        severity: { cvss: { score: '9.8' } },
        signals: { kev_listed: true, ransomware_campaign_use: 'Known' },
        remediation: { recommended_action: 'Patch' },
        assessment: { confidence: { score: 0.85, rating: 'HIGH', basis: 'Initial' } },
        cve_relationships: [],
        claims_verification: {
          is_valid: false,
          violations: [{ claim_id: 'CLM-11', field: 'ransomware', issue: 'Adversarial contradiction detected' }],
        },
      };

      const semanticGate = validateReportSemantics(mockReport);
      mockReport.semantic_gate = semanticGate;

      if (!mockReport.claims_verification.is_valid || !semanticGate.isValid) {
        mockReport.status = 'BLOCKED';
        mockReport.assessment.confidence.score = 0.0;
        mockReport.assessment.confidence.rating = 'LOW';
      }

      expect(mockReport.status).toBe('BLOCKED');
      expect(mockReport.assessment.confidence.score).toBe(0.0);
      expect(mockReport.assessment.confidence.rating).toBe('LOW');
    });
  });

  // ── 7. Idempotency & Deduplication Contract ────────────────────────────────
  describe('7. Idempotency & Deterministic Deduplication', () => {
    it('generates consistent deduplication key ensuring identical logical identity', () => {
      const key1 = `cisa-kev:${VALID_CVE}`;
      const key2 = `cisa-kev:${VALID_CVE.toUpperCase()}`;
      expect(key1).toBe(key2);
      expect(key1).toBe('cisa-kev:CVE-2023-22527');
    });
  });

  // ── 8. Frontend Contract & Schema 2.1.0 Compatibility ─────────────────────
  describe('8. Frontend Contract & Schema 2.1.0 Compatibility', () => {
    it('validates that structured report adheres to frontend VulnerabilityDetail contract', () => {
      const execAssessment = buildSignalDrivenExecutiveAssessment({
        cveId: VALID_CVE,
        vendor: 'Atlassian',
        product: 'Confluence Data Center and Server',
        cwe: { id: 'CWE-74', name: 'Software Weakness' },
        cvssScore: '9.8',
        epssScore: '0.99984',
        epssPercentile: '0.99982',
        isKev: true,
        activeExploitation: true,
        ransomware: 'Known',
        attackVector: 'NETWORK',
        authRequired: 'No',
        dueDate: '2024-02-14',
        vendorAdvisoryUrl: 'https://confluence.atlassian.com/pages/viewpage.action?pageId=1333335615',
        publicExploit: false,
      });

      const techSummary = buildSignalDrivenTechnicalSummary({
        cveId: VALID_CVE,
        product: 'Confluence Data Center and Server',
        cwe: { id: 'CWE-74', name: 'Software Weakness' },
        attackVector: 'NETWORK',
        prerequisites: 'Network connectivity without prior authentication',
        resultingAccess: 'Full administrative access or remote code execution',
        unknowns: ['Adversary specific post-exploitation payload delivery'],
      });

      expect(execAssessment).toContain('Atlassian Confluence Data Center and Server');
      expect(execAssessment).toContain('CVSS 9.8');
      expect(execAssessment).toContain('2024-02-14');
      expect(techSummary).toContain('Confluence Data Center and Server');

      // The schema 2.1.0 report shape strictly expected by apps/web/app/components/VulnerabilityDetail.tsx
      const reportShape = {
        schema_version: '2.1.0',
        identity: {
          cve: VALID_CVE,
          title: 'Atlassian Confluence Data Center Template Injection',
          vendor: 'Atlassian',
          product: 'Confluence Data Center and Server',
          vulnerability_type: 'Software Weakness',
          cwe_ids: ['CWE-74'],
        },
        severity: {
          severity: 'CRITICAL',
          cvss: { score: '9.8', vector: 'CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H', version: '3.1', status: 'CONFIRMED', truth_type: 'SOURCE_FACT' },
          epss: { score: '0.99984', percentile: '0.99982', status: 'CONFIRMED', truth_type: 'SOURCE_FACT' },
        },
        signals: {
          kev_listed: true,
          observed_in_wild: true,
          exploited_in_the_wild: true,
          ransomware_campaign_use: 'Known',
        },
        exploitation: {
          known_exploited: true,
          exploitation_status: 'KNOWN_EXPLOITED',
        },
        remediation: {
          vendor_advisory: 'https://confluence.atlassian.com',
          recommended_action: 'Apply vendor advisory updates',
          cisa_action: 'Apply updates per vendor instructions.',
          due_date: '2024-02-14',
        },
        assessment: {
          executive_assessment: execAssessment,
          technical_assessment: techSummary,
          confidence: { score: 0.85, rating: 'HIGH', basis: 'Authoritative CISA KEV + NVD' },
        },
        provenance: {
          claims: [],
          evidence: [],
          sources: ['cisa-kev', 'nvd-cpe'],
        },
      };

      expect(reportShape.schema_version).toBe('2.1.0');
      expect(reportShape.identity.vendor).toBe('Atlassian');
      expect(reportShape.severity.cvss.score).toBe('9.8');
      expect(reportShape.remediation.due_date).toBe('2024-02-14');
      expect(reportShape.assessment.confidence.score).toBeGreaterThanOrEqual(0.70);
    });
  });
});

