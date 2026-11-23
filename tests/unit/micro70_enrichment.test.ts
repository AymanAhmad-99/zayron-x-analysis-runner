import { describe, it, expect } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  parseCisaVulnrichment,
  parseOsvRecord,
  parseGhsaAdvisories,
  parseNvdCpeData,
  reconcileOpenSourceEnrichment,
} from '../../packages/intelligence/src/sources/adapters';

describe('MICRO TASK 70 — Open-Source Vulnerability Enrichment Integration', () => {
  // ── 1. CISA Vulnrichment Parsing ─────────────────────────────────────────
  describe('CISA Vulnrichment Adapter', () => {
    it('parses SSVC and ADP data for CVE-2021-22005', () => {
      const raw = JSON.parse(readFileSync(join(process.cwd(), 'vendor/cisa-vulnrichment/fixtures/CVE-2021-22005.json'), 'utf8'));
      const parsed = parseCisaVulnrichment('CVE-2021-22005', raw);

      expect(parsed).not.toBeNull();
      expect(parsed?.source).toBe('cisa-vulnrichment');
      expect(parsed?.ssvc?.exploitation).toBe('active');
      expect(parsed?.ssvc?.automatable).toBe('yes');
      expect(parsed?.ssvc?.technical_impact).toBe('total');
    });

    it('parses SSVC partial impact for appliance CVE-2023-46805', () => {
      const raw = JSON.parse(readFileSync(join(process.cwd(), 'vendor/cisa-vulnrichment/fixtures/CVE-2023-46805.json'), 'utf8'));
      const parsed = parseCisaVulnrichment('CVE-2023-46805', raw);

      expect(parsed).not.toBeNull();
      expect(parsed?.ssvc?.exploitation).toBe('active');
      expect(parsed?.ssvc?.automatable).toBe('yes');
      expect(parsed?.ssvc?.technical_impact).toBe('partial');
    });
  });

  // ── 2. GitHub Advisory Database (GHSA) Parsing ───────────────────────────
  describe('GitHub Advisory Adapter', () => {
    it('extracts package, ecosystem, ranges and fixed version for Log4j', () => {
      const raw = JSON.parse(readFileSync(join(process.cwd(), 'tests/fixtures/GHSA-jfh8-c2jp-5v3q.json'), 'utf8'));
      const parsed = parseGhsaAdvisories('CVE-2021-44228', raw);

      expect(parsed).not.toBeNull();
      expect(parsed?.source).toBe('github-advisory');
      expect(parsed?.package).toBe('org.apache.logging.log4j:log4j-core');
      expect(parsed?.ecosystem).toBe('maven');
      expect(parsed?.fixed_versions).toContain('2.15.0');
      expect(parsed?.affected_versions?.some(v => v.includes('< 2.15.0'))).toBe(true);
    });

    it('returns null or empty package info when advisory has no package mapping', () => {
      const parsed = parseGhsaAdvisories('CVE-2023-46805', [{ ghsa_id: 'GHSA-dummy', vulnerabilities: [] }]);
      expect(parsed).not.toBeNull();
      expect(parsed?.package).toBeUndefined();
      expect(parsed?.ecosystem).toBeUndefined();
    });
  });

  // ── 3. NVD CPE Criteria Parsing ──────────────────────────────────────────
  describe('NVD CPE Matcher', () => {
    it('extracts CPE 2.3 criteria and vendor/product attributes', () => {
      const nvdSample = {
        configurations: [
          {
            nodes: [
              {
                cpeMatch: [
                  { criteria: 'cpe:2.3:a:vmware:vcenter_server:6.5:-:*:*:*:*:*:*', vulnerable: true },
                  { criteria: 'cpe:2.3:a:vmware:vcenter_server:6.7:-:*:*:*:*:*:*', vulnerable: true, versionStartIncluding: '6.7.0', versionEndExcluding: '6.7.0.51000' }
                ]
              }
            ]
          }
        ],
        metrics: {
          cvssMetricV31: [
            {
              cvssData: {
                baseScore: 9.8,
                vectorString: 'CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H',
                attackVector: 'NETWORK',
                privilegesRequired: 'NONE',
                userInteraction: 'NONE',
                baseSeverity: 'CRITICAL'
              }
            }
          ]
        }
      };

      const parsed = parseNvdCpeData(nvdSample);
      expect(parsed.cpes.length).toBe(2);
      expect(parsed.vendor).toBe('vmware');
      expect(parsed.product).toBe('vcenter_server');
      expect(parsed.cvss?.score).toBe('9.8');
      expect(parsed.attackVector).toBe('NETWORK');
      expect(parsed.affectedRanges).toContain('>= 6.7.0 < 6.7.0.51000');
    });
  });

  // ── 4. Source Reconciliation & Conflict Detection ────────────────────────
  describe('Source Reconciliation Engine', () => {
    const baseKev = {
      cveID: 'CVE-2021-44228',
      vendorProject: 'Apache',
      product: 'Log4j',
      vulnerabilityName: 'Apache Log4j Remote Code Execution Vulnerability',
      shortDescription: 'Apache Log4j contains a remote code execution vulnerability.',
    };

    it('reconciles open source package CVE with OSV/GHSA package identity', () => {
      const ghsaRaw = JSON.parse(readFileSync(join(process.cwd(), 'tests/fixtures/GHSA-jfh8-c2jp-5v3q.json'), 'utf8'));
      const ghsa = parseGhsaAdvisories('CVE-2021-44228', ghsaRaw);

      const vulnRaw = JSON.parse(readFileSync(join(process.cwd(), 'vendor/cisa-vulnrichment/fixtures/CVE-2021-44228.json'), 'utf8'));
      const vulnrichment = parseCisaVulnrichment('CVE-2021-44228', vulnRaw);

      const reconciled = reconcileOpenSourceEnrichment({
        cveId: 'CVE-2021-44228',
        cisaKev: baseKev,
        vulnrichment,
        ghsa,
        nvdCpe: { cpes: ['cpe:2.3:a:apache:log4j:2.0:*:*:*:*:*:*:*'], affectedRanges: ['>= 2.0 < 2.15.0'], cvss: { score: '10.0', vector: 'CVSS:3.1/AV:N', version: '3.1' } },
        epss: { score: '0.975', percentile: '0.999' }
      });

      expect(reconciled.identity.package).toBe('org.apache.logging.log4j:log4j-core');
      expect(reconciled.identity.ecosystem).toBe('maven');
      expect(reconciled.identity.truth_types.package).toBe('SOURCE_FACT');
      expect(reconciled.identity.truth_types.ecosystem).toBe('SOURCE_FACT');
      expect(reconciled.exploitation.ssvc?.exploitation).toBe('active');
      expect(reconciled.affected_scope.fixed_versions).toContain('2.15.0');
      expect(reconciled.sources_used).toContain('cisa-vulnrichment');
      expect(reconciled.sources_used).toContain('github-advisory');
    });

    it('sets NOT_APPLICABLE for package/ecosystem on appliance CVEs without packages', () => {
      const reconciled = reconcileOpenSourceEnrichment({
        cveId: 'CVE-2023-46805',
        cisaKev: { cveID: 'CVE-2023-46805', vendorProject: 'Ivanti', product: 'Connect Secure' },
        vulnrichment: {
          source: 'cisa-vulnrichment',
          source_record_id: 'CVE-2023-46805',
          ssvc: { exploitation: 'active', automatable: 'yes', technical_impact: 'partial' }
        },
        ghsa: { source: 'github-advisory', source_record_id: 'GHSA-dummy' },
        nvdCpe: { cpes: ['cpe:2.3:a:ivanti:connect_secure:9.0:*:*:*:*:*:*:*'], affectedRanges: [] },
        epss: { score: '0.85', percentile: '0.98' }
      });

      expect(reconciled.identity.package).toBeUndefined();
      expect(reconciled.identity.ecosystem).toBeUndefined();
      expect(reconciled.identity.truth_types.package).toBe('NOT_APPLICABLE');
      expect(reconciled.identity.truth_types.ecosystem).toBe('NOT_APPLICABLE');
      expect(reconciled.exploitation.ssvc?.technical_impact).toBe('partial');
    });

    it('detects CVSS conflict between NVD and CISA-ADP and preserves both references', () => {
      const reconciled = reconcileOpenSourceEnrichment({
        cveId: 'CVE-2021-22005',
        cisaKev: { cveID: 'CVE-2021-22005', vendorProject: 'VMware', product: 'vCenter Server' },
        vulnrichment: {
          source: 'cisa-vulnrichment',
          source_record_id: 'CVE-2021-22005',
          cvss: { score: '9.0', vector: 'CVSS:3.1/AV:N/AC:L/PR:L/UI:N/S:U/C:H/I:H/A:H', version: '3.1', source: 'CISA-ADP' }
        },
        nvdCpe: {
          cpes: ['cpe:2.3:a:vmware:vcenter_server:*:*:*:*:*:*:*:*'],
          affectedRanges: [],
          cvss: { score: '9.8', vector: 'CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H', version: '3.1' }
        }
      });

      expect(reconciled.severity.cvss.truth_type).toBe('CONFLICT');
      expect(reconciled.severity.cvss.conflicts?.length).toBe(2);
      expect(reconciled.severity.cvss.conflicts?.[0].score).toBe('9.8');
      expect(reconciled.severity.cvss.conflicts?.[1].score).toBe('9.0');
      expect(reconciled.reconciliation_notes.some(n => n.includes('CVSS conflict'))).toBe(true);
    });
  });
});
