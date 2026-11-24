/**
 * Deterministic, dependency-free PREVIEW target evaluator for the web worker.
 *
 * Context (Phase E incident): vinext redirects Wrangler to the build-emitted
 * `dist/server/wrangler.json` ("Using redirected Wrangler configuration"). That
 * emitted file carries the top-level PRODUCTION identity, so a bare
 * `wrangler deploy` — even with `--env preview` — targets production unless the
 * redirect target is rewritten to the preview identity first.
 *
 * This module is pure: it only inspects an already-parsed config object and
 * returns a verdict. It performs no I/O, no network calls, and never deploys.
 * Phase F.5: the verdict is based on MULTIPLE independent signals (identity,
 * routes, host strings, bindings, production identifiers anywhere in the
 * config) and any binding that cannot be classified is rejected.
 */

export const WEB_PREVIEW_WORKER = "zayron-x-web-preview";
export const WEB_PREVIEW_HOST = "zayron-x-web-preview.aabusabih.workers.dev";
export const WEB_PREVIEW_API_WORKER = "zayron-x-api-preview";
export const WEB_PREVIEW_API_HOST = `${WEB_PREVIEW_API_WORKER}.aabusabih.workers.dev`;
export const WEB_PRODUCTION_WORKER = "zayron-x-web";
export const WEB_PRODUCTION_HOSTS = ["zayron-x.co", "www.zayron-x.co"];
/** Production API on workers.dev (distinct from the `-preview` API host). */
export const WEB_PRODUCTION_API_HOST = "zayron-x-api.aabusabih.workers.dev";

/** Exact-match production identifiers that must never appear in a preview config. */
const PRODUCTION_IDENTIFIERS = new Set([
  "zayron-x-web",
  "zayron-x-api",
  "zayron-x-db",
  "c19c8f45-801b-4034-bd76-402e5e5389b5",
  "zayron-ingest-queue",
  "zayron-publish-queue",
  "zayron-x-knowledge",
  "zayron-knowledge-index",
  "zayron-x-ingest",
  "zayron-telegram-collector-do",
  "zayron-research-workflow",
  "zayron-knowledge-corpus-workflow",
]);

/** Wrangler/vinext metadata keys that legitimately echo the top-level name. */
const METADATA_KEYS = new Set(["topLevelName", "configPath", "userConfigPath", "definedEnvironments"]);

/** Binding-bearing keys. The web preview worker legitimately has none. */
const BINDING_KEYS = [
  "d1_databases",
  "r2_buckets",
  "queues",
  "services",
  "vectorize",
  "workflows",
  "kv_namespaces",
  "hyperdrive",
  "durable_objects",
  "analytics_engine_datasets",
  "send_email",
  "ai",
  "browser",
  "mtls_certificates",
  "dispatch_namespaces",
  "pipelines",
  "secrets_store_secrets",
  "vpc_services",
  "unsafe",
];

const fail = (code, reason) => ({ ok: false, code, reason });

const containsProductionHost = (value) =>
  typeof value === "string" &&
  (WEB_PRODUCTION_HOSTS.some((host) => value.includes(host)) || value.includes(WEB_PRODUCTION_API_HOST));

const isEmptyValue = (v) => {
  if (v === undefined || v === null) return true;
  if (Array.isArray(v)) return v.every(isEmptyValue);
  if (typeof v === "object") return Object.values(v).every(isEmptyValue);
  return false;
};

/** Returns the first production indicator found in `node`, or null. */
function findProductionReference(node, keyName = "") {
  if (METADATA_KEYS.has(keyName)) return null;
  if (typeof node === "string") {
    if (containsProductionHost(node)) return node;
    if (PRODUCTION_IDENTIFIERS.has(node)) return node;
    return null;
  }
  if (Array.isArray(node)) {
    for (const item of node) {
      const hit = findProductionReference(item, keyName);
      if (hit) return hit;
    }
    return null;
  }
  if (node && typeof node === "object") {
    for (const [k, v] of Object.entries(node)) {
      const hit = findProductionReference(v, k);
      if (hit) return hit;
    }
  }
  return null;
}

/**
 * @param {unknown} cfg parsed contents of the EFFECTIVE (redirected) wrangler config
 * @returns {{ok: boolean, code: string, reason: string}}
 */
