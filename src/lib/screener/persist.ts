import { getAdminClient, getReadClient } from "../supabase";
import type { Candidate, ScreenRun } from "../types";

// Persist a completed run + its candidates. Returns the new run id, or null if
// Supabase isn't configured (the pipeline still works, just won't be saved).
export async function saveRun(run: ScreenRun): Promise<string | null> {
  const db = getAdminClient();
  if (!db) return null;

  const { data: runRow, error: runErr } = await db
    .from("screen_runs")
    .insert({
      ran_at: run.ranAt,
      universe_size: run.universeSize,
      notes: run.notes,
    })
    .select("id")
    .single();

  if (runErr || !runRow) {
    console.error("[persist] run insert failed:", runErr?.message);
    return null;
  }

  const rows = run.candidates.map((c, i) => ({
    run_id: runRow.id,
    rank: i + 1,
    symbol: c.symbol,
    name: c.name,
    price: c.price,
    change_pct: c.changePct,
    composite_score: c.compositeScore,
    direction: c.direction,
    signals: c.signals,
    contract: c.contract,
    rationale: c.rationale,
  }));

  const { error: candErr } = await db.from("candidates").insert(rows);
  if (candErr) console.error("[persist] candidates insert failed:", candErr.message);

  return runRow.id as string;
}

export interface LatestRun {
  ranAt: string;
  universeSize: number;
  notes: string[];
  candidates: Candidate[];
}

// Load the most recent run for the dashboard. Returns null if none / no DB.
export async function loadLatestRun(): Promise<LatestRun | null> {
  const db = getReadClient();
  if (!db) return null;

  const { data: runRow, error } = await db
    .from("screen_runs")
    .select("id, ran_at, universe_size, notes")
    .order("ran_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !runRow) return null;

  const { data: cands } = await db
    .from("candidates")
    .select("*")
    .eq("run_id", runRow.id)
    .order("rank", { ascending: true });

  const candidates: Candidate[] = (cands ?? []).map((r) => ({
    symbol: r.symbol,
    name: r.name,
    price: r.price,
    changePct: r.change_pct,
    compositeScore: r.composite_score,
    direction: r.direction,
    signals: r.signals,
    contract: r.contract,
    rationale: r.rationale,
  }));

  return {
    ranAt: runRow.ran_at,
    universeSize: runRow.universe_size,
    notes: (runRow.notes as string[]) ?? [],
    candidates,
  };
}
