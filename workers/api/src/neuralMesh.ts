/**
 * PHASE 9A — the bidirectional neural mesh.
 *
 * Every function here answers one question with stored facts only:
 *   malware family → actors/campaigns that document it,
 *   CVE → actors/campaigns that reference it, its rules and radar state,
 *   IOC family → its hub and the actors behind it.
 *
 * Rows are small (185 actors, 56 campaigns), and each lookup is a bounded read.
 */

import { familyMatches, parseStringArray } from './threatGraph';

export interface MeshEntityRef {
  slug: string;
  name: string;
  mitre_id: string | null;
}

export interface MeshDetectionRule {
  id: string;
  kind: string;
  title: string;
  source_url: string;
  severity: string | null;
  source: string;
}

export interface FamilyAttribution {
  family: string;
  family_slug: string;
  actors: MeshEntityRef[];
  campaigns: MeshEntityRef[];
  total_linked_actors: number;
}

export interface CveMeshLinks {
  cve_id: string;
  actors: MeshEntityRef[];
  campaigns: MeshEntityRef[];
  detection_rules: MeshDetectionRule[];
  in_exploit_radar: boolean;
  kev: boolean;
  has_poc: boolean;
}

interface ActorRow {
  slug?: unknown;
  name?: unknown;
  mitre_id?: unknown;
  software_json?: unknown;
  cves_json?: unknown;
}

interface CampaignRow {
  slug?: unknown;
  name?: unknown;
  mitre_id?: unknown;
  software_json?: unknown;
  cves_json?: unknown;
}

function ref(row: ActorRow | CampaignRow): MeshEntityRef | null {
  const slug = String(row?.slug ?? '').trim();
  if (!slug) return null;
  return {
    slug,
    name: String(row?.name ?? slug),
    mitre_id: typeof row?.mitre_id === 'string' ? row.mitre_id : null,
  };
}

const ACTOR_MESH_SQL = `SELECT slug, name, mitre_id, software_json, cves_json FROM threat_actors ORDER BY name ASC LIMIT 500`;
const CAMPAIGN_MESH_SQL = `SELECT slug, name, mitre_id, software_json, cves_json FROM threat_campaigns ORDER BY name ASC LIMIT 300`;

/**
 * Family attribution. `family` is the display name (e.g. `Cobalt Strike`) and
 * `familySlug` the hub slug. Matching is the shared `familyMatches` rule, so a
 * short token such as `Go` can never attribute an actor.
 */
export async function loadFamilyAttribution(
  db: any,
  family: string,
  familySlug: string,
): Promise<FamilyAttribution> {
  const [actorRows, campaignRows] = await Promise.all([
    db.prepare(ACTOR_MESH_SQL).all().catch(() => ({ results: [] })),
    db.prepare(CAMPAIGN_MESH_SQL).all().catch(() => ({ results: [] })),
  ]);
  const actors = ((actorRows?.results as ActorRow[]) ?? [])
    .filter((row) =>
      parseStringArray(row.software_json, 80).some((entry) => familyMatches(entry, family)),
    )
    .map(ref)
    .filter((row): row is MeshEntityRef => Boolean(row));
  const campaigns = ((campaignRows?.results as CampaignRow[]) ?? [])
    .filter((row) =>
      parseStringArray(row.software_json, 80).some((entry) => familyMatches(entry, family)),
    )
    .map(ref)
    .filter((row): row is MeshEntityRef => Boolean(row));
  return {
    family,
    family_slug: familySlug,
    actors,
    campaigns,
    total_linked_actors: actors.length,
  };
}

/** Top attributed actors for an IOC's family, bounded for an inline lookup card. */
export async function loadActorsForFamily(
  db: any,
  family: string,
  familySlug: string,
  limit = 8,
): Promise<FamilyAttribution> {
  const attribution = await loadFamilyAttribution(db, family, familySlug);
  return { ...attribution, actors: attribution.actors.slice(0, limit) };
}

const DETECTION_RULES_FOR_CVE_SQL = `
  SELECT id, kind, name, url, severity, source
    FROM detection_rules
   WHERE kind = 'cve' AND match_key = ?
   ORDER BY source ASC, name ASC
   LIMIT 40`;

/**
 * Every stored edge for one CVE. `in_exploit_radar` mirrors the exploit radar's
 * own contract (KEV, PoC, a real rule, or EPSS >= 10%) so the UI and the radar
 * can never disagree.
 */
export async function loadCveLinks(db: any, cveId: string): Promise<CveMeshLinks> {
  const cve = String(cveId ?? '').trim().toUpperCase();
  const empty: CveMeshLinks = {
    cve_id: cve,
    actors: [],
    campaigns: [],
    detection_rules: [],
    in_exploit_radar: false,
    kev: false,
    has_poc: false,
  };
  if (!/^CVE-\d{4}-\d{4,}$/.test(cve)) return empty;

  const [actorRows, campaignRows, ruleRows, vuln] = await Promise.all([
    db
      .prepare(
        `SELECT slug, name, mitre_id FROM threat_actors
          WHERE EXISTS (SELECT 1 FROM json_each(threat_actors.cves_json) WHERE UPPER(value) = ?)
          ORDER BY name ASC LIMIT 100`,
      )
      .bind(cve)
      .all()
      .catch(() => ({ results: [] })),
    db
      .prepare(
        `SELECT slug, name, mitre_id FROM threat_campaigns
          WHERE EXISTS (SELECT 1 FROM json_each(threat_campaigns.cves_json) WHERE UPPER(value) = ?)
          ORDER BY name ASC LIMIT 100`,
      )
      .bind(cve)
      .all()
      .catch(() => ({ results: [] })),
    db.prepare(DETECTION_RULES_FOR_CVE_SQL).bind(cve).all().catch(() => ({ results: [] })),
    db
      .prepare(
        `SELECT is_exploited_in_wild, epss_score, epss_delta FROM vulnerabilities WHERE cve_id = ? LIMIT 1`,
      )
      .bind(cve)
      .first()
      .catch(() => null),
  ]);

  const detectionRules: MeshDetectionRule[] = ((ruleRows?.results as Record<string, unknown>[]) ?? [])
    .map((row) => ({
      id: String(row.id ?? ''),
      kind: String(row.kind ?? ''),
      title: String(row.name ?? ''),
      source_url: String(row.url ?? ''),
      severity: typeof row.severity === 'string' ? row.severity : null,
      source: String(row.source ?? ''),
    }))
    .filter((row) => row.id && row.source_url);

  const kev = Number((vuln as any)?.is_exploited_in_wild ?? 0) === 1;
  const epss = Number((vuln as any)?.epss_score);
  const delta = Number((vuln as any)?.epss_delta);
  // A PoC is read separately so the radar contract stays exact.
  const pocRow = await db
    .prepare('SELECT 1 AS hit FROM cve_pocs WHERE cve_id = ? LIMIT 1')
    .bind(cve)
    .first()
    .catch(() => null);
  const poc = Boolean(pocRow);
  const imminent = (Number.isFinite(epss) && epss >= 0.1) || (Number.isFinite(delta) && delta >= 0.05);

  return {
    cve_id: cve,
    actors: ((actorRows?.results as ActorRow[]) ?? []).map(ref).filter((r): r is MeshEntityRef => Boolean(r)),
    campaigns: ((campaignRows?.results as CampaignRow[]) ?? []).map(ref).filter((r): r is MeshEntityRef => Boolean(r)),
    detection_rules: detectionRules,
    in_exploit_radar: kev || poc || detectionRules.length > 0 || imminent,
    kev,
    has_poc: poc,
  };
}
