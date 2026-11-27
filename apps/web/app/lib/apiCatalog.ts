/**
 * PHASE 10A — the live public API contract, as rendered by `/developers`.
 *
 * These are the 27 resource endpoints the API actually serves (`/openapi.json`
 * and `/llms.txt` are documentation assets, not resources). Nothing here is
 * aspirational: every row corresponds to a real branch in `workers/api/src`.
 */

export interface ApiEndpoint {
  method: "GET" | "POST";
  path: string;
  purpose: string;
  output: string;
}

export interface ApiEndpointGroup {
  id: string;
  title: string;
  description: string;
  endpoints: ApiEndpoint[];
}

export const API_BASE_URL = "https://api.zayron-x.co/api/v1";

export const API_ENDPOINT_GROUPS: ApiEndpointGroup[] = [
  {
    id: "graph",
    title: "Core graph",
    description: "The catalog entities behind every dossier, navigator layer and detection rule.",
    endpoints: [
      { method: "GET", path: "/vulnerabilities", purpose: "Filtered CVE index with KEV, EPSS and priority filters", output: "JSON" },
      { method: "GET", path: "/vulnerabilities/{cveId}", purpose: "Full CVE dossier: CVSS, EPSS, KEV, graph links", output: "JSON" },
      { method: "GET", path: "/exploits", purpose: "Exploit radar across tracked vulnerabilities", output: "JSON" },
      { method: "GET", path: "/techniques", purpose: "MITRE ATT&CK technique index", output: "JSON" },
      { method: "GET", path: "/techniques/{id}", purpose: "Technique dossier with linked actors and malware", output: "JSON" },
      { method: "GET", path: "/threat-actors", purpose: "Tracked actor index", output: "JSON" },
      { method: "GET", path: "/threat-actors/{slug}", purpose: "Actor dossier with campaigns and techniques", output: "JSON" },
      { method: "GET", path: "/threat-actors/{slug}/navigator.json", purpose: "ATT&CK Navigator layer for one actor", output: "Navigator JSON" },
      { method: "GET", path: "/campaigns", purpose: "Campaign index", output: "JSON" },
      { method: "GET", path: "/campaigns/{slug}", purpose: "Campaign dossier", output: "JSON" },
      { method: "GET", path: "/campaigns/{slug}/navigator.json", purpose: "ATT&CK Navigator layer for one campaign", output: "Navigator JSON" },
      { method: "GET", path: "/detection/rules", purpose: "Detection rules by CVE or malware family", output: "JSON" },
    ],
  },
  {
    id: "reference",
    title: "Newsroom & reference",
    description: "Editorial briefings and the programmatic vendor / region hubs.",
    endpoints: [
      { method: "GET", path: "/news", purpose: "Published briefing index, filterable by category or entity", output: "JSON" },
      { method: "GET", path: "/news/{slug}", purpose: "One briefing with its verified graph enrichment", output: "JSON" },
      { method: "GET", path: "/vendors", purpose: "Vendor index", output: "JSON" },
      { method: "GET", path: "/vendors/{slug}", purpose: "Vendor hub: affected products and CVEs", output: "JSON" },
      { method: "GET", path: "/regions", purpose: "Region index", output: "JSON" },
      { method: "GET", path: "/regions/{code}", purpose: "Region hub with catalog-backed telemetry", output: "JSON" },
    ],
  },
  {
    id: "iocs",
    title: "Bulk IOC & defense feeds",
    description: "Indicator lookup, batched enrichment and firewall-ready output.",
    endpoints: [
      { method: "GET", path: "/iocs/lookup", purpose: "Single-indicator lookup (defanged input accepted)", output: "JSON" },
      { method: "POST", path: "/iocs/bulk", purpose: "Up to 50 indicators in one batched lookup", output: "JSON" },
      { method: "GET", path: "/iocs/feed", purpose: "Incremental feed with ?since= and cursor pagination", output: "JSON · STIX 2.1" },
      { method: "GET", path: "/iocs/stats", purpose: "Indicator counts, decay state and family mix", output: "JSON" },
      { method: "GET", path: "/iocs/edl/{type}", purpose: "Firewall EDL: ip · domain · url · cidr", output: "text/plain" },
    ],
  },
  {
    id: "access",
    title: "Access & distribution",
    description: "Self-serve credentials and the briefing lifecycle.",
    endpoints: [
      { method: "POST", path: "/keys/self-serve", purpose: "Issue one free-tier 48-character token per work email", output: "JSON" },
      { method: "POST", path: "/leads", purpose: "Procurement intake for Pro or Enterprise access", output: "JSON" },
      { method: "POST", path: "/briefings/subscribe", purpose: "Subscribe an address to the intelligence briefing", output: "JSON" },
      { method: "GET", path: "/briefings/unsubscribe", purpose: "One-click unsubscribe (RFC 8058 compatible)", output: "JSON · HTML" },
    ],
  },
];

/** 27 real resource endpoints — the number every surface quotes. */
export const API_ENDPOINT_COUNT = API_ENDPOINT_GROUPS.reduce(
  (total, group) => total + group.endpoints.length,
  0,
);

export const API_LIMITS = [
  { label: "Authentication", value: "Authorization: Bearer zx_live_…", note: "48-character token, HMAC-SHA256 at rest, displayed once" },
  { label: "Rate limit", value: "30 requests / 60 s", note: "Per key, enforced at the edge before the database is touched" },
  { label: "Daily quota", value: "500 records / day", note: "Free tier; bulk IOC requests accept up to 50 indicators" },
  { label: "Incremental sync", value: "?since= · ?offset=", note: "ISO-8601 UTC checkpoint; follow X-Zayron-Next-Cursor until empty" },
  { label: "Bulk lookup", value: "POST /iocs/bulk", note: "50 indicators per request, defanged input refanged before matching" },
  { label: "Defense output", value: "STIX 2.1 · Firewall EDL", note: "IP, domain, URL and CIDR lists ready for a perimeter block" },
];

export const API_ERRORS = [
  { status: "400", code: "BAD_REQUEST", meaning: "The query is malformed or a required parameter is missing." },
  { status: "401", code: "API_KEY_REQUIRED", meaning: "No bearer token was supplied for a protected endpoint." },
  { status: "403", code: "FORBIDDEN", meaning: "The token is valid but not permitted for this surface." },
  { status: "429", code: "RATE_LIMITED", meaning: "The 60-second allowance is exhausted; honour Retry-After." },
];
