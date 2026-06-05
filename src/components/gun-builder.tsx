"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import { AnimatePresence, motion } from "motion/react";
import type { Weapon, Attachment } from "@/lib/types";
import { computeStats } from "@/lib/gun-stats";

export function GunBuilder({
  weapons,
  attachments,
}: {
  weapons: Weapon[];
  attachments: Record<string, Attachment>;
}) {
  const [weaponId, setWeaponId] = useState<string | null>(null);
  const [selections, setSelections] = useState<Record<string, string>>({});
  const [query, setQuery] = useState("");

  const weapon = weapons.find((w) => w.id === weaponId) ?? null;

  const chosen = useMemo(
    () =>
      Object.values(selections)
        .map((id) => attachments[id])
        .filter(Boolean),
    [selections, attachments],
  );
  const stats = weapon ? computeStats(weapon, chosen) : null;

  function pick(weaponId: string) {
    setWeaponId(weaponId);
    setSelections({});
  }

  if (!weapon) {
    const q = query.trim().toLowerCase();
    const list = q
      ? weapons.filter((w) => w.name.toLowerCase().includes(q))
      : weapons;
    return (
      <div>
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search weapons…"
          className="mb-5 w-full max-w-md rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm outline-none focus:border-[var(--gold-dim)]"
        />
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {list.map((w) => (
            <button
              key={w.id}
              type="button"
              onClick={() => pick(w.id)}
              className="group flex items-center gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3 text-left transition-all hover:-translate-y-0.5 hover:border-[var(--gold-dim)]"
            >
              <span className="relative h-14 w-24 shrink-0">
                {w.image && (
                  <Image src={w.image} alt={w.name} fill sizes="96px" className="object-contain" unoptimized />
                )}
              </span>
              <span>
                <span className="block text-sm font-medium">{w.name}</span>
                <span className="block text-xs text-[var(--muted)]">{w.caliber}</span>
              </span>
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center gap-4 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
        <span className="relative h-16 w-32 shrink-0">
          {weapon.image && (
            <Image src={weapon.image} alt={weapon.name} fill sizes="128px" className="object-contain" unoptimized />
          )}
        </span>
        <div className="flex-1">
          <h2 className="font-display text-xl font-bold">{weapon.name}</h2>
          <p className="text-xs text-[var(--muted)]">
            {weapon.caliber} · {weapon.fireRate ? `${weapon.fireRate} rpm` : "—"}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setWeaponId(null)}
          className="rounded-lg border border-[var(--border)] px-3 py-1.5 text-sm text-[var(--muted)] transition-colors hover:border-[var(--gold-dim)] hover:text-[var(--gold)]"
        >
          Change weapon
        </button>
      </div>

      <div className="grid gap-5 lg:grid-cols-[1fr_260px]">
        {/* Slots */}
        <div className="space-y-2">
          {weapon.slots.map((slot) => (
            <SlotPicker
              key={slot.name}
              name={slot.name}
              options={slot.allowed.map((id) => attachments[id]).filter(Boolean)}
              value={selections[slot.name] ?? null}
              onChange={(id) =>
                setSelections((s) => {
                  const next = { ...s };
                  if (id) next[slot.name] = id;
                  else delete next[slot.name];
                  return next;
                })
              }
            />
          ))}
        </div>

        {/* Stats */}
        <aside className="lg:sticky lg:top-20 lg:self-start">
          <div className="rounded-xl border border-[var(--gold-dim)] bg-[var(--surface)] p-4">
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">
              Stats <span className="text-[var(--muted)]">(approx.)</span>
            </h3>
            {stats && (
              <dl className="space-y-2 text-sm">
                <Stat label="Ergonomics" value={stats.ergonomics} />
                <Stat label="Recoil ↕" value={stats.recoilVertical} />
                <Stat label="Recoil ↔" value={stats.recoilHorizontal} />
                <Stat label="Accuracy (MOA)" value={stats.moa} />
                <Stat label="Weight (kg)" value={stats.weight} />
              </dl>
            )}
            <p className="mt-3 border-t border-[var(--border)] pt-2 text-[11px] text-[var(--muted)]">
              Approximate, wiki-sourced. Cross-slot conflicts aren&apos;t modelled.
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center justify-between">
      <dt className="text-[var(--muted)]">{label}</dt>
      <dd className="font-mono font-semibold text-[var(--gold-hi)]">{value}</dd>
    </div>
  );
}

function SlotPicker({
  name,
  options,
  value,
  onChange,
}: {
  name: string;
  options: Attachment[];
  value: string | null;
  onChange: (id: string | null) => void;
}) {
  const [open, setOpen] = useState(false);
  const current = options.find((a) => a.id === value) ?? null;

  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)]">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-3 px-3 py-2.5 text-left"
      >
        <span className="w-24 shrink-0 text-xs uppercase tracking-wide text-[var(--muted)]">
          {name}
        </span>
        <span className="relative h-9 w-9 shrink-0 overflow-hidden rounded border border-[var(--border)] bg-[var(--surface-2)]">
          {current?.image && (
            <Image src={current.image} alt="" fill sizes="36px" className="object-contain p-0.5" unoptimized />
          )}
        </span>
        <span className="flex-1 text-sm">
          {current ? current.name : <span className="text-[var(--muted)]">— empty —</span>}
        </span>
        <span className="text-xs text-[var(--muted)]">{options.length}</span>
        <span className={`text-[var(--gold)] transition-transform ${open ? "rotate-90" : ""}`}>›</span>
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <ul className="max-h-72 space-y-1 overflow-auto border-t border-[var(--border)] p-2">
              <li>
                <button
                  type="button"
                  onClick={() => {
                    onChange(null);
                    setOpen(false);
                  }}
                  className="w-full rounded px-2 py-1.5 text-left text-sm text-[var(--muted)] hover:bg-[var(--surface-2)]"
                >
                  — empty —
                </button>
              </li>
              {options.map((a) => (
                <li key={a.id}>
                  <button
                    type="button"
                    onClick={() => {
                      onChange(a.id);
                      setOpen(false);
                    }}
                    className={`flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-sm transition-colors hover:bg-[var(--surface-2)] ${
                      a.id === value ? "bg-[var(--gold)]/15" : ""
                    }`}
                  >
                    <span className="relative h-8 w-8 shrink-0 overflow-hidden rounded bg-[var(--surface-2)]">
                      {a.image && (
                        <Image src={a.image} alt="" fill sizes="32px" className="object-contain p-0.5" unoptimized />
                      )}
                    </span>
                    <span className="flex-1 truncate">{a.name}</span>
                    <span className="shrink-0 font-mono text-[11px] text-[var(--muted)]">
                      {a.ergo ? `${a.ergo > 0 ? "+" : ""}${a.ergo}e` : ""}{" "}
                      {a.recoil ? `${a.recoil}%` : ""}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
