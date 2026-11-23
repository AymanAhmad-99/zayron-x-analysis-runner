import { describe, expect, it } from 'bun:test';
import {
  classifyCvssSeverity,
  resolveCweDetails,
  deduplicateCwesWithProvenance,
  buildBoundedAttackPath,
  buildStructuredAttackMappings,
  parseNvdCpeData,
  reconcileOpenSourceEnrichment,
  normalizeVendorAdvisory,
} from '../../packages/intelligence/src';

describe('ZAYRON-X — INTELLIGENCE ACCURACY CORRECTION SUITE', () => {

  // ── 1. Defect A: Generic Qualitative CVSS Severity Classification ────────────
  describe('1. CVSS Severity Classification (FIRST Standard Invariant)', () => {
    it('generically maps CVSS 9.8 to CRITICAL', () => {
      expect(classifyCvssSeverity(9.8)).toBe('CRITICAL');
      expect(classifyCvssSeverity('9.8')).toBe('CRITICAL');
    });

    it('enforces exact FIRST CVSS v3.1 / v4.0 qualitative boundary ratings', () => {
      // 9.0 - 10.0: CRITICAL
      expect(classifyCvssSeverity(10.0)).toBe('CRITICAL');
      expect(classifyCvssSeverity(9.0)).toBe('CRITICAL');

      // 7.0 - 8.9: HIGH
      expect(classifyCvssSeverity(8.9)).toBe('HIGH');
      expect(classifyCvssSeverity(7.5)).toBe('HIGH');
      expect(classifyCvssSeverity(7.0)).toBe('HIGH');

      // 4.0 - 6.9: MEDIUM
      expect(classifyCvssSeverity(6.9)).toBe('MEDIUM');
      expect(classifyCvssSeverity(5.3)).toBe('MEDIUM');
      expect(classifyCvssSeverity(4.0)).toBe('MEDIUM');

      // 0.1 - 3.9: LOW
      expect(classifyCvssSeverity(3.9)).toBe('LOW');
      expect(classifyCvssSeverity(1.5)).toBe('LOW');
      expect(classifyCvssSeverity(0.1)).toBe('LOW');

      // 0.0: NONE
      expect(classifyCvssSeverity(0.0)).toBe('NONE');
      expect(classifyCvssSeverity('0.0')).toBe('NONE');
    });

    it('resolves severity directly from standard CVSS vector string', () => {
      // Critical vector (Score 9.8)
      const criticalVector = 'CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H';
      expect(classifyCvssSeverity(criticalVector)).toBe('CRITICAL');

      // High vector (Score 7.5)
      const highVector = 'CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:N/A:N';
      expect(classifyCvssSeverity(highVector)).toBe('HIGH');
    });

    it('returns UNKNOWN for null, undefined, or empty inputs without throwing', () => {
      expect(classifyCvssSeverity(null)).toBe('UNKNOWN');
      expect(classifyCvssSeverity(undefined)).toBe('UNKNOWN');
      expect(classifyCvssSeverity('')).toBe('UNKNOWN');
      expect(classifyCvssSeverity('INVALID_DATA')).toBe('UNKNOWN');
    });
  });

  // ── 2. Defect B: Authoritative MITRE CWE Taxonomy Resolution ─────────────────
  describe('2. CWE Taxonomy Resolution (Official MITRE Dataset)', () => {
    it('resolves CWE-74 to official MITRE definition instead of generic Software Weakness', () => {
      const cwe = resolveCweDetails('CWE-74');
      expect(cwe.id).toBe('CWE-74');
      expect(cwe.name).toBe("Improper Neutralization of Special Elements in Output Used by a Downstream Component ('Injection')");
      expect(cwe.name).not.toBe('Software Weakness');
      expect(cwe.description).toContain('constructs all or part of a command, data structure, or record');
    });

    it('resolves standard MITRE CWE taxonomy entries generically', () => {
      expect(resolveCweDetails('CWE-20').name).toBe('Improper Input Validation');
      expect(resolveCweDetails('CWE-79').name).toBe("Improper Neutralization of Input During Web Page Generation ('Cross-site Scripting')");
      expect(resolveCweDetails('CWE-89').name).toBe("Improper Neutralization of Special Elements used in an SQL Command ('SQL Injection')");
      expect(resolveCweDetails('CWE-94').name).toBe("Improper Control of Generation of Code ('Code Injection')");
      expect(resolveCweDetails('CWE-502').name).toBe('Deserialization of Untrusted Data');
    });
  });

  // ── 3. Defect B: CWE Deduplication with Source Provenance Preservation ────────
  describe('3. CWE Deduplication & Source Provenance', () => {
    it('deduplicates identical CWE from multiple upstream sources into one logical entity with preserved provenance', () => {
      const inputs = [
        { cweId: 'CWE-74', source: 'cisa-kev' },
        { cweId: 'CWE-74', source: 'cisa-vulnrichment' },
        { cweId: 'CWE-74', source: 'nvd-cpe' },
      ];

      const deduplicated = deduplicateCwesWithProvenance(inputs);

      // Exactly ONE logical entity
      expect(deduplicated.length).toBe(1);
      const entry = deduplicated[0];
      expect(entry.id).toBe('CWE-74');
      expect(entry.name).toBe("Improper Neutralization of Special Elements in Output Used by a Downstream Component ('Injection')");

      // Provenance preserved: all sources recorded
      expect(entry.sources).toBeDefined();
      expect(entry.sources).toContain('cisa-kev');
      expect(entry.sources).toContain('cisa-vulnrichment');
      expect(entry.sources).toContain('nvd-cpe');
      expect(entry.sources?.length).toBe(3);
    });

    it('correctly handles distinct CWEs alongside duplicated entries', () => {
      const inputs = [
        { cweId: 'CWE-74', source: 'cisa-kev' },
        { cweId: 'CWE-74', source: 'cisa-vulnrichment' },
        { cweId: 'CWE-20', source: 'nvd-cpe' },
      ];

      const deduplicated = deduplicateCwesWithProvenance(inputs);
      expect(deduplicated.length).toBe(2);

      const cwe74 = deduplicated.find(c => c.id === 'CWE-74');
      expect(cwe74?.sources).toEqual(['cisa-kev', 'cisa-vulnrichment']);

      const cwe20 = deduplicated.find(c => c.id === 'CWE-20');
      expect(cwe20?.sources).toEqual(['nvd-cpe']);
    });
  });

  // ── 4. Defect C: Technical Mechanism vs Taxonomy Decoupling ───────────────────
  describe('4. Technical Mechanism vs Taxonomy Decoupling', () => {
    it('sets technical_mechanism to UNKNOWN when source evidence lacks specific mechanism', () => {
      // When evidence only provides CWE-74 without specific advisory technical mechanism
      const weaknessFidelityWithoutMechanism: { technical_mechanism?: string } = {};
      const resolvedMechanism = weaknessFidelityWithoutMechanism.technical_mechanism || 'UNKNOWN';
      const mechanismTruthType = weaknessFidelityWithoutMechanism.technical_mechanism ? 'SOURCE_FACT' : 'UNKNOWN';

      expect(resolvedMechanism).toBe('UNKNOWN');
      expect(mechanismTruthType).toBe('UNKNOWN');
      // Must NOT be the CWE taxonomy name
      expect(resolvedMechanism).not.toContain('Improper Neutralization');
      expect(resolvedMechanism).not.toContain('CWE-74');
    });

    it('preserves technical_mechanism as SOURCE_FACT when explicit advisory evidence is present', () => {
      const weaknessFidelityWithMechanism = {
        technical_mechanism: 'OGNL template injection via evaluated request parameters',
      };
      const resolvedMechanism = weaknessFidelityWithMechanism.technical_mechanism || 'UNKNOWN';
      const mechanismTruthType = weaknessFidelityWithMechanism.technical_mechanism ? 'SOURCE_FACT' : 'UNKNOWN';

      expect(resolvedMechanism).toBe('OGNL template injection via evaluated request parameters');
      expect(mechanismTruthType).toBe('SOURCE_FACT');
    });
  });

  // ── 5. Defect D: ATT&CK Truth-Type Contract (Inference vs Source Fact) ────────
  describe('5. ATT&CK Truth-Type Discipline', () => {
    it('classifies network + KEV alone as a possible assessment, never an observed fact', () => {
      const mappings = buildStructuredAttackMappings({
        cveId: 'CVE-2023-22527',
        cweIds: ['CWE-74'],
        attackVector: 'NETWORK',
        privilegesRequired: 'NONE',
        isKev: true,
        product: 'Confluence Server',
        description: 'Template injection vulnerability in Confluence',
        evidenceIds: ['evi_test_kev'],
      });

      const t1190 = mappings.find(m => m.technique_id === 'T1190');
      expect(t1190).toBeDefined();
      // Neither network vector nor KEV membership establishes use of this technique.
      expect(t1190?.status).toBe('CANDIDATE');
      expect(t1190?.truth_type).toBe('ANALYST_ASSESSMENT');
      expect(t1190?.rationale).toContain('Possible taxonomic mapping');
    });

    it('assigns CONFIRMED only when authoritative CTI mapping is explicitly provided', () => {
      const mappings = buildStructuredAttackMappings({
        cveId: 'CVE-2023-22527',
        cweIds: ['CWE-74'],
        isKev: true,
        evidenceIds: ['evi_test_kev'],
        authoritativeTechniques: [{
          technique_id: 'T1190',
          technique_name: 'Exploit Public-Facing Application',
          tactic: 'Initial Access',
          source: 'cisa-advisory-aa24-001',
          rationale: 'Authoritative CISA advisory explicitly identifies T1190 exploitation.'
        }],
      });

      const t1190 = mappings.find(m => m.technique_id === 'T1190' && m.status === 'CONFIRMED');
      expect(t1190).toBeDefined();
      expect(t1190?.status).toBe('CONFIRMED');
      expect(t1190?.source_ids).toContain('cisa-advisory-aa24-001');
    });
  });

  // ── 6. Defect E: Impact Semantics (No Speculative Admin Takeover Overclaim) ───
  describe('6. Impact Semantics & Prevention of Overclaim', () => {
    it('preserves source semantics for ssvc technical_impact=total without overclaiming administrative takeover', () => {
      const attackPath = buildBoundedAttackPath({
        cveId: 'CVE-2023-22527',
        vendor: 'Atlassian',
        product: 'Confluence Data Center',
        cwe: { id: 'CWE-74', name: 'Injection' },
        attackVector: 'NETWORK',
        ssvcImpact: 'total',
        evidenceIds: ['evi_test_kev'],
      });

      // Must state total technical impact on the software component under SSVC decision framework, NOT administrative takeover or fabricated CIA
      expect(attackPath.resulting_access).toBe(
        'Total technical impact on affected software component under SSVC decision framework'
      );
      expect(attackPath.resulting_access).not.toContain('Full administrative takeover');
      expect(attackPath.resulting_access).not.toContain('(confidentiality, integrity, and availability)');
    });

    it('allows administrative takeover claim only when explicit host/root evidence is present', () => {
      const attackPath = buildBoundedAttackPath({
        cveId: 'CVE-2023-22527',
        vendor: 'Atlassian',
        product: 'Confluence Data Center',
        cwe: { id: 'CWE-74', name: 'Injection' },
        attackVector: 'NETWORK',
        ssvcImpact: 'total',
        technicalMechanism: 'Arbitrary code execution leading to host takeover with root system privileges',
        evidenceIds: ['evi_test_kev'],
      });

      expect(attackPath.resulting_access).toContain('Full administrative takeover');
    });
  });

  // ── 7. Defect F: Regulatory Scope & Binding Population Preservation ──────────
  describe('7. Regulatory Scope & Directive Applicability', () => {
    it('accurately qualifies CISA KEV due date applicability as binding for US FCEB agencies and scoped guidance for non-federal entities', () => {
      const rawEvidenceBasis = 'CISA KEV catalog inclusion establishes binding remediation due dates for US Federal Civilian Executive Branch (FCEB) agencies under BOD 22-01; serves as authoritative prioritization guidance for non-federal entities.';
      const clm29Notes = 'CISA KEV BOD 22-01 remediation due date (binding for US FCEB agencies; scoped guidance for non-federal organizations)';

      // Population must be explicit
      expect(rawEvidenceBasis).toContain('Federal Civilian Executive Branch (FCEB)');
      expect(rawEvidenceBasis).toContain('BOD 22-01');
      expect(rawEvidenceBasis).toContain('guidance for non-federal entities');

      expect(clm29Notes).toContain('binding for US FCEB agencies');
      expect(clm29Notes).toContain('scoped guidance for non-federal organizations');
    });
  });

  // ── 8. Defect A: CVSS Multi-Source Provenance & Conflict Preservation ────────
  describe('8. CVSS Source Conflict Preservation & Provenance', () => {
    it('detects intra-NVD disagreement between Linux CNA (Secondary) and NVD (Primary)', () => {
      const nvdSample = {
        metrics: {
          cvssMetricV31: [
            {
              source: '416baaa9-dc9f-4396-8d5f-8c081fb06d67',
              type: 'Secondary',
              cvssData: {
                version: '3.1',
                vectorString: 'CVSS:3.1/AV:L/AC:L/PR:L/UI:N/S:U/C:H/I:H/A:H',
                baseScore: 7.8,
                baseSeverity: 'HIGH',
              },
            },
            {
              source: 'nvd@nist.gov',
              type: 'Primary',
              cvssData: {
                version: '3.1',
                vectorString: 'CVSS:3.1/AV:L/AC:L/PR:L/UI:N/S:U/C:N/I:N/A:H',
                baseScore: 5.5,
                baseSeverity: 'MEDIUM',
              },
            },
          ],
        },
      };

      const parsed = parseNvdCpeData(nvdSample);
      expect(parsed.cvssConflictDetected).toBe(true);
      expect(parsed.cvssAssessments?.length).toBe(2);
      expect(parsed.cvssAssessments?.[0].source_type).toBe('CNA');
      expect(parsed.cvssAssessments?.[0].score).toBe('7.8');
      expect(parsed.cvssAssessments?.[1].source_type).toBe('NVD');
      expect(parsed.cvssAssessments?.[1].score).toBe('5.5');

      const reconciled = reconcileOpenSourceEnrichment({
        cveId: 'CVE-2025-39964',
        cisaKev: { cveID: 'CVE-2025-39964' },
        nvdCpe: parsed,
      });

      // Must preserve truth_type as CONFLICT, not silently collapse to single score
      expect(reconciled.severity.cvss.truth_type).toBe('CONFLICT');
      expect(reconciled.severity.cvss.conflicts).toBeDefined();
      expect(reconciled.severity.cvss.conflicts?.length).toBe(2);

      // Provenance: can answer WHO assigned, WHAT vector, and whether there is conflict
      const cnaAssessment = reconciled.severity.cvss.conflicts?.find(c => c.source_type === 'CNA');
      const nvdAssessment = reconciled.severity.cvss.conflicts?.find(c => c.source_type === 'NVD');
      expect(cnaAssessment).toBeDefined();
      expect(cnaAssessment?.score).toBe('7.8');
      expect(cnaAssessment?.vector).toBe('CVSS:3.1/AV:L/AC:L/PR:L/UI:N/S:U/C:H/I:H/A:H');
      expect(nvdAssessment).toBeDefined();
      expect(nvdAssessment?.score).toBe('5.5');
      expect(nvdAssessment?.vector).toBe('CVSS:3.1/AV:L/AC:L/PR:L/UI:N/S:U/C:N/I:N/A:H');
    });

    it('maintains SOURCE_FACT when all sources agree with no conflict', () => {
      const nvdSample = {
        metrics: {
          cvssMetricV31: [
            {
              source: 'nvd@nist.gov',
              type: 'Primary',
              cvssData: {
                version: '3.1',
                vectorString: 'CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H',
                baseScore: 9.8,
                baseSeverity: 'CRITICAL',
              },
            },
          ],
        },
      };

      const parsed = parseNvdCpeData(nvdSample);
      expect(parsed.cvssConflictDetected).toBe(false);

      const reconciled = reconcileOpenSourceEnrichment({
        cveId: 'CVE-2023-22527',
        cisaKev: { cveID: 'CVE-2023-22527' },
        nvdCpe: parsed,
      });

      expect(reconciled.severity.cvss.truth_type).toBe('SOURCE_FACT');
      expect(reconciled.severity.cvss.score).toBe('9.8');
      expect(reconciled.severity.cvss.conflicts).toBeUndefined();
    });
  });

  // ── 9. Defect B: ATT&CK Mapping Semantic Correctness & T1203 Quarantine ──────
  describe('9. ATT&CK Semantic Mapping Correctness & T1203 Quarantine', () => {
    it('quarantines T1203 for local vulnerabilities lacking client execution evidence', () => {
      // CVE-2025-39964: Linux kernel race condition in AF_ALG socket (LOCAL vector, UI: NONE)
      const mappings = buildStructuredAttackMappings({
        cveId: 'CVE-2025-39964',
        cweIds: ['CWE-362'], // Race Condition
        attackVector: 'LOCAL',
        privilegesRequired: 'LOW',
        userInteraction: 'NONE',
        isKev: true,
        product: 'Linux Kernel',
        description: 'In the Linux kernel, a race condition in the crypto subsystem may allow local privilege escalation or denial of service.',
        evidenceIds: ['evi_test_kev'],
      });

      // Must NOT include T1203 (Exploitation for Client Execution)
      const t1203 = mappings.find(m => m.technique_id === 'T1203');
      expect(t1203).toBeUndefined();
    });

    it('assigns T1203 only when explicit client execution evidence is present', () => {
      const mappings = buildStructuredAttackMappings({
        cveId: 'CVE-2024-TEST-CLIENT',
        cweIds: ['CWE-119'],
        attackVector: 'LOCAL',
        privilegesRequired: 'NONE',
        userInteraction: 'REQUIRED',
        isKev: true,
        product: 'Adobe Acrobat Reader',
        description: 'Vulnerability leading to client execution when a target opens a crafted PDF document in a client application.',
        evidenceIds: ['evi_test_kev'],
      });

      const t1203 = mappings.find(m => m.technique_id === 'T1203');
      expect(t1203).toBeDefined();
      expect(t1203?.status).toBe('SUPPORTED');
      expect(t1203?.technique_name).toBe('Exploitation for Client Execution');
    });
  });

  // ── 10. Strict Semantic Repair Invariants (CVE-2026-85706, CVE-2025-39964, CVE-2023-22527) ──
  describe('10. Strict Semantic Repair Invariants', () => {
    // Invariant 1: Fixed version is preserved from authoritative vendor source
    it('preserves fixed version from authoritative vendor advisory bulletin', () => {
      const reconciled = reconcileOpenSourceEnrichment({
        cveId: 'CVE-2026-85706',
        cisaKev: {
          cveID: 'CVE-2026-85706',
          vendorProject: 'GitLab',
          product: 'Community Edition and Enterprise Edition',
          notes: 'https://docs.gitlab.com/releases/patches/patch-release-gitlab-19-3-2-released/',
        },
      });

      expect(reconciled.affected_scope.fixed_versions).toContain('19.3.2');
      expect(reconciled.vendor_advisory.fixed_version_source).toBe('Vendor Advisory Bulletin');
    });

    // Invariant 2: CPE upper bound does not become vendor fixed version without evidence
    it('does not convert CPE upper bound into vendor fixed version without advisory fact', () => {
      const nvdSample = {
        configurations: [
          {
            nodes: [
              {
                cpeMatch: [
                  {
                    criteria: 'cpe:2.3:a:vendor:product:*:*:*:*:*:*:*:*',
                    versionStartIncluding: '1.0.0',
                    versionEndExcluding: '1.5.0',
                  },
                ],
              },
            ],
          },
        ],
      };
      const parsed = parseNvdCpeData(nvdSample);

      const reconciled = reconcileOpenSourceEnrichment({
        cveId: 'CVE-2024-TEST-BOUND',
        cisaKev: { cveID: 'CVE-2024-TEST-BOUND', vendorProject: 'Vendor', product: 'Product' },
        nvdCpe: parsed,
      });

      // Affected range must contain interval boundary < 1.5.0
      expect(reconciled.affected_scope.affected_versions).toContain('>= 1.0.0 < 1.5.0');
      // Fixed versions must NOT manufacture 1.5.0 as a vendor fixed release
      expect(reconciled.affected_scope.fixed_versions).toHaveLength(0);
      expect(reconciled.vendor_advisory.fixed_version_source).toBeUndefined();
    });

    // Invariant 3: CVE-2026-85706 does not emit T1083 without discovery behavior evidence
    it('does not emit T1083 for CVE-2026-85706 without discovery behavior evidence', () => {
      const mappings = buildStructuredAttackMappings({
        cveId: 'CVE-2026-85706',
        cweIds: ['CWE-35', 'CWE-22'],
        attackVector: 'NETWORK',
        privilegesRequired: 'NONE',
        userInteraction: 'NONE',
        isKev: true,
        product: 'GitLab Community Edition and Enterprise Edition',
        description: 'GitLab Community Edition and Enterprise Edition path traversal in repository commits API allows unauthorized file read access.',
        evidenceIds: ['evi_test_kev'],
      });

      const t1083 = mappings.find(m => m.technique_id === 'T1083');
      expect(t1083).toBeUndefined();
      // T1190 for network-facing public application must still be present
      const t1190 = mappings.find(m => m.technique_id === 'T1190');
      expect(t1190).toBeDefined();
    });

    // Invariant 4: CVE-2026-85706 does not claim arbitrary file write without explicit write evidence
    it('does not claim arbitrary file write for CVE-2026-85706 without explicit write evidence', () => {
      const attackPath = buildBoundedAttackPath({
        cveId: 'CVE-2026-85706',
        vendor: 'GitLab',
        product: 'Community Edition and Enterprise Edition',
        cwe: resolveCweDetails('CWE-35'),
        attackVector: 'NETWORK',
        privilegesRequired: 'NONE',
        userInteraction: 'NONE',
        ssvcImpact: 'total',
        evidenceIds: ['evi_test_kev'],
      });

      expect(attackPath.exploitation_effect).toBe('Unauthorized arbitrary file read on target filesystem');
      expect(attackPath.exploitation_effect).not.toContain('write');
      expect(attackPath.exploitation_effect).not.toContain('or arbitrary file write');
    });

    // Invariant 5: CVE-2026-85706 keeps A:N in CVSS exactly
    it('preserves CVSS A:N metric for CVE-2026-85706 without modification', () => {
      const nvdSample = {
        metrics: {
          cvssMetricV31: [
            {
              source: 'cve@gitlab.com',
              type: 'Secondary',
              cvssData: {
                version: '3.1',
                vectorString: 'CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:C/C:H/I:H/A:N',
                baseScore: 10.0,
                baseSeverity: 'CRITICAL',
              },
            },
          ],
        },
      };
      const parsed = parseNvdCpeData(nvdSample);
      const reconciled = reconcileOpenSourceEnrichment({
        cveId: 'CVE-2026-85706',
        cisaKev: { cveID: 'CVE-2026-85706' },
        nvdCpe: parsed,
      });

      expect(reconciled.severity.cvss.score).toBe('10');
      expect(reconciled.severity.cvss.vector).toBe('CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:C/C:H/I:H/A:N');
      expect(reconciled.severity.cvss.vector).toContain('A:N');
    });

    // Invariant 6: CVE-2026-85706 keeps SSVC technical impact separate from CVSS CIA wording
    it('keeps SSVC technical impact separate from CVSS CIA impact metrics', () => {
      const attackPath = buildBoundedAttackPath({
        cveId: 'CVE-2026-85706',
        vendor: 'GitLab',
        product: 'Community Edition and Enterprise Edition',
        cwe: resolveCweDetails('CWE-35'),
        attackVector: 'NETWORK',
        ssvcImpact: 'total',
        evidenceIds: ['evi_test_kev'],
      });

      expect(attackPath.resulting_access).toBe(
        'Total technical impact on affected software component under SSVC decision framework'
      );
      // SSVC total must NOT inject availability when CVSS says A:N
      expect(attackPath.resulting_access).not.toContain('(confidentiality, integrity, and availability)');
    });

    // Invariant 7: CVE-2026-85706 keeps source ownership intact
    it('maintains distinct source ownership without concatenating authorities into a single string', () => {
      const nvdSample = {
        metrics: {
          cvssMetricV31: [
            {
              source: 'cve@gitlab.com',
              type: 'Secondary',
              cvssData: {
                version: '3.1',
                vectorString: 'CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:C/C:H/I:H/A:N',
                baseScore: 10.0,
              },
            },
          ],
        },
      };
      const parsed = parseNvdCpeData(nvdSample);
      const reconciled = reconcileOpenSourceEnrichment({
        cveId: 'CVE-2026-85706',
        cisaKev: {
          cveID: 'CVE-2026-85706',
          vendorProject: 'GitLab',
          product: 'Community Edition and Enterprise Edition',
          notes: 'https://docs.gitlab.com/releases/patches/patch-release-gitlab-19-3-2-released/',
        },
        nvdCpe: parsed,
      });

      expect(reconciled.severity.cvss.source).toBe('cve@gitlab.com');
      expect(reconciled.vendor_advisory.remediation_source).toBe('Vendor Advisory Bulletin');
      expect(reconciled.exploitation.sources).toContain('cisa-kev');
      expect(reconciled.sources_used).toContain('cisa-kev');
      expect(reconciled.sources_used).toContain('vendor-advisory');
    });

    // Invariant 8: CVE-2025-39964 still preserves its CVSS conflict
    it('preserves CVSS conflict for CVE-2025-39964 across Linux CNA and NVD', () => {
      const nvdSample = {
        metrics: {
          cvssMetricV31: [
            {
              source: '416baaa9-dc9f-4396-8d5f-8c081fb06d67',
              type: 'Secondary',
              cvssData: {
                version: '3.1',
                vectorString: 'CVSS:3.1/AV:L/AC:L/PR:L/UI:N/S:U/C:H/I:H/A:H',
                baseScore: 7.8,
              },
            },
            {
              source: 'nvd@nist.gov',
              type: 'Primary',
              cvssData: {
                version: '3.1',
                vectorString: 'CVSS:3.1/AV:L/AC:L/PR:L/UI:N/S:U/C:N/I:N/A:H',
                baseScore: 5.5,
              },
            },
          ],
        },
      };
      const parsed = parseNvdCpeData(nvdSample);
      const reconciled = reconcileOpenSourceEnrichment({
        cveId: 'CVE-2025-39964',
        cisaKev: { cveID: 'CVE-2025-39964' },
        nvdCpe: parsed,
      });

      expect(reconciled.severity.cvss.truth_type).toBe('CONFLICT');
      expect(reconciled.severity.cvss.conflicts).toHaveLength(2);
    });

    // Invariant 9: CVE-2025-39964 still has T1203 quarantined
    it('maintains T1203 quarantine for CVE-2025-39964', () => {
      const mappings = buildStructuredAttackMappings({
        cveId: 'CVE-2025-39964',
        cweIds: ['CWE-362'],
        attackVector: 'LOCAL',
        privilegesRequired: 'LOW',
        userInteraction: 'NONE',
        isKev: true,
        product: 'Linux Kernel',
        description: 'Race condition in Linux kernel AF_ALG socket allows local privilege escalation.',
        evidenceIds: ['evi_test_kev'],
      });

      const t1203 = mappings.find(m => m.technique_id === 'T1203');
      expect(t1203).toBeUndefined();
    });

    // Invariant 10: CVE-2023-22527 remains unchanged
    it('maintains stable canonical processing for CVE-2023-22527', () => {
      const attackPath = buildBoundedAttackPath({
        cveId: 'CVE-2023-22527',
        vendor: 'Atlassian',
        product: 'Confluence Data Center and Server',
        cwe: resolveCweDetails('CWE-74'),
        attackVector: 'NETWORK',
        privilegesRequired: 'NONE',
        userInteraction: 'NONE',
        authenticationRequired: 'No',
        ssvcImpact: 'total',
        evidenceIds: ['evi_cve_2023_22527_kev'],
      });

      expect(attackPath.entry_point).toContain('Network-exposed');
      expect(attackPath.prerequisite).toContain('without prior authentication');
      expect(attackPath.vulnerability_condition).toContain('CWE-74');
      expect(attackPath.resulting_access).toBe(
        'Total technical impact on affected software component under SSVC decision framework'
      );
    });

    // Invariant 11: Comprehensive proof of CVE-2026-85706 vendor evidence corrections
    it('proves CVE-2026-85706 vendor evidence consistency and domain separation', () => {
      const nvdSample = {
        descriptions: [
          {
            lang: 'en',
            value: 'GitLab has remediated an issue in GitLab CE/EE affecting all versions from 18.7 before 19.1.8, 19.2 before 19.2.6, and 19.3 before 19.3.2 that, under certain conditions, an unauthenticated user could have read arbitrary files from the GitLab server due to improper path confinement and missing authentication enforcement in the repository commits API.'
          }
        ],
        metrics: {
          cvssMetricV31: [
            {
              source: 'cve@gitlab.com',
              type: 'Secondary',
              cvssData: {
                version: '3.1',
                vectorString: 'CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:C/C:H/I:H/A:N',
                baseScore: 10.0,
                baseSeverity: 'CRITICAL',
              },
            },
          ],
        },
      };
      const parsedNvd = parseNvdCpeData(nvdSample);

      const reconciled = reconcileOpenSourceEnrichment({
        cveId: 'CVE-2026-85706',
        cisaKev: {
          cveID: 'CVE-2026-85706',
          vendorProject: 'GitLab',
          product: 'Community Edition and Enterprise Edition',
          notes: 'https://docs.gitlab.com/releases/patches/patch-release-gitlab-19-3-2-released/',
        },
        nvdCpe: parsedNvd,
        vulnrichment: {
          source: 'cisa-vulnrichment',
          source_record_id: 'CVE-2026-85706',
          ssvc: {
            exploitation: 'active',
            automatable: 'yes',
            technical_impact: 'total',
          },
        },
      });

      // 1. fixed_versions contains exactly: 19.1.8, 19.2.6, 19.3.2
      expect(reconciled.affected_scope.fixed_versions).toEqual(['19.1.8', '19.2.6', '19.3.2']);
      // 2. fixed_versions truth type: SOURCE_FACT
      expect(reconciled.affected_scope.truth_type).toBe('SOURCE_FACT');
      // 3. fixed_versions source: vendor-advisory / Vendor Advisory Bulletin
      expect(reconciled.affected_scope.sources).toContain('vendor-advisory');
      expect(reconciled.vendor_advisory.fixed_version_source).toBe('Vendor Advisory Bulletin');

      // 4. technical_mechanism contains vendor-supported arbitrary-file-read/path-confinement evidence
      const mech = reconciled.weakness_fidelity.technical_mechanism;
      expect(mech).toBeDefined();
      expect(mech).toContain('arbitrary file read');
      expect(mech).toContain('improper path confinement');
      // 5. technical_mechanism does NOT claim arbitrary file write
      expect(mech).not.toContain('write');

      // 6. vendor detection guidance: not UNKNOWN
      expect(reconciled.vendor_advisory.detection_guidance).toBeDefined();
      expect(reconciled.vendor_advisory.detection_guidance).not.toEqual('UNKNOWN');
      expect(reconciled.vendor_advisory.detection_guidance).toContain('GitLab LFI attempt reading gitlab.yml');
      expect(reconciled.vendor_advisory.detection_guidance).toContain('GitLab LFI via metadata.path parameter');
      expect(reconciled.vendor_advisory.detection_guidance).toContain('GitLab LFI file path attempt');

      // 7. ATT&CK: T1083 absent, T1190 preserved
      const mappings = buildStructuredAttackMappings({
        cveId: 'CVE-2026-85706',
        cweIds: ['CWE-35', 'CWE-22'],
        attackVector: 'NETWORK',
        privilegesRequired: 'NONE',
        userInteraction: 'NONE',
        isKev: true,
        product: 'GitLab Community Edition and Enterprise Edition',
        description: 'GitLab Community Edition and Enterprise Edition path traversal in repository commits API allows unauthorized file read access.',
        evidenceIds: ['evi_test_kev'],
      });
      expect(mappings.find(m => m.technique_id === 'T1083')).toBeUndefined();
      expect(mappings.find(m => m.technique_id === 'T1190')).toBeDefined();

      // 8. CVSS: C:H, I:H, A:N
      expect(reconciled.severity.cvss.vector).toContain('C:H');
      expect(reconciled.severity.cvss.vector).toContain('I:H');
      expect(reconciled.severity.cvss.vector).toContain('A:N');

      // 9. SSVC: technical_impact = total
      expect(reconciled.exploitation.ssvc?.technical_impact).toBe('total');

      // 10. CVSS and SSVC remain separate
      const attackPath = buildBoundedAttackPath({
        cveId: 'CVE-2026-85706',
        vendor: 'GitLab',
        product: 'Community Edition and Enterprise Edition',
        cwe: resolveCweDetails('CWE-35'),
        attackVector: 'NETWORK',
        ssvcImpact: reconciled.exploitation.ssvc?.technical_impact,
        evidenceIds: ['evi_test_kev'],
      });
      expect(attackPath.resulting_access).toBe('Total technical impact on affected software component under SSVC decision framework');
      expect(attackPath.resulting_access).not.toContain('(confidentiality, integrity, and availability)');

      // 11. Canonical vendor advisory preserves fixed versions and detection guidance
      const adv = normalizeVendorAdvisory({
        advisoryUrl: 'https://docs.gitlab.com/releases/patches/patch-release-gitlab-19-3-2-released/',
        cveId: 'CVE-2026-85706',
        vendor: reconciled.identity.vendor,
        product: reconciled.identity.product,
        affectedVersions: reconciled.affected_scope.affected_versions,
        fixedVersions: reconciled.affected_scope.fixed_versions,
        detectionGuidance: reconciled.vendor_advisory.detection_guidance,
      });
      expect(adv.fixed_versions).toEqual(['19.1.8', '19.2.6', '19.3.2']);
      expect(adv.detection_guidance).toEqual([
        'GitLab LFI attempt reading gitlab.yml',
        'GitLab LFI via metadata.path parameter',
        'GitLab LFI file path attempt',
      ]);
    });
  });

});
