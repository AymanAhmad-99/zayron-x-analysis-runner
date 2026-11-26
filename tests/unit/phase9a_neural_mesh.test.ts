/**
 * PHASE 9A — neural mesh + P1 hardening regression suite.
 *
 * Covers the four contracts a future change can silently break:
 *   1. a transport failure is NEVER a 404 (discriminated read + retry);
 *   2. every page's OpenGraph carries a non-empty `images` array;
 *   3. Telegram selection excludes an all-time `SENT` base id (no fallback leak);
 *   4. the Radar backfill owns ONLY 01:40 / 03:40 / 05:40 UTC within 12 requests;
 *   5. technique edges and the bidirectional family/CVE attribution are exact.
 */
import { describe, expect, test } from 'bun:test';

import { readJsonResult, shouldNotFound, shouldThrow } from '../../apps/web/app/lib/fetchResult';
import { buildOpenGraph, openGraphImage, DEFAULT_OG_IMAGE } from '../../apps/web/app/lib/seo';
import {
  RADAR_BACKFILL_MAX_SUBREQUESTS,
  isRadarBackfillSlot,
} from '../../workers/ingest/src/radarBackfill';
import {
  TELEGRAM_CVE_SELECTION_SQL,
  TELEGRAM_MALWARE_SELECTION_SQL,
} from '../../workers/ingest/src/telegramDispatch';
import {
  buildTechniqueDossier,
  normalizeTechniqueId,
  techniqueMitreUrl,
} from '../../workers/api/src/techniques';
import { loadCveLinks, loadFamilyAttribution } from '../../workers/api/src/neuralMesh';
import { classifyThreatActor } from '../../workers/api/src/threatGraph';

const INIT = { headers: { accept: 'application/json' } } as RequestInit;

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
}

describe('PHASE 9A — F4 discriminated read', () => {
  test('a 404 is `not_found`, not an error and not empty', async () => {
    const result = await readJsonResult('/x', INIT, async () => jsonResponse({}, 404));
    expect(result.state).toBe('not_found');
    expect(result.status).toBe(404);
    expect(shouldNotFound(result)).toBe(true);
    expect(shouldThrow(result)).toBe(false);
  });

  test('a transient 5xx is retried once and succeeds', async () => {
    let calls = 0;
    const result = await readJsonResult<{ ok: boolean }>('/x', INIT, async () => {
      calls += 1;
      return calls === 1 ? jsonResponse({}, 503) : jsonResponse({ ok: true });
    });
    expect(calls).toBe(2);
    expect(result.state).toBe('ok');
    expect(result.data).toEqual({ ok: true });
  });

  test('a persistent 5xx surfaces as `error` after exactly two attempts', async () => {
    let calls = 0;
    const result = await readJsonResult('/x', INIT, async () => {
      calls += 1;
      return jsonResponse({}, 500);
    });
    expect(calls).toBe(2);
    expect(result.state).toBe('error');
    expect(shouldNotFound(result)).toBe(false);
    expect(shouldThrow(result)).toBe(true);
  });

  test('a network throw is retried and then reported as error, never 404', async () => {
    let calls = 0;
    const result = await readJsonResult('/x', INIT, async () => {
      calls += 1;
      throw new Error('ECONNRESET');
    });
    expect(calls).toBe(2);
    expect(result.state).toBe('error');
    expect(shouldNotFound(result)).toBe(false);
  });
});

describe('PHASE 9A — F2 OpenGraph images', () => {
  test('buildOpenGraph always returns one 1200x630 image', () => {
    const og = buildOpenGraph({ title: 'T', description: 'D', path: '/x' });
    expect(og.images).toHaveLength(1);
    expect(og.images[0].width).toBe(1200);
    expect(og.images[0].height).toBe(630);
    expect(og.images[0].url).toBe(DEFAULT_OG_IMAGE);
  });

  test('an entity card is preserved and an empty value falls back', () => {
    expect(buildOpenGraph({ title: 'T', description: 'D', path: '/x', image: '/api/og/cve/CVE-1' }).images[0].url)
      .toBe('/api/og/cve/CVE-1');
    expect(openGraphImage('   ')).toBe(DEFAULT_OG_IMAGE);
    expect(openGraphImage(undefined)).toBe(DEFAULT_OG_IMAGE);
  });

  test('a page-level openGraph can never carry an empty images array', () => {
    for (const path of ['/', '/intelligence', '/intelligence/exploits', '/developers']) {
      const og = buildOpenGraph({ title: path, description: 'd', path });
      expect(Array.isArray(og.images)).toBe(true);
      expect(og.images.length).toBeGreaterThan(0);
      expect(og.images[0].url.length).toBeGreaterThan(0);
    }
  });
});

