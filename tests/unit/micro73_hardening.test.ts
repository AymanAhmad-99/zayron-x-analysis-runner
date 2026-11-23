import { describe, it, expect } from 'bun:test';
import {
  parseCsafDocument,
  normalizeVendorAdvisory,
  lookupExploitDbEvidence,
  buildStructuredAttackMappings,
  executeRustKernelValidation,
  calculateQualityMetrics,
} from '../../packages/intelligence/src/sources/adapters';

describe('MICRO TASK 73 — Final Vulnerability Pipeline Hardening', () => {
  // ── Part 1: Vendor Advisory / CSAF Normalization ───────────────────────────
  describe('Part 1: Vendor Advisory / CSAF Normalization', () => {
    it('parses valid CSAF 2.0 document into CanonicalVendorAdvisory with correct provenance', () => {
      const mockCsaf = {
        document: {
          category: 'csaf_security_advisory',
          csaf_version: '2.0',
          title: 'Palo Alto Networks PAN-OS GlobalProtect Command Injection',
          publisher: { name: 'Palo Alto Networks' },
          tracking: {
            id: 'PAN-SA-2024-0002',
            initial_release_date: '2024-04-12T00:00:00Z',
            current_release_date: '2024-04-14T00:00:00Z',
          },
          references: [{ url: 'https://security.paloaltonetworks.com/CVE-2024-3400' }],
        },
        product_tree: {
          branches: [{ name: 'PAN-OS' }],
        },
        vulnerabilities: [
          {
            cve: 'CVE-2024-3400',
            product_status: {
              known_affected: ['PAN-OS 10.2 < 10.2.9-h1', 'PAN-OS 11.0 < 11.0.4-h1'],
              fixed: ['PAN-OS 10.2.9-h1', 'PAN-OS 11.0.4-h1'],
            },
            remediations: [
              {
                category: 'vendor_fix',
                details: 'Upgrade to hotfixed PAN-OS versions immediately.',
                url: 'https://security.paloaltonetworks.com/CVE-2024-3400',
              },
            ],
            threats: [
              {
                category: 'mitigation',
                details: 'Disable Device Telemetry on affected GlobalProtect gateways.',
              },
            ],
            notes: [
              {
                category: 'description',
                text: 'Arbitrary code execution via command injection in GlobalProtect feature.',
              },
            ],
          },
        ],
      };

      const advisory = parseCsafDocument(mockCsaf, 'https://security.paloaltonetworks.com/CVE-2024-3400');
      expect(advisory).not.toBeNull();
      expect(advisory?.source_format).toBe('CSAF');
      expect(advisory?.vendor).toBe('Palo Alto Networks');
      expect(advisory?.advisory_id).toBe('PAN-SA-2024-0002');
      expect(advisory?.affected_versions).toContain('PAN-OS 10.2 < 10.2.9-h1');
      expect(advisory?.fixed_versions).toContain('PAN-OS 10.2.9-h1');
      expect(advisory?.mitigations?.length).toBeGreaterThan(0);
      expect(advisory?.remediations?.length).toBeGreaterThan(0);
    });

    it('falls back to standard advisory parser when CSAF is unavailable without fabricating CSAF', () => {
      const advisory = normalizeVendorAdvisory({
        advisoryUrl: 'https://kb.vmware.com/s/article/85777',
        cveId: 'CVE-2021-22005',
        vendor: 'VMware',
        product: 'vCenter Server',
        affectedVersions: ['7.0 < 7.0 U2c'],
        fixedVersions: ['7.0 U2c'],
      });

      expect(advisory.source_format).toBe('FALLBACK');
      expect(advisory.vendor).toBe('VMware');
      expect(advisory.product).toBe('vCenter Server');
      expect(advisory.advisory_id).toBe('ADV-CVE-2021-22005');
      expect(advisory.references).toContain('https://kb.vmware.com/s/article/85777');
      expect(advisory.remediations?.[0]?.type).toBe('vendor_advisory');
    });
  });

  // ── Part 2: Exploit-DB Integration & Separation ────────────────────────────
  describe('Part 2: Exploit-DB Integration & Separation', () => {
    it('retrieves public exploit evidence for CVE-2021-44228 with EDB-ID and strict discipline', async () => {
      const exploit = await lookupExploitDbEvidence('CVE-2021-44228');
      expect(exploit.status).toBe('FOUND');
      expect(exploit.exploit_id).toBe('EDB-ID-50592');
      expect(exploit.source_confidence).toBeGreaterThan(0.8);
      expect(exploit.source_url).toContain('50592');
    });

    it('retrieves public exploit evidence for CVE-2021-22005 and CVE-2024-3400', async () => {
      const vcenterExp = await lookupExploitDbEvidence('CVE-2021-22005');
      expect(vcenterExp.status).toBe('FOUND');
      expect(vcenterExp.exploit_id).toBe('EDB-ID-50383');

      const panExp = await lookupExploitDbEvidence('CVE-2024-3400');
      expect(panExp.status).toBe('FOUND');
      expect(panExp.exploit_id).toBe('EDB-ID-52000');
    });

    it('returns NOT_FOUND for non-cataloged CVE without fabricating exploit presence', async () => {
      const unknownExp = await lookupExploitDbEvidence('CVE-2026-99999');
      expect(unknownExp.status).toBe('NOT_FOUND');
      expect(unknownExp.source_confidence).toBe(0.0);
    });
  });

  // ── Part 3: Structured MITRE ATT&CK Mapping Layer ─────────────────────────
  describe('Part 3: Structured MITRE ATT&CK Mapping Layer', () => {
    it('keeps CWE-derived KEV mappings inferential without explicit CTI attribution', () => {
      const mappings = buildStructuredAttackMappings({
        cveId: 'CVE-2024-3400',
        cweIds: ['CWE-77'],
        attackVector: 'NETWORK',
        isKev: true,
        product: 'PAN-OS GlobalProtect',
        privilegesRequired: 'NONE',
        description: 'Command injection in GlobalProtect gateway',
        evidenceIds: ['ev_pan_01'],
      });

      const t1190 = mappings.find(m => m.technique_id === 'T1190');
      expect(t1190).toBeDefined();
      expect(t1190?.status).toBe('SUPPORTED');
      expect(t1190?.truth_type).toBe('SUPPORTED_INFERENCE');
      expect(t1190?.tactic).toBe('Initial Access');

      const t1059 = mappings.find(m => m.technique_id === 'T1059');
      expect(t1059).toBeDefined();
      expect(t1059?.status).toBe('SUPPORTED');
      expect(t1059?.truth_type).toBe('SUPPORTED_INFERENCE');
      expect(t1059?.tactic).toBe('Execution');
    });

    it('does not infer discovery from file upload or confirmed exposure from a network vector', () => {
      const mappings = buildStructuredAttackMappings({
        cveId: 'CVE-2021-22005',
        cweIds: ['CWE-22'],
        attackVector: 'NETWORK',
        isKev: false,
        product: 'vCenter Server',
        description: 'Arbitrary file upload via path traversal',
        evidenceIds: ['ev_vc_01'],
      });

      const t1083 = mappings.find(m => m.technique_id === 'T1083');
      expect(t1083).toBeUndefined();

      // A network vector is only possible public-facing exposure, not a confirmed technique.
      const t1190 = mappings.find(m => m.technique_id === 'T1190');
      expect(t1190?.status).toBe('CANDIDATE');
      expect(t1190?.truth_type).toBe('ANALYST_ASSESSMENT');
    });
  });

  // ── Part 4: Rust Kernel Independent Deterministic Validator ────────────────
  describe('Part 4: Rust Kernel Independent Deterministic Validator', () => {
    it('executes Rust Kernel validation on verified consistent facts and returns ACCEPTED', async () => {
      const validation = await executeRustKernelValidation({
        cveId: 'CVE-2024-3400',
        vendor: 'Palo Alto Networks',
        product: 'PAN-OS GlobalProtect',
        cvssScore: '10.0',
        isKev: true,
        attackVector: 'NETWORK',
        authRequired: 'No',
        claims: [
          { id: 'CLM-01', field: 'affected_product', value: 'PAN-OS GlobalProtect', truth_type: 'SOURCE_FACT' },
          { id: 'CLM-02', field: 'cvss_score', value: '10.0', truth_type: 'SOURCE_FACT' },
          { id: 'CLM-03', field: 'exploitation_status', value: 'known exploited', truth_type: 'SOURCE_FACT' },
        ],
        evidenceStatements: [
          { id: 'ev_pan_01', statement: 'PAN-OS GlobalProtect Command Injection with CVSS 10.0 known exploited in the wild.', source: 'cisa-kev', url: 'https://cisa.gov' },
        ],
      });

      expect(validation.executed).toBe(true);
      expect(validation.status).toBe('PASS');
      expect(validation.lifecycle_state).toBe('VALIDATED');
      expect(validation.conflicts.length).toBe(0);
    });

    it('fails closed with CONFLICT when claim contradicts canonical fact', async () => {
      const validation = await executeRustKernelValidation({
        cveId: 'CVE-2024-3400',
        vendor: 'Palo Alto Networks',
        product: 'PAN-OS GlobalProtect',
        cvssScore: '10.0',
        isKev: true,
        attackVector: 'NETWORK',
        authRequired: 'No',
        claims: [
          // Contradiction! Asserts CVSS 4.3 while canonical fact is 10.0
          { id: 'CLM-02', field: 'cvss_score', value: '4.3', truth_type: 'SOURCE_FACT' },
        ],
        evidenceStatements: [
          { id: 'ev_pan_01', statement: 'PAN-OS GlobalProtect Command Injection with CVSS 10.0', source: 'cisa-kev', url: 'https://cisa.gov' },
        ],
      });

      expect(validation.executed).toBe(true);
      expect(validation.status).toBe('CONFLICT');
      expect(validation.lifecycle_state).toBe('REJECTED');
      expect(validation.conflicts.length).toBeGreaterThan(0);
      expect(validation.checks.canonical_integrity).toBe('CONFLICT');
    });
  });

  // ── Part 5: Quality Metrics on Extended Claims Ledger ──────────────────────
  describe('Part 5: Quality Metrics on Extended Claims Ledger', () => {
    it('calculates metrics across extended claims with conflict tracking', () => {
      const claims = [
        { truth_type: 'SOURCE_FACT' },
        { truth_type: 'SOURCE_FACT' },
        { truth_type: 'KNOWLEDGE_SUPPORTED_INFERENCE' },
        { truth_type: 'MODEL_INFERENCE' },
        { truth_type: 'UNKNOWN' },
      ];

      const metrics = calculateQualityMetrics(claims);
      expect(metrics.total_claims).toBe(5);
      expect(metrics.supported_claims).toBe(3);
      expect(metrics.source_coverage_ratio).toBe(0.6);
      expect(metrics.conflict_count).toBe(0);
    });
  });
});
