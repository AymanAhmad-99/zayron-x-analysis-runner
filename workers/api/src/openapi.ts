/**
 * PHASE 7A — ZAYRON-X Intelligence API v1 OpenAPI 3.1 document.
 *
 * Generated in code (not a static file) so the servers/summary stay correct for
 * both the preview worker and production without a second copy to drift.
 * Kept dependency-free and pure so its validity is unit-testable.
 */

export const OPENAPI_VERSION = "3.1.0";
export const API_VERSION = "v1";

const BEARER_DESCRIPTION = [
  "48-character ZAYRON-X API token.",
  "",
  "Format: `zx_live_<8-char KeyID>_<31-char secret>` (exactly 48 characters).",
  "Issue a free-tier token at `POST /api/v1/keys/self-serve`.",
  "The token is shown once and stored only as an HMAC-SHA256 digest.",
].join("\n");

export interface OpenApiOptions {
  /** Origin the document is served from, e.g. `https://zayron-x.co`. */
  origin?: string;
}

export function buildOpenApiDocument(options: OpenApiOptions = {}): Record<string, unknown> {
  const origin = (options.origin || "https://zayron-x.co").replace(/\/+$/, "");

  const errorSchema = {
    type: "object",
    required: ["error"],
    properties: {
      error: {
        type: "object",
        required: ["code", "message"],
        properties: {
          code: { type: "string" },
          message: { type: "string" },
        },
      },
      retryAfter: { type: "integer", minimum: 1 },
    },
    additionalProperties: true,
  };

  const vulnerabilitySchema = {
    type: "object",
    description:
      "A published ZAYRON-X vulnerability record. Records are returned as stored so the field set can grow without a breaking change.",
    required: ["cve_id"],
    properties: {
      id: { type: "string" },
      cve_id: { type: "string", examples: ["CVE-2026-129830"] },
      title: { type: "string" },
      description: { type: "string" },
      severity: { type: "string", enum: ["CRITICAL", "HIGH", "MEDIUM", "LOW", "UNKNOWN"] },
      cvss_score: { type: ["number", "null"] },
      epss_score: { type: ["number", "null"], minimum: 0, maximum: 1 },
      epss_percentile: { type: ["number", "null"] },
      is_exploited_in_wild: { type: "integer", enum: [0, 1] },
      kev_due_date: { type: ["string", "null"], format: "date" },
      affected_vendor: { type: ["string", "null"] },
      affected_product: { type: ["string", "null"] },
      patch_url: { type: ["string", "null"] },
      provenance_state: { type: "string" },
      published_at: { type: ["string", "null"] },
      created_at: { type: "string" },
      updated_at: { type: ["string", "null"] },
      strategic_brief: { type: ["object", "null"] },
    },
    additionalProperties: true,
  };

  return {
    openapi: OPENAPI_VERSION,
    info: {
      title: "ZAYRON-X Intelligence API",
      version: API_VERSION,
      summary: "Source-verified vulnerability intelligence. Truth Is the Perimeter.",
      description: [
        "The ZAYRON-X Intelligence API exposes the same published records the site renders:",
        "NVD facts, CISA KEV presence, FIRST EPSS probability and the ZAYRON-X strategic assessment.",
        "",
        "All read endpoints are anonymous. Supplying an `Authorization: Bearer` token raises the",
        "per-minute allowance and emits `X-Zayron-Tier` on every response.",
        "",
        "Rate limits are enforced at the Cloudflare edge and reported through",
        "`X-RateLimit-Limit` and `X-Request-Id`; exceeding them returns `429` with `Retry-After`.",
      ].join("\n"),
      license: { name: "Attribution required; systematic redistribution prohibited", identifier: "LicenseRef-Zayron-X" },
      contact: { name: "ZAYRON-X", email: "contact@zayron-x.co", url: `${origin}/company/contact` },
    },
    servers: [
      { url: `${origin}/api/v1`, description: "ZAYRON-X production edge" },
      { url: "https://zayron-x-api-preview.aabusabih.workers.dev/api/v1", description: "Preview" },
    ],
    security: [],
    tags: [
      { name: "Vulnerabilities", description: "Published CVE advisories and their exploitation context." },
      { name: "Exploits", description: "Live exploit & weaponization radar (KEV, public PoC, detection coverage, EPSS)." },
      { name: "Access", description: "Self-serve API key issuance and procurement intake." },
      { name: "Meta", description: "Specification and status." },
    ],
    paths: {
      "/openapi.json": {
        get: {
          operationId: "getOpenApiDocument",
          summary: "This OpenAPI 3.1 specification",
          tags: ["Meta"],
          security: [],
          responses: {
            "200": {
              description: "OpenAPI 3.1 document",
              headers: {
                "Cache-Control": { schema: { type: "string" }, description: "Edge-cacheable public read." },
              },
              content: { "application/json": { schema: { type: "object" } } },
            },
          },
        },
      },
      "/threat-actors": {
        get: {
          operationId: "getThreatActors",
          summary: "MITRE ATT&CK threat graph with live correlation (edge-cached 300s)",
          description: [
            "PHASE 8C — the canonical MITRE ATT&CK Enterprise group catalog joined to live",
            "ZAYRON-X telemetry. `activity_tier` is a stored-fact statement:",
            "`LIVE_OBSERVED` when at least one documented software family has active indicators",
            "or a documented CVE is KEV-listed / has a verified public PoC, otherwise",
            "`CANONICAL_PROFILE`. Alias search is supported (\"Cozy Bear\" resolves APT29).",
          ].join("\n"),
          tags: ["Threat Graph"],
          security: [],
          parameters: [
            { name: "q", in: "query", description: "Name, alias, MITRE id or software search.", schema: { type: "string", maxLength: 120 } },
            { name: "sector", in: "query", schema: { type: "string", maxLength: 80 } },
            { name: "region", in: "query", schema: { type: "string", maxLength: 80 } },
            { name: "tier", in: "query", schema: { type: "string", enum: ["all", "live", "canonical"], default: "all" } },
            { name: "limit", in: "query", schema: { type: "integer", minimum: 1, maximum: 200, default: 50 } },
            { name: "offset", in: "query", schema: { type: "integer", minimum: 0, default: 0 } },
          ],
          responses: {
            "200": {
              description: "Threat-graph summary plus paginated actor rows",
              headers: { "Cache-Control": { schema: { type: "string" }, description: "Edge-cacheable public read (300s)." } },
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      status: { type: "string" },
                      summary: { $ref: "#/components/schemas/ThreatActorSummary" },
                      items: { type: "array", items: { $ref: "#/components/schemas/ThreatActor" } },
                      meta: { type: "object", properties: { total: { type: "integer" }, limit: { type: "integer" }, offset: { type: "integer" }, tier: { type: "string" } } },
                    },
                  },
                },
              },
            },
          },
        },
      },
      "/threat-actors/{slug}": {
        get: {
          operationId: "getThreatActorDossier",
          summary: "Connected adversary dossier: Diamond Model, live correlation, ATT&CK matrix, hunting queries",
          tags: ["Threat Graph"],
          security: [],
          parameters: [{ name: "slug", in: "path", required: true, schema: { type: "string", maxLength: 120 } }],
          responses: {
            "200": {
              description: "Actor dossier",
              content: { "application/json": { schema: { type: "object" } } },
            },
            "404": { description: "No canonical actor matches this slug", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
          },
        },
      },
      "/threat-actors/{slug}/navigator.json": {
        get: {
          operationId: "getThreatActorNavigatorLayer",
          summary: "MITRE ATT&CK Navigator layer 4.5 for one actor",
          description: "Downloadable `enterprise-attack` layer (version 4.5) with every documented technique scored and coloured `#FF4D00`.",
          tags: ["Threat Graph"],
          security: [],
          parameters: [{ name: "slug", in: "path", required: true, schema: { type: "string", maxLength: 120 } }],
          responses: {
            "200": { description: "Navigator layer", content: { "application/json": { schema: { $ref: "#/components/schemas/NavigatorLayer" } } } },
            "404": { description: "Unknown actor", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
          },
        },
      },
      "/campaigns": {
        get: {
          operationId: "getCampaigns",
          summary: "MITRE ATT&CK campaign index with attribution (edge-cached 300s)",
          tags: ["Threat Graph"],
          security: [],
          parameters: [
            { name: "q", in: "query", schema: { type: "string", maxLength: 120 } },
            { name: "actor", in: "query", description: "Restrict to one attributed actor slug.", schema: { type: "string", maxLength: 120 } },
            { name: "sector", in: "query", schema: { type: "string", maxLength: 80 } },
            { name: "limit", in: "query", schema: { type: "integer", minimum: 1, maximum: 100, default: 50 } },
            { name: "offset", in: "query", schema: { type: "integer", minimum: 0, default: 0 } },
          ],
          responses: {
            "200": {
              description: "Paginated campaign rows",
              content: { "application/json": { schema: { type: "object", properties: { status: { type: "string" }, items: { type: "array", items: { $ref: "#/components/schemas/Campaign" } }, meta: { type: "object" } } } } },
            },
          },
        },
      },
      "/campaigns/{slug}": {
        get: {
          operationId: "getCampaignDossier",
          summary: "Campaign dossier with attribution, techniques and hunting queries",
          tags: ["Threat Graph"],
          security: [],
          parameters: [{ name: "slug", in: "path", required: true, schema: { type: "string", maxLength: 120 } }],
          responses: {
            "200": { description: "Campaign dossier", content: { "application/json": { schema: { type: "object" } } } },
            "404": { description: "Unknown campaign", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
          },
        },
      },
      "/campaigns/{slug}/navigator.json": {
        get: {
          operationId: "getCampaignNavigatorLayer",
          summary: "MITRE ATT&CK Navigator layer 4.5 for one campaign",
          tags: ["Threat Graph"],
          security: [],
          parameters: [{ name: "slug", in: "path", required: true, schema: { type: "string", maxLength: 120 } }],
          responses: {
            "200": { description: "Navigator layer", content: { "application/json": { schema: { $ref: "#/components/schemas/NavigatorLayer" } } } },
            "404": { description: "Unknown campaign", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
          },
        },
      },
      "/exploits": {
        get: {
          operationId: "getExploitRadar",
          summary: "Exploit & weaponization radar (edge-cached 300s)",
          description: [
            "PHASE 8B — one unified 4-tier model computed from stored facts:",
            "`ACTIVE_KEV` (CISA KEV), `PUBLIC_POC` (verified `cve_pocs`),",
            "`WEAPONIZED_DETECTION` (real Nuclei/Sigma rule keys on the CVE) and",
            "`IMMINENT_EPSS` (EPSS ≥ 0.10 or velocity ≥ 0.05).",
            "A row may satisfy several tiers; `tier` is the strongest and `tiers` lists all of them.",
          ].join("\n"),
          tags: ["Exploits"],
          security: [],
          parameters: [
            {
              name: "tier",
              in: "query",
              description: "Restrict to one weaponization tier.",
              schema: { type: "string", enum: ["all", "kev", "poc", "weaponized", "imminent"], default: "all" },
            },
            {
              name: "q",
              in: "query",
              description: "Case-insensitive CVE / vendor / product search.",
              schema: { type: "string", maxLength: 120 },
            },
            {
              name: "limit",
              in: "query",
              schema: { type: "integer", minimum: 1, maximum: 100, default: 50 },
            },
            {
              name: "offset",
              in: "query",
              schema: { type: "integer", minimum: 0, default: 0 },
            },
          ],
          responses: {
            "200": {
              description: "Tier summary plus paginated radar rows",
              headers: {
                "Cache-Control": { schema: { type: "string" }, description: "Edge-cacheable public read (300s)." },
              },
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      status: { type: "string" },
                      summary: {
                        type: "object",
                        properties: {
                          total_tracked: { type: "integer" },
                          active_kev: { type: "integer" },
                          public_poc: { type: "integer" },
                          weaponized_detection: { type: "integer" },
                          imminent_epss: { type: "integer" },
                          last_poc_sync_at: { type: ["string", "null"] },
                        },
                      },
                      items: { type: "array", items: { type: "object" } },
                      meta: { type: "object" },
                    },
                  },
                },
              },
            },
            "429": { description: "Rate limit exceeded", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
            "503": { description: "Exploit store unavailable", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
          },
        },
      },
      "/techniques": {
        get: {
          operationId: "listTechniques",
          summary: "MITRE ATT&CK technique index (actors and campaigns per technique)",
          tags: ["Threat Graph"],
          parameters: [
            { name: "q", in: "query", description: "Filter by technique id, name or tactic", schema: { type: "string" } },
            { name: "limit", in: "query", schema: { type: "integer", minimum: 1, maximum: 500, default: 50 } },
          ],
          responses: {
            "200": { description: "Technique index", content: { "application/json": { schema: { type: "object" } } } },
          },
        },
      },
      "/techniques/{id}": {
        get: {
          operationId: "getTechnique",
          summary: "One ATT&CK technique with linked actors, campaigns and hunting starters",
          tags: ["Threat Graph"],
          parameters: [
            { name: "id", in: "path", required: true, description: "Technique id, e.g. T1059 or T1059.001", schema: { type: "string" } },
          ],
          responses: {
            "200": { description: "Technique dossier", content: { "application/json": { schema: { type: "object" } } } },
            "404": { description: "Unknown technique", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
          },
        },
      },
      "/detection/rules": {
        get: {
          operationId: "getDetectionRules",
          summary: "Verified Nuclei/Sigma rules for one CVE or one malware family",
          tags: ["Detection"],
          parameters: [
            { name: "cve", in: "query", description: "CVE id (mutually exclusive with `family`)", schema: { type: "string" } },
            { name: "family", in: "query", description: "Malware family keyword", schema: { type: "string" } },
          ],
          responses: {
            "200": { description: "Matched rules", content: { "application/json": { schema: { type: "object" } } } },
            "400": { description: "Neither `cve` nor `family` supplied", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
          },
        },
      },
      "/vulnerabilities": {
        get: {
          operationId: "listVulnerabilities",
          summary: "List published vulnerability records",
          description: [
            "Filterable, newest-first. `priority` is derived from severity:",
            "P0 = CRITICAL, P1 = HIGH, P2 = MEDIUM, P3 = LOW.",
            "Quarantined (`SYNTHETIC_UNVERIFIED`) rows are never returned.",
          ].join("\n"),
          tags: ["Vulnerabilities"],
          security: [{ bearerAuth: [] }, {}],
          parameters: [
            {
              name: "priority",
              in: "query",
              description: "Comma-separated priority band(s): P0, P1, P2, P3.",
              schema: { type: "string", examples: ["P0,P1"] },
            },
            {
              name: "kev",
              in: "query",
              description: "Only records with confirmed in-the-wild exploitation (CISA KEV).",
              schema: { type: "boolean" },
            },
            {
              name: "min_epss",
              in: "query",
              description: "Minimum FIRST EPSS probability in [0,1].",
              schema: { type: "number", minimum: 0, maximum: 1, examples: [0.5] },
            },
            {
              name: "vendor",
              in: "query",
              description: "Case-insensitive substring match on the affected vendor.",
              schema: { type: "string", examples: ["red hat"] },
            },
            {
              name: "severity",
              in: "query",
              description: "Exact severity match.",
              schema: { type: "string", enum: ["CRITICAL", "HIGH", "MEDIUM", "LOW"] },
            },
            {
              name: "limit",
              in: "query",
              description: "Page size (1–100, default 50).",
              schema: { type: "integer", minimum: 1, maximum: 100, default: 50 },
            },
            {
              name: "offset",
              in: "query",
              description: "Page offset.",
              schema: { type: "integer", minimum: 0, default: 0 },
            },
          ],
          responses: {
            "200": {
              description: "A page of vulnerability records",
              headers: {
                "Cache-Control": { schema: { type: "string" }, description: "`public, s-maxage=300` for anonymous reads." },
                "X-RateLimit-Limit": { schema: { type: "string" }, description: "Edge allowance per 60 seconds." },
                "X-Zayron-Tier": { schema: { type: "string" }, description: "Resolved credential tier." },
                "X-Request-Id": { schema: { type: "string" }, description: "Correlation identifier." },
              },
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    required: ["data", "meta"],
                    properties: {
                      data: { type: "array", items: { $ref: "#/components/schemas/Vulnerability" } },
                      meta: {
                        type: "object",
                        properties: {
                          total: { type: "integer" },
                          limit: { type: "integer" },
                          offset: { type: "integer" },
                          degraded: { type: "boolean" },
                        },
                      },
                    },
                  },
                },
              },
            },
            "401": { description: "Invalid, revoked or expired bearer token", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
            "429": {
              description: "Rate limit exceeded",
              headers: { "Retry-After": { schema: { type: "integer" }, description: "Seconds to wait." } },
              content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } },
            },
          },
        },
      },
      "/vulnerabilities/{cveId}": {
        get: {
          operationId: "getVulnerability",
          summary: "Full structured advisory for one CVE",
          tags: ["Vulnerabilities"],
          security: [{ bearerAuth: [] }, {}],
          parameters: [
            {
              name: "cveId",
              in: "path",
              required: true,
              description: "CVE identifier (case-insensitive).",
              schema: { type: "string", pattern: "^CVE-[0-9]{4}-[0-9]{4,}$" },
            },
          ],
          responses: {
            "200": {
              description: "Authoritative facts, strategic assessment, upgrade matrix and linked evidence",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    required: ["data"],
                    properties: {
                      data: {
                        allOf: [
                          { $ref: "#/components/schemas/Vulnerability" },
                          {
                            type: "object",
                            properties: {
                              linked_events: { type: "array", items: { type: "object" } },
                              related_evidence: { type: "array", items: { type: "object" } },
                              related_iocs: { type: "array", items: { type: "object" } },
                            },
                          },
                        ],
                      },
                    },
                  },
                },
              },
            },
            "404": { description: "Unknown or unpublished CVE", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
            "429": { description: "Rate limit exceeded", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
          },
        },
      },
      "/keys/self-serve": {
        post: {
          operationId: "issueSelfServeKey",
          summary: "Issue one free-tier 48-character API token",
          description: [
            "One active free-tier key per email address. Rate limited by client IP.",
            "When `TURNSTILE_SECRET_KEY` is configured the request must also include a",
            "Turnstile token. The plaintext token is returned exactly once and is never",
            "retrievable again; it is stored only as an HMAC-SHA256 digest.",
          ].join("\n"),
          tags: ["Access"],
          security: [],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["email"],
                  properties: {
                    email: { type: "string", format: "email" },
                    organization: { type: "string", maxLength: 200 },
                    turnstile_token: { type: "string" },
                  },
                },
              },
            },
          },
          responses: {
            "201": {
              description: "Key issued. The token field is the only time it is returned.",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    required: ["data"],
                    properties: {
                      data: {
                        type: "object",
                        required: ["token", "tier"],
                        properties: {
                          token: { type: "string", minLength: 48, maxLength: 48, description: "Shown once. Store it immediately." },
                          key_prefix: { type: "string", description: "Non-secret routing prefix." },
                          tier: { type: "string", enum: ["free", "pro", "enterprise"] },
                          scopes: { type: "array", items: { type: "string" } },
                          daily_quota: { type: "integer" },
                          created_at: { type: "string", format: "date-time" },
                        },
                      },
                    },
                  },
                },
              },
            },
            "400": { description: "Malformed body or invalid email", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
            "403": { description: "Turnstile verification failed", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
            "409": { description: "A free-tier key already exists for this email", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
            "429": { description: "Rate limit exceeded", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
            "503": { description: "Key issuance disabled: API_KEY_PEPPER is not configured", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
          },
        },
      },
      "/leads": {
        post: {
          operationId: "createAccessLead",
          summary: "Request Pro or Enterprise access",
          tags: ["Access"],
          security: [],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["email"],
                  properties: {
                    email: { type: "string", format: "email" },
                    organization: { type: "string", maxLength: 200 },
                    use_case: { type: "string", maxLength: 1200 },
                    tier_requested: { type: "string", enum: ["pro", "enterprise"] },
                    source: { type: "string", maxLength: 40 },
                  },
                },
              },
            },
          },
          responses: {
            "202": { description: "Lead captured", content: { "application/json": { schema: { type: "object" } } } },
            "400": { description: "Malformed body or invalid email", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
            "429": { description: "Rate limit exceeded", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
          },
        },
      },
      // ── PHASE 7B — IOC / EDL / STIX ──────────────────────────────────
      "/iocs/stats": {
        get: {
          operationId: "getIocStats",
          summary: "IOC fleet rollup (edge-cached 300s)",
          tags: ["Indicators"],
          security: [],
          responses: {
            "200": {
              description: "Active indicator counts by type, top families, EDL-ready count and latest Radar pulse",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      status: { type: "string" },
                      data: { $ref: "#/components/schemas/IocStats" },
                    },
                  },
                },
              },
            },
            "429": { description: "Rate limit exceeded", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
            "503": { description: "Indicator store unavailable", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
          },
        },
      },
      "/iocs/lookup": {
        get: {
          operationId: "lookupIoc",
          summary: "Look up one indicator (raw or defanged)",
          tags: ["Indicators"],
          security: [{}, { bearerAuth: [] }],
          parameters: [
            {
              name: "q",
              in: "query",
              required: true,
              description: "IP, CIDR, domain, URL or SHA-256. Defanged input (`hxxp://`, `[.]`) is accepted.",
              schema: { type: "string", minLength: 1, maxLength: 512 },
            },
          ],
          responses: {
            "200": {
              description: "Indicator found (ACTIVE or EXPIRED)",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      status: { type: "string", enum: ["SUCCESS"] },
                      found: { type: "boolean" },
                      data: { $ref: "#/components/schemas/IocRecord" },
                    },
                  },
                },
              },
            },
            "400": { description: "Missing or malformed q", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
            "401": { description: "Invalid bearer token", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
            "404": { description: "Indicator not found", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
            "429": { description: "Rate limit exceeded", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
          },
        },
      },
      "/iocs/feed": {
        get: {
          operationId: "getIocFeed",
          summary: "Bulk indicator feed (JSON, CSV or STIX 2.1)",
          tags: ["Indicators"],
          security: [{ bearerAuth: [] }],
          parameters: [
            {
              name: "type",
              in: "query",
              schema: { type: "string", enum: ["ip", "domain", "url", "cidr", "sha256"] },
            },
            { name: "family", in: "query", schema: { type: "string", maxLength: 120 } },
            {
              name: "min_confidence",
              in: "query",
              schema: { type: "integer", minimum: 0, maximum: 100, default: 70 },
            },
            {
              name: "status",
              in: "query",
              schema: { type: "string", enum: ["active", "expired", "any"], default: "active" },
            },
            {
              name: "limit",
              in: "query",
              schema: { type: "integer", minimum: 1, maximum: 500, default: 500 },
            },
            {
              name: "offset",
              in: "query",
              description:
                "PHASE 8A — pagination offset. The response carries `X-Zayron-Next-Cursor` with the next offset, or an empty value at the end of the set.",
              schema: { type: "integer", minimum: 0, default: 0 },
            },
            {
              name: "since",
              in: "query",
              description:
                "PHASE 8A — incremental sync checkpoint (ISO-8601 UTC). Only indicators with `last_seen >= since` are returned, so an OpenCTI, MISP or Splunk connector can resume without re-pulling the corpus.",
              schema: { type: "string", format: "date-time", examples: ["2026-11-01T00:00:00Z"] },
            },
            {
              name: "format",
              in: "query",
              schema: { type: "string", enum: ["json", "csv", "stix"], default: "json" },
            },
          ],
          responses: {
            "200": {
              description: "Indicator feed in the requested format",
              headers: {
                "X-Zayron-Total-Count": { schema: { type: "integer" }, description: "Rows matching the filters before pagination." },
                "X-Zayron-Next-Cursor": { schema: { type: "string" }, description: "Offset of the next page; empty at the end of the set." },
              },
              content: {
                "application/json": { schema: { $ref: "#/components/schemas/IocFeed" } },
                "text/csv": { schema: { type: "string" } },
                "application/stix+json": { schema: { $ref: "#/components/schemas/StixBundle" } },
              },
            },
            "400": { description: "Unsupported format", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
            "401": { description: "Missing, invalid, revoked or expired bearer token", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
            "429": { description: "Rate limit exceeded", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
          },
        },
      },
      "/iocs/bulk": {
        post: {
          operationId: "bulkLookupIocs",
          summary: "Look up up to 50 indicators in one batched request",
          description:
            "PHASE 8A — one batched D1 lookup (no N+1 queries). Defanged input (`hxxp://`, `[.]`) is refanged before matching. Requires a `zx_live_…` bearer token.",
          tags: ["Indicators"],
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["indicators"],
                  properties: {
                    indicators: {
                      type: "array",
                      minItems: 1,
                      maxItems: 50,
                      items: { type: "string", minLength: 1, maxLength: 512 },
                      examples: [["45.9.168.10", "hxxp://evil[.]example/payload", "d41d8cd98f00b204e9800998ecf8427e"]],
                    },
                  },
                },
              },
            },
          },
          responses: {
            "200": {
              description: "Matched and unmatched indicators with a requested/found/active summary",
              content: { "application/json": { schema: { type: "object" } } },
            },
            "400": { description: "Empty, malformed or oversized `indicators` array", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
            "401": { description: "Missing or invalid bearer token", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
            "429": { description: "Rate limit exceeded", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
          },
        },
      },
      "/iocs/edl/{type}": {
        get: {
          operationId: "getIocEdl",
          summary: "Firewall EDL text file (confidence >= 85)",
          tags: ["Indicators"],
          security: [{}, { bearerAuth: [] }],
          parameters: [
            {
              name: "type",
              in: "path",
              required: true,
              schema: { type: "string", enum: ["ip.txt", "domain.txt", "url.txt", "cidr.txt"] },
            },
            {
              name: "preview",
              in: "query",
              description: "Anonymous sample, capped at 25 lines. Ignored when a bearer token is present.",
              schema: { type: "string", enum: ["1"] },
            },
          ],
          responses: {
            "200": { description: "One indicator per line", content: { "text/plain": { schema: { type: "string" } } } },
            "401": { description: "A bearer token or `?preview=1` is required", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
            "404": { description: "Unknown EDL file", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
            "429": { description: "Rate limit exceeded", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
          },
        },
      },

      "/news": {
        get: {
          operationId: "getNewsIndex",
          summary: "Graph-enriched intelligence briefings (edge-cached 300s)",
          description: [
            "Published ZAYRON-X briefings synthesized from a verified official source plus",
            "catalog telemetry. Filter by category or by the entity a briefing mentions;",
            "`total` is the unfiltered-by-page count.",
          ].join("\n"),
          tags: ["Newsroom"],
          security: [],
          parameters: [
            { name: "category", in: "query", schema: { type: "string", enum: ["VULNERABILITY", "EXPLOITATION", "MALWARE", "THREAT_ACTOR", "SUPPLY_CHAIN", "ADVISORY"] } },
            { name: "entity_type", in: "query", schema: { type: "string" } },
            { name: "entity_slug", in: "query", schema: { type: "string" } },
            { name: "q", in: "query", schema: { type: "string", maxLength: 80 } },
            { name: "limit", in: "query", schema: { type: "integer", minimum: 1, maximum: 50, default: 20 } },
            { name: "offset", in: "query", schema: { type: "integer", minimum: 0, default: 0 } },
          ],
          responses: { "200": { description: "Briefing index", content: { "application/json": { schema: { type: "object" } } } } },
        },
      },
      "/news/{slug}": {
        get: {
          operationId: "getNewsBriefing",
          summary: "One briefing with verified mentions, related briefings and graph telemetry",
          tags: ["Newsroom"],
          security: [],
          parameters: [{ name: "slug", in: "path", required: true, schema: { type: "string" } }],
          responses: {
            "200": { description: "Briefing payload", content: { "application/json": { schema: { type: "object" } } } },
            "404": { description: "No published briefing matches this slug" },
          },
        },
      },
      "/vendors": {
        get: {
          operationId: "getVendorHubs",
          summary: "Vendor security hubs (authoritative CVEs only)",
          tags: ["Programmatic Hubs"],
          security: [],
          responses: { "200": { description: "Vendor hub index", content: { "application/json": { schema: { type: "object" } } } } },
        },
      },
      "/vendors/{slug}": {
        get: {
          operationId: "getVendorHub",
          summary: "One vendor hub with verified CVEs, KEV due dates and PoC coverage",
          tags: ["Programmatic Hubs"],
          security: [],
          parameters: [{ name: "slug", in: "path", required: true, schema: { type: "string" } }],
          responses: {
            "200": { description: "Vendor hub", content: { "application/json": { schema: { type: "object" } } } },
            "404": { description: "No authoritative CVE is published for this vendor" },
          },
        },
      },
      "/regions": {
        get: {
          operationId: "getRegionHubs",
          summary: "Regional threat posture hubs (live C2 geography + MITRE target regions)",
          tags: ["Programmatic Hubs"],
          security: [],
          responses: { "200": { description: "Region index", content: { "application/json": { schema: { type: "object" } } } } },
        },
      },
      "/regions/{code}": {
        get: {
          operationId: "getRegionHub",
          summary: "One regional posture hub",
          tags: ["Programmatic Hubs"],
          security: [],
          parameters: [{ name: "code", in: "path", required: true, schema: { type: "string", enum: ["us", "eu", "me", "apac", "global"] } }],
          responses: {
            "200": { description: "Region hub", content: { "application/json": { schema: { type: "object" } } } },
            "404": { description: "Unsupported region code" },
          },
        },
      },
      "/llms.txt": {
        get: {
          operationId: "getLlmsTxt",
          summary: "Live AI discovery index (Markdown, edge-cached)",
          tags: ["Discovery"],
          security: [],
          responses: { "200": { description: "Markdown index", content: { "text/plain": { schema: { type: "string" } } } } },
        },
      },
    },
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "zx_live_<8>_<31>",
          description: BEARER_DESCRIPTION,
        },
      },
      schemas: {
        ThreatActorSummary: {
          type: "object",
          properties: {
            total_actors: { type: "integer" },
            live_observed: { type: "integer" },
            canonical_profiles: { type: "integer" },
            total_campaigns: { type: "integer" },
            mapped_techniques: { type: "integer" },
            live_families: { type: "integer" },
            kev_linked_actors: { type: "integer" },
          },
        },
        ThreatActor: {
          type: "object",
          properties: {
            id: { type: "string" },
            slug: { type: "string" },
            name: { type: "string" },
            aliases: { type: "array", items: { type: "string" } },
            mitre_id: { type: ["string", "null"], example: "G0016" },
            mitre_url: { type: ["string", "null"] },
            motivation: { type: "string", enum: ["Espionage / State-Nexus", "Financial / Ransomware", "Destructive / Hacktivism", "Unattributed / Mixed"] },
            target_sectors: { type: "array", items: { type: "string" } },
            target_regions: { type: "array", items: { type: "string" } },
            summary: { type: "string" },
            technique_count: { type: "integer" },
            software: { type: "array", items: { type: "string" } },
            campaign_count: { type: "integer" },
            activity_tier: { type: "string", enum: ["LIVE_OBSERVED", "CANONICAL_PROFILE"] },
            live_c2_count: { type: "integer", description: "Active indicators in `iocs` for documented software families." },
            live_malware_families: { type: "array", items: { type: "object" } },
            linked_kev_count: { type: "integer" },
            linked_cve_count: { type: "integer" },
            linked_cves: { type: "array", items: { type: "object" } },
            first_seen: { type: ["string", "null"] },
            last_seen: { type: ["string", "null"] },
          },
        },
        Campaign: {
          type: "object",
          properties: {
            id: { type: "string" },
            slug: { type: "string" },
            name: { type: "string" },
            mitre_id: { type: ["string", "null"] },
            mitre_url: { type: ["string", "null"] },
            summary: { type: "string" },
            actors: { type: "array", items: { type: "object" } },
            technique_count: { type: "integer" },
            software: { type: "array", items: { type: "string" } },
            cves: { type: "array", items: { type: "string" } },
            target_sectors: { type: "array", items: { type: "string" } },
            target_regions: { type: "array", items: { type: "string" } },
            activity_tier: { type: "string", enum: ["LIVE_OBSERVED", "CANONICAL_PROFILE"] },
            linked_kev_count: { type: "integer" },
            first_seen: { type: ["string", "null"] },
            last_seen: { type: ["string", "null"] },
          },
        },
        NavigatorLayer: {
          type: "object",
          required: ["name", "versions", "domain", "techniques"],
          properties: {
            name: { type: "string" },
            versions: { type: "object", properties: { attack: { type: "string" }, navigator: { type: "string" }, layer: { type: "string", const: "4.5" } } },
            domain: { type: "string", const: "enterprise-attack" },
            description: { type: "string" },
            techniques: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  techniqueID: { type: "string", pattern: "^T\\d{4}(?:\\.\\d{3})?$" },
                  score: { type: "integer" },
                  color: { type: "string" },
                  comment: { type: "string" },
                },
              },
            },
          },
        },
        Vulnerability: vulnerabilitySchema,
        Error: errorSchema,
        IocRecord: {
          type: "object",
          required: ["type", "value", "confidence", "status"],
          properties: {
            id: { type: "string" },
            type: { type: "string", enum: ["ip", "domain", "url", "cidr", "sha256"] },
            value: { type: "string" },
            defanged: { type: "string", description: "Display-safe form, e.g. `hxxp://evil[.]example`" },
            confidence: { type: "integer", minimum: 0, maximum: 100 },
            status: { type: "string", enum: ["ACTIVE", "EXPIRED"] },
            family: { type: ["string", "null"] },
            sources: { type: "array", items: { type: "string" } },
            seen_count: { type: "integer", minimum: 1 },
            asn: { type: ["string", "null"] },
            asn_name: { type: ["string", "null"] },
            country: { type: ["string", "null"] },
            expires_at: { type: ["string", "null"] },
            radar_enriched_at: { type: ["string", "null"] },
          },
        },
        IocStats: {
          type: "object",
          properties: {
            active_total: { type: "integer" },
            active_by_type: { type: "object", additionalProperties: { type: "integer" } },
            top_families_24h: {
              type: "array",
              items: {
                type: "object",
                properties: { family: { type: "string" }, count: { type: "integer" } },
              },
            },
            openssf_dossiers: { type: "integer" },
            edl_ready: { type: "integer" },
            last_ingest_at: { type: ["string", "null"] },
            latest_radar_pulse: {
              type: ["object", "null"],
              properties: { pulse_date: { type: "string" }, created_at: { type: ["string", "null"] } },
            },
            generated_at: { type: "string", format: "date-time" },
          },
        },
        IocFeed: {
          type: "object",
          properties: {
            status: { type: "string" },
            count: { type: "integer" },
            format: { type: "string" },
            data: { type: "array", items: { $ref: "#/components/schemas/IocRecord" } },
          },
        },
        StixBundle: {
          type: "object",
          required: ["type", "id", "spec_version", "objects"],
          properties: {
            type: { type: "string", const: "bundle" },
            id: { type: "string", pattern: "^bundle--" },
            spec_version: { type: "string", const: "2.1" },
            objects: { type: "array", items: { type: "object" } },
          },
        },
      },
    },
  };
}
