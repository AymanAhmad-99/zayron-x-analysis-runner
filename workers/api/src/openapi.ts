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
        Vulnerability: vulnerabilitySchema,
        Error: errorSchema,
      },
    },
  };
}
