/**
 * Deterministic, dependency-free PREVIEW target guard for the API worker.
 *
 * Why this exists (Phase F): the API has NO vinext-style config redirection,
 * but `workers/api/package.json` shipped a bare `wrangler deploy`, which resolves
 * to the TOP-LEVEL identity — i.e. PRODUCTION (`zayron-x-api`, routes
 * `zayron-x.co/api/*`, db `zayron-x-db`, bucket `zayron-x-knowledge`,
 * workflow bindings, wait?). There was no preview deploy script at all, so the
 * preview target depended on a human remembering `--env preview`.
 *
 * Wrangler environment inheritance observed via `wrangler deploy --env preview
 * --dry-run` (Phase F recon):
 *   - INHERITED: main, compatibility_date, compatibility_flags
 *   - NOT INHERITED: name, workers_dev, routes, vars, and every binding array
 *     (d1_databases, r2_buckets, queues, services, workflows, vectorize, ai).
 *     Wrangler even warns when top-level `r2_buckets`/`workflows` are absent on
 *     the environment ("not inherited by environments").
 *
 * This module re-derives the effective `[env.preview]` model from the TOML and
 * fails closed unless it is unambiguously the preview worker with preview
 * bindings. It does no I/O, no network, and never deploys.
 */

// --- Known identities / approved preview resources -------------------------

export const API_PREVIEW_WORKER = "zayron-x-api-preview";
export const API_PRODUCTION_WORKER = "zayron-x-api";
export const API_PREVIEW_QUEUE = "zayron-ingest-queue-preview";
export const API_PRODUCTION_QUEUE = "zayron-ingest-queue";
export const API_PREVIEW_DB_NAME = "zayron-x-preview-db";
export const API_PRODUCTION_DB_NAME = "zayron-x-db";
export const API_PREVIEW_DB_ID = "34962f8f-abd1-4b0b-8bd7-b4eab59bd902";
export const API_PRODUCTION_DB_ID = "c19c8f45-801b-4034-bd76-402e5e5389b5";
/** Effective-configuration var declaring the Preview intelligence-supply destination. */
export const API_PREVIEW_SUPPLY_IDENTITY_VAR = "PREVIEW_SUPPLY_DB_IDENTITY";
export const API_PREVIEW_VECTORIZE = "zayron-doc04-staging-index";
export const API_PRODUCTION_VECTORIZE = "zayron-knowledge-index";
export const API_PRODUCTION_R2 = "zayron-x-knowledge";
export const API_PREVIEW_HOST = "zayron-x-api-preview.aabusabih.workers.dev";
export const API_PREVIEW_WEB_ORIGIN = "https://zayron-x-web-preview.aabusabih.workers.dev";
export const API_PRODUCTION_HOSTS = ["zayron-x.co", "www.zayron-x.co"];

// ZX_DB (the canonical malware-report store) in preview. Only two shapes are
// accepted, and both are fail-closed:
//   - absent                 → the preview worker has no canonical report store
//                              (degraded, never production-reachable);
//   - the APPROVED PREVIEW   → isolated; the replica lives in the preview DB.
// The production database identity is NEVER acceptable here: a preview worker
// bound to `zayron-x-db` reaches production data, so `deploy --env preview` must
// refuse rather than rely on that binding staying read-only by hand.
const ZX_DB_ALLOWED_IDS = [API_PREVIEW_DB_ID];

const fail = (code, reason) => ({ ok: false, code, reason, notes: [] });
const ok = (reason, notes = []) => ({ ok: true, code: "PREVIEW_VALID", reason, notes });

// --- Minimal TOML subset parser --------------------------------------------
// Supports: comments, [table], [[array-of-tables]], key = value with strings,
// booleans, numbers, inline tables and arrays (incl. multi-line arrays).

