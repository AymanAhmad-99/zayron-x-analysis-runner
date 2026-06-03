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

export const db = new Proxy({} as ReturnType<typeof drizzle<typeof schema>>, {
  get(target, prop, receiver) {
    if (!dbInstance) {
      const url = process.env.DATABASE_URL;
      
      // Handle build-time / CI / missing env var gracefully
      if (process.env.CI || !url || url.includes("[PROJECT_REF]")) {
        const dummyClient = postgres("postgresql://postgres:dummy@localhost:5432/postgres", { max: 1 });
        dbInstance = drizzle(dummyClient, { schema });
      } else {
        client = postgres(url, {
          prepare: false,     // Required for Supabase / PgBouncer transaction-mode pooler
          max: process.env.NODE_ENV === "production" ? 1 : 3, // Low connection limit (1 in prod serverless, 3 in dev)
          idle_timeout: 10,   // Close idle connections after 10s
          connect_timeout: 5, // Timeout quickly
        });
        dbInstance = drizzle(client, { schema });
      }
    }
    return Reflect.get(dbInstance, prop, receiver);
  },
});