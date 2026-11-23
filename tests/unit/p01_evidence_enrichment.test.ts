/**
 * P0.1 — Evidence-based enrichment: adversarial acceptance suite.
 *
 * Exercises the change through its REAL entry points:
 *   1. enrichAuthoritativeData directly (boundary/empty-input surface)
 *   2. executeDeepIntelligenceAnalysisV2 (the production entry used by the
 *      Telegram collector and the API worker)
 *
 * Guarantees under test:
 *   - KEV facts come ONLY from injected KevEvidencePort evidence
 *   - unlisted CVE → not-in-KEV + ABSENT provenance + no fabricated fields
 *   - EPSS without evidence → null (UNKNOWN), never a synthesized score
 *   - text mentions of "CISA KEV" demoted to telemetry, never catalog membership
 *   - falsifiability: removing fixture evidence flips every derived output
 */

import { describe, test, expect } from 'bun:test';
import {
  enrichAuthoritativeData,
  determineExploitStatus,
  parseCvssVector,
} from '../../packages/intelligence/src/engine_v2/enrichment';
import { executeDeepIntelligenceAnalysisV2 } from '../../packages/intelligence/src/engine_v2';
import {
  KEV_EVIDENCE_FIXTURE,
  createKevEvidenceFixturePort,
} from '../fixtures/kev_evidence_fixture';

