import { env } from "../env";

// Default scan universe: liquid, heavily-optioned US names across sectors.
// Kept to ~50 to stay comfortably inside free-tier rate limits. Override with
// the SCREEN_UNIVERSE env var (comma-separated) for a custom watchlist.
export const DEFAULT_UNIVERSE: string[] = [
  // Mega-cap tech
  "AAPL", "MSFT", "NVDA", "AMZN", "GOOGL", "META", "TSLA", "AMD", "AVGO", "NFLX",
  // Semis / hardware
  "INTC", "MU", "QCOM", "SMCI", "ARM", "DELL",
  // Software / internet
  "CRM", "ORCL", "ADBE", "PLTR", "SNOW", "UBER", "SHOP", "COIN", "ABNB",
  // Consumer
  "DIS", "SBUX", "NKE", "MCD", "TGT", "WMT", "COST",
  // Financials
  "JPM", "BAC", "GS", "PYPL", "SOFI", "V",
  // Health / biotech (catalyst-rich)
  "PFE", "MRNA", "LLY", "UNH", "AMGN",
  // Energy / industrials
  "XOM", "CVX", "BA", "CAT", "GE",
  // High-beta / meme-prone
  "GME", "AMC", "RIVN", "LCID", "MARA", "RIOT",
];

export function resolveUniverse(): string[] {
  if (env.universeOverride.length > 0) return env.universeOverride;
  return DEFAULT_UNIVERSE;
}
