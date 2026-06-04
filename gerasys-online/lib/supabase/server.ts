import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

declare global {
  var sessionRefreshQueue: Map<string, { cookies: any[]; expiry: number }> | undefined;
}

export async function createClient() {
  const cookieStore = await cookies();

  const client = createServerClient(
    process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_ANON_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            for (const { name, value, options } of cookiesToSet) {
              cookieStore.set(name, value, options);
            }
          } catch (error) {
            console.warn(JSON.stringify({
              event: "SESSION_REFRESH_COOKIE_WRITE_FAILED",
              error: error instanceof Error ? error.message : String(error),
              cookies: cookiesToSet.map(c => c.name)
            }));
            
            const oldRefreshToken = cookieStore.getAll().find(c => c.name.endsWith('-refresh-token'))?.value;
            if (oldRefreshToken) {
              if (!(globalThis as any).sessionRefreshQueue) {
                (globalThis as any).sessionRefreshQueue = new Map();
              }
              (globalThis as any).sessionRefreshQueue.set(oldRefreshToken, {
                cookies: cookiesToSet,
                expiry: Date.now() + 60000
              });
            }
          }
        },
      },
    }
  );

  const originalGetUser = client.auth.getUser.bind(client.auth);
  client.auth.getUser = async (jwt?: string) => {
    if (process.env.CHAOS_FORCE_SESSION_EXPIRY === 'true') {
      try {
        const { data: { session } } = await client.auth.getSession();
        if (session?.refresh_token) {
          await client.auth.refreshSession({ refresh_token: session.refresh_token });
        }
      } catch (err) {
        console.error("Chaos session expiry simulation failed:", err);
      }
    }
    return originalGetUser(jwt);
  };

  return client;
}

/*
 * ⚠️  SECURITY WARNING — SERVICE ROLE CLIENT
 *
 * createAdminClient() initializes a Supabase client with the SERVICE_ROLE key.
 * This key BYPASSES Row Level Security and grants FULL database access.
 *
 * RULES FOR USING THIS CLIENT:
 * 1. NEVER call this from a Client Component, `'use client'` file, or any
 *    code that ships to the browser. The service role key must NEVER appear
 *    in client-side JavaScript bundles.
 * 2. ONLY use this in secure server contexts: API Route handlers,
 *    Server Components, Server Actions, or backend workers.
 * 3. NEVER pass the service role client or its key to a Client Component
 *    as a prop, context value, or serialized state.
 * 4. Use `createClient()` (anon key) for all other cases — it respects RLS.
 * 5. If you are unsure which client to use, use `createClient()`.
 *
 * Violating these rules exposes your entire database to the public internet.
 */
export async function createAdminClient() {
  const cookieStore = await cookies();

  const client = createServerClient(
    process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            for (const { name, value, options } of cookiesToSet) {
              cookieStore.set(name, value, options);
            }
          } catch (error) {
            console.warn(JSON.stringify({
              event: "SESSION_REFRESH_COOKIE_WRITE_FAILED",
              error: error instanceof Error ? error.message : String(error),
              cookies: cookiesToSet.map(c => c.name)
            }));
            
            const oldRefreshToken = cookieStore.getAll().find(c => c.name.endsWith('-refresh-token'))?.value;
            if (oldRefreshToken) {
              if (!(globalThis as any).sessionRefreshQueue) {
                (globalThis as any).sessionRefreshQueue = new Map();
              }
              (globalThis as any).sessionRefreshQueue.set(oldRefreshToken, {
                cookies: cookiesToSet,
                expiry: Date.now() + 60000
              });
            }
          }
        },
      },
    }
  );

  const originalGetUser = client.auth.getUser.bind(client.auth);
  client.auth.getUser = async (jwt?: string) => {
    if (process.env.CHAOS_FORCE_SESSION_EXPIRY === 'true') {
      try {
        const { data: { session } } = await client.auth.getSession();
        if (session?.refresh_token) {
          await client.auth.refreshSession({ refresh_token: session.refresh_token });
        }
      } catch (err) {
        console.error("Chaos session expiry simulation failed:", err);
      }
    }
    return originalGetUser(jwt);
  };

  return client;
}
