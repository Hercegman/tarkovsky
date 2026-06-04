"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { signOut } from "next-auth/react";
import { Avatar } from "./avatar";

interface Me {
  username: string;
  avatar: string | null;
}

export function HeaderAuth() {
  const [me, setMe] = useState<Me | null | undefined>(undefined);

  useEffect(() => {
    let active = true;
    fetch("/api/me", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!active) return;
        setMe(data?.username ? { username: data.username, avatar: data.avatar ?? null } : null);
      })
      .catch(() => active && setMe(null));
    return () => {
      active = false;
    };
  }, []);

  if (me === undefined) {
    return <div className="h-7 w-28 animate-pulse rounded bg-[var(--surface-2)]" />;
  }

  if (me) {
    return (
      <>
        <Link
          href="/profile"
          className="flex items-center gap-2 rounded px-2 py-1 transition-colors hover:text-[var(--gold)]"
        >
          <Avatar avatar={me.avatar} name={me.username} size={26} />
          <span className="text-[var(--gold)]">{me.username}</span>
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
