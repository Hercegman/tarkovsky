"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { GameMap } from "@/lib/types";
import { getOrCreateGuestId, setGuestName } from "@/lib/session-client";

const CARD =
  "rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5";
const INPUT =
  "w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm outline-none focus:border-[var(--gold-dim)]";
const BTN =
  "rounded-lg border border-[var(--gold-dim)] bg-[var(--gold)] px-4 py-2 text-sm font-semibold text-[var(--background)] transition-opacity hover:opacity-90 disabled:opacity-50";

export function SessionLanding({
  loggedIn,
  maps,
}: {
  loggedIn: boolean;
  maps: GameMap[];
}) {
  const router = useRouter();

  // Create
  const [mapId, setMapId] = useState(maps[0]?.id ?? "");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  // Join
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [joinError, setJoinError] = useState<string | null>(null);
  const [joining, setJoining] = useState(false);

  async function createSession() {
    setCreating(true);
    setCreateError(null);
    try {
      const res = await fetch("/api/sessions", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ mapId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "Could not create session");
      router.push(`/sessions/${data.code}`);
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : "Something went wrong");
      setCreating(false);
    }
  }

  async function joinSession(e: React.FormEvent) {
    e.preventDefault();
    setJoining(true);
    setJoinError(null);
    const trimmedName = name.trim();
    const cleanCode = code.trim().toUpperCase().replace(/\s+/g, "");
    // Logged-in users join with their account name — only guests type one.
    if (!loggedIn && !trimmedName) {
      setJoinError("Enter a name so the host knows who you are.");
      setJoining(false);
      return;
    }
    if (cleanCode.length < 4) {
      setJoinError("Enter the session code.");
      setJoining(false);
      return;
    }
    try {
      const res = await fetch(`/api/sessions?code=${encodeURIComponent(cleanCode)}`);
      if (!res.ok) throw new Error("That session code wasn't found.");
      // Guests persist a name for the Liveblocks auth callback; accounts don't.
      if (!loggedIn) {
        getOrCreateGuestId();
        setGuestName(trimmedName);
      }
      router.push(`/sessions/${cleanCode}`);
    } catch (err) {
      setJoinError(err instanceof Error ? err.message : "Could not join.");
      setJoining(false);
    }
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {/* Host */}
      <div className={CARD}>
        <h2 className="mb-1 text-lg font-semibold text-[var(--gold)]">
          Host a session
        </h2>
        <p className="mb-4 text-xs text-[var(--muted)]">
          You&apos;ll be the host — pick a map and share the code.
        </p>

        {loggedIn ? (
          <div className="space-y-3">
            <label className="block text-xs text-[var(--muted)]">
              Map
              <select
                value={mapId}
                onChange={(e) => setMapId(e.target.value)}
                className={`${INPUT} mt-1`}
              >
                {maps.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </select>
            </label>
            <button
              type="button"
              onClick={createSession}
              disabled={creating || !mapId}
              className={BTN}
            >
              {creating ? "Creating…" : "Create session"}
            </button>
            {createError && (
              <p className="text-xs text-[var(--danger,#ff6b6b)]">{createError}</p>
            )}
          </div>
        ) : (
          <p className="text-sm text-[var(--muted)]">
            You need an account to host.{" "}
            <Link href="/login" className="text-[var(--gold)] hover:underline">
              Log in
            </Link>{" "}
            or{" "}
            <Link href="/register" className="text-[var(--gold)] hover:underline">
              register
            </Link>
            .
          </p>
        )}
      </div>

      {/* Join */}
      <div className={CARD}>
        <h2 className="mb-1 text-lg font-semibold text-[var(--gold)]">
          Join a session
        </h2>
        <p className="mb-4 text-xs text-[var(--muted)]">
          {loggedIn
            ? "Just enter the code — you'll join as your account."
            : "No account needed — just a name and the code."}
        </p>
        <form onSubmit={joinSession} className="space-y-3">
          {!loggedIn && (
            <label className="block text-xs text-[var(--muted)]">
              Your name
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={24}
                placeholder="e.g. Nikita"
                className={`${INPUT} mt-1`}
              />
            </label>
          )}
          <label className="block text-xs text-[var(--muted)]">
            Session code
            <input
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              maxLength={8}
              placeholder="ABC123"
              className={`${INPUT} mt-1 font-mono tracking-widest`}
            />
          </label>
          <button type="submit" disabled={joining} className={BTN}>
            {joining ? "Joining…" : "Join"}
          </button>
          {joinError && (
            <p className="text-xs text-[var(--danger,#ff6b6b)]">{joinError}</p>
          )}
        </form>
      </div>
    </div>
  );
}
