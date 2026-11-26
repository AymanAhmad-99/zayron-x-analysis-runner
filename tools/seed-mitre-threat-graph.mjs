#!/usr/bin/env node
/**
 * PHASE 8C — local MITRE ATT&CK → `threat_actors` / `campaigns` extractor.
 *
 * The canonical STIX bundle is 51 MB, far beyond a Worker bundle limit, so this
 * script NEVER ships. It runs on the operator's machine, keeps only the bounded
 * fields the Threat Graph publishes, and emits idempotent `INSERT OR REPLACE`
 * SQL. Nothing is invented: aliases, techniques, software, CVEs, sectors, regions
 * and dates all come from MITRE's own objects, and every narrative is stripped of
 * `(Citation: …)` markers and markdown link syntax.
 *
 * Usage:
 *   node tools/seed-mitre-threat-graph.mjs                 # report counts + write SQL
 *   node tools/seed-mitre-threat-graph.mjs --out=./seed.sql
 *   node tools/seed-mitre-threat-graph.mjs --check         # validate only, no writes
 */

import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const BUNDLE = '.zayron/knowledge/physical-15/09-mitre-attack.json';
const DEFAULT_OUT = 'db/seeds/0038_mitre_threat_graph.sql';

/* ── sanitizers ─────────────────────────────────────────────────────────── */

/** Remove MITRE citation markers and markdown link/emphasis syntax. */
export function cleanMitreText(input) {
  let text = String(input ?? '');
  text = text.replace(/\(Citation:[^)]*\)/g, '');
  text = text.replace(/\[([^\]]+)\]\((?:https?:\/\/)[^)]*\)/g, '$1');
  text = text.replace(/\[([^\]]+)\]\[\d+\]/g, '$1');
  text = text.replace(/\[\d+\]/g, '');
  text = text.replace(/[*_`]{1,3}([^*_`]+)[*_`]{1,3}/g, '$1');
  text = text.replace(/https?:\/\/\S+/g, '');
  text = text.replace(/\s+/g, ' ').replace(/\s+([.,;:])/g, '$1').trim();
  return text;
}

export function slugify(value) {
  return String(value ?? '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

const SECTORS = [
  'Government', 'Defense', 'Finance', 'Healthcare', 'Energy', 'Telecom',
  'Technology', 'Education', 'Retail', 'Manufacturing', 'Transportation',
  'Media', 'Legal', 'Non-profit', 'Aviation', 'Maritime', 'Space',
];

const REGIONS = [
  'United States', 'Europe', 'Middle East', 'Asia-Pacific', 'Latin America',
  'Africa', 'South Asia', 'Central Asia', 'Eastern Europe', 'Southeast Asia',
  'North America',
];

/** Documented sectors only: a keyword present in MITRE's own text. */
export function extractSectors(text) {
  const hay = ` ${String(text ?? '').toLowerCase()} `;
  const hits = SECTORS.filter((sector) => {
    const needle = sector.toLowerCase().replace('-', ' ');
    return hay.includes(needle) || hay.includes(`${needle}s`) || hay.includes(`${needle} sector`);
  });
  // "Government" covers the documented "government" mentions; "Defense" is only
  // added when MITRE explicitly says defense/military.
  if (!hits.includes('Defense') && /\b(military|defen[cs]e)\b/.test(hay)) hits.push('Defense');
  return [...new Set(hits)];
}

export function extractRegions(text) {
  const hay = ` ${String(text ?? '').toLowerCase()} `;
  const hits = REGIONS.filter((region) => hay.includes(region.toLowerCase()));
  if (!hits.includes('Europe') && /\b(european|nato|eu member)\b/.test(hay)) hits.push('Europe');
  if (!hits.includes('United States') && /\b(u\.s\.|american|washington)\b/.test(hay)) hits.push('United States');
  return [...new Set(hits)];
}

/**
 * Motivation is a documented-keyword read of MITRE's description. It is a coarse
 * band, never an attribution: no country is ever inferred.
 */
export function deriveMotivation(text) {
  const hay = String(text ?? '').toLowerCase();
  const score = {
    'Espionage / State-Nexus': 0,
    'Financial / Ransomware': 0,
    'Destructive / Hacktivism': 0,
  };
  for (const word of ['espionage', 'intelligence', 'state-sponsored', 'state sponsored', 'government', 'diplomatic', 'strategic']) {
    if (hay.includes(word)) score['Espionage / State-Nexus'] += 1;
  }
  for (const word of ['financial', 'ransomware', 'monetar', 'fraud', 'cryptocurrenc', 'theft', 'bank']) {
    if (hay.includes(word)) score['Financial / Ransomware'] += 1;
  }
  for (const word of ['destructive', 'wiper', 'hacktivist', 'disrupt', 'sabotage', 'denial']) {
    if (hay.includes(word)) score['Destructive / Hacktivism'] += 1;
  }
  const ranked = Object.entries(score).sort((a, b) => b[1] - a[1]);
  if (ranked[0][1] === 0 || ranked[0][1] === ranked[1][1]) return 'Unattributed / Mixed';
  return ranked[0][0];
}

export function extractCves(text) {
  const found = String(text ?? '').toUpperCase().match(/CVE-\d{4}-\d{4,}/g) ?? [];
  return [...new Set(found)].slice(0, 40);
}

/* ── extraction ─────────────────────────────────────────────────────────── */

function externalId(obj) {
  return (obj.external_references ?? []).find((ref) => ref.source_name === 'mitre-attack')?.external_id ?? null;
}

function mitreUrl(obj) {
  return (obj.external_references ?? []).find((ref) => ref.source_name === 'mitre-attack')?.url ?? null;
}

/** Alias names MITRE lists (no `url`, not the mitre-attack reference itself). */
function aliasesOf(obj) {
  return [...new Set(
    (obj.external_references ?? [])
      .filter((ref) => ref.source_name !== 'mitre-attack' && !ref.url && ref.source_name)
      .map((ref) => cleanMitreText(ref.source_name))
      .filter((name) => name && name.length <= 80),
  )].slice(0, 24);
}

function isoDate(value) {
  const raw = String(value ?? '');
  return /^\d{4}-\d{2}-\d{2}/.test(raw) ? raw.slice(0, 10) : null;
}

function sqlString(value) {
  if (value === null || value === undefined) return 'NULL';
  // Semicolons are replaced with commas: `wrangler d1 execute --file` splits the
  // batch on every semicolon, and a MITRE narrative may legitimately contain one.
  return `'${String(value).replace(/;/g, ',').replace(/'/g, "''")}'`;
}

