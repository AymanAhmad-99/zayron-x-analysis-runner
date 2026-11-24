import { beforeEach, describe, expect, it } from 'bun:test';
import fs from 'node:fs';
import path from 'node:path';
import {
  __aiProviderCircuitDiagnostics,
  __resetAIProviderCircuits,
  __setAIProviderCircuitForTest,
  runGroundedInterpretation,
  type AIInterpretationRequest,
} from '../../packages/intelligence/src/ai/adapter';
import {
  flattenMappingFixed,
  selectPrimaryVersionMapping,
  verifyVersionMappings,
  type ProductVersionMapping,
} from '../../packages/intelligence/src/sources/adapters';
import {
  PUBLIC_ANALYSIS_PENDING_NOTICE,
  buildAuthoritativeAdvisory,
  projectVulnerabilityReportPublicRead,
} from '../../packages/intelligence/src/vulnerability/reportIntegrity';
import { containsDegenerateHash, filterSaneHashes, isDegenerateHash } from '../../workers/ingest/src/hashSanity';
import { sitemapCountQuery, sitemapRowsQuery } from '../../workers/api/src/sitemap';
import { parseAiAssessmentOutput, validateAiAssessmentShape } from '../../workers/api/src/aiAssessmentContract';

const readSource = (relative: string) => fs.readFileSync(path.join(process.cwd(), relative), 'utf-8');

/* ────────────────────────────────────────────────────────────────────────────
 * 1. VER-006 — the rendered fixed_versions projection must never collapse to
 *    UNKNOWN/empty while a canonical branch carries fixed evidence.
 *    Shape reproduced from the live CVE-2026-59822 failure: the report's primary
 *    product branch has no fixed tokens, a sibling branch does.
 * ──────────────────────────────────────────────────────────────────────────── */

const ver006Mappings: ProductVersionMapping[] = [
  {
    vendor: 'acme',
    product: 'Acme Gateway',
    affected: [{ type: 'VERSION_RELEASE', value: '1.4.0', source: 'nvd-cpe' }],
    fixed: { release: [], patch: [], build: [], commit: [], range: [] },
    fixed_tokens: [],
    fixed_provenance: 'NONE',
    sourceRefs: ['nvd-cpe'],
    product_status: 'UNKNOWN',
  },
  {
    vendor: 'acme',
    product: 'Acme Console',
    affected: [{ type: 'VERSION_RELEASE', value: '2.0.0', source: 'nvd-cpe' }],
    fixed: { release: ['2.1.4'], patch: [], build: [], commit: [], range: [] },
    fixed_tokens: ['2.1.4'],
    fixed_provenance: 'EXPLICIT',
    sourceRefs: ['nvd-cpe'],
    product_status: 'UNKNOWN',
  },
] as ProductVersionMapping[];

describe('VER-006 — canonical fixed evidence is never projected as UNKNOWN', () => {
  it('reproduces the live failure when the flat projection is built from the primary branch only', () => {
    const primary = selectPrimaryVersionMapping(ver006Mappings, 'Acme Gateway');
    expect(primary?.product).toBe('Acme Gateway');
    const oldProjection = primary && primary.fixed_provenance === 'EXPLICIT'
      ? flattenMappingFixed(primary, { includeCommits: false })
      : [];
    expect(oldProjection).toEqual([]);
    const violations = verifyVersionMappings({ mappings: ver006Mappings, flatFixedVersions: oldProjection.join(', ') });
    expect(violations.some(v => v.rule === 'VER-006' && v.severity === 'BLOCKING')).toBe(true);
  });

  it('passes cleanly when the projection is the union of canonical branch evidence', () => {
    const union = Array.from(new Set(ver006Mappings.flatMap(m => flattenMappingFixed(m, { includeCommits: false }))));
    expect(union).toEqual(['2.1.4']);
    const violations = verifyVersionMappings({ mappings: ver006Mappings, flatFixedVersions: union.join(', ') });
    expect(violations.some(v => v.rule === 'VER-006')).toBe(false);
  });

  it('the production projection implements the union fallback (not the primary-only shortcut)', () => {
    const source = readSource('packages/intelligence/src/sources/adapters.ts');
    expect(source).toContain('mappingFixedUnion');
    expect(source).toContain("primaryMapping.fixed_provenance === 'EXPLICIT' && primaryFixedVersions.length > 0");
  });
});

