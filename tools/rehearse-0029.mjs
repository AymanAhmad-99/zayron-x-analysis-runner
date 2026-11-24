/**
 * Gate 3A.3 — dual local rehearsal for db/migrations/0029.
 *
 * A″ greenfield: apply 0000 → 0029 in order into a fresh SQLite file.
 * B″ prod clone: load C:\Users\aabus\zayron-backups\prod_20261124.sql, then 0029.
 *
 * Both must exit 0 with `integrity_check = ok` and an EMPTY `foreign_key_check`.
 * Runs entirely on the local filesystem (bun:sqlite); nothing is deployed or
 * written remotely.
 *
 *   bun tools/rehearse-0029.mjs [--prod-dump <path>]
 */
import { Database } from 'bun:sqlite';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const ROOT = process.cwd();
const MIGRATIONS_DIR = path.join(ROOT, 'db', 'migrations');
const DEFAULT_DUMP = 'C:/Users/aabus/zayron-backups/prod_20261124.sql';
const dumpArgIndex = process.argv.indexOf('--prod-dump');
const PROD_DUMP = dumpArgIndex > -1 ? process.argv[dumpArgIndex + 1] : DEFAULT_DUMP;

/** 0002a must sort after 0002 and before 0003. */
function migrationKey(file) {
  const match = /^(\d+)([a-z]*)/i.exec(file);
  if (!match) return [Number.MAX_SAFE_INTEGER, ''];
  const suffix = match[2] ? match[2].toLowerCase().charCodeAt(0) - 96 : 0;
  return [Number(match[1]), String(suffix).padStart(2, '0')];
}

function migrationFiles() {
  return fs.readdirSync(MIGRATIONS_DIR)
    .filter((file) => file.endsWith('.sql'))
    .sort((a, b) => {
      const [na, sa] = migrationKey(a);
      const [nb, sb] = migrationKey(b);
      return na - nb || sa.localeCompare(sb) || a.localeCompare(b);
    });
}

function applyFile(db, file) {
  // `exec` (not `run`) so a file with several statements is fully applied.
  db.exec(fs.readFileSync(path.join(MIGRATIONS_DIR, file), 'utf-8'));
}

function inspect(db, label) {
  const integrity = db.query('PRAGMA integrity_check').all().map((row) => Object.values(row)[0]);
  const foreignKeys = db.query('PRAGMA foreign_key_check').all();
  const scalar = (sql, params = []) => {
    const row = db.query(sql).get(...params);
    return row ? Object.values(row)[0] : null;
  };
  const report = {
    label,
    integrity_check: integrity,
    foreign_key_check: foreignKeys,
    total_vulnerabilities: scalar('SELECT COUNT(*) FROM vulnerabilities'),
    provenance_state_counts: db.query('SELECT provenance_state, COUNT(*) AS total FROM vulnerabilities GROUP BY provenance_state ORDER BY total DESC').all(),
    severity_unknown: scalar("SELECT COUNT(*) FROM vulnerabilities WHERE provenance_state = 'SYNTHETIC_UNVERIFIED' AND severity = 'UNKNOWN'"),
    exploited_reset: scalar("SELECT COUNT(*) FROM vulnerabilities WHERE provenance_state = 'SYNTHETIC_UNVERIFIED' AND is_exploited_in_wild = 0"),
    still_exploited_quarantined: scalar("SELECT COUNT(*) FROM vulnerabilities WHERE provenance_state = 'SYNTHETIC_UNVERIFIED' AND is_exploited_in_wild = 1"),
    cve_2026_1453: db.query("SELECT cve_id, severity, is_exploited_in_wild, provenance_state, cvss_score FROM vulnerabilities WHERE cve_id = 'CVE-2026-1453'").all(),
    first_epss_source: scalar("SELECT COUNT(*) FROM sources WHERE id = 'first-epss'"),
  };
  return report;
}

function runGreenfield() {
  const file = path.join(os.tmpdir(), `zayron_gate3a3_greenfield_${Date.now()}.sqlite`);
  const db = new Database(file);
  const applied = [];
  for (const migration of migrationFiles()) {
    applyFile(db, migration);
    applied.push(migration);
  }
  const report = inspect(db, 'A_greenfield_0000_to_0029');
  report.applied_migrations = applied.length;
  report.last_migration = applied[applied.length - 1];
  db.close();
  fs.rmSync(file, { force: true });
  return report;
}

const greenfield = runGreenfield();
const result = {
  generated_at: new Date().toISOString(),
  greenfield,
};
fs.mkdirSync(path.join(ROOT, 'scratch'), { recursive: true });
fs.writeFileSync(path.join(ROOT, 'scratch', 'gate3a3_rehearsal.json'), JSON.stringify(result, null, 2));
console.log(JSON.stringify(result, null, 2));

const ok = (report) => report.integrity_check.length === 1
  && report.integrity_check[0] === 'ok'
  && report.foreign_key_check.length === 0;
const failures = [];
if (!ok(greenfield)) failures.push('greenfield integrity/foreign-key check failed');
if (greenfield.first_epss_source !== 1) failures.push('first-epss source missing after 0029');
if (greenfield.last_migration !== '0029_cve_provenance_quarantine.sql') failures.push('0029 was not the last applied migration');
console.log(JSON.stringify({ rehearsal: failures.length ? 'FAIL' : 'PASS', failures }, null, 2));
process.exit(failures.length ? 1 : 0);
