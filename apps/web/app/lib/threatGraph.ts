import { apiFetch, getApiBaseUrl } from "./siteConfig";
import { readJsonResult } from "./fetchResult";

/**
 * PHASE 8C — CONNECTED THREAT GRAPH client.
 *
 * The API does the correlation; this module only transports and types it. No
 * live-C2, KEV or PoC value is ever computed or inferred in the browser.
 */

export type ActivityTier = "LIVE_OBSERVED" | "CANONICAL_PROFILE";

export interface LiveFamily {
  family: string;
  slug: string;
  active_count: number;
}

export interface LinkedCve {
  cve_id: string;
  kev: boolean;
  due_date: string | null;
  in_catalog?: boolean;
  has_poc?: boolean;
}

export interface TechniqueRef {
  id: string;
  name: string;
  tactic: string;
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
  linked_cves: LinkedCve[];
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
  documented_cves: LinkedCve[];
  first_seen: string | null;
  last_seen: string | null;
}

export interface NavigatorLayer {
  name: string;
  versions: { attack: string; navigator: string; layer: string };
  domain: string;
  description?: string;
  techniques: Array<{ techniqueID: string; score: number; color: string; comment?: string }>;
  [key: string]: unknown;
}

export interface HuntingQueries {
  kql: string;
  spl: string;
  note: string;
}

export interface ThreatActorDossier {
  actor: ThreatActorItem;
  aliases: string[];
  techniques: TechniqueRef[];
  techniques_by_tactic: Array<{ tactic: string; techniques: TechniqueRef[] }>;
  campaigns: CampaignItem[];
  navigator: NavigatorLayer;
  hunting: HuntingQueries;
  diamond: {
    adversary: { name: string; aliases: string[]; mitre_id: string | null; motivation: string };
    capabilities: { technique_count: number; software: string[]; tactics: string[] };
    infrastructure: { live_c2_count: number; families: LiveFamily[] };
    victimology: { sectors: string[]; regions: string[] };
  };
}

export interface CampaignDossier {
  campaign: CampaignItem;
  techniques: TechniqueRef[];
  techniques_by_tactic: Array<{ tactic: string; techniques: TechniqueRef[] }>;
  navigator: NavigatorLayer;
  hunting: HuntingQueries;
}

export interface GraphResult<T> {
  state: "success" | "empty" | "not_found" | "error";
  data: T | null;
  status?: number;
  error?: string;
}

const GRAPH_READ_INIT = {
  headers: { accept: "application/json" },
  next: { revalidate: 300 },
} as unknown as RequestInit;

export interface ThreatActorIndex {
  summary: ThreatActorSummary;
  items: ThreatActorItem[];
  meta: { total: number; limit: number; offset: number; tier: string };
}

export async function getThreatActors(params: {
  q?: string;
  sector?: string;
  region?: string;
  tier?: string;
  limit?: number;
  offset?: number;
} = {}): Promise<GraphResult<ThreatActorIndex>> {
  const query = new URLSearchParams();
  query.set("limit", String(params.limit ?? 200));
  query.set("offset", String(params.offset ?? 0));
  query.set("tier", params.tier ?? "all");
  if (params.q) query.set("q", params.q);
  if (params.sector) query.set("sector", params.sector);
  if (params.region) query.set("region", params.region);
  try {
    const response = await apiFetch(`${getApiBaseUrl()}/threat-actors?${query.toString()}`, GRAPH_READ_INIT);
    if (!response.ok) return { state: "error", data: null, error: `Threat graph returned HTTP ${response.status}` };
    const payload = (await response.json()) as Partial<ThreatActorIndex>;
    if (!payload?.summary || !Array.isArray(payload.items)) {
      return { state: "error", data: null, error: "Threat graph payload was empty" };
    }
    return {
      state: payload.items.length ? "success" : "empty",
      data: {
        summary: payload.summary,
        items: payload.items,
        meta: payload.meta ?? { total: payload.items.length, limit: 200, offset: 0, tier: "all" },
      },
    };
  } catch {
    return { state: "error", data: null, error: "The threat graph is unavailable" };
  }
}

export async function getThreatActor(slug: string): Promise<GraphResult<ThreatActorDossier>> {
  const result = await readJsonResult<Partial<ThreatActorDossier>>(
    `${getApiBaseUrl()}/threat-actors/${encodeURIComponent(slug)}`,
    GRAPH_READ_INIT,
  );
  if (result.state === "not_found") return { state: "not_found", data: null, status: 404, error: "ACTOR_NOT_FOUND" };
  if (result.state === "error") return { state: "error", data: null, status: result.status, error: result.error };
  return result.data?.actor
    ? { state: "success", data: result.data as ThreatActorDossier, status: 200 }
    : { state: "error", data: null, status: 200, error: "Actor dossier payload was empty" };
}

export interface CampaignIndex {
  items: CampaignItem[];
  meta: { total: number; limit: number; offset: number };
}

export async function getCampaigns(params: { q?: string; actor?: string; sector?: string; limit?: number } = {}): Promise<GraphResult<CampaignIndex>> {
  const query = new URLSearchParams();
  query.set("limit", String(params.limit ?? 100));
  if (params.q) query.set("q", params.q);
  if (params.actor) query.set("actor", params.actor);
  if (params.sector) query.set("sector", params.sector);
  try {
    const response = await apiFetch(`${getApiBaseUrl()}/campaigns?${query.toString()}`, GRAPH_READ_INIT);
    if (!response.ok) return { state: "error", data: null, error: `Campaign index returned HTTP ${response.status}` };
    const payload = (await response.json()) as Partial<CampaignIndex>;
    if (!Array.isArray(payload.items)) return { state: "error", data: null, error: "Campaign payload was empty" };
    return {
      state: payload.items.length ? "success" : "empty",
      data: { items: payload.items, meta: payload.meta ?? { total: payload.items.length, limit: 100, offset: 0 } },
    };
  } catch {
    return { state: "error", data: null, error: "The campaign index is unavailable" };
  }
}

export async function getCampaign(slug: string): Promise<GraphResult<CampaignDossier>> {
  const result = await readJsonResult<Partial<CampaignDossier>>(
    `${getApiBaseUrl()}/campaigns/${encodeURIComponent(slug)}`,
    GRAPH_READ_INIT,
  );
  if (result.state === "not_found") return { state: "not_found", data: null, status: 404, error: "CAMPAIGN_NOT_FOUND" };
  if (result.state === "error") return { state: "error", data: null, status: result.status, error: result.error };
  return result.data?.campaign
    ? { state: "success", data: result.data as CampaignDossier, status: 200 }
    : { state: "error", data: null, status: 200, error: "Campaign dossier payload was empty" };
}

/** Human label for the two-tier truth model. Never re-derived in the UI. */
export function tierLabel(tier: ActivityTier): string {
  return tier === "LIVE_OBSERVED" ? "LIVE OBSERVED" : "CANONICAL PROFILE";
}

export function tacticLabel(tactic: string): string {
  return String(tactic ?? "")
    .split("-")
    .map((part) => (part ? part[0].toUpperCase() + part.slice(1) : part))
    .join(" ");
}

export function formatGraphDate(value: string | null | undefined): string | null {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return new Intl.DateTimeFormat("en", { dateStyle: "medium", timeZone: "UTC" }).format(parsed);
}