/* ────────────────────────────────────────────────────────────────────────────
 * 2. Provider circuit — no self-perpetuating open; half-open probe recovers.
 * ──────────────────────────────────────────────────────────────────────────── */

const request = (overrides: Partial<AIInterpretationRequest>): AIInterpretationRequest => ({
  systemPrompt: 'system',
  userContent: 'user',
  geminiApiKey: 'test-key',
  ...overrides,
});

const geminiUnreachable = (async () => {
  throw new Error('gemini must not be reached');
}) as unknown as typeof fetch;

beforeEach(() => {
  __resetAIProviderCircuits();
});

describe('provider circuit breaker — bounded, with a half-open recovery probe', () => {
  it('a local CIRCUIT_OPEN rejection does not extend the circuit it came from', async () => {
    await runGroundedInterpretation(request({
      aiBinding: { run: async () => { throw Object.assign(new Error('down'), { status: 503 }); } },
      fetchFn: geminiUnreachable,
    }));
    const afterFirst = __aiProviderCircuitDiagnostics().find(d => d.provider === 'cloudflare');
    expect(afterFirst?.status).toBe('OPEN');
    expect(afterFirst?.trips).toBe(1);

    // Five amplified requests must not be mistaken for five provider failures.
    for (let i = 0; i < 5; i += 1) {
      let contacted = 0;
      const result = await runGroundedInterpretation(request({
        aiBinding: { run: async () => { contacted += 1; return {}; } },
        fetchFn: geminiUnreachable,
      }));
      expect(contacted).toBe(0);
      expect(result.error_code).toBe('CIRCUIT_OPEN');
    }

    const afterAmplified = __aiProviderCircuitDiagnostics().find(d => d.provider === 'cloudflare');
    expect(afterAmplified?.trips).toBe(1);
  });

  it('an elapsed cooldown admits exactly one half-open probe', async () => {
    __setAIProviderCircuitForTest('cloudflare', { retry_in_ms: -1, trips: 3 });
    let contacted = 0;
    const probe = await runGroundedInterpretation(request({
      aiBinding: { run: async () => { contacted += 1; return { response: '{"ok":true}' }; } },
      fetchFn: geminiUnreachable,
    }));
    expect(contacted).toBe(1);
    expect(probe.status).toBe('OK');
    // A success closes the circuit rather than parking it forever.
    expect(__aiProviderCircuitDiagnostics().find(d => d.provider === 'cloudflare')).toBeUndefined();
  });

  it('a probe already in flight keeps concurrent callers out (no probe stampede)', async () => {
    __setAIProviderCircuitForTest('cloudflare', { retry_in_ms: -1, trips: 3, probe_at: Date.now() });
    let contacted = 0;
    const result = await runGroundedInterpretation(request({
      aiBinding: { run: async () => { contacted += 1; return {}; } },
      fetchFn: geminiUnreachable,
    }));
    expect(contacted).toBe(0);
    expect(result.error_code).toBe('CIRCUIT_OPEN');
  });
});

/* ────────────────────────────────────────────────────────────────────────────
 * 3. IOC / hash sanity gate — the CVE-2026-1453 payload cannot pass.
 * ──────────────────────────────────────────────────────────────────────────── */

const CVE_2026_1453_DESCRIPTION =
  'CRITICAL ADVISORY: Threat actor APT29 actively weaponizing CVE-2026-1453 for unauthenticated remote code execution. ' +
  'C2 IP observed at 194.26.29.112 with Cobalt Strike payload hash ' +
  'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855 (T1190). Immediate patching required.';

