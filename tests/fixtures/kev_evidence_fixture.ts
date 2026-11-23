/**
 * ISOLATED TEST FIXTURE — CISA KEV catalog evidence records.
 *
 * MOVED HERE from packages/intelligence/src/engine_v2/enrichment.ts
 * (KNOWN_CISA_KEV_ENTRIES) by the P0.1 migration. These are recorded
 * catalog snapshots captured from the CISA KEV feed for testing ONLY.
 *
 * PRODUCTION RULE: enrichment never imports this file. Production wires a
 * KevEvidencePort backed by the real CISA KEV feed (via D1 kev_state or a
 * direct fetch). A record here proves behavior against known catalog
 * evidence; it is NOT production intelligence.
 */

import type { KevEvidencePort, KevEvidenceRecord } from '../../../packages/intelligence/src/engine_v2/enrichment';

const KEV_FEED_URL = 'https://www.cisa.gov/sites/default/files/feeds/known_exploited_vulnerabilities.json';
const FIXTURE_CATALOG_VERSION = 'test-fixture-2026-09-18';
const FIXTURE_RETRIEVED_AT = '2026-09-18T00:00:00.000Z';

export const KEV_EVIDENCE_FIXTURE: Record<string, Omit<KevEvidenceRecord, 'cve_id'>> = {
  'CVE-2023-34362': {
    date_added: '2023-06-02',
    ransomware_campaign_use: true,
    required_action: 'Apply MOVEit Transfer patch or isolate application.',
    source_id: 'cisa-kev',
    source_url: KEV_FEED_URL,
    catalog_version: FIXTURE_CATALOG_VERSION,
    retrieved_at: FIXTURE_RETRIEVED_AT,
  },
  'CVE-2023-2868': {
    date_added: '2023-05-26',
    // null: catalog evidence does not establish ransomware campaign use (UNKNOWN, not false)
    ransomware_campaign_use: null,
    required_action: 'Replace affected Barracuda ESG hardware appliances.',
    source_id: 'cisa-kev',
    source_url: KEV_FEED_URL,
    catalog_version: FIXTURE_CATALOG_VERSION,
    retrieved_at: FIXTURE_RETRIEVED_AT,
  },
  'CVE-2024-3400': {
    date_added: '2024-04-12',
    ransomware_campaign_use: true,
    required_action: 'Apply Palo Alto PAN-OS hotfix and disable device telemetry.',
    source_id: 'cisa-kev',
    source_url: KEV_FEED_URL,
    catalog_version: FIXTURE_CATALOG_VERSION,
    retrieved_at: FIXTURE_RETRIEVED_AT,
  },
  'CVE-2024-21887': {
    date_added: '2024-01-11',
    ransomware_campaign_use: true,
    required_action: 'Apply Ivanti Connect Secure mitigation XML and upgrade firmware.',
    source_id: 'cisa-kev',
    source_url: KEV_FEED_URL,
    catalog_version: FIXTURE_CATALOG_VERSION,
    retrieved_at: FIXTURE_RETRIEVED_AT,
  },
  'CVE-2024-1709': {
    date_added: '2024-02-21',
    ransomware_campaign_use: true,
    required_action: 'Upgrade ScreenConnect instances to 23.9.8 or higher immediately.',
    source_id: 'cisa-kev',
    source_url: KEV_FEED_URL,
    catalog_version: FIXTURE_CATALOG_VERSION,
    retrieved_at: FIXTURE_RETRIEVED_AT,
  },
  'CVE-2023-22515': {
    date_added: '2023-10-04',
    ransomware_campaign_use: true,
    required_action: 'Upgrade Confluence Data Center or restrict external ingress.',
    source_id: 'cisa-kev',
    source_url: KEV_FEED_URL,
    catalog_version: FIXTURE_CATALOG_VERSION,
    retrieved_at: FIXTURE_RETRIEVED_AT,
  },
  'CVE-2023-4966': {
    date_added: '2023-10-18',
    ransomware_campaign_use: true,
    required_action: 'Apply NetScaler patch and kill all active HTTP sessions.',
    source_id: 'cisa-kev',
    source_url: KEV_FEED_URL,
    catalog_version: FIXTURE_CATALOG_VERSION,
    retrieved_at: FIXTURE_RETRIEVED_AT,
  },
  'CVE-2021-44228': {
    date_added: '2021-12-10',
    ransomware_campaign_use: true,
    required_action: 'Upgrade Log4j2 to 2.17.1+ or apply system property mitigation.',
    source_id: 'cisa-kev',
    source_url: KEV_FEED_URL,
    catalog_version: FIXTURE_CATALOG_VERSION,
    retrieved_at: FIXTURE_RETRIEVED_AT,
  },
};

export function createKevEvidenceFixturePort(cves?: string[]): KevEvidencePort {
  const keys = cves ?? Object.keys(KEV_EVIDENCE_FIXTURE);
  const allowed = new Set(keys.map(k => k.toUpperCase()));
  return {
    lookup(cveId: string): KevEvidenceRecord | null {
      const rec = KEV_EVIDENCE_FIXTURE[cveId.toUpperCase()];
      if (!rec || !allowed.has(cveId.toUpperCase())) return null;
      return { cve_id: cveId.toUpperCase(), ...rec };
    },
  };
}
