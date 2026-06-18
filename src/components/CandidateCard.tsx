import type { Candidate } from "@/lib/types";
import { ScoreBadge, DirectionPill, MiniBar } from "./ScoreBadge";

export function CandidateCard({ c, rank }: { c: Candidate; rank: number }) {
  return (
    <div className="rounded-xl border border-edge bg-panel p-4">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="text-sm text-muted">#{rank}</span>
          <ScoreBadge score={c.compositeScore} />
          <div>
            <div className="flex items-center gap-2">
              <span className="text-lg font-semibold">{c.symbol}</span>
              <DirectionPill direction={c.direction} />
            </div>
            <div className="text-xs text-muted">{c.name ?? ""}</div>
          </div>
        </div>
        <div className="text-right">
          <div className="text-sm font-medium">
            {c.price != null ? `$${c.price.toFixed(2)}` : "—"}
          </div>
          <div
            className={`text-xs ${
              (c.changePct ?? 0) >= 0 ? "text-emerald-300" : "text-rose-300"
            }`}
          >
            {c.changePct != null
              ? `${c.changePct >= 0 ? "+" : ""}${c.changePct.toFixed(2)}%`
              : ""}
          </div>
        </div>
      </div>

      <div className="mt-4 grid gap-1.5 sm:grid-cols-2">
        <MiniBar label="Sentiment" value={c.signals.sentiment.score} available={c.signals.sentiment.available} />
        <MiniBar label="Volume" value={c.signals.volume.score} available={c.signals.volume.available} />
        <MiniBar label="Catalyst" value={c.signals.catalyst.score} available={c.signals.catalyst.available} />
        <MiniBar label="Insider" value={c.signals.insider.score} available={c.signals.insider.available} />
      </div>

      {c.contract && (
        <div className="mt-4 rounded-lg border border-edge bg-ink/40 px-3 py-2 text-xs">
          <span className="font-semibold uppercase tracking-wide text-sky-300">
            Contract idea
          </span>
          <span className="ml-2 text-slate-200">
            {c.contract.type.toUpperCase()} ${c.contract.strike} exp{" "}
            {c.contract.expiration} ({c.contract.daysToExpiry}d)
            {c.contract.lastPrice != null && ` · last $${c.contract.lastPrice.toFixed(2)}`}
            {c.contract.impliedVolatility != null &&
              ` · IV ${(c.contract.impliedVolatility * 100).toFixed(0)}%`}
          </span>
        </div>
      )}

      <p className="mt-3 text-xs leading-relaxed text-muted">{c.rationale}</p>
    </div>
  );
}
