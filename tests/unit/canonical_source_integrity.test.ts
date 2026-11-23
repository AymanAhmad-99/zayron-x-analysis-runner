import { describe, it, expect } from 'bun:test';
import {
  reconcileOpenSourceEnrichment,
} from '../../packages/intelligence/src/sources/adapters';
import {
  FIXTURE_NVD_CNA_KEV,
  FIXTURE_NVD_EPSS,
  FIXTURE_NVD_OSV,
  FIXTURE_NVD_GHSA,
  FIXTURE_NVD_MITRE,
  FIXTURE_MULTI_SOURCE_CONFLICT,
} from '../fixtures/canonical_source_integration_fixtures';

describe('PHASE 2 — CANONICAL SOURCE INTEGRITY & PROVENANCE GATE (Phase 2G & 2H)', () => {
  // ── 1. Fixture 1: NVD + CNA + KEV ──────────────────────────────────────────
  describe('Fixture 1: NVD + CNA + KEV', () => {
    it('reconciles NVD CPE ranges, authoritative vendor CNA advisory, and KEV exploitation without flattening', () => {
      const reconciled = reconcileOpenSourceEnrichment({
        cveId: FIXTURE_NVD_CNA_KEV.cveId,
        cisaKev: FIXTURE_NVD_CNA_KEV.cisaKev,
        nvdCpe: FIXTURE_NVD_CNA_KEV.nvdCpe,
        evidence: FIXTURE_NVD_CNA_KEV.authoritativeEvidence,
      });

      // Identity & provenance
      expect(reconciled.identity.cve).toBe('CVE-2024-3400');
      expect(reconciled.identity.vendor).toBe('Palo Alto Networks');
      expect(reconciled.identity.product).toBe('PAN-OS');
      expect(reconciled.sources_used).toContain('cisa-kev');

      // Exploitation evidence
      expect(reconciled.exploitation.status).toBe('KNOWN_EXPLOITED');
      expect(reconciled.exploitation.cisa_kev).toBe(true);
      expect(reconciled.exploitation.known_ransomware_campaign_use).toBe('Known');
      expect(reconciled.exploitation.sources).toContain('cisa-kev');

      // Vendor advisory
      expect(reconciled.vendor_advisory.url).toBe('https://security.paloaltonetworks.com/CVE-2024-3400');
      expect(reconciled.vendor_advisory.advisory_id).toBe('PAN-SA-2024-0002');
      expect(reconciled.affected_scope.fixed_versions).toEqual(['10.2.9-h1', '11.0.4-h1']);
    });
  });

  // ── 2. Fixture 2: NVD + EPSS ────────────────────────────────────────────────
  describe('Fixture 2: NVD + EPSS', () => {
    it('preserves EPSS as a distinct evidence dimension without conflating with active KEV exploitation', () => {
      const reconciled = reconcileOpenSourceEnrichment({
        cveId: FIXTURE_NVD_EPSS.cveId,
        cisaKev: null,
        nvdCpe: FIXTURE_NVD_EPSS.nvdCpe,
        epss: FIXTURE_NVD_EPSS.epss,
      });

      // EPSS is recorded with source-fact fidelity
      expect(reconciled.severity.epss).toBeDefined();
      expect(reconciled.severity.epss?.score).toBe('0.89240');
      expect(reconciled.severity.epss?.percentile).toBe('0.98750');
      expect(reconciled.severity.epss?.truth_type).toBe('SOURCE_FACT');

      // Must NOT fabricate KEV presence
      expect(reconciled.exploitation.cisa_kev).toBe(false);
      expect(reconciled.exploitation.status).not.toBe('KNOWN_EXPLOITED');
    });
  });

  // ── 3. Fixture 3: NVD + OSV ────────────────────────────────────────────────
  describe('Fixture 3: NVD + OSV', () => {
    it('preserves OSV package identity, ecosystem, aliases, and discrete versions alongside NVD CPEs', () => {
      const reconciled = reconcileOpenSourceEnrichment({
        cveId: FIXTURE_NVD_OSV.cveId,
        cisaKev: null,
        nvdCpe: FIXTURE_NVD_OSV.nvdCpe,
        osv: FIXTURE_NVD_OSV.osv,
      });

      // Ecosystem package scope
      expect(reconciled.identity.package).toBe('requests');
      expect(reconciled.identity.ecosystem).toBe('PyPI');
      expect(reconciled.sources_used).toContain('osv');
      expect(reconciled.sources_used).toContain('nvd-cpe');

      // Fixed version from OSV package feed
      expect(reconciled.affected_scope.fixed_versions).toContain('2.31.0');
    });
  });

  // ── 4. Fixture 4: NVD + GHSA ────────────────────────────────────────────────
  describe('Fixture 4: NVD + GHSA', () => {
    it('preserves GitHub Advisory package identity, vulnerable ranges, and patched release', () => {
      const reconciled = reconcileOpenSourceEnrichment({
        cveId: FIXTURE_NVD_GHSA.cveId,
        cisaKev: null,
        nvdCpe: FIXTURE_NVD_GHSA.nvdCpe,
        ghsa: FIXTURE_NVD_GHSA.ghsa,
      });

      expect(reconciled.identity.package).toBe('lodash');
      expect(reconciled.identity.ecosystem).toBe('npm');
      expect(reconciled.sources_used).toContain('github-advisory');
      expect(reconciled.affected_scope.fixed_versions).toContain('4.17.21');
    });
  });

  // ── 5. Fixture 5: NVD + MITRE / CISA Vulnrichment ───────────────────────────
  describe('Fixture 5: NVD + MITRE / CISA Vulnrichment', () => {
    it('integrates CISA ADP SSVC decision tree without destroying NVD CVSS metrics', () => {
      const reconciled = reconcileOpenSourceEnrichment({
        cveId: FIXTURE_NVD_MITRE.cveId,
        cisaKev: null,
        nvdCpe: FIXTURE_NVD_MITRE.nvdCpe,
        vulnrichment: FIXTURE_NVD_MITRE.vulnrichment,
      });

      // SSVC decision tree metrics
      expect(reconciled.exploitation.ssvc).toBeDefined();
      expect(reconciled.exploitation.ssvc?.exploitation).toBe('poc');
      expect(reconciled.exploitation.ssvc?.technical_impact).toBe('total');
      expect(reconciled.exploitation.ssvc?.automatable).toBe('yes');

      // NVD CVSS remains intact
      expect(reconciled.severity.cvss.score).toBe('9.8');
      expect(reconciled.sources_used).toContain('cisa-vulnrichment');
      expect(reconciled.sources_used).toContain('nvd-cpe');
    });
  });

  // ── 6. Fixture 6: Multi-Source Conflict Case ───────────────────────────────
  describe('Fixture 6: Multi-Source Conflict Case', () => {
    it('preserves intra-source CVSS conflict (CNA vs NVD vs CISA-ADP) as explicit CONFLICT state', () => {
      const reconciled = reconcileOpenSourceEnrichment({
        cveId: FIXTURE_MULTI_SOURCE_CONFLICT.cveId,
        cisaKev: FIXTURE_MULTI_SOURCE_CONFLICT.cisaKev,
        nvdCpe: FIXTURE_MULTI_SOURCE_CONFLICT.nvdCpe,
        vulnrichment: FIXTURE_MULTI_SOURCE_CONFLICT.vulnrichment,
      });

      // CVSS conflict is explicit
      expect(reconciled.severity.cvss.truth_type).toBe('CONFLICT');
      expect(reconciled.severity.cvss.conflicts.length).toBeGreaterThanOrEqual(1);

      // Verify the conflicting assessments are preserved
      const scores = reconciled.severity.cvss.conflicts.map(c => c.score);
      expect(scores).toContain('9.8'); // NVD
      expect(scores).toContain('8.1'); // CNA

      // CWE disagreement is explicit (CISA CWE-23 vs NVD CWE-22)
      expect(reconciled.weakness_fidelity.cwe_disagreement).toBe(true);
      expect(reconciled.weakness_fidelity.source_specific_cwes['cisa-kev']).toContain('CWE-23');
      expect(reconciled.weakness_fidelity.source_specific_cwes['nvd-cpe']).toContain('CWE-22');
    });
  });

  // ── 7. Source Availability & Failure Isolation ──────────────────────────────
  describe('7. Source Availability & Failure Isolation', () => {
    it('records explicit SOURCE_AVAILABLE, SOURCE_EMPTY, SOURCE_UNAVAILABLE, SOURCE_ERROR statuses', () => {
      const reconciled = reconcileOpenSourceEnrichment({
        cveId: 'CVE-2024-TEST-AVAIL',
        cisaKev: { cveID: 'CVE-2024-TEST-AVAIL', vendorProject: 'TestVendor', product: 'TestProduct' },
        nvdCpe: null,
        vulnrichment: null,
        osv: null,
        ghsa: null,
        epss: null,
        sourceStatuses: {
          'cisa-kev': 'SOURCE_AVAILABLE',
          'nvd-cpe': 'SOURCE_UNAVAILABLE',
          'cisa-vulnrichment': 'SOURCE_EMPTY',
          'osv': 'SOURCE_ERROR',
          'github-advisory': 'SOURCE_EMPTY',
          'first-epss': 'SOURCE_AVAILABLE',
          'exploit-db': 'SOURCE_AVAILABLE',
        },
      });

      expect(reconciled.source_availability).toBeDefined();
      expect(reconciled.source_availability?.['cisa-kev']).toBe('SOURCE_AVAILABLE');
      expect(reconciled.source_availability?.['nvd-cpe']).toBe('SOURCE_UNAVAILABLE');
      expect(reconciled.source_availability?.['cisa-vulnrichment']).toBe('SOURCE_EMPTY');
      expect(reconciled.source_availability?.['osv']).toBe('SOURCE_ERROR');
      expect(reconciled.source_availability?.['exploit-db']).toBe('SOURCE_AVAILABLE');

      // Unavailable/error source data is NEVER converted to fabricated facts
      expect(reconciled.affected_scope.fixed_versions).toHaveLength(0);
      expect(reconciled.sources_used).not.toContain('nvd-cpe');
      expect(reconciled.sources_used).not.toContain('osv');
    });
  });

  // ── 8. Source 7: Exploit-DB Canonical Production Integration ───────────────
  describe('8. Source 7: Exploit-DB Canonical Production Integration', () => {
    it('integrates Exploit-DB PoC evidence into the canonical entity and preserves separation from active KEV exploitation', () => {
      const reconciled = reconcileOpenSourceEnrichment({
        cveId: 'CVE-2024-3400',
        cisaKev: null, // No KEV active exploitation
        exploitDb: {
          status: 'FOUND',
          exploit_id: 'EDB-ID-52000',
          source_url: 'https://www.exploit-db.com/exploits/52000',
          title: 'Palo Alto Networks PAN-OS GlobalProtect - Command Injection Proof of Concept',
          publication_date: '2024-04-16',
          affected_cve: 'CVE-2024-3400',
          source_confidence: 1.0,
        },
      });

      // Proof of canonical integration
      expect(reconciled.exploitation.exploit_db).toBeDefined();
      expect(reconciled.exploitation.exploit_db?.status).toBe('FOUND');
      expect(reconciled.exploitation.exploit_db?.exploit_id).toBe('EDB-ID-52000');
      expect(reconciled.exploitation.exploit_db?.url).toBe('https://www.exploit-db.com/exploits/52000');
      expect(reconciled.exploitation.exploit_db?.truth_type).toBe('SOURCE_FACT');
      expect(reconciled.exploitation.public_exploit_available).toBe(true);

      // Provenance preserved in sources_used and source_availability
      expect(reconciled.sources_used).toContain('exploit-db');
      expect(reconciled.source_availability?.['exploit-db']).toBe('SOURCE_AVAILABLE');

      // Critical requirement: Exploit availability MUST NOT elevate exploitation status to KNOWN_EXPLOITED
      expect(reconciled.exploitation.status).toBe('NO_EVIDENCE');
      expect(reconciled.exploitation.cisa_kev).toBe(false);
    });

    it('handles negative Exploit-DB status using consistent empty-source semantics', () => {
      const reconciled = reconcileOpenSourceEnrichment({
        cveId: 'CVE-2026-99999',
        cisaKev: null,
        exploitDb: {
          status: 'NOT_FOUND',
          affected_cve: 'CVE-2026-99999',
          source_confidence: 0.0,
        },
      });

      expect(reconciled.exploitation.exploit_db?.status).toBe('NOT_FOUND');
      expect(reconciled.exploitation.exploit_db?.truth_type).toBe('NOT_AVAILABLE');
      expect(reconciled.exploitation.public_exploit_available).toBe(false);
      expect(reconciled.sources_used).not.toContain('exploit-db');
      expect(reconciled.source_availability?.['exploit-db']).toBe('SOURCE_EMPTY');
    });
  });

  // ── 9. Provenance Separation: MITRE_CVE vs CISA_ADP ─────────────────────────
  describe('9. Provenance Separation: MITRE_CVE vs CISA_ADP', () => {
    it('preserves distinct source identity, evidence lineage, and explicit conflicts between MITRE CNA and CISA ADP', () => {
      const mockVulnrichment = {
        source: 'cisa-vulnrichment' as const,
        source_record_id: 'CVE-2024-TEST-PROV',
        mitre_cve: {
          source: 'mitre-cve' as const,
          cna_provider: 'Vendor-CNA',
          description: 'CNA published vulnerability description',
          cvss: {
            score: '7.5',
            vector: 'CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:N/A:N',
            version: '3.1',
            source: 'Vendor-CNA',
          },
          cwe_ids: ['CWE-79'],
          affected_versions: ['1.0.0', '1.1.0'],
        },
        cisa_adp: {
          source: 'cisa-adp' as const,
          ssvc: {
            exploitation: 'poc',
            automatable: 'yes',
            technical_impact: 'partial',
          },
          cvss: {
            score: '8.8',
            vector: 'CVSS:3.1/AV:N/AC:L/PR:L/UI:N/S:U/C:H/I:H/A:H',
            version: '3.1',
            source: 'CISA-ADP',
          },
          cwe_ids: ['CWE-89'],
          affected_versions: ['< 2.0.0'],
        },
      };

      const reconciled = reconcileOpenSourceEnrichment({
        cveId: 'CVE-2024-TEST-PROV',
        cisaKev: null,
        vulnrichment: mockVulnrichment,
      });

      // 1. Source identities are distinctly retained
      expect(reconciled.sources_used).toContain('mitre-cve');
      expect(reconciled.sources_used).toContain('cisa-adp');

      // 2. Source-specific CWE evidence is distinctly retained without silent overwriting
      expect(reconciled.weakness_fidelity.source_specific_cwes['mitre-cve']).toEqual(['CWE-79']);
      expect(reconciled.weakness_fidelity.source_specific_cwes['cisa-adp']).toEqual(['CWE-89']);

      // 3. Conflicts between MITRE CNA and CISA ADP remain explicit
      expect(reconciled.severity.cvss.truth_type).toBe('CONFLICT');
      const conflictSources = (reconciled.severity.cvss.conflicts || []).map(c => c.source);
      expect(conflictSources).toContain('Vendor-CNA');
      expect(conflictSources).toContain('CISA-ADP');

      // 4. Source availability reflects both distinctly
      expect(reconciled.source_availability?.['mitre-cve']).toBe('SOURCE_AVAILABLE');
      expect(reconciled.source_availability?.['cisa-adp']).toBe('SOURCE_AVAILABLE');
    });
  });
});