export function evaluateWebPreviewTarget(cfg) {
  if (cfg === null || typeof cfg !== "object" || Array.isArray(cfg)) {
    return fail("MALFORMED_CONFIG", "config is not a JSON object");
  }

  const name = cfg.name;
  if (typeof name !== "string" || name.trim() === "") {
    return fail("MISSING_IDENTITY", "config has no worker name (missing target identity)");
  }
  if (name === WEB_PRODUCTION_WORKER) {
    return fail("PRODUCTION_TARGET", `worker name '${name}' is the production worker — refusing to deploy`);
  }
  if (name !== WEB_PREVIEW_WORKER) {
    return fail("UNKNOWN_WORKER", `worker name '${name}' is not the preview worker '${WEB_PREVIEW_WORKER}'`);
  }

  if (cfg.workers_dev !== true) {
    return fail(
      "WORKERS_DEV_DISABLED",
      `workers_dev must be true (got ${JSON.stringify(cfg.workers_dev)}) — production-shaped target`,
    );
  }

  if (cfg.route !== undefined && cfg.route !== null) {
    return fail("ROUTES_PRESENT", "singular `route` is set; preview must have no routes");
  }
  if (!Array.isArray(cfg.routes)) {
    return fail("MISSING_ROUTES", "config has no routes field; routes presence is ambiguous");
  }
  if (cfg.routes.length !== 0) {
    const patterns = cfg.routes
      .map((r) => (typeof r === "string" ? r : r?.pattern))
      .filter(Boolean);
    const leaked = patterns.some(
      (p) => containsProductionHost(p) || WEB_PRODUCTION_HOSTS.some((h) => p.startsWith(h)),
    );
    return fail(
      leaked ? "PRODUCTION_ROUTE_LEAK" : "ROUTES_PRESENT",
      `preview config must have routes=[] but has ${JSON.stringify(patterns)}` +
        (leaked ? " (production route leakage)" : ""),
    );
  }

  // A redirected preview config must be flattened: leftover environment blocks
  // mean the caller did not run `prepare:preview`, so identity is ambiguous.
  if (cfg.env && typeof cfg.env === "object" && Object.keys(cfg.env).length > 0) {
    return fail(
      "AMBIGUOUS_ENV_BLOCK",
      "config still carries an `env` block; preview target is ambiguous",
    );
  }

  const vars = cfg.vars && typeof cfg.vars === "object" ? cfg.vars : {};

  const environment = vars.ENVIRONMENT;
  if (environment === undefined) {
    return fail("MISSING_ENVIRONMENT", "config has no vars.ENVIRONMENT (missing environment)");
  }
  if (environment !== "preview") {
    return fail("UNKNOWN_ENVIRONMENT", `vars.ENVIRONMENT is '${environment}', expected 'preview'`);
  }

  const siteUrl = vars.NEXT_PUBLIC_SITE_URL;
  if (siteUrl === undefined) {
    return fail("MISSING_SITE_URL", "config has no vars.NEXT_PUBLIC_SITE_URL (preview host unverified)");
  }
  if (containsProductionHost(siteUrl)) {
    return fail("PRODUCTION_SITE_URL", `NEXT_PUBLIC_SITE_URL points at production: ${siteUrl}`);
  }
  if (typeof siteUrl !== "string" || !siteUrl.includes(WEB_PREVIEW_HOST)) {
    return fail("WRONG_PREVIEW_HOST", `NEXT_PUBLIC_SITE_URL is not the preview host: ${siteUrl}`);
  }

  // Phase F.5: the preview API target is REQUIRED (previously optional).
  const apiBase = vars.NEXT_PUBLIC_API_BASE_URL;
  if (apiBase === undefined) {
    return fail("MISSING_API_TARGET", "config has no vars.NEXT_PUBLIC_API_BASE_URL (preview API unverified)");
  }
  if (containsProductionHost(apiBase)) {
    return fail("PRODUCTION_API_BINDING", `NEXT_PUBLIC_API_BASE_URL points at production: ${apiBase}`);
  }
  if (typeof apiBase !== "string" || !apiBase.includes(WEB_PREVIEW_API_HOST)) {
    return fail("WRONG_PREVIEW_API", `NEXT_PUBLIC_API_BASE_URL is not the preview API: ${apiBase}`);
  }

  if (containsProductionHost(name)) {
    return fail("PRODUCTION_TARGET", "worker identity contains a production hostname");
  }

  // Gate 3A.2: the ONE permitted binding is the `API` service binding to the
  // preview API worker (Error 1042 fix). It is validated exactly; anything else
  // stays rejected.
  if (!isEmptyValue(cfg.services)) {
    if (!Array.isArray(cfg.services)) {
      return fail("UNCLASSIFIED_BINDING", "`services` must be an array of service bindings");
    }
    for (const entry of cfg.services) {
      const service = entry && typeof entry === "object" ? entry.service : undefined;
      const bindingName = entry && typeof entry === "object" ? entry.binding : undefined;
      if (service !== WEB_PREVIEW_API_WORKER || bindingName !== "API") {
        return fail(
          "PRODUCTION_BINDING",
          `service binding ${JSON.stringify(entry)} must be {binding:'API', service:'${WEB_PREVIEW_API_WORKER}'}`,
        );
      }
    }
  }

  // Independent signal: bindings. Besides the preview API binding validated
  // above, the web preview worker has none; anything else is rejected.
  for (const key of BINDING_KEYS) {
    if (key === "services") continue;
    if (!isEmptyValue(cfg[key])) {
      const production = findProductionReference(cfg[key]);
      return fail(
        production ? "PRODUCTION_BINDING" : "UNCLASSIFIED_BINDING",
        production
          ? `binding '${key}' references production resource '${production}'`
          : `binding '${key}' is present but cannot be classified as preview-only`,
      );
    }
  }

  // Independent signal: production identifiers/hosts anywhere else in the config.
  const leaked = findProductionReference(cfg);
  if (leaked) {
    return fail("PRODUCTION_REFERENCE", `config contains production reference '${leaked}'`);
  }

  return { ok: true, code: "PREVIEW_VALID", reason: `${name} (workers.dev, routes=[], no bindings, preview API + host)` };
}