function stripComments(text) {
  let out = "";
  let inStr = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inStr) {
      out += ch;
      if (ch === "\\") {
        out += text[i + 1] ?? "";
        i++;
        continue;
      }
      if (ch === '"') inStr = false;
      continue;
    }
    if (ch === '"') {
      inStr = true;
      out += ch;
      continue;
    }
    if (ch === "#") {
      while (i < text.length && text[i] !== "\n") i++;
      out += "\n";
      continue;
    }
    out += ch;
  }
  return out;
}

function splitStatements(text) {
  const stmts = [];
  let buf = "";
  let depth = 0;
  let inStr = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inStr) {
      buf += ch;
      if (ch === "\\") {
        buf += text[i + 1] ?? "";
        i++;
        continue;
      }
      if (ch === '"') inStr = false;
      continue;
    }
    if (ch === '"') {
      inStr = true;
      buf += ch;
      continue;
    }
    if (ch === "[") depth++;
    if (ch === "]") depth = Math.max(0, depth - 1);
    if (ch === "\n" && depth === 0) {
      stmts.push(buf);
      buf = "";
      continue;
    }
    buf += ch;
  }
  if (buf.trim()) stmts.push(buf);
  return stmts;
}

function splitTopLevel(text, separator) {
  const parts = [];
  let buf = "";
  let depth = 0;
  let inStr = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inStr) {
      buf += ch;
      if (ch === "\\") {
        buf += text[i + 1] ?? "";
        i++;
        continue;
      }
      if (ch === '"') inStr = false;
      continue;
    }
    if (ch === '"') {
      inStr = true;
      buf += ch;
      continue;
    }
    if (ch === "{" || ch === "[") depth++;
    if (ch === "}" || ch === "]") depth--;
    if (ch === separator && depth === 0) {
      parts.push(buf);
      buf = "";
      continue;
    }
    buf += ch;
  }
  parts.push(buf);
  return parts;
}

function parseTomlValue(raw) {
  const s = raw.trim();
  if (s === "") throw new Error("TOML parse error: empty value");
  if (s.startsWith("'") || s.includes('"""') || s.includes("'''")) {
    throw new Error("TOML parse error: literal and multi-line strings are unsupported (fail closed)");
  }
  if (s.startsWith('"')) {
    // quoted string (single-line); unescape common sequences
    let out = "";
    for (let i = 1; i < s.length; i++) {
      const ch = s[i];
      if (ch === "\\") {
        const next = s[i + 1];
        if (next === "n") out += "\n";
        else if (next === "t") out += "\t";
        else out += next;
        i++;
        continue;
      }
      if (ch === '"') break;
      out += ch;
    }
    return out;
  }
  if (s === "true") return true;
  if (s === "false") return false;
  if (/^-?\d+(\.\d+)?$/.test(s)) return Number(s);
  if (s.startsWith("{")) {
    const inner = s.slice(1, s.lastIndexOf("}"));
    const obj = {};
    for (const pair of splitTopLevel(inner, ",")) {
      const eq = pair.indexOf("=");
      if (eq === -1) continue;
      obj[pair.slice(0, eq).trim()] = parseTomlValue(pair.slice(eq + 1));
    }
    return obj;
  }
  if (s.startsWith("[")) {
    const inner = s.slice(1, s.lastIndexOf("]"));
    return splitTopLevel(inner, ",")
      .map((p) => p.trim())
      .filter((p) => p !== "")
      .map(parseTomlValue);
  }
  throw new Error(`TOML parse error: unsupported value '${s.slice(0, 40)}' (fail closed)`);
}

/** Parse a TOML subset into a nested object tree; array-of-tables become arrays. */
const BARE_KEY = /^[A-Za-z0-9_-]+$/;

function headerPath(inner) {
  if (inner.includes('"') || inner.includes("'")) {
    throw new Error("TOML parse error: quoted table headers are unsupported (fail closed)");
  }
  const parts = inner.split(".").map((s) => s.trim());
  if (parts.some((p) => !BARE_KEY.test(p))) {
    throw new Error(`TOML parse error: invalid table header '${inner}'`);
  }
  return parts;
}

