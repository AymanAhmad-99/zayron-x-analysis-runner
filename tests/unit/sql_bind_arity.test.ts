import { describe, expect, it } from 'bun:test';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

/**
 * D1 regression guard.
 *
 * The Gemini provider work dropped the `ai_prompt_version` bind from both
 * `INSERT INTO intelligence_reports` statements in the API worker, leaving 27
 * placeholders against 26 binds (and 24 against 23). That class of defect is
 * invisible to the type checker and only fails at runtime, inside D1.
 *
 * This test parses the statement templates and their `.bind(...)` argument lists
 * directly out of the source and asserts arity mechanically.
 */

const API_WORKER_SRC = readFileSync(
  fileURLToPath(new URL('../../workers/api/src/index.ts', import.meta.url)),
  'utf8',
);

const QUOTES = new Set(['"', "'", '`']);

/** Skip a JS string/template literal starting at `start`, returning the index after it. */
function skipString(src: string, start: number): number {
  const quote = src[start];
  let i = start + 1;
  while (i < src.length) {
    const c = src[i];
    if (c === '\\') { i += 2; continue; }
    // `${ ... }` inside a template may contain commas/braces that must not be counted.
    if (quote === '`' && c === '$' && src[i + 1] === '{') { i = skipInterpolation(src, i + 2); continue; }
    if (c === quote) return i + 1;
    i += 1;
  }
  return i;
}

/** Skip the inside of a `${ ... }` interpolation (may nest strings, templates and braces). */
function skipInterpolation(src: string, start: number): number {
  let depth = 1;
  let i = start;
  while (i < src.length && depth > 0) {
    const c = src[i];
    if (QUOTES.has(c)) { i = skipString(src, i); continue; }
    if (c === '{') depth += 1;
    else if (c === '}') depth -= 1;
    i += 1;
  }
  return i;
}

/** Count top-level arguments of the first `.bind(...)` at or after `from`. */
function findBindArgs(src: string, from: number): { argCount: number; end: number } {
  const at = src.indexOf('.bind(', from);
  if (at < 0) return { argCount: -1, end: from };
  const start = at + '.bind('.length;
  const segments: string[] = [];
  let segmentStart = start;
  let i = start;
  let depth = 1;
  while (i < src.length && depth > 0) {
    const c = src[i];
    if (QUOTES.has(c)) { i = skipString(src, i); continue; }
    // A comma inside a JavaScript COMMENT is prose, not an argument separator. Without
    // this the counter reads one extra argument per comma in a `//` note and reports a
    // false arity mismatch, which is exactly the kind of noise that hides a real defect.
    if (c === '/' && src[i + 1] === '/') { const nl = src.indexOf('\n', i); i = nl < 0 ? src.length : nl + 1; continue; }
    if (c === '/' && src[i + 1] === '*') { const close = src.indexOf('*/', i); i = close < 0 ? src.length : close + 2; continue; }
    if (c === '(' || c === '[' || c === '{') depth += 1;
    else if (c === ')' || c === ']' || c === '}') {
      depth -= 1;
      if (depth === 0) break;
    } else if (c === ',' && depth === 1) {
      segments.push(src.slice(segmentStart, i));
      segmentStart = i + 1;
    }
    i += 1;
  }
  segments.push(src.slice(segmentStart, i));
  // A trailing comma is a formatting artifact, not an extra bound value.
  const argCount = segments.filter((segment) => segment.trim().length > 0).length;
  return { argCount, end: i + 1 };
}

interface SqlStatement {
  sql: string;
  placeholders: number;
  bindArgs: number;
  line: number;
}

/**
 * Extract the SQL template literal that contains `sqlStart`, its REAL placeholder
 * count and its end offset.
 *
 * A `?` inside a `${ ... }` interpolation is JavaScript, not a bind parameter — for
 * example `${authority.knownExploited ? 1 : 0}` in the `vulnerabilities` upsert. The
 * former regex count treated those ternary `?` as placeholders and reported a
 * correct 5-placeholder statement as 7, which is a false alarm that can hide a real
 * arity defect. Interpolations are skipped with the same tokenizer used elsewhere in
 * this file, so a `?` inside a string or a nested template inside `${ }` is ignored too.
 */