describe('PHASE 9A — F3 Telegram duplicate leak', () => {
  test('CVE selection excludes an all-time SENT base id (no 7-day window)', () => {
    expect(TELEGRAM_CVE_SELECTION_SQL).toContain("d.status = 'SENT'");
    expect(TELEGRAM_CVE_SELECTION_SQL).not.toContain('-7 days');
    expect(TELEGRAM_CVE_SELECTION_SQL).toContain('d.base_entity_id = vulnerabilities.cve_id');
    expect(TELEGRAM_CVE_SELECTION_SQL).toContain("d.entity_id LIKE vulnerabilities.cve_id || '@%'");
  });

  test('malware selection applies the same all-time exclusion', () => {
    expect(TELEGRAM_MALWARE_SELECTION_SQL).toContain("d.status = 'SENT'");
    expect(TELEGRAM_MALWARE_SELECTION_SQL).not.toContain('-7 days');
  });

  test('the fallback path reads the same guarded selection query', () => {
    // The wire slot renders every CVE payload (primary OR fallback) from this one
    // constant, so a second, unguarded query cannot exist.
    expect(TELEGRAM_CVE_SELECTION_SQL).toMatch(/LIMIT \?/);
  });
});

describe('PHASE 9A — F5 Radar backfill slot isolation', () => {
  test('only 01:40, 03:40 and 05:40 UTC qualify', () => {
    const at = (h: number, m: number) => isRadarBackfillSlot(new Date(Date.UTC(2026, 10, 26, h, m)));
    expect(at(1, 40)).toBe(true);
    expect(at(3, 40)).toBe(true);
    expect(at(5, 40)).toBe(true);
    for (const h of [0, 2, 4, 6, 8, 16, 23]) expect(at(h, 40)).toBe(false);
    for (const m of [0, 20, 39, 41]) expect(at(1, m)).toBe(false);
  });

  test('the per-run ceiling is 12 subrequests', () => {
    expect(RADAR_BACKFILL_MAX_SUBREQUESTS).toBe(12);
  });
});

describe('PHASE 9A — technique backbone', () => {
  test('normalizes only real ATT&CK ids', () => {
    expect(normalizeTechniqueId('t1059.001')).toBe('T1059.001');
    expect(normalizeTechniqueId('T1059')).toBe('T1059');
    expect(normalizeTechniqueId('X1059')).toBeNull();
    expect(normalizeTechniqueId('T105')).toBeNull();
  });

  test('a sub-technique resolves to the official URL', () => {
    expect(techniqueMitreUrl('T1059.001')).toBe('https://attack.mitre.org/techniques/T1059/001');
    expect(techniqueMitreUrl('T1059')).toBe('https://attack.mitre.org/techniques/T1059');
  });

  test('a dossier links actors, campaigns and families from stored edges', () => {
    const dossier = buildTechniqueDossier('T1059.001', [
      { technique_id: 'T1059.001', technique_name: 'PowerShell', tactic: 'execution', entity_type: 'actor', entity_slug: 'apt29', entity_name: 'APT29' },
      { technique_id: 'T1059.001', technique_name: 'PowerShell', tactic: 'execution', entity_type: 'actor', entity_slug: 'sandworm-team', entity_name: 'Sandworm Team' },
      { technique_id: 'T1059.001', technique_name: 'PowerShell', tactic: 'execution', entity_type: 'campaign', entity_slug: 'solarwinds-compromise', entity_name: 'SolarWinds Compromise' },
      { technique_id: 'T1059.001', technique_name: 'PowerShell', tactic: 'execution', entity_type: 'malware', entity_slug: 'cobalt-strike', entity_name: 'Cobalt Strike' },
    ]);
    expect(dossier).not.toBeNull();
    expect(dossier!.actors.map((a) => a.slug)).toEqual(['apt29', 'sandworm-team']);
    expect(dossier!.campaigns.map((c) => c.slug)).toEqual(['solarwinds-compromise']);
    expect(dossier!.malware_families.map((m) => m.slug)).toEqual(['cobalt-strike']);
    expect(dossier!.hunting.kql).toContain('DeviceProcessEvents');
    expect(dossier!.hunting.spl).toContain('tstats');
  });

  test('an unknown technique is a clean null, not an empty dossier', () => {
    expect(buildTechniqueDossier('T9999.999', [])).toBeNull();
    expect(buildTechniqueDossier('nope', [])).toBeNull();
  });
});

