"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { runScreenAction } from "@/app/actions";

export function RunButton() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [msg, setMsg] = useState<string>("");
  const [error, setError] = useState(false);

  function run() {
    setMsg("");
    setError(false);
    startTransition(async () => {
      try {
        const r = await runScreenAction();
        if (!r.ok) {
          setError(true);
          setMsg(r.error ?? "Run failed.");
          return;
        }
        setMsg(
          `Done — ${r.count} candidates${r.persisted ? "" : " (not saved: Supabase not configured)"}`
        );
        router.refresh();
      } catch (e) {
        setError(true);
        setMsg((e as Error).message);
      }
    });
  }

  return (
    <div className="flex items-center gap-3">
      <button
        onClick={run}
        disabled={pending}
        className="rounded-lg bg-sky-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-sky-400 disabled:opacity-50"
      >
        {pending ? "Scanning…" : "Run screen now"}
      </button>
      {msg && (
        <span className={`text-xs ${error ? "text-rose-300" : "text-emerald-300"}`}>
          {msg}
        </span>
      )}
    </div>
  );
}
