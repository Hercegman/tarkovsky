"use client";

import { useState } from "react";
import { Avatar } from "./avatar";

interface Option {
  id: string;
  name: string;
}

export function AvatarPicker({
  username,
  initial,
  options,
}: {
  username: string;
  initial: string | null;
  options: Option[];
}) {
  const [avatar, setAvatar] = useState<string | null>(initial);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  async function choose(id: string | null) {
    setSaving(true);
    setAvatar(id);
    try {
      await fetch("/api/me/avatar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ avatar: id }),
      });
    } finally {
      setSaving(false);
      setOpen(false);
    }
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="group relative"
        title="Change profile icon"
      >
        <Avatar avatar={avatar} name={username} size={64} />
        <span className="absolute inset-0 flex items-center justify-center rounded-full bg-black/50 text-xs text-white opacity-0 transition-opacity group-hover:opacity-100">
          Edit
        </span>
      </button>

      {open && (
        <div className="absolute left-0 top-full z-50 mt-2 w-[280px] rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3 shadow-2xl">
          <p className="mb-2 text-xs uppercase tracking-wider text-[var(--muted)]">
            Choose an icon
          </p>
          <div className="grid grid-cols-5 gap-2">
            {options.map((o) => (
              <button
                key={o.id}
                type="button"
                disabled={saving}
                onClick={() => choose(o.id)}
                className={`rounded-full ring-2 transition ${
                  avatar === o.id ? "ring-[var(--gold)]" : "ring-transparent hover:ring-[var(--gold-dim)]"
                }`}
                title={o.name}
              >
                <Avatar avatar={o.id} name={o.name} size={40} />
              </button>
            ))}
          </div>
          <button
            type="button"
            disabled={saving}
            onClick={() => choose(null)}
            className="mt-3 w-full rounded-lg border border-[var(--border)] py-1.5 text-xs text-[var(--muted)] hover:text-[var(--gold)]"
          >
            Use initial instead
          </button>
        </div>
      )}
    </div>
  );
}