function sqlJson(value) {
  return sqlString(JSON.stringify(value ?? []));
}

export function extractThreatGraph(bundle) {
  const objects = Array.isArray(bundle?.objects) ? bundle.objects : [];
  const active = objects.filter((obj) => !obj.revoked && !obj.deprecated);

  const techniquesById = new Map();
  for (const obj of active.filter((entry) => entry.type === 'attack-pattern')) {
    const id = externalId(obj);
    if (!id) continue;
    const tactic = obj.kill_chain_phases?.find((phase) => phase.kill_chain_name === 'mitre-attack')?.phase_name ?? 'unmapped';
    techniquesById.set(obj.id, { id, name: cleanMitreText(obj.name), tactic });
  }

  const softwareById = new Map();
  for (const obj of active.filter((entry) => entry.type === 'malware' || entry.type === 'tool')) {
    softwareById.set(obj.id, cleanMitreText(obj.name));
  }

  const groupsActive = active.filter((entry) => entry.type === 'intrusion-set');
  const groupsById = new Map(groupsActive.map((group) => [group.id, group]));
  const campaignsActive = active.filter((entry) => entry.type === 'campaign');

  const techniques = new Map();
  const software = new Map();
  const attributed = new Map();
  const relationshipCves = new Map();
  for (const rel of active.filter((entry) => entry.type === 'relationship')) {
    const push = (map, key, value) => {
      if (!key || !value) return;
      if (!map.has(key)) map.set(key, new Set());
      map.get(key).add(value);
    };
    if (rel.relationship_type === 'uses') {
      if (techniquesById.has(rel.target_ref)) push(techniques, rel.source_ref, rel.target_ref);
      if (softwareById.has(rel.target_ref)) push(software, rel.source_ref, rel.target_ref);
      const cves = extractCves(rel.description);
      if (cves.length) {
        if (!relationshipCves.has(rel.source_ref)) relationshipCves.set(rel.source_ref, new Set());
        for (const cve of cves) relationshipCves.get(rel.source_ref).add(cve);
      }
    }
    if (rel.relationship_type === 'attributed-to' && groupsById.has(rel.target_ref)) {
      push(attributed, rel.source_ref, rel.target_ref);
    }
  }

  const usedSlugs = new Set();
  const slugFor = (name, mitreId) => {
    const base = slugify(name) || slugify(mitreId) || 'unknown';
    let slug = base;
    if (usedSlugs.has(slug)) slug = `${base}-${String(mitreId ?? '').toLowerCase()}`;
    let n = 2;
    while (usedSlugs.has(slug)) slug = `${base}-${n++}`;
    usedSlugs.add(slug);
    return slug;
  };

  const actors = groupsActive.map((group) => {
    const mitreId = externalId(group);
    const description = cleanMitreText(group.description);
    const techniqueRows = [...(techniques.get(group.id) ?? [])]
      .map((ref) => techniquesById.get(ref))
      .filter(Boolean);
    const softwareNames = [...(software.get(group.id) ?? [])]
      .map((ref) => softwareById.get(ref))
      .filter(Boolean);
    const cves = [...new Set([
      ...extractCves(group.description),
      ...(relationshipCves.get(group.id) ?? []),
    ])].slice(0, 40);
    return {
      id: mitreId || `group-${group.id.split('--')[1]}`,
      slug: slugFor(group.name, mitreId),
      name: cleanMitreText(group.name).slice(0, 160),
      aliases: aliasesOf(group),
      mitre_id: mitreId,
      mitre_url: mitreUrl(group) ?? (mitreId ? `https://attack.mitre.org/groups/${mitreId}` : null),
      motivation: deriveMotivation(`${group.description} ${(group.aliases ?? []).join(' ')}`),
      sectors: extractSectors(group.description),
      regions: extractRegions(group.description),
      summary: description.slice(0, 1600),
      techniques: techniqueRows
        .map((tech) => ({ id: tech.id, name: tech.name, tactic: tech.tactic }))
        .sort((a, b) => a.id.localeCompare(b.id)),
      software: [...new Set(softwareNames)].sort().slice(0, 80),
      cves,
      first_seen: isoDate(group.created),
      last_seen: isoDate(group.modified),
    };
  });

  const actorsByStix = new Map();
  for (const group of groupsActive) {
    const actor = actors.find((entry) => entry.id === externalId(group) || entry.id === `group-${group.id.split('--')[1]}`);
    if (actor) actorsByStix.set(group.id, actor);
  }

  const campaigns = campaignsActive.map((campaign) => {
    const mitreId = externalId(campaign);
    const techniqueRows = [...(techniques.get(campaign.id) ?? [])]
      .map((ref) => techniquesById.get(ref))
      .filter(Boolean);
    const softwareNames = [...(software.get(campaign.id) ?? [])]
      .map((ref) => softwareById.get(ref))
      .filter(Boolean);
    const actorSlugs = [...(attributed.get(campaign.id) ?? [])]
      .map((ref) => actorsByStix.get(ref)?.slug)
      .filter(Boolean);
    return {
      id: mitreId || `campaign-${campaign.id.split('--')[1]}`,
      slug: slugFor(campaign.name, mitreId),
      name: cleanMitreText(campaign.name).slice(0, 160),
      mitre_id: mitreId,
      mitre_url: mitreUrl(campaign) ?? (mitreId ? `https://attack.mitre.org/campaigns/${mitreId}` : null),
      summary: cleanMitreText(campaign.description).slice(0, 1600),
      actor_slugs: [...new Set(actorSlugs)],
      techniques: techniqueRows
        .map((tech) => ({ id: tech.id, name: tech.name, tactic: tech.tactic }))
        .sort((a, b) => a.id.localeCompare(b.id)),
      software: [...new Set(softwareNames)].sort().slice(0, 80),
      cves: [...new Set([
        ...extractCves(campaign.description),
        ...(relationshipCves.get(campaign.id) ?? []),
      ])].slice(0, 40),
      sectors: extractSectors(campaign.description),
      regions: extractRegions(campaign.description),
      first_seen: isoDate(campaign.created),
      last_seen: isoDate(campaign.modified),
    };
  });

  return { actors, campaigns };
}

