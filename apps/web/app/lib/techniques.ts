import { readJsonResult } from "./fetchResult";
import { apiFetch, getApiBaseUrl } from "./siteConfig";

/**
 * PHASE 9A — MITRE ATT&CK technique neural backbone client.
 *
 * The API resolves every edge from the indexed `technique_edges` table; this
 * module only transports and types it.
 */

export interface TechniqueEntityRef {
  slug: string;
  name: string;
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

export interface TechniqueSummary {
  id: string;
  name: string;
  tactic: string;
  actor_count: number;
  campaign_count: number;
  entity_count: number;
}

export interface TechniqueIndex {
  items: TechniqueSummary[];
  total: number;
}

export interface TechniqueResult<T> {
  state: "success" | "not_found" | "error";
  data: T | null;
  error?: string;
}

const TECHNIQUE_READ_INIT = {
  headers: { accept: "application/json" },
  next: { revalidate: 300 },
} as unknown as RequestInit;

export async function getTechnique(id: string): Promise<TechniqueResult<TechniqueDossier>> {
  const result = await readJsonResult<Partial<TechniqueDossier>>(
    `${getApiBaseUrl()}/techniques/${encodeURIComponent(id)}`,
    TECHNIQUE_READ_INIT,
  );
  if (result.state === "not_found") return { state: "not_found", data: null, error: "TECHNIQUE_NOT_FOUND" };
  if (result.state === "error") return { state: "error", data: null, error: result.error };
  return result.data?.id
    ? { state: "success", data: result.data as TechniqueDossier }
    : { state: "error", data: null, error: "Technique payload was empty" };
}

export async function getTechniques(params: { q?: string; limit?: number } = {}): Promise<
  TechniqueResult<TechniqueIndex>
> {
  const query = new URLSearchParams();
  if (params.q) query.set("q", params.q);
  query.set("limit", String(params.limit ?? 100));
  const result = await readJsonResult<TechniqueIndex>(
    `${getApiBaseUrl()}/techniques?${query.toString()}`,
    TECHNIQUE_READ_INIT,
  );
  if (result.state === "not_found") return { state: "not_found", data: null };
  if (result.state === "error") return { state: "error", data: null, error: result.error };
  return { state: "success", data: result.data ?? { items: [], total: 0 } };
}

/** One internal route for a technique. Never a raw MITRE exit link. */
export function techniqueHref(id: string): string {
  return `/intelligence/techniques/${encodeURIComponent(id)}`;
}

export function tacticLabel(tactic: string): string {
  return String(tactic ?? "")
    .split("-")
    .map((part) => (part ? part[0].toUpperCase() + part.slice(1) : part))
    .join(" ");
}
