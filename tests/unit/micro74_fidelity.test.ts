import { describe, it, expect } from 'bun:test';
import {
  resolveCweDetails,
  buildBoundedAttackPath,
  buildSignalDrivenExecutiveAssessment,
  buildStructuredAttackMappings,
  calculateQualityMetrics,
  executeRustKernelValidation,
} from '../../packages/intelligence/src/sources/adapters';

describe('MICRO TASK 74 — Semantic Fidelity & Final Analyst Report Contract', () => {
  // ── 1. Auth vs Privileges Decoupling ─────────────────────────────────────
  describe('1. Authentication vs Privileges Decoupling (Step 3)', () => {
    it('does NOT derive authentication_required from CVSS PR=HIGH or PR=NONE', () => {
      const cweDetails = resolveCweDetails('CWE-78');

      // High PR should NOT automatically mean authentication is YES if unverified
      const pathWithHighPr = buildBoundedAttackPath({
        cveId: 'CVE-2024-XXXX',
        attackVector: 'NETWORK',
        privilegesRequired: 'HIGH',
        vendor: 'Test Vendor',
        product: 'Test Product',
        cwe: cweDetails,
        evidenceIds: ['ev_01'],
        // explicit authenticationRequired omitted -> should be UNKNOWN
      });

      // Prerequisite stage must NOT force "Authentication Required: YES" purely from PR:H
      expect(pathWithHighPr.stages).toBeDefined();
      expect(pathWithHighPr.stages.length).toBe(5);
      const prereqStage = pathWithHighPr.stages.find((s) => s.stage === 'PREREQUISITE');
      expect(prereqStage).toBeDefined();
      expect(prereqStage?.value).toContain('Authentication requirement UNKNOWN');
      expect(prereqStage?.value).not.toContain('with authorized user credentials');
      expect(prereqStage?.truth_type).toBe('SOURCE_FACT'); // PR:HIGH is SOURCE_FACT, auth is UNKNOWN

      // Now with explicit source fact stating unauthenticated
      const cwe77 = resolveCweDetails('CWE-77');
      const pathExplicitNoAuth = buildBoundedAttackPath({
        cveId: 'CVE-2024-3400',
        attackVector: 'NETWORK',
        privilegesRequired: 'NONE',
        vendor: 'Palo Alto Networks',
        product: 'PAN-OS',
        cwe: cwe77,
        evidenceIds: ['ev_pan_01'],
        authenticationRequired: 'No',
      });

      const prereqExplicit = pathExplicitNoAuth.stages.find((s) => s.stage === 'PREREQUISITE');
      expect(prereqExplicit?.value).toContain('without prior authentication');
      expect(prereqExplicit?.truth_type).toBe('SOURCE_FACT');
    });
  });

  // ── 2. CWE Separation & Canonicalization ─────────────────────────────────
  describe('2. CWE Separation and Canonical MITRE Descriptions (Step 4)', () => {
    it('returns canonical MITRE name and description, never overwriting with CVE title', () => {
      const cwe77 = resolveCweDetails('CWE-77');
      expect(cwe77.id).toBe('CWE-77');
      expect(cwe77.name).toBe("Improper Neutralization of Special Elements used in a Command ('Command Injection')");
      expect(cwe77.description).toContain('command');
      expect(cwe77.formatted).toContain('CWE-77: Improper Neutralization of Special Elements used in a Command');
      // Must not match arbitrary CVE title
      expect(cwe77.name).not.toContain('PAN-OS GlobalProtect');

      const cwe22 = resolveCweDetails('CWE-22');
      expect(cwe22.id).toBe('CWE-22');
      expect(cwe22.name).toContain('Improper Limitation of a Pathname to a Restricted Directory');

      const cwe502 = resolveCweDetails('CWE-502');
      expect(cwe502.id).toBe('CWE-502');
      expect(cwe502.name).toBe('Deserialization of Untrusted Data');
    });
  });

  // ── 3. Exploitation Semantics Independence ───────────────────────────────
  describe('3. Exploitation Semantics Independence (Step 5)', () => {
    it('keeps KEV, Observed Wild, Ransomware, and Public Exploit independent', () => {
      const cweDetails = resolveCweDetails('CWE-78');

      // Case A: Public exploit exists on Exploit-DB, but KEV=No, Ransomware=No, Observed Wild=No
      const execAssessmentA = buildSignalDrivenExecutiveAssessment({
        vendor: 'Example Vendor',
        product: 'Example Gateway',
        cwe: cweDetails,
        cvssScore: 9.8,
        attackVector: 'NETWORK',
        authRequired: 'UNKNOWN',
        kevListed: false,
        activeExploitation: false,
        ransomwareAssociated: false,
        publicExploit: true,
      });

      expect(execAssessmentA).toContain('public exploit code cataloged in Exploit-DB');
      expect(execAssessmentA).not.toContain('active in-the-wild exploitation');
      expect(execAssessmentA).not.toContain('ransomware');

      // Case B: KEV listed + Active Exploitation + Ransomware
      const execAssessmentB = buildSignalDrivenExecutiveAssessment({
        vendor: 'Apache',
        product: 'Log4j',
        cwe: resolveCweDetails('CWE-502'),
        cvssScore: 10.0,
        attackVector: 'NETWORK',
        authRequired: 'No',
        isKev: true,
        activeExploitation: true,
        ransomware: 'Known Ransomware',
        publicExploit: true,
      });

      expect(execAssessmentB).toContain('CISA KEV catalog');
      expect(execAssessmentB).toContain('Active in-the-wild exploitation');
      expect(execAssessmentB.toLowerCase()).toContain('ransomware');
    });
  });

  // ── 4. ATT&CK Semantics & Provenance ─────────────────────────────────────
  describe('4. ATT&CK Semantics & Candidate vs Confirmed (Step 6)', () => {
    it('marks RAG similarity as CANDIDATE or SUPPORTED, never CONFIRMED without direct evidence', () => {
      // Test candidate mapping for persistence
      const mappings = buildStructuredAttackMappings({
        cveId: 'CVE-2024-3400',
        cweIds: ['CWE-77'],
        isKev: false,
        attackVector: 'NETWORK',
        description: 'Command injection allowing adversary to write persistent backdoor web shell.',
        evidenceIds: ['ev_pan_01'],
      });

      expect(mappings.length).toBeGreaterThan(0);
      const candidateMapping = mappings.find((m) => m.technique_id === 'T1505');
      expect(candidateMapping).toBeDefined();
      expect(candidateMapping?.technique_id).toBe('T1505');
      expect(candidateMapping?.status).toBe('CANDIDATE');
      expect(candidateMapping?.rationale).toBeDefined();
    });
  });

  // ── 5. Attack Path 5-Stage Structure ─────────────────────────────────────
  describe('5. Evidence-Bounded Attack Path 5 Stages (Step 8)', () => {
    it('structures the 5 required stages with individual provenance', () => {
      const cwe306 = resolveCweDetails('CWE-306');
      const path = buildBoundedAttackPath({
        cveId: 'CVE-2023-46805',
        attackVector: 'NETWORK',
        privilegesRequired: 'NONE',
        vendor: 'Ivanti',
        product: 'Connect Secure',
        cwe: cwe306,
        evidenceIds: ['ev_ivanti_01'],
        authenticationRequired: 'No',
      });

      expect(path.stages).toHaveLength(5);
      const expectedStages = [
        'ENTRY_POINT',
        'PREREQUISITE',
        'VULNERABILITY_CONDITION',
        'EXPLOITATION_EFFECT',
        'RESULTING_ACCESS',
      ];

      path.stages.forEach((stage, idx) => {
        expect(stage.stage).toBe(expectedStages[idx]);
        expect(stage.value).toBeDefined();
        expect(['SOURCE_FACT', 'SUPPORTED_INFERENCE', 'SOURCE_DERIVED', 'KNOWLEDGE_SUPPORTED_INFERENCE', 'MODEL_INFERENCE', 'UNKNOWN']).toContain(stage.truth_type);
        expect(stage.confidence).toBeGreaterThan(0);
        expect(Array.isArray(stage.evidence_ids)).toBe(true);
        expect(Array.isArray(stage.source_ids)).toBe(true);
      });
    });
  });

  // ── 6. Rust Kernel Validation Integration ────────────────────────────────
  describe('6. Rust Kernel Deterministic Validation (Step 15)', () => {
    it('validates canonical integrity and flags contradictions', async () => {
      const validResult = await executeRustKernelValidation({
        cveId: 'CVE-2024-3400',
        vendor: 'Palo Alto Networks',
        product: 'PAN-OS',
        cvssScore: '10.0',
        isKev: true,
        attackVector: 'NETWORK',
        authRequired: 'No',
        claims: [
          { id: 'CLM-01', field: 'affected_product', value: 'PAN-OS', truth_type: 'SOURCE_FACT' },
          { id: 'CLM-02', field: 'cvss_score', value: '10.0', truth_type: 'SOURCE_FACT' },
        ],
        evidenceStatements: [
          { id: 'ev_01', statement: 'CVSS 10.0 command injection in PAN-OS', source: 'cisa-kev', url: 'https://cisa.gov' },
        ],
      });

      expect(validResult.status).toBe('PASS');
      expect(validResult.lifecycle_state).toBe('VALIDATED');
      expect(validResult.checks.canonical_integrity).toBe('PASS');
      expect(validResult.checks.semantic_consistency).toBe('PASS');
    });
  });

  // ── 7. Quality Metrics ───────────────────────────────────────────────────
  describe('7. Quality Metrics and Claim Provenance (Step 20)', () => {
    it('computes quality metrics accurately across extended claims with 0 conflicts', () => {
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
      expect(metrics.unknown_ratio).toBe(0.2);
    });
  });
});