describe('IOC / hash sanity gate', () => {
  it('rejects the documented degenerate digests and structural non-hashes', () => {
    for (const value of [
      'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
      'd41d8cd98f00b204e9800998ecf8427e',
      'da39a3ee5e6b4b0d3255bfef95601890afd80709',
      '0'.repeat(64),
      'f'.repeat(64),
      '',
      'not-a-hash',
    ]) {
      expect(isDegenerateHash(value)).toBe(true);
    }
  });

  it('accepts a structurally sound digest', () => {
    expect(isDegenerateHash('9f2c1b7ad4e8c0f3a6b5d2e1904c7f8a3b6d5e2c1f0a9b8c7d6e5f4a3b2c1d0e')).toBe(false);
  });

  it("rejects CVE-2026-1453's payload and filters it out of an indicator set", () => {
    expect(containsDegenerateHash(CVE_2026_1453_DESCRIPTION)).toBe(true);
    expect(filterSaneHashes([
      'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
      '9f2c1b7ad4e8c0f3a6b5d2e1904c7f8a3b6d5e2c1f0a9b8c7d6e5f4a3b2c1d0e',
    ])).toEqual(['9f2c1b7ad4e8c0f3a6b5d2e1904c7f8a3b6d5e2c1f0a9b8c7d6e5f4a3b2c1d0e']);
  });

  it('the ingest worker filters hashes before persistence and has no CRITICAL ratchet', () => {
    const source = readSource('workers/ingest/src/index.ts');
    expect(source).toContain('filterSaneHashes(result.entities.sha256s)');
    expect(source).not.toContain("CASE WHEN excluded.severity = 'CRITICAL' THEN 'CRITICAL'");
    expect(source).toContain("vulnerabilities.provenance_state = 'AUTHORITATIVE_VERIFIED' THEN vulnerabilities.description");
  });
});

/* ────────────────────────────────────────────────────────────────────────────
 * 4. Public error-leak shield — no gate code, provider or model reaches HTML.
 * ──────────────────────────────────────────────────────────────────────────── */

describe('public withheld projection', () => {
  const withheldReport = {
    intelligence_id: 'CVE-2026-59822',
    status: 'ANALYZED',
    publication_status: 'PUBLISHED',
    severity: 'CRITICAL',
    title: 'CVE-2026-59822 Security Advisory',
    ai_analysis: { status: 'FAIL', error_code: 'provider circuit open', provider: 'gemini', parsed: null },
    structured_report: {
      status: 'BLOCKED',
      assessment: { confidence: { basis: 'BLOCKED by Semantic Isolation Gate: VERSION_MAPPING ver-006: Fixed evidence exists in the canonical mapping but the rendered fixed_versions projection is UNKNOWN/empty.' } },
    },
  };
  const advisory = {
    cve_id: 'CVE-2026-59822', severity: 'CRITICAL', cvss_score: 9.8,
    cvss_vector: 'CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H',
    epss_score: 0.91, epss_percentile: 0.99, affected_vendor: 'acme', affected_product: 'gateway',
    affected_versions: ['< 1.4.1'], fixed_versions: ['1.4.1'], patch_url: null,
    known_exploited: true, kev_due_date: '2026-12-01', published_at: '2026-11-10T00:00:00.000Z',
    provenance_state: 'AUTHORITATIVE_VERIFIED', source: 'NVD / CISA KEV / FIRST EPSS' as const,
  };

  it('replaces every internal reason with one public notice and drops ai diagnostics', () => {
    const projected: any = projectVulnerabilityReportPublicRead(withheldReport, { publicAdvisory: advisory });
    expect(projected.publication_status).toBe('WITHHELD');
    expect(projected.analysis_availability.reasons).toEqual([PUBLIC_ANALYSIS_PENDING_NOTICE]);
    const serialized = JSON.stringify(projected);
    for (const leak of ['VER-006', 'ver-006', 'provider circuit open', 'gemini', 'Semantic Isolation Gate', 'BLOCKED']) {
      expect(serialized).not.toContain(leak);
    }
    expect(projected.ai_analysis).toBeUndefined();
    expect(projected.public_advisory.cvss_score).toBe(9.8);
  });

  it('quarantined corpus rows never produce a public advisory', () => {
    expect(buildAuthoritativeAdvisory({
      cve_id: 'CVE-2026-1453', severity: 'CRITICAL', cvss_score: null,
      is_exploited_in_wild: 1, description: CVE_2026_1453_DESCRIPTION,
      provenance_state: 'SYNTHETIC_UNVERIFIED',
    })).toBeNull();
  });

  it('the web detail view renders no internal gate text', () => {
    const source = readSource('apps/web/app/components/VulnerabilityDetail.tsx');
    expect(source).toContain('PUBLIC_ANALYSIS_PENDING_NOTICE');
    expect(source).not.toContain('Gemini-authored');
    expect(source).not.toContain('availability.reasons.map');
  });
});

