/**
 * PHASE 9B — programmatic vendor and regional threat-posture hubs.
 *
 * Both hub families are derived from data that already exists in D1:
 *   - vendors: `AUTHORITATIVE_VERIFIED` vulnerability vendors only (the 1,238
 *     `SYNTHETIC_UNVERIFIED` rows can never inflate a hub count or a list);
 *   - regions: live Radar-enriched `iocs.country` plus the MITRE
 *     `target_regions_json` arrays on actors and campaigns.
 * No keyword stuffing, no fabricated geography.
 */

export const HUB_CACHE_SECONDS = 300;

export const REGION_DEFINITIONS = [
  {
    code: "us",
    name: "United States",
    tokens: ["us", "usa", "united states", "north america", "u.s.", "americas"],
  },
  { code: "eu", name: "Europe", tokens: ["eu", "europe", "emea", "united kingdom", "germany", "france"] },
  { code: "me", name: "Middle East", tokens: ["me", "middle east", "mena", "israel", "saudi arabia", "uae"] },
  { code: "apac", name: "Asia-Pacific", tokens: ["apac", "asia", "asia-pacific", "japan", "australia", "india"] },
  { code: "global", name: "Global", tokens: ["global", "worldwide", "international"] },
] as const;

export type RegionCode = (typeof REGION_DEFINITIONS)[number]["code"];

export function isRegionCode(value: string): value is RegionCode {
  return REGION_DEFINITIONS.some((region) => region.code === value);
}

/** Country → region, only for the ISO codes the Radar feed actually emits. */
const COUNTRY_REGION: Record<string, string> = {
  US: "us", CA: "us", MX: "us", BR: "us", AR: "us", CL: "us", CO: "us", PE: "us",
  GB: "eu", DE: "eu", FR: "eu", NL: "eu", IT: "eu", ES: "eu", SE: "eu", NO: "eu",
  FI: "eu", DK: "eu", PL: "eu", CZ: "eu", AT: "eu", CH: "eu", BE: "eu", IE: "eu",
  PT: "eu", RO: "eu", HU: "eu", GR: "eu", UA: "eu", RU: "eu", LT: "eu", LV: "eu",
  EE: "eu", BG: "eu", HR: "eu", SK: "eu", SI: "eu", RS: "eu", TR: "me",
  IL: "me", SA: "me", AE: "me", QA: "me", KW: "me", BH: "me", OM: "me", JO: "me",
  LB: "me", EG: "me", IR: "me", IQ: "me",
  JP: "apac", CN: "apac", KR: "apac", IN: "apac", AU: "apac", NZ: "apac", SG: "apac",
  HK: "apac", TW: "apac", TH: "apac", VN: "apac", MY: "apac", ID: "apac", PH: "apac",
  PK: "apac", BD: "apac", LK: "apac",
};

export interface VendorHubSummary {
  slug: string;
  name: string;
  verified_cves: number;
  kev_count: number;
  poc_count: number;
}

export interface VendorHubDetail extends VendorHubSummary {
  cves: Array<{
    cve_id: string;
    affected_product: string | null;
    cvss_score: number | null;
    epss_score: number | null;
    kev: boolean;
    kev_due_date: string | null;
    poc_count: number;
    published_at: string | null;
  }>;
  related_news: Array<{ slug: string; title: string; category: string; severity: string; published_at: string }>;
}

/** The vendor slug used by both hub routes and `entity_mentions.entity_slug`. */
export function vendorSlug(value: string): string {
  return String(value ?? "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60)
    .replace(/-+$/g, "");
}

const VENDOR_PLACEHOLDERS = new Set(["", "n/a", "na", "none", "null", "unknown", "not applicable", "not_established", "-", "—"]);

export function isRealVendor(value: string): boolean {
  return !VENDOR_PLACEHOLDERS.has(String(value ?? "").trim().toLowerCase());
}

async function all<T>(db: D1Database, sql: string, params: unknown[] = []): Promise<T[]> {
  const statement = db.prepare(sql);
  const bound = params.length > 0 ? statement.bind(...params) : statement;
  const result = await bound.all<T>();
  const rows = (result as any)?.results;
  return Array.isArray(rows) ? (rows as T[]) : [];
}

function jsonArray(value: unknown): string[] {
  if (typeof value !== "string" || value.trim() === "") return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.map((entry) => String(entry).trim().toLowerCase()).filter(Boolean) : [];
  } catch {
    return [];
  }
}

