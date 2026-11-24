/**
 * Phase 5A — CTI Enrichment v2 contract.
 *
 * Covers the five defects that made `CVE-2026-132147` score 5.5/10:
 *   1. CVE.org / CISA ADP / OSV parsing with provider attribution;
 *   2. the separated exploitation posture (PoC ≠ validation ≠ in-the-wild);
 *   3. the deterministic, auditable P0–P3 rule;
 *   4. identifier / blast-radius / upgrade-branch guardrails;
 *   5. the pending banner that contradicted a rendered brief.
 */
import { describe, expect, it } from 'bun:test';
import {
  parseCveOrgRecord,
  parseOsvRecordPayload,
  mergeEnrichment,
  CISA_ADP_PROVIDER,
} from '../../workers/ingest/src/ctiEnrichment';
import {
  AI_STRATEGIC_PROMPT_VERSION,
  applyDeterministicPriority,
  computeBaselinePriority,
  exploitationPostureFromFacts,
  validateStrategicBriefGrounding,
  validateStrategicBriefShape,
  type StrategicBrief,
  type StrategicCveFacts,
} from '../../packages/intelligence/src/vulnerability/strategicAssessment';
import {
  buildAuthoritativeAdvisory,
  shouldShowAnalysisPendingNotice,
} from '../../packages/intelligence/src/vulnerability/reportIntegrity';

// ── fixtures ────────────────────────────────────────────────────────────────

const CVE_ORG_PAYLOAD = {
  dataType: 'CVE_RECORD',
  dataVersion: '5.2',
  cveMetadata: {
    cveId: 'CVE-2026-132147',
    state: 'PUBLISHED',
    datePublished: '2026-11-22T15:59:21.811Z',
    dateUpdated: '2026-11-23T20:14:48.478Z',
  },
  containers: {
    cna: {
      providerMetadata: { orgId: '79363d38', shortName: 'debian' },
      affected: [{
        vendor: 'Debian',
        product: 'debbugs',
        defaultStatus: 'unaffected',
        versions: [{ status: 'affected', version: '0', lessThan: '2fbf06866c9322090675a37aa55e4e7fa560bce0', versionType: 'git' }],
      }],
      problemTypes: [],
      references: [{ url: 'https://salsa.debian.org/debbugs-team/debbugs/-/commit/2fbf0686', tags: ['Patch'] }],
      metrics: [],
    },
    adp: [{
      title: 'CISA ADP Vulnrichment',
      providerMetadata: { orgId: '134c704f-9b21-4f2e-91b3-4a467353bcc0', shortName: 'CISA-ADP' },
      problemTypes: [{ descriptions: [{ lang: 'en', description: 'CWE-22', type: 'CWE' }] }],
      metrics: [
        { cvssV3_1: { version: '3.1', baseScore: 7.5, vectorString: 'CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:N/A:N' } },
        { other: { type: 'ssvc', content: { timestamp: '2026-11-23T00:00:00Z', options: [{ Exploitation: 'none' }, { Automatable: 'yes' }, { 'Technical Impact': 'partial' }] } } },
      ],
      references: [],
    }],
  },
};

const OSV_PAYLOAD = {
  id: 'OSV-2026-9999',
  aliases: ['CVE-2026-132147'],
  affected: [{
    package: { ecosystem: 'Debian:13', name: 'debbugs' },
    ranges: [{ type: 'ECOSYSTEM', events: [{ introduced: '0' }, { fixed: '2.6.6' }] }],
  }],
  references: [{ type: 'ADVISORY', url: 'https://security-tracker.debian.org/tracker/CVE-2026-132147' }],
};

function facts(overrides: Partial<StrategicCveFacts> = {}): StrategicCveFacts {
  return {
    cve_id: 'CVE-2026-132147',
    description: 'An arbitrary file read vulnerability was discovered in debbugs. versions.cgi failed to correctly sanitize package name inputs in found and fixed query parameters. Crafted query parameters could cause version.cgi to output any lines of the target file which contained spaces.',
    severity: 'HIGH',
    cvss_score: 7.5,
    cvss_vector: 'CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:N/A:N',
    epss_score: 0.00822,
    epss_percentile: 0.58065,
    known_exploited: false,
    kev_due_date: null,
    vendor: 'Debian',
    product: 'debbugs',
    cwe_ids: ['CWE-22'],
    affected_versions: [],
    fixed_versions: [],
    references: [],
    exploit_code_public: false,
    public_poc_status: 'NOT_OBSERVED',
    cisa_ssvc: { exploitation: 'none', automatable: 'yes', technical_impact: 'partial' },
    ...overrides,
  };
}

