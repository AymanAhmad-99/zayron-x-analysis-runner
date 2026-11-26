#!/usr/bin/env node
/**
 * PHASE 9A — deterministic `technique_edges` seeder.
 *
 * Reads the canonical MITRE rows from production D1 (`threat_actors`,
 * `threat_campaigns`), expands each `techniques_json` array into one edge per
 * (technique, entity), and writes them with INSERT OR REPLACE. No inference:
 * the technique id, name and tactic are exactly what MITRE documented.
 *
 * Usage:
 *   node tools/seed-technique-edges.mjs            # apply
 *   node tools/seed-technique-edges.mjs --dry-run  # print counts only
 *   node tools/seed-technique-edges.mjs --check    # validate without writing
 */

import { spawnSync } from 'node:child_process';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { extractSoftwareTechniqueEdges } from './lib/mitre-software-edges.mjs';

const WORKER_DIR = path.resolve('workers/api');
const DB = 'zayron-x-db';
const args = new Set(process.argv.slice(2));
const DRY = args.has('--dry-run') || args.has('--check');

function wranglerJson(sql) {
  const run = spawnSync(
    'npx',
    // Windows shell: the SQL must stay ONE argument.
    ['wrangler', 'd1', 'execute', DB, '--remote', '--json', '--command', `"${sql.replace(/"/g, '')}"`],
    { cwd: WORKER_DIR, encoding: 'utf-8', shell: true, maxBuffer: 64 * 1024 * 1024 },
  );
  if (run.status !== 0) {
    throw new Error(`wrangler failed: ${(run.stderr || run.stdout || '').slice(0, 400)}`);
  }
  const text = run.stdout.slice(run.stdout.indexOf('['));
  return JSON.parse(text)[0]?.results ?? [];
}

function parseTechniques(raw) {
  let parsed = raw;
  if (typeof raw === 'string') {
    try {
      parsed = JSON.parse(raw);
    } catch {
      return [];
    }
  }
  if (!Array.isArray(parsed)) return [];
  const out = [];
  for (const entry of parsed) {
    const id = String(entry?.id ?? '').trim().toUpperCase();
    if (!/^T\d{4}(?:\.\d{3})?$/.test(id)) continue;
    out.push({
      id,
      name: String(entry?.name ?? id).replace(/\s+/g, ' ').trim().slice(0, 200) || id,
      tactic: String(entry?.tactic ?? 'unmapped').trim().toLowerCase() || 'unmapped',
    });
  }
  return out;
}

const ACTORS = wranglerJson(
  'SELECT slug, name, techniques_json FROM threat_actors ORDER BY slug ASC LIMIT 500',
);
const CAMPAIGNS = wranglerJson(
  'SELECT slug, name, techniques_json FROM threat_campaigns ORDER BY slug ASC LIMIT 300',
);

const edges = new Map();
function add(entityType, entity, techniques) {
  for (const technique of techniques) {
    const key = `${technique.id}|${entityType}|${entity.slug}`;
    edges.set(key, {
      technique_id: technique.id,
      technique_name: technique.name,
      tactic: technique.tactic,
      entity_type: entityType,
      entity_slug: entity.slug,
      entity_name: entity.name,
    });
  }
}

for (const row of ACTORS) add('actor', row, parseTechniques(row.techniques_json));
for (const row of CAMPAIGNS) add('campaign', row, parseTechniques(row.techniques_json));

// PHASE 9B — the final 7x7 leg: documented MITRE `malware/tool uses
// attack-pattern` relationships, mapped onto the canonical D1 `malware.slug`.
// Only relationships MITRE published are stored; an unmatched family stays empty.
const MITRE_PATH = path.resolve('.zayron/knowledge/physical-15/09-mitre-attack.json');
const FAMILIES = wranglerJson('SELECT slug, name FROM malware ORDER BY slug ASC LIMIT 500');
const softwareSummary = { matched: [], unmatched: [], edges: 0 };
try {
  const bundle = JSON.parse(readFileSync(MITRE_PATH, 'utf-8'));
  const objects = Array.isArray(bundle?.objects) ? bundle.objects : bundle;
  const extracted = extractSoftwareTechniqueEdges(objects, FAMILIES);
  for (const edge of extracted.edges) {
    add('malware', { slug: edge.entity_slug, name: edge.entity_name }, [
      { id: edge.technique_id, name: edge.technique_name, tactic: edge.tactic },
    ]);
  }
  softwareSummary.matched = extracted.matched;
  softwareSummary.unmatched = extracted.unmatched;
  softwareSummary.edges = extracted.edges.length;
} catch (error) {
  console.error(`[seed-technique-edges] MITRE software extract failed: ${String(error?.message || error)}`);
  process.exit(1);
}

const rows = [...edges.values()];
const techniques = new Set(rows.map((row) => row.technique_id));
console.log(
  JSON.stringify(
    {
      actors: ACTORS.length,
      campaigns: CAMPAIGNS.length,
      edges: rows.length,
      distinct_techniques: techniques.size,
      actor_edges: rows.filter((row) => row.entity_type === 'actor').length,
      campaign_edges: rows.filter((row) => row.entity_type === 'campaign').length,
      malware_edges: rows.filter((row) => row.entity_type === 'malware').length,
      malware_software: softwareSummary.matched,
      malware_software_unmatched: softwareSummary.unmatched,
      dry_run: DRY,
    },
    null,
    2,
  ),
);

if (DRY) process.exit(0);

/** Keep the SQL free of `;` inside values: wrangler splits the file on every one. */
function q(value) {
  return `'${String(value).replace(/'/g, "''").replace(/;/g, ',')}'`;
}

const statements = rows.map(
  (row) =>
    `INSERT OR REPLACE INTO technique_edges (technique_id, technique_name, tactic, entity_type, entity_slug, entity_name) VALUES (${q(row.technique_id)}, ${q(row.technique_name)}, ${q(row.tactic)}, ${q(row.entity_type)}, ${q(row.entity_slug)}, ${q(row.entity_name)});`,
);

const dir = path.join(tmpdir(), 'zayron-phase9a');
mkdirSync(dir, { recursive: true });
const file = path.join(dir, 'technique_edges.sql');
writeFileSync(file, statements.join('\n'), 'utf-8');

const apply = spawnSync(
  'npx',
  ['wrangler', 'd1', 'execute', DB, '--remote', '--file', `"${file}"`],
  { cwd: WORKER_DIR, encoding: 'utf-8', shell: true, maxBuffer: 64 * 1024 * 1024 },
);
process.stdout.write(apply.stdout || '');
process.stderr.write(apply.stderr || '');
process.exit(apply.status ?? 1);
