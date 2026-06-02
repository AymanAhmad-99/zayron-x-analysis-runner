import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_ANON_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        },
      },
    }
  );
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

  return createServerClient(
    process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        },
      },
    }
  );
}
