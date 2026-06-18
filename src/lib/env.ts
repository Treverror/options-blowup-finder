// Centralized, lazy access to environment configuration.

export const env = {
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
  supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
  supabaseServiceKey: process.env.SUPABASE_SERVICE_ROLE_KEY ?? "",
  finnhubKey: process.env.FINNHUB_API_KEY ?? "",
  alphaVantageKey: process.env.ALPHAVANTAGE_API_KEY ?? "",
  cronSecret: process.env.CRON_SECRET ?? "",
  universeOverride: (process.env.SCREEN_UNIVERSE ?? "")
    .split(",")
    .map((s) => s.trim().toUpperCase())
    .filter(Boolean),
};

export const hasSupabase = () =>
  Boolean(env.supabaseUrl && env.supabaseServiceKey);
