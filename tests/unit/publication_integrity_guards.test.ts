import { describe, expect, test } from 'bun:test';
import { Database } from 'bun:sqlite';
import { readFileSync } from 'node:fs';

import {
  classifyPublicationWriteResult,
  evaluatePublicationWrite,
  publicationOverwriteGuardSql,
} from '../../packages/intelligence/src/vulnerability/reportIntegrity';
// The dispatch layer's publication gate — the SAME validity contract the re-read uses.
import { reportIsValid } from '../../workers/ingest/src/analysisDispatch';

/**
 * Persistence-boundary publication guards.
 *
 * Unlike a source-text assertion, this test EXECUTES the two real
 * `INSERT INTO intelligence_reports` templates from the API worker against a real SQLite
 * engine (the same engine family D1 uses), with the guard produced by the shipped helper.
 * That is the only way to prove the fail-closed overwrite rule actually holds at
 * conflict time, which is where a stale retry would otherwise clobber a publication.
 */

const API_WORKER_SRC = readFileSync(new URL('../../workers/api/src/index.ts', import.meta.url), 'utf8');

/** Read the template literal that starts the statement at `start`. */
function templateAt(src: string, start: number): { sql: string; end: number } {
  const bt = src.lastIndexOf('`', start);
  let i = bt + 1;
  while (i < src.length) {
    const c = src[i];
    if (c === '\\') { i += 2; continue; }
    if (c === '$' && src[i + 1] === '{') {
      let depth = 1;
      i += 2;
      while (i < src.length && depth > 0) {
        const d = src[i];
        if (d === '{') depth += 1;
        else if (d === '}') depth -= 1;
        i += 1;
      }
      continue;
    }
    if (c === '`') break;
    i += 1;
  }
  return { sql: src.slice(bt + 1, i), end: i + 1 };
}

/** Return the text inside the paren at `from`, depth-aware (quotes ignored). */
function groupAt(sql: string, from: number): string {
  let depth = 0;
  let quote: string | null = null;
  for (let i = from; i < sql.length; i += 1) {
    const c = sql[i];
    if (quote) { if (c === quote) quote = null; continue; }
    if (c === "'" || c === '"') { quote = c; continue; }
    if (c === '(') depth += 1;
    else if (c === ')') {
      depth -= 1;
      if (depth === 0) return sql.slice(from + 1, i);
    }
  }
  throw new Error('unbalanced parentheses in statement template');
}

/** Split a SQL fragment on top-level commas, ignoring quoted strings and parens. */
function splitTopLevel(text: string): string[] {
  const out: string[] = [];
  let current = '';
  let quote: string | null = null;
  let depth = 0;
  for (let i = 0; i < text.length; i += 1) {
    const c = text[i];
    if (quote) {
      current += c;
      if (c === quote) quote = null;
      continue;
    }
    if (c === "'" || c === '"') { quote = c; current += c; continue; }
    if (c === '(') depth += 1;
    if (c === ')') depth -= 1;
    if (c === ',' && depth === 0) { out.push(current.trim()); current = ''; continue; }
    current += c;
  }
  out.push(current.trim());
  return out.filter((entry) => entry.length > 0);
}

interface ParsedStatement {
  /** Executable SQL with a real guard (or none) interpolated. */
  sql: string;
  /** Columns receiving a bind placeholder, in bind order. */
  boundColumns: string[];
  columns: string[];
}

/**
 * Build an executable statement from one source template.
 * `${...}` interpolations are replaced with a stub literal — except the guard, which is
 * substituted with the real shipped SQL fragment so the tested guard is the shipped one.
 */
function buildStatement(index: number, overwriteAuthorized: boolean): ParsedStatement {
  const needle = 'INSERT INTO intelligence_reports';
  let idx = -1;
  for (let n = 0; n <= index; n += 1) idx = API_WORKER_SRC.indexOf(needle, idx + 1);
  const { sql: template } = templateAt(API_WORKER_SRC, idx);
  const sql = template.replace(/\$\{([^}]*)\}/g, (_, expression: string) =>
    expression.includes('publicationOverwriteGuard') ? publicationOverwriteGuardSql(overwriteAuthorized) : 'stub');
  const columns = splitTopLevel(groupAt(sql, sql.indexOf('(')));
  const valuesBody = groupAt(sql, sql.indexOf('(', sql.indexOf('VALUES')));
  const boundColumns = splitTopLevel(valuesBody).flatMap((token, position) => (token === '?' ? [columns[position]] : []));
  // Every non-literal value is a bind: the placeholder count must equal the bound columns.
  expect(splitTopLevel(valuesBody).length).toBe(columns.length);
  return { sql, columns, boundColumns };
}

