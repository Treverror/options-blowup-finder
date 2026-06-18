import type { Direction } from "@/lib/types";

export function ScoreBadge({ score }: { score: number }) {
  const color =
    score >= 70
      ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/30"
      : score >= 45
      ? "bg-amber-500/15 text-amber-300 border-amber-500/30"
      : "bg-slate-500/10 text-slate-400 border-slate-500/20";
  return (
    <span
      className={`inline-flex h-9 w-9 items-center justify-center rounded-lg border text-sm font-semibold ${color}`}
    >
      {score}
    </span>
  );
}

export function DirectionPill({ direction }: { direction: Direction }) {
  const map: Record<Direction, string> = {
    bullish: "bg-emerald-500/15 text-emerald-300",
    bearish: "bg-rose-500/15 text-rose-300",
    neutral: "bg-slate-500/15 text-slate-400",
  };
  const arrow = direction === "bullish" ? "▲" : direction === "bearish" ? "▼" : "■";
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${map[direction]}`}>
      {arrow} {direction}
    </span>
  );
}

export function MiniBar({ label, value, available }: { label: string; value: number; available: boolean }) {
  return (
    <div className="flex items-center gap-2">
      <span className="w-16 shrink-0 text-[11px] text-muted">{label}</span>
      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-edge">
        <div
          className={`h-full rounded-full ${available ? "bg-sky-400/70" : "bg-slate-600"}`}
          style={{ width: `${available ? value : 0}%` }}
        />
      </div>
      <span className="w-7 shrink-0 text-right text-[11px] text-muted">
        {available ? value : "–"}
      </span>
    </div>
  );
}
