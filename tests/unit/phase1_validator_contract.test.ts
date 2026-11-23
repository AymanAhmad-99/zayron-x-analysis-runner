import { describe, it, expect } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  validateReportSemantics,
  validateReportSemanticsWithContext,
  verifyClaimsLedger,
  resolveReportField,
  normalizeVersionTokens,
  type ReportValidationContext,
} from '../../packages/intelligence/src/sources/adapters';

import goldenFive from '../fixtures/phase1_golden_five_reports.json';

// Verification mutates claim statuses; never contaminate the imported fixtures
// shared with historical read/metric compatibility suites in the same Bun process.
const REPORTS = structuredClone((goldenFive as any).reports) as Record<string, any>;
const CVES = Object.keys(REPORTS);

/** Evidence context derived from the SAME authority the report was built from. */
function evidenceFromReport(r: any): any {
  return {
    cve_id: r.identity.cve,
    source: 'PHASE1_TEST_FIXTURE',
    advisory: {
      advisory_id: r.remediation.canonical_advisory?.advisory_id,
      advisory_url: r.remediation.advisory_url,
    },
    technical_mechanism: r.technical.technical_mechanism ?? r.identity.technical_mechanism,
    products_affected: r.affected_scope.products_affected ?? [],
    source_specific_cwes: r.identity.source_specific_cwes ?? {},
    cwe_disagreement: !!r.identity.cwe_disagreement,
    cisa_kev: {
      is_exploited: true,
      ransomware_campaign_use: r.signals.ransomware_campaign_use,
      due_date: r.exploitation.cisa_due_date,
    },
    cvss_v31: r.severity.cvss.score !== 'NOT_AVAILABLE'
      ? { score: Number(r.severity.cvss.score), vector: r.severity.cvss.vector }
      : undefined,
  };
}

const clone = (x: any) => JSON.parse(JSON.stringify(x));
const withContext = (report: any, evidence?: any): ReportValidationContext => ({
  report,
  authoritativeEvidence: evidence ?? evidenceFromReport(report),
});

