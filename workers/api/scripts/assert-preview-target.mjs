/**
 * API preview deploy guard CLI.
 *
 * Parses `wrangler.toml` (default) or a `--config <path>` fixture and exits
 * non-zero unless `[env.preview]` is unambiguously the preview worker with
 * preview-only bindings. Never deploys, never calls the network.
 *
 * Usage:
 *   node scripts/assert-preview-target.mjs [--config <path>]
 *   node scripts/assert-preview-target.mjs <path>
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parseToml, evaluateApiPreviewTarget } from "./preview-target-guard.mjs";

function resolveConfigPath(argv) {
  const flagIndex = argv.indexOf("--config");
  if (flagIndex !== -1 && argv[flagIndex + 1]) return argv[flagIndex + 1];
  const positional = argv.find((a) => !a.startsWith("--"));
  if (positional) return positional;
  const dir = path.dirname(fileURLToPath(import.meta.url));
  return path.resolve(dir, "..", "wrangler.toml");
}

const configPath = resolveConfigPath(process.argv.slice(2));

if (!fs.existsSync(configPath)) {
  console.error(`[api-preview-guard] FAIL: config not found: ${configPath}`);
  process.exit(1);
}

let doc;
try {
  doc = parseToml(fs.readFileSync(configPath, "utf8"));
} catch (error) {
  console.error(`[api-preview-guard] FAIL: could not parse ${configPath}: ${error instanceof Error ? error.message : error}`);
  process.exit(1);
}

const verdict = evaluateApiPreviewTarget(doc);
if (!verdict.ok) {
  console.error(`[api-preview-guard] FAIL (${verdict.code}): ${verdict.reason}`);
  process.exit(1);
}

console.log(`[api-preview-guard] OK (${verdict.code}): ${verdict.reason}`);
console.log(`[api-preview-guard] target: ${configPath}`);
for (const note of verdict.notes) console.log(`[api-preview-guard] note: ${note}`);