function brief(overrides: Partial<StrategicBrief> = {}): StrategicBrief {
  return {
    executive_bluf: 'Debbugs discloses arbitrary file lines through crafted query parameters, exposing configuration data to an unauthenticated remote attacker with no user interaction required.',
    exploitation_mechanics: {
      attack_path: 'An unauthenticated request to versions.cgi with crafted found and fixed parameters reaches the file disclosure path without sanitization.',
      preconditions: ['Network access to the debbugs web interface'],
      blast_radius: 'Lines of files readable by the web service account, disclosed conditionally when the target line contains spaces.',
      public_exploitation: 'NOT_CONFIRMED',
    },
    operational_prioritization: {
      rationale: 'CVSS 7.5 with a network attack vector and no user interaction, EPSS 0.8% and no CISA KEV listing.',
      remediation_sla: '14–30 days',
      priority: 'P2',
    },
    defender_playbook: {
      immediate_actions: ['Inspect and sanitize the found and fixed query parameters at the WAF'],
      upgrade_targets: [],
      detection_focus: ['Audit web server access logs for unusual versions.cgi query parameters'],
    },
    ...overrides,
  };
}

// ── 1. CVE.org + CISA ADP ──────────────────────────────────────────────────

describe('1 — CVE.org / CISA ADP parsing', () => {
  it('extracts the CNA entity, the fix commit reference and the git range', () => {
    const { patch, facts: observed } = parseCveOrgRecord('CVE-2026-132147', CVE_ORG_PAYLOAD);
    expect(patch.affected_vendor).toBe('Debian');
    expect(patch.affected_product).toBe('debbugs');
    expect(patch.affected_versions?.[0]).toContain('commit 2fbf06866c93');
    // A git boundary is a fix reference, never a released fixed version.
    expect(patch.fixed_versions ?? []).toEqual([]);
    expect(patch.references?.some((ref) => ref.tags.includes('Patch'))).toBe(true);
    expect(patch.modified_at).toBe('2026-11-23T20:14:48.478Z');
    expect(observed).toContain('vendor:cna');
  });

  it('attributes CWE, CVSS and SSVC to CISA ADP Vulnrichment', () => {
    const { patch } = parseCveOrgRecord('CVE-2026-132147', CVE_ORG_PAYLOAD);
    expect(patch.cwe_ids).toEqual([{ id: 'CWE-22', source: CISA_ADP_PROVIDER }]);
    expect(patch.cvss_source_provider).toBe(CISA_ADP_PROVIDER);
    expect(patch.cvss_source_type).toBe('Secondary');
    expect(patch.ssvc).toMatchObject({ exploitation: 'none', automatable: 'yes', technical_impact: 'partial' });
  });

  it('reports NOT_OBSERVED rather than claiming no PoC exists anywhere', () => {
    const { patch } = parseCveOrgRecord('CVE-2026-132147', CVE_ORG_PAYLOAD);
    expect(patch.public_poc_status).toBe('NOT_OBSERVED');
    expect(patch.poc_references).toEqual([]);
  });
});

// ── 2. OSV.dev ─────────────────────────────────────────────────────────────

describe('2 — OSV.dev package matrix', () => {
  it('extracts the distro package and the fixed release', () => {
    const { patch } = parseOsvRecordPayload('CVE-2026-132147', OSV_PAYLOAD);
    expect(patch.affected_vendor).toBe('Debian:13');
    expect(patch.affected_product).toBe('debbugs');
    expect(patch.fixed_versions).toEqual(['2.6.6']);
    expect(patch.affected_versions?.[0]).toContain('2.6.6');
  });

  it('ignores a record whose alias does not match the requested CVE', () => {
    const { patch, facts: observed } = parseOsvRecordPayload('CVE-2026-000001', OSV_PAYLOAD);
    expect(patch).toEqual({});
    expect(observed).toContain('osv:alias_mismatch');
  });

  it('never lets an empty source erase a richer fact', () => {
    const merged = mergeEnrichment([
      { fixed_versions: ['2.6.6'], public_poc_status: 'NOT_OBSERVED' },
      { fixed_versions: [], public_poc_status: 'OBSERVED', cwe_ids: [{ id: 'CWE-22', source: 'NVD' }] },
    ]);
    expect(merged.fixed_versions).toEqual(['2.6.6']);
    expect(merged.public_poc_status).toBe('OBSERVED');
    expect(merged.cwe_ids).toHaveLength(1);
  });
});

