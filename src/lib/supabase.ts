import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// Browser client — RLS protects everything.
export function browserSupabase(): SupabaseClient {
  return createClient(
    import.meta.env.PUBLIC_SUPABASE_URL!,
    import.meta.env.PUBLIC_SUPABASE_ANON_KEY!,
  );
}

// Server client with the request's auth cookie (anon RLS still applies).
export function serverSupabase(accessToken?: string): SupabaseClient {
  const client = createClient(
    import.meta.env.PUBLIC_SUPABASE_URL!,
    import.meta.env.PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: { persistSession: false, autoRefreshToken: false },
      global: accessToken
        ? { headers: { Authorization: `Bearer ${accessToken}` } }
        : undefined,
    },
  );
  return client;
}

// Service-role client — bypasses RLS. Server-only. Use for admin tasks.
export function adminSupabase(env?: { SUPABASE_SERVICE_ROLE_KEY?: string }): SupabaseClient {
  const key = env?.SUPABASE_SERVICE_ROLE_KEY ?? import.meta.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createClient(import.meta.env.PUBLIC_SUPABASE_URL!, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