export function parseToml(text) {
  const root = {};
  let target = root;
  const seenTables = new Set();

  for (const stmt of splitStatements(stripComments(text))) {
    const line = stmt.trim();
    if (line === "") continue;

    if (line.startsWith("[[") && line.endsWith("]]")) {
      target = descend(root, headerPath(line.slice(2, -2)), true);
      continue;
    }
    if (line.startsWith("[") && line.endsWith("]")) {
      const pathArr = headerPath(line.slice(1, -1));
      const id = pathArr.join(".");
      if (seenTables.has(id)) throw new Error(`TOML parse error: duplicate table [${id}]`);
      seenTables.add(id);
      target = descend(root, pathArr, false);
      continue;
    }

    const eq = line.indexOf("=");
    if (eq === -1) throw new Error(`TOML parse error: statement without '=': ${line.slice(0, 40)}`);
    const key = line.slice(0, eq).trim();
    if (!BARE_KEY.test(key)) {
      throw new Error(`TOML parse error: dotted or quoted key '${key}' is unsupported (fail closed)`);
    }
    if (Object.prototype.hasOwnProperty.call(target, key)) {
      throw new Error(`TOML parse error: duplicate key '${key}'`);
    }
    target[key] = parseTomlValue(line.slice(eq + 1));
  }

  return root;
}

function descend(root, pathArr, arrayOfTables) {
  let node = root;
  for (let i = 0; i < pathArr.length - 1; i++) {
    const key = pathArr[i];
    if (typeof node[key] !== "object" || node[key] === null || Array.isArray(node[key])) {
      if (Array.isArray(node[key])) {
        node = node[key][node[key].length - 1];
        continue;
      }
      node[key] = {};
    }
    node = node[key];
  }
  const last = pathArr[pathArr.length - 1];
  if (arrayOfTables) {
    if (!Array.isArray(node[last])) node[last] = [];
    const entry = {};
    node[last].push(entry);
    return entry;
  }
  if (Array.isArray(node[last])) return node[last][node[last].length - 1];
  if (typeof node[last] !== "object" || node[last] === null) node[last] = {};
  return node[last];
}

// --- Effective preview resolution ------------------------------------------

/**
 * Compute the effective `[env.preview]` config using Wrangler's observed rules
 * (bindings, vars, routes, name, workers_dev are NOT inherited from top level).
 */
export function effectivePreviewEnv(doc) {
  const envPreview = doc?.env?.preview;
  if (!envPreview || typeof envPreview !== "object") return null;
  return {
    name: envPreview.name,
    workers_dev: envPreview.workers_dev,
    routes: envPreview.routes,
    vars: envPreview.vars ?? {},
    d1: Array.isArray(envPreview.d1_databases) ? envPreview.d1_databases : [],
    queues: envPreview.queues ?? {},
    services: Array.isArray(envPreview.services) ? envPreview.services : [],
    vectorize: Array.isArray(envPreview.vectorize) ? envPreview.vectorize : [],
    r2: Array.isArray(envPreview.r2_buckets) ? envPreview.r2_buckets : [],
    workflows: Array.isArray(envPreview.workflows) ? envPreview.workflows : [],
  };
}

const routePatterns = (routes) =>
  Array.isArray(routes) ? routes.map((r) => (typeof r === "string" ? r : r?.pattern)).filter(Boolean) : [];

const findBinding = (arr, binding) => (arr || []).find((b) => b && b.binding === binding);

// Phase F.5: keys the preview environment may carry. Anything else (kv, durable
// objects, hyperdrive, triggers, singular `route`, ...) cannot be classified.
const ALLOWED_PREVIEW_KEYS = new Set([
  "name", "workers_dev", "routes", "vars", "d1_databases", "queues", "services",
  "vectorize", "r2_buckets", "workflows", "ai", "main", "compatibility_date", "compatibility_flags",
]);

