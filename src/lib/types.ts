// Shared types for the screening pipeline.

export type Direction = "bullish" | "bearish" | "neutral";

export interface QuoteData {
  symbol: string;
  name: string | null;
  price: number | null;
  changePct: number | null; // most recent session % change
  changePct5d: number | null; // trailing 5-session % change
  volume: number | null;
  avgVolume: number | null; // ~3-month average daily volume
  marketCap: number | null;
}

export interface SignalScore {
  // Normalized 0-100 strength of this individual signal.
  score: number;
  // Direction the signal implies for the underlying.
  direction: Direction;
  // Whether the data source for this signal was available.
  available: boolean;
  // Human-readable explanation shown in the UI.
  detail: string;
}

export interface ContractIdea {
  type: "call" | "put";
  strike: number;
  expiration: string; // ISO date
  daysToExpiry: number;
  lastPrice: number | null;
  impliedVolatility: number | null;
  inTheMoney: boolean;
  contractSymbol: string;
}

export interface Candidate {
  symbol: string;
  name: string | null;
  price: number | null;
  changePct: number | null;
  compositeScore: number; // 0-100 weighted
  direction: Direction;
  signals: {
    sentiment: SignalScore;
    volume: SignalScore;
    catalyst: SignalScore;
    insider: SignalScore;
  };
  contract: ContractIdea | null;
  rationale: string;
}

export interface ScreenRun {
  ranAt: string; // ISO timestamp
  universeSize: number;
  candidates: Candidate[];
  notes: string[];
}