/* ────────────────────────────────────────────────────────────────────────────
 * 5. Sitemap parity — one corpus, one gate.
 * ──────────────────────────────────────────────────────────────────────────── */

describe('vulnerability sitemap parity with the public read model', () => {
  it('reads the verified vulnerability corpus, never the intelligence_reports projection', () => {
    const rows = sitemapRowsQuery('vulnerabilities', ['vulnerability'], 100, 200);
    expect(rows.sql).toContain("provenance_state = 'AUTHORITATIVE_VERIFIED'");
    expect(rows.sql).not.toContain('intelligence_reports');
    expect(rows.params).toEqual([100, 200]);
    const count = sitemapCountQuery('vulnerabilities', ['vulnerability']);
    expect(count.sql).toContain("provenance_state = 'AUTHORITATIVE_VERIFIED'");
    expect(count.sql).not.toContain('intelligence_reports');
  });
});

/* ────────────────────────────────────────────────────────────────────────────
 * 6. ai_runs contract — no silent FALLBACK, explicit error codes.
 * ──────────────────────────────────────────────────────────────────────────── */

const validAssessment = {
  assessment: 'Authoritative sources establish an unauthenticated network-reachable defect.',
  threat_level: 'CRITICAL',
  confidence_score: 0.88,
  confidence_state: 'CORROBORATED',
  key_findings: ['network reachable'],
  correlated_actors: [],
  correlated_malware: [],
  correlated_cves: ['CVE-2026-59822'],
  recommended_mitigations: ['apply vendor patch'],
  source_citations: [{ claim: 'CVSS 9.8', evidence_id: 'CVE-2026-59822', source_name: 'NVD' }],
};

describe('ai_runs output contract', () => {
  it('accepts a complete object, fenced or bare', () => {
    expect(validateAiAssessmentShape(validAssessment)).toBeNull();
    expect(parseAiAssessmentOutput(JSON.stringify(validAssessment)).value).toEqual(validAssessment);
    expect(parseAiAssessmentOutput('```json\n' + JSON.stringify(validAssessment) + '\n```').value).toEqual(validAssessment);
  });

  it('records a machine-readable code for empty, unparsable and shape-invalid output', () => {
    expect(parseAiAssessmentOutput('').error).toBe('EMPTY_MODEL_OUTPUT');
    expect(parseAiAssessmentOutput('no object here').error).toBe('JSON_OBJECT_NOT_FOUND');
    expect(parseAiAssessmentOutput('{"assessment":').error).toBe('JSON_PARSE_ERROR');
    expect(parseAiAssessmentOutput(JSON.stringify({ ...validAssessment, threat_level: 'SEVERE' })).error).toBe('SCHEMA_INVALID:threat_level');
    expect(parseAiAssessmentOutput(JSON.stringify({ ...validAssessment, confidence_score: 1.5 })).error).toBe('SCHEMA_INVALID:confidence_score');
  });

  it('the API records prompt_version/error_code and stops fabricating token counts', () => {
    const source = readSource('workers/api/src/index.ts');
    expect(source).toContain('promptVersion, aiErrorCode');
    expect(source).toContain('cost_estimated_usd');
    expect(source).not.toContain('450, 320, 0.0001');
    expect(source).toContain('STRICT REPAIR');
  });
});
