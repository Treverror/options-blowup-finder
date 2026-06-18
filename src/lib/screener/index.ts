import { env } from "../env";
import type { Candidate, ScreenRun } from "../types";
import { resolveUniverse } from "./universe";
import { fetchQuotes } from "./providers/yahoo";
import { fetchSentiment } from "./providers/alphavantage";
import {
  fetchEarningsCalendar,
  fetchInsider,
} from "./providers/finnhub";
import {
  sentimentSignal,
  volumeSignal,
  catalystSignal,
  insiderSignal,
} from "./signals";
import { buildRationale, compositeStrength, netDirection } from "./scoring";
import { pickContract } from "./options";

// How many of the highest-scoring names get the "expensive" extra lookups
// (insider transactions + options chain), keeping us inside free rate limits.
const ENRICH_TOP_N = 12;

export async function runScreen(): Promise<ScreenRun> {
  const universe = resolveUniverse();
  const notes: string[] = [];
  const hasFinnhub = Boolean(env.finnhubKey);
  const hasAlpha = Boolean(env.alphaVantageKey);

  if (!hasFinnhub) notes.push("Finnhub key missing — catalyst & insider signals disabled.");
  if (!hasAlpha) notes.push("Alpha Vantage key missing — sentiment signal disabled.");

  // --- Batch / single-call fetches (cheap) -------------------------------
  const [quotes, sentiment, earnings] = await Promise.all([
    fetchQuotes(universe),
    hasAlpha ? fetchSentiment(universe) : Promise.resolve(new Map()),
    hasFinnhub ? fetchEarningsCalendar(0, 30) : Promise.resolve(new Map()),
  ]);

  // fetchQuotes already populates trailing 5-day change from the same chart
  // call, so we just keep the names we actually got a quote for.
  const symbols = universe.filter((s) => quotes.has(s));

  // --- First pass: score with the cheap signals --------------------------
  const prelim: Candidate[] = [];
  for (const sym of symbols) {
    const q = quotes.get(sym)!;
    const signals = {
      sentiment: sentimentSignal(q, sentiment.get(sym), hasAlpha),
      volume: volumeSignal(q),
      catalyst: catalystSignal(earnings.get(sym), hasFinnhub),
      insider: insiderSignal(null, hasFinnhub), // filled for top names below
    };
    prelim.push({
      symbol: sym,
      name: q.name,
      price: q.price,
      changePct: q.changePct,
      compositeScore: compositeStrength(signals),
      direction: netDirection(signals),
      signals,
      contract: null,
      rationale: "",
    });
  }

  prelim.sort((a, b) => b.compositeScore - a.compositeScore);

  // --- Enrich the top names with insider + a contract idea ---------------
  const top = prelim.slice(0, ENRICH_TOP_N);
  await mapLimit(top, 4, async (c) => {
    if (hasFinnhub) {
      const insider = await fetchInsider(c.symbol);
      c.signals.insider = insiderSignal(insider, hasFinnhub);
    }
    // Recompute now that insider data is present.
    c.compositeScore = compositeStrength(c.signals);
    c.direction = netDirection(c.signals);

    const catDate = c.signals.catalyst.available
      ? earnings.get(c.symbol)?.date ?? null
      : null;
    c.contract = await pickContract(c.symbol, c.price, c.direction, catDate);
    c.rationale = buildRationale(c.symbol, c.signals, c.direction);
  });

  // Rationale for the non-enriched remainder.
  for (const c of prelim.slice(ENRICH_TOP_N)) {
    c.rationale = buildRationale(c.symbol, c.signals, c.direction);
  }

  prelim.sort((a, b) => b.compositeScore - a.compositeScore);

  return {
    ranAt: new Date().toISOString(),
    universeSize: universe.length,
    candidates: prelim,
    notes,
  };
}

// Run async fn over items with bounded concurrency.
async function mapLimit<T>(
  items: T[],
  limit: number,
  fn: (item: T) => Promise<void>
): Promise<void> {
  let i = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (i < items.length) {
      const idx = i++;
      await fn(items[idx]);
    }
  });
  await Promise.all(workers);
}
