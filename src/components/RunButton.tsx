"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function RunButton() {
  const router = useRouter();
  const [state, setState] = useState<"idle" | "running" | "error">("idle");
  const [msg, setMsg] = useState<string>("");

  async function run() {
    setState("running");
    setMsg("");
    try {
      const res = await fetch("/api/screen", { method: "POST" });
      const json = await res.json();
      if (!res.ok || !json.ok) {
        setState("error");
        setMsg(
          json.error ??
            (res.status === 401
              ? "Endpoint is protected by CRON_SECRET — trigger it from the cron or unset the secret for manual runs."
              : "Run failed.")
        );
        return;
      }
      setState("idle");
      router.refresh();
    } catch (e) {
      setState("error");
      setMsg((e as Error).message);
    }
  }

  return (
    <div className="flex items-center gap-3">
      <button
        onClick={run}
        disabled={state === "running"}
        className="rounded-lg bg-sky-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-sky-400 disabled:opacity-50"
      >
        {state === "running" ? "Scanning…" : "Run screen now"}
      </button>
      {state === "error" && (
        <span className="max-w-md text-xs text-rose-300">{msg}</span>
      )}
    </div>
  );
}
