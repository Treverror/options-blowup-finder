import { NextResponse } from "next/server";
import { runScreen } from "@/lib/screener";
import { saveRun } from "@/lib/screener/persist";
import { env } from "@/lib/env";

// Screening hits external APIs and the options chain — needs Node runtime and
// a generous timeout. Never cache.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// 60s is the Vercel Hobby ceiling. If you scan a large universe and hit
// timeouts, trim SCREEN_UNIVERSE / ENRICH_TOP_N or move to a Pro plan (300s).
export const maxDuration = 60;

async function handle(req: Request) {
  // If a CRON_SECRET is configured, require it. Vercel Cron sends it
  // automatically as `Authorization: Bearer <CRON_SECRET>`.
  if (env.cronSecret) {
    const auth = req.headers.get("authorization");
    if (auth !== `Bearer ${env.cronSecret}`) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
  }

  try {
    const run = await runScreen();
    const runId = await saveRun(run);
    return NextResponse.json({
      ok: true,
      runId,
      persisted: runId !== null,
      ranAt: run.ranAt,
      universeSize: run.universeSize,
      notes: run.notes,
      topCandidates: run.candidates.slice(0, 10).map((c) => ({
        symbol: c.symbol,
        score: c.compositeScore,
        direction: c.direction,
        contract: c.contract?.contractSymbol ?? null,
      })),
    });
  } catch (err) {
    console.error("[/api/screen] failed:", err);
    return NextResponse.json(
      { ok: false, error: (err as Error).message },
      { status: 500 }
    );
  }
}

export async function GET(req: Request) {
  return handle(req);
}

export async function POST(req: Request) {
  return handle(req);
}
