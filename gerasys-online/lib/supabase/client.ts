import { createClient as supabaseCreateClient, SupabaseClient } from '@supabase/supabase-js';

// Client for public reads
export function getSupabaseClient(env?: any): SupabaseClient {
  const url = env?.NEXT_PUBLIC_SUPABASE_URL 
    || env?.SUPABASE_URL
    || process.env.NEXT_PUBLIC_SUPABASE_URL
    || process.env.SUPABASE_URL!;
  const key = env?.NEXT_PUBLIC_SUPABASE_ANON_KEY 
    || env?.SUPABASE_ANON_KEY
    || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    || process.env.SUPABASE_ANON_KEY!;
  return supabaseCreateClient(url, key, {
    auth: { persistSession: false },
    global: { fetch: fetch }
  });
}

// Alias for client-side pages
export function createClient(env?: any): SupabaseClient {
  return getSupabaseClient(env);
}

// Client for administrative operations (service role)
export function getSupabaseAdmin(env?: any): SupabaseClient {
  const url = env?.NEXT_PUBLIC_SUPABASE_URL 
    || env?.SUPABASE_URL
    || process.env.NEXT_PUBLIC_SUPABASE_URL
    || process.env.SUPABASE_URL!;
  const key = env?.SUPABASE_SERVICE_KEY
    || env?.SUPABASE_SERVICE_ROLE_KEY
    || process.env.SUPABASE_SERVICE_KEY
    || process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return supabaseCreateClient(url, key, {
    auth: { persistSession: false },
    global: { fetch: fetch }
  });
}
