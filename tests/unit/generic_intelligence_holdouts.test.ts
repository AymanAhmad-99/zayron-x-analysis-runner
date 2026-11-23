import { describe, it, expect } from 'bun:test';
import {
  resolveCweDetails,
  buildBoundedAttackPath,
  buildStructuredAttackMappings,
} from '../../packages/intelligence/src/sources/adapters';

describe('GENERIC INTELLIGENCE ARCHITECTURE — HOLDOUT & GENERALIZATION SUITE', () => {
  // ── Specimen A: Generic Unauthenticated Network Command Injection ──────────
  describe('Specimen A: Generic Unauthenticated Network Command Injection (CVE-2025-50001)', () => {
    it('exercises bounded admin-takeover rule based on attributes (CWE-78, NETWORK, NONE privileges, total impact)', () => {
      const path = buildBoundedAttackPath({
        cveId: 'CVE-2025-50001',
        vendor: 'EdgeGuard Systems',
        product: 'EdgeSecurity Enterprise Router',
        cwe: resolveCweDetails('CWE-78'),
        attackVector: 'NETWORK',
        privilegesRequired: 'NONE',
        userInteraction: 'NONE',
        authenticationRequired: 'No',
        ssvcImpact: 'total',
        evidenceIds: ['evi_cve_2025_50001_kev'],
      });

      expect(path.entry_point).toContain('Network-exposed');
      expect(path.prerequisite).toContain('without prior authentication');
      expect(path.vulnerability_condition).toContain('CWE-78');
      expect(path.exploitation_effect).toContain('operating system commands');
      expect(path.resulting_access).toContain('Full administrative takeover');
      expect(path.confidence).toBeGreaterThanOrEqual(0.9);
    });

    it('denies administrative takeover when impact is total but weakness is NOT command injection and lacks root evidence', () => {
      const path = buildBoundedAttackPath({
        cveId: 'CVE-2025-50002',
        vendor: 'CloudStore Inc',
        product: 'CloudStore Storage Portal',
        cwe: resolveCweDetails('CWE-79'), // XSS
        attackVector: 'NETWORK',
        privilegesRequired: 'NONE',
        userInteraction: 'REQUIRED',
        authenticationRequired: 'No',
        ssvcImpact: 'total',
        evidenceIds: ['evi_cve_2025_50002_kev'],
      });

      expect(path.resulting_access).toBe(
        'Total technical impact on affected software component under SSVC decision framework'
      );
      expect(path.resulting_access).not.toContain('Full administrative takeover');
    });
  });

  // ── Specimen B: Generic Perimeter Initial-Access Mapping ────────────────────
  describe('Specimen B: Generic Perimeter Initial-Access Mapping (CVE-2025-50003 & CVE-2025-50004)', () => {
    it('produces supported inference, not observed T1190, from KEV and authentication bypass', () => {
      const mappings = buildStructuredAttackMappings({
        cveId: 'CVE-2025-50003',
        cweIds: ['CWE-287'],
        attackVector: 'NETWORK',
        privilegesRequired: 'NONE',
        userInteraction: 'NONE',
        isKev: true,
        product: 'SecuMesh Core Boundary',
        description: 'Improper authentication allows remote unauthenticated actors to bypass boundary access controls.',
        evidenceIds: ['evi_cve_2025_50003_kev'],
      });

      const t1190 = mappings.find(m => m.technique_id === 'T1190');
      expect(t1190).toBeDefined();
      expect(t1190?.status).toBe('SUPPORTED');
      expect(t1190?.truth_type).toBe('SUPPORTED_INFERENCE');
      expect(t1190?.tactic).toBe('Initial Access');
      expect(t1190?.rationale).toContain('observed use of T1190 is not established');
    });

    it('keeps template-injection network exposure a possible mapping under KEV', () => {
      const mappings = buildStructuredAttackMappings({
        cveId: 'CVE-2025-50004',
        cweIds: ['CWE-74'],
        attackVector: 'NETWORK',
        privilegesRequired: 'NONE',
        userInteraction: 'NONE',
        isKev: true,
        product: 'ReportEngine Portal',
        description: 'Server-side template injection in reporting endpoint allows untrusted expression evaluation.',
        evidenceIds: ['evi_cve_2025_50004_kev'],
      });

      const t1190 = mappings.find(m => m.technique_id === 'T1190');
      expect(t1190).toBeDefined();
      expect(t1190?.status).toBe('CANDIDATE');
      expect(t1190?.truth_type).toBe('ANALYST_ASSESSMENT');
      expect(t1190?.rationale).toContain('Possible taxonomic mapping');
    });

    it('rejects lexical shortcuts: presence of words "gateway" or "vpn" alone does NOT create CONFIRMED T1190 without qualifying weakness or evidence', () => {
      const mappings = buildStructuredAttackMappings({
        cveId: 'CVE-2025-50005',
        cweIds: ['CWE-79'], // Stored XSS in a VPN/gateway web UI
        attackVector: 'NETWORK',
        privilegesRequired: 'LOW',
        userInteraction: 'REQUIRED',
        isKev: true,
        product: 'Enterprise VPN Gateway Management Console',
        description: 'Cross-site scripting in the gateway administration panel requires low privileged user interaction.',
        evidenceIds: ['evi_cve_2025_50005_kev'],
      });

      const t1190 = mappings.find(m => m.technique_id === 'T1190');
      expect(t1190).toBeDefined();
      // Network exposure alone is only possible, not an observed initial-access breach.
      expect(t1190?.status).toBe('CANDIDATE');
      expect(t1190?.truth_type).toBe('ANALYST_ASSESSMENT');
    });
  });

  // ── Specimen C: Generic Upload/Path-Traversal Discovery Semantics ───────────
  describe('Specimen C: Generic Upload/Path-Traversal Discovery Semantics (CVE-2025-50006 & CVE-2025-50007)', () => {
    it('does not invent directory discovery from arbitrary file upload', () => {
      const mappings = buildStructuredAttackMappings({
        cveId: 'CVE-2025-50006',
        cweIds: ['CWE-22'],
        attackVector: 'NETWORK',
        privilegesRequired: 'NONE',
        userInteraction: 'NONE',
        isKev: false,
        product: 'Enterprise Storage Appliance',
        description: 'Arbitrary file upload via path traversal in archive extraction routine allows remote file placement.',
        evidenceIds: ['evi_cve_2025_50006'],
      });

      const t1083 = mappings.find(m => m.technique_id === 'T1083');
      expect(t1083).toBeUndefined();
      expect(mappings.some(m => m.truth_type === 'SOURCE_FACT')).toBe(false);
    });

    it('quarantines T1083 (does NOT emit) for read-only path traversal lacking discovery behavior evidence', () => {
      const mappings = buildStructuredAttackMappings({
        cveId: 'CVE-2025-50007',
        cweIds: ['CWE-22', 'CWE-23'],
        attackVector: 'NETWORK',
        privilegesRequired: 'NONE',
        userInteraction: 'NONE',
        isKev: true,
        product: 'AuditLog Viewer Service',
        description: 'Directory traversal in document viewing API allows unauthorized file read access to system logs.',
        evidenceIds: ['evi_cve_2025_50007'],
      });

      const t1083 = mappings.find(m => m.technique_id === 'T1083');
      expect(t1083).toBeUndefined();
    });
  });
});
