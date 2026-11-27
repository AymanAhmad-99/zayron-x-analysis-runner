/**
 * PHASE 8C — CONNECTED THREAT GRAPH (`/api/v1/threat-actors`, `/api/v1/campaigns`).
 *
 * MITRE ATT&CK supplies the canonical profile: names, aliases, techniques,
 * linked software and documented CVEs. Live correlation is computed at read time
 * from rows this platform actually stores:
 *   · `iocs`            — active indicators per malware family (the C2 corpus);
 *   · `vulnerabilities` — CISA KEV membership and advisory identity;
 *   · `cve_pocs`        — verified public proof-of-concept repositories.
 *
 * The two-tier contract is a statement about stored facts, never an inference:
 *   LIVE_OBSERVED     → ≥1 active indicator for a documented software family, or
 *                       ≥1 linked CVE that is KEV-listed / has a public PoC.
 *   CANONICAL_PROFILE → the authoritative MITRE profile with no live footprint
 *                       in this store today. The UI says exactly that.
 *
 * Pure functions here (classification, sorting, Navigator export, hunting query
 * generation) are unit-tested without D1.
 */

export const ACTIVITY_TIERS = ['LIVE_OBSERVED', 'CANONICAL_PROFILE'] as const;
export type ActivityTier = (typeof ACTIVITY_TIERS)[number];

export const THREAT_ACTOR_DEFAULT_LIMIT = 50;
export const THREAT_ACTOR_MAX_LIMIT = 200;
export const CAMPAIGN_DEFAULT_LIMIT = 50;
export const CAMPAIGN_MAX_LIMIT = 100;

/** Every new technique is exported in the ZAYRON-X accent colour. */
export const NAVIGATOR_COLOR = '#FF4D00';
export const NAVIGATOR_VERSION = '4.5';
export const NAVIGATOR_DOMAIN = 'enterprise-attack';

export interface TechniqueRef {
  id: string;
  name: string;
  tactic: string;
}

export interface LiveFamily {
  family: string;
  slug: string;
  active_count: number;
}

export interface LinkedCve {
  cve_id: string;
  kev: boolean;
  due_date: string | null;
  /** True only when `vulnerabilities` holds a public row for this CVE. */
  in_catalog?: boolean;
  /** True when a verified public PoC repository is stored for this CVE. */
  has_poc?: boolean;
}

export interface StoredThreatActor {
  id?: unknown;
  slug?: unknown;
  name?: unknown;
  aliases_json?: unknown;
  mitre_id?: unknown;
  mitre_url?: unknown;
  motivation?: unknown;
  target_sectors_json?: unknown;
  target_regions_json?: unknown;
  summary?: unknown;
  techniques_json?: unknown;
  software_json?: unknown;
  cves_json?: unknown;
  first_seen?: unknown;
  last_seen?: unknown;
}

export interface StoredCampaign {
  id?: unknown;
  slug?: unknown;
  name?: unknown;
  mitre_id?: unknown;
  mitre_url?: unknown;
  summary?: unknown;
  actor_slugs_json?: unknown;
  techniques_json?: unknown;
  software_json?: unknown;
  cves_json?: unknown;
  target_sectors_json?: unknown;
  target_regions_json?: unknown;
  first_seen?: unknown;
  last_seen?: unknown;
}

export interface ThreatActorItem {
  id: string;
  slug: string;
  name: string;
  aliases: string[];
  mitre_id: string | null;
  mitre_url: string | null;
  motivation: string;
  target_sectors: string[];
  target_regions: string[];
  summary: string;
  technique_count: number;
  software: string[];
  campaign_count: number;
  activity_tier: ActivityTier;
  live_c2_count: number;
  live_malware_families: LiveFamily[];
  linked_kev_count: number;
  linked_cve_count: number;
  /** CVEs this platform can speak to (catalog row, KEV or PoC). */
  linked_cves: LinkedCve[];
  /** Every CVE MITRE documents for the actor, each flagged with catalog state. */
  documented_cves: LinkedCve[];
  first_seen: string | null;
  last_seen: string | null;
}

export interface ThreatActorSummary {
  total_actors: number;
  live_observed: number;
  canonical_profiles: number;
  total_campaigns: number;
  mapped_techniques: number;
  live_families: number;
  kev_linked_actors: number;
}

export interface CampaignActorRef {
  slug: string;
  name: string;
  mitre_id: string | null;
  activity_tier: ActivityTier;
}

