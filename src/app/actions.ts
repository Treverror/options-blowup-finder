"use server";

import { revalidatePath } from "next/cache";
import { runScreen } from "@/lib/screener";
import { saveRun } from "@/lib/screener/persist";

// Server action behind the "Run screen now" button. Runs entirely on the
// server, so it needs no bearer token and never exposes a secret to the
// client — unlike the public /api/screen endpoint, which stays protected by
// CRON_SECRET for the scheduled cron.
export async function runScreenAction(): Promise<{
  ok: boolean;
  count: number;
  persisted: boolean;
  error?: string;
}> {
  try {
    const run = await runScreen();
    const runId = await saveRun(run);
    revalidatePath("/");
    return { ok: true, count: run.candidates.length, persisted: runId !== null };
  } catch (err) {
    return { ok: false, count: 0, persisted: false, error: (err as Error).message };
  }
}
