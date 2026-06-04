"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { signOut } from "next-auth/react";

interface SessionUser {
  name?: string | null;
}

export function HeaderAuth() {
  const [user, setUser] = useState<SessionUser | null | undefined>(undefined);

  useEffect(() => {
    let active = true;
    fetch("/api/auth/session", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => active && setUser(data?.user ?? null))
      .catch(() => active && setUser(null));
    return () => {
      active = false;
    };
  }, []);

  if (user === undefined) {
    return <div className="h-7 w-32 animate-pulse rounded bg-[var(--surface-2)]" />;
  }

  if (user) {
    return (
      <>
        <Link
          href="/profile"
          className="flex items-center gap-2 rounded px-2 py-1 transition-colors hover:text-[var(--gold)]"
        >
          <span className="flex h-6 w-6 items-center justify-center rounded-full border border-[var(--gold-dim)] bg-[var(--surface-2)] text-xs font-bold text-[var(--gold)]">
            {user.name?.[0]?.toUpperCase() ?? "?"}
          </span>
          <span className="text-[var(--gold)]">{user.name}</span>
        </Link>
        <button
          type="button"
          onClick={() => signOut({ callbackUrl: "/" })}
          className="rounded px-3 py-1.5 text-[var(--muted)] transition-colors hover:text-[var(--gold)]"
        >
          Log out
        </button>
      </>
    );
  }

  return (
    <>
      <Link
        href="/login"
        className="rounded px-3 py-1.5 text-[var(--muted)] transition-colors hover:text-[var(--gold)]"
      >
        Log in
      </Link>
      <Link
        href="/register"
        className="rounded border border-[var(--gold-dim)] px-3 py-1.5 text-[var(--gold)] transition-colors hover:bg-[var(--gold)] hover:text-[var(--background)]"
      >
        Sign up
      </Link>
    </>
  );
}
