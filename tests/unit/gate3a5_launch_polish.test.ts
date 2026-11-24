import { describe, expect, it } from 'bun:test';
import fs from 'node:fs';
import path from 'node:path';
import {
  buildAuthoritativeAdvisory,
  formatAffectedVersionBranches,
  PUBLIC_ANALYSIS_PENDING_NOTICE,
  shouldShowAnalysisPendingNotice,
} from '../../packages/intelligence/src/vulnerability/reportIntegrity';
import { resolvePageRobots, vulnerabilitySeoTitle, displayVendor } from '../../apps/web/app/lib/seo';
import { STATIC_PATHS } from '../../apps/web/app/lib/sitemap';

const root = path.join(import.meta.dir, '..', '..');

describe('Gate 3A.5 — preview noindex precedence', () => {
  it('preview ALWAYS wins over an indexable content verdict', () => {
    expect(resolvePageRobots({ preview: true, indexable: true })).toEqual({ index: false, follow: false, nocache: true });
    expect(resolvePageRobots({ preview: true, indexable: false })).toEqual({ index: false, follow: false, nocache: true });
  });

  it('production is the only environment that may emit index, follow', () => {
    expect(resolvePageRobots({ preview: false, indexable: true })).toEqual({ index: true, follow: true });
    expect(resolvePageRobots({ preview: false, indexable: false })).toEqual({ index: false, follow: true });
  });

  it('the malware detail page routes robots through the precedence helper', () => {
    const page = fs.readFileSync(path.join(root, 'apps/web/app/malware/intelligence/reports/[id]/page.tsx'), 'utf-8');
    expect(page).toContain('resolvePageRobots({ preview: isPreviewDeployment(), indexable })');
    // The pre-3A.5 direct emission must be gone.
    expect(page).not.toContain('robots: indexable');
  });

  it('the CVE detail page cannot index a preview host either', () => {
    const page = fs.readFileSync(path.join(root, 'apps/web/app/intelligence/vulnerabilities/[id]/page.tsx'), 'utf-8');
    expect(page).toContain('resolvePageRobots({ preview: isPreviewDeployment(), indexable: true })');
  });
});

describe('Gate 3A.5 — entity-rich CVE titles', () => {
  it('builds vendor/product/CVSS titles', () => {
    expect(vulnerabilitySeoTitle({ cveId: 'CVE-2026-116156', vendor: 'imagemagick', product: 'imagemagick', cvss: 3.3 }))
      .toBe('CVE-2026-116156: ImageMagick Vulnerability (CVSS 3.3) — Affected & Fixed Versions');
  });

  it('degrades gracefully when fields are absent', () => {
    expect(vulnerabilitySeoTitle({ cveId: 'CVE-2026-1', vendor: null, product: null, cvss: null }))
      .toBe('CVE-2026-1: Vulnerability — Technical Advisory');
    expect(vulnerabilitySeoTitle({ cveId: 'CVE-2026-1', vendor: 'acme corp', product: null, cvss: 9.8 }))
      .toBe('CVE-2026-1: Acme Corp Vulnerability (CVSS 9.8) — Affected & Fixed Versions');
  });

  it('displays known vendors with their canonical casing', () => {
    expect(displayVendor('imagemagick')).toBe('ImageMagick');
    expect(displayVendor('example-labs')).toBe('Example Labs');
    expect(displayVendor(null)).toBeNull();
  });
});

describe('Gate 3A.5 — branch-aware affected ranges', () => {
  it('pairs lower bounds with the next upper bound', () => {
    expect(formatAffectedVersionBranches(['< 6.9.13-58', '< 7.1.2-33', '>= 7.0.0-0']))
      .toEqual(['< 6.9.13-58', '7.0.0-0 to < 7.1.2-33']);
  });

  it('keeps unpaired bounds and ignores empties', () => {
    expect(formatAffectedVersionBranches(['< 2.0.0', '', '>= 1.0.0', '< 1.5.0']))
      .toEqual(['1.0.0 to < 1.5.0', '< 2.0.0']);
    expect(formatAffectedVersionBranches([])).toEqual([]);
  });
});

