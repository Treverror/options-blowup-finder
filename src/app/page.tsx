import { loadLatestRun } from "@/lib/screener/persist";
import { CandidateCard } from "@/components/CandidateCard";
import { RunButton } from "@/components/RunButton";

export const dynamic = "force-dynamic";

export default async function Home() {
  const run = await loadLatestRun();

  return (
    <main className="mx-auto max-w-4xl px-5 py-10">
      <header className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight">
          Options Blow-Up Finder
        </h1>
        <p className="mt-1 text-sm text-muted">
          Ranks stocks where news, volume, catalysts, or insider activity
          suggest the market hasn&apos;t fully reacted yet — with a starter
          options idea for each.
        </p>
        <div className="mt-4">
          <RunButton />
        </div>
      </header>

      {!run && (
        <div className="rounded-xl border border-edge bg-panel p-6 text-sm text-muted">
          No screen results yet. Connect Supabase, set your API keys, and click{" "}
          <span className="text-slate-200">Run screen now</span> (or wait for the
          scheduled cron). If Supabase isn&apos;t configured, runs still execute
          but won&apos;t be stored — check the{" "}
          <code className="text-sky-300">/api/screen</code> JSON response.
        </div>
      )}

      {run && (
        <>
          <div className="mb-5 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted">
            <span>
              Last run:{" "}
              <span className="text-slate-200">
                {new Date(run.ranAt).toLocaleString()}
              </span>
            </span>
            <span>Universe: {run.universeSize} tickers</span>
            <span>Showing top {Math.min(run.candidates.length, 25)}</span>
          </div>

          {run.notes.length > 0 && (
            <div className="mb-5 rounded-lg border border-amber-500/20 bg-amber-500/5 px-3 py-2 text-xs text-amber-200/90">
              {run.notes.map((n, i) => (
                <div key={i}>• {n}</div>
              ))}
            </div>
          )}

          <div className="space-y-3">
            {run.candidates.slice(0, 25).map((c, i) => (
              <CandidateCard key={c.symbol} c={c} rank={i + 1} />
            ))}
          </div>
        </>
      )}

      <footer className="mt-10 border-t border-edge pt-5 text-[11px] leading-relaxed text-muted">
        Research tool only. Not financial advice. Signals are heuristic and
        built on free, often delayed data; options carry substantial risk
        including total loss. Verify everything independently before trading.
      </footer>
    </main>
  );
}
