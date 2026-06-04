import { createClient } from "@supabase/supabase-js";
import type { SupabaseClient } from "@supabase/supabase-js";

/* ─────────────────────────────────────────────────────────
   ZAYRON‑X — Edge‑Native Database Layer (Supabase HTTP)

   The `postgres` npm package unconditionally imports `fs`
   (node_modules/postgres/src/index.js:2), which permanently
   blocks Cloudflare Workers deployment — the Workers V8
   isolate has no filesystem.

   By using `@supabase/supabase-js` (pure HTTP / fetch‑based),
   we eliminate every Node.js built‑in dependency from the
   bundle.  All queries flow through Supabase's PostgREST
   API at the edge — fully compatible with Cloudflare Workers.

   SECURITY:
   - Service‑role key bypasses Row‑Level Security (RLS).
   - This module MUST only be imported from server code.
   - The anon key is NEVER used for database operations.
   ───────────────────────────────────────────────────────── */

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

/* ── Edge‑safe singleton: no global mutable state ── */
let _supabase: SupabaseClient | null = null;

function getSupabaseClient(): SupabaseClient {
  if (!_supabase) {
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error(
        "FATAL: SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is missing. " +
        "These must be set as environment variables (SUPABASE_SERVICE_ROLE_KEY " +
        "must be a Cloudflare Secret)."
      );
    }

    _supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false },
      db: {
        schema: "public",
      },
      global: {
        headers: {
          "X-Client-Info": "zayron-x-edge-worker",
        },
      },
    });
  }
  return _supabase;
}

/**
 * Returns a Supabase client configured with the service‑role key.
 *
 * All server‑side database operations MUST use this function
 * to obtain the client.  It is edge‑safe (no fs, no net, no tls).
 */
export function getDb() {
  return getSupabaseClient();
}

/**
 * Resets the client singleton.  Call after a recoverable error
 * if you need to force a fresh HTTP connection pool.
 */
export function resetDbConnection(): void {
  _supabase = null;
}

/**
 * Lightweight health check — pings the Supabase REST API.
 * Returns true if the database is reachable within the timeout.
 */
export async function isDbHealthy(): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 5_000);

    // Use the REST API health endpoint (PostgREST always responds)
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/`,
      {
        method: "HEAD",
        headers: {
          apikey: SUPABASE_SERVICE_ROLE_KEY,
          Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        },
        signal: controller.signal,
      }
    );

    clearTimeout(timer);
    return res.ok || res.status === 401; // 401 = reachable but needs auth
  } catch {
    return false;
  }
}

// Re-export the Supabase client type for consumers that need it
export type { SupabaseClient };
