// Local runner: `npm run screen`
// Loads .env.local / .env, runs the pipeline, prints the ranked table, and
// persists to Supabase if configured. Handy for testing without the web app.

import { config } from "dotenv";
config({ path: ".env.local" });
config({ path: ".env" });

import { runScreen } from "../src/lib/screener";
import { saveRun } from "../src/lib/screener/persist";

async function main() {
  console.log("Running screen…\n");
  const run = await runScreen();

  for (const note of run.notes) console.log("  note:", note);
  console.log("");

  const rows = run.candidates.slice(0, 20).map((c, i) => ({
    "#": i + 1,
    sym: c.symbol,
    score: c.compositeScore,
    dir: c.direction,
    sent: c.signals.sentiment.score,
    vol: c.signals.volume.score,
    cat: c.signals.catalyst.score,
    ins: c.signals.insider.score,
    contract: c.contract
      ? `${c.contract.type} ${c.contract.strike} ${c.contract.expiration}`
      : "—",
  }));
  console.table(rows);

  const id = await saveRun(run);
  console.log(id ? `\nSaved run ${id} to Supabase.` : "\nSupabase not configured — not persisted.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
