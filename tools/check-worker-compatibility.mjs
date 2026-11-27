// ZAYRON-X — Worker compatibility consistency guard (ZX-32).
//
// Every Worker and the web app must declare the SAME Cloudflare compatibility
// date and flag set. Drift here is silent and dangerous: one Worker compiled at
// an older date can behave differently (nodejs_compat, fetch, timers) from the
// rest of the system, and nothing in the build fails.
//
// Zero dependencies, read-only. Exits 1 on any drift or missing declaration.
import fs from "node:fs";
import path from "node:path";

/** The single compatibility contract for this repository. */
const BASELINE = {
  compatibility_date: "2025-09-23",
  compatibility_flags: ["nodejs_compat"],
};

const CONFIG_FILES = [
  "wrangler.toml",
  "workers/api/wrangler.toml",
  "workers/ingest/wrangler.toml",
  "workers/mail/wrangler.toml",
  "workers/malware-validation/wrangler.toml",
  "workers/source-fabric/wrangler.toml",
  "workers/telegram-collector-do/wrangler.toml",
  "workers/telegram-collector-do/wrangler.preview.toml",
  "apps/web/wrangler.jsonc",
  "apps/web/wrangler.holding.jsonc",
];

/** Strip // and /* *\/ comments from JSONC without touching string contents. */
function stripJsonComments(source) {
  let out = "";
  let inString = false;
  let inLine = false;
  let inBlock = false;
  for (let i = 0; i < source.length; i++) {
    const ch = source[i];
    const next = source[i + 1];
    if (inLine) {
      if (ch === "\n") {
        inLine = false;
        out += ch;
      }
      continue;
    }
    if (inBlock) {
      if (ch === "*" && next === "/") {
        inBlock = false;
        i++;
      }
      continue;
    }
    if (inString) {
      out += ch;
      if (ch === "\\") {
        out += next ?? "";
        i++;
      } else if (ch === '"') {
        inString = false;
      }
      continue;
    }
    if (ch === '"') {
      inString = true;
      out += ch;
      continue;
    }
    if (ch === "/" && next === "/") {
      inLine = true;
      i++;
      continue;
    }
    if (ch === "/" && next === "*") {
      inBlock = true;
      i++;
      continue;
    }
    out += ch;
  }
  return out;
}

function readTopLevel(source) {
  if (source.trimStart().startsWith("{")) {
    const parsed = JSON.parse(stripJsonComments(source));
    return {
      date: parsed.compatibility_date ?? null,
      flags: Array.isArray(parsed.compatibility_flags) ? [...parsed.compatibility_flags].sort() : [],
    };
  }
  // TOML: only the TOP-LEVEL keys count. A line after a table header belongs to
  // that table and must not be mistaken for a root declaration.
  let inTable = false;
  let date = null;
  let flags = [];
  for (const rawLine of source.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    if (line.startsWith("[")) {
      inTable = true;
      continue;
    }
    if (inTable) continue;
    const dateMatch = /^compatibility_date\s*=\s*"([^"]+)"/.exec(line);
    if (dateMatch) date = dateMatch[1];
    const flagsMatch = /^compatibility_flags\s*=\s*\[(.*)\]/.exec(line);
    if (flagsMatch) {
      flags = [...flagsMatch[1].matchAll(/"([^"]+)"/g)].map((m) => m[1]).sort();
    }
  }
  return { date, flags };
}

const rows = [];
const problems = [];

for (const file of CONFIG_FILES) {
  if (!fs.existsSync(file)) {
    problems.push(`${file}: MISSING`);
    continue;
  }
  const { date, flags } = readTopLevel(fs.readFileSync(file, "utf8"));
  if (!date) problems.push(`${file}: no top-level compatibility_date`);
  else if (date !== BASELINE.compatibility_date) {
    problems.push(`${file}: compatibility_date=${date} (baseline ${BASELINE.compatibility_date})`);
  }
  const baselineFlags = [...BASELINE.compatibility_flags].sort();
  if (flags.join(",") !== baselineFlags.join(",")) {
    problems.push(`${file}: compatibility_flags=[${flags.join(", ")}] (baseline [${baselineFlags.join(", ")}])`);
  }
  rows.push({ file, date: date ?? "(missing)", flags: flags.join(", ") || "(none)" });
}

console.log("Worker compatibility inventory:");
for (const row of rows) console.log(`  ${row.date}  [${row.flags}]  ${row.file}`);

if (problems.length) {
  console.error(`\nWORKER_COMPAT_DRIFT: ${problems.length} problem(s)`);
  for (const problem of problems) console.error(`  - ${problem}`);
  process.exit(1);
}

console.log(`\nWORKER_COMPAT_OK: ${rows.length} configs at ${BASELINE.compatibility_date} [${BASELINE.compatibility_flags.join(", ")}]`);