export interface CampaignItem {
  id: string;
  slug: string;
  name: string;
  mitre_id: string | null;
  mitre_url: string | null;
  summary: string;
  actors: CampaignActorRef[];
  technique_count: number;
  software: string[];
  cves: string[];
  target_sectors: string[];
  target_regions: string[];
  activity_tier: ActivityTier;
  linked_kev_count: number;
  /** Every CVE MITRE documents for the campaign, each flagged with catalog state. */
  documented_cves: LinkedCve[];
  first_seen: string | null;
  last_seen: string | null;
}

/* ── shared, dependency-free helpers ────────────────────────────────────── */

/** Strip MITRE citation markers and markdown syntax. Mirrors the local seeder. */
export function cleanMitreText(input: unknown): string {
  let text = String(input ?? '');
  text = text.replace(/\(Citation:[^)]*\)/g, '');
  text = text.replace(/\[([^\]]+)\]\((?:https?:\/\/)[^)]*\)/g, '$1');
  text = text.replace(/\[([^\]]+)\]\[\d+\]/g, '$1');
  text = text.replace(/\[\d+\]/g, '');
  text = text.replace(/[*_`]{1,3}([^*_`]+)[*_`]{1,3}/g, '$1');
  text = text.replace(/https?:\/\/\S+/g, '');
  // A removed citation leaves a floating space before punctuation.
  return text.replace(/\s+/g, ' ').replace(/\s+([.,;:])/g, '$1').trim();
}

export function actorSlug(value: unknown): string {
  return String(value ?? '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

function parseArray<T>(raw: unknown, map: (value: unknown) => T | null): T[] {
  let parsed: unknown = raw;
  if (typeof raw === 'string') {
    try {
      parsed = JSON.parse(raw);
    } catch {
      return [];
    }
  }
  if (!Array.isArray(parsed)) return [];
  return parsed.map(map).filter((value): value is T => value !== null);
}

export function parseTechniques(raw: unknown): TechniqueRef[] {
  return parseArray(raw, (entry) => {
    const row = entry as Record<string, unknown> | null;
    const id = typeof row?.id === 'string' ? row.id.trim().toUpperCase() : '';
    if (!/^T\d{4}(?:\.\d{3})?$/.test(id)) return null;
    return {
      id,
      name: cleanMitreText(row?.name).slice(0, 200) || id,
      tactic: String(row?.tactic ?? 'unmapped').trim().toLowerCase() || 'unmapped',
    };
  });
}

export function parseStringArray(raw: unknown, max = 80): string[] {
  return parseArray(raw, (entry) => {
    const value = typeof entry === 'string' ? entry.trim() : '';
    return value ? value.slice(0, 120) : null;
  }).slice(0, max);
}

export function normaliseFamily(value: unknown): string {
  return String(value ?? '').toLowerCase().replace(/[^a-z0-9]/g, '');
}

const FAMILY_MIN_LENGTH = 4;

/**
 * A documented software name matches a live family only when the two normalised
 * tokens agree, or one names the other ("Cobalt Strike" ↔ "CobaltStrike C2").
 * Short tokens are never matched — "Go" is a language, not a family.
 */
export function familyMatches(software: string, family: string): boolean {
  const a = normaliseFamily(software);
  const b = normaliseFamily(family);
  if (a.length < FAMILY_MIN_LENGTH || b.length < FAMILY_MIN_LENGTH) return false;
  if (a === b) return true;
  return a.includes(b) || b.includes(a);
}

function clampInt(value: unknown, fallback: number, min: number, max: number): number {
  const parsed = Math.floor(Number(value));
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, parsed));
}

function tierOf(liveC2: number, kevCount: number, pocCount: number): ActivityTier {
  return liveC2 > 0 || kevCount > 0 || pocCount > 0 ? 'LIVE_OBSERVED' : 'CANONICAL_PROFILE';
}

/* ── actor classification ───────────────────────────────────────────────── */

export function classifyThreatActor(
  row: StoredThreatActor,
  context: {
    families?: LiveFamily[];
    cves?: LinkedCve[];
    pocCves?: Set<string>;
    campaignCounts?: Map<string, number>;
    catalogCves?: Set<string>;
  } = {},
): ThreatActorItem | null {
  const slug = String(row?.slug ?? '').trim();
  const name = cleanMitreText(row?.name);
  if (!slug || !name) return null;

  const software = parseStringArray(row?.software_json, 80);
  const documentedCves = parseStringArray(row?.cves_json, 40).map((cve) => cve.toUpperCase());
  const techniques = parseTechniques(row?.techniques_json);

  const families = (context.families ?? []).filter((family) =>
    software.some((entry) => familyMatches(entry, family.family)),
  );
  const liveC2 = families.reduce((sum, family) => sum + Math.max(0, family.active_count), 0);

  const liveCveMap = new Map((context.cves ?? []).map((cve) => [cve.cve_id.toUpperCase(), cve]));
  const catalogCves = context.catalogCves;
  // PHASE 9A (F1) — every documented CVE keeps its catalog verdict so a dossier
  // can link internally only when a public page actually exists.
  const documented: LinkedCve[] = documentedCves.map((cve) => {
    const live = liveCveMap.get(cve);
    const inCatalog = live !== undefined || Boolean(catalogCves?.has(cve));
    const hasPoc = Boolean(context.pocCves?.has(cve));
    return {
      cve_id: cve,
      kev: Boolean(live?.kev),
      due_date: live?.due_date ?? null,
      in_catalog: inCatalog,
      has_poc: hasPoc,
    };
  });
  const linkedCves = documented
    .filter((cve) => cve.in_catalog || cve.kev || cve.has_poc)
    .sort((a, b) => Number(b.kev) - Number(a.kev) || a.cve_id.localeCompare(b.cve_id))
    .slice(0, 40);
  const linkedKev = linkedCves.filter((cve) => cve.kev).length;
  const publicPoc = linkedCves.filter((cve) => !cve.kev && context.pocCves?.has(cve.cve_id)).length;

  return {
    id: String(row?.id ?? slug),
    slug,
    name,
    aliases: parseStringArray(row?.aliases_json, 24),
    mitre_id: typeof row?.mitre_id === 'string' ? row.mitre_id : null,
    mitre_url: typeof row?.mitre_url === 'string' ? row.mitre_url : null,
    motivation: cleanMitreText(row?.motivation) || 'Unattributed / Mixed',
    target_sectors: parseStringArray(row?.target_sectors_json, 12),
    target_regions: parseStringArray(row?.target_regions_json, 12),
    summary: cleanMitreText(row?.summary).slice(0, 1600),
    technique_count: techniques.length,
    software,
    campaign_count: context.campaignCounts?.get(slug) ?? 0,
    activity_tier: tierOf(liveC2, linkedKev, publicPoc),
    live_c2_count: liveC2,
    live_malware_families: families.slice(0, 12),
    linked_kev_count: linkedKev,
    linked_cve_count: linkedCves.length,
    linked_cves: linkedCves,
    documented_cves: documented.slice(0, 40),
    first_seen: typeof row?.first_seen === 'string' ? row.first_seen : null,
    last_seen: typeof row?.last_seen === 'string' ? row.last_seen : null,
  };
}

export interface ThreatActorQuery {
  q?: string | null;
  sector?: string | null;
  region?: string | null;
  tier?: string | null;
  limit?: number | string | null;
  offset?: number | string | null;
}

function scoreLive(item: ThreatActorItem): number {
  return item.live_c2_count + item.linked_kev_count * 100 + item.campaign_count * 10 + item.technique_count;
}

/** Ranking: live-observed telemetry first, then the richest canonical profile. */
export function buildThreatActorIndex(
  rows: StoredThreatActor[],
  context: {
    families?: LiveFamily[];
    cves?: LinkedCve[];
    pocCves?: Set<string>;
    campaignCounts?: Map<string, number>;
    campaignSlugsByActor?: Map<string, string[]>;
  } = {},
  params: ThreatActorQuery = {},
): { summary: ThreatActorSummary; items: ThreatActorItem[]; meta: { total: number; limit: number; offset: number; tier: string } } {
  const all = (Array.isArray(rows) ? rows : [])
    .map((row) => classifyThreatActor(row, context))
    .filter((item): item is ThreatActorItem => Boolean(item));

  const totalCampaigns = new Set(
    [...(context.campaignSlugsByActor?.values() ?? [])].flat(),
  ).size;

  const summary: ThreatActorSummary = {
    total_actors: all.length,
    live_observed: all.filter((item) => item.activity_tier === 'LIVE_OBSERVED').length,
    canonical_profiles: all.filter((item) => item.activity_tier === 'CANONICAL_PROFILE').length,
    total_campaigns: totalCampaigns,
    mapped_techniques: new Set(
      all.flatMap((item) => parseTechniques(rows.find((row) => String((row as StoredThreatActor)?.slug) === item.slug)?.techniques_json).map((tech) => tech.id)),
    ).size,
    live_families: (context.families ?? []).length,
    kev_linked_actors: all.filter((item) => item.linked_kev_count > 0).length,
  };

  const requestedTier = String(params.tier ?? 'all').trim().toLowerCase();
  const tier: 'all' | 'live' | 'canonical' =
    requestedTier === 'live' || requestedTier === 'live_observed'
      ? 'live'
      : requestedTier === 'canonical' || requestedTier === 'canonical_profile'
        ? 'canonical'
        : 'all';
  const needle = String(params.q ?? '').trim().toLowerCase();
  const sector = String(params.sector ?? '').trim().toLowerCase();
  const region = String(params.region ?? '').trim().toLowerCase();

  const filtered = all
    .filter((item) => {
      if (tier === 'live' && item.activity_tier !== 'LIVE_OBSERVED') return false;
      if (tier === 'canonical' && item.activity_tier !== 'CANONICAL_PROFILE') return false;
      if (sector && !item.target_sectors.some((entry) => entry.toLowerCase().includes(sector))) return false;
      if (region && !item.target_regions.some((entry) => entry.toLowerCase().includes(region))) return false;
      if (!needle) return true;
      // Alias search is the point: "Cozy Bear" must find APT29.
      return `${item.name} ${item.slug} ${item.mitre_id ?? ''} ${item.aliases.join(' ')} ${item.software.join(' ')}`
        .toLowerCase()
        .includes(needle);
    })
    .sort((a, b) => {
      if (a.activity_tier !== b.activity_tier) return a.activity_tier === 'LIVE_OBSERVED' ? -1 : 1;
      return scoreLive(b) - scoreLive(a) || a.name.localeCompare(b.name);
    });

  const limit = clampInt(params.limit ?? THREAT_ACTOR_DEFAULT_LIMIT, THREAT_ACTOR_DEFAULT_LIMIT, 1, THREAT_ACTOR_MAX_LIMIT);
  const offset = clampInt(params.offset ?? 0, 0, 0, Number.MAX_SAFE_INTEGER);

  return {
    summary,
    items: filtered.slice(offset, offset + limit),
    meta: { total: filtered.length, limit, offset, tier },
  };
}

/* ── campaign classification ────────────────────────────────────────────── */

export function classifyCampaign(
  row: StoredCampaign,
  actors: ThreatActorItem[],
  liveCves: LinkedCve[] = [],
  catalogCves: Set<string> = new Set(),
): CampaignItem | null {
  const slug = String(row?.slug ?? '').trim();
  const name = cleanMitreText(row?.name);
  if (!slug || !name) return null;
  const bySlug = new Map(actors.map((actor) => [actor.slug, actor]));
  const actorSlugs = parseStringArray(row?.actor_slugs_json, 12);
  const resolved = actorSlugs
    .map((actorSlug) => bySlug.get(actorSlug))
    .filter((actor): actor is ThreatActorItem => Boolean(actor))
    .map((actor) => ({
      slug: actor.slug,
      name: actor.name,
      mitre_id: actor.mitre_id,
      activity_tier: actor.activity_tier,
    }));
  const cves = parseStringArray(row?.cves_json, 40).map((cve) => cve.toUpperCase());
  const kevSet = new Set(liveCves.filter((cve) => cve.kev).map((cve) => cve.cve_id.toUpperCase()));
  const liveMap = new Map(liveCves.map((cve) => [cve.cve_id.toUpperCase(), cve]));
  const documentedCves: LinkedCve[] = cves.map((cve) => ({
    cve_id: cve,
    kev: kevSet.has(cve),
    due_date: liveMap.get(cve)?.due_date ?? null,
    in_catalog: liveMap.has(cve) || catalogCves.has(cve),
    has_poc: Boolean(liveMap.get(cve)?.has_poc),
  }));
  const linkedKev = cves.filter((cve) => kevSet.has(cve)).length;
  const actorLive = resolved.some((actor) => actor.activity_tier === 'LIVE_OBSERVED');
  return {
    id: String(row?.id ?? slug),
    slug,
    name,
    mitre_id: typeof row?.mitre_id === 'string' ? row.mitre_id : null,
    mitre_url: typeof row?.mitre_url === 'string' ? row.mitre_url : null,
    summary: cleanMitreText(row?.summary).slice(0, 1600),
    actors: resolved,
    technique_count: parseTechniques(row?.techniques_json).length,
    software: parseStringArray(row?.software_json, 60),
    cves,
    target_sectors: parseStringArray(row?.target_sectors_json, 12),
    target_regions: parseStringArray(row?.target_regions_json, 12),
    activity_tier: actorLive || linkedKev > 0 ? 'LIVE_OBSERVED' : 'CANONICAL_PROFILE',
    linked_kev_count: linkedKev,
    documented_cves: documentedCves,
    first_seen: typeof row?.first_seen === 'string' ? row.first_seen : null,
    last_seen: typeof row?.last_seen === 'string' ? row.last_seen : null,
  };
}

export function buildCampaignIndex(
  rows: StoredCampaign[],
  actors: ThreatActorItem[],
  liveCves: LinkedCve[] = [],
  params: { q?: string | null; actor?: string | null; sector?: string | null; limit?: number | string | null; offset?: number | string | null } = {},
  catalogCves: Set<string> = new Set(),
): { items: CampaignItem[]; meta: { total: number; limit: number; offset: number } } {
  const all = (Array.isArray(rows) ? rows : [])
    .map((row) => classifyCampaign(row, actors, liveCves, catalogCves))
    .filter((item): item is CampaignItem => Boolean(item));
  const needle = String(params.q ?? '').trim().toLowerCase();
  const actor = String(params.actor ?? '').trim().toLowerCase();
  const sector = String(params.sector ?? '').trim().toLowerCase();

  const filtered = all
    .filter((item) => {
      if (actor && !item.actors.some((entry) => entry.slug === actor)) return false;
      if (sector && !item.target_sectors.some((entry) => entry.toLowerCase().includes(sector))) return false;
      if (!needle) return true;
      return `${item.name} ${item.slug} ${item.mitre_id ?? ''} ${item.software.join(' ')} ${item.actors.map((entry) => entry.name).join(' ')}`
        .toLowerCase()
        .includes(needle);
    })
    .sort((a, b) => {
      if (a.activity_tier !== b.activity_tier) return a.activity_tier === 'LIVE_OBSERVED' ? -1 : 1;
      return b.technique_count - a.technique_count || a.name.localeCompare(b.name);
    });
  const limit = clampInt(params.limit ?? CAMPAIGN_DEFAULT_LIMIT, CAMPAIGN_DEFAULT_LIMIT, 1, CAMPAIGN_MAX_LIMIT);
  const offset = clampInt(params.offset ?? 0, 0, 0, Number.MAX_SAFE_INTEGER);
  return { items: filtered.slice(offset, offset + limit), meta: { total: filtered.length, limit, offset } };
}

/* ── ATT&CK Navigator export + hunting queries ─────────────────────────── */

/**
 * A valid ATT&CK Navigator layer (version 4.5, enterprise-attack). One entry per
 * technique/tactic pair, scored 1 and coloured in the ZAYRON-X accent.
 * Campaign and group layers have no `tactic` column, so the tactic travels in the
 * comment; Navigator accepts and ignores it there.
 */
export function buildNavigatorLayer(input: {
  name: string;
  slug: string;
  description: string;
  techniques: TechniqueRef[];
  generatedAt?: string;
}): Record<string, unknown> {
  const seen = new Set<string>();
  const techniques: Array<Record<string, unknown>> = [];
  for (const technique of [...input.techniques].sort((a, b) => a.id.localeCompare(b.id))) {
    const key = `${technique.id}::${technique.tactic}`;
    if (seen.has(key)) continue;
    seen.add(key);
    techniques.push({
      techniqueID: technique.id,
      score: 1,
      color: NAVIGATOR_COLOR,
      comment: `${technique.name} — documented by MITRE ATT&CK (${technique.tactic})`,
      enabled: true,
      metadata: [{ name: 'tactic', value: technique.tactic }],
    });
  }
  return {
    name: input.name,
    versions: { attack: '16', navigator: '4.9.0', layer: NAVIGATOR_VERSION },
    domain: NAVIGATOR_DOMAIN,
    description: `${input.description} Generated by ZAYRON-X from MITRE ATT&CK Enterprise. ${techniques.length} documented technique${techniques.length === 1 ? '' : 's'}.`,
    sorting: 0,
    layout: { layout: 'side', aggregateFunction: 'average', showID: true, showName: true, showAggregateScores: false, countUnscored: false },
    hideDisabled: false,
    techniques,
    gradient: { colors: ['#ffffff', NAVIGATOR_COLOR], minValue: 0, maxValue: 1 },
    legendItems: [
      { label: 'Documented by MITRE ATT&CK for this entity', color: NAVIGATOR_COLOR },
    ],
    metadata: [
      { name: 'source', value: 'MITRE ATT&CK Enterprise' },
      { name: 'generator', value: 'ZAYRON-X Connected Threat Graph' },
      { name: 'slug', value: input.slug },
      { name: 'generated_at', value: input.generatedAt ?? new Date().toISOString() },
    ],
    links: [],
    selectTechniquesAcrossTactics: true,
  };
}

function kqlLiteral(value: string): string {
  return `"${value.replace(/"/g, '""')}"`;
}

