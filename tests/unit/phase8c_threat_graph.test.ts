/**
 * PHASE 8C — CONNECTED THREAT GRAPH.
 *
 * Covers the parts that can silently lie:
 *   · the MITRE citation/markdown sanitizer (no raw `(Citation: …)` survives);
 *   · the deterministic extractor against the real canonical bundle;
 *   · the two-tier LIVE_OBSERVED / CANONICAL_PROFILE contract;
 *   · ATT&CK Navigator layer 4.5 shape;
 *   · CISA KEV one-request quiet-slot isolation and the exploit-radar density path;
 *   · public-read classification, sidebar graduation and sitemap exposure.
 */
import { describe, expect, test } from 'bun:test';
import fs from 'node:fs';
import path from 'node:path';

import {
  ACTIVITY_TIERS,
  NAVIGATOR_COLOR,
  NAVIGATOR_DOMAIN,
  NAVIGATOR_VERSION,
  buildCampaignIndex,
  buildHuntingQueries,
  buildNavigatorLayer,
  buildThreatActorIndex,
  classifyCampaign,
  classifyThreatActor,
  cleanMitreText,
  familyMatches,
  groupTechniquesByTactic,
  parseTechniques,
} from '../../workers/api/src/threatGraph';
import {
  CISA_KEV_MAX_ENTRIES,
  CISA_KEV_SUBREQUESTS,
  KEV_UPSERT_SQL,
  QUIET_TICK_SUBREQUEST_CEILING,
  isCisaKevSlot,
  quietTickBudget,
  selectKevEntries,
} from '../../workers/ingest/src/cisaKevBackfill';
import { isPocSyncSlot, POC_MAX_SUBREQUESTS } from '../../workers/ingest/src/pocSync';
import { requiredTrust } from '../../workers/api/src/security';

const ROOT = process.cwd();
const read = (relative: string) => fs.readFileSync(path.join(ROOT, relative), 'utf8');

/* ─────────────────────── sanitizer & extractor ─────────────────────────── */

describe('Phase 8C — MITRE narrative sanitizer', () => {
  test('strips every documented citation marker', () => {
    const raw = 'APT29 targeted governments (Citation: Crowdstrike DNC June 2016)(Citation: ESET Dukes October 2019).';
    const clean = cleanMitreText(raw);
    expect(clean).toBe('APT29 targeted governments.');
    expect(clean).not.toContain('Citation');
  });

  test('unwraps markdown links instead of leaking URLs', () => {
    const clean = cleanMitreText('[Operation Dream Job](https://attack.mitre.org/campaigns/C0022) was espionage.');
    expect(clean).toBe('Operation Dream Job was espionage.');
    expect(clean).not.toContain('http');
  });

  test('removes bare markdown emphasis and numeric footnotes', () => {
    expect(cleanMitreText('**Bold** and _italic_ and `code`[1].')).toBe('Bold and italic and code.');
  });

  test('collapses whitespace so no ragged citation gaps remain', () => {
    expect(cleanMitreText('A   (Citation: X)   B')).toBe('A B');
  });

  test('is idempotent', () => {
    const once = cleanMitreText('Group (Citation: A) uses [Tool](https://example.test).');
    expect(cleanMitreText(once)).toBe(once);
  });
});

const bundlePath = '.zayron/knowledge/physical-15/09-mitre-attack.json';
const hasBundle = fs.existsSync(path.join(ROOT, bundlePath));
// The seeder is plain ESM and never ships to a Worker; import it as a module.
const extractor = hasBundle ? await import('../../tools/seed-mitre-threat-graph.mjs') : null;
const graph: { actors: any[]; campaigns: any[] } | null = extractor
  ? extractor.extractThreatGraph(JSON.parse(read(bundlePath)))
  : null;