describe('PHASE 9A — bidirectional attribution', () => {
  function meshDb(tables: Record<string, unknown[]>) {
    return {
      prepare(sql: string) {
        const key = Object.keys(tables).find((marker) => sql.includes(marker)) ?? '';
        const rows = tables[key] ?? [];
        const result = { results: rows };
        const chain = {
          bind: () => chain,
          all: async () => result,
          first: async () => rows[0] ?? null,
        };
        return chain;
      },
    };
  }

  test('Cobalt Strike attributes to the actors that document it as software', async () => {
    const db = meshDb({
      'FROM threat_actors': [
        { slug: 'apt29', name: 'APT29', mitre_id: 'G0016', software_json: '["Cobalt Strike","Mimikatz"]' },
        { slug: 'other', name: 'Other', mitre_id: 'G0999', software_json: '["Emotet"]' },
      ],
      'FROM threat_campaigns': [
        { slug: 'op-x', name: 'Op X', mitre_id: 'C0001', software_json: '["Cobalt Strike"]' },
      ],
    });
    const attribution = await loadFamilyAttribution(db as never, 'Cobalt Strike', 'cobalt-strike');
    expect(attribution.actors.map((a) => a.slug)).toEqual(['apt29']);
    expect(attribution.campaigns.map((c) => c.slug)).toEqual(['op-x']);
    expect(attribution.total_linked_actors).toBe(1);
  });

  test('a CVE exposes actors, campaigns, rules and radar membership', async () => {
    const db = meshDb({
      'FROM json_each(threat_actors.cves_json)': [{ slug: 'apt29', name: 'APT29', mitre_id: 'G0016' }],
      'FROM json_each(threat_campaigns.cves_json)': [{ slug: 'solarwinds-compromise', name: 'SolarWinds Compromise', mitre_id: 'C0024' }],
      'FROM detection_rules': [{ id: 'r1', kind: 'cve', name: 'CVE-2021-3199 (Nuclei template)', url: 'https://github.com/x/y', severity: null, source: 'nuclei' }],
      'FROM vulnerabilities': [{ is_exploited_in_wild: 1, epss_score: 0.2, epss_delta: null }],
      'FROM cve_pocs': [],
    });
    const links = await loadCveLinks(db as never, 'cve-2021-3199');
    expect(links.cve_id).toBe('CVE-2021-3199');
    expect(links.actors[0].slug).toBe('apt29');
    expect(links.campaigns[0].slug).toBe('solarwinds-compromise');
    expect(links.detection_rules[0].source).toBe('nuclei');
    expect(links.in_exploit_radar).toBe(true);
  });

  test('an out-of-catalog CVE never claims a catalog row', async () => {
    const db = meshDb({ 'FROM vulnerabilities': [], 'FROM json_each(threat_actors.cves_json)': [], 'FROM json_each(threat_campaigns.cves_json)': [], 'FROM detection_rules': [], 'FROM cve_pocs': [] });
    const links = await loadCveLinks(db as never, 'CVE-2020-0688');
    expect(links.in_exploit_radar).toBe(false);
    expect(links.actors).toEqual([]);
  });

  test('actor documented CVEs carry an explicit in_catalog flag', () => {
    const actor = classifyThreatActor(
      {
        slug: 'apt29',
        name: 'APT29',
        cves_json: '["CVE-2020-0688","CVE-2021-3199"]',
        techniques_json: '[]',
        software_json: '[]',
      },
      { catalogCves: new Set(['CVE-2021-3199']), cves: [{ cve_id: 'CVE-2021-3199', kev: true, due_date: null }] },
    );
    expect(actor).not.toBeNull();
    const byId = new Map(actor!.documented_cves.map((cve) => [cve.cve_id, cve]));
    expect(byId.get('CVE-2020-0688')?.in_catalog).toBe(false);
    expect(byId.get('CVE-2021-3199')?.in_catalog).toBe(true);
    expect(byId.get('CVE-2021-3199')?.kev).toBe(true);
  });
});
