import fs from "node:fs";
import path from "node:path";

const dir = "d:/Desktop/zayron-app/db/migrations";
const files = fs.readdirSync(dir).filter((f) => f.endsWith(".sql")).sort();

const migrationTables = new Set();
const migrationIndexes = new Set();

for (const file of files) {
  const content = fs.readFileSync(path.join(dir, file), "utf8");
  const tableMatches = content.matchAll(/CREATE\s+TABLE(?:\s+IF\s+NOT\s+EXISTS)?\s+([`"']?[\w-]+[`"']?)/gi);
  for (const m of tableMatches) {
    migrationTables.add(m[1].replace(/[`"']/g, ""));
  }
  const indexMatches = content.matchAll(/CREATE\s+(?:UNIQUE\s+)?INDEX(?:\s+IF\s+NOT\s+EXISTS)?\s+([`"']?[\w-]+[`"']?)/gi);
  for (const m of indexMatches) {
    migrationIndexes.add(m[1].replace(/[`"']/g, ""));
  }
}

console.log(`Tables in db/migrations (${migrationTables.size}):`);
console.log(JSON.stringify(Array.from(migrationTables).sort(), null, 2));

console.log(`Indexes in db/migrations (${migrationIndexes.size}):`);
console.log(JSON.stringify(Array.from(migrationIndexes).sort(), null, 2));
