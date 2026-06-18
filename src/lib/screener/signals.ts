import type { Direction, QuoteData, SignalScore } from "../types";
import type { SentimentSummary } from "./providers/alphavantage";
import type { EarningsEvent, InsiderSummary } from "./providers/finnhub";

const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
const pct = (x: number) => Math.round(clamp01(x) * 100);

const UNAVAILABLE: SignalScore = {
  score: 0,
  direction: "neutral",
  available: false,
  detail: "No data source configured.",
};

// 1. SENTIMENT vs FLAT PRICE — the core "market hasn't reacted yet" signal.
// Strong news sentiment + a price that has barely moved = under-reaction.
export function sentimentSignal(
  quote: QuoteData,
  sent: SentimentSummary | undefined,
  hasKey: boolean
): SignalScore {
  if (!hasKey) return { ...UNAVAILABLE, detail: "Alpha Vantage key not set." };
  if (!sent || sent.articleCount < 2) {
    return {
      score: 0,
      direction: "neutral",
      available: true,
      detail: "Not enough recent news to gauge sentiment.",
    };
  }

  // AV scores roughly -0.35..+0.35 for "bearish/bullish"; treat 0.35 as strong.
  const sentimentMag = clamp01(Math.abs(sent.avgScore) / 0.35);
  // How much the stock has already moved over the last ~5 sessions.
  const moved = Math.abs(quote.changePct5d ?? quote.changePct ?? 0);
  const reacted = clamp01(moved / 8); // 8% = fully priced in
  const underReaction = sentimentMag * (1 - reacted);
  const confidence = clamp01(sent.articleCount / 5);

  const direction: Direction =
    sent.avgScore > 0.05 ? "bullish" : sent.avgScore < -0.05 ? "bearish" : "neutral";

  return {
    score: pct(underReaction * confidence),
    direction,
    available: true,
    detail: `${sent.articleCount} articles, avg sentiment ${sent.avgScore.toFixed(
      2
    )}; price moved ${moved.toFixed(1)}% over 5d (${
      reacted < 0.5 ? "under-reacted" : "largely priced in"
    }).`,
  };
}

// 2. UNUSUAL VOLUME — relative volume vs the 3-month average.
export function volumeSignal(quote: QuoteData): SignalScore {
  if (!quote.volume || !quote.avgVolume) {
    return { ...UNAVAILABLE, available: true, detail: "Volume data unavailable." };
  }
  const rvol = quote.volume / quote.avgVolume;
  const score = pct((rvol - 1) / 2); // rvol 1x -> 0, 3x -> 100
  const direction: Direction =
    (quote.changePct ?? 0) > 0.3
      ? "bullish"
      : (quote.changePct ?? 0) < -0.3
      ? "bearish"
      : "neutral";
  return {
    score,
    direction,
    available: true,
    detail: `Relative volume ${rvol.toFixed(2)}x the 3-month average.`,
  };
}

// 3. CATALYST CALENDAR — proximity of a known upcoming earnings event.
export function catalystSignal(
  event: EarningsEvent | undefined,
  hasKey: boolean
): SignalScore {
  if (!hasKey) return { ...UNAVAILABLE, detail: "Finnhub key not set." };
  if (!event) {
    return {
      score: 0,
      direction: "neutral",
      available: true,
      detail: "No earnings event in the next 30 days.",
    };
  }
  const days = Math.round(
    (new Date(event.date).getTime() - Date.now()) / 86_400_000
  );
  if (days < 0) {
    return {
      score: 0,
      direction: "neutral",
      available: true,
      detail: "Most recent earnings already passed.",
    };
  }
  // Closer = hotter; a 21-day horizon decays to zero.
  const score = pct(1 - days / 21);
  return {
    score,
    direction: "neutral",
    available: true,
    detail: `Earnings in ${days} day${days === 1 ? "" : "s"} (${event.date}).`,
  };
}

// 4. INSIDER — net insider buying over the trailing window.
export function insiderSignal(
  insider: InsiderSummary | null,
  hasKey: boolean
): SignalScore {
  if (!hasKey) return { ...UNAVAILABLE, detail: "Finnhub key not set." };
  if (!insider || insider.buyTransactions + insider.sellTransactions === 0) {
    return {
      score: 0,
      direction: "neutral",
      available: true,
      detail: "No insider transactions in the last 90 days.",
    };
  }
  if (insider.netShares > 0) {
    const score = pct(Math.min(insider.buyTransactions, 5) / 5);
    return {
      score,
      direction: "bullish",
      available: true,
      detail: `Net insider buying across ${insider.buyTransactions} purchase(s).`,
    };
  }
  // Net selling is a weaker / noisier signal (insiders sell for many reasons).
  const score = pct((Math.min(insider.sellTransactions, 5) / 5) * 0.6);
  return {
    score,
    direction: "bearish",
    available: true,
    detail: `Net insider selling across ${insider.sellTransactions} sale(s).`,
  };
}
