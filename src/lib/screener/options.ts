import type { ContractIdea, Direction } from "../types";
import { fetchChain, type ChainOption } from "./providers/yahoo";

// Suggest a single, liquid-ish contract aligned with the directional lean and
// positioned to span an upcoming catalyst. Bullish -> slightly OTM call,
// bearish -> slightly OTM put. Neutral leans default to a call (cheap upside).
export async function pickContract(
  symbol: string,
  price: number | null,
  direction: Direction,
  catalystDate: string | null
): Promise<ContractIdea | null> {
  if (!price || price <= 0) return null;

  // Want expiry comfortably after the catalyst; minimum ~30 days out.
  const minExpiry = new Date();
  minExpiry.setDate(minExpiry.getDate() + 30);
  if (catalystDate) {
    const cat = new Date(catalystDate);
    cat.setDate(cat.getDate() + 7); // a week of room past the event
    if (cat.getTime() > minExpiry.getTime()) minExpiry.setTime(cat.getTime());
  }

  const chain = await fetchChain(symbol, minExpiry);
  if (!chain) return null;

  const type: "call" | "put" = direction === "bearish" ? "put" : "call";
  const side = type === "call" ? chain.calls : chain.puts;
  if (side.length === 0) return null;

  // Target a strike ~5% out of the money in the lean's direction.
  const target = type === "call" ? price * 1.05 : price * 0.95;
  const best = side.reduce((a, b) =>
    Math.abs(b.strike - target) < Math.abs(a.strike - target) ? b : a
  );

  const days = Math.round(
    (chain.expiration.getTime() - Date.now()) / 86_400_000
  );

  return {
    type,
    strike: best.strike,
    expiration: chain.expiration.toISOString().slice(0, 10),
    daysToExpiry: days,
    lastPrice: best.lastPrice,
    impliedVolatility: round(best.impliedVolatility),
    inTheMoney: best.inTheMoney,
    contractSymbol: best.contractSymbol,
  };
}

function round(v: number | null): number | null {
  return v == null ? null : Math.round(v * 1000) / 1000;
}

export type { ChainOption };