function splLiteral(value: string): string {
  return `"${value.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
}

/**
 * Deterministic hunting artifacts from the entity's documented software and
 * techniques. No indicator, host or hash is invented: only MITRE's own names are
 * used, and nothing here is executable against a live host by itself.
 */
export function buildHuntingQueries(input: {
  name: string;
  software: string[];
  techniques: TechniqueRef[];
}): { kql: string; spl: string; note: string } {
  const software = input.software.slice(0, 12);
  const techniqueIds = [...new Set(input.techniques.map((tech) => tech.id))].slice(0, 24);
  const kql = software.length
    ? [
        '// KQL — Microsoft Defender XDR / Sentinel',
        `// Entity: ${input.name}`,
        'DeviceProcessEvents',
        '| where TimeGenerated > ago(30d)',
        `| where ProcessCommandLine has_any (${software.map(kqlLiteral).join(', ')})`,
        '| summarize Executions = count(), FirstSeen = min(TimeGenerated), LastSeen = max(TimeGenerated)',
        '    by DeviceName, AccountName, FileName, ProcessCommandLine',
        '| order by LastSeen desc',
        `// Documented ATT&CK techniques: ${techniqueIds.join(', ') || 'none mapped'}`,
      ].join('\n')
    : [
        '// KQL — no documented software is mapped to this entity in MITRE ATT&CK.',
        `// Review the ${techniqueIds.length} documented technique(s) before authoring a query.`,
        '// ZAYRON-X never emits a hunting query without a documented capability to hunt.',
      ].join('\n');

  const spl = software.length
    ? [
        '```spl',
        `| Entity: ${input.name}`,
        `index=* (Process_Command_Line IN (${software.map(splLiteral).join(', ')})) earliest=-30d`,
        '| stats count min(_time) as firstSeen max(_time) as lastSeen by host, user, process_name, Process_Command_Line',
        `| sort - lastSeen`,
        `| Documented ATT&CK techniques: ${techniqueIds.join(', ') || 'none mapped'}`,
        '```',
      ].join('\n')
    : [
        '```spl',
        '| No documented software is mapped to this entity in MITRE ATT&CK.',
        '| ZAYRON-X never emits a hunting query without a documented capability to hunt.',
        '```',
      ].join('\n');

  return {
    kql,
    spl,
    note: 'Generated from MITRE ATT&CK documented software names only. Validate against your own telemetry before deployment.',
  };
}