describe('PHASE 1 — VALIDATOR CONTRACT REPAIR (field-path drift + authoritative evidence)', () => {

  // ─────────────────────────────────────────────────────────────────────────
  // INV-001 / INV-003 — validator consumes the ACTUAL emitted report contract
  // ─────────────────────────────────────────────────────────────────────────
  describe('1. Field-path contract alignment (INV-001, INV-003, INV-006)', () => {
    it('canonical emitted paths resolve on every Golden Five report', () => {
      for (const cve of CVES) {
        const r = REPORTS[cve];
        expect(resolveReportField(r, ['severity.cvss.vector', 'mechanics.cvss.vector', 'cvss.vector'])).toBe(r.severity.cvss.vector);
        expect(resolveReportField(r, ['technical.authentication_required', 'mechanics.authentication_required'])).toBe(r.technical.authentication_required);
        expect(resolveReportField(r, ['threat_context.attack_mappings', 'mitre_attack'])).toEqual(r.threat_context.attack_mappings);
        expect(resolveReportField(r, ['provenance.claims', 'claims_ledger', 'claims'])).toEqual(r.provenance.claims);
        expect(resolveReportField(r, ['affected_scope.fixed_versions'])).toBe(r.affected_scope.fixed_versions);
      }
    });

    it('BEFORE: the obsolete validator path set resolves NOTHING on real reports (formerly dead checks)', () => {
      for (const cve of CVES) {
        const r = REPORTS[cve];
        // Exactly the paths the pre-repair validator read:
        expect(resolveReportField(r, ['mechanics.cvss.vector', 'cvss.vector'])).toBeUndefined();
        expect(resolveReportField(r, ['mechanics.authentication_required', 'authentication_required'])).toBeUndefined();
        expect(resolveReportField(r, ['mitre_attack', 'attack_mappings', 'attack_path.mappings'])).toBeUndefined();
        expect(resolveReportField(r, ['vendor_advisory.advisory_id'])).toBeUndefined();
        // Pre-repair cross-version check required an array; the emitted value is a string.
        expect(Array.isArray(r.affected_scope.fixed_versions)).toBe(false);
      }
    });

    it('AFTER: the canonical path set resolves the real values (checks become reachable)', () => {
      const r = REPORTS['CVE-2024-43572'];
      expect(resolveReportField(r, ['severity.cvss.vector', 'mechanics.cvss.vector'])).toBe(r.severity.cvss.vector);
      expect(resolveReportField(r, ['threat_context.attack_mappings', 'mitre_attack'])).toEqual([]);
      expect(resolveReportField(r, ['remediation.canonical_advisory.advisory_id', 'vendor_advisory.advisory_id'])).toBe(r.remediation.canonical_advisory.advisory_id);
    });

    it('legacy/mock shape remains supported (compatibility boundary is not mistaken for canonical)', () => {
      const legacyShape = { mechanics: { cvss: { vector: 'CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H' } }, mitre_attack: [{ technique_id: 'T1190' }] };
      expect(resolveReportField(legacyShape, ['severity.cvss.vector', 'mechanics.cvss.vector'])).toBe('CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H');
      expect(resolveReportField(legacyShape, ['threat_context.attack_mappings', 'mitre_attack'])).toEqual([{ technique_id: 'T1190' }]);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // INV-006 — fixed-version TYPE contract (string projection AND legacy array)
  // ─────────────────────────────────────────────────────────────────────────
  describe('2. Fixed-version type contract (INV-006)', () => {
    it('normalizes the emitted comma-joined STRING into tokens', () => {
      expect(normalizeVersionTokens('10.0.19045.5011, 10.0.22631.4317')).toEqual(['10.0.19045.5011', '10.0.22631.4317']);
      expect(normalizeVersionTokens('UNKNOWN')).toEqual(['UNKNOWN']);
      expect(normalizeVersionTokens('')).toEqual([]);
    });
    it('normalizes the legacy array form unchanged', () => {
      expect(normalizeVersionTokens(['4.3.1.0', '3.11.0.0'])).toEqual(['4.3.1.0', '3.11.0.0']);
    });
    it('V4 — string fixed_versions no longer disables the cross-product contamination check', () => {
      const r = clone(REPORTS['CVE-2024-43572']); // 15 scopes, string fixed_versions
      // Make the flat projection carry a version that belongs ONLY to a foreign scope.
      const primary = r.affected_scope.products_affected[0]; // Windows 10 1507
      primary.fixed_versions = ['10.0.10240.20796'];         // the primary branch's own build
      const foreignOnly = '10.0.26100.2033';                 // belongs to Windows 11 24H2, not the primary
      expect(primary.fixed_versions).not.toContain(foreignOnly);
      r.affected_scope.fixed_versions = `${primary.fixed_versions[0]}, ${foreignOnly}`;
      const res = validateReportSemanticsWithContext(withContext(r));
      expect(res.violations.some(v => /Fixed version contamination/.test(v))).toBe(true);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // V1 — inconsistent CVSS vector/score detected via canonical path + evidence
  // ─────────────────────────────────────────────────────────────────────────
  describe('3. V1 — CVSS vector contradiction (formerly dead: read mechanics.cvss.vector)', () => {
    it('rejects a report whose canonical vector disagrees with authoritative evidence', () => {
      const r = clone(REPORTS['CVE-2024-38226']);
      const evidence = evidenceFromReport(r);           // authority vector
      r.severity.cvss.vector = 'CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H'; // report mutated
      const res = validateReportSemanticsWithContext({ report: r, authoritativeEvidence: evidence });
      expect(res.isValid).toBe(false);
      expect(res.violations.some(v => /CVSS vector contradiction/.test(v))).toBe(true);
    });
    it('does not flag the unmutated report (no false positive)', () => {
      const r = REPORTS['CVE-2024-38226'];
      const res = validateReportSemanticsWithContext(withContext(r));
      expect(res.violations.some(v => /CVSS vector contradiction/.test(v))).toBe(false);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // V2 — evidence contradicting the asserted field (advisory identity)
  // ─────────────────────────────────────────────────────────────────────────
  describe('4. V2 — vendor advisory contradiction (formerly dead: read vendor_advisory.*)', () => {
    it('rejects a report whose canonical advisory URL disagrees with authoritative evidence', () => {
      const r = clone(REPORTS['CVE-2024-20767']);
      const evidence = evidenceFromReport(r);
      r.remediation.advisory_url = 'https://unrelated-vendor.example/advisory/OTHER-CVE';
      const res = validateReportSemanticsWithContext({ report: r, authoritativeEvidence: evidence });
      expect(res.isValid).toBe(false);
      expect(res.violations.some(v => /Vendor advisory mismatch/.test(v))).toBe(true);
    });
    it('does not flag the unmutated report', () => {
      const r = REPORTS['CVE-2024-20767'];
      const res = validateReportSemanticsWithContext(withContext(r));
      expect(res.violations.some(v => /Vendor advisory mismatch/.test(v))).toBe(false);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // V3 — inconsistent claim support metadata rejected
  // ─────────────────────────────────────────────────────────────────────────
  describe('5. V3 — claim support metadata consistency', () => {
    it('rejects a SOURCE_FACT claim whose value is UNKNOWN', () => {
      const bad = [{
        id: 'CLM-X', claim_id: 'CLM-X', field: 'cvss', value: 'UNKNOWN',
        truth_type: 'SOURCE_FACT', confidence: 1.0, source: 'NVD',
        evidence_scope: 'CVE', source_ids: ['nvd'], related_cve_ids: [],
      }];
      const res = verifyClaimsLedger(bad as any, 'CVE-2024-38226', null);
      expect(res.is_valid).toBe(false);
      expect(res.violations.some(v => /UNKNOWN value but was asserted as SOURCE_FACT/.test(v.issue))).toBe(true);
    });
    it('rejects a claim with no provenance source', () => {
      const bad = [{ id: 'CLM-Y', claim_id: 'CLM-Y', field: 'cvss', value: '7.3', truth_type: 'SOURCE_FACT', confidence: 1.0, source: '', evidence_scope: 'CVE', source_ids: [], related_cve_ids: [] }];
      const res = verifyClaimsLedger(bad as any, 'CVE-2024-38226', null);
      expect(res.is_valid).toBe(false);
      expect(res.violations.some(v => /Missing source/.test(v.issue))).toBe(true);
    });
    it('INV-005 — validated result is a distinct field; the validator never emits a "supported" count', () => {
      const original = JSON.stringify((goldenFive as any).reports);
      const res = verifyClaimsLedger(REPORTS['CVE-2024-45519'].provenance.claims as any, 'CVE-2024-45519', null);
      expect(res).toHaveProperty('verified_claims');
      expect(res).not.toHaveProperty('supported_claims');
      expect(REPORTS).not.toBe((goldenFive as any).reports);
      expect(JSON.stringify((goldenFive as any).reports)).toBe(original);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // V5 — authentication check runs on the canonical path
  // ─────────────────────────────────────────────────────────────────────────
  describe('6. V5 — authentication check operates on technical.authentication_required', () => {
    it('rejects UNKNOWN authentication asserted as SOURCE_FACT', () => {
      const r = clone(REPORTS['CVE-2024-38226']);
      r.technical.authentication_required = 'UNKNOWN'; // authority: authentication is UNKNOWN
      const authClaim = r.provenance.claims.find((c: any) => c.field === 'authentication');
      expect(authClaim).toBeDefined();
      authClaim.truth_type = 'SOURCE_FACT';
      const res = validateReportSemanticsWithContext(withContext(r));
      expect(res.isValid).toBe(false);
      expect(res.violations.some(v => /UNKNOWN authentication marked as SOURCE_FACT/.test(v))).toBe(true);
    });
    it('formerly dead: the same mutation is invisible to the obsolete path set', () => {
      const r = clone(REPORTS['CVE-2024-38226']);
      r.technical.authentication_required = 'UNKNOWN';
      expect(resolveReportField(r, ['mechanics.authentication_required', 'authentication_required'])).toBeUndefined();
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // ATT&CK check now reads threat_context.attack_mappings
  // ─────────────────────────────────────────────────────────────────────────
  describe('7. ATT&CK mapping check (formerly dead: read mitre_attack)', () => {
    it('rejects an unsupported T1059 CONFIRMED at CVE scope', () => {
      const r = clone(REPORTS['CVE-2022-23227']); // CWE-306 — command execution NOT established
      r.threat_context.attack_mappings = [{ technique_id: 'T1059', technique_name: 'Command and Scripting Interpreter', status: 'CONFIRMED', evidence_scope: 'CVE', related_cve_ids: [] }];
      const res = validateReportSemanticsWithContext(withContext(r));
      expect(res.isValid).toBe(false);
      expect(res.violations.some(v => /Unsupported ATT&CK technique: T1059/.test(v))).toBe(true);
    });
    it('does NOT false-positive on CVE-2024-45519 (authority establishes CWE-78 command execution)', () => {
      const r = REPORTS['CVE-2024-45519'];
      expect((r.threat_context.attack_mappings || []).some((m: any) => m.technique_id === 'T1059' && m.status === 'CONFIRMED')).toBe(true);
      const res = validateReportSemanticsWithContext(withContext(r));
      expect(res.violations.some(v => /Unsupported ATT&CK technique: T1059/.test(v))).toBe(false);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Golden Five — repaired contract runs against the real reports
  // ─────────────────────────────────────────────────────────────────────────
  describe('8. Golden Five — repaired validator sees actual fields and receives evidence', () => {
    it('executes without throwing for all five and produces a deterministic verdict', () => {
      for (const cve of CVES) {
        const r = REPORTS[cve];
        const res = validateReportSemanticsWithContext(withContext(r));
        expect(res.status === 'VALIDATED' || res.status === 'BLOCKED').toBe(true);
        expect(Array.isArray(res.violations)).toBe(true);
      }
    });
    it('the ATT&CK, claims, and stage checks are REACHABLE on the real reports (formerly skipped)', () => {
      // Prove reachability deterministically: for each check, the canonical input the
      // check consumes is non-null on at least one real report.
      const withMappings = CVES.filter(c => (REPORTS[c].threat_context.attack_mappings || []).length > 0);
      expect(withMappings).toContain('CVE-2024-45519');
      for (const cve of CVES) {
        expect((REPORTS[cve].provenance.claims || []).length).toBeGreaterThan(0);
        expect((REPORTS[cve].attack_path.stages || []).length).toBeGreaterThan(0);
      }
    });
    it('contract entrypoint and raw function agree', () => {
      const r = REPORTS['CVE-2022-23227'];
      const a = validateReportSemanticsWithContext(withContext(r));
      const b = validateReportSemantics(r, evidenceFromReport(r));
      expect(a.status).toBe(b.status);
      expect(a.violations.length).toBe(b.violations.length);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // INV-002 / INV-004 — the production call site supplies evidence
  // ─────────────────────────────────────────────────────────────────────────
  describe('9. Production call site wiring (INV-002, INV-004)', () => {
    const src = readFileSync(join(import.meta.dir, '..', '..', 'workers', 'api', 'src', 'index.ts'), 'utf8');
    it('no longer passes null as the authoritative evidence to the claims ledger', () => {
      expect(src.includes('verifyClaimsLedger(majorClaims as any, targetCve, null, evidenceIndex)')).toBe(false);
      expect(src.includes('verifyClaimsLedger(majorClaims as any, targetCve, authoritativeEvidenceContext, evidenceIndex)')).toBe(true);
    });
    it('semantic gate is invoked through the canonical validator input contract', () => {
      expect(src.includes('validateReportSemantics(structuredReport)')).toBe(false);
      expect(src.includes('validateReportSemanticsWithContext({')).toBe(true);
      expect(src.includes('authoritativeEvidence: authoritativeEvidenceContext')).toBe(true);
    });
  });
});
