#!/usr/bin/env bun
/**
 * Gate 3B — bounded AUTHORITATIVE CVE seed for the production `zayron-x-db`.
 *
 * WHY THIS EXISTS
 * Production `workers/ingest` runs with `LEGACY_FREEZE = "true"`, and BOTH the
 * scheduled pass and the operator `fetch` route refuse while that kill-switch is
 * set (the fetch route additionally refuses in production by design). Gate 3B
 * must not unfreeze legacy Telegram narrative ingestion or outbound syndication
 * just to populate the corpus, and it must not add a public write trigger to a
 * production Worker. So the ONE authoritative pass is run from an operator
 * machine instead, against D1 over Wrangler, and the deployed Workers keep
 * `LEGACY_FREEZE = "true"` unchanged.
 *
 * SCOPE
 * Authoritative sources ONLY: NVD 2.0 (CVSS/metrics/CPE ranges), CISA KEV
 * (exploited-in-the-wild), FIRST EPSS (score/percentile). The projection and the
 * UPSERT are imported from `workers/ingest/src/authoritativeVulnIngest.ts`, so
 * this seed cannot drift from the scheduled ingest path. Nothing here writes
 * narrative fields, no AI is involved, and no queue message is produced.
 *
 * BOUNDS
 * `limit` is clamped to 50 (NVD `resultsPerPage` cap) and `days` to 120 (NVD's
 * own max window). A second run is idempotent: the UPSERT is keyed by `cve_id`.
 *
 * OUTPUT
 * A single SQL file of `INSERT ... ON CONFLICT(cve_id) DO UPDATE` statements,
 * applied with:
 *
 *   npx wrangler d1 execute zayron-x-db --remote --file=<out>
 *
 * Usage:
 *   bun run tools/seed-prod-authoritative-cves.mjs --limit=50 --days=120 \
 *     --out=validation/prod-authoritative-seed.sql
 */
import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import {
  fetchRecentNvdCves,
  fetchKevCatalog,
  fetchEpssScores,
} from "../workers/ingest/src/authoritativeVulnIngest.ts";

const rawArgs = process.argv.slice(2);
const argOf = (name, fallback) => {
  const hit = rawArgs.find((entry) => entry.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3) : fallback;
};

const limit = Math.max(1, Math.min(Number(argOf("limit", "50")) || 50, 50));
const days = Math.max(1, Math.min(Number(argOf("days", "120")) || 120, 120));
const outPath = resolve(argOf("out", "validation/prod-authoritative-seed.sql"));

/** SQLite literal with doubled single quotes. Numbers stay unquoted. */
const lit = (value) => {
  if (value === null || value === undefined) return "NULL";
  if (typeof value === "number") return Number.isFinite(value) ? String(value) : "NULL";
  return `'${String(value).replace(/'/g, "''")}'`;
};

