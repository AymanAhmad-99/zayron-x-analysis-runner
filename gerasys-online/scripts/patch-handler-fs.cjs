/**
 * Post‑build patch: replace unresolvable `require("node:X")` / `require("X")`
 * in OpenNext handler bundles with Workers‑safe CJS polyfills.
 *
 * WHY: Next.js internals and third‑party libraries import Node.js built‑ins
 * that Cloudflare Workers do not provide.  esbuild (platform="node")
 * externalizes these as bare `require()` calls.  At runtime, Workers throws
 * "No such module" (error code 10021) for any unsupported built‑in.
 *
 * This script copies polyfill stubs into the handler directory and rewrites
 * every unresolvable require() to point at the appropriate stub.
 *
 * Polyfill strategy:
 *   - fs, os  → dedicated stubs with full API surface (safe defaults / ENOSYS)
 *   - all others → universal NOOP stub (module.exports = {})
 *     (these are dead code paths in edge — Sentry Node fallback, Next.js
 *      file‑system helpers, etc. — never actually called at runtime)
 */

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const HANDLER_DIR = path.join(ROOT, ".open-next", "server-functions", "default");
const HANDLER_FILE = path.join(HANDLER_DIR, "handler.mjs");

// ── Registers ───────────────────────────────────────────────

// Dedicated polyfills with real implementations
const DEDICATED_POLYFILLS = [
  {
    name: "fs",
    src: path.join(ROOT, "lib", "polyfills", "fs.cjs"),
    dst: path.join(HANDLER_DIR, "fs.cjs"),
  },
  {
    name: "os",
    src: path.join(ROOT, "lib", "polyfills", "os.cjs"),
    dst: path.join(HANDLER_DIR, "os.cjs"),
  },
];

// Modules nuked with the universal NOOP stub.
// Each entry produces two regexes: require("node:NAME") and require("NAME")
const NOOP_MODULES = [
  "http",
  "https",
  "zlib",
  "child_process",
  "v8",
  "worker_threads",
  "perf_hooks",
  "readline",
  "dns",
];

const NOOP_SRC = path.join(ROOT, "lib", "polyfills", "noop.cjs");
const NOOP_DST = path.join(HANDLER_DIR, "noop.cjs");

// ── Helpers ─────────────────────────────────────────────────

function buildRequirePatterns(name) {
  return [
    // require("node:NAME") and require('node:NAME')
    new RegExp(`require\\(["']node:${escapeRegex(name)}["']\\)`, "g"),
    // require("NAME") and require('NAME')
    new RegExp(`require\\(["']${escapeRegex(name)}["']\\)`, "g"),
  ];
}

function escapeRegex(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function countMatches(code, patterns) {
  let total = 0;
  for (const p of patterns) total += (code.match(p) || []).length;
  return total;
}

// ── Main ───────────────────────────────────────────────────

if (!fs.existsSync(HANDLER_FILE)) {
  console.log("handler.mjs not found — skipping patch.");
  process.exit(0);
}

let code = fs.readFileSync(HANDLER_FILE, "utf-8");
let totalChanges = 0;

// Phase 1 — Dedicated polyfills (fs, os)
for (const poly of DEDICATED_POLYFILLS) {
  fs.copyFileSync(poly.src, poly.dst);
  console.log(`Copied ${poly.name}.cjs to handler directory.`);

  const patterns = buildRequirePatterns(poly.name);
  for (const pattern of patterns) {
    const before = (code.match(pattern) || []).length;
    code = code.replace(pattern, `require("./${poly.name}.cjs")`);
    const after = (code.match(pattern) || []).length;
    totalChanges += before - after;
  }
  console.log(`  ${poly.name}: ${countMatches(code, patterns)} remaining`);
}

// Phase 2 — Universal NOOP stub for everything else
fs.copyFileSync(NOOP_SRC, NOOP_DST);
console.log("Copied noop.cjs to handler directory.");

for (const mod of NOOP_MODULES) {
  const patterns = buildRequirePatterns(mod);
  let modChanges = 0;
  for (const pattern of patterns) {
    const before = (code.match(pattern) || []).length;
    code = code.replace(pattern, 'require("./noop.cjs")');
    const after = (code.match(pattern) || []).length;
    modChanges += before - after;
  }
  totalChanges += modChanges;
  if (modChanges > 0) {
    const labelNode = `node:${mod}`;
    const labelBare = mod;
    const remaining = countMatches(code, patterns);
    console.log(`  ${labelNode}/${labelBare}: ${modChanges} replaced, ${remaining} remaining`);
  }
}

// Phase 3 — Hard validation
let failed = false;
const allModules = [
  ...DEDICATED_POLYFILLS.map((p) => p.name),
  ...NOOP_MODULES,
];

for (const mod of allModules) {
  const patterns = buildRequirePatterns(mod);
  const remaining = countMatches(code, patterns);
  if (remaining > 0) {
    console.error(`  ❌ ${mod}: ${remaining} require() calls could not be replaced!`);
    failed = true;
  }
}

if (failed) {
  console.error("\nFAILED: Some require() calls could not be replaced!");
  process.exit(1);
}

// Phase 4 — Write back
fs.writeFileSync(HANDLER_FILE, code, "utf-8");
console.log(`\nHandler patched successfully (${totalChanges} replacements).`);
