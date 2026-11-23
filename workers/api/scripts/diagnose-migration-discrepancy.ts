import { Database } from "bun:sqlite";
import fs from "node:fs";
import path from "node:path";

const MIGRATIONS_DIR = path.resolve("db/migrations");
const files = fs
  .readdirSync(MIGRATIONS_DIR)
  .filter((f) => f.endsWith(".sql"))
  .sort((a, b) => parseInt(a.split("_")[0]) - parseInt(b.split("_")[0]));

// 1. Static Parser analysis (audit-migrations.mjs logic)
const staticTables = new Set<string>();
const staticIndexes = new Set<string>();

for (const file of files) {
  const content = fs.readFileSync(path.join(MIGRATIONS_DIR, file), "utf8");
  const tableMatches = content.matchAll(/CREATE\s+TABLE(?:\s+IF\s+NOT\s+EXISTS)?\s+([`"']?[\w-]+[`"']?)/gi);
  for (const m of tableMatches) {
    const name = m[1].replace(/[`"']/g, "");
    staticTables.add(name);
    if (name === "and") console.log(`[False Positive Table "and"] found in: ${file} (match: "${m[0]}")`);
  }
  const indexMatches = content.matchAll(/CREATE\s+(?:UNIQUE\s+)?INDEX(?:\s+IF\s+NOT\s+EXISTS)?\s+([`"']?[\w-]+[`"']?)/gi);
  for (const m of indexMatches) {
    const name = m[1].replace(/[`"']/g, "");
    staticIndexes.add(name);
    if (name === "--") console.log(`[False Positive Index "--"] found in: ${file} (match: "${m[0]}")`);
  }
}

console.log("=== 1. STATIC REGEX PARSER RESULTS ===");
console.log(`Static Tables Count: ${staticTables.size}`);
console.log(`Static Indexes Count: ${staticIndexes.size}`);

// 2. Reconstructed SQLite Engine analysis (verify-migration-reproducibility.ts logic)
const db = new Database(":memory:");
for (const file of files) {
  db.run(fs.readFileSync(path.join(MIGRATIONS_DIR, file), "utf8"));
}

const dbMaster = db
  .query("SELECT type, name, tbl_name, sql FROM sqlite_master WHERE name NOT LIKE 'sqlite_%' ORDER BY type, name")
  .all() as { type: string; name: string; tbl_name: string; sql: string }[];

const dbTables = dbMaster.filter((r) => r.type === "table");
const dbIndexes = dbMaster.filter((r) => r.type === "index");
const dbTriggers = dbMaster.filter((r) => r.type === "trigger");
const dbViews = dbMaster.filter((r) => r.type === "view");

console.log("\n=== 2. RECONSTRUCTED SQLITE ENGINE RESULTS ===");
console.log(`DB Tables Count: ${dbTables.length}`);
console.log(`DB Indexes Count: ${dbIndexes.length}`);
console.log(`DB Triggers Count: ${dbTriggers.length}`);
console.log(`DB Views Count: ${dbViews.length}`);

// 3. Compare tables
const inDbNotStatic = dbTables.filter((t) => !staticTables.has(t.name)).map((t) => t.name);
const inStaticNotDb = Array.from(staticTables).filter((t) => !dbTables.some((d) => d.name === t));

console.log("\n=== 3. TABLE DISCREPANCIES ===");
console.log(`Tables in DB but missed by static regex (${inDbNotStatic.length}):`, inDbNotStatic);
console.log(`Tables in static regex but not in DB (${inStaticNotDb.length}):`, inStaticNotDb);

// 4. Compare indexes
const explicitDbIndexes = dbIndexes.filter((i) => i.sql !== null);
const autoDbIndexes = dbIndexes.filter((i) => i.sql === null);

console.log("\n=== 4. INDEX BREAKDOWN ===");
console.log(`Total DB Indexes: ${dbIndexes.length}`);
console.log(`  Explicit DB Indexes (with CREATE INDEX sql): ${explicitDbIndexes.length}`);
console.log(`  Auto-generated SQLite Indexes (PRIMARY KEY / UNIQUE): ${autoDbIndexes.length}`);

const inDbIndexesNotStatic = explicitDbIndexes.filter((i) => !staticIndexes.has(i.name)).map((i) => i.name);
const inStaticIndexesNotDb = Array.from(staticIndexes).filter((i) => !dbIndexes.some((d) => d.name === i));

console.log(`Explicit DB indexes missed by static regex (${inDbIndexesNotStatic.length}):`, inDbIndexesNotStatic);
console.log(`Static regex indexes not in DB (${inStaticIndexesNotDb.length}):`, inStaticIndexesNotDb);
