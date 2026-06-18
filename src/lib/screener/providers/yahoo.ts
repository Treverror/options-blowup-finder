import type { QuoteData } from "../../types";

// We talk to Yahoo's public JSON endpoints directly. The v8 chart endpoint
// needs no crumb/cookie (unlike the v7 quote endpoint), so it's reliable in a
// serverless runtime — we derive price, volume, average volume and % changes
// from a single 3-month daily history call per symbol.

const HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
  Accept: "application/json",
};

async function yahooJson(path: string): Promise<any | null> {
  for (const host of ["query1", "query2"]) {
    try {
      const res = await fetch(`https://${host}.finance.yahoo.com${path}`, {
        headers: HEADERS,
        cache: "no-store",
      });
      if (res.ok) return await res.json();
    } catch {
      /* try next host */
    }
  }
  return null;
}

async function mapLimit<T>(
  items: T[],
  limit: number,
  fn: (item: T) => Promise<void>
): Promise<void> {
  let i = 0;
  const workers = Array.from(
    { length: Math.min(limit, items.length) },
    async () => {
      while (i < items.length) {
        await fn(items[i++]);
      }
    }
  );
  await Promise.all(workers);
}

// Fetch quote snapshots (price, volume, avg volume, recent % changes) for the
// whole universe via the crumb-free chart endpoint.
export async function fetchQuotes(
  symbols: string[]
): Promise<Map<string, QuoteData>> {
  const out = new Map<string, QuoteData>();
  if (symbols.length === 0) return out;

  await mapLimit(symbols, 8, async (sym) => {
    const data = await yahooJson(
      `/v8/finance/chart/${encodeURIComponent(sym)}?range=3mo&interval=1d`
    );
    const result = data?.chart?.result?.[0];
    if (!result) return;

    const meta = result.meta ?? {};
    const q = result.indicators?.quote?.[0] ?? {};
    const closes: number[] = (q.close ?? []).filter(
      (x: any) => typeof x === "number"
    );
    const vols: number[] = (q.volume ?? []).filter(
      (x: any) => typeof x === "number"
    );

    const price =
      num(meta.regularMarketPrice) ??
      (closes.length ? closes[closes.length - 1] : null);
    const prevClose = num(meta.chartPreviousClose) ?? num(meta.previousClose);
    const changePct =
      price != null && prevClose ? ((price - prevClose) / prevClose) * 100 : null;

    let changePct5d: number | null = null;
    if (closes.length >= 6) {
      const a = closes[closes.length - 6];
      const b = closes[closes.length - 1];
      if (a) changePct5d = ((b - a) / a) * 100;
    }

    const avgVolume = vols.length
      ? Math.round(vols.reduce((s, v) => s + v, 0) / vols.length)
      : null;
    const volume =
      num(meta.regularMarketVolume) ??
      (vols.length ? vols[vols.length - 1] : null);

    out.set(sym.toUpperCase(), {
      symbol: sym.toUpperCase(),
      name: meta.shortName ?? meta.longName ?? meta.symbol ?? null,
      price,
      changePct,
      changePct5d,
      volume,
      avgVolume,
      marketCap: num(meta.marketCap) ?? null,
    });
  });

  return out;
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

// Options chain for the nearest expiration at/after `afterDate`. Best-effort:
// Yahoo's options endpoint can be rate-limited, in which case we return null
// and the screener simply omits the contract idea for that name.
export async function fetchChain(
  symbol: string,
  afterDate: Date
): Promise<ChainForExpiry | null> {
  const base = await yahooJson(`/v7/finance/options/${encodeURIComponent(symbol)}`);
  const result = base?.optionChain?.result?.[0];
  if (!result) return null;

  const expirations: number[] = result.expirationDates ?? []; // epoch seconds
  const targetSec =
    expirations.find((e) => e * 1000 >= afterDate.getTime()) ??
    expirations[expirations.length - 1];
  if (!targetSec) return null;

  const detail = await yahooJson(
    `/v7/finance/options/${encodeURIComponent(symbol)}?date=${targetSec}`
  );
  const chain = detail?.optionChain?.result?.[0]?.options?.[0];
  if (!chain) return null;

  const map = (arr: any[] = []): ChainOption[] =>
    arr.map((o: any) => ({
      contractSymbol: o.contractSymbol,
      strike: o.strike,
      lastPrice: num(o.lastPrice),
      impliedVolatility: num(o.impliedVolatility),
      inTheMoney: Boolean(o.inTheMoney),
    }));

  return {
    expiration: new Date(targetSec * 1000),
    calls: map(chain.calls),
    puts: map(chain.puts),
  };
}

function num(v: unknown): number | null {
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}
