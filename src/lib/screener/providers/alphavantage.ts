import { env } from "../../env";

const BASE = "https://www.alphavantage.co/query";

export interface SentimentSummary {
  symbol: string;
  // Average ticker-specific sentiment score across recent articles (-1..1).
  avgScore: number;
  articleCount: number;
}

// Alpha Vantage NEWS_SENTIMENT accepts a comma-separated `tickers` filter and
// returns a single feed of articles, each annotated with per-ticker sentiment.
// We make ONE request for the whole batch to respect the 25 req/day free tier,
// then aggregate per symbol.
export async function fetchSentiment(
  symbols: string[]
): Promise<Map<string, SentimentSummary>> {
  const out = new Map<string, SentimentSummary>();
  if (!env.alphaVantageKey || symbols.length === 0) return out;

  // AV caps the tickers filter; keep the request reasonable.
  const tickers = symbols.slice(0, 50).join(",");
  const url =
    `${BASE}?function=NEWS_SENTIMENT&tickers=${tickers}` +
    `&sort=LATEST&limit=200&apikey=${env.alphaVantageKey}`;

  try {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) {
      console.error(`[alphavantage] NEWS_SENTIMENT -> ${res.status}`);
      return out;
    }
    const data = await res.json();
    if (data.Note || data.Information) {
      // Rate-limited or invalid key — AV returns a message body, not an error.
      console.warn("[alphavantage]", data.Note || data.Information);
      return out;
    }

    const acc = new Map<string, { sum: number; n: number }>();
    for (const article of data.feed ?? []) {
      for (const ts of article.ticker_sentiment ?? []) {
        const sym = String(ts.ticker || "").toUpperCase();
        if (!sym) continue;
        const score = Number(ts.ticker_sentiment_score);
        const relevance = Number(ts.relevance_score) || 0;
        if (!Number.isFinite(score) || relevance < 0.1) continue;
        const cur = acc.get(sym) ?? { sum: 0, n: 0 };
        cur.sum += score;
        cur.n += 1;
        acc.set(sym, cur);
      }
    }

    for (const [sym, { sum, n }] of acc) {
      out.set(sym, { symbol: sym, avgScore: sum / n, articleCount: n });
    }
  } catch (err) {
    console.error("[alphavantage] failed:", (err as Error).message);
  }

  return out;
}
