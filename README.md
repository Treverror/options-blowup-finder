# Options Blow-Up Finder

Screens a universe of liquid, optionable US stocks for names where **the market may not have fully reacted to recent news** — then ranks them and attaches a starter options idea for each.

> ⚠️ **Research tool only. Not financial advice.** Signals are heuristic and built on free, often-delayed data. Options carry substantial risk including total loss. Verify everything independently.

## How it scores

Each stock gets four independent signals (0–100), combined into a weighted composite:

| Signal | Weight | Source | Idea |
|---|---|---|---|
| **Sentiment vs flat price** | 40% | Alpha Vantage `NEWS_SENTIMENT` + Yahoo prices | Strong news sentiment while the price has barely moved = under-reaction |
| **Unusual volume** | 20% | Yahoo Finance | Relative volume vs the 3-month average |
| **Catalyst calendar** | 20% | Finnhub earnings calendar | Proximity of an upcoming earnings event |
| **Insider activity** | 20% | Finnhub insider transactions | Net insider buying over 90 days |

Direction (bullish/bearish/neutral) comes from a weighted vote of the sentiment, insider, and volume signals. The composite **renormalizes over whichever data sources are configured** — so the app still runs with just keyless Yahoo data, it simply uses fewer signals.

The top names also get an options contract suggestion: a ~5%-OTM call (bullish) or put (bearish), expiring at least 30 days out and after any known catalyst, pulled live from the Yahoo options chain.

## Stack

- **Next.js 14** (App Router) — dashboard + `/api/screen` endpoint
- **Supabase** (Postgres) — stores each run and its ranked candidates
- **Vercel** — hosting + a weekday cron that runs the screen automatically
- Data: Yahoo Finance (keyless), Finnhub (free), Alpha Vantage (free)

## Setup

### 1. Install

```bash
npm install
```

### 2. Supabase

Create a project, then run [`supabase/migrations/0001_init.sql`](supabase/migrations/0001_init.sql) in the SQL editor. Copy your Project URL, anon key, and service-role key.

### 3. Free API keys (recommended)

- **Finnhub** — https://finnhub.io/register (60 req/min free)
- **Alpha Vantage** — https://www.alphavantage.co/support/#api-key (25 req/day free)

Both are optional; the screener degrades gracefully without them.

### 4. Environment

```bash
cp .env.example .env.local
# fill in the values
```

### 5. Run

```bash
npm run screen   # CLI: run the pipeline, print the table, save to Supabase
npm run dev      # web app at http://localhost:3000
```

The dashboard reads the latest stored run. Click **Run screen now** to trigger one (unset `CRON_SECRET` locally so manual runs aren't blocked).

## Push to GitHub

The folder ships without a git repo. From the project folder on your machine:

```bash
git init
git add -A
git commit -m "Initial commit: options blow-up finder"
git branch -M main
git remote add origin https://github.com/<you>/options-blowup-finder.git
git push -u origin main
```

## Deploy to Vercel

1. Push to GitHub (above).
2. Import it in Vercel.
3. Add the env vars from `.env.example` in **Project → Settings → Environment Variables**. Set a strong `CRON_SECRET`.
4. Deploy. [`vercel.json`](vercel.json) registers a cron that hits `/api/screen` at 13:00 UTC on weekdays (~9am ET, before the open). Vercel automatically sends `Authorization: Bearer $CRON_SECRET`.

### Tuning

- **Universe** — set `SCREEN_UNIVERSE` to a comma-separated ticker list, or edit `src/lib/screener/universe.ts`.
- **Weights** — `WEIGHTS` in `src/lib/screener/scoring.ts`.
- **Thresholds** — the normalization constants live in `src/lib/screener/signals.ts` (e.g. what counts as "fully reacted" or "strong sentiment").
- **Schedule** — edit the cron in `vercel.json`.

## Project layout

```
src/
  app/
    page.tsx              dashboard (server component)
    api/screen/route.ts   run + persist endpoint (cron target)
  components/             UI cards & badges
  lib/
    screener/
      index.ts            orchestrator
      universe.ts         default ticker list
      signals.ts          the four signal scorers
      scoring.ts          composite + direction + rationale
      options.ts          contract picker (Yahoo chain)
      persist.ts          Supabase read/write
      providers/          yahoo / finnhub / alphavantage clients
    types.ts  env.ts  supabase.ts
supabase/migrations/      database schema
scripts/run-screen.ts     CLI runner
```
