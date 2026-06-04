/**
 * Post‑build patch: replace `require("node:fs")` / `require("fs")` in
 * OpenNext handler bundles with a Workers‑safe CJS polyfill.
 *
 * WHY: Next.js internals (app‑page runtime, node‑environment, etc.)
 * import `fs` for file‑system ops.  esbuild externalizes these as
 * `require("node:fs")` — unresolvable in Cloudflare Workers.
 *
 * This script:
 * 1. Copies lib/polyfills/fs.cjs into the handler directory
 * 2. Rewrites require("node:fs") → require("./fs-polyfill.cjs")
 * 3. Rewrites require("fs")      → require("./fs-polyfill.cjs")
 */

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const HANDLER_DIR = path.join(ROOT, ".open-next", "server-functions", "default");
const HANDLER_FILE = path.join(HANDLER_DIR, "handler.mjs");
const POLYFILL_SRC = path.join(ROOT, "lib", "polyfills", "fs.cjs");
const POLYFILL_DST = path.join(HANDLER_DIR, "fs-polyfill.cjs");

if (!fs.existsSync(HANDLER_FILE)) {
  console.log("handler.mjs not found — skipping patch.");
  process.exit(0);
}

// 1. Copy polyfill
fs.copyFileSync(POLYFILL_SRC, POLYFILL_DST);
console.log("Copied fs polyfill to handler directory.");

// 2. Read handler
let code = fs.readFileSync(HANDLER_FILE, "utf-8");

// 3. Replace require("node:fs") → require("./fs-polyfill.cjs")
const nodeFsBefore = (code.match(/require\(["']node:fs["']\)/g) || []).length;
code = code.replace(/require\(["']node:fs["']\)/g, 'require("./fs-polyfill.cjs")');
const nodeFsAfter = (code.match(/require\(["']node:fs["']\)/g) || []).length;

// 4. Replace require("fs") → require("./fs-polyfill.cjs")
const bareFsBefore = (code.match(/require\(["']fs["']\)/g) || []).length;
code = code.replace(/require\(["']fs["']\)/g, 'require("./fs-polyfill.cjs")');
const bareFsAfter = (code.match(/require\(["']fs["']\)/g) || []).length;

console.log(`node:fs: ${nodeFsBefore} → ${nodeFsAfter}`);
console.log(`fs     : ${bareFsBefore} → ${bareFsAfter}`);

// 5. Verify
if (nodeFsAfter > 0 || bareFsAfter > 0) {
  console.error("FAILED: Some fs imports could not be replaced!");
  process.exit(1);
}

// 6. Write back
fs.writeFileSync(HANDLER_FILE, code, "utf-8");
console.log("Handler patched successfully.");
