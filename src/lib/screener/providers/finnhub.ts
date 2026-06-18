import { env } from "../../env";

const BASE = "https://finnhub.io/api/v1";

function iso(d: Date): string {
  return d.toISOString().slice(0, 10);
}

async function get(path: string): Promise<any | null> {
  if (!env.finnhubKey) return null;
  const sep = path.includes("?") ? "&" : "?";
  const url = `${BASE}${path}${sep}token=${env.finnhubKey}`;
  try {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) {
      console.error(`[finnhub] ${path} -> ${res.status}`);
      return null;
    }
    return await res.json();
  } catch (err) {
    console.error(`[finnhub] ${path} failed:`, (err as Error).message);
    return null;
  }
}

export interface EarningsEvent {
  symbol: string;
  date: string; // ISO
}

// One call returns all earnings in the window; we index by symbol.
export async function fetchEarningsCalendar(
  fromDays = 0,
  toDays = 30
): Promise<Map<string, EarningsEvent>> {
  const out = new Map<string, EarningsEvent>();
  const from = new Date();
  from.setDate(from.getDate() + fromDays);
  const to = new Date();
  to.setDate(to.getDate() + toDays);

  const data = await get(
    `/calendar/earnings?from=${iso(from)}&to=${iso(to)}`
  );
  for (const e of data?.earningsCalendar ?? []) {
    if (!e.symbol || !e.date) continue;
    const sym = String(e.symbol).toUpperCase();
    // keep the earliest upcoming event per symbol
    if (!out.has(sym)) out.set(sym, { symbol: sym, date: e.date });
  }
  return out;
}

export interface InsiderSummary {
  netShares: number; // buys minus sells over the window
  buyTransactions: number;
  sellTransactions: number;
}

// Insider transactions are per-symbol; call selectively for top candidates.
export async function fetchInsider(
  symbol: string,
  sinceDays = 90
): Promise<InsiderSummary | null> {
  const from = new Date();
  from.setDate(from.getDate() - sinceDays);
  const data = await get(
    `/stock/insider-transactions?symbol=${symbol}&from=${iso(
      from
    )}&to=${iso(new Date())}`
  );
  if (!data?.data) return null;

  let net = 0;
  let buys = 0;
  let sells = 0;
  for (const t of data.data) {
    const change = Number(t.change) || 0;
    net += change;
    if (change > 0) buys += 1;
    else if (change < 0) sells += 1;
  }
  return { netShares: net, buyTransactions: buys, sellTransactions: sells };
}