describe('Phase 8C — local MITRE extractor (real bundle)', () => {

  test('the canonical bundle is present in this checkout', () => {
    expect(hasBundle).toBe(true);
  });

  test('extracts the full active catalog (>= 140 groups, >= 25 campaigns)', () => {
    expect(graph!.actors.length).toBeGreaterThanOrEqual(140);
    expect(graph!.campaigns.length).toBeGreaterThanOrEqual(25);
  });

  test('every slug is unique across both tables', () => {
    const slugs = [...graph!.actors, ...graph!.campaigns].map((row) => row.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  test('every actor carries a slug-safe, non-empty identifier', () => {
    for (const actor of graph!.actors) {
      expect(actor.slug).toMatch(/^[a-z0-9][a-z0-9-]*$/);
      expect(actor.name.length).toBeGreaterThan(0);
    }
  });

  test('no raw citation or markdown link leaks into any narrative', () => {
    for (const row of [...graph!.actors, ...graph!.campaigns]) {
      expect(/\(Citation:/i.test(row.summary)).toBe(false);
      expect(/\]\(https?:/i.test(row.summary)).toBe(false);
    }
  });

  test('APT29 is canonical and keeps its documented aliases', () => {
    const apt29 = graph!.actors.find((actor) => actor.mitre_id === 'G0016');
    expect(apt29).toBeDefined();
    expect(apt29!.slug).toBe('apt29');
    expect(apt29!.aliases).toContain('Cozy Bear');
    expect(apt29!.techniques.length).toBeGreaterThan(20);
    expect(apt29!.software).toContain('Cobalt Strike');
  });

  test('techniques are real ATT&CK ids with a tactic', () => {
    const techniques = graph!.actors.flatMap((actor) => actor.techniques);
    expect(techniques.length).toBeGreaterThan(1000);
    for (const technique of techniques.slice(0, 200)) {
      expect(technique.id).toMatch(/^T\d{4}(?:\.\d{3})?$/);
      expect(typeof technique.tactic).toBe('string');
      expect(technique.tactic.length).toBeGreaterThan(0);
    }
  });

  test('motivation is one of the four honest bands', () => {
    const bands = new Set(['Espionage / State-Nexus', 'Financial / Ransomware', 'Destructive / Hacktivism', 'Unattributed / Mixed']);
    for (const actor of graph!.actors) expect(bands.has(actor.motivation)).toBe(true);
  });

  test('campaign attribution only references extracted actors', () => {
    const slugs = new Set(graph!.actors.map((actor) => actor.slug));
    for (const campaign of graph!.campaigns) {
      for (const actorSlug of campaign.actor_slugs) expect(slugs.has(actorSlug)).toBe(true);
    }
  });

  test('the seeder emits idempotent INSERT OR REPLACE statements', () => {
    const script = read('tools/seed-mitre-threat-graph.mjs');
    expect(script).toContain('INSERT OR REPLACE INTO threat_actors');
    expect(script).toContain('INSERT OR REPLACE INTO threat_campaigns');
  });

  test('the 51 MB bundle is never imported by a Worker', () => {
    for (const workerPath of ['workers/api/src/index.ts', 'workers/ingest/src/index.ts']) {
      expect(read(workerPath)).not.toContain('09-mitre-attack.json');
    }
  });
});

/* ─────────────────────── two-tier truth architecture ───────────────────── */

describe('Phase 8C — LIVE_OBSERVED vs CANONICAL_PROFILE', () => {
  const actor = {
    id: 'G0016',
    slug: 'apt29',
    name: 'APT29',
    aliases_json: JSON.stringify(['Cozy Bear', 'NOBELIUM']),
    mitre_id: 'G0016',
    mitre_url: 'https://attack.mitre.org/groups/G0016',
    motivation: 'Espionage / State-Nexus',
    target_sectors_json: JSON.stringify(['Government']),
    target_regions_json: JSON.stringify(['Europe']),
    summary: 'A documented group.',
    techniques_json: JSON.stringify([
      { id: 'T1059.001', name: 'PowerShell', tactic: 'execution' },
      { id: 'T1003.002', name: 'Security Account Manager', tactic: 'credential-access' },
    ]),
    software_json: JSON.stringify(['Cobalt Strike', 'Sliver', 'AdFind']),
    cves_json: JSON.stringify(['CVE-2021-44228', 'CVE-2019-19781']),
    first_seen: '2017-05-31',
    last_seen: '2026-07-31',
  };

  test('a documented family with active indicators makes the actor LIVE_OBSERVED', () => {
    const item = classifyThreatActor(actor, {
      families: [{ family: 'CobaltStrike', slug: 'cobaltstrike', active_count: 12 }],
      cves: [],
      pocCves: new Set<string>(),
    })!;
    expect(item.activity_tier).toBe('LIVE_OBSERVED');
    expect(item.live_c2_count).toBe(12);
    expect(item.live_malware_families).toHaveLength(1);
  });

  test('a KEV-listed documented CVE also makes the actor LIVE_OBSERVED', () => {
    const item = classifyThreatActor(actor, {
      families: [],
      cves: [{ cve_id: 'CVE-2021-44228', kev: true, due_date: '2021-12-24' }],
      pocCves: new Set<string>(),
    })!;
    expect(item.activity_tier).toBe('LIVE_OBSERVED');
    expect(item.linked_kev_count).toBe(1);
    expect(item.linked_cves[0].cve_id).toBe('CVE-2021-44228');
  });

  test('no matching telemetry stays honestly CANONICAL_PROFILE', () => {
    const item = classifyThreatActor(actor, {
      families: [{ family: 'Emotet', slug: 'emotet', active_count: 99 }],
      cves: [{ cve_id: 'CVE-2020-1472', kev: true, due_date: null }],
      pocCves: new Set<string>(),
    })!;
    expect(item.activity_tier).toBe('CANONICAL_PROFILE');
    expect(item.live_c2_count).toBe(0);
    expect(item.linked_cve_count).toBe(0);
  });

  test('a verified public PoC on a documented CVE is live evidence too', () => {
    const item = classifyThreatActor(actor, {
      families: [],
      cves: [],
      pocCves: new Set(['CVE-2019-19781']),
    })!;
    expect(item.activity_tier).toBe('LIVE_OBSERVED');
    expect(item.linked_cve_count).toBe(1);
  });

  test('family matching never fires on short tokens', () => {
    expect(familyMatches('Go', 'Go')).toBe(false);
    expect(familyMatches('Cobalt Strike', 'CobaltStrike')).toBe(true);
    expect(familyMatches('Sliver', 'Sliver C2')).toBe(true);
    expect(familyMatches('Mimikatz', 'QakBot')).toBe(false);
  });

  test('live-observed actors sort ahead of canonical profiles', () => {
    const canonical = { ...actor, slug: 'canonical-group', id: 'G9999', name: 'Aardvark', software_json: '[]' };
    const payload = buildThreatActorIndex([canonical, actor], {
      families: [{ family: 'Cobalt Strike', slug: 'cobalt-strike', active_count: 3 }],
      cves: [],
      pocCves: new Set<string>(),
    });
    expect(payload.items[0].slug).toBe('apt29');
    expect(payload.summary.live_observed).toBe(1);
    expect(payload.summary.canonical_profiles).toBe(1);
    expect(payload.summary.total_actors).toBe(2);
  });

  test('alias search resolves "Cozy Bear" to APT29', () => {
    const payload = buildThreatActorIndex([actor], {}, { q: 'cozy bear' });
    expect(payload.items).toHaveLength(1);
    expect(payload.items[0].slug).toBe('apt29');
  });

  test('the live tier filter is exclusive and cannot invent a canonical row', () => {
    const canonical = { ...actor, slug: 'other', id: 'G0001', software_json: '[]', cves_json: '[]' };
    const payload = buildThreatActorIndex([actor, canonical], {}, { tier: 'live' });
    expect(payload.items).toHaveLength(0);
    expect(payload.meta.tier).toBe('live');
  });

  test('pagination is bounded (limit 1..200)', () => {
    expect(buildThreatActorIndex([actor], {}, { limit: 9999 }).meta.limit).toBe(200);
    expect(buildThreatActorIndex([actor], {}, { limit: 0 }).meta.limit).toBe(1);
  });

  test('the tier vocabulary is exactly two honest states', () => {
    expect([...ACTIVITY_TIERS]).toEqual(['LIVE_OBSERVED', 'CANONICAL_PROFILE']);
  });

  test('campaigns inherit live state from an attributed live actor', () => {
    const liveActor = classifyThreatActor(actor, {
      families: [{ family: 'Cobalt Strike', slug: 'cobalt-strike', active_count: 5 }],
      cves: [],
      pocCves: new Set<string>(),
    })!;
    const campaign = classifyCampaign(
      {
        id: 'C0024',
        slug: 'solarwinds-compromise',
        name: 'SolarWinds Compromise',
        mitre_id: 'C0024',
        summary: 'Espionage operation.',
        actor_slugs_json: JSON.stringify(['apt29']),
        techniques_json: JSON.stringify([{ id: 'T1195.002', name: 'Compromise Software Supply Chain', tactic: 'initial-access' }]),
        software_json: JSON.stringify(['Sunburst']),
        cves_json: '[]',
        target_sectors_json: JSON.stringify(['Government']),
        target_regions_json: JSON.stringify(['United States']),
        first_seen: '2020-12-01',
        last_seen: '2021-01-01',
      },
      [liveActor],
    )!;
    expect(campaign.activity_tier).toBe('LIVE_OBSERVED');
    expect(campaign.actors[0].slug).toBe('apt29');
    expect(campaign.technique_count).toBe(1);
  });

  test('an unattributed campaign is CANONICAL_PROFILE, never guessed', () => {
    const result = buildCampaignIndex(
      [{ id: 'C0001', slug: 'unknown-op', name: 'Unknown Operation', actor_slugs_json: '[]', cves_json: '[]', techniques_json: '[]' }],
      [],
      [],
    );
    expect(result.items[0].activity_tier).toBe('CANONICAL_PROFILE');
    expect(result.items[0].actors).toHaveLength(0);
  });

  test('technique grouping is deterministic and tactic-labelled', () => {
    const groups = groupTechniquesByTactic([
      { id: 'T1005', name: 'Data from Local System', tactic: 'collection' },
      { id: 'T1059', name: 'Command and Scripting Interpreter', tactic: 'execution' },
      { id: 'T1003', name: 'OS Credential Dumping', tactic: 'credential-access' },
    ]);
    expect(groups.map((group) => group.tactic)).toEqual(['collection', 'credential-access', 'execution']);
  });

  test('malformed technique rows are dropped, not rendered', () => {
    expect(parseTechniques(JSON.stringify([{ id: 'not-a-technique' }, { id: 'T1059' }]))).toHaveLength(1);
    expect(parseTechniques('not json')).toHaveLength(0);
  });
});

/* ─────────────────────── ATT&CK Navigator export ───────────────────────── */

describe('Phase 8C — ATT&CK Navigator layer', () => {
  const layer = buildNavigatorLayer({
    name: 'APT29',
    slug: 'apt29',
    description: 'Documented techniques.',
    techniques: [
      { id: 'T1059.001', name: 'PowerShell', tactic: 'execution' },
      { id: 'T1059.001', name: 'PowerShell', tactic: 'execution' },
      { id: 'T1003.002', name: 'Security Account Manager', tactic: 'credential-access' },
    ],
    generatedAt: '2026-11-26T00:00:00.000Z',
  }) as Record<string, any>;

  test('declares Navigator layer 4.5 on the enterprise domain', () => {
    expect(layer.versions.layer).toBe('4.5');
    expect(layer.versions.layer).toBe(NAVIGATOR_VERSION);
    expect(layer.domain).toBe('enterprise-attack');
    expect(layer.domain).toBe(NAVIGATOR_DOMAIN);
  });

  test('deduplicates identical technique/tactic pairs', () => {
    expect(layer.techniques).toHaveLength(2);
  });

  test('every entry is scored and coloured in ZAYRON-X orange', () => {
    for (const technique of layer.techniques) {
      expect(technique.score).toBe(1);
      expect(technique.color).toBe(NAVIGATOR_COLOR);
      expect(technique.techniqueID).toMatch(/^T\d{4}(?:\.\d{3})?$/);
      expect(technique.enabled).toBe(true);
    }
  });

  test('carries generator provenance and no external links', () => {
    expect(JSON.stringify(layer.metadata)).toContain('ZAYRON-X');
    expect(JSON.stringify(layer.metadata)).toContain('2026-11-26T00:00:00.000Z');
    expect(layer.links).toEqual([]);
  });

  test('the payload is JSON-serialisable as a downloadable file', () => {
    const roundTrip = JSON.parse(JSON.stringify(layer));
    expect(roundTrip.name).toBe('APT29');
    expect(roundTrip.techniques).toHaveLength(2);
  });
});

describe('Phase 8C — detection-as-code hunting artifacts', () => {
  test('queries are built from documented software only', () => {
    const hunting = buildHuntingQueries({
      name: 'APT29',
      software: ['Cobalt Strike', 'AdFind'],
      techniques: [{ id: 'T1059', name: 'Command and Scripting Interpreter', tactic: 'execution' }],
    });
    expect(hunting.kql).toContain('Cobalt Strike');
    expect(hunting.spl).toContain('AdFind');
    expect(hunting.kql).toContain('T1059');
    expect(hunting.note).toContain('MITRE ATT&CK');
  });

  test('an actor without documented tooling gets an honest non-query', () => {
    const hunting = buildHuntingQueries({ name: 'Unattributed', software: [], techniques: [] });
    expect(hunting.kql).toContain('no documented software');
    expect(hunting.spl).toContain('never emits a hunting query');
  });

  test('quotes are escaped so a tool name cannot break the query', () => {
    const hunting = buildHuntingQueries({ name: 'X', software: ['Tool "Quoted"'], techniques: [] });
    expect(hunting.kql).toContain('""Quoted""');
  });
});

/* ─────────────────────── CISA KEV quiet slot ───────────────────────────── */

describe('Phase 8C — CISA KEV one-request backfill', () => {
  const at = (hour: number, minute: number) => new Date(Date.UTC(2026, 10, 26, hour, minute, 0));

  test('owns exactly the 04:40 UTC tick', () => {
    expect(isCisaKevSlot(at(4, 40))).toBe(true);
    for (const hour of [0, 2, 6, 8, 12, 16, 20]) expect(isCisaKevSlot(at(hour, 40))).toBe(false);
  });

  test('never collides with the :20 IOC pass or a :00 pulse', () => {
    expect(isCisaKevSlot(at(4, 20))).toBe(false);
    expect(isCisaKevSlot(at(4, 0))).toBe(false);
  });

  test('the shared 04:40 tick stays inside the 6-subrequest ceiling', () => {
    const budget = quietTickBudget(at(4, 40));
    expect(budget.cisaKev).toBe(CISA_KEV_SUBREQUESTS);
    expect(budget.cisaKev + budget.poc).toBeLessThanOrEqual(QUIET_TICK_SUBREQUEST_CEILING);
    expect(budget.cisaKev + budget.poc).toBe(QUIET_TICK_SUBREQUEST_CEILING);
  });

  test('the PoC slot still owns 02:40 and 06:40 with its full budget', () => {
    expect(isPocSyncSlot(at(2, 40))).toBe(true);
    expect(isPocSyncSlot(at(6, 40))).toBe(true);
    expect(quietTickBudget(at(2, 40)).cisaKev).toBe(0);
    expect(quietTickBudget(at(2, 40)).poc).toBe(POC_MAX_SUBREQUESTS);
  });

  test('selects only real CVE ids, newest addition first', () => {
    const entries = selectKevEntries({
      dateReleased: '2026-11-25',
      vulnerabilities: [
        { cveID: 'CVE-2020-0001', vulnerabilityName: 'Old', dateAdded: '2020-01-01' },
        { cveID: 'CVE-2026-0002', vulnerabilityName: 'New', dateAdded: '2026-11-20' },
        { cveID: 'not-a-cve', vulnerabilityName: 'Junk' },
        { cveID: 'CVE-2026-0002', vulnerabilityName: 'Duplicate', dateAdded: '2026-11-20' },
      ],
    });
    expect(entries.map((entry) => entry.cve)).toEqual(['CVE-2026-0002', 'CVE-2020-0001']);
  });

  test('caps a pass at 120 entries', () => {
    const rows = Array.from({ length: 300 }, (_, index) => ({
      cveID: `CVE-2026-${1000 + index}`,
      vulnerabilityName: `Entry ${index}`,
      dateAdded: '2026-01-01',
    }));
    expect(selectKevEntries({ vulnerabilities: rows })).toHaveLength(CISA_KEV_MAX_ENTRIES);
  });

  test('the upsert marks KEV membership without overwriting richer NVD data', () => {
    expect(KEV_UPSERT_SQL).toContain('is_exploited_in_wild = 1');
    expect(KEV_UPSERT_SQL).toContain("'AUTHORITATIVE_VERIFIED'");
    expect(KEV_UPSERT_SQL).toContain("provenance_source = COALESCE(vulnerabilities.provenance_source, 'cisa-kev')");
    expect(KEV_UPSERT_SQL).toContain("affected_vendor = COALESCE(NULLIF(vulnerabilities.affected_vendor, ''), excluded.affected_vendor)");
    // It must never clobber a quarantined row into the public corpus.
    expect(KEV_UPSERT_SQL).toContain("WHEN COALESCE(vulnerabilities.provenance_state, '') IN ('', 'UNVERIFIED')");
    expect(KEV_UPSERT_SQL).not.toContain('severity = excluded.severity');
  });

  test('the catalog date and ransomware statement are stored as facts', () => {
    expect(KEV_UPSERT_SQL).toContain('kev_date_added');
    expect(KEV_UPSERT_SQL).toContain('known_ransomware_campaign_use');
  });

  test('the radar density path is the same KEV flag the backfill writes', () => {
    const exploits = read('workers/api/src/exploits.ts');
    expect(exploits).toContain('v.is_exploited_in_wild = 1');
    expect(exploits).toContain("v.provenance_state = 'AUTHORITATIVE_VERIFIED'");
  });

  test('migration 0038 adds the KEV fact columns additively', () => {
    const migration = read('db/migrations/0038_threat_actors_campaigns_v1.sql');
    expect(migration).toContain('ALTER TABLE vulnerabilities ADD COLUMN kev_date_added TEXT');
    expect(migration).toContain('ALTER TABLE vulnerabilities ADD COLUMN known_ransomware_campaign_use TEXT');
    expect(migration).toContain('CREATE TABLE IF NOT EXISTS threat_actors');
    expect(migration).toContain('CREATE TABLE IF NOT EXISTS threat_campaigns');
    // The legacy ingest-owned `campaigns` table is never redefined.
    expect(migration).not.toContain('CREATE TABLE IF NOT EXISTS campaigns (');
    expect(migration).not.toMatch(/DROP TABLE/i);
  });
});

/* ─────────────────────── API surface & frontend ────────────────────────── */

describe('Phase 8C — public API surface', () => {
  test('the threat graph reads are anonymous; writes are not', () => {
    expect(requiredTrust('GET', '/api/v1/threat-actors')).toBe('public');
    expect(requiredTrust('GET', '/api/v1/threat-actors/apt29')).toBe('public');
    expect(requiredTrust('GET', '/api/v1/threat-actors/apt29/navigator.json')).toBe('public');
    expect(requiredTrust('GET', '/api/v1/campaigns')).toBe('public');
    expect(requiredTrust('GET', '/api/v1/campaigns/solarwinds-compromise')).toBe('public');
    expect(requiredTrust('POST', '/api/v1/threat-actors')).not.toBe('public');
  });

  test('both list routes and both detail prefixes are allow-listed', () => {
    const security = read('workers/api/src/security.ts');
    expect(security).toContain('"/api/v1/threat-actors"');
    expect(security).toContain('"/api/v1/threat-actors/"');
    expect(security).toContain('"/api/v1/campaigns"');
    expect(security).toContain('"/api/v1/campaigns/"');
  });

  test('the OpenAPI document publishes every new path', () => {
    const openapi = read('workers/api/src/openapi.ts');
    for (const route of [
      '"/threat-actors"',
      '"/threat-actors/{slug}"',
      '"/threat-actors/{slug}/navigator.json"',
      '"/campaigns"',
      '"/campaigns/{slug}"',
      '"/campaigns/{slug}/navigator.json"',
    ]) {
      expect(openapi).toContain(route);
    }
    expect(openapi).toContain('ThreatActorSummary');
    expect(openapi).toContain('NavigatorLayer');
  });

  test('the router answers list, dossier and navigator for both catalogs', () => {
    const router = read('workers/api/src/index.ts');
    expect(router).toContain("path === '/api/v1/threat-actors'");
    expect(router).toContain("path.startsWith('/api/v1/threat-actors/')");
    expect(router).toContain("path === '/api/v1/campaigns'");
    expect(router).toContain("path.startsWith('/api/v1/campaigns/')");
    expect(router).toContain("segments[1] === 'navigator.json'");
  });

  test('the loader caps its live reads', () => {
    const graph = read('workers/api/src/threatGraph.ts');
    expect(graph).toContain('FROM threat_campaigns');
    expect(graph).toContain("status = 'ACTIVE'");
    expect(graph).toContain('LIMIT 4000');
    expect(graph).toContain('LIMIT 200');
  });
});

describe('Phase 8C — sidebar graduation & sitemap', () => {
  test('no STAGED badge can render anywhere in the intelligence shell', () => {
    const frame = read('apps/web/app/components/IntelligenceShellFrame.tsx');
    // The badge markup is gone, not merely disabled by an empty set: no `STAGED`
    // string and no staged-route set can reappear in the sidebar.
    expect(frame).not.toContain('STAGED');
    expect(frame).not.toContain('nav-staged');
  });

  test('the nav points at the canonical threat-actors route', () => {
    const routes = read('apps/web/app/lib/routes.ts');
    expect(routes).toContain('/intelligence/threat-actors');
    expect(routes).not.toContain('href: "/intelligence/actors"');
  });

  test('the sitemap lists both hubs and drops the noindex alias', () => {
    const sitemap = read('apps/web/app/lib/sitemap.ts');
    expect(sitemap).toContain('"/intelligence/threat-actors"');
    expect(sitemap).toContain('"/intelligence/campaigns"');
    expect(sitemap).not.toContain('"/intelligence/actors"');
  });

  test('actor and campaign dossiers are added to the static sitemap', () => {
    const shard = read('apps/web/app/sitemaps/[shard]/route.ts');
    expect(shard).toContain('/intelligence/threat-actors/${encodeURIComponent(actor.slug)}');
    expect(shard).toContain('/intelligence/campaigns/${encodeURIComponent(campaign.slug)}');
  });

  test('all new hub pages share the 300s edge window', () => {
    const nextConfig = read('apps/web/next.config.ts');
    expect(nextConfig).toContain('"/intelligence/threat-actors/:path*"');
    expect(nextConfig).toContain('"/intelligence/campaigns/:path*"');
  });

  test('new pages are SSR, indexable and JSON-LD annotated', () => {
    for (const page of [
      'apps/web/app/intelligence/threat-actors/page.tsx',
      'apps/web/app/intelligence/threat-actors/[slug]/page.tsx',
      'apps/web/app/intelligence/campaigns/page.tsx',
      'apps/web/app/intelligence/campaigns/[slug]/page.tsx',
    ]) {
      const source = read(page);
      expect(source).toContain('application/ld+json');
      expect(source).toContain('resolvePageRobots');
      expect(source).toContain('alternates');
    }
  });
});

describe('Phase 8C — no raw malicious links on the new surfaces', () => {
  const surfaces = [
    'apps/web/app/components/ThreatActorGraph.tsx',
    'apps/web/app/components/ThreatActorDossierView.tsx',
    'apps/web/app/components/CampaignGraph.tsx',
    'apps/web/app/components/CampaignDossierView.tsx',
  ];

  test('no surface renders a live indicator value as an anchor', () => {
    for (const surface of surfaces) {
      const source = read(surface);
      expect(source).not.toMatch(/href=\{[^}]*normalized_value/);
      expect(source).not.toMatch(/href=\{[^}]*\.value\b/);
    }
  });

  test('external MITRE links are permanently defanged with noopener/nofollow', () => {
    const dossier = read('apps/web/app/components/ThreatActorDossierView.tsx');
    expect(dossier).toContain('rel="noopener noreferrer nofollow"');
    expect(dossier).toContain('attack.mitre.org');
  });

  test('the dossier only links live families that the API observed', () => {
    const dossier = read('apps/web/app/components/ThreatActorDossierView.tsx');
    expect(dossier).toContain('actor.live_malware_families.map');
    expect(dossier).not.toContain('software.map((name) => (\n                    <a href');
  });
});
