import { describe, it, expect } from 'bun:test';
import {
  resolveCweDetails,
  buildBoundedAttackPath,
  calculateQualityMetrics,
  buildSignalDrivenExecutiveAssessment,
  buildSignalDrivenTechnicalSummary,
} from '../../packages/intelligence/src/sources/adapters';

describe('MICRO TASK 71 — Vulnerability Intelligence Fidelity & Analyst Dossier Finalization', () => {
  // ── 1. CWE Representation Fidelity ───────────────────────────────────────
  describe('CWE Representation Fidelity', () => {
    it('resolves authoritative MITRE name for CWE-287', () => {
      const cwe = resolveCweDetails('CWE-287');
      expect(cwe.id).toBe('CWE-287');
      expect(cwe.name).toBe('Improper Authentication');
      expect(cwe.formatted).toBe('CWE-287: Improper Authentication');
    });

    it('resolves authoritative MITRE name for CWE-20 and CWE-77/78', () => {
      const cwe20 = resolveCweDetails('CWE-20');
      expect(cwe20.name).toBe('Improper Input Validation');

      const cwe78 = resolveCweDetails('CWE-78');
      expect(cwe78.name).toContain('OS Command Injection');
    });

    it('never conflates CWE name with CVE title', () => {
      const cwe = resolveCweDetails('CWE-22');
      expect(cwe.name).not.toContain('CVE-');
      expect(cwe.name).toContain('Path Traversal');
    });
  });

  // ── 2. Bounded Attack Path Builder ───────────────────────────────────────
  describe('Bounded Attack Path Builder', () => {
    it('constructs an evidence-bounded attack path for network authentication bypass', () => {
      const path = buildBoundedAttackPath({
        cveId: 'CVE-2023-46805',
        vendor: 'Ivanti',
        product: 'Connect Secure',
        cwe: resolveCweDetails('CWE-287'),
        attackVector: 'NETWORK',
        privilegesRequired: 'NONE',
        userInteraction: 'NONE',
        authenticationRequired: 'No',
        ssvcImpact: 'partial',
        evidenceIds: ['evi_cve_2023_46805_kev'],
      });

      expect(path.entry_point).toContain('Network-exposed');
      expect(path.prerequisite).toContain('without prior authentication');
      expect(path.vulnerability_condition).toContain('CWE-287: Improper Authentication');
      expect(path.exploitation_effect).toContain('Bypass of identity and session verification boundaries');
      expect(path.confidence).toBeGreaterThanOrEqual(0.9);
      expect(path.evidence_ids).toContain('evi_cve_2023_46805_kev');
    });

    it('constructs a command injection attack path for PAN-OS GlobalProtect', () => {
      const path = buildBoundedAttackPath({
        cveId: 'CVE-2024-3400',
        vendor: 'Palo Alto Networks',
        product: 'PAN-OS GlobalProtect',
        cwe: resolveCweDetails('CWE-77'),
        attackVector: 'NETWORK',
        privilegesRequired: 'NONE',
        userInteraction: 'NONE',
        authenticationRequired: 'No',
        ssvcImpact: 'total',
        evidenceIds: ['evi_cve_2024_3400_kev'],
      });

      expect(path.exploitation_effect).toContain('operating system commands');
      expect(path.resulting_access).toContain('Full administrative takeover');
    });
  });

  // ── 3. Pipeline Quality Metrics ──────────────────────────────────────────
  describe('Pipeline Quality Metrics', () => {
    it('calculates coverage, unknown, and inference ratios across claims', () => {
      const claims = [
        { truth_type: 'SOURCE_FACT' },
        { truth_type: 'SOURCE_FACT' },
        { truth_type: 'SOURCE_DERIVED' },
        { truth_type: 'KNOWLEDGE_SUPPORTED_INFERENCE' },
        { truth_type: 'MODEL_INFERENCE' },
        { truth_type: 'UNKNOWN' },
        { truth_type: 'CONFLICT' },
      ];

      const metrics = calculateQualityMetrics(claims);
      expect(metrics.total_claims).toBe(7);
      expect(metrics.supported_claims).toBe(4);
      expect(metrics.conflict_count).toBe(1);
      expect(metrics.source_coverage_ratio).toBeCloseTo(4 / 7, 2);
      expect(metrics.unknown_ratio).toBeCloseTo(1 / 7, 2);
      expect(metrics.inference_ratio).toBeCloseTo(1 / 7, 2);
    });
  });

  // ── 4. Signal-Driven Assessment Generators ───────────────────────────────
  describe('Signal-Driven Assessments', () => {
    it('generates a 3-sentence executive assessment without marketing language', () => {
      const exec = buildSignalDrivenExecutiveAssessment({
        cveId: 'CVE-2023-46805',
        vendor: 'Ivanti',
        product: 'Connect Secure',
        role: 'Gateway Interface',
        cwe: resolveCweDetails('CWE-287'),
        isKev: true,
        activeExploitation: true,
        ransomware: 'UNKNOWN',
        epssScore: '0.999',
        epssPercentile: '0.999',
        cvssScore: '8.2',
        attackVector: 'NETWORK',
        authRequired: 'No',
        dueDate: '2024-01-22',
        vendorAdvisoryUrl: 'https://forums.ivanti.com/advisory',
      });

      const sentences = exec.split(/(?<=[.!?])\s+/);
      expect(sentences.length).toBe(3);
      expect(exec).toContain('Ivanti Connect Secure');
      expect(exec).toContain('CWE-287 (Improper Authentication)');
      expect(exec).toContain('CISA KEV catalog');
      expect(exec).toContain('2024-01-22');
      expect(exec).not.toMatch(/significantly alarming|unprecedented|devastating|critical catastrophe/i);
    });

    it('generates a 4-sentence technical summary addressing the 4 key questions', () => {
      const tech = buildSignalDrivenTechnicalSummary({
        cveId: 'CVE-2023-46805',
        product: 'Connect Secure',
        cwe: resolveCweDetails('CWE-287'),
        attackVector: 'NETWORK',
        prerequisites: 'Network connectivity without prior credentials',
        resultingAccess: 'Unauthorized access to restricted data and services',
        unknowns: ['Specific custom weaponized tooling hashes'],
      });

      const sentences = tech.split(/(?<=[.!?])\s+/);
      expect(sentences.length).toBe(4);
      expect(tech).toContain('Connect Secure request handling subsystem');
      expect(tech).toContain('Improper Authentication');
      expect(tech).toContain('specific custom weaponized tooling hashes');
    });
  });
});