/** Columns that must exist for the statement to prepare; every column is textual here. */
function createTable(db: Database, columns: string[]): void {
  const defs = columns.map((column) =>
    column === 'intelligence_id'
      ? 'intelligence_id TEXT PRIMARY KEY'
      // The real schema defaults publication_status to PUBLISHED; keeping that default here
      // is what proves an explicit bound value — not the DEFAULT — decides publication state.
      : column === 'publication_status'
        ? 'publication_status TEXT DEFAULT \'PUBLISHED\''
        : `${column} TEXT`);
  db.exec(`CREATE TABLE intelligence_reports (${defs.join(', ')});`);
}

interface RowOverride {
  intelligence_id?: string;
  status?: string;
  publication_status?: string;
  body?: string;
  structured_report_json?: string;
}

const ID = 'CVE-2026-50001';

/** Positional bind args: stubs everywhere except the fields under test. */
function argsFor(statement: ParsedStatement, overrides: RowOverride): (string | null)[] {
  return statement.boundColumns.map((column, position) => {
    const override = (overrides as Record<string, string | undefined>)[column];
    if (override !== undefined) return override;
    if (column === 'created_at' || column === 'updated_at' || column === 'processed_at') return '2026-10-13T00:00:00.000Z';
    return `${column}_${position}`;
  });
}

function write(db: Database, statement: ParsedStatement, overrides: RowOverride): any {
  // The statement's own placeholder count must equal the columns we bind, so a drift in
  // either the SQL or the writer surfaces here rather than inside D1 at runtime.
  expect((statement.sql.match(/\?/g) ?? []).length).toBe(statement.boundColumns.length);
  const compiled = db.query(statement.sql);
  // The database run result is returned so persistence outcomes can be classified from it.
  return compiled.run(...argsFor(statement, { intelligence_id: ID, ...overrides }));
}

function row(db: Database) {
  return db.query('SELECT status, publication_status, body FROM intelligence_reports WHERE intelligence_id = ?').get(ID) as any;
}

