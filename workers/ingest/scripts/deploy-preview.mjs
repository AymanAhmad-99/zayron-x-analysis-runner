/**
 * CANONICAL guarded PREVIEW deploy entrypoint for zayron-x-ingest.
 *
 * Guarantees fail-closed isolation:
 * - Refuses if target is not zayron-x-ingest-preview
 * - Refuses if DB is not zayron-x-preview-db
 * - Refuses if INGEST_QUEUE is not zayron-ingest-queue-preview
 * - Refuses if any production database, queue, or hostname is referenced
 * - Executes wrangler deploy --env preview
 */
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { parseToml } from "../../api/scripts/preview-target-guard.mjs";

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_DIR = path.resolve(SCRIPT_DIR, "..");
const TAG = "[ingest-preview-deploy]";

const refuse = (message, code = "REFUSED") => {
  console.error(`${TAG} REFUSED (${code}): ${message}`);
  console.error(`${TAG} no deployment was started.`);
  process.exit(1);
};

/**
 * Strict argument validation — fail closed BEFORE anything can be spawned.
 *
 * The preview environment is established HERE (`--env preview` is hard-coded in
 * the spawn below); this parser exists so an unsupported invocation can never
 * reach Wrangler. Previously this script tested only
 * `process.argv.includes("--dry-run")`, silently ignored every other flag, and
 * spawned `wrangler deploy --env preview` regardless — which is how an audit
 * probe of `--env production` became a real, unapproved preview deployment on
 * 2026-10-13. Every argument not listed here is refused.
 *
 *   --dry-run              resolve + guard + print target; never invokes Wrangler
 *   --env preview          accepted for convenience; any other value → exit 1
 *   --project-dir <dir>    test seam: alternate project directory (fixtures)
 */
function parseArgs(argv) {
  const opts = { dryRun: false, projectDir: PROJECT_DIR };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--dry-run") opts.dryRun = true;
    else if (arg === "--project-dir") {
      const value = argv[++i];
      if (!value) refuse("--project-dir requires a value", "BAD_ARGUMENT");
      opts.projectDir = path.resolve(value);
    } else if (arg === "--env") {
      const value = argv[++i];
      if (value !== "preview") refuse(`--env '${value}' is not allowed; this entrypoint only deploys 'preview'`, "WRONG_ENVIRONMENT_FLAG");
    } else if (arg.startsWith("--env=")) {
      if (arg !== "--env=preview") refuse(`${arg} is not allowed; this entrypoint only deploys 'preview'`, "WRONG_ENVIRONMENT_FLAG");
    } else {
      refuse(`unsupported argument '${arg}' (config/name/route overrides are not accepted)`, "BAD_ARGUMENT");
    }
  }
  return opts;
}

const opts = parseArgs(process.argv.slice(2));

const configPath = path.join(opts.projectDir, "wrangler.toml");
if (!fs.existsSync(configPath)) refuse(`config not found: ${configPath}`, "CONFIG_NOT_FOUND");

let doc;
try {
  doc = parseToml(fs.readFileSync(configPath, "utf8"));
} catch (error) {
  refuse(`could not parse ${configPath}: ${error instanceof Error ? error.message : error}`, "CONFIG_MALFORMED");
}

const preview = doc.env?.preview;
if (!preview) refuse("missing [env.preview] section", "NO_PREVIEW_SECTION");

if (preview.name !== "zayron-x-ingest-preview") {
  refuse(`Worker name in [env.preview] must be 'zayron-x-ingest-preview', found '${preview.name}'`, "BAD_WORKER_NAME");
}

const d1Databases = preview.d1_databases || [];
const dbEntry = d1Databases.find((d) => d.binding === "DB");
if (!dbEntry) refuse("missing DB binding in [env.preview.d1_databases]", "MISSING_DB_BINDING");

if (dbEntry.database_id !== "34962f8f-abd1-4b0b-8bd7-b4eab59bd902" || dbEntry.database_name !== "zayron-x-preview-db") {
  refuse(`DB binding must point to zayron-x-preview-db (34962f8f-abd1-4b0b-8bd7-b4eab59bd902), found ${dbEntry.database_name} (${dbEntry.database_id})`, "BAD_DATABASE");
}

const queueProducers = preview.queues?.producers || [];
const producer = queueProducers.find((q) => q.binding === "INGEST_QUEUE");
if (!producer || producer.queue !== "zayron-ingest-queue-preview") {
  refuse("INGEST_QUEUE producer must be 'zayron-ingest-queue-preview'", "BAD_QUEUE_PRODUCER");
}

const queueConsumers = preview.queues?.consumers || [];
const consumer = queueConsumers.find((q) => q.queue === "zayron-ingest-queue-preview");
if (!consumer) {
  refuse("queue consumer must be 'zayron-ingest-queue-preview'", "BAD_QUEUE_CONSUMER");
}

if (preview.vars?.ENVIRONMENT !== "preview") {
  refuse("ENVIRONMENT var must be 'preview'", "BAD_ENVIRONMENT");
}

if (preview.vars?.LEGACY_FREEZE !== "false") {
  refuse("LEGACY_FREEZE var must be 'false' in preview", "BAD_FREEZE_STATE");
}

console.log(`${TAG} target verified: zayron-x-ingest-preview -> zayron-x-preview-db & zayron-ingest-queue-preview`);
console.log(`${TAG} triggers verified: ${JSON.stringify(preview.triggers?.crons || [])}`);

if (opts.dryRun) {
  console.log(`${TAG} dry-run complete. No deployment performed.`);
  process.exit(0);
}

// Test seam: a fake binary replaces Wrangler so a test can prove that a refused
// invocation never spawns anything, and that a permitted one spawns exactly
// these args. Mirrors the API and Web entrypoints.
const fakeBin = process.env.ZAYRON_WRANGLER_BIN;
const args = ["deploy", "--config", configPath, "--env", "preview"];
const result = fakeBin
  ? spawnSync(process.execPath, [fakeBin, ...args], { cwd: opts.projectDir, stdio: "inherit" })
  : spawnSync("npx", ["wrangler", ...args], {
      cwd: opts.projectDir,
      stdio: "inherit",
      shell: process.platform === "win32",
    });

process.exit(result.status ?? 1);
