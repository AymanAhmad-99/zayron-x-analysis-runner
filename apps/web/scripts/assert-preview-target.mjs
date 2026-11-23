/**
 * Web preview guard CLI (read-only; never deploys).
 *
 * Resolves the EFFECTIVE config (follows `.wrangler/deploy/config.json`) and
 * exits non-zero unless it is the dedicated preview target.
 *
 * Usage: node scripts/assert-preview-target.mjs [--project-dir <dir>]
 */
import path from "node:path";
import { fileURLToPath } from "node:url";
import { evaluateWebPreviewTarget } from "./preview-target-guard.mjs";
import { resolveEffectiveWebConfig, EffectiveConfigError } from "./effective-config.mjs";

const argv = process.argv.slice(2);
let projectDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
for (let i = 0; i < argv.length; i++) {
  if (argv[i] === "--project-dir" && argv[i + 1]) projectDir = path.resolve(argv[++i]);
  else {
    console.error(`[preview-guard] FAIL: unsupported argument '${argv[i]}'`);
    process.exit(1);
  }
}

try {
  const { configPath, config } = resolveEffectiveWebConfig(projectDir);
  const verdict = evaluateWebPreviewTarget(config);
  if (!verdict.ok) {
    console.error(`[preview-guard] FAIL (${verdict.code}): ${verdict.reason}`);
    process.exit(1);
  }
  console.log(`[preview-guard] OK (${verdict.code}): ${verdict.reason}`);
  console.log(`[preview-guard] effective config: ${configPath}`);
} catch (error) {
  const code = error instanceof EffectiveConfigError ? error.code : "RESOLUTION_FAILED";
  console.error(`[preview-guard] FAIL (${code}): ${error instanceof Error ? error.message : error}`);
  process.exit(1);
}
