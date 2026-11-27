import { readJsonResult, type ReadResult } from "./fetchResult";
import { apiFetch, getApiBaseUrl } from "./siteConfig";

/**
 * PHASE 10B-1 — Global Wire client.
 *
 * The wire is a separate observation store from the editorial newsroom, and this
 * module keeps that separation visible: the type names, the tier labels and the
 * provenance copy all say "OSINT signal", never "briefing".
 */

export const WIRE_REGIONS = [
  { value: "", label: "All" },
  { value: "RU", label: "RU" },
  { value: "CN", label: "CN" },
  { value: "IR", label: "IR" },
  { value: "KR", label: "KR" },
  { value: "GCC", label: "GCC" },
  { value: "GLOBAL", label: "Global" },
] as const;

export const WIRE_TIERS = [
  { value: "", label: "All tiers" },
  { value: "CORROBORATED_OSINT", label: "Corroborated" },
  { value: "EARLY_WIRE_SIGNAL", label: "Early signal" },
] as const;

export interface WireSignal {
  id: string;
  region: string;
  language: string;
  title: string;
  summary: string;
  excerpt: string;
  trust_tier: string;
  signal_score: number;
  cves: string[];
  iocs: string[];
  actors: string[];
  cluster_id: string | null;
  source_handle: string;
  source_title: string;
  category: string;
  url: string;
  published_at: string;
  ingested_at: string;
}

export interface WireCluster {
  id: string;
  cluster_key: string;
  headline: string;
  regions: string[];
  source_count: number;
  linked_cves: string[];
  convergence_score: number;
  trust_tier: string;
  last_seen_at: string;
}

export interface WireFeed {
  items: WireSignal[];
  clusters: WireCluster[];
  region_counts: Array<{ region: string; count: number }>;
  total: number;
  region: string;
  tier: string;
  limit: number;
  translation: "LIVE" | "DETERMINISTIC";
}

const READ_INIT = {
  headers: { accept: "application/json" },
  next: { revalidate: 120 },
} as unknown as RequestInit;

export async function getWireFeed(params: {
  region?: string;
  tier?: string;
  limit?: number;
} = {}): Promise<ReadResult<WireFeed>> {
  const query = new URLSearchParams();
  if (params.region) query.set("region", params.region);
  if (params.tier) query.set("tier", params.tier);
  query.set("limit", String(params.limit ?? 30));
  return readJsonResult<WireFeed>(
    `${getApiBaseUrl()}/wire?${query.toString()}`,
    READ_INIT,
    apiFetch as typeof fetch,
  );
}

export function wireRegionLabel(region: string): string {
  const raw = String(region ?? "").trim().toUpperCase();
  if (!raw) return "GLOBAL";
  return raw === "GLOBAL" ? "GLOBAL" : raw;
}

/** Honest tier wording: only three tiers exist and none is "verified". */
export function wireTierLabel(tier: string): string {
  switch (String(tier ?? "").toUpperCase()) {
    case "CORROBORATED_OSINT":
      return "CORROBORATED OSINT";
    case "DISPUTED_RECYCLED":
      return "DISPUTED / RECYCLED";
    default:
      return "EARLY SIGNAL";
  }
}

export function wireHref(params: { region?: string; tier?: string }): string {
  const query = new URLSearchParams({ view: "wire" });
  if (params.region) query.set("region", params.region);
  if (params.tier) query.set("tier", params.tier);
  return `/news?${query.toString()}`;
}

/** Relative age for the wire row; a bad timestamp is shown as-is, never "now". */
export function wireRelativeTime(value: string, now: Date = new Date()): string {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return value || "—";
  const minutes = Math.floor((now.getTime() - date.getTime()) / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return date.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric", timeZone: "UTC" });
}

/** Only a real catalog CVE id becomes a dossier link. */
export function cveHref(value: string): string | null {
  const clean = String(value ?? "").trim().toUpperCase();
  return /^CVE-\d{4}-\d{4,7}$/.test(clean)
    ? `/intelligence/vulnerabilities/${encodeURIComponent(clean)}`
    : null;
}