// ── 3. separated exploitation posture ──────────────────────────────────────

describe('3 — separated exploitation posture', () => {
  it('keeps PoC observation, validation and in-the-wild exploitation independent', () => {
    const posture = exploitationPostureFromFacts(facts({ public_poc_status: 'OBSERVED' }));
    expect(posture.public_poc_status).toBe('OBSERVED');
    // A public PoC proves authoring, never validation.
    expect(posture.poc_validation).toBe('NOT_VALIDATED');
    expect(posture.in_the_wild_exploitation).toBe('UNKNOWN');
    expect(posture.cisa_kev).toBe('NOT_LISTED');
  });

  it('marks in-the-wild CONFIRMED only from CISA KEV', () => {
    const posture = exploitationPostureFromFacts(facts({ known_exploited: true }));
    expect(posture.in_the_wild_exploitation).toBe('CONFIRMED');
    expect(posture.cisa_kev).toBe('LISTED');
  });

  it('carries the CISA SSVC decision points through unchanged', () => {
    const posture = exploitationPostureFromFacts(facts());
    expect(posture.cisa_ssvc).toMatchObject({ exploitation: 'none', automatable: 'yes', technical_impact: 'partial' });
  });
});

// ── 4. deterministic priority ──────────────────────────────────────────────

describe('4 — deterministic P0–P3', () => {
  const band = (overrides: Partial<StrategicCveFacts>) => computeBaselinePriority(facts(overrides));

  it('promotes any CISA KEV listing to P0', () => {
    expect(band({ known_exploited: true })).toMatchObject({ priority: 'P0' });
  });

  it('P0 requires CVSS >= 9.0 with high EPSS or an observed PoC', () => {
    expect(band({ cvss_score: 9.1, epss_score: 0.12 }).priority).toBe('P0');
    expect(band({ cvss_score: 9.1, epss_score: 0.01 }).priority).toBe('P1');
    expect(band({ cvss_score: 9.4, epss_score: 0.001, public_poc_status: 'OBSERVED' }).priority).toBe('P0');
  });

  it('P1 covers CVSS >= 8.0, and CVSS >= 7.0 with a signal', () => {
    expect(band({ cvss_score: 8.2, epss_score: 0.001 }).priority).toBe('P1');
    expect(band({ cvss_score: 7.5, epss_score: 0.058 }).priority).toBe('P1');
    expect(band({ cvss_score: 7.5, epss_score: 0.008, cisa_ssvc: { exploitation: 'none', automatable: 'yes', technical_impact: 'partial' } }).priority).toBe('P1');
  });

  it('P2 is CVSS >= 7.0 without a high signal', () => {
    const result = band({ cvss_score: 7.5, epss_score: 0.008, cisa_ssvc: null });
    expect(result.priority).toBe('P2');
    expect(result.rule).toContain('CVSS 7.5');
  });

  it('P3 is the remaining low/medium baseline', () => {
    expect(band({ cvss_score: 3.1, epss_score: 0.001, cisa_ssvc: null }).priority).toBe('P3');
  });

  it('overwrites the model band and its window with the computed one', () => {
    const applied = applyDeterministicPriority(brief(), facts({ cvss_score: 7.5, epss_score: 0.008, cisa_ssvc: null }));
    // The model said P2 with 14–30 days; the rule says P2 as well, so pin the rule
    // by using a KEV fact where the model said P2.
    expect(applied.operational_prioritization.priority).toBe('P2');
    const kev = applyDeterministicPriority(brief(), facts({ known_exploited: true }));
    expect(kev.operational_prioritization.priority).toBe('P0');
    expect(kev.operational_prioritization.remediation_sla).toBe('24–48 hours');
    expect(kev.exploitation_posture?.cisa_kev).toBe('LISTED');
    expect(kev.priority_basis).toContain('P0');
  });
});

// ── 5. guardrails ──────────────────────────────────────────────────────────

