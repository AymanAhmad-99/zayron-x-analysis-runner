import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

/* ─────────────────────────────────────────────────────────
   ZAYRON-X — Secure Database Connection
   All credentials sourced from environment variables.
   ⚠️  NEVER hardcode passwords in this file.
   ───────────────────────────────────────────────────────── */

const requiredEnvVars = ["DATABASE_URL"] as const;

for (const key of requiredEnvVars) {
  if (!process.env[key]) {
    throw new Error(
      `[ZAYRON-X] Missing required environment variable: ${key}. ` +
      `Ensure .env.local is configured. See .env.local.example for reference.`
    );
  }
}

// Attach pg connection pool client to globalThis to preserve across Next.js dev reloads
declare global {
  var _postgresClient: postgres.Sql | undefined;
}

let client: postgres.Sql;

if (process.env.NODE_ENV === "production") {
  client = postgres(process.env.DATABASE_URL!, {
    prepare: false,     // Required for Supabase / PgBouncer transaction-mode pooler
    max: 8,             // Cap connections per serverless instance
    idle_timeout: 15,   // Let idle connections persist to allow immediate reuse
    connect_timeout: 8, // Set a safe connection timeout threshold
  });
} else {
  if (!globalThis._postgresClient) {
    globalThis._postgresClient = postgres(process.env.DATABASE_URL!, {
      prepare: false,
      max: 3,           // Minimize local development connections
      idle_timeout: 1,  // Clear developer connections quickly
      connect_timeout: 5,
    });
  }
  client = globalThis._postgresClient;
}

export const db = drizzle(client, { schema });