export function groupTechniquesByTactic(techniques: TechniqueRef[]): Array<{ tactic: string; techniques: TechniqueRef[] }> {
  const groups = new Map<string, TechniqueRef[]>();
  for (const technique of techniques) {
    const key = technique.tactic || 'unmapped';
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(technique);
  }
  return [...groups.entries()]
    .map(([tactic, rows]) => ({
      tactic,
      techniques: rows.sort((a, b) => a.id.localeCompare(b.id)),
    }))
    .sort((a, b) => a.tactic.localeCompare(b.tactic));
}

/* ── D1 reads ───────────────────────────────────────────────────────────── */

export const THREAT_ACTORS_SQL = `SELECT * FROM threat_actors ORDER BY name ASC LIMIT 500`;
export const THREAT_ACTOR_SQL = `SELECT * FROM threat_actors WHERE slug = ? OR mitre_id = ? OR id = ? LIMIT 1`;
/**
 * The canonical MITRE catalog. Production's legacy `campaigns` table has a
 * different shape and its own readers, so the threat graph never queries it.
 */
export const CAMPAIGNS_SQL = `SELECT * FROM threat_campaigns ORDER BY name ASC LIMIT 200`;
export const CAMPAIGN_SQL = `SELECT * FROM threat_campaigns WHERE slug = ? OR mitre_id = ? OR id = ? LIMIT 1`;
export const CAMPAIGNS_FOR_ACTOR_SQL = `SELECT * FROM threat_campaigns ORDER BY name ASC LIMIT 200`;

