/**
 * BOUNDED LIVE PREVIEW SUPPLY VALIDATION — operator runner.
 *
 * Performs EXACTLY the three calls documented in
 * `PREVIEW_SUPPLY_LIVE_VALIDATION_REPORT.md` §9, against the DEPLOYED Preview
 * origin, for ONE CVE identifier:
 *
 *   0. dry-run  → must resolve to the approved PREVIEW database pair
 *   1. supply   → creates the canonical Preview record
 *   2. supply   → identical repeat; must NOT create anything new
 *
 * Fail-closed ordering: call 1 runs only if the dry-run proves the destination
 * is preview, and call 2 runs only if call 1 returned 200. Any destination that
 * names production, any `503 PREVIEW_IDENTITY_REJECTED`, any non-200 supply
 * response, and any canonical entity created by the SECOND call abort the run
 * immediately with a non-zero exit code.
 *
 * The credential is read from the `ADMIN_API_TOKEN` environment variable and is
 * never printed, logged, or written to the evidence file. The token is supplied
 * by the operator at run time; this script does not create, rotate, or persist
 * any credential.
 *
 * Usage:
 *   ADMIN_API_TOKEN=<token> node scripts/verify-live-preview-supply.mjs \
 *     [--cve CVE-2017-1000353] [--out .tmp-preview-supply/live-validation.json]
 *
 * Exit codes:
 *   0  every invariant held (safe to claim live validation)
 *   1  no usable credential in the environment (no network call was made)
 *   2  dry-run failed, or the destination is not the approved preview pair
 *   3  the first supply call did not succeed
 *   4  the repeated supply call created a canonical entity (idempotency breach)
 *   5  transport/parse error
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));

const BASE = "https://zayron-x-api-preview.aabusabih.workers.dev";
const ROUTE = "/api/v1/admin/preview-vulnerability-supply";
const PREVIEW_DB_NAME = "zayron-x-preview-db";
const PREVIEW_DB_ID = "34962f8f-abd1-4b0b-8bd7-b4eab59bd902";
const PRODUCTION_DB_NAME = "zayron-x-db";
const PRODUCTION_DB_ID = "c19c8f45-801b-4034-bd76-402e5e5389b5";

function parseArgs(argv) {
  const opts = {
    cve: "CVE-2017-1000353",
    // Deterministic regardless of the caller's working directory.
    out: path.resolve(SCRIPT_DIR, "..", "..", "..", ".tmp-preview-supply", "live-validation.json"),
  };
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === "--cve") opts.cve = String(argv[++i] ?? "").trim().toUpperCase();
    else if (argv[i] === "--out") opts.out = path.resolve(String(argv[++i] ?? ""));
    else {
      console.error(`[preview-supply] unsupported argument '${argv[i]}'`);
      process.exit(5);
    }
  }
  if (!/^CVE-\d{4}-\d{4,19}$/.test(opts.cve)) {
    console.error("[preview-supply] a single canonical CVE id (CVE-YYYY-NNNN) is required");
    process.exit(5);
  }
  return opts;
}

const opts = parseArgs(process.argv.slice(2));
const token = (process.env.ADMIN_API_TOKEN ?? "").trim();
if (!token) {
  console.error("[preview-supply] ADMIN_API_TOKEN is not set in this shell.");
  console.error("[preview-supply] No network call was made and no credential was read or written.");
  process.exit(1);
}

const evidence = {
  started_at: new Date().toISOString(),
  origin: `${BASE}${ROUTE}`,
  cve_id: opts.cve,
  credential: "ADMIN_API_TOKEN (value never read into this file)",
  dry_run: null,
  supply_first: null,
  supply_repeat: null,
  invariants: {},
};

function redact(value) {
  return JSON.stringify(value ?? null).replaceAll(token, "<redacted>");
}

async function call(body) {
  const response = await fetch(`${BASE}${ROUTE}`, {
    method: "POST",
    headers: { "content-type": "application/json", "X-Admin-Token": token },
    body: JSON.stringify(body),
  });
  const text = await response.text();
  let parsed = null;
  try {
    parsed = JSON.parse(text);
  } catch {
    parsed = { unparsable_body: text.slice(0, 300) };
  }
  return { status: response.status, body: parsed };
}

function destinationIsPreview(destination) {
  return (
    destination?.database_name === PREVIEW_DB_NAME &&
    destination?.database_id === PREVIEW_DB_ID
  );
}

function mentionsProduction(payload) {
  const serialized = JSON.stringify(payload ?? "");
  return serialized.includes(PRODUCTION_DB_NAME) || serialized.includes(PRODUCTION_DB_ID);
}

function writeEvidence() {
  fs.mkdirSync(path.dirname(opts.out), { recursive: true });
  fs.writeFileSync(opts.out, `${JSON.stringify(evidence, null, 2)}\n`, "utf8");
  console.log(`[preview-supply] evidence written to ${opts.out}`);
}

console.log("=== PREVIEW SUPPLY LIVE VALIDATION ===");
console.log(`origin: ${BASE}${ROUTE}`);
console.log(`cve   : ${opts.cve}`);
console.log("credential: ADMIN_API_TOKEN from the environment (never printed)\n");

// ── Step 0 — dry-run: prove the destination BEFORE any write ────────────────
console.log("[0/3] dry-run …");
const dry = await call({ cveId: opts.cve, dryRun: true });
evidence.dry_run = { status: dry.status, body: dry.body };
console.log(`      status ${dry.status} ${redact(dry.body)}`);
if (dry.status !== 200) {
  evidence.invariants.dry_run_ok = false;
  writeEvidence();
  console.error(`[preview-supply] ABORT: dry-run returned ${dry.status}. No supply call was made.`);
  process.exit(2);
}
if (!destinationIsPreview(dry.body?.destination) || mentionsProduction(dry.body)) {
  evidence.invariants.destination_is_preview = false;
  writeEvidence();
  console.error("[preview-supply] ABORT: destination is not the approved preview database pair.");
  process.exit(2);
}
evidence.invariants.destination_is_preview = true;
console.log("      destination verified: zayron-x-preview-db (approved preview pair)\n");

// ── Step 1 — first bounded supply for the single identifier ────────────────
console.log("[1/3] supply (first) …");
const first = await call({ cveId: opts.cve });
evidence.supply_first = { status: first.status, body: first.body };
console.log(`      status ${first.status} ${redact(first.body)}`);
if (first.status !== 200) {
  evidence.invariants.first_supply_ok = false;
  writeEvidence();
  console.error(`[preview-supply] ABORT: first supply call returned ${first.status}. Repeat NOT issued.`);
  process.exit(3);
}
if (mentionsProduction(first.body)) {
  evidence.invariants.first_supply_ok = false;
  writeEvidence();
  console.error("[preview-supply] ABORT: response references a production database identity.");
  process.exit(3);
}
evidence.invariants.first_supply_ok = true;
console.log("");

// ── Step 2 — identical repeat: must create nothing new ─────────────────────
console.log("[2/3] supply (repeat, identical) …");
const repeat = await call({ cveId: opts.cve });
evidence.supply_repeat = { status: repeat.status, body: repeat.body };
console.log(`      status ${repeat.status} ${redact(repeat.body)}`);
console.log("");

const metrics = Array.isArray(repeat.body?.metrics) ? repeat.body.metrics : [];
const created = metrics.reduce((sum, metric) => sum + (Number(metric?.canonicalEntitiesCreated) || 0), 0);
const updated = metrics.reduce((sum, metric) => sum + (Number(metric?.canonicalEntitiesUpdated) || 0), 0);
const duplicates = metrics.reduce((sum, metric) => sum + (Number(metric?.duplicates) || 0), 0);

evidence.invariants.repeat_created_no_canonical_entities = created === 0;
evidence.invariants.repeat_metrics = {
  providers: metrics.map((metric) => ({
    provider: metric?.provider,
    success: metric?.success,
    duplicates: metric?.duplicates,
    canonicalEntitiesCreated: metric?.canonicalEntitiesCreated,
    canonicalEntitiesUpdated: metric?.canonicalEntitiesUpdated,
    error: metric?.error ?? null,
  })),
  canonicalEntitiesCreated: created,
  canonicalEntitiesUpdated: updated,
  duplicates,
  canonical_records: repeat.body?.canonical_records ?? null,
};

writeEvidence();

if (repeat.status !== 200 || created !== 0) {
  console.error("[preview-supply] FAIL: the repeated supply created a canonical entity (idempotency breach).");
  process.exit(4);
}

console.log("[preview-supply] PENDING OPERATOR CHECK:");
console.log("              re-count canonical_vulnerabilities / vulnerabilities / vulnerability_source_records");
console.log(`              for ${opts.cve} and confirm the counts did not increase (report §9 step 8).`);
console.log("[preview-supply] OK: destination is preview, first supply succeeded, repeat created nothing new.");
process.exit(0);
