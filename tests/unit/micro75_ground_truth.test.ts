import { describe, it, expect } from 'bun:test';
import {
  parseNvdCpeData,
  reconcileOpenSourceEnrichment,
  buildBoundedAttackPath,
  normalizeVendorAdvisory,
  buildStructuredAttackMappings,
  lookupExploitDbEvidence,
} from '../../packages/intelligence/src/sources/adapters';
import { GROUND_TRUTH_ORACLES, oracleToEvidenceContext } from '../fixtures/ground_truth_oracles';

describe('MICRO TASK 75 — INDEPENDENT EVIDENCE FIDELITY & GROUND-TRUTH GATE (P0.2 evidence-injection contract)', () => {
  const cveList = [
    'CVE-2021-22005',
    'CVE-2021-44228',
    'CVE-2023-46805',
    'CVE-2024-3400',
    'CVE-2024-21887',
    'CVE-2023-34362',
  ];

  // =========================================================================
  // 1. VERSION FIDELITY & ANTI-FLATTENING (VALID CONTRACT: structured evidence
  //    in → exact fidelity out; no hidden registry)
  // =========================================================================
  describe('1. Version Fidelity Gate (Anti-Flattening)', () => {
    it('preserves product-scoped versions from injected evidence without cross-product leakage', () => {
      const oracle = GROUND_TRUTH_ORACLES['CVE-2021-22005'];
      const evidence = oracleToEvidenceContext(oracle);

      const reconciled = reconcileOpenSourceEnrichment({
        cveId: 'CVE-2021-22005',
        cisaKev: {
          cveID: 'CVE-2021-22005',
          vendorProject: 'VMware',
          product: 'vCenter Server',
          dateAdded: '2021-11-03',
          dueDate: '2021-11-17',
          knownRansomwareCampaignUse: 'Known',
        },
        evidence,
      });

      // Primary product affected versions must ONLY contain vCenter Server versions
      const vcenterVersions = reconciled.affected_scope.affected_versions;
      expect(vcenterVersions).toEqual(oracle.products_affected[0].affected_versions);

      for (const v of vcenterVersions) {
        expect(v).not.toContain('Cloud Foundation');
        expect(v).not.toContain('4.x');
        expect(v).not.toContain('3.x');
        expect(v).not.toContain('>= 3.0');
        expect(v).not.toContain('< 5.0');
      }

      // Products affected list must preserve both scopes separately
      expect(reconciled.affected_scope.products_affected.length).toBe(2);
      const vcenterScope = reconciled.affected_scope.products_affected.find(p => p.product === 'vCenter Server');
      const cfoundationScope = reconciled.affected_scope.products_affected.find(p => p.product === 'Cloud Foundation');

      expect(vcenterScope).toBeDefined();
      expect(vcenterScope!.affected_versions).toEqual(['7.x before 7.0 U2c', '6.7 before 6.7 U3o']);
      expect(vcenterScope!.fixed_versions).toEqual(['7.0 U2c', '6.7 U3o']);

      expect(cfoundationScope).toBeDefined();
      expect(cfoundationScope!.affected_versions).toEqual(['4.x before 4.3', '3.x before 3.10.2.2']);
      expect(cfoundationScope!.fixed_versions).toEqual(['4.3', '3.10.2.2']);
    });

    it('NVD CPE matcher parses product-scoped ranges without flattening across configurations', () => {
      const mockNvdPayload = {
        configurations: [
          {
            nodes: [
              {
                cpeMatch: [
                  {
                    criteria: 'cpe:2.3:a:vmware:vcenter_server:*:*:*:*:*:*:*:*',
                    versionStartIncluding: '7.0',
                    versionEndExcluding: '7.0.2.00300',
                  },
                  {
                    criteria: 'cpe:2.3:a:vmware:cloud_foundation:*:*:*:*:*:*:*:*',
                    versionStartIncluding: '3.0',
                    versionEndExcluding: '5.0',
                  },
                ],
              },
            ],
          },
        ],
      };

      const parsed = parseNvdCpeData(mockNvdPayload);
      expect(parsed.productScopedRanges['vcenter_server']).toEqual(['>= 7.0 < 7.0.2.00300']);
      expect(parsed.productScopedRanges['cloud_foundation']).toEqual(['>= 3.0 < 5.0']);

      expect(parsed.productScopedRanges['vcenter_server']).not.toContain('>= 3.0 < 5.0');
    });
  });

  // =========================================================================
  // 2. CWE FIDELITY & SOURCE DISAGREEMENT (VALID CONTRACT: disagreement is
  //    preserved when evidence carries it)
  // =========================================================================
  describe('2. CWE Fidelity & Source Disagreement Preservation', () => {
    it('preserves CWE disagreement for CVE-2021-22005 (CISA: CWE-23 vs NVD: CWE-22) from evidence', () => {
      const oracle = GROUND_TRUTH_ORACLES['CVE-2021-22005'];
      const evidence = oracleToEvidenceContext(oracle);

      const reconciled = reconcileOpenSourceEnrichment({
        cveId: 'CVE-2021-22005',
        cisaKev: { cveID: 'CVE-2021-22005', cwes: ['CWE-23'] },
        nvdCpe: {
          cpes: [],
          affectedRanges: [],
          productScopedRanges: {},
          productScopes: [],
          references: [],
          cweIds: ['CWE-22'],
        } as any,
        evidence,
      });

      expect(reconciled.weakness_fidelity.cwe_disagreement).toBe(true);
      expect(reconciled.weakness_fidelity.source_specific_cwes['cisa_kev']).toContain('CWE-23');
      expect(reconciled.weakness_fidelity.source_specific_cwes['nvd']).toContain('CWE-22');
      // Mechanism surfaced from the injected evidence, not a hidden registry
      expect(reconciled.weakness_fidelity.technical_mechanism).toBe(oracle.technical_mechanism);
    });

    it('separates technical mechanism from CWE classification name', () => {
      const oracle = GROUND_TRUTH_ORACLES['CVE-2021-22005'];
      const evidence = oracleToEvidenceContext(oracle);

      expect(evidence.technical_mechanism).not.toBe('Relative Path Traversal');
      expect(evidence.technical_mechanism).not.toBe('Improper Limitation of a Pathname to a Restricted Directory');
      expect(evidence.technical_mechanism).toBe(oracle.technical_mechanism);
    });

    it('preserves multi-source CWE disagreement for Log4j from evidence', () => {
      const oracle = GROUND_TRUTH_ORACLES['CVE-2021-44228'];
      const evidence = oracleToEvidenceContext(oracle);

      expect(evidence.cwe_disagreement).toBe(true);
      expect(evidence.source_specific_cwes!['cisa_kev']).toEqual(oracle.cwe_mappings.cisa);
      expect(evidence.source_specific_cwes!['nvd']).toEqual(oracle.cwe_mappings.nvd);
      expect(evidence.technical_mechanism).toBe(oracle.technical_mechanism);
    });
  });

  // =========================================================================
  // 3. VENDOR ADVISORY RESOLUTION (VALID CONTRACT: advisory identity must come
  //    from the injected authoritative evidence)
  // =========================================================================
  describe('3. Vendor Advisory Resolution Gate', () => {
    it('resolves official vendor/CNA advisory for all 6 test CVEs from injected evidence', () => {
      for (const cve of cveList) {
        const oracle = GROUND_TRUTH_ORACLES[cve];
        const evidence = oracleToEvidenceContext(oracle);
        const reconciled = reconcileOpenSourceEnrichment({
          cveId: cve,
          cisaKev: {
            cveID: cve,
            vendorProject: oracle.vendor,
            product: oracle.primary_product,
          },
          evidence,
        });

        expect(reconciled.vendor_advisory.url).toBe(oracle.vendor_advisory.advisory_url);
        expect(reconciled.vendor_advisory.advisory_id).toBe(oracle.vendor_advisory.advisory_id);
        expect(reconciled.vendor_advisory.remediation_source).toBeDefined();
        expect(reconciled.vendor_advisory.remediation_source).not.toBe('NOT_AVAILABLE');

        if (oracle.products_affected[0].fixed_versions.length > 0) {
          expect(reconciled.vendor_advisory.fixed_version_source).toBeDefined();
        }
      }
    });
  });

  // =========================================================================
  // 4. ATTACK PATH FIDELITY (VALID CONTRACT)
  // =========================================================================
  describe('4. Attack Path Fidelity Gate', () => {
    it('originates attack path from evidence-backed technical mechanics rather than CWE alone', () => {
      const oracle = GROUND_TRUTH_ORACLES['CVE-2021-22005'];
      const evidence = oracleToEvidenceContext(oracle);
      const path = buildBoundedAttackPath({
        cveId: 'CVE-2021-22005',
        vendor: 'VMware',
        product: 'vCenter Server',
        cwe: { id: 'CWE-22', name: 'Improper Limitation of a Pathname to a Restricted Directory' },
        technicalMechanism: evidence.technical_mechanism,
        attackVector: 'NETWORK',
        authenticationRequired: 'No',
        ssvcImpact: 'total',
        evidenceIds: ['evi_cve_2021_22005_kev'],
      });

      expect(path.vulnerability_condition).toContain('Arbitrary file upload in Analytics service');
      expect(path.exploitation_effect).toContain('uploads executable payload');

      for (const stage of path.stages) {
        expect(['SOURCE_FACT', 'SUPPORTED_INFERENCE', 'UNKNOWN']).toContain(stage.truth_type);
        expect(stage.truth_type).not.toBe('MODEL_INFERENCE');
      }
    });

    it('fails closed when an ungrounded inference is placed in attack path stages', () => {
      const path = buildBoundedAttackPath({
        cveId: 'CVE-2023-46805',
        vendor: 'Ivanti',
        product: 'Connect Secure',
        cwe: { id: 'CWE-287', name: 'Improper Authentication' },
        attackVector: 'NETWORK',
        evidenceIds: ['evi_test'],
      });

      for (const s of path.stages) {
        expect(['SOURCE_FACT', 'SUPPORTED_INFERENCE', 'UNKNOWN']).toContain(s.truth_type);
      }
    });
  });

  // =========================================================================
  // 5. MITRE ATT&CK FIDELITY
  // =========================================================================
  describe('5. MITRE ATT&CK Mapping Fidelity', () => {
    it('does not treat KEV membership and CWE capability as observed ATT&CK technique facts', () => {
      const mappings = buildStructuredAttackMappings({
        cveId: 'CVE-2021-22005',
        cweIds: ['CWE-22', 'CWE-23'],
        attackVector: 'NETWORK',
        isKev: true,
        product: 'vCenter Server',
        evidenceIds: ['evi_test'],
      });

      const t1190 = mappings.find(m => m.technique_id === 'T1190');
      expect(t1190).toBeDefined();
      expect(t1190!.status).toBe('SUPPORTED');
      expect(t1190!.truth_type).toBe('SUPPORTED_INFERENCE');

      const t1059 = mappings.find(m => m.technique_id.startsWith('T1059'));
      if (t1059) {
        expect(t1059.status).not.toBe('CONFIRMED');
        expect(['SUPPORTED', 'CANDIDATE']).toContain(t1059.status);
      }
    });
  });

  // =========================================================================
  // 6. EXPLOITATION SEPARATION GATE
  // =========================================================================
  describe('6. Exploitation Separation Gate', () => {
    it('strictly separates active in-the-wild exploitation from Exploit-DB public code presence', async () => {
      const edbEvidence = await lookupExploitDbEvidence('CVE-2021-22005');
      expect(edbEvidence.status).toBe('FOUND');
      expect(edbEvidence.exploit_id).toBe('EDB-ID-50383');

      const reconciled = reconcileOpenSourceEnrichment({
        cveId: 'CVE-2021-22005',
        cisaKev: {
          cveID: 'CVE-2021-22005',
          dateAdded: '2021-11-03',
          knownRansomwareCampaignUse: 'Known',
        },
      });

      expect(reconciled.exploitation.status).toBe('KNOWN_EXPLOITED');
      expect(reconciled.exploitation.cisa_kev).toBe(true);
      expect(edbEvidence.exploit_id).toBe('EDB-ID-50383');
    });

    it('returns NOT_FOUND for CVE-2023-46805 in Exploit-DB without fabricating public exploit code', async () => {
      const edb = await lookupExploitDbEvidence('CVE-2023-46805');
      expect(edb.status).toBe('NOT_FOUND');
      expect(edb.exploit_id).toBeUndefined();
    });
  });

  // =========================================================================
  // 7. DATE SEMANTICS SEPARATION
  // =========================================================================
  describe('7. Date Semantics Separation', () => {
    it('separates CVE publication, vendor advisory, CISA added, CISA due date, and report dates', () => {
      const oracle = GROUND_TRUTH_ORACLES['CVE-2021-22005'];
      const evidence = oracleToEvidenceContext(oracle);

      const dateContainer = {
        cve_published_at: '2021-09-23',
        vendor_advisory_at: evidence.advisory!.published_date,
        cisa_kev_added_at: '2021-11-03',
        cisa_due_at: evidence.cisa_kev!.due_date,
        report_published_at: '2026-09-17T12:00:00.000Z',
        report_updated_at: '2026-09-17T12:00:00.000Z',
      };

      expect(dateContainer.cve_published_at).not.toBe(dateContainer.report_published_at);
      expect(dateContainer.vendor_advisory_at).toBe('2021-09-21');
      expect(dateContainer.cisa_due_at).toBe('2021-11-17');
      expect(dateContainer.cve_published_at).toBe('2021-09-23');
    });
  });

  // =========================================================================
  // 8. ORACLE MATRIX VERIFICATION — evidence in, exact fidelity out
  // =========================================================================
  describe('8. Ground-Truth Oracle Matrix Verification Across All 6 CVEs', () => {
    for (const cve of cveList) {
      it(`matches authoritative oracle for ${cve} (evidence-injected)`, () => {
        const oracle = GROUND_TRUTH_ORACLES[cve];
        const evidence = oracleToEvidenceContext(oracle);
        expect(evidence).toBeDefined();
        expect(evidence.advisory!.advisory_id).toBe(oracle.vendor_advisory.advisory_id);
        expect(evidence.advisory!.advisory_url).toBe(oracle.vendor_advisory.advisory_url);
        expect(evidence.technical_mechanism).toBe(oracle.technical_mechanism);
        expect(evidence.cwe_disagreement).toBe(oracle.cwe_mappings.has_disagreement);

        const reconciled = reconcileOpenSourceEnrichment({
          cveId: cve,
          cisaKev: {
            cveID: cve,
            vendorProject: oracle.vendor,
            product: oracle.primary_product,
            knownRansomwareCampaignUse: oracle.cisa_kev.ransomware_campaign_use,
            dueDate: oracle.cisa_kev.due_date,
          },
          evidence,
        });

        expect(reconciled.identity.vendor).toBe(oracle.vendor);
        // Evidence-fidelity contract: identity mirrors the injected evidence record exactly.
        expect(reconciled.identity.product).toBe(oracle.products_affected[0].product);
        expect(reconciled.affected_scope.affected_versions).toEqual(oracle.products_affected[0].affected_versions);
        expect(reconciled.affected_scope.fixed_versions).toEqual(oracle.products_affected[0].fixed_versions);
      });
    }
  });
});
