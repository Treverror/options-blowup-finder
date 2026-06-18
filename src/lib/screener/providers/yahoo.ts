import yahooFinanceTyped from "yahoo-finance2";
import type { QuoteData } from "../../types";

// yahoo-finance2's bundled types model the default export as a class
// constructor, which doesn't match the singleton runtime API we actually use
// (quote / chart / options / suppressNotices). Cast once to keep the
// production type-check green; runtime behavior is unchanged.
const yahooFinance: any = yahooFinanceTyped;

// Silence the library's survey/validation notices in serverless logs.
// Guarded so an API change in the dependency can't throw at module load.
try {
  yahooFinance.suppressNotices?.(["yahooSurvey", "ripHistorical"]);
} catch {
  /* non-fatal */
}

// Batch-fetch quote snapshots. yahoo-finance2 accepts an array and returns
// one object per symbol in a single request.
export async function fetchQuotes(symbols: string[]): Promise<Map<string, QuoteData>> {
  const out = new Map<string, QuoteData>();
  if (symbols.length === 0) return out;

  try {
    const results = await yahooFinance.quote(symbols);
    const list = Array.isArray(results) ? results : [results];
    for (const q of list) {
      if (!q?.symbol) continue;
      out.set(q.symbol.toUpperCase(), {
        symbol: q.symbol.toUpperCase(),
        name: q.shortName ?? q.longName ?? null,
        price: num(q.regularMarketPrice),
        changePct: num(q.regularMarketChangePercent),
        changePct5d: null, // filled in by history call below
        volume: num(q.regularMarketVolume),
        avgVolume: num(q.averageDailyVolume3Month),
        marketCap: num(q.marketCap),
      });
    }
  } catch (err) {
    console.error("[yahoo] quote batch failed:", (err as Error).message);
  }

  return out;
}

// Trailing 5-session % change, used by the sentiment-divergence signal so a
// stock that already ran on the news scores lower.
export async function fetchTrailingChange(symbol: string): Promise<number | null> {
  try {
    const now = new Date();
    const start = new Date(now.getTime() - 12 * 24 * 60 * 60 * 1000);
    const chart = await yahooFinance.chart(symbol, {
      period1: start,
      period2: now,
      interval: "1d",
    });
    const closes = (chart.quotes ?? [])
      .map((c) => c.close)
      .filter((c): c is number => typeof c === "number");
    if (closes.length < 2) return null;
    const recent = closes.slice(-6); // ~5 sessions back
    const first = recent[0];
    const last = recent[recent.length - 1];
    if (!first) return null;
    return ((last - first) / first) * 100;
  } catch {
    return null;
  }
}

export interface ChainOption {
  contractSymbol: string;
  strike: number;
  lastPrice: number | null;
  impliedVolatility: number | null;
  inTheMoney: boolean;
}

export interface ChainForExpiry {
  expiration: Date;
  calls: ChainOption[];
  puts: ChainOption[];
}

// Fetch the options chain for the nearest expiration at/after `afterDate`.
export async function fetchChain(
  symbol: string,
  afterDate: Date
): Promise<ChainForExpiry | null> {
  try {
    const base = await yahooFinance.options(symbol);
    const dates = base.expirationDates ?? [];
    const target =
      dates.find((d) => d.getTime() >= afterDate.getTime()) ??
      dates[dates.length - 1];
    if (!target) return null;

    const detail = await yahooFinance.options(symbol, { date: target });
    const chain = detail.options?.[0];
    if (!chain) return null;

    const map = (arr: any[] = []): ChainOption[] =>
      arr.map((o) => ({
        contractSymbol: o.contractSymbol,
        strike: o.strike,
        lastPrice: num(o.lastPrice),
        impliedVolatility: num(o.impliedVolatility),
        inTheMoney: Boolean(o.inTheMoney),
      }));

    return {
      expiration: target,
      calls: map(chain.calls),
      puts: map(chain.puts),
    };
  } catch (err) {
    console.error(`[yahoo] options ${symbol} failed:`, (err as Error).message);
    return null;
  }
}

function num(v: unknown): number | null {
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}
