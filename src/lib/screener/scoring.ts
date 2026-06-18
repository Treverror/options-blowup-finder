import type { Candidate, Direction, SignalScore } from "../types";

// Relative importance of each signal in the composite strength score.
export const WEIGHTS = {
  sentiment: 0.4,
  volume: 0.2,
  catalyst: 0.2,
  insider: 0.2,
} as const;

type Signals = Candidate["signals"];

// Composite strength (0-100): weighted average over the signals that actually
// had data, with weights renormalized so missing sources don't drag the score.
export function compositeStrength(signals: Signals): number {
  let weighted = 0;
  let weightSum = 0;
  (Object.keys(WEIGHTS) as (keyof Signals)[]).forEach((k) => {
    const s = signals[k];
    if (!s.available) return;
    weighted += WEIGHTS[k] * s.score;
    weightSum += WEIGHTS[k];
  });
  if (weightSum === 0) return 0;
  return Math.round(weighted / weightSum);
}

// Directional vote: sentiment and insider carry direction; volume confirms.
// Catalyst is direction-neutral (it amplifies, doesn't point).
export function netDirection(signals: Signals): Direction {
  const vote = (s: SignalScore, w: number) => {
    if (!s.available || s.direction === "neutral") return 0;
    return (s.direction === "bullish" ? 1 : -1) * s.score * w;
  };
  const total =
    vote(signals.sentiment, 0.5) +
    vote(signals.insider, 0.3) +
    vote(signals.volume, 0.2);
  if (total > 5) return "bullish";
  if (total < -5) return "bearish";
  return "neutral";
}

export function buildRationale(
  symbol: string,
  signals: Signals,
  direction: Direction
): string {
  const parts: string[] = [];
  const ranked = (Object.entries(signals) as [keyof Signals, SignalScore][])
    .filter(([, s]) => s.available && s.score > 0)
    .sort((a, b) => b[1].score - a[1].score);

  if (ranked.length === 0) {
    return `${symbol}: no active signals fired this run.`;
  }
  for (const [name, s] of ranked.slice(0, 3)) {
    parts.push(`${label(name)} (${s.score}) — ${s.detail}`);
  }
  const lean =
    direction === "neutral" ? "Mixed/neutral lean" : `Lean: ${direction}`;
  return `${lean}. ${parts.join("  ")}`;
}

function label(k: string): string {
  return (
    { sentiment: "Sentiment vs price", volume: "Unusual volume", catalyst: "Catalyst", insider: "Insider" } as Record<
      string,
      string
    >
  )[k] ?? k;
}