/** Active indicators per malware family — the live C2 corpus. */
export const LIVE_FAMILIES_SQL = `
  SELECT family, COUNT(*) AS active_count
    FROM iocs
   WHERE status = 'ACTIVE' AND COALESCE(family, '') <> ''
   GROUP BY family
   ORDER BY active_count DESC
   LIMIT 200`;

/** Only CVEs this platform can actually speak to: KEV, public PoC or a rule. */
export const LIVE_CVES_SQL = `
  SELECT v.cve_id, v.is_exploited_in_wild, v.kev_due_date
    FROM vulnerabilities v
   WHERE v.provenance_state = 'AUTHORITATIVE_VERIFIED'
     AND (
       v.is_exploited_in_wild = 1
       OR EXISTS (SELECT 1 FROM cve_pocs p WHERE p.cve_id = v.cve_id)
       OR EXISTS (SELECT 1 FROM detection_rules d WHERE d.kind = 'cve' AND d.match_key = v.cve_id)
     )
   ORDER BY v.cve_id ASC
   LIMIT 4000`;

export const LIVE_POC_CVES_SQL = `SELECT DISTINCT cve_id FROM cve_pocs LIMIT 4000`;

/**
 * PHASE 9A (F1) — every CVE that has a public advisory page. The dossier UI may
 * only link internally when a CVE is in this set.
 */
