/**
 * PHASE 9A — MITRE ATT&CK technique neural backbone.
 *
 * `technique_edges` is populated offline (`tools/seed-technique-edges.mjs`) from
 * the canonical `threat_actors` / `threat_campaigns` rows, so every runtime read
 * is an indexed lookup instead of a JSON scan. The rows are a statement about
 * stored MITRE facts, never an inference.
 */

export const TECHNIQUE_DEFAULT_LIMIT = 50;
export const TECHNIQUE_MAX_LIMIT = 500;
export const TECHNIQUE_MITRE_BASE = 'https://attack.mitre.org/techniques';

export interface TechniqueEdgeRow {
  technique_id?: unknown;
  technique_name?: unknown;
  tactic?: unknown;
  entity_type?: unknown;
  entity_slug?: unknown;
  entity_name?: unknown;
}

export interface TechniqueEntityRef {
  slug: string;
  name: string;
}

export interface TechniqueSummary {
  id: string;
  name: string;
  tactic: string;
  actor_count: number;
  campaign_count: number;
  entity_count: number;
}

export interface TechniqueDossier {
  id: string;
  name: string;
  tactic: string;
  mitre_url: string;
  actors: TechniqueEntityRef[];
  campaigns: TechniqueEntityRef[];
  malware_families: TechniqueEntityRef[];
  hunting: { kql: string; spl: string; note: string };
}

/** Runtime-safe technique id: `T1059`, `T1059.001`. */
export function normalizeTechniqueId(raw: unknown): string | null {
  const value = String(raw ?? '').trim().toUpperCase();
  return /^T\d{4}(?:\.\d{3})?$/.test(value) ? value : null;
}

/** ATT&CK's canonical URL. A sub-technique lives under its parent path. */
export function techniqueMitreUrl(id: string): string {
  const value = normalizeTechniqueId(id);
  if (!value) return TECHNIQUE_MITRE_BASE;
  return `${TECHNIQUE_MITRE_BASE}/${value.replace('.', '/')}`;
}

/**
 * A deterministic hunting starter. The technique id/name is the only input, so
 * the output is stable and testable — it is a starting query, never a claim that
 * the technique was observed in this environment.
 */