/** Every vendor with at least one authoritative CVE, newest-first by volume. */
export async function loadVendors(db: D1Database, limit = 100): Promise<VendorHubSummary[]> {
  const rows = await all<{ vendor: string; cves: number; kev: number }>(
    db,
    `SELECT affected_vendor AS vendor,
            COUNT(*) AS cves,
            SUM(CASE WHEN is_exploited_in_wild = 1 OR kev_due_date IS NOT NULL THEN 1 ELSE 0 END) AS kev
       FROM vulnerabilities
      WHERE provenance_state = 'AUTHORITATIVE_VERIFIED'
        AND affected_vendor IS NOT NULL
      GROUP BY affected_vendor
      ORDER BY cves DESC
      LIMIT ?`,
    [Math.max(1, Math.min(500, limit))],
  );

  const pocRows = await all<{ vendor: string; n: number }>(
    db,
    `SELECT v.affected_vendor AS vendor, COUNT(DISTINCT p.cve_id) AS n
       FROM cve_pocs p
       JOIN vulnerabilities v ON v.cve_id = p.cve_id
      WHERE v.provenance_state = 'AUTHORITATIVE_VERIFIED' AND v.affected_vendor IS NOT NULL
      GROUP BY v.affected_vendor`,
  );
  const pocByVendor = new Map(pocRows.map((row) => [String(row.vendor), Number(row.n ?? 0)]));

  const seen = new Set<string>();
  const hubs: VendorHubSummary[] = [];
  for (const row of rows) {
    const name = String(row.vendor ?? "").trim();
    if (!isRealVendor(name)) continue;
    const slug = vendorSlug(name);
    if (!slug || seen.has(slug)) continue;
    seen.add(slug);
    hubs.push({
      slug,
      name,
      verified_cves: Number(row.cves ?? 0),
      kev_count: Number(row.kev ?? 0),
      poc_count: pocByVendor.get(name) ?? 0,
    });
  }
  return hubs;
}

export async function loadVendor(db: D1Database, slug: string): Promise<VendorHubDetail | null> {
  const wanted = vendorSlug(slug);
  if (!wanted) return null;
  const hubs = await loadVendors(db, 500);
  const hub = hubs.find((entry) => entry.slug === wanted);
  if (!hub) return null;

  const rows = await all<{
    cve_id: string;
    affected_product: string | null;
    cvss_score: number | null;
    epss_score: number | null;
    is_exploited_in_wild: number | null;
    kev_due_date: string | null;
    published_at: string | null;
    poc_count: number;
  }>(
    db,
    `SELECT v.cve_id, v.affected_product, v.cvss_score, v.epss_score, v.is_exploited_in_wild,
            v.kev_due_date, v.published_at,
            (SELECT COUNT(*) FROM cve_pocs p WHERE p.cve_id = v.cve_id) AS poc_count
       FROM vulnerabilities v
      WHERE v.provenance_state = 'AUTHORITATIVE_VERIFIED' AND v.affected_vendor = ?
      ORDER BY (v.is_exploited_in_wild = 1) DESC, v.cvss_score DESC, v.published_at DESC
      LIMIT 100`,
    [hub.name],
  );

  const related = await all<{ slug: string; title: string; category: string; severity: string; published_at: string }>(
    db,
    `SELECT n.slug, n.title, n.category, n.severity, n.published_at
       FROM entity_mentions m
       JOIN news_articles n ON n.id = m.news_id AND n.status = 'PUBLISHED'
      WHERE m.entity_type = 'vendor' AND m.entity_slug = ?
      ORDER BY n.published_at DESC LIMIT 5`,
    [hub.slug],
  );

  return {
    ...hub,
    cves: rows.map((row) => ({
      cve_id: String(row.cve_id),
      affected_product: row.affected_product ?? null,
      cvss_score: row.cvss_score ?? null,
      epss_score: row.epss_score ?? null,
      kev: Number(row.is_exploited_in_wild) === 1 || Boolean(row.kev_due_date),
      kev_due_date: row.kev_due_date ?? null,
      poc_count: Number(row.poc_count ?? 0),
      published_at: row.published_at ?? null,
    })),
    related_news: related,
  };
}

export interface RegionHubSummary {
  code: string;
  name: string;
  active_c2: number;
  actors: number;
  campaigns: number;
}