/**
 * PHASE 9C (P1-10) — the set of CVEs a dossier may link to INTERNALLY.
 *
 * This query previously selected every row in `vulnerabilities`, so a
 * `SYNTHETIC_UNVERIFIED` row (`CVE-2019-19781`, `CVE-2019-11510`, …) counted as
 * "in catalog" and the dossier emitted an internal link to a page the public
 * detail route deliberately 404s. The gate must be the SAME gate the detail
 * route uses: only `AUTHORITATIVE_VERIFIED` rows have a public page.
 */
export const CATALOG_CVE_IDS_SQL = `SELECT cve_id FROM vulnerabilities
   WHERE provenance_state = 'AUTHORITATIVE_VERIFIED'
     AND cve_id IS NOT NULL AND cve_id <> ''
   LIMIT 8000`;

export async function loadThreatActorContext(db: any): Promise<{
  families: LiveFamily[];
  cves: LinkedCve[];
  pocCves: Set<string>;
  catalogCves: Set<string>;
  campaignSlugsByActor: Map<string, string[]>;
  campaignCounts: Map<string, number>;
  campaignRows: StoredCampaign[];
}> {
  const [familyRows, cveRows, pocRows, campaignRows, catalogRows] = await Promise.all([
    db.prepare(LIVE_FAMILIES_SQL).all().catch(() => ({ results: [] })),
    db.prepare(LIVE_CVES_SQL).all().catch(() => ({ results: [] })),
    db.prepare(LIVE_POC_CVES_SQL).all().catch(() => ({ results: [] })),
    db.prepare(CAMPAIGNS_SQL).all().catch(() => ({ results: [] })),
    db.prepare(CATALOG_CVE_IDS_SQL).all().catch(() => ({ results: [] })),
  ]);
  const families: LiveFamily[] = ((familyRows?.results as Record<string, unknown>[]) ?? [])
    .map((row) => {
      const family = String(row.family ?? '').trim();
      const count = Math.max(0, Math.floor(Number(row.active_count) || 0));
      if (!family) return null;
      return { family, slug: actorSlug(family), active_count: count };
    })
    .filter((row): row is LiveFamily => Boolean(row));
  const cves: LinkedCve[] = ((cveRows?.results as Record<string, unknown>[]) ?? [])
    .map((row) => {
      const cve = String(row.cve_id ?? '').trim().toUpperCase();
      if (!/^CVE-\d{4}-\d{4,}$/.test(cve)) return null;
      return {
        cve_id: cve,
        kev: Number(row.is_exploited_in_wild ?? 0) === 1,
        due_date: typeof row.kev_due_date === 'string' ? row.kev_due_date : null,
      };
    })
    .filter((row): row is LinkedCve => Boolean(row));
  const pocCves = new Set(
    ((pocRows?.results as Record<string, unknown>[]) ?? [])
      .map((row) => String(row.cve_id ?? '').trim().toUpperCase())
      .filter(Boolean),
  );
  const campaigns = ((campaignRows?.results as StoredCampaign[]) ?? []).filter(Boolean);
  const catalogCves = new Set(
    ((catalogRows?.results as Record<string, unknown>[]) ?? [])
      .map((row) => String(row.cve_id ?? '').trim().toUpperCase())
      .filter(Boolean),
  );
  const campaignSlugsByActor = new Map<string, string[]>();
  const campaignCounts = new Map<string, number>();
  for (const campaign of campaigns) {
    const slug = String(campaign.slug ?? '');
    for (const actor of parseStringArray(campaign.actor_slugs_json, 12)) {
      if (!campaignSlugsByActor.has(actor)) campaignSlugsByActor.set(actor, []);
      campaignSlugsByActor.get(actor)!.push(slug);
      campaignCounts.set(actor, (campaignCounts.get(actor) ?? 0) + 1);
    }
  }
  return { families, cves, pocCves, catalogCves, campaignSlugsByActor, campaignCounts, campaignRows: campaigns };
}

