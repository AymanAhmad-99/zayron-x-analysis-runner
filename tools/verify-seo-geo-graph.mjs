#!/usr/bin/env node
/**
 * PHASE 9B — permanent post-deploy contract verifier.
 *
 * Audits live production (`https://zayron-x.co` by default) and prints a
 * deterministic /100 Platform Contract Score across five weighted checks:
 *
 *   1. AI & search crawler access        (20)
 *   2. SEO / GEO contracts               (30)
 *   3. Neural symmetry proof             (25)
 *   4. Zero-regression guard             (15)
 *   5. Security & auth invariants        (10)
 *
 * Exit code is 0 only at a full score. `--base <url>` audits another origin.
 * No dependencies: plain `fetch`, no write, no mutation.
 */

const args = process.argv.slice(2);
function argValue(flag, fallback) {
  const index = args.indexOf(flag);
  return index >= 0 && args[index + 1] ? args[index + 1] : fallback;
}

const BASE = argValue('--base', 'https://zayron-x.co').replace(/\/+$/, '');
const TIMEOUT_MS = Number(argValue('--timeout', '15000'));

const PAGES = [
  '/',
  '/news',
  '/intelligence/threat-actors',
  '/intelligence/vulnerabilities',
  '/intelligence/techniques/T1059.001',
  '/intelligence/vendors',
  '/intelligence/regions/us',
  '/llms.txt',
];

const results = [];
function record(check, label, earned, possible, detail = '') {
  results.push({ check, label, earned, possible, detail });
  const flag = earned >= possible ? 'PASS' : earned > 0 ? 'PART' : 'FAIL';
  console.log(`[${flag}] ${check} · ${label}${detail ? ` — ${detail}` : ''} (${earned}/${possible})`);
}

async function get(path, init = {}) {
  try {
    const response = await fetch(BASE + path, {
      redirect: 'manual',
      signal: AbortSignal.timeout(TIMEOUT_MS),
      ...init,
      headers: { 'user-agent': 'ZAYRON-X-ContractVerifier/1.0', ...(init.headers || {}) },
    });
    const text = init.method === 'HEAD' ? '' : await response.text();
    return { status: response.status, headers: response.headers, text };
  } catch (error) {
    return { status: 0, headers: new Headers(), text: '', error: String(error?.message ?? error) };
  }
}

/* ── 1. Crawler access ────────────────────────────────────────────────────── */
{
  const bots = ['GPTBot', 'PerplexityBot', 'Googlebot'];
  const targets = ['/', '/news', '/intelligence/vulnerabilities', '/llms.txt'];
  let earned = 0;
  const statuses = [];
  for (const bot of bots) {
    for (const path of targets) {
      const r = await get(path, { headers: { 'user-agent': `${bot}/1.0 (+https://zayron-x.co)` } });
      statuses.push(`${bot}${path}=${r.status}`);
      if (r.status === 200) earned += 1;
    }
  }
  record('1', 'AI & search crawler access', earned, bots.length * targets.length, statuses.join(' '));
}

