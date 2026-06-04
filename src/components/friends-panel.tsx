"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Avatar } from "./avatar";

interface PublicUser {
  id: string;
  username: string;
  avatar: string | null;
}
interface Data {
  friends: PublicUser[];
  incoming: PublicUser[];
  outgoing: PublicUser[];
}

export function FriendsPanel() {
  const [data, setData] = useState<Data | null>(null);
  const [username, setUsername] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    const r = await fetch("/api/friends", { cache: "no-store" });
    if (r.ok) setData(await r.json());
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refresh();
  }, [refresh]);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    if (!username.trim() || busy) return;
    setBusy(true);
    setMsg(null);
    try {
      const r = await fetch("/api/friends", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: username.trim() }),
      });
      const j = await r.json();
      setMsg(j.message ?? (r.ok ? "Done." : "Could not send request."));
      if (r.ok) setUsername("");
      await refresh();
    } finally {
      setBusy(false);
    }
  }

  async function respond(user: string, accept: boolean) {
    await fetch("/api/friends", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: user, accept }),
    });
    await refresh();
  }

  async function remove(user: string) {
    await fetch("/api/friends", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: user }),
    });
    await refresh();
  }

  return (
    <div className="space-y-6">
      <form onSubmit={add} className="flex gap-2">
        <input
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="Add a friend by username…"
          className="flex-1 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm outline-none focus:border-[var(--gold-dim)]"
        />
        <button
          type="submit"
          disabled={busy}
          className="rounded-lg border border-[var(--gold-dim)] bg-[var(--gold)] px-4 py-2 text-sm font-medium text-[var(--background)] transition-colors hover:bg-[var(--gold-hi)] disabled:opacity-60"
        >
          Add
        </button>
      </form>
      {msg && <p className="text-xs text-[var(--muted)]">{msg}</p>}

      {data?.incoming.length ? (
        <Section label={`Requests (${data.incoming.length})`}>
          {data.incoming.map((u) => (
            <Row key={u.id} user={u}>
              <button
                onClick={() => respond(u.username, true)}
                className="rounded border border-[var(--success)] px-2 py-1 text-xs text-[var(--success)] hover:bg-[var(--success)]/15"
              >
                Accept
              </button>
              <button
                onClick={() => respond(u.username, false)}
                className="rounded border border-[var(--border)] px-2 py-1 text-xs text-[var(--muted)] hover:text-[var(--danger)]"
              >
                Decline
              </button>
            </Row>
          ))}
        </Section>
      ) : null}

      <Section label={`Friends (${data?.friends.length ?? 0})`}>
        {data && data.friends.length === 0 && (
          <p className="px-1 text-sm text-[var(--muted)]">
            No friends yet. Add someone by username to compare progress.
          </p>
        )}
        {data?.friends.map((u) => (
          <Row key={u.id} user={u} link>
            <button
              onClick={() => remove(u.username)}
              className="rounded border border-[var(--border)] px-2 py-1 text-xs text-[var(--muted)] hover:text-[var(--danger)]"
            >
              Remove
            </button>
          </Row>
        ))}
      </Section>

      {data?.outgoing.length ? (
        <Section label={`Pending (${data.outgoing.length})`}>
          {data.outgoing.map((u) => (
            <Row key={u.id} user={u}>
              <span className="text-xs text-[var(--muted)]">requested</span>
              <button
                onClick={() => remove(u.username)}
                className="rounded border border-[var(--border)] px-2 py-1 text-xs text-[var(--muted)] hover:text-[var(--danger)]"
              >
                Cancel
              </button>
            </Row>
          ))}
        </Section>
      ) : null}
    </div>
  );
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">
        {label}
      </h3>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

function Row({
  user,
  link,
  children,
}: {
  user: PublicUser;
  link?: boolean;
  children: React.ReactNode;
}) {
  const name = (
    <span className="flex items-center gap-2">
      <Avatar avatar={user.avatar} name={user.username} size={32} />
      <span className="text-sm">{user.username}</span>
    </span>
  );
  return (
    <div className="flex items-center justify-between rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2">
      {link ? (
        <Link href={`/u/${user.username}`} className="hover:text-[var(--gold)]">
          {name}
        </Link>
      ) : (
        name
      )}
      <span className="flex items-center gap-2">{children}</span>
    </div>
  );
}