describe('P0.1 evidence-based enrichment — direct module boundary', () => {
  const unlistedCve = 'CVE-2026-99999';

  test('empty input: null cveId with no ports yields not-in-KEV, ABSENT provenance, null EPSS', () => {
    const out = enrichAuthoritativeData({
      rawText: '',
      cveId: null,
      extractedCvssScore: null,
      extractedCvssSeverity: null,
      extractedCvssVector: null,
    });
    expect(out.cve_id).toBeNull();
    expect(out.cisa_kev.is_in_kev).toBe(false);
    expect(out.kev_evidence.status).toBe('ABSENT');
    expect(out.kev_evidence.source_id).toBeNull();
    expect(out.cisa_kev.date_added).toBeUndefined();
    expect(out.cisa_kev.ransomware_campaign_use).toBeUndefined();
    expect(out.cisa_kev.required_action).toBeUndefined();
    expect(out.epss.score).toBeNull();
    expect(out.epss.percentile).toBeNull();
    expect(out.epss_evidence.status).toBe('ABSENT');
  });

  test('empty input: empty rawText with empty ports and a real CVE claims NO KEV membership', () => {
    const out = enrichAuthoritativeData({
      rawText: '',
      cveId: unlistedCve,
      extractedCvssScore: null,
      extractedCvssSeverity: null,
      extractedCvssVector: null,
    });
    expect(out.cisa_kev.is_in_kev).toBe(false);
    expect(out.kev_evidence.status).toBe('ABSENT');
    expect(out.cisa_kev.date_added).toBeUndefined();
    expect(out.exploit_status).toBe('VULNERABILITY_EXISTS');
    expect(out.analyst_priority).toBe('P4');
  });

  test('text mention of "CISA KEV" does NOT create catalog membership — telemetry only', () => {
    const out = enrichAuthoritativeData({
      rawText: 'This vulnerability is referenced in the CISA KEV catalog per community reports.',
      cveId: unlistedCve,
      extractedCvssScore: null,
      extractedCvssSeverity: null,
      extractedCvssVector: null,
    });
    expect(out.cisa_kev.is_in_kev).toBe(false); // demoted from fabricated membership
    expect(out.kev_evidence.status).toBe('ABSENT');
    expect(out.exploit_status).toBe('EXPLOITATION_IN_THE_WILD'); // preserved as textual telemetry
  });

  test('injected fixture evidence: listed CVE gets confirmed membership, facts, provenance', () => {
    const out = enrichAuthoritativeData({
      rawText: 'CVE-2023-34362 MOVEit Transfer SQL injection.',
      cveId: 'CVE-2023-34362',
      extractedCvssScore: 9.8,
      extractedCvssSeverity: null,
      extractedCvssVector: 'CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H',
      referenceUrls: [],
      kevEvidence: createKevEvidenceFixturePort(),
    });
    expect(out.cisa_kev.is_in_kev).toBe(true);
    expect(out.cisa_kev.date_added).toBe('2023-06-02');
    expect(out.cisa_kev.ransomware_campaign_use).toBe(true);
    expect(out.cisa_kev.required_action).toBe('Apply MOVEit Transfer patch or isolate application.');
    expect(out.kev_evidence.status).toBe('CONFIRMED');
    expect(out.kev_evidence.source_id).toBe('cisa-kev');
    expect(out.kev_evidence.catalog_version).toBe('test-fixture-2026-09-18');
    expect(out.exploit_status).toBe('EXPLOITATION_IN_THE_WILD');
    expect(out.analyst_priority).toBe('P1');
  });

  test('partial evidence: catalog lists CVE but does not establish ransomware use → null, not false', () => {
    const rec = KEV_EVIDENCE_FIXTURE['CVE-2023-2868'];
    expect(rec.ransomware_campaign_use).toBeNull();
    const out = enrichAuthoritativeData({
      rawText: 'Barracuda ESG appliance vulnerability.',
      cveId: 'CVE-2023-2868',
      extractedCvssScore: null,
      extractedCvssSeverity: null,
      extractedCvssVector: null,
      kevEvidence: createKevEvidenceFixturePort(),
    });
    expect(out.cisa_kev.is_in_kev).toBe(true);
    expect(out.cisa_kev.ransomware_campaign_use).toBeNull(); // UNKNOWN preserved
  });

  test('case handling: lowercase CVE id is normalized for evidence lookup', () => {
    const out = enrichAuthoritativeData({
      rawText: 'MOVEit Transfer vulnerability.',
      cveId: 'cve-2023-34362',
      extractedCvssScore: null,
      extractedCvssSeverity: null,
      extractedCvssVector: null,
      kevEvidence: createKevEvidenceFixturePort(),
    });
    expect(out.cve_id).toBe('CVE-2023-34362');
    expect(out.cisa_kev.is_in_kev).toBe(true);
  });

  test('EPSS with evidence: measured score flows through with provenance', () => {
    const out = enrichAuthoritativeData({
      rawText: '',
      cveId: 'CVE-2023-34362',
      extractedCvssScore: null,
      extractedCvssSeverity: null,
      extractedCvssVector: null,
      epssEvidence: { lookup: () => ({ cve_id: 'CVE-2023-34362', score: 0.94, percentile: 99, retrieved_at: '2026-09-18T00:00:00.000Z' }) },
    });
    expect(out.epss.score).toBe(0.94);
    expect(out.epss.percentile).toBe(99);
    expect(out.epss_evidence.status).toBe('CONFIRMED');
  });

  test('EPSS evidence present but unusable (null score) → UNKNOWN propagates, provenance CONFIRMED', () => {
    const out = enrichAuthoritativeData({
      rawText: '',
      cveId: 'CVE-2023-34362',
      extractedCvssScore: null,
      extractedCvssSeverity: null,
      extractedCvssVector: null,
      epssEvidence: { lookup: () => ({ cve_id: 'CVE-2023-34362', score: null, percentile: null, retrieved_at: '2026-09-18T00:00:00.000Z' }) },
    });
    expect(out.epss.score).toBeNull();
    expect(out.epss_evidence.status).toBe('CONFIRMED'); // evidence ingested; value unknown
  });

  test('FALSIFIABILITY: evidence restricted to one CVE removes membership from all other fixture CVEs', () => {
    const port = createKevEvidenceFixturePort(['CVE-2024-3400']);
    const a = enrichAuthoritativeData({
      rawText: '', cveId: 'CVE-2024-3400', extractedCvssScore: 10, extractedCvssSeverity: null, extractedCvssVector: null, kevEvidence: port,
    });
    const b = enrichAuthoritativeData({
      rawText: '', cveId: 'CVE-2021-44228', extractedCvssScore: 10, extractedCvssSeverity: null, extractedCvssVector: null, kevEvidence: port,
    });
    expect(a.cisa_kev.is_in_kev).toBe(true);
    expect(b.cisa_kev.is_in_kev).toBe(false); // proves output is driven by the injected port, not any internal registry
    expect(b.kev_evidence.status).toBe('ABSENT');
  });

  test('ordering/determinism: same inputs produce byte-identical enrichment', () => {
    const input = {
      rawText: 'A vulnerability. Proof-of-concept available.',
      cveId: 'CVE-2026-88888',
      extractedCvssScore: 7.5,
      extractedCvssSeverity: null,
      extractedCvssVector: 'CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H',
      referenceUrls: ['https://github.com/x/exploit'],
    };
    const one = enrichAuthoritativeData(input);
    const two = enrichAuthoritativeData(input);
    expect(JSON.stringify(one)).toBe(JSON.stringify(two));
    expect(one.exploit_status).toBe('PUBLIC_EXPLOIT_EXISTS');
  });

  test('determineExploitStatus: KEV evidence drives in-the-wild even with silent text', () => {
    expect(determineExploitStatus({ text: '', cveId: 'CVE-2024-3400', inKev: true })).toBe('EXPLOITATION_IN_THE_WILD');
    expect(determineExploitStatus({ text: '', cveId: 'CVE-2026-1234', inKev: false })).toBe('VULNERABILITY_EXISTS');
  });

  test('parseCvssVector: malformed and empty vectors degrade safely', () => {
    expect(parseCvssVector('')).toBeUndefined();
    expect(parseCvssVector('not-a-vector')).toBeUndefined();
    expect(parseCvssVector('CVSS:3.1/AV:N/XX:Q')!.attack_vector).toBe('NETWORK');
  });
});