describe('Gate 3A.5 — pending-notice threshold', () => {
  const base = {
    cve_id: 'CVE-2026-1',
    severity: 'LOW',
    cvss_score: 3.3,
    cvss_vector: null,
    epss_score: 0.00198,
    epss_percentile: 10,
    affected_vendor: 'imagemagick',
    affected_product: 'imagemagick',
    affected_versions: [],
    fixed_versions: [],
    patch_url: null,
    known_exploited: false,
    kev_due_date: null,
    published_at: null,
    provenance_state: 'AUTHORITATIVE_VERIFIED',
    source: 'NVD / CISA KEV / FIRST EPSS' as const,
  };

  it('does not badge a low-impact advisory', () => {
    expect(shouldShowAnalysisPendingNotice(base)).toBe(false);
  });

  it('badges CVSS >= 7, KEV and EPSS >= 5%', () => {
    expect(shouldShowAnalysisPendingNotice({ ...base, cvss_score: 8.1 })).toBe(true);
    expect(shouldShowAnalysisPendingNotice({ ...base, known_exploited: true })).toBe(true);
    expect(shouldShowAnalysisPendingNotice({ ...base, epss_score: 0.06 })).toBe(true);
    expect(shouldShowAnalysisPendingNotice(null)).toBe(false);
  });

  it('the notice no longer claims the data is rendered below', () => {
    expect(PUBLIC_ANALYSIS_PENDING_NOTICE).not.toContain('shown below');
    expect(PUBLIC_ANALYSIS_PENDING_NOTICE).toContain('No deep analyst commentary');
  });
});

describe('Gate 3A.5 — advisory completeness', () => {
  it('carries the official description and modification time', () => {
    const advisory = buildAuthoritativeAdvisory({
      cve_id: 'CVE-2026-116156',
      severity: 'LOW',
      cvss_score: 3.3,
      epss_score: 0.00198,
      description: 'ImageMagick contains a memory leak caused by a missing cleanup.',
      updated_at: '2026-10-26T00:00:00Z',
      provenance_state: 'AUTHORITATIVE_VERIFIED',
    });
    expect(advisory?.description).toContain('memory leak');
    expect(advisory?.modified_at).toBe('2026-10-26T00:00:00Z');
    expect(advisory?.cwe_ids).toEqual([]);
  });
});

describe('Gate 3A.5 — trust surfaces', () => {
  it('publishes /methodology and lists it in the static sitemap', () => {
    const page = path.join(root, 'apps/web/app/methodology/page.tsx');
    expect(fs.existsSync(page)).toBe(true);
    expect([...(STATIC_PATHS as readonly string[])]).toContain('/methodology');
    const footer = fs.readFileSync(path.join(root, 'apps/web/app/components/SiteFooter.tsx'), 'utf-8');
    expect(footer).toContain('href: "/methodology"');
  });

  it('publishes an RFC 9116 security.txt with an expiry a year out', () => {
    // Served as a static asset: `public/.well-known/security.txt` is shadowed
    // by nothing and is what the preview/production ASSETS binding returns.
    const file = fs.readFileSync(path.join(root, 'apps/web/public/.well-known/security.txt'), 'utf-8');
    for (const field of ['Contact:', 'Policy:', 'Preferred-Languages:', 'Expires:', 'Canonical:']) {
      expect(file).toContain(field);
    }
    expect(file).toContain('2027-11-24');
    expect(file).toContain('mailto:security@zayron-x.co');
    expect(file).not.toContain('2027-10-04');
  });

  it('labels paid tiers as waitlist instead of a dead checkout', () => {
    const pricing = fs.readFileSync(path.join(root, 'apps/web/app/components/PricingSection.tsx'), 'utf-8');
    expect(pricing).toContain('Early Access / Waitlist');
    expect(pricing).toContain('Commercial Billing Opens Upon Entity Registration');
    expect(pricing).not.toContain('href="#contact"');
    expect(pricing).toContain('ctaHref: "/intelligence"');
  });
});
