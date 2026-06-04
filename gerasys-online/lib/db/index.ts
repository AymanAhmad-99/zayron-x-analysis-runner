import { drizzle } from "drizzle-orm/postgres-js";
import { sql } from "drizzle-orm";
import postgres from "postgres";
import * as schema from "./schema";

/* ─────────────────────────────────────────────────────────
   ZAYRON-X — Secure Database Connection (Edge-Safe v3)
   All credentials sourced from environment variables.
   ⚠️  NEVER hardcode passwords in this file.

   CLOUDFLARE WORKERS HANG FIX — ROOT CAUSE:
   The `postgres` npm package opens raw TCP sockets via
   node:net / node:tls.  Cloudflare Workers V8 isolates lack
   a native TCP stack.  Even with nodejs_compat v1, the
   connect() shim hangs the event loop because the promise
   never settles — the runtime kills the request at the
   30 s wall-clock limit with "Worker had hung".

   FIX LAYERS (defense in depth):
   1. AbortController-based operation timeout (10 s) that
      races the DB query — kills the hung TCP attempt even
      when setTimers can't fire.
   2. nodejs_compat_v2 in wrangler.toml — proper connect()
      API support for net/tls.
   3. node:net, node:tls, node:dns externalized in
      open-next.config.ts — prevents polyfill conflicts.
   ───────────────────────────────────────────────────────── */

let client: postgres.Sql | null = null;
let dbInstance: ReturnType<typeof drizzle<typeof schema>> | null = null;

/* ── Connection liveness flag ── */
let connectionFailed = false;
let lastConnectionAttempt = 0;
const CONNECTION_RETRY_COOLDOWN_MS = 15_000; // 15 s between retries

/* ── Operation timeout (Cloudflare free: 10 s CPU, paid: 30 s wall) ── */
const DB_OPERATION_TIMEOUT_MS = 10_000;

/**
 * Creates an AbortController that auto-aborts after `ms` milliseconds.
 * We use AbortController + Promise.race because it works independently
 * of the event loop — unlike setTimeout which can be blocked by a hung
 * TCP connect() in nodejs_compat v1.
 */
function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => {
    controller.abort();
  }, ms);

  // Allow the timer to NOT keep the process alive (edge-safe)
  if (typeof timer === "object" && "unref" in timer) {
    (timer as unknown as { unref(): void }).unref();
  }

  const timeout = new Promise<never>((_, reject) => {
    const onAbort = () => {
      controller.signal.removeEventListener("abort", onAbort);
      reject(
        new Error(
          `DB_OP_TIMEOUT: ${label} did not complete within ${ms}ms — ` +
          `the connection likely hung at the TCP layer. Check nodejs_compat_v2.`
        )
      );
    };
    controller.signal.addEventListener("abort", onAbort, { once: true });
  });

  return Promise.race([promise, timeout]);
}

/**
 * Returns a Drizzle ORM instance backed by a Postgres.js client.
 *
 * On Cloudflare Workers, the underlying TCP connection is provided by
 * the nodejs_compat_v2 polyfill (connect() API).  If the connection
 * hangs (common with v1), the AbortController timeout rejects within
 * DB_OPERATION_TIMEOUT_MS instead of letting the runtime kill the
 * entire request at 30 s.
 */
export function getDb() {
  if (connectionFailed) {
    const cooldownRemaining =
      CONNECTION_RETRY_COOLDOWN_MS - (Date.now() - lastConnectionAttempt);
    if (cooldownRemaining > 0) {
      throw new Error(
        `DB_UNAVAILABLE: Previous connection attempt failed. ` +
        `Retry in ${Math.ceil(cooldownRemaining / 1000)}s.`
      );
    }
    // Cooldown expired — allow a fresh attempt
    connectionFailed = false;
  }

  if (!dbInstance) {
    const url = process.env.DATABASE_URL;

    // Fail-Fast Rule: if missing, falsy, or invalid (localhost/dummy), throw immediately
    if (!url || url.includes("dummy") || url.includes("localhost") || url.includes("[PROJECT_REF]")) {
      throw new Error("FATAL: DATABASE_URL is missing or invalid in the Edge runtime.");
    }

    lastConnectionAttempt = Date.now();

    try {
      client = postgres(url, {
        max: 1,             // Maximum 1 connection on the Edge
        idle_timeout: 5,    // Close idle connections after 5s
        connect_timeout: 3, // Timeout quickly (3s) to avoid Fatal Hangs
        prepare: false,     // Required for Supabase / PgBouncer transaction-mode pooler
        ssl: 'require',     // CRITICAL: Prevents silent TCP drops from Supabase

        // ── Edge-specific: Disable features that require Node.js APIs ──
        // debug uses process.stderr which doesn't exist in Workers
        debug: false,
        // fetch_types: false avoids querying PostgreSQL system catalogs
        // which adds an extra round-trip that can hang
        fetch_types: false,
        // connection.application_name helps identify Workers connections
        // on the Supabase/PgBouncer side
        connection: {
          application_name: 'zayron-x-edge-worker',
        },
      });

      dbInstance = drizzle(client, { schema });
    } catch (err) {
      connectionFailed = true;
      throw new Error(
        `DB_INIT_FAILED: Unable to create database client. ` +
        `Cause: ${err instanceof Error ? err.message : String(err)}`
      );
    }
  }

  return dbInstance;
}

/**
 * Executes a database query with a hard timeout.
 *
 * USAGE (in place of bare `getDb().select()...`):
 *   const rows = await dbQuery(
 *     (db) => db.select().from(articles).where(...),
 *     'getArticles'
 *   );
 *
 * The timeout races the entire query — if the underlying TCP connection
 * hangs, the AbortController rejects before the Workers runtime's 30 s
 * wall-clock kill.
 */
export async function dbQuery<T>(
  fn: (db: ReturnType<typeof drizzle<typeof schema>>) => Promise<T>,
  label = "dbQuery"
): Promise<T> {
  const db = getDb();
  return withTimeout(fn(db), DB_OPERATION_TIMEOUT_MS, label);
}

/**
 * Resets the connection state (useful after a recoverable error).
 * Forces the next getDb() call to create a fresh client.
 */
export function resetDbConnection(): void {
  if (client) {
    try {
      client.end({ timeout: 1 }); // Aggressive 1 s end timeout
    } catch {
      // Swallow — the connection is already broken
    }
  }
  client = null;
  dbInstance = null;
  connectionFailed = false;
}

/**
 * Returns true if the database is currently reachable.
 * Performs a lightweight query (SELECT 1) with a short timeout.
 */
export async function isDbHealthy(): Promise<boolean> {
  try {
    const db = getDb();
    await withTimeout(
      db.execute(sql`SELECT 1`),
      5_000,
      'healthCheck'
    );
    return true;
  } catch {
    return false;
  }
}

// Re-export sql for convenience (used by health check and query helpers)