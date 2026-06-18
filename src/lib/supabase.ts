import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { env, hasSupabase } from "./env";

// Server-side admin client (service role) — used by the API route / cron to
// write screen results. Never import this into a client component.
let admin: SupabaseClient | null = null;
export function getAdminClient(): SupabaseClient | null {
  if (!hasSupabase()) return null;
  if (!admin) {
    admin = createClient(env.supabaseUrl, env.supabaseServiceKey, {
      auth: { persistSession: false },
    });
  }
  return admin;
}

// Read-only client (anon key) — used by server components to render the
// dashboard. Returns null if Supabase isn't configured yet.
let reader: SupabaseClient | null = null;
export function getReadClient(): SupabaseClient | null {
  if (!env.supabaseUrl || !env.supabaseAnonKey) return null;
  if (!reader) {
    reader = createClient(env.supabaseUrl, env.supabaseAnonKey, {
      auth: { persistSession: false },
    });
  }
  return reader;
}
