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
    // Most-recent-session % change = last close vs the prior session's close.
    // (meta.chartPreviousClose is the close BEFORE the 3-month window, which
    // would give a 3-month move — not what we want here.)
    const prevClose =
      closes.length >= 2
        ? closes[closes.length - 2]
        : num(meta.chartPreviousClose) ?? num(meta.previousClose);
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

// Options chain for the nearest expiration at/after `afterDate`. We use CBOE's
// free, public delayed-quotes feed (no crumb/cookie, unlike Yahoo's locked-down
// v7 options endpoint). Best-effort: returns null on failure and the screener
// simply omits the contract idea for that name.
export async function fetchChain(
  symbol: string,
  afterDate: Date
): Promise<ChainForExpiry | null> {
  let data: any = null;
  try {
    const res = await fetch(
      `https://cdn.cboe.com/api/global/delayed_quotes/options/${encodeURIComponent(
        symbol
      )}.json`,
      { headers: HEADERS, cache: "no-store" }
    );
    if (res.ok) data = await res.json();
  } catch {
    return null;
  }

  const opts = data?.data?.options;
  if (!Array.isArray(opts) || opts.length === 0) return null;

  // OCC symbol format: ROOT + YYMMDD + (C|P) + strike*1000 (8 digits).
  const re = /([0-9]{6})([CP])([0-9]{8})$/;
  const byExp = new Map<string, { calls: ChainOption[]; puts: ChainOption[] }>();

  for (const o of opts) {
    const m = re.exec(o.option || "");
    if (!m) continue;
    const [, ymd, cp, strikeRaw] = m;
    const expIso = `20${ymd.slice(0, 2)}-${ymd.slice(2, 4)}-${ymd.slice(4, 6)}`;
    const opt: ChainOption = {
      contractSymbol: o.option,
      strike: parseInt(strikeRaw, 10) / 1000,
      lastPrice: num(o.last_trade_price),
      impliedVolatility: num(o.iv),
      inTheMoney: false,
    };
    const bucket = byExp.get(expIso) ?? { calls: [], puts: [] };
    (cp === "C" ? bucket.calls : bucket.puts).push(opt);
    byExp.set(expIso, bucket);
  }

  const exps = [...byExp.keys()].sort();
  const targetIso =
    exps.find(
      (e) => new Date(`${e}T00:00:00Z`).getTime() >= afterDate.getTime()
    ) ?? exps[exps.length - 1];
  if (!targetIso) return null;

  const bucket = byExp.get(targetIso)!;
  return {
    expiration: new Date(`${targetIso}T00:00:00Z`),
    calls: bucket.calls,
    puts: bucket.puts,
  };
}

function num(v: unknown): number | null {
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}
