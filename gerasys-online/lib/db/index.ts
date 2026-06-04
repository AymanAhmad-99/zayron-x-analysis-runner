import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

/* ─────────────────────────────────────────────────────────
   ZAYRON-X — Secure Database Connection
   All credentials sourced from environment variables.
   ⚠️  NEVER hardcode passwords in this file.
   ───────────────────────────────────────────────────────── */

let client: postgres.Sql | null = null;
let dbInstance: ReturnType<typeof drizzle<typeof schema>> | null = null;

export function getDb() {
  if (!dbInstance) {
    const url = process.env.DATABASE_URL;

    // Fail-Fast Rule: if missing, falsy, or invalid (localhost/dummy), throw immediately
    if (!url || url.includes("dummy") || url.includes("localhost") || url.includes("[PROJECT_REF]")) {
      throw new Error("FATAL: DATABASE_URL is missing or invalid in the Edge runtime.");
    }

    client = postgres(url, {
      max: 1,             // Maximum 1 connection on the Edge
      idle_timeout: 5,    // Close idle connections after 5s
      connect_timeout: 3, // Timeout quickly (3s) to avoid Fatal Hangs
      prepare: false,     // Required for Supabase / PgBouncer transaction-mode pooler
      ssl: 'require',     // CRITICAL: Prevents silent TCP drops from Supabase
    });
    dbInstance = drizzle(client, { schema });
  }
  return dbInstance;
}