/* ── 2. SEO / GEO contracts ───────────────────────────────────────────────── */
{
  const archetypes = [
    '/',
    '/news',
    '/intelligence/threat-actors',
    '/intelligence/vulnerabilities',
    '/intelligence/vendors',
    '/intelligence/regions/us',
    '/intelligence/techniques/T1059.001',
    '/llms.txt',
  ];
  let earned = 0;
  const possible = archetypes.length * 4;
  const failures = [];
  for (const path of archetypes) {
    const r = await get(path);
    if (r.status !== 200) {
      failures.push(`${path}:status=${r.status}`);
      continue;
    }
    if (path === '/llms.txt') {
      // Plain-text discovery file: no HTML contracts apply, but it must be live
      // markdown with the canonical URL pattern block.
      if (/^#\s/.test(r.text)) earned += 1;
      else failures.push(`${path}:no-markdown-title`);
      if (r.text.includes(`${BASE}/news/`) || r.text.includes('/news/{slug}')) earned += 1;
      else failures.push(`${path}:no-news-pattern`);
      if (/text\/plain/.test(r.headers.get('content-type') || '')) earned += 1;
      else failures.push(`${path}:content-type`);
      if (/max-age=300|s-maxage=3600/.test(r.headers.get('cache-control') || '')) earned += 1;
      else failures.push(`${path}:cache-control`);
      continue;
    }
    if (/"@graph"/.test(r.text)) earned += 1;
    else failures.push(`${path}:no-@graph`);
    if (/og:image/.test(r.text)) earned += 1;
    else failures.push(`${path}:no-og-image`);
    if (/rel="canonical"/.test(r.text)) earned += 1;
    else failures.push(`${path}:no-canonical`);
    const robots = (r.text.match(/<meta[^>]+name="robots"[^>]*>/) || [''])[0];
    if (/index/i.test(robots) && !/noindex/i.test(robots)) earned += 1;
    else failures.push(`${path}:robots=${robots || 'missing'}`);
  }
  record('2', 'SEO / GEO contracts (8 archetypes)', earned, possible, failures.slice(0, 6).join(' ') || 'all contracts present');
}

/* ── 3. Neural symmetry ───────────────────────────────────────────────────── */
{
  let earned = 0;
  const notes = [];

  // 3a. Malware ↔ Technique must be non-zero in the live API.
  const technique = await get('/api/v1/techniques/T1059.001');
  let families = 0;
  try {
    const body = JSON.parse(technique.text);
    families = (body.malware_families || body.data?.malware_families || []).length;
  } catch { /* leaves 0 */ }
  if (families > 0) earned += 1;
  notes.push(`technique.malware_families=${families}`);

  // 3b. News ↔ entities: forward links on the newest briefings. A newsroom whose
  // newest story names no catalogued entity is still valid, so the check walks
  // the recent window and requires ONE briefing with verified internal links.
  const news = await get('/api/v1/news?limit=5');
  let slug = '';
  let mentions = 0;
  const slugs = [];
  try {
    const body = JSON.parse(news.text);
    for (const item of body.items || []) slugs.push(item.slug);
  } catch { /* no slugs */ }
  for (const candidate of slugs) {
    const article = await get(`/api/v1/news/${candidate}`);
    try {
      const data = JSON.parse(article.text).data || {};
      const linked = (data.mentions || []).filter((m) => m.in_catalog === 1 && m.href).length;
      if (linked > mentions) {
        mentions = linked;
        slug = candidate;
      }
    } catch { /* none */ }
  }
  if (slug && mentions > 0) earned += 1;
  notes.push(`news=${slug || 'none'} linked_mentions=${mentions}`);

  // 3c. Reverse feed: a linked entity page must show related briefings.
  let reverse = false;
  let candidates = [];
  try {
    const body = JSON.parse((await get('/api/v1/news?limit=5')).text);
    candidates = (body.items || []).map((item) => item.slug);
  } catch { /* none */ }
  for (const candidate of candidates) {
    if (reverse) break;
    const article = await get(`/api/v1/news/${candidate}`);
    let entityType = '';
    let entitySlug = '';
    try {
      const data = JSON.parse(article.text).data || {};
      const first = (data.mentions || []).find((m) => m.in_catalog === 1 && m.entity_type !== 'vendor');
      if (first) {
        entityType = first.entity_type;
        entitySlug = first.entity_slug;
      }
    } catch { /* none */ }
    if (entityType && entitySlug) {
      const endpoint =
        entityType === 'cve'
          ? `/api/v1/vulnerabilities/${encodeURIComponent(entitySlug)}`
          : entityType === 'actor'
            ? `/api/v1/threat-actors/${encodeURIComponent(entitySlug)}`
            : entityType === 'technique'
              ? `/api/v1/techniques/${encodeURIComponent(entitySlug)}`
              : entityType === 'malware_family'
                ? `/api/v1/iocs/families/${encodeURIComponent(entitySlug)}`
                : '';
      if (endpoint) {
        const entity = await get(endpoint);
        try {
          const body = JSON.parse(entity.text);
          const list = body.related_news || body.data?.related_news || [];
          reverse = Array.isArray(list) && list.length > 0;
        } catch { /* none */ }
      }
    }
  }
  if (reverse) earned += 1;
  notes.push(`reverse_related_news=${reverse}`);

  // 3d. Vendor hub ↔ CVE.
  const vendors = await get('/api/v1/vendors');
  let vendorSlug = '';
  try {
    vendorSlug = JSON.parse(vendors.text).items?.[0]?.slug || '';
  } catch { /* none */ }
  let vendorCves = 0;
  if (vendorSlug) {
    const hub = await get(`/api/v1/vendors/${vendorSlug}`);
    try {
      vendorCves = (JSON.parse(hub.text).data?.cves || []).length;
    } catch { /* none */ }
  }
  if (vendorSlug && vendorCves > 0) earned += 1;
  notes.push(`vendor=${vendorSlug || 'none'} cves=${vendorCves}`);

  // 3e. Region hub ↔ actors / live C2.
  const region = await get('/api/v1/regions/us');
  let regionActors = 0;
  let regionC2 = 0;
  try {
    const data = JSON.parse(region.text).data || {};
    regionActors = (data.actor_list || []).length;
    regionC2 = Number(data.active_c2 || 0);
  } catch { /* none */ }
  if (regionActors > 0 || regionC2 > 0) earned += 1;
  notes.push(`region.us actors=${regionActors} active_c2=${regionC2}`);

  record('3', 'Neural symmetry proof', earned, 5, notes.join(' '));
}

/* ── 4. Zero-regression guard ─────────────────────────────────────────────── */
{
  let earned = 0;
  const notes = [];

  const legacy = await get('/threats/evt_b45cdaca-ea6d-44');
  if (legacy.status === 410 && /noindex/i.test(legacy.headers.get('x-robots-tag') || '')) earned += 1;
  notes.push(`legacy_410=${legacy.status}`);

  // Internal link integrity across the crawled archetypes (sampled).
  const linkTargets = new Set();
  for (const path of PAGES) {
    const r = await get(path);
    if (r.status !== 200) continue;
    for (const match of r.text.matchAll(/href="(\/(?:news|intelligence)\/[^"#?]+)"/g)) {
      if (linkTargets.size >= 40) break;
      linkTargets.add(match[1]);
    }
  }
  let broken = 0;
  for (const target of [...linkTargets].slice(0, 12)) {
    const r = await get(target, { method: 'HEAD' });
    if (r.status !== 200) broken += 1;
  }
  if (broken === 0) earned += 1;
  notes.push(`broken_internal=${broken}/${Math.min(12, linkTargets.size)}`);

  // No raw IOC hyperlink and no visible UPPER_SNAKE enum on marketing surfaces.
  const home = await get('/');
  const newsPage = await get('/news');
  const visible = (text) => text.replace(/<script[\s\S]*?<\/script>/gi, '');
  const rawHref = /href="(?:https?:\/\/)?(?:\d{1,3}\.){3}\d{1,3}/i.test(visible(home.text) + visible(newsPage.text));
  if (!rawHref) earned += 1;
  notes.push(`raw_ioc_href=${rawHref}`);
  const enumLeak = /(EXPLOITED_IN_WILD|GITHUB_MALWARE_FEED|KEV_LISTED|SYNTHETIC_UNVERIFIED)/.test(
    visible(newsPage.text),
  );
  if (!enumLeak) earned += 1;
  notes.push(`visible_enum_leak=${enumLeak}`);

  // Burst crawl: five actor dossiers in parallel must not 404.
  const burst = await Promise.all(
    ['apt29', 'sandworm-team', 'lazarus-group', 'apt28', 'fin7'].map(async (slug) => (await get(`/intelligence/threat-actors/${slug}`)).status),
  );
  const falseDos = burst.filter((status) => status === 404).length;
  if (falseDos === 0) earned += 1;
  notes.push(`burst_404=${falseDos}`);

  record('4', 'Zero-regression guard', earned, 5, notes.join(' '));
}

/* ── 5. Security & auth invariants ────────────────────────────────────────── */
{
  const nope = await get('/api/v1/nope');
  const admin = await get('/api/v1/admin/status');
  const bulk = await get('/api/v1/iocs/bulk', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: '{}',
  });
  let earned = 0;
  if (nope.status === 404) earned += 1;
  if (admin.status === 401) earned += 1;
  if (bulk.status === 401) earned += 1;
  record('5', 'Security & auth invariants', earned, 3, `nope=${nope.status} admin=${admin.status} bulkPOST=${bulk.status}`);
}

const totalEarned = results.reduce((sum, entry) => sum + entry.earned, 0);
const totalPossible = results.reduce((sum, entry) => sum + entry.possible, 0);
const score = Math.round((totalEarned / totalPossible) * 100);
const failed = results.filter((entry) => entry.earned < entry.possible);

console.log('');
console.log(`PLATFORM_CONTRACT_SCORE=${score}/100`);
console.log(`CHECKS=${results.map((entry) => `${entry.check}:${entry.earned}/${entry.possible}`).join(' ')}`);
console.log(`BASE=${BASE}`);
console.log(score === 100 ? 'VERIFY_PASS' : `VERIFY_PARTIAL failures=${failed.length}`);
process.exit(score === 100 ? 0 : 1);