export function buildSeedSql({ actors, campaigns }) {
  const lines = [
    '-- Generated by tools/seed-mitre-threat-graph.mjs — MITRE ATT&CK Enterprise.',
    '-- Idempotent: INSERT OR REPLACE keyed on the MITRE id. Do not hand-edit.',
    '',
  ];
  for (const actor of actors) {
    lines.push(
      `INSERT OR REPLACE INTO threat_actors (id, slug, name, aliases_json, mitre_id, mitre_url, motivation, target_sectors_json, target_regions_json, summary, techniques_json, software_json, cves_json, first_seen, last_seen, updated_at) VALUES (` +
      [
        sqlString(actor.id), sqlString(actor.slug), sqlString(actor.name), sqlJson(actor.aliases),
        sqlString(actor.mitre_id), sqlString(actor.mitre_url), sqlString(actor.motivation),
        sqlJson(actor.sectors), sqlJson(actor.regions), sqlString(actor.summary),
        sqlJson(actor.techniques), sqlJson(actor.software), sqlJson(actor.cves),
        sqlString(actor.first_seen), sqlString(actor.last_seen),
        `strftime('%Y-%m-%dT%H:%M:%SZ', 'now')`,
      ].join(', ') + ');',
    );
    // Explicit breakpoint as well as the terminator: wrangler splits on both, and
    // `sqlString` has already removed any semicolon from a MITRE narrative.
    lines.push('--> statement-breakpoint');
  }
  for (const campaign of campaigns) {
    lines.push(
      `INSERT OR REPLACE INTO threat_campaigns (id, slug, name, mitre_id, mitre_url, summary, actor_slugs_json, techniques_json, software_json, cves_json, target_sectors_json, target_regions_json, first_seen, last_seen, updated_at) VALUES (` +
      [
        sqlString(campaign.id), sqlString(campaign.slug), sqlString(campaign.name),
        sqlString(campaign.mitre_id), sqlString(campaign.mitre_url), sqlString(campaign.summary),
        sqlJson(campaign.actor_slugs), sqlJson(campaign.techniques), sqlJson(campaign.software),
        sqlJson(campaign.cves), sqlJson(campaign.sectors), sqlJson(campaign.regions),
        sqlString(campaign.first_seen), sqlString(campaign.last_seen),
        `strftime('%Y-%m-%dT%H:%M:%SZ', 'now')`,
      ].join(', ') + ');',
    );
    lines.push('--> statement-breakpoint');
  }
  lines.push('');
  return lines.join('\n');
}