export interface RegionHubDetail extends RegionHubSummary {
  top_countries: Array<{ country: string; count: number }>;
  actor_list: Array<{ slug: string; name: string }>;
  campaign_list: Array<{ slug: string; name: string }>;
  related_news: Array<{ slug: string; title: string; category: string; severity: string; published_at: string }>;
}

async function regionTelemetry(db: D1Database): Promise<{
  iocRows: Array<{ country: string; n: number }>;
  actors: Array<{ slug: string; name: string; regions: string[] }>;
  campaigns: Array<{ slug: string; name: string; regions: string[] }>;
}> {
  const iocRows = await all<{ country: string; n: number }>(
    db,
    `SELECT UPPER(country) AS country, COUNT(*) AS n FROM iocs
      WHERE status = 'ACTIVE' AND country IS NOT NULL AND TRIM(country) <> ''
      GROUP BY UPPER(country) ORDER BY n DESC LIMIT 200`,
  );
  const actors = (
    await all<{ slug: string; name: string; target_regions_json: string | null }>(
      db,
      `SELECT slug, name, target_regions_json FROM threat_actors ORDER BY slug ASC LIMIT 300`,
    )
  ).map((row) => ({ slug: String(row.slug), name: String(row.name), regions: jsonArray(row.target_regions_json) }));
  const campaigns = (
    await all<{ slug: string; name: string; target_regions_json: string | null }>(
      db,
      `SELECT slug, name, target_regions_json FROM threat_campaigns ORDER BY slug ASC LIMIT 300`,
    )
  ).map((row) => ({ slug: String(row.slug), name: String(row.name), regions: jsonArray(row.target_regions_json) }));
  return { iocRows, actors, campaigns };
}

function matchesRegion(tokens: readonly string[], regions: string[]): boolean {
  if (regions.length === 0) return false;
  const normalized = tokens.map((token) => token.toLowerCase());
  return regions.some((region) =>
    normalized.some((token) => region === token || region.includes(token) || token.includes(region)),
  );
}

export function summarizeRegion(
  code: string,
  telemetry: Awaited<ReturnType<typeof regionTelemetry>>,
): RegionHubSummary {
  const definition = REGION_DEFINITIONS.find((region) => region.code === code);
  const tokens = definition?.tokens ?? [];
  const countryC2 = telemetry.iocRows
    .filter((row) => (code === "global" ? true : COUNTRY_REGION[String(row.country)] === code))
    .reduce((sum, row) => sum + Number(row.n ?? 0), 0);
  return {
    code,
    name: definition?.name ?? code.toUpperCase(),
    active_c2: countryC2,
    actors: telemetry.actors.filter((actor) => matchesRegion(tokens, actor.regions)).length,
    campaigns: telemetry.campaigns.filter((campaign) => matchesRegion(tokens, campaign.regions)).length,
  };
}

export async function loadRegions(db: D1Database): Promise<RegionHubSummary[]> {
  const telemetry = await regionTelemetry(db);
  return REGION_DEFINITIONS.map((region) => summarizeRegion(region.code, telemetry));
}

export async function loadRegion(db: D1Database, code: string): Promise<RegionHubDetail | null> {
  if (!isRegionCode(code)) return null;
  const telemetry = await regionTelemetry(db);
  const summary = summarizeRegion(code, telemetry);
  const definition = REGION_DEFINITIONS.find((region) => region.code === code);
  const tokens = definition?.tokens ?? [];
  const topCountries = telemetry.iocRows
    .filter((row) => (code === "global" ? true : COUNTRY_REGION[String(row.country)] === code))
    .slice(0, 12)
    .map((row) => ({ country: String(row.country), count: Number(row.n ?? 0) }));
  const related = await all<{ slug: string; title: string; category: string; severity: string; published_at: string }>(
    db,
    `SELECT slug, title, category, severity, published_at FROM news_articles
      WHERE status = 'PUBLISHED' ORDER BY published_at DESC LIMIT 5`,
  );
  return {
    ...summary,
    top_countries: topCountries,
    actor_list: telemetry.actors.filter((actor) => matchesRegion(tokens, actor.regions)).slice(0, 40),
    campaign_list: telemetry.campaigns.filter((campaign) => matchesRegion(tokens, campaign.regions)).slice(0, 40),
    related_news: related,
  };
}