export async function loadThreatActors(db: any, params: ThreatActorQuery = {}) {
  const context = await loadThreatActorContext(db);
  const rows = await db.prepare(THREAT_ACTORS_SQL).all();
  return buildThreatActorIndex((rows?.results as StoredThreatActor[]) ?? [], context, params);
}

export interface ThreatActorDossier {
  actor: ThreatActorItem;
  aliases: string[];
  techniques: TechniqueRef[];
  techniques_by_tactic: Array<{ tactic: string; techniques: TechniqueRef[] }>;
  campaigns: CampaignItem[];
  navigator: Record<string, unknown>;
  hunting: { kql: string; spl: string; note: string };
  diamond: {
    adversary: { name: string; aliases: string[]; mitre_id: string | null; motivation: string };
    capabilities: { technique_count: number; software: string[]; tactics: string[] };
    infrastructure: { live_c2_count: number; families: LiveFamily[] };
    victimology: { sectors: string[]; regions: string[] };
  };
}

export async function loadThreatActor(db: any, slug: string): Promise<ThreatActorDossier | null> {
  const row = await db.prepare(THREAT_ACTOR_SQL).bind(slug, slug.toUpperCase(), slug).first().catch(() => null);
  if (!row) return null;
  const context = await loadThreatActorContext(db);
  const actor = classifyThreatActor(row as StoredThreatActor, context);
  if (!actor) return null;
  const stored = row as StoredThreatActor;
  const techniques = parseTechniques(stored.techniques_json);
  const actorCampaigns = buildCampaignIndex(
    context.campaignRows.filter((campaign) => parseStringArray(campaign.actor_slugs_json, 12).includes(actor.slug)),
    [actor],
    context.cves,
    { limit: CAMPAIGN_MAX_LIMIT },
    context.catalogCves,
  ).items;
  const hunting = buildHuntingQueries({ name: actor.name, software: actor.software, techniques });
  return {
    actor,
    aliases: actor.aliases,
    techniques,
    techniques_by_tactic: groupTechniquesByTactic(techniques),
    campaigns: actorCampaigns,
    navigator: buildNavigatorLayer({
      name: `ZAYRON-X — ${actor.name}${actor.mitre_id ? ` (${actor.mitre_id})` : ''}`,
      slug: actor.slug,
      description: `MITRE ATT&CK techniques documented for ${actor.name}.`,
      techniques,
    }),
    hunting,
    diamond: {
      adversary: {
        name: actor.name,
        aliases: actor.aliases,
        mitre_id: actor.mitre_id,
        motivation: actor.motivation,
      },
      capabilities: {
        technique_count: techniques.length,
        software: actor.software,
        tactics: [...new Set(techniques.map((tech) => tech.tactic))].sort(),
      },
      infrastructure: { live_c2_count: actor.live_c2_count, families: actor.live_malware_families },
      victimology: { sectors: actor.target_sectors, regions: actor.target_regions },
    },
  };
}