const PRODUCTION_IDENTIFIERS = new Set([
  API_PRODUCTION_WORKER, API_PRODUCTION_QUEUE, API_PRODUCTION_DB_ID, API_PRODUCTION_VECTORIZE,
  API_PRODUCTION_R2, "zayron-x-db", "zayron-publish-queue", "zayron-x-ingest",
  "zayron-telegram-collector-do", "zayron-research-workflow", "zayron-knowledge-corpus-workflow",
]);

const hasProductionHost = (s) => typeof s === "string" && API_PRODUCTION_HOSTS.some((h) => s.includes(h));

function findProductionReference(node) {
  if (typeof node === "string") return hasProductionHost(node) || PRODUCTION_IDENTIFIERS.has(node) ? node : null;
  if (Array.isArray(node)) {
    for (const item of node) {
      const hit = findProductionReference(item);
      if (hit) return hit;
    }
    return null;
  }
  if (node && typeof node === "object") {
    for (const value of Object.values(node)) {
      const hit = findProductionReference(value);
      if (hit) return hit;
    }
  }
  return null;
}

/**
 * @param {object} doc parsed wrangler.toml tree
 * @returns {{ok: boolean, code: string, reason: string, notes: string[]}}
 */
export function evaluateApiPreviewTarget(doc) {
  if (doc === null || typeof doc !== "object" || Array.isArray(doc)) {
    return fail("MALFORMED_CONFIG", "config is not a TOML object");
  }

  const preview = effectivePreviewEnv(doc);
  if (!preview) {
    return fail("MISSING_ENVIRONMENT", "config has no [env.preview] — preview target is undefined");
  }

  const name = preview.name;
  if (typeof name !== "string" || name.trim() === "") {
    return fail("MISSING_IDENTITY", "[env.preview] has no worker name (missing target identity)");
  }
  const unknownKey = Object.keys(doc.env.preview).find((k) => !ALLOWED_PREVIEW_KEYS.has(k));
  if (unknownKey) {
    return fail("UNCLASSIFIED_KEY", `[env.preview] has key '${unknownKey}' that cannot be classified as preview-only`);
  }
  if (doc.env.preview.queues && Object.keys(doc.env.preview.queues).some((k) => k !== "producers")) {
    return fail("UNCLASSIFIED_KEY", "[env.preview.queues] has entries other than producers (e.g. consumers) that are unclassified");
  }
  if (name === API_PRODUCTION_WORKER) {
    return fail("PRODUCTION_TARGET", `[env.preview].name is the production worker '${name}'`);
  }
  if (name !== API_PREVIEW_WORKER) {
    return fail("UNKNOWN_WORKER", `[env.preview].name '${name}' is not '${API_PREVIEW_WORKER}'`);
  }

  if (preview.workers_dev !== true) {
    return fail("WORKERS_DEV_DISABLED", `[env.preview].workers_dev must be true (got ${JSON.stringify(preview.workers_dev)})`);
  }

  if (!Array.isArray(preview.routes)) {
    return fail("MISSING_ROUTES", "[env.preview] has no routes; preview routes are ambiguous");
  }
  const patterns = routePatterns(preview.routes);
  if (patterns.length !== 0) {
    const leaked = patterns.some((p) => API_PRODUCTION_HOSTS.some((h) => p.startsWith(h)));
    return fail(
      leaked ? "PRODUCTION_ROUTE_LEAK" : "ROUTES_PRESENT",
      `[env.preview].routes must be [] but has ${JSON.stringify(patterns)}`,
    );
  }

  const vars = preview.vars ?? {};
  if (vars.ENVIRONMENT === undefined) {
    return fail("MISSING_ENVIRONMENT", "[env.preview.vars].ENVIRONMENT is missing");
  }
  if (vars.ENVIRONMENT !== "preview") {
    return fail("UNKNOWN_ENVIRONMENT", `[env.preview.vars].ENVIRONMENT is '${vars.ENVIRONMENT}', expected 'preview'`);
  }

  const origins = typeof vars.ALLOWED_ORIGINS === "string" ? vars.ALLOWED_ORIGINS : "";
  if (!origins.includes(API_PREVIEW_WEB_ORIGIN)) {
    return fail("MISSING_PREVIEW_ORIGIN", `[env.preview.vars].ALLOWED_ORIGINS does not include ${API_PREVIEW_WEB_ORIGIN}`);
  }

  const db = findBinding(preview.d1, "DB");
  if (!db) return fail("MISSING_PREVIEW_D1", "[env.preview] has no DB (D1) binding");
  if (db.database_id === API_PRODUCTION_DB_ID) {
    return fail("PRODUCTION_D1_BINDING", "[env.preview].DB points at the production database");
  }
  if (db.database_id !== API_PREVIEW_DB_ID) {
    return fail("UNKNOWN_PREVIEW_D1", `[env.preview].DB database_id '${db.database_id}' is not the preview database`);
  }

  const zxdb = findBinding(preview.d1, "ZX_DB");
  if (zxdb) {
    if (zxdb.database_id === API_PRODUCTION_DB_ID) {
      return fail(
        "PREVIEW_ZX_DB_PRODUCTION",
        "BLOCKER: [env.preview].ZX_DB points at the PRODUCTION database 'zayron-x-db'. " +
          "A preview worker bound to it reads production data. Remove the binding, or point it at the approved preview database.",
      );
    }
    if (!ZX_DB_ALLOWED_IDS.includes(zxdb.database_id)) {
      return fail(
        "UNKNOWN_ZXDB",
        `[env.preview].ZX_DB database_id '${zxdb.database_id}' is neither absent nor the approved preview database`,
      );
    }
  }

  // Preview intelligence supply destination, declared as effective configuration
  // ("<database_name>:<database_id>"). Fail-closed in every direction: malformed,
  // production, unknown, or disagreeing with the [env.preview].DB binding all
  // refuse the deploy, so preview ingestion can never be aimed at production and
  // can never write to a database other than the one this environment reads.
  const supplyIdentity = vars[API_PREVIEW_SUPPLY_IDENTITY_VAR];
  if (supplyIdentity !== undefined) {
    if (typeof supplyIdentity !== "string" || supplyIdentity.split(":").length !== 2 || supplyIdentity.split(":").some((p) => p.trim() === "")) {
      return fail(
        "PREVIEW_SUPPLY_IDENTITY_MALFORMED",
        `[env.preview.vars].${API_PREVIEW_SUPPLY_IDENTITY_VAR} must be "<database_name>:<database_id>"`,
      );
    }
    const [supplyName, supplyId] = supplyIdentity.split(":").map((p) => p.trim());
    if (supplyName === API_PRODUCTION_DB_NAME || supplyId === API_PRODUCTION_DB_ID) {
      return fail(
        "PREVIEW_SUPPLY_IDENTITY_PRODUCTION",
        "BLOCKER: [env.preview.vars]." + API_PREVIEW_SUPPLY_IDENTITY_VAR +
          " names the PRODUCTION database. Preview ingestion is barred from production data by design.",
      );
    }
    if (supplyName !== API_PREVIEW_DB_NAME || supplyId !== API_PREVIEW_DB_ID) {
      return fail(
        "PREVIEW_SUPPLY_IDENTITY_MISMATCH",
        `[env.preview.vars].${API_PREVIEW_SUPPLY_IDENTITY_VAR} '${supplyIdentity}' is not the approved preview database`,
      );
    }
    if (db.database_id !== supplyId) {
      return fail(
        "PREVIEW_SUPPLY_IDENTITY_CONFLICT",
        `[env.preview.vars].${API_PREVIEW_SUPPLY_IDENTITY_VAR} declares ${supplyName} but [env.preview].DB binds '${db.database_id}'`,
      );
    }
  }

  const producers = preview.queues?.producers ?? [];
  const ingestQueue = findBinding(producers, "INGEST_QUEUE");
  if (!ingestQueue) return fail("MISSING_PREVIEW_QUEUE", "[env.preview] has no INGEST_QUEUE producer");
  if (ingestQueue.queue === API_PRODUCTION_QUEUE) {
    return fail("PRODUCTION_QUEUE_BINDING", "[env.preview].INGEST_QUEUE points at the production queue");
  }
  if (ingestQueue.queue !== API_PREVIEW_QUEUE) {
    return fail("UNKNOWN_PREVIEW_QUEUE", `[env.preview].INGEST_QUEUE '${ingestQueue.queue}' is not the preview queue`);
  }

  for (const [binding, expected] of [
    ["INGEST", "zayron-x-ingest-preview"],
    ["TELEGRAM_COLLECTOR_SERVICE", "zayron-telegram-collector-do-preview"],
  ]) {
    const svc = findBinding(preview.services, binding);
    if (!svc) return fail("MISSING_PREVIEW_SERVICE", `[env.preview] has no ${binding} service binding`);
    if (["zayron-x-ingest", "zayron-telegram-collector-do"].includes(svc.service)) {
      return fail("PRODUCTION_SERVICE_BINDING", `[env.preview].${binding} points at the production service '${svc.service}'`);
    }
    if (svc.service !== expected) {
      return fail("UNKNOWN_PREVIEW_SERVICE", `[env.preview].${binding} '${svc.service}' is not '${expected}'`);
    }
  }

  const vec = findBinding(preview.vectorize, "VECTORIZE");
  if (!vec) return fail("MISSING_PREVIEW_VECTORIZE", "[env.preview] has no VECTORIZE binding");
  if (vec.index_name === API_PRODUCTION_VECTORIZE) {
    return fail("PRODUCTION_VECTORIZE_BINDING", "[env.preview].VECTORIZE points at the production index");
  }
  if (vec.index_name !== API_PREVIEW_VECTORIZE) {
    return fail("UNKNOWN_PREVIEW_VECTORIZE", `[env.preview].VECTORIZE '${vec.index_name}' is not a staging index`);
  }

  // Independent signal: production identifiers/hosts anywhere in the effective
  // preview env. The only accepted exception is ALLOWED_ORIGINS, which is a CORS
  // allow-list rather than a binding. ZX_DB is NOT exempt: both its database_id
  // and its database_name are scanned here as well as checked above.
  const { ALLOWED_ORIGINS: _cors, ...otherVars } = vars;
  const scanned = {
    name, routes: preview.routes, vars: otherVars, queues: preview.queues, services: preview.services,
    vectorize: preview.vectorize, r2: preview.r2, workflows: preview.workflows,
    d1: preview.d1,
  };
  const leaked = findProductionReference(scanned);
  if (leaked) {
    return fail("PRODUCTION_REFERENCE", `[env.preview] contains production reference '${leaked}'`);
  }

  const notes = [];
  const r2 = findBinding(preview.r2, "KNOWLEDGE_BUCKET");
  if (r2) {
    if (r2.bucket_name === API_PRODUCTION_R2) {
      return fail("PRODUCTION_R2_BINDING", "[env.preview].KNOWLEDGE_BUCKET points at the production R2 bucket");
    }
  } else {
    notes.push("KNOWLEDGE_BUCKET (R2) is not defined on env.preview and is NOT inherited by Wrangler — the preview worker has no R2 binding.");
  }
  if (preview.workflows.length === 0) {
    notes.push("Workflow bindings are not defined on env.preview and are NOT inherited by Wrangler — the preview worker has no Workflow bindings.");
  }

  return ok(`${name} (workers.dev, routes=[], preview D1/queue/service/vectorize)`, notes);
}