function sqlTemplateBefore(src: string, sqlStart: number): { sql: string; placeholders: number; end: number } {
  const bt = src.lastIndexOf('`', sqlStart);
  const end = skipString(src, bt);
  const stop = end - 1;
  let placeholders = 0;
  let i = bt + 1;
  while (i < stop) {
    if (src[i] === '$' && src[i + 1] === '{') { i = skipInterpolation(src, i + 2); continue; }
    if (src[i] === '?') placeholders += 1;
    i += 1;
  }
  return { sql: src.slice(bt + 1, stop), placeholders, end };
}

function statements(table: string): SqlStatement[] {
  const out: SqlStatement[] = [];
  const needle = `INSERT INTO ${table}`;
  let idx = API_WORKER_SRC.indexOf(needle);
  while (idx >= 0) {
    const { sql, placeholders, end } = sqlTemplateBefore(API_WORKER_SRC, idx);
    const { argCount } = findBindArgs(API_WORKER_SRC, end);
    out.push({
      sql,
      placeholders,
      bindArgs: argCount,
      line: API_WORKER_SRC.slice(0, idx).split('\n').length,
    });
    idx = API_WORKER_SRC.indexOf(needle, idx + 1);
  }
  return out;
}

describe('D1 GUARD — D1 statement bind arity', () => {
  it('tokenizer does not miscount a comma inside a template interpolation', () => {
    const synthetic = 'X).bind(a, `t_${crypto.randomUUID().slice(0, 12)}`, b, { k: 1, j: [2, 3] }, c).run();';
    expect(findBindArgs(synthetic, 0).argCount).toBe(5);

    // Prose commas in a comment must not be counted as separators.
    const withComments = 'X).bind(\n  a, // first, with a comma\n  /* inline, note, with commas */\n  b,\n).run();';
    expect(findBindArgs(withComments, 0).argCount).toBe(2);

    // A trailing comma is a formatting artifact, not an additional bound value.
    expect(findBindArgs('X).bind(a, b,).run();', 0).argCount).toBe(2);
  });

  it('both intelligence_reports INSERT paths keep placeholders === binds', () => {
    const stmts = statements('intelligence_reports');
    expect(stmts.length).toBe(2);

    // Structured-report path. The measured publication-gate repair turned the two
    // hardcoded literals `status`/`publication_status` into bound parameters, so the
    // arity this path must now hold is 29/29 (was 27/27). The arity equality — which is
    // the property this guard exists to protect — is asserted exactly as before.
    expect(stmts[0].placeholders).toBe(29);
    expect(stmts[0].bindArgs).toBe(29);

    // Legacy fallback path (previously 24 placeholders / 23 binds): the same repair
    // applies, so the required arity is now 26/26.
    expect(stmts[1].placeholders).toBe(26);
    expect(stmts[1].bindArgs).toBe(26);
  });

  it('ai_prompt_version is supplied by both intelligence_reports paths', () => {
    for (const stmt of statements('intelligence_reports')) {
      expect(stmt.sql).toContain('ai_prompt_version');
    }
  });

  it('event_trace statements keep placeholders === binds', () => {
    const stmts = statements('event_trace');
    expect(stmts.length).toBe(2);
    for (const stmt of stmts) expect(stmt.bindArgs).toBe(stmt.placeholders);

    // Provider telemetry statement (11 columns bound) and the trace() helper (9).
    const telemetry = stmts.find((stmt) => stmt.placeholders === 11);
    expect(telemetry).toBeDefined();
    expect(telemetry!.bindArgs).toBe(11);
    // The telemetry statement binds both timestamps as epoch-millis parameters;
    // the trace() helper binds only one and uses datetime('now') for the other.
    expect(telemetry!.sql.match(/datetime\(\? \/ 1000,'unixepoch'\)/g)?.length).toBe(2);

    const helper = stmts.find((stmt) => stmt.placeholders === 9);
    expect(helper).toBeDefined();
    expect(helper!.bindArgs).toBe(9);
  });

  it('every audited INSERT statement matches its bind arity', () => {
    for (const table of ['intelligence_reports', 'event_trace', 'vulnerabilities']) {
      const stmts = statements(table);
      expect(stmts.length).toBeGreaterThan(0);
      for (const stmt of stmts) {
        expect(stmt.bindArgs).toBe(stmt.placeholders);
      }
    }
  });
});