export function buildTechniqueHunting(input: { id: string; name: string; tactic: string }): {
  kql: string;
  spl: string;
  note: string;
} {
  const name = input.name.replace(/[`"]/g, '').trim() || input.id;
  const kql = [
    `// ${input.id} — ${name} (${input.tactic})`,
    'DeviceProcessEvents',
    '| where Timestamp > ago(30d)',
    '| summarize Events = count(), Hosts = dcount(DeviceId) by ProcessCommandLine, AccountName',
    '| where Events > 0',
    '| order by Events desc',
    '| take 100',
  ].join('\n');
  const spl = [
    `\`| tstats summariesonly=true count min(_time) as firstTime max(_time) as lastTime`,
    `  from datamodel=Endpoint.Processes where Processes.process_name=*`,
    `  by Processes.process_name Processes.process Processes.dest`,
    `| \`drop_dm_object_name(Processes)\``,
    `| sort - count`,
    `| head 100\``,
  ].join('\n');
  return {
    kql,
    spl,
    note: `${input.id} is a documented ATT&CK technique. Tune the process, command-line and time window to this environment before alerting.`,
  };
}

/** Collapse raw edge rows into one dossier, deterministic order. */
export function buildTechniqueDossier(
  id: string,
  rows: TechniqueEdgeRow[],
): TechniqueDossier | null {
  const techniqueId = normalizeTechniqueId(id);
  if (!techniqueId) return null;
  const relevant = (Array.isArray(rows) ? rows : []).filter(
    (row) => String(row?.technique_id ?? '').toUpperCase() === techniqueId,
  );
  if (relevant.length === 0) return null;

  const name = String(relevant[0]?.technique_name ?? techniqueId);
  const tactic = String(relevant[0]?.tactic ?? 'unmapped');
  const actors: TechniqueEntityRef[] = [];
  const campaigns: TechniqueEntityRef[] = [];
  const families: TechniqueEntityRef[] = [];
  const seen = new Set<string>();
  for (const row of relevant) {
    const slug = String(row?.entity_slug ?? '').trim();
    if (!slug) continue;
    const entityType = String(row?.entity_type ?? '');
    const key = `${entityType}:${slug}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const ref = { slug, name: String(row?.entity_name ?? slug) };
    if (entityType === 'actor') actors.push(ref);
    else if (entityType === 'campaign') campaigns.push(ref);
    else if (entityType === 'malware') families.push(ref);
  }
  const byName = (a: TechniqueEntityRef, b: TechniqueEntityRef) => a.name.localeCompare(b.name);
  actors.sort(byName);
  campaigns.sort(byName);
  families.sort(byName);
  return {
    id: techniqueId,
    name,
    tactic,
    mitre_url: techniqueMitreUrl(techniqueId),
    actors,
    campaigns,
    malware_families: families,
    hunting: buildTechniqueHunting({ id: techniqueId, name, tactic }),
  };
}

export const TECHNIQUE_EDGES_FOR_SQL = `SELECT technique_id, technique_name, tactic, entity_type, entity_slug, entity_name
   FROM technique_edges WHERE technique_id = ? ORDER BY entity_type ASC, entity_name ASC`;

export const TECHNIQUE_INDEX_SQL = `SELECT technique_id, MIN(technique_name) AS technique_name, MIN(tactic) AS tactic,
         SUM(CASE WHEN entity_type = 'actor' THEN 1 ELSE 0 END) AS actor_count,
         SUM(CASE WHEN entity_type = 'campaign' THEN 1 ELSE 0 END) AS campaign_count,
         COUNT(*) AS entity_count
    FROM technique_edges
   GROUP BY technique_id
   ORDER BY actor_count DESC, entity_count DESC, technique_id ASC
   LIMIT ?`;

export async function loadTechnique(db: any, rawId: string): Promise<TechniqueDossier | null> {
  const id = normalizeTechniqueId(rawId);
  if (!id) return null;
  const rows = await db.prepare(TECHNIQUE_EDGES_FOR_SQL).bind(id).all();
  return buildTechniqueDossier(id, (rows?.results as TechniqueEdgeRow[]) ?? []);
}

export async function loadTechniqueIndex(
  db: any,
  params: { q?: string | null; limit?: number | string | null } = {},
): Promise<{ items: TechniqueSummary[]; total: number }> {
  const requested = Math.floor(Number(params.limit));
  const limit = Number.isFinite(requested)
    ? Math.min(TECHNIQUE_MAX_LIMIT, Math.max(1, requested))
    : TECHNIQUE_DEFAULT_LIMIT;
  const rows = await db.prepare(TECHNIQUE_INDEX_SQL).bind(TECHNIQUE_MAX_LIMIT).all();
  const needle = String(params.q ?? '').trim().toLowerCase();
  const items = ((rows?.results as Record<string, unknown>[]) ?? [])
    .map((row) => {
      const id = normalizeTechniqueId(row.technique_id);
      if (!id) return null;
      return {
        id,
        name: String(row.technique_name ?? id),
        tactic: String(row.tactic ?? 'unmapped'),
        actor_count: Number(row.actor_count ?? 0) || 0,
        campaign_count: Number(row.campaign_count ?? 0) || 0,
        entity_count: Number(row.entity_count ?? 0) || 0,
      } satisfies TechniqueSummary;
    })
    .filter((row): row is TechniqueSummary => Boolean(row))
    .filter((row) =>
      !needle ? true : `${row.id} ${row.name} ${row.tactic}`.toLowerCase().includes(needle),
    );
  return { items: items.slice(0, limit), total: items.length };
}
