#!/usr/bin/env node
/**
 * PHASE 10B-1 — zero-friction Telegram channel importer.
 *
 *   node tools/import-telegram-channels.mjs <input.json|channels.txt> [--apply]
 *
 * Accepts a Telegram Desktop `result.json` export or a plain `.txt` / `.csv` list
 * of `@usernames` and `https://t.me/...` links, then:
 *
 *   1. writes `tmp/seed-telegram-sources.sql` — an idempotent D1 seed for every
 *      PUBLIC channel (language and region detected from the title script);
 *   2. writes `tmp/private-channels-queue.json` — private / invite-only channels
 *      for the Phase 10B-3 MTProto collector (never polled over public HTML);
 *   3. prints a public/private and per-region breakdown.
 *
 * `--apply` additionally executes the seed against the remote D1 database. Both
 * artifacts live under `tmp/`, which is gitignored.
 */

import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import {
  buildSeedSql,
  classifyChannels,
  parseInput,
  summarize,
} from "./lib/telegramChannels.mjs";

const args = process.argv.slice(2);
const inputPath = args.find((arg) => !arg.startsWith("--"));
const apply = args.includes("--apply");
const databaseFlag = args.find((arg) => arg.startsWith("--database="));
const database = databaseFlag ? databaseFlag.slice("--database=".length) : "zayron-x-db";

if (!inputPath) {
  console.error(
    "usage: node tools/import-telegram-channels.mjs <result.json|channels.txt> [--apply] [--database=zayron-x-db]",
  );
  process.exit(2);
}

if (!fs.existsSync(inputPath)) {
  console.error(`[import] input not found: ${inputPath}`);
  process.exit(2);
}

let entries;
try {
  entries = parseInput(fs.readFileSync(inputPath, "utf8"), path.basename(inputPath));
} catch (error) {
  console.error(`[import] could not parse input: ${String(error?.message ?? error)}`);
  process.exit(1);
}

const { publicChannels, privateChannels } = classifyChannels(entries);
const summary = summarize(publicChannels, privateChannels);

const outDir = path.resolve("tmp");
fs.mkdirSync(outDir, { recursive: true });
const seedPath = path.join(outDir, "seed-telegram-sources.sql");
const queuePath = path.join(outDir, "private-channels-queue.json");

fs.writeFileSync(seedPath, buildSeedSql(publicChannels), "utf8");
fs.writeFileSync(
  queuePath,
  JSON.stringify({ generated_at: new Date().toISOString(), channels: privateChannels }, null, 2),
  "utf8",
);

console.log(`[import] parsed ${summary.total} entries from ${inputPath}`);
console.log(`[import] public channels : ${summary.public}  → ${seedPath}`);
console.log(`[import] private channels: ${summary.private}  → ${queuePath}`);
if (summary.byRegion.length > 0) {
  console.log("[import] public by region:");
  for (const row of summary.byRegion) console.log(`  ${row.region.padEnd(7)} ${row.count}`);
}

if (!apply) {
  console.log("[import] dry run. Re-run with --apply to execute the seed against remote D1.");
  process.exit(0);
}

if (summary.public === 0) {
  console.log("[import] nothing to apply — no public channels in this input.");
  process.exit(0);
}

console.log(`[import] applying ${summary.public} rows to ${database} (remote)…`);
const result = spawnSync(
  "npx",
  ["wrangler", "d1", "execute", database, "--remote", `--file=${seedPath}`],
  { stdio: "inherit", shell: process.platform === "win32" },
);
if (result.status !== 0) {
  console.error("[import] wrangler d1 execute failed; the seed file is still available for a manual run.");
  process.exit(result.status ?? 1);
}
console.log("[import] done. The next OSINT wire cycle will pick these channels up.");
