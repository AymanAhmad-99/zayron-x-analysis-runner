import { Pool, neonConfig } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";
import { sql } from "drizzle-orm";
import * as schema from "./schema";

/* ─────────────────────────────────────────────────────────
   ZAYRON‑X — Edge‑Native Database Layer (Neon Serverless WebSocket)

   Cloudflare Workers cannot use raw TCP pg or postgres npm packages
   due to the lacking filesystem and native socket stack in the V8
   isolate. By utilizing `@neondatabase/serverless` (WebSocket-based),
   we establish database connectivity safely through WebSockets.

   This module implements connection pooling via a global singleton,
   safe URL constructor parsing to avoid credential concatenation bugs,
   and automatic URL masking in failure logs.
   ───────────────────────────────────────────────────────── */

// Declare global types to store singletons across requests
interface GlobalDB {
  _dbPool?: Pool;
  _dbInstance?: ReturnType<typeof drizzle<typeof schema>>;
}

const globalRef = globalThis as unknown as GlobalDB;

/**
 * Safely masks the password in a database connection string.
 */
export function maskDatabaseUrl(urlStr: string): string {
  if (!urlStr) return "[EMPTY]";
  try {
    const url = new URL(urlStr);
    url.password = "********";
    return url.toString();
  } catch {
    return "[UNPARSEABLE DATABASE URL]";
  }
}

/**
 * Configures and returns the Edge-compatible database singleton.
 */
export function getDb() {
  if (!globalRef._dbInstance) {
    const databaseUrl = process.env.DATABASE_URL;

    // Fail-Fast Rule: if missing, invalid, or placeholder, throw immediately
    if (!databaseUrl || databaseUrl.includes("dummy") || databaseUrl.includes("localhost") || databaseUrl.includes("[PROJECT_REF]")) {
      throw new Error("FATAL: DATABASE_URL is missing or invalid in the Edge runtime.");
    }

    try {
      // Secure URL Parsing using the native URL constructor.
      // This prevents the username and password/token from concatenating.
      const parsedUrl = new URL(databaseUrl);
      const username = parsedUrl.username;

      // Mathematically URL-decode the password in case it contains encoded special characters
      const password = decodeURIComponent(parsedUrl.password);
      const host = parsedUrl.hostname;
      const port = parsedUrl.port ? parseInt(parsedUrl.port, 10) : 5432;
      const dbName = parsedUrl.pathname.replace(/^\//, "");

      if (dbName !== "postgres") {
        throw new Error(`Invalid database name: "${dbName}". Path must strictly point to /postgres.`);
      }

      // Configure connection settings for Neon Serverless Pool.
      // Set max connection pool size to 1 to prevent pool exhaustion across 10k users/isolates.
      globalRef._dbPool = new Pool({
        user: username,
        password: password,
        host: host,
        port: port,
        database: dbName,
        max: 1, // Maximum 1 connection per Worker isolate
        ssl: true, // Force secure SSL connection
      });

      globalRef._dbInstance = drizzle(globalRef._dbPool, { schema });
    } catch (err) {
      console.error(`DB_INIT_FAILED: Unable to create database client for ${maskDatabaseUrl(databaseUrl)}. Cause:`, err);
      throw new Error(
        `DB_INIT_FAILED: Unable to create database client. Cause: ${err instanceof Error ? err.message : String(err)}`
      );
    }
  }

  return globalRef._dbInstance;
}

/**
 * Executes a database query with a hard timeout of 10 seconds.
 */
export async function dbQuery<T>(
  fn: (db: ReturnType<typeof drizzle<typeof schema>>) => Promise<T>,
  label = "dbQuery"
): Promise<T> {
  const db = getDb();
  const ms = 10_000; // 10 seconds timeout

  const controller = new AbortController();
  const timer = setTimeout(() => {
    controller.abort();
  }, ms);

  // Allow the timer to NOT keep the process alive
  if (typeof timer === "object" && "unref" in timer) {
    (timer as unknown as { unref(): void }).unref();
  }

  const timeoutPromise = new Promise<never>((_, reject) => {
    const onAbort = () => {
      controller.signal.removeEventListener("abort", onAbort);
      reject(
        new Error(
          `DB_OP_TIMEOUT: ${label} did not complete within ${ms}ms.`
        )
      );
    };
    controller.signal.addEventListener("abort", onAbort, { once: true });
  });

  try {
    const result = await Promise.race([fn(db), timeoutPromise]);
    clearTimeout(timer);
    return result;
  } catch (error) {
    clearTimeout(timer);
    throw error;
  }
}

/**
 * Resets the connection pool state.
 */
export function resetDbConnection(): void {
  if (globalRef._dbPool) {
    try {
      globalRef._dbPool.end();
    } catch {
      // Swallow
    }
  }
  globalRef._dbPool = undefined;
  globalRef._dbInstance = undefined;
}

/**
 * Performs a lightweight health check (SELECT 1).
 */
export async function isDbHealthy(): Promise<boolean> {
  try {
    const db = getDb();
    await dbQuery(async (d) => {
      await d.execute(sql`SELECT 1`);
    }, "healthCheck");
    return true;
  } catch {
    return false;
  }
}

// Re-export sql for convenience
export { sql };
