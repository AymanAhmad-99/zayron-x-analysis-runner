/**
 * PHASE 7C — live IOC workspace, detection coverage and safe IOC SEO.
 *
 * The important assertions here are structural: the SAFE-RENDER guarantee is
 * proven against the component sources that actually ship, so a future edit that
 * turns an indicator into a clickable link fails the gate instead of reaching
 * production.
 */

import { describe, expect, test } from 'bun:test';
import fs from 'node:fs';
import {
  FAMILY_LABELS,
  isIocIngestSlot,
  matchSigmaFamily,
  parseNucleiCveTemplates,
  parseSigmaFamilyRules,
  treeEntries,
} from '../workers/ingest/src/detectionRules';
import { familySlug } from '../workers/api/src/iocs';
import { familyHubPath, iocRobots } from '../apps/web/app/lib/iocSeo';
import { defangIndicator } from '../packages/intelligence/src/iocs/hygiene';

const read = (path: string) => fs.readFileSync(path, 'utf8');

const WORKBENCH = 'apps/web/app/components/IocWorkbench.tsx';
const FAMILY_PAGE = 'apps/web/app/intelligence/malware/families/[slug]/page.tsx';
const LLMS = 'apps/web/app/llms.txt/route.ts';

describe('SAFE-RENDER guarantee', () => {
  const files = [WORKBENCH, FAMILY_PAGE];

  test('no indicator field is ever placed in an href', () => {
    for (const file of files) {
      const source = read(file);
      // Every `href` in these components is a constant internal route or an
      // official upstream rule URL inspected by an allowlist helper.
      expect(source).not.toMatch(/href=\{[^}]*defanged/);
      expect(source).not.toMatch(/href=\{[^}]*normalized_value/);
      expect(source).not.toMatch(/href=\{[^}]*\.value\b/);
      expect(source).not.toMatch(/href=\{`http/);
    }
  });

  test('indicators render from the defanged projection only', () => {
    const workbench = read(WORKBENCH);
    expect(workbench).toContain('{row.defanged}');
    expect(workbench).toContain('lookup.data.defanged');
    expect(workbench).toContain('text={lookup.data.defanged}');
    // the raw API field must never be read by the workspace
    expect(workbench).not.toMatch(/row\.normalized_value/);

    const family = read(FAMILY_PAGE);
    expect(family).toContain('{ioc.defanged}');
    expect(family).not.toMatch(/ioc\.normalized_value/);
  });

  test('every rendered indicator sits inside a plain <code> element', () => {
    const workbench = read(WORKBENCH);
    expect(workbench).toMatch(/<code[^>]*>\{row\.defanged\}<\/code>/);
    expect(workbench).toMatch(/<code>\{lookup\.data \? lookup\.data\.defanged : lookup\.query\}<\/code>/);
    expect(read(FAMILY_PAGE)).toMatch(/<code[^>]*>\{ioc\.defanged\}<\/code>/);
  });

  test('the defanged form actually neutralizes a live indicator', () => {
    const rendered = defangIndicator('https://evil.example/beacon');
    expect(rendered).toBe('hxxps://evil[.]example/beacon');
    expect(rendered).not.toContain('http://');
    expect(rendered).not.toContain('https://');
    const address = defangIndicator('45.9.168.10');
    expect(address).toBe('45[.]9[.]168[.]10');
    // no dotted quad survives, so no browser or filter can resolve it
    expect(/(\d{1,3}\.){3}\d{1,3}/.test(address)).toBe(false);
  });

  test('local indicator copy is exposed through a button, not an anchor', () => {
    const workbench = read(WORKBENCH);
    expect(workbench).toContain('className="ioc-copy"');
    // the only anchors are internal CTAs
    const anchors = workbench.match(/<a [^>]*href="([^"]+)"/g) ?? [];
    expect(anchors.length).toBeGreaterThan(0);
    for (const anchor of anchors) expect(anchor).toContain('href="/developers"');
  });
});

describe('Sigma / Nuclei matcher', () => {
  test('tree payloads are read defensively', () => {
    expect(treeEntries({ tree: [{ path: 'a.yaml' }] })).toHaveLength(1);
    expect(treeEntries({})).toEqual([]);
    expect(treeEntries(null)).toEqual([]);
  });

  test('Nuclei CVE templates map to a CVE key and an official URL', () => {
    const rules = parseNucleiCveTemplates([
      { path: 'http/cves/2024/CVE-2024-3400.yaml' },
      { path: 'http/cves/2019/CVE-2019-0708.yaml' },
      { path: 'http/misconfiguration/foo.yaml' },
      { path: 'http/cves/2024/CVE-2024-3400.yaml' },
    ]);
    expect(rules).toHaveLength(1);
    expect(rules[0]).toMatchObject({
      source: 'nuclei',
      kind: 'cve',
      match_key: 'CVE-2024-3400',
      rule_id: 'CVE-2024-3400',
      repo: 'projectdiscovery/nuclei-templates',
    });
    expect(rules[0].url).toBe(
      'https://github.com/projectdiscovery/nuclei-templates/blob/main/http/cves/2024/CVE-2024-3400.yaml',
    );
    expect(rules[0].url.startsWith('https://github.com/')).toBe(true);
  });

  test('the Nuclei parser is bounded', () => {
    const many = Array.from({ length: 50 }, (_, i) => ({ path: `http/cves/2025/CVE-2025-${1000 + i}.yaml` }));
    expect(parseNucleiCveTemplates(many, { max: 7 })).toHaveLength(7);
  });

  test('Sigma rules are matched by family keyword in the file name only', () => {
    expect(matchSigmaFamily('rules/windows/process_creation/proc_creation_win_qakbot_execution.yml')).toBe('QakBot');
    expect(matchSigmaFamily('rules/proxy/webproxy_emotet_download.yml')).toBe('Emotet');
    expect(matchSigmaFamily('rules/windows/registry/lumma_stealer.yml')).toBe('Lumma');
    expect(matchSigmaFamily('rules/windows/process_creation/random_rule.yml')).toBeNull();
    expect(FAMILY_LABELS.asyncrat).toBe('AsyncRAT');
  });

  test('Sigma family rules keep a lowercased match key and skip deprecated files', () => {
    const rules = parseSigmaFamilyRules([
      { path: 'rules/windows/process_creation/proc_creation_win_qakbot_execution.yml' },
      { path: 'rules/deprecated/proc_creation_win_emotet.yml' },
      { path: 'rules/network/cobaltstrike_malleable_profile.yml' },
      { path: 'README.md' },
    ]);
    expect(rules).toHaveLength(2);
    expect(rules.map((r) => r.match_key)).toEqual(['qakbot', 'cobalt strike']);
    expect(rules[0].kind).toBe('family');
    // SigmaHQ/sigma defaults to `master`; a `main` URL would 404 for every rule.
    expect(rules[0].url).toContain('github.com/SigmaHQ/sigma/blob/master/');
    expect(read('workers/ingest/src/detectionRules.ts')).toContain('git/trees/master?recursive=1');
  });
});

describe('staggered ingest cadence', () => {
  test('only the first slot of each 8-hour block runs', () => {
    expect(isIocIngestSlot(new Date('2026-11-25T00:05:00Z'))).toBe(true);
    expect(isIocIngestSlot(new Date('2026-11-25T08:10:00Z'))).toBe(true);
    expect(isIocIngestSlot(new Date('2026-11-25T16:00:00Z'))).toBe(true);
    expect(isIocIngestSlot(new Date('2026-11-25T04:00:00Z'))).toBe(false);
    expect(isIocIngestSlot(new Date('2026-11-25T08:45:00Z'))).toBe(false);
    expect(isIocIngestSlot(new Date('2026-11-25T09:00:00Z'))).toBe(false);
  });

  test('the flag is declared in the deployed ingestion config', () => {
    const wrangler = read('workers/ingest/wrangler.toml');
    expect(wrangler).toContain('IOC_INGEST_ENABLED = "true"');
    expect(read('workers/ingest/src/index.ts')).toContain('isIocIngestSlot(new Date(), 8)');
  });
});

describe('family hub SEO', () => {
  test('slugs are stable and URL-safe', () => {
    expect(familySlug('QakBot')).toBe('qakbot');
    expect(familySlug('Cobalt Strike')).toBe('cobalt-strike');
    expect(familySlug('@c1-ease/core')).toBe('c1-ease-core');
    expect(familyHubPath('QakBot')).toBe('/intelligence/malware/families/qakbot');
  });

  test('the hub emits Dataset JSON-LD and is indexable', () => {
    const page = read(FAMILY_PAGE);
    expect(page).toContain('"@type": "Dataset"');
    expect(page).toContain('"@context": "https://schema.org"');
    expect(page).toContain('application/ld+json');
    expect(page).toContain('resolvePageRobots({ preview: isPreviewDeployment(), indexable: true })');
    expect(page).toContain('variableMeasured');
  });

  test('transient lookup states are noindex, follow', () => {
    expect(iocRobots('1.10.16.0/20')).toEqual({ index: false, follow: true });
    expect(iocRobots('')).toEqual({ index: true, follow: true });
    expect(iocRobots(null)).toEqual({ index: true, follow: true });
    expect(read('apps/web/app/intelligence/iocs/page.tsx')).toContain('index: false, follow: true');
  });

  test('the hub is edge-cached and the sitemap only lists live families', () => {
    expect(read('apps/web/middleware.ts')).toContain('"/intelligence/iocs"');
    expect(read('apps/web/middleware.ts')).toContain('PUBLIC_PAGE_CACHE_PREFIXES');
    const sitemap = read('apps/web/app/sitemaps/[shard]/route.ts');
    expect(sitemap).toContain('getIocFamilies');
    expect(sitemap).toContain('familyHubPath');
  });

  test('the workspace is promoted out of STAGED', () => {
    const frame = read('apps/web/app/components/IntelligenceShellFrame.tsx');
    const staged = /const STAGED_ROUTES = new Set\(\[([^\]]*)\]\)/.exec(frame)?.[1] ?? '';
    expect(staged).not.toContain('iocs');
    expect(staged).toContain('routes.actors.href');
    expect(staged).toContain('routes.campaigns.href');
  });
});

describe('/llms.txt', () => {
  test('it is a clean Markdown index of the real surfaces', () => {
    const route = read(LLMS);
    expect(route).toContain('text/plain; charset=utf-8');
    for (const needle of [
      'Truth Is the Perimeter',
      '/intelligence/vulnerabilities',
      '/intelligence/malware',
      '/intelligence/iocs',
      '/developers',
      '/api/v1/openapi.json',
      'api/v1/iocs/edl/ip.txt',
      'STIX 2.1',
      'MAL-',
    ]) {
      expect(route).toContain(needle);
    }
    expect(route).not.toContain('<html');
  });

  test('it publishes no raw indicator values', () => {
    const route = read(LLMS);
    expect(route).not.toMatch(/https?:\/\/\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}/);
    expect(route).toContain('[.]');
  });
});

describe('OpenSSF supply-chain split', () => {
  test('dossiers have their own projection and never enter the canonical gate', () => {
    const api = read('workers/api/src/index.ts');
    const start = api.indexOf("path === '/api/v1/malware/supply-chain/reports'");
    expect(start).toBeGreaterThan(-1);
    const block = api.slice(start, start + 2200);
    expect(block).toContain("source = 'openssf-osv'");
    expect(block).toContain("id LIKE 'MAL-%'");
    // a MAL-* advisory has no analysis run/artifact, so it must NOT be validated
    // as a canonical stored report
    expect(block).not.toContain('loadServableMalwareReports');
    expect(block).not.toContain('validateStoredMalwareReport');
  });

  test('the projection is public and edge-cached', () => {
    expect(read('workers/api/src/security.ts')).toContain('"/api/v1/malware/supply-chain/reports"');
    expect(read('workers/api/src/edgeCache.ts')).toContain('"/api/v1/malware/supply-chain/reports"');
  });

  test('the list renders the human title, not the raw id, as the heading', () => {
    const list = read('apps/web/app/components/MalwareList.tsx');
    expect(list).toContain('<strong>{dossier.title}</strong>');
    expect(list).toContain('<code>{dossier.report_id}</code>');
    expect(list).not.toContain('<strong>{dossier.report_id}</strong>');
    expect(list).toContain('getSupplyChainDossiers');
  });
});