describe('5 — technical accuracy guardrails', () => {
  it('is v4 and rejects a placeholder upgrade branch', () => {
    expect(AI_STRATEGIC_PROMPT_VERSION).toBe('ai_analyst_assessment.v4');
    const placeholder = brief();
    (placeholder.defender_playbook as any).upgrade_targets = [{ branch: 'NOT_ESTABLISHED', target: 'NOT_ESTABLISHED' }];
    expect(validateStrategicBriefShape(placeholder)).toBe('SCHEMA_INVALID:upgrade_targets_branch');
    expect(validateStrategicBriefShape(brief())).toBeNull();
  });

  it('rejects a renamed technical identifier', () => {
    const renamed = brief();
    renamed.exploitation_mechanics.attack_path = 'A request to versionz.cgi with crafted found and fixed parameters reaches the disclosure path unsanitized.';
    const violations = validateStrategicBriefGrounding(renamed, facts());
    expect(violations.some((violation) => violation.startsWith('IDENTIFIER_FIDELITY_VIOLATION:versionz.cgi'))).toBe(true);
  });

  it('accepts the source filename used verbatim', () => {
    expect(validateStrategicBriefGrounding(brief(), facts())).toEqual([]);
  });

  it('rejects blast-radius inflation the source never states', () => {
    const inflated = brief();
    inflated.exploitation_mechanics.blast_radius = 'Full filesystem compromise of the host with root privileges and arbitrary code execution.';
    const violations = validateStrategicBriefGrounding(inflated, facts());
    expect(violations.some((violation) => violation.startsWith('BLAST_RADIUS_INFLATION'))).toBe(true);
  });
});

// ── 6. MalwareBazaar relay + curation counters ─────────────────────────────

describe('7 — MalwareBazaar diagnostics and counters', () => {
  const malwareWorker = require('fs').readFileSync('workers/malware-validation/src/index.ts', 'utf8') as string;
  const apiWorker = require('fs').readFileSync('workers/api/src/index.ts', 'utf8') as string;

  it('counts only briefs completed inside this sweep', () => {
    expect(malwareWorker).toContain('strategic_brief_generated_at >= ?');
    expect(malwareWorker).toContain('briefed_today_total: briefedToday');
    // The daily total remains observable but can never be reported as this pass.
    expect(malwareWorker).toContain('passStartedAt');
  });

  it('logs a secret-free relay rejection diagnostic', () => {
    expect(apiWorker).toContain('MALWAREBAZAAR_RELAY_REJECTED');
    expect(apiWorker).toContain('key_length: key.length');
    expect(apiWorker).toContain('query_status: upstream');
    // The key VALUE must never be interpolated into the log line.
    const diagnosticBlock = apiWorker.slice(
      apiWorker.indexOf('MALWAREBAZAAR_RELAY_REJECTED') - 400,
      apiWorker.indexOf('MALWAREBAZAAR_RELAY_REJECTED') + 600,
    );
    expect(diagnosticBlock).not.toContain('${key}');
  });
});

// ── 8. pending banner ──────────────────────────────────────────────────────

describe('6 — pending banner', () => {
  const advisory = buildAuthoritativeAdvisory({
    cve_id: 'CVE-2026-132147',
    description: 'x',
    severity: 'HIGH',
    cvss_score: 7.5,
    cvss_vector: 'CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:N/A:N',
    epss_score: 0.00822,
    epss_percentile: 0.58065,
    is_exploited_in_wild: 0,
    provenance_state: 'AUTHORITATIVE_VERIFIED',
    cwe_ids_json: JSON.stringify([{ id: 'CWE-22', source: 'CISA ADP — Vulnrichment' }]),
    cvss_source_provider: 'CISA ADP — Vulnrichment',
    cvss_source_type: 'Secondary',
    ssvc_json: JSON.stringify({ exploitation: 'none', automatable: 'yes', technical_impact: 'partial' }),
  });

  it('suppresses the notice whenever a brief is rendered', () => {
    expect(shouldShowAnalysisPendingNotice(advisory, true)).toBe(false);
    expect(shouldShowAnalysisPendingNotice(advisory)).toBe(true);
  });

  it('projects provider attribution, CWE source and SSVC into the advisory', () => {
    expect(advisory?.cvss_source_provider).toBe('CISA ADP — Vulnrichment');
    expect(advisory?.cwe_entries).toEqual([{ id: 'CWE-22', source: 'CISA ADP — Vulnrichment' }]);
    expect(advisory?.cisa_ssvc).toMatchObject({ automatable: 'yes' });
    expect(advisory?.cisa_kev).toBe('NOT_LISTED');
    expect(advisory?.in_the_wild_exploitation).toBe('UNKNOWN');
  });
});