describe('PUBLICATION GUARD — fail-closed overwrite protection', () => {
  test('both report writers bind publication state explicitly and keep placeholders === binds', () => {
    for (const index of [0, 1]) {
      const statement = buildStatement(index, false);
      expect(statement.boundColumns).toContain('status');
      expect(statement.boundColumns).toContain('publication_status');
      // Publication state is a bind parameter, never a hardcoded literal in the statement.
      expect(statement.sql).not.toMatch(/publication_status\s*,\s*'/);
      // The shipped guard is what the executable statement actually carries.
      expect(statement.sql).toContain(publicationOverwriteGuardSql(false));
    }
  });

  test('a first write lands: no conflict means the guard is never evaluated', () => {
    const statement = buildStatement(0, false);
    const db = new Database(':memory:');
    createTable(db, statement.columns);
    // A withheld first write must be recordable at all (fail-closed must not block withholding).
    write(db, statement, { status: 'REJECTED', publication_status: 'WITHHELD', body: 'withheld-body' });
    expect(row(db)).toMatchObject({ status: 'REJECTED', publication_status: 'WITHHELD', body: 'withheld-body' });
    // And an explicitly authorised first publication lands.
    const second = buildStatement(0, false);
    const db2 = new Database(':memory:');
    createTable(db2, second.columns);
    write(db2, second, { status: 'ANALYZED', publication_status: 'PUBLISHED', body: 'published-body' });
    expect(row(db2)).toMatchObject({ status: 'ANALYZED', publication_status: 'PUBLISHED', body: 'published-body' });
  });

  test('a stale/failed retry cannot overwrite an existing valid publication', () => {
    const statement = buildStatement(0, false);
    const db = new Database(':memory:');
    createTable(db, statement.columns);
    write(db, statement, { status: 'ANALYZED', publication_status: 'PUBLISHED', body: 'good-report' });
    // Same CVE re-dispatched while the provider is failing: the run wants to record a failure.
    write(db, statement, { status: 'REJECTED', publication_status: 'WITHHELD', body: 'failed-retry' });
    expect(row(db)).toMatchObject({ status: 'ANALYZED', publication_status: 'PUBLISHED', body: 'good-report' });
  });

  test('gate-blocked content cannot overwrite an existing valid publication', () => {
    const statement = buildStatement(0, false);
    const db = new Database(':memory:');
    createTable(db, statement.columns);
    write(db, statement, { status: 'ANALYZED', publication_status: 'PUBLISHED', body: 'good-report' });
    write(db, statement, { status: 'REJECTED', publication_status: 'WITHHELD', structured_report_json: '{"status":"BLOCKED"}' });
    expect(row(db)).toMatchObject({ status: 'ANALYZED', publication_status: 'PUBLISHED', body: 'good-report' });
  });

  test('a valid recovery lands on a withheld row (withholding is never permanent)', () => {
    const statement = buildStatement(0, false);
    const db = new Database(':memory:');
    createTable(db, statement.columns);
    write(db, statement, { status: 'REJECTED', publication_status: 'WITHHELD', body: 'withheld-body' });
    write(db, statement, { status: 'ANALYZED', publication_status: 'PUBLISHED', body: 'recovered-report' });
    expect(row(db)).toMatchObject({ status: 'ANALYZED', publication_status: 'PUBLISHED', body: 'recovered-report' });
  });

  test('only an explicitly authorised material revision replaces a publication', () => {
    const statement = buildStatement(0, true);
    const db = new Database(':memory:');
    createTable(db, statement.columns);
    write(db, statement, { status: 'ANALYZED', publication_status: 'PUBLISHED', body: 'good-report' });
    write(db, statement, { status: 'ANALYZED', publication_status: 'PUBLISHED', body: 'material-revision' });
    expect(row(db)).toMatchObject({ status: 'ANALYZED', publication_status: 'PUBLISHED', body: 'material-revision' });
    // The authorisation is an explicit argument, not an implicit default.
    expect(publicationOverwriteGuardSql(true)).toBe('WHERE 1 = 1');
    expect(publicationOverwriteGuardSql(false)).toContain(`NOT (status = 'ANALYZED' AND publication_status = 'PUBLISHED')`);
  });

  test('the legacy fallback writer carries the same guard', () => {
    const statement = buildStatement(1, false);
    const db = new Database(':memory:');
    createTable(db, statement.columns);
    write(db, statement, { status: 'ANALYZED', publication_status: 'PUBLISHED', body: 'good-report' });
    write(db, statement, { status: 'REJECTED', publication_status: 'WITHHELD', body: 'failed-retry' });
    expect(row(db)).toMatchObject({ status: 'ANALYZED', publication_status: 'PUBLISHED', body: 'good-report' });
  });

  test('the API worker asserts the invariant before either writer runs', () => {
    expect(API_WORKER_SRC).toContain('evaluatePublicationWrite(');
    expect(API_WORKER_SRC).toContain('PUBLICATION_INVARIANT_VIOLATION');
    const invariantAt = API_WORKER_SRC.indexOf('evaluatePublicationWrite(');
    const firstWriteAt = API_WORKER_SRC.indexOf('INSERT INTO intelligence_reports');
    expect(invariantAt).toBeGreaterThan(0);
    expect(invariantAt).toBeLessThan(firstWriteAt);
  });
});

describe('PUBLICATION GUARD — persistence attempt outcome', () => {
  test('a landing write and a guard-blocked no-op are distinguished by the database result', () => {
    const statement = buildStatement(0, false);
    const db = new Database(':memory:');
    createTable(db, statement.columns);

    const landing = classifyPublicationWriteResult(
      write(db, statement, { status: 'ANALYZED', publication_status: 'PUBLISHED', body: 'good-report', structured_report_json: '{"schema_version":"1.0.0"}' }),
    );
    expect(landing).toEqual({ outcome: 'APPLIED', changes: 1, reason: 'WRITE_APPLIED' });

    // Same CVE retried while failing: the guard preserves the publication, so the statement
    // SUCCEEDS while changing zero rows. That is a conditional no-op, not a success.
    const blocked = classifyPublicationWriteResult(
      write(db, statement, { status: 'REJECTED', publication_status: 'WITHHELD', body: 'failed-retry' }),
    );
    expect(blocked).toEqual({ outcome: 'NOOP_BLOCKED', changes: 0, reason: 'CONDITIONAL_NOOP_PRESERVED_PUBLICATION' });
    expect(blocked.outcome).not.toBe(landing.outcome);

    // ...and the preserved row still satisfies the SAME publication gate the dispatch
    // re-read uses, while this attempt published nothing.
    const stored = db.query('SELECT status, publication_status, structured_report_json FROM intelligence_reports WHERE intelligence_id = ?').get(ID) as any;
    expect(reportIsValid(stored)).toBe(true);
    expect(row(db)).toMatchObject({ body: 'good-report' });
  });

  test('a first write for a new CVE always applies (the guard is never evaluated without a conflict)', () => {
    const statement = buildStatement(0, false);
    const db = new Database(':memory:');
    createTable(db, statement.columns);
    expect(classifyPublicationWriteResult(write(db, statement, { status: 'REJECTED', publication_status: 'WITHHELD' })).outcome).toBe('APPLIED');
  });

  test('the legacy fallback writer classifies the same way', () => {
    const statement = buildStatement(1, false);
    const db = new Database(':memory:');
    createTable(db, statement.columns);
    expect(classifyPublicationWriteResult(write(db, statement, { status: 'ANALYZED', publication_status: 'PUBLISHED', body: 'good-report' })).outcome).toBe('APPLIED');
    expect(classifyPublicationWriteResult(write(db, statement, { status: 'REJECTED', publication_status: 'WITHHELD', body: 'failed-retry' })).outcome).toBe('NOOP_BLOCKED');
  });

  test('the D1 result shape (meta.changes) is read exactly like the SQLite run result', () => {
    expect(classifyPublicationWriteResult({ success: true, meta: { changes: 1 } })).toEqual({ outcome: 'APPLIED', changes: 1, reason: 'WRITE_APPLIED' });
    expect(classifyPublicationWriteResult({ success: true, meta: { changes: 0 } })).toEqual({ outcome: 'NOOP_BLOCKED', changes: 0, reason: 'CONDITIONAL_NOOP_PRESERVED_PUBLICATION' });
    expect(classifyPublicationWriteResult({ success: true, changes: 3 })).toMatchObject({ outcome: 'APPLIED', changes: 3 });
  });

  test('a conditional no-op is a different outcome from a database error, and an ambiguous result is never a success', () => {
    expect(classifyPublicationWriteResult({ success: true, meta: { changes: 0 } })).toMatchObject({ outcome: 'NOOP_BLOCKED', changes: 0 });
    expect(classifyPublicationWriteResult({ success: false, meta: { changes: 1 } })).toEqual({ outcome: 'ERROR', changes: null, reason: 'WRITE_REPORTED_FAILURE' });
    for (const ambiguous of [undefined, null, 'ok', 42, [], {}, { meta: {} }, { meta: { changes: '1' } }, { meta: { changes: null } }, { meta: { changes: Number.NaN } }, { changes: Infinity }]) {
      const result = classifyPublicationWriteResult(ambiguous);
      expect(result.outcome).toBe('ERROR');
      expect(result.changes).toBeNull();
    }
  });
});

describe('PUBLICATION GUARD — boundary invariant', () => {
  test('a PUBLISHED claim requires a usable analysis and a publishable structured report', () => {
    const base = { reportRowStatus: 'ANALYZED', reportPublicationStatus: 'PUBLISHED', processDecision: 'DEEP_ANALYSIS', analysisUsable: true, structuredReportStatus: 'PUBLISHED' };
    expect(evaluatePublicationWrite(base)).toEqual({ allowed: true, reason: 'PUBLISHABLE' });
  });

  test('an unvalidated publication claim is refused (fail closed)', () => {
    const base = { reportRowStatus: 'ANALYZED', reportPublicationStatus: 'PUBLISHED', processDecision: 'DEEP_ANALYSIS', analysisUsable: true, structuredReportStatus: 'PUBLISHED' };
    expect(evaluatePublicationWrite({ ...base, analysisUsable: false })).toEqual({ allowed: false, reason: 'NO_MODEL_ANALYSIS' });
    expect(evaluatePublicationWrite({ ...base, structuredReportStatus: 'BLOCKED' })).toEqual({ allowed: false, reason: 'STRUCTURED_REPORT_NOT_PUBLISHABLE' });
    expect(evaluatePublicationWrite({ ...base, reportRowStatus: 'REJECTED' })).toEqual({ allowed: false, reason: 'ROW_STATUS_NOT_ANALYZED' });
    // Missing signals refuse the claim rather than defaulting to success.
    expect(evaluatePublicationWrite({ reportPublicationStatus: 'PUBLISHED' })).toEqual({ allowed: false, reason: 'ROW_STATUS_NOT_ANALYZED' });
  });

  test('withholding and STORE_ONLY writes are always permitted', () => {
    expect(evaluatePublicationWrite({ reportRowStatus: 'REJECTED', reportPublicationStatus: 'WITHHELD' })).toEqual({ allowed: true, reason: 'NON_PUBLICATION_WRITE' });
    expect(evaluatePublicationWrite({ reportRowStatus: 'ANALYZED', reportPublicationStatus: 'PUBLISHED', processDecision: 'STORE_ONLY', analysisUsable: false, structuredReportStatus: 'PUBLISHED' })).toEqual({ allowed: true, reason: 'PUBLISHABLE' });
    expect(evaluatePublicationWrite({})).toEqual({ allowed: true, reason: 'NON_PUBLICATION_WRITE' });
  });
});