export async function loadCampaigns(db: any, params: { q?: string | null; actor?: string | null; sector?: string | null; limit?: number | string | null; offset?: number | string | null } = {}) {
  const context = await loadThreatActorContext(db);
  const actorRows = await db.prepare(THREAT_ACTORS_SQL).all();
  const actors = buildThreatActorIndex((actorRows?.results as StoredThreatActor[]) ?? [], context, { limit: THREAT_ACTOR_MAX_LIMIT, tier: 'all' }).items;
  return buildCampaignIndex(context.campaignRows, actors, context.cves, params, context.catalogCves);
}

export interface CampaignDossier {
  campaign: CampaignItem;
  techniques: TechniqueRef[];
  techniques_by_tactic: Array<{ tactic: string; techniques: TechniqueRef[] }>;
  navigator: Record<string, unknown>;
  hunting: { kql: string; spl: string; note: string };
}

export async function loadCampaign(db: any, slug: string): Promise<CampaignDossier | null> {
  const row = await db.prepare(CAMPAIGN_SQL).bind(slug, slug.toUpperCase(), slug).first().catch(() => null);
  if (!row) return null;
  const context = await loadThreatActorContext(db);
  const actorRows = await db.prepare(THREAT_ACTORS_SQL).all();
  const actors = buildThreatActorIndex((actorRows?.results as StoredThreatActor[]) ?? [], context, { limit: THREAT_ACTOR_MAX_LIMIT }).items;
  const campaign = classifyCampaign(row as StoredCampaign, actors, context.cves, context.catalogCves);
  if (!campaign) return null;
  const techniques = parseTechniques((row as StoredCampaign).techniques_json);
  return {
    campaign,
    techniques,
    techniques_by_tactic: groupTechniquesByTactic(techniques),
    navigator: buildNavigatorLayer({
      name: `ZAYRON-X — ${campaign.name}${campaign.mitre_id ? ` (${campaign.mitre_id})` : ''}`,
      slug: campaign.slug,
      description: `MITRE ATT&CK techniques documented for the ${campaign.name} campaign.`,
      techniques,
    }),
    hunting: buildHuntingQueries({ name: campaign.name, software: campaign.software, techniques }),
  };
}
