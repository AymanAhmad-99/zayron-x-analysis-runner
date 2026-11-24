import { describe, expect, it } from 'bun:test';
import fs from 'node:fs';
import path from 'node:path';
import {
  cvssVectorSummary,
  parseCvssVector,
  remediationMatrix,
  triagePosture,
} from '../../packages/intelligence/src/vulnerability/cveAnalysis';
import { vulnerabilityDisplayHeading } from '../../apps/web/app/lib/seo';

const root = path.join(import.meta.dir, '..', '..');
const VECTOR = 'CVSS:3.1/AV:L/AC:L/PR:N/UI:R/S:U/C:N/I:N/A:L';

describe('Gate 3A.6 — CVSS vector parser', () => {
  it('parses every metric of a stored vector in canonical order', () => {
    const readings = parseCvssVector(VECTOR);
    expect(readings.map((r) => r.key)).toEqual(['AV', 'AC', 'PR', 'UI', 'S', 'C', 'I', 'A']);
    expect(readings.map((r) => r.label)).toEqual([
      'Local',
      'Low',
      'None',
      'Required',
      'Unchanged',
      'None',
      'None',
      'Low',
    ]);
    expect(readings.filter((r) => r.group === 'impact').map((r) => r.key)).toEqual(['C', 'I', 'A']);
  });

  it('degrades to no readings for blank, malformed or unknown values', () => {
    expect(parseCvssVector(null)).toEqual([]);
    expect(parseCvssVector('')).toEqual([]);
    expect(parseCvssVector('not-a-vector')).toEqual([]);
    expect(parseCvssVector('CVSS:3.1/AV:Z/AC:L')).toEqual([
      expect.objectContaining({ key: 'AC', label: 'Low' }),
    ]);
  });

  it('summarises exploitability and impact without inventing facts', () => {
    const summary = cvssVectorSummary(VECTOR);
    expect(summary).toContain('local attack surface');
    expect(summary).toContain('user interaction required');
    expect(summary).toContain('scope unchanged');
    expect(summary).toContain('1 of 3 impact dimensions partially affected');
    expect(cvssVectorSummary(null)).toBe('CVSS vector not reported by the source.');
  });
});

describe('Gate 3A.6 — triage posture', () => {
  it('escalates KEV and critical CVSS to IMMEDIATE', () => {
    expect(triagePosture({ cvss: 3.3, epss: 0, knownExploited: true }).tier).toBe('IMMEDIATE');
    expect(triagePosture({ cvss: 9.8, epss: 0.01, knownExploited: false }).tier).toBe('IMMEDIATE');
  });

  it('maps high CVSS or EPSS >= 10% to HIGH', () => {
    expect(triagePosture({ cvss: 8.1, epss: 0.001, knownExploited: false }).tier).toBe('HIGH');
    expect(triagePosture({ cvss: 3.3, epss: 0.12, knownExploited: false }).tier).toBe('HIGH');
  });

  it('maps medium CVSS or EPSS >= 1% to STANDARD', () => {
    expect(triagePosture({ cvss: 5.0, epss: 0.0001, knownExploited: false }).tier).toBe('STANDARD');
    expect(triagePosture({ cvss: null, epss: 0.02, knownExploited: false }).tier).toBe('STANDARD');
  });

  it('keeps a low, non-KEV, low-EPSS advisory at ROUTINE', () => {
    const posture = triagePosture({ cvss: 3.3, epss: 0.00198, knownExploited: false });
    expect(posture.tier).toBe('ROUTINE');
    expect(posture.drivers).toEqual(['CVSS base score 3.3', 'EPSS 0.20%']);
    expect(posture.guidance).toContain('next maintenance window');
  });

  it('is deterministic for identical inputs', () => {
    const input = { cvss: 7.5, epss: 0.03, knownExploited: false };
    expect(triagePosture(input)).toEqual(triagePosture(input));
  });

  it('reports missing metrics instead of guessing', () => {
    expect(triagePosture({ cvss: null, epss: null, knownExploited: false }).drivers)
      .toEqual(['No CVSS, EPSS or KEV values are stored for this CVE']);
  });
});

describe('Gate 3A.6 — remediation matrix', () => {
  it('maps each affected branch to the fixed release that closes it', () => {
    const rows = remediationMatrix(
      ['< 6.9.13-58', '< 7.1.2-33', '>= 7.0.0-0'],
      ['6.9.13-58', '7.1.2-33'],
    );
    expect(rows).toEqual([
      { affected: '< 6.9.13-58', fixed: '6.9.13-58', resolved: true },
      { affected: '7.0.0-0 to < 7.1.2-33', fixed: '7.1.2-33', resolved: true },
    ]);
  });

  it('never fabricates a fixed version', () => {
    expect(remediationMatrix(['< 2.0.0'], [])).toEqual([
      { affected: '< 2.0.0', fixed: 'Not published by the source', resolved: false },
    ]);
    expect(remediationMatrix([], ['9.9.9'])).toEqual([]);
  });
});

describe('Gate 3A.6 — visible heading stays short', () => {
  it('renders a scannable H1 while metadata keeps the long string', () => {
    expect(vulnerabilityDisplayHeading({ cveId: 'CVE-2026-116160', vendor: 'imagemagick', product: 'imagemagick' }))
      .toBe('CVE-2026-116160 — ImageMagick Vulnerability');
    expect(vulnerabilityDisplayHeading({ cveId: 'CVE-2026-1', vendor: null, product: null }))
      .toBe('CVE-2026-1 — Vulnerability advisory');
  });
});

describe('Gate 3A.6 — advisory layout wiring', () => {
  const source = fs.readFileSync(path.join(root, 'apps/web/app/components/VulnerabilityDetail.tsx'), 'utf-8');

  it('renders the three deterministic sections with no model dependency', () => {
    expect(source).toContain('Attack surface &amp; CVSS vector breakdown');
    expect(source).toContain('Triage &amp; exploitation posture');
    expect(source).toContain('Remediation &amp; upgrade matrix');
    expect(source).toContain('parseCvssVector(advisory.cvss_vector)');
    expect(source).not.toMatch(/fetch\(.*(gemini|openai|anthropic)/i);
  });

  it('uses dedicated metric cards instead of the colliding stat strip', () => {
    expect(source).toContain('className="vx-advisory-metrics"');
    expect(source).toContain('className="vx-metric-pill mono"');
    expect(source).not.toContain('className="vx-risk-stat" style={{ display: "grid"');
  });
});
