import { createClient, SupabaseClient } from "@supabase/supabase-js";

// These environment variables must be set in your Cloudflare Pages project settings
// (or Replit Secrets for local development):
//   VITE_SUPABASE_URL      — your Supabase project URL (e.g. https://xyz.supabase.co)
//   VITE_SUPABASE_ANON_KEY — your Supabase anon/public key

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

// Lazy singleton — throws only when the client is actually used, not at module
// load time. This lets the Vite build succeed even if the env vars are not set
// in the CI/CD environment, while still failing loudly at runtime.
let _client: SupabaseClient | null = null;

function getClient(): SupabaseClient {
  if (_client) return _client;
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      "❌ Missing Supabase environment variables.\n" +
        "Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in:\n" +
        "  • Replit Secrets (local dev)\n" +
        "  • Cloudflare Pages → Settings → Environment variables (production)"
    );
  }
  _client = createClient(supabaseUrl, supabaseAnonKey);
  return _client;
}

// Proxy so callers can write `supabase.auth.xxx` without knowing about lazy init
export const supabase = new Proxy({} as SupabaseClient, {
  get(_target, prop) {
    return (getClient() as unknown as Record<string | symbol, unknown>)[prop];
  },
});
