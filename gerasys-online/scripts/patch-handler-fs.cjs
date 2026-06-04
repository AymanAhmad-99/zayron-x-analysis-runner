/**
 * Post‑build patch: replace `require("node:X")` / `require("X")` in
 * OpenNext handler bundles with Workers‑safe CJS polyfills.
 *
 * WHY: Next.js internals (app‑page runtime, node‑environment, etc.)
 * import `fs` and `os` for Node.js operations.  esbuild externalizes
 * these as bare `require()` calls — unresolvable in Cloudflare Workers.
 *
 * This script:
 * 1. Copies lib/polyfills/{name}.cjs into the handler directory
 * 2. Rewrites require("node:name") → require("./{name}.cjs")
 * 3. Rewrites require("name")      → require("./{name}.cjs")
 * 4. Hard‑exits with code 1 if any require() call remains
 */

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const HANDLER_DIR = path.join(ROOT, ".open-next", "server-functions", "default");
const HANDLER_FILE = path.join(HANDLER_DIR, "handler.mjs");

// ── Polyfill registry ──────────────────────────────────────
// Add new entries here when another Node.js built‑in needs stubbing.
const POLYFILLS = [
  {
    name: "fs",
    src: path.join(ROOT, "lib", "polyfills", "fs.cjs"),
    dst: path.join(HANDLER_DIR, "fs.cjs"),
    // These match require("fs") and require("node:fs") with single or double quotes
    patterns: [/require\(["']node:fs["']\)/g, /require\(["']fs["']\)/g],
    replacement: 'require("./fs.cjs")',
  },
  {
    name: "os",
    src: path.join(ROOT, "lib", "polyfills", "os.cjs"),
    dst: path.join(HANDLER_DIR, "os.cjs"),
    patterns: [/require\(["']node:os["']\)/g, /require\(["']os["']\)/g],
    replacement: 'require("./os.cjs")',
  },
];

// ── Main ───────────────────────────────────────────────────

if (!fs.existsSync(HANDLER_FILE)) {
  console.log("handler.mjs not found — skipping patch.");
  process.exit(0);
}

let code = fs.readFileSync(HANDLER_FILE, "utf-8");
let totalChanges = 0;

for (const poly of POLYFILLS) {
  // 1. Copy polyfill into handler directory
  fs.copyFileSync(poly.src, poly.dst);
  console.log(`Copied ${poly.name}.cjs to handler directory.`);

  // 2. Apply each regex replacement
  for (const pattern of poly.patterns) {
    const before = (code.match(pattern) || []).length;
    code = code.replace(pattern, poly.replacement);
    const after = (code.match(pattern) || []).length;
    const changes = before - after;
    totalChanges += changes;

    const label = pattern.source.includes("node:") ? `node:${poly.name}` : poly.name;
    console.log(`  ${label}: ${before} → ${after}`);
  }
}

// 3. Hard validation — any remaining bare require() means the patch failed
const remainingNodeFs = (code.match(/require\(["']node:fs["']\)/g) || []).length;
const remainingBareFs = (code.match(/require\(["']fs["']\)/g) || []).length;
const remainingNodeOs = (code.match(/require\(["']node:os["']\)/g) || []).length;
const remainingBareOs = (code.match(/require\(["']os["']\)/g) || []).length;

if (remainingNodeFs > 0 || remainingBareFs > 0 ||
    remainingNodeOs > 0 || remainingBareOs > 0) {
  console.error("FAILED: Some require() calls could not be replaced!");
  console.error(`  node:fs = ${remainingNodeFs}, fs = ${remainingBareFs}`);
  console.error(`  node:os = ${remainingNodeOs}, os = ${remainingBareOs}`);
  process.exit(1);
}

// 4. Write back
fs.writeFileSync(HANDLER_FILE, code, "utf-8");
console.log(`Handler patched successfully (${totalChanges} replacements).`);