describe('P0.1 — production entry point: executeDeepIntelligenceAnalysisV2', () => {
  const unlistedCve = 'CVE-2026-99999';

  test('unlisted CVE pipeline: no KEV facts, EPSS UNKNOWN claim, quality gate passes', () => {
    const rawSignal = `
Security researcher advisory for a component.
${unlistedCve}
CVSS Base Score: 6.1 (MEDIUM)
A cross-site scripting flaw allows attackers to inject scripts.
    `.trim();

    const { report, qualityGate } = executeDeepIntelligenceAnalysisV2({
      sourceId: 'tg_research',
      channelTitle: 'Research Feed',
      messageId: 'p01-1',
      rawText: rawSignal,
      // no kevEvidence / epssEvidence injected: the no-evidence default
    });

    expect(report.enrichment.cisa_kev.is_in_kev).toBe(false);
    expect(report.enrichment.kev_evidence.status).toBe('ABSENT');
    expect(report.enrichment.epss.score).toBeNull();
    const kevClaim = report.claims.find(c => c.statement.startsWith('CISA KEV status:'));
    expect(kevClaim).toBeDefined();
    expect(kevClaim!.statement).toContain('UNKNOWN, not confirmed absent');
    const epssClaim = report.claims.find(c => c.statement.includes('EPSS exploitation probability'));
    expect(epssClaim).toBeUndefined(); // no fabricated EPSS claim
    expect(qualityGate.passed).toBe(true);
  });

  test('evidence-injected pipeline: listed CVE gets confirmed KEV claim + P1 priority', () => {
    const rawSignal = `
Progress MOVEit Transfer SQL injection vulnerability.
CVE-2023-34362
CVSS Base Score: 9.8 (CRITICAL)
Confirmed exploitation in the wild listed in CISA KEV catalog.
    `.trim();

    const { report, qualityGate } = executeDeepIntelligenceAnalysisV2({
      sourceId: 'tg_moveit',
      channelTitle: 'MOVEit Advisories',
      messageId: 'p01-2',
      rawText: rawSignal,
      kevEvidence: createKevEvidenceFixturePort(),
    });

    expect(report.enrichment.cisa_kev.is_in_kev).toBe(true);
    expect(report.enrichment.kev_evidence.status).toBe('CONFIRMED');
    expect(report.enrichment.cisa_kev.date_added).toBe('2023-06-02');
    expect(report.enrichment.exploit_status).toBe('EXPLOITATION_IN_THE_WILD');
    expect(report.priority).toBe('P1');
    const kevClaim = report.claims.find(c => c.statement.includes('Included in CISA Known Exploited Vulnerabilities catalog.'));
    expect(kevClaim).toBeDefined();
    expect(qualityGate.passed).toBe(true);
  });

  test('compiled report renders EPSS UNKNOWN instead of a fabricated 0.0%', () => {
    const rawSignal = `
Advisory with unknown exploitation probability.
CVE-2026-99998
CVSS Base Score: 5.5 (MEDIUM)
A medium-severity flaw in a library.
    `.trim();

    const { report } = executeDeepIntelligenceAnalysisV2({
      sourceId: 'tg_lib',
      channelTitle: 'Library Advisories',
      messageId: 'p01-3',
      rawText: rawSignal,
    });
    const threatSection = report.sections.find(s => s.title.includes('THREAT'));
    expect(threatSection).toBeDefined();
    expect(threatSection!.content).toContain('UNKNOWN (no measured EPSS evidence available)');
    expect(threatSection!.content).not.toContain('0.0%');
  });
});
