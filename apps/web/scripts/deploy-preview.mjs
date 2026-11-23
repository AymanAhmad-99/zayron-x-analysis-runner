/**
 * CANONICAL guarded PREVIEW deploy entrypoint for the web worker.
 *
 *   ONE ENTRYPOINT → EFFECTIVE CONFIG → FAIL-CLOSED GUARD → DRY-RUN → DEPLOY
 *
 * 1. Resolve the project directory from this file's location (never from cwd).
 * 2. (default) run `prepare-preview.js` to flatten the build-emitted config to
 *    the preview identity.
 * 3. Resolve the EFFECTIVE config — the file Wrangler would actually consume,
 *    by following `.wrangler/deploy/config.json` — and run the guard on it.
 *    The prepare output is NOT trusted; the guard re-reads it from disk.
 * 4. Only if the guard passes: `wrangler deploy --config <that exact file>`
 *    with cwd = project dir. Wrangler therefore consumes precisely the file that
 *    was validated; no default/redirect/cwd resolution is left to chance.
 *
 * Accepted arguments (anything else → exit 1):
 *   --dry-run              resolve + guard + print target; never invokes Wrangler
 *   --env preview          accepted for convenience; any other value → exit 1
 *   --project-dir <dir>    test seam: alternate project directory (fixtures)
 *   --no-prepare           skip the prepare step (guard still runs)
 *
 * Test seam: ZAYRON_WRANGLER_BIN=<node script> replaces Wrangler (fake binary).
 * There is no production fallback branch in this file.
 */
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { evaluateWebPreviewTarget } from "./preview-target-guard.mjs";
import { resolveEffectiveWebConfig, EffectiveConfigError } from "./effective-config.mjs";

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_PROJECT_DIR = path.resolve(SCRIPT_DIR, "..");
const TAG = "[preview-deploy]";

const refuse = (message, code = "REFUSED") => {
  console.error(`${TAG} REFUSED (${code}): ${message}`);
  console.error(`${TAG} no deployment was started.`);
  process.exit(1);
};

function parseArgs(argv) {
  const opts = { dryRun: false, prepare: true, projectDir: DEFAULT_PROJECT_DIR };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--dry-run") opts.dryRun = true;
    else if (arg === "--no-prepare") opts.prepare = false;
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

if (opts.prepare) {
  const prepared = spawnSync(process.execPath, [path.join(SCRIPT_DIR, "prepare-preview.js")], { cwd: opts.projectDir, stdio: "inherit" });
  if (prepared.status !== 0) refuse("prepare-preview failed", "PREPARE_FAILED");
}

let resolved;
try {
  resolved = resolveEffectiveWebConfig(opts.projectDir);
} catch (error) {
  if (error instanceof EffectiveConfigError) refuse(error.message, error.code);
  refuse(error instanceof Error ? error.message : String(error), "RESOLUTION_FAILED");
}

const verdict = evaluateWebPreviewTarget(resolved.config);
if (!verdict.ok) refuse(verdict.reason, verdict.code);

console.log(`${TAG} effective config: ${resolved.configPath}`);
console.log(`${TAG} target verified (${verdict.code}): ${verdict.reason}`);

if (opts.dryRun) {
  console.log(`${TAG} dry-run: would run \`wrangler deploy --config ${resolved.configPath}\`; nothing uploaded or deployed.`);
  process.exit(0);
}

const fakeBin = process.env.ZAYRON_WRANGLER_BIN;
const args = ["deploy", "--config", resolved.configPath];
const result = fakeBin
  ? spawnSync(process.execPath, [fakeBin, ...args], { cwd: opts.projectDir, stdio: "inherit" })
  : spawnSync("npx", ["wrangler", ...args], { cwd: opts.projectDir, stdio: "inherit", shell: process.platform === "win32" });
process.exit(result.status ?? 1);
