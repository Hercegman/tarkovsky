"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import type { Weapon, Attachment, WeaponSlot } from "@/lib/types";
import { computeStats } from "@/lib/gun-stats";

interface SavedBuild {
  id: string;
  name: string;
  weaponId: string;
  items: Record<string, string>;
}

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
  const [builds, setBuilds] = useState<SavedBuild[] | null>(null);
  const [anon, setAnon] = useState(false);
  const [saveName, setSaveName] = useState("");
  const [saving, setSaving] = useState(false);

  const weapon = weapons.find((w) => w.id === weaponId) ?? null;

  const refresh = useCallback(async () => {
    const r = await fetch("/api/builds", { cache: "no-store" });
    if (r.status === 401) return setAnon(true);
    if (r.ok) setBuilds((await r.json()).builds);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refresh();
  }, [refresh]);

  async function saveBuild() {
    if (!weapon || saving) return;
    setSaving(true);
    try {
      const r = await fetch("/api/builds", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: saveName.trim() || weapon.name,
          weaponId: weapon.id,
          items: selections,
        }),
      });
      if (r.ok) {
        const saved: SavedBuild = (await r.json()).build;
        setBuilds((b) => [saved, ...(b ?? [])]);
        setSaveName("");
      }
    } finally {
      setSaving(false);
    }
  }

  function setSelection(key: string, id: string | null) {
    setSelections((s) => {
      const next = { ...s };
      if (id) next[key] = id;
      else delete next[key];
      // Prune descendant selections (the parent attachment changed).
      for (const k of Object.keys(next)) if (k.startsWith(key + ">")) delete next[k];
      return next;
    });
  }

  function loadBuild(b: SavedBuild) {
    setWeaponId(b.weaponId);
    setSelections(b.items ?? {});
  }

  async function deleteBuild(id: string) {
    await fetch("/api/builds", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    setBuilds((b) => (b ?? []).filter((x) => x.id !== id));
  }

  const buildsBar = (
    <div className="mb-5 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3">
      {anon ? (
        <p className="text-sm text-[var(--muted)]">
          <Link href="/login" className="text-[var(--gold)] hover:underline">
            Log in
          </Link>{" "}
          to save your builds.
        </p>
      ) : (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">
            Saved builds
          </span>
          {builds && builds.length === 0 && (
            <span className="text-xs text-[var(--muted)]">none yet</span>
          )}
          {builds?.map((b) => {
            const w = weapons.find((x) => x.id === b.weaponId);
            return (
              <span
                key={b.id}
                className="group inline-flex items-center gap-1 rounded-lg border border-[var(--border)] bg-[var(--surface-2)] py-1 pl-2 pr-1 text-xs"
              >
                <button
                  type="button"
                  onClick={() => loadBuild(b)}
                  title={w?.name}
                  className="hover:text-[var(--gold)]"
                >
                  {b.name}
                </button>
                <button
                  type="button"
                  onClick={() => deleteBuild(b.id)}
                  aria-label="Delete build"
                  className="rounded px-1 text-[var(--muted)] hover:text-[var(--danger)]"
                >
                  ✕
                </button>
              </span>
            );
          })}
        </div>
      )}
    </div>
  );

  const chosen = useMemo(
    () =>
      Object.values(selections)
        .map((id) => attachments[id])
        .filter(Boolean),
    [selections, attachments],
  );
  const stats = weapon ? computeStats(weapon, chosen) : null;
  const base = weapon ? computeStats(weapon, []) : null;

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
        {buildsBar}
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
              <span className="flex h-14 w-24 shrink-0 items-center justify-center">
                {w.image && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={w.image} alt={w.name} className="max-h-full max-w-full object-contain" />
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
      {buildsBar}
      {!anon && (
        <div className="mb-5 flex flex-wrap items-center gap-2">
          <input
            value={saveName}
            onChange={(e) => setSaveName(e.target.value)}
            placeholder={`Build name (default: ${weapon.name})`}
            className="min-w-[220px] flex-1 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm outline-none focus:border-[var(--gold-dim)]"
          />
          <button
            type="button"
            onClick={saveBuild}
            disabled={saving}
            className="rounded-lg border border-[var(--gold-dim)] bg-[var(--gold)] px-4 py-2 text-sm font-medium text-[var(--background)] transition-colors hover:bg-[var(--gold-hi)] disabled:opacity-60"
          >
            {saving ? "Saving…" : "Save build"}
          </button>
        </div>
      )}
      <div className="mb-5 flex flex-wrap items-center gap-4 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
        <span className="flex h-16 w-32 shrink-0 items-center justify-center">
          {weapon.image && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={weapon.image} alt={weapon.name} className="max-h-full max-w-full object-contain" />
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
        {/* Slots (recursive: attachments can have sub-slots) */}
        <div className="space-y-2">
          <SlotTree
            slots={weapon.slots}
            prefix=""
            selections={selections}
            attachments={attachments}
            onChange={setSelection}
            depth={0}
          />
        </div>

        {/* Stats */}
        <aside className="lg:sticky lg:top-20 lg:self-start">
          <div className="rounded-xl border border-[var(--gold-dim)] bg-[var(--surface)] p-4">
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">
              Stats <span className="text-[var(--muted)]">(approx.)</span>
            </h3>
            {stats && base && (
              <dl className="space-y-2 text-sm">
                <Stat label="Ergonomics" base={base.ergonomics} value={stats.ergonomics} higherBetter />
                <Stat label="Recoil ↕" base={base.recoilVertical} value={stats.recoilVertical} />
                <Stat label="Recoil ↔" base={base.recoilHorizontal} value={stats.recoilHorizontal} />
                <Stat label="Accuracy (MOA)" base={base.moa} value={stats.moa} />
                <Stat label="Weight (kg)" base={base.weight} value={stats.weight} />
              </dl>
            )}
            <p className="mt-3 border-t border-[var(--border)] pt-2 text-[11px] text-[var(--muted)]">
              Base is the bare weapon (no mods); fitted mods add their modifiers.
              Approximate — cross-slot conflicts aren&apos;t modelled.
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}

function SlotTree({
  slots,
  prefix,
  selections,
  attachments,
  onChange,
  depth,
}: {
  slots: WeaponSlot[];
  prefix: string;
  selections: Record<string, string>;
  attachments: Record<string, Attachment>;
  onChange: (key: string, id: string | null) => void;
  depth: number;
}) {
  return (
    <>
      {slots.map((slot) => {
        const key = prefix ? `${prefix}>${slot.name}` : slot.name;
        const selectedId = selections[key] ?? null;
        const selected = selectedId ? attachments[selectedId] : null;
        const sub = selected?.slots ?? [];
        return (
          <div key={key}>
            <SlotPicker
              name={slot.name}
              options={slot.allowed.map((id) => attachments[id]).filter(Boolean)}
              value={selectedId}
              onChange={(id) => onChange(key, id)}
            />
            {sub.length > 0 && depth < 3 && (
              <div className="ml-4 mt-2 space-y-2 border-l-2 border-[var(--border)] pl-3">
                <SlotTree
                  slots={sub}
                  prefix={key}
                  selections={selections}
                  attachments={attachments}
                  onChange={onChange}
                  depth={depth + 1}
                />
              </div>
            )}
          </div>
        );
      })}
    </>
  );
}

function Stat({
  label,
  base,
  value,
  higherBetter = false,
}: {
  label: string;
  base: number;
  value: number;
  higherBetter?: boolean;
}) {
  const delta = Math.round((value - base) * 100) / 100;
  const good = higherBetter ? delta > 0 : delta < 0;
  const color = delta === 0 ? "text-[var(--muted)]" : good ? "text-[var(--success)]" : "text-[var(--danger)]";
  return (
    <div className="flex items-center justify-between">
      <dt className="text-[var(--muted)]">{label}</dt>
      <dd className="flex items-baseline gap-2 font-mono">
        {delta !== 0 && (
          <span className={`text-[11px] ${color}`}>
            {delta > 0 ? "+" : ""}
            {delta}
          </span>
        )}
        <span className="font-semibold text-[var(--gold-hi)]">{value}</span>
      </dd>
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
        <span className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded border border-[var(--border)] bg-[var(--surface-2)]">
          {current?.image && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={current.image} alt="" className="max-h-full max-w-full object-contain p-0.5" />
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
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded bg-[var(--surface-2)]">
                      {a.image && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={a.image} alt="" className="max-h-full max-w-full object-contain p-0.5" />
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
