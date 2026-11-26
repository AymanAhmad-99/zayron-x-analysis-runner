import { readJsonResult, type ReadResult } from "./fetchResult";
import { apiFetch, getApiBaseUrl } from "./siteConfig";

/** PHASE 9B — programmatic vendor / regional hub transport. */

export interface VendorSummary {
  slug: string;
  name: string;
  verified_cves: number;
  kev_count: number;
  poc_count: number;
}

export interface VendorDetail extends VendorSummary {
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

export interface RegionSummary {
  code: string;
  name: string;
  active_c2: number;
  actors: number;
  campaigns: number;
}

export interface RegionDetail extends RegionSummary {
  top_countries: Array<{ country: string; count: number }>;
  actor_list: Array<{ slug: string; name: string }>;
  campaign_list: Array<{ slug: string; name: string }>;
  related_news: Array<{ slug: string; title: string; category: string; severity: string; published_at: string }>;
}

const READ_INIT = {
  headers: { accept: "application/json" },
  next: { revalidate: 300 },
} as unknown as RequestInit;

export async function getVendors(): Promise<ReadResult<{ items: VendorSummary[]; total: number }>> {
  return readJsonResult(`${getApiBaseUrl()}/vendors`, READ_INIT, apiFetch as typeof fetch);
}

export async function getVendor(slug: string): Promise<ReadResult<VendorDetail>> {
  const result = await readJsonResult<{ data?: VendorDetail }>(
    `${getApiBaseUrl()}/vendors/${encodeURIComponent(slug)}`,
    READ_INIT,
    apiFetch as typeof fetch,
  );
  if (result.state !== "ok") return result as ReadResult<VendorDetail>;
  return result.data?.data
    ? { state: "ok", data: result.data.data, status: result.status }
    : { state: "error", data: null, status: result.status, error: "Empty vendor payload" };
}

export async function getRegions(): Promise<ReadResult<{ items: RegionSummary[]; total: number }>> {
  return readJsonResult(`${getApiBaseUrl()}/regions`, READ_INIT, apiFetch as typeof fetch);
}

export async function getRegion(code: string): Promise<ReadResult<RegionDetail>> {
  const result = await readJsonResult<{ data?: RegionDetail }>(
    `${getApiBaseUrl()}/regions/${encodeURIComponent(code)}`,
    READ_INIT,
    apiFetch as typeof fetch,
  );
  if (result.state !== "ok") return result as ReadResult<RegionDetail>;
  return result.data?.data
    ? { state: "ok", data: result.data.data, status: result.status }
    : { state: "error", data: null, status: result.status, error: "Empty region payload" };
}

export function vendorHref(slug: string): string {
  return `/intelligence/vendors/${encodeURIComponent(slug)}`;
}

export function regionHref(code: string): string {
  return `/intelligence/regions/${encodeURIComponent(code)}`;
}