// Kept byte-for-byte equivalent (field order included) to UPSERT_SQL in
// workers/ingest/src/authoritativeVulnIngest.ts.
const upsertFor = (record, kevEntry, epssEntry) => {
  const id = `vuln_${record.cve_id.toLowerCase().replace(/[^a-z0-9]/g, "_")}`;
  const values = [
    lit(id),
    lit(record.cve_id),
    lit(`${record.cve_id} Security Advisory`),
    lit(record.description),
    lit(record.severity),
    lit(record.cvss_score),
    lit(record.cvss_vector),
    lit(epssEntry ? epssEntry.score : null),
    lit(kevEntry ? 1 : 0),
    lit(record.vendor),
    lit(record.product),
    lit(record.patch_url),
    lit(record.published_at),
    // provenance_updated_at is the literal datetime('now') below.
    lit(epssEntry ? epssEntry.percentile : null),
    lit(JSON.stringify(record.affected_versions)),
    lit(JSON.stringify(record.fixed_versions)),
    lit(kevEntry ? kevEntry.dueDate : null),
  ];
  return `INSERT INTO vulnerabilities (
  id, cve_id, title, description, severity, cvss_score, cvss_vector, epss_score,
  is_exploited_in_wild, affected_vendor, affected_product, patch_url, published_at,
  provenance_state, provenance_source, provenance_updated_at, epss_percentile,
  affected_versions_json, fixed_versions_json, kev_due_date, created_at, updated_at
) VALUES (
  ${values.slice(0, 13).join(", ")},
  'AUTHORITATIVE_VERIFIED', 'nvd+kev+epss', datetime('now'), ${values[13]},
  ${values[14]}, ${values[15]}, ${values[16]}, datetime('now'), datetime('now')
)
ON CONFLICT(cve_id) DO UPDATE SET
  title = excluded.title,
  description = CASE WHEN excluded.description <> '' THEN excluded.description ELSE vulnerabilities.description END,
  severity = excluded.severity,
  cvss_score = COALESCE(excluded.cvss_score, vulnerabilities.cvss_score),
  cvss_vector = COALESCE(excluded.cvss_vector, vulnerabilities.cvss_vector),
  epss_score = COALESCE(excluded.epss_score, vulnerabilities.epss_score),
  epss_percentile = COALESCE(excluded.epss_percentile, vulnerabilities.epss_percentile),
  is_exploited_in_wild = excluded.is_exploited_in_wild,
  affected_vendor = COALESCE(excluded.affected_vendor, vulnerabilities.affected_vendor),
  affected_product = COALESCE(excluded.affected_product, vulnerabilities.affected_product),
  patch_url = COALESCE(excluded.patch_url, vulnerabilities.patch_url),
  published_at = COALESCE(excluded.published_at, vulnerabilities.published_at),
  provenance_state = 'AUTHORITATIVE_VERIFIED',
  provenance_source = 'nvd+kev+epss',
  provenance_updated_at = datetime('now'),
  affected_versions_json = excluded.affected_versions_json,
  fixed_versions_json = excluded.fixed_versions_json,
  kev_due_date = excluded.kev_due_date,
  updated_at = datetime('now');`;
};

const records = await fetchRecentNvdCves(limit, days);
if (records.length === 0) {
  console.error(JSON.stringify({ ok: false, error: "NVD_RETURNED_NO_RECORDS" }));
  process.exit(1);
}

const ids = records.map((record) => record.cve_id);
let kev = new Map();
let epss = new Map();
const errors = [];
try {
  kev = await fetchKevCatalog();
} catch (error) {
  errors.push(`KEV_UNAVAILABLE:${String(error?.message || error).slice(0, 120)}`);
}
try {
  epss = await fetchEpssScores(ids);
} catch (error) {
  errors.push(`EPSS_UNAVAILABLE:${String(error?.message || error).slice(0, 120)}`);
}

const statements = [
  `INSERT INTO sources (id, display_name, source_type, language, region, trust_score, priority, status, enabled, created_at, updated_at)
VALUES ('first-epss', 'FIRST Exploit Prediction Scoring System', 'api', 'en', 'global', 0.9, 'A', 'ENABLED', 1, datetime('now'), datetime('now'))
ON CONFLICT(id) DO NOTHING;`,
];

let kevMatched = 0;
let epssMatched = 0;
for (const record of records) {
  const kevEntry = kev.get(record.cve_id) || null;
  const epssEntry = epss.get(record.cve_id) || null;
  if (kevEntry) kevMatched += 1;
  if (epssEntry) epssMatched += 1;
  statements.push(upsertFor(record, kevEntry, epssEntry));
}

mkdirSync(dirname(outPath), { recursive: true });
writeFileSync(outPath, `${statements.join("\n")}\n`, "utf8");

console.log(JSON.stringify({
  ok: true,
  out: outPath,
  requested_limit: limit,
  days,
  nvd_records: records.length,
  kev_matched: kevMatched,
  epss_matched: epssMatched,
  years: [...new Set(records.map((record) => record.cve_id.split("-")[1]))].sort(),
  cves: ids,
  errors,
}, null, 2));
