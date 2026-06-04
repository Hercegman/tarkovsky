"use client";

import { useState } from "react";

export function AddFriendButton({ username }: { username: string }) {
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function add() {
    setBusy(true);
    try {
      const r = await fetch("/api/friends", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username }),
      });
      const j = await r.json();
      setMsg(j.message ?? (r.ok ? "Request sent." : "Could not send."));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex items-center gap-3">
      <button
        type="button"
        onClick={add}
        disabled={busy || !!msg}
        className="rounded-lg border border-[var(--gold-dim)] bg-[var(--gold)] px-4 py-2 text-sm font-medium text-[var(--background)] transition-colors hover:bg-[var(--gold-hi)] disabled:opacity-60"
      >
        Add friend
      </button>
      {msg && <span className="text-sm text-[var(--muted)]">{msg}</span>}
    </div>
  );
}
