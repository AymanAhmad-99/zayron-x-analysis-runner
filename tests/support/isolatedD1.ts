/**
 * M16.4.31 — isolated D1-compatible store for the canonical report proof.
 *
 * D1 IS SQLite, and this adapter exposes a real, file-backed SQLite database
 * (bun's bundled engine) behind the exact `prepare/bind/run/first/all` surface
 * D1 exposes — the same shape wrangler/miniflare provide. It is deliberately
 * NOT an in-memory fake and NOT a stubbed persistence implementation:
 *
 *   - the persistence code under test is the real canonical module,
 *   - the read gate under test is the real, unmodified gate,
 *   - the schema is the real `malware_reports` DDL,
 *   - the bytes land in a real database file that a SECOND connection reopens,
 *     so "the row survived" is verified by the database engine, not by the
 *     object that wrote it.
 *
 * It can only ever point at a caller-supplied isolated path; nothing here
 * references, resolves or falls back to a production database.
 */
import { Database } from 'bun:sqlite';

export interface IsolatedD1 {
  /** D1-compatible binding surface. */
  prepare(sql: string): {
    bind(...values: unknown[]): {
      run(): Promise<unknown>;
      first<T>(): Promise<T | null>;
      all<T>(): Promise<{ results?: T[] }>;
    };
    run(): Promise<unknown>;
    first<T>(): Promise<T | null>;
    all<T>(): Promise<{ results?: T[] }>;
  };
}

export interface IsolatedStore {
  /** The D1-compatible binding handed to production code under test. */
  db: IsolatedD1;
  /** Absolute path of the real database file. */
  path: string;
  /** Raw SQL access for schema setup / independent verification. */
  sqlite: Database;
  close(): void;
}

export function openIsolatedStore(path: string): IsolatedStore {
  // Default rollback journal: a real on-disk database with no extra sidecar
  // files to leave locked behind the test process.
  const sqlite = new Database(path, { create: true });

  const db: IsolatedD1 = {
    prepare(sql: string) {
      const bound: unknown[] = [];
      const statement = {
        async run(): Promise<unknown> {
          sqlite.prepare(sql).run(...(bound as never[]));
          return { success: true };
        },
        async first<T>(): Promise<T | null> {
          return (sqlite.prepare(sql).get(...(bound as never[])) ?? null) as T | null;
        },
        async all<T>(): Promise<{ results?: T[] }> {
          return { results: sqlite.prepare(sql).all(...(bound as never[])) as T[] };
        },
      };
      const statementWithBind = {
        ...statement,
        bind(...values: unknown[]) {
          bound.length = 0;
          bound.push(...values);
          return statement;
        },
      };
      return statementWithBind;
    },
  };

  return {
    db,
    path,
    sqlite,
    close() {
      sqlite.close();
    },
  };
}
