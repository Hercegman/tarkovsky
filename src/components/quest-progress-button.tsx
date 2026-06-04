"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type State = "loading" | "anon" | "done" | "todo";

export function QuestProgressButton({ questId }: { questId: string }) {
  const [state, setState] = useState<State>("loading");
  const [pending, setPending] = useState(false);

  useEffect(() => {
    let active = true;
    fetch("/api/progress", { cache: "no-store" })
      .then(async (r) => {
        if (!active) return;
        if (r.status === 401) return setState("anon");
        if (!r.ok) return setState("anon");
        const data: { completed: string[] } = await r.json();
        setState(data.completed.includes(questId) ? "done" : "todo");
      })
      .catch(() => active && setState("anon"));
    return () => {
      active = false;
    };
  }, [questId]);

  async function toggle() {
    if (pending) return;
    setPending(true);
    const completed = state !== "done";
    try {
      const r = await fetch("/api/progress", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ questId, completed }),
      });
      if (r.status === 401) setState("anon");
      else if (r.ok) setState(completed ? "done" : "todo");
    } finally {
      setPending(false);
    }
  }

  if (state === "loading") {
    return <div className="h-9 w-28 animate-pulse rounded bg-[var(--surface-2)]" />;
  }

  if (state === "anon") {
    return (
      <Link
        href="/login"
        className="whitespace-nowrap rounded border border-[var(--border)] px-3 py-2 text-sm text-[var(--muted)] transition-colors hover:border-[var(--gold-dim)] hover:text-[var(--gold)]"
      >
        Log in to track
      </Link>
    );
  }

  const done = state === "done";
  return (
    <button
      onClick={toggle}
      disabled={pending}
      className={`whitespace-nowrap rounded border px-3 py-2 text-sm font-medium transition-colors disabled:opacity-50 ${
        done
          ? "border-[var(--success)] bg-[var(--success)]/20 text-[var(--success)]"
          : "border-[var(--gold-dim)] text-[var(--gold)] hover:bg-[var(--gold)] hover:text-[var(--background)]"
      }`}
    >
      {done ? "✓ Completed" : "Mark complete"}
    </button>
  );
}