function main() {
  const args = process.argv.slice(2);
  const outArg = args.find((arg) => arg.startsWith('--out='));
  const out = outArg ? outArg.slice('--out='.length) : DEFAULT_OUT;
  if (!fs.existsSync(BUNDLE)) {
    console.error(`[seed-mitre] bundle not found: ${BUNDLE}`);
    process.exit(1);
  }
  const bundle = JSON.parse(fs.readFileSync(BUNDLE, 'utf8'));
  const graph = extractThreatGraph(bundle);

  const citationLeaks = [...graph.actors, ...graph.campaigns]
    .filter((row) => /\(Citation:/i.test(row.summary) || /\]\(https?:/i.test(row.summary)).length;
  const techniqueCount = graph.actors.reduce((sum, actor) => sum + actor.techniques.length, 0);
  const report = {
    actors: graph.actors.length,
    campaigns: graph.campaigns.length,
    withTechniques: graph.actors.filter((actor) => actor.techniques.length > 0).length,
    totalActorTechniques: techniqueCount,
    withSoftware: graph.actors.filter((actor) => actor.software.length > 0).length,
    withCves: graph.actors.filter((actor) => actor.cves.length > 0).length,
    attributedCampaigns: graph.campaigns.filter((campaign) => campaign.actor_slugs.length > 0).length,
    citationLeaks,
  };
  console.log(JSON.stringify(report, null, 2));

  if (args.includes('--check')) {
    process.exit(citationLeaks === 0 && graph.actors.length >= 140 ? 0 : 1);
  }
  if (citationLeaks > 0) {
    console.error('[seed-mitre] refusing to write: citation leakage detected');
    process.exit(1);
  }

  const sql = buildSeedSql(graph);
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, sql, 'utf8');
  console.log(JSON.stringify({ out, bytes: Buffer.byteLength(sql) }));
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}
