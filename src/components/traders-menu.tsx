"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import type { Trader } from "@/lib/types";

export function TradersMenu({ traders }: { traders: Trader[] }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex items-center gap-1 rounded px-3 py-1.5 text-[var(--foreground)] transition-colors hover:bg-[var(--surface-2)] hover:text-[var(--gold)]"
      >
        Traders
        <span
          className={`text-xs transition-transform ${open ? "rotate-180" : ""}`}
        >
          ▾
        </span>
      </button>

      {open && (
        <div className="absolute left-0 top-full z-50 mt-1 w-[320px] rounded-xl border border-[var(--border)] bg-[var(--surface)] p-2 shadow-2xl">
          <div className="grid grid-cols-2 gap-1">
            {traders.map((t) => (
              <Link
                key={t.id}
                href={`/quests/${t.id}`}
                onClick={() => setOpen(false)}
                className="flex items-center gap-2 rounded-lg px-2 py-1.5 transition-colors hover:bg-[var(--surface-2)]"
              >
                <span className="relative h-8 w-8 shrink-0 overflow-hidden rounded-full border border-[var(--border)] bg-[var(--surface-2)]">
                  {t.image && (
                    <Image
                      src={t.image}
                      alt={t.name}
                      fill
                      sizes="32px"
                      className="object-cover object-top"
                      unoptimized
                    />
                  )}
                </span>
                <span className="truncate text-sm text-[var(--foreground)]">
                  {t.name}
                </span>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
