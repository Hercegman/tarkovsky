"use client";

import { useMemo, useState } from "react";
import type { Trader, GameMap } from "@/lib/types";
import { useProgress } from "@/hooks/use-progress";
import { QuestQuickView } from "./quest-quick-view";

export interface QuestSummary {
  id: string;
  title: string;
  trader: string;
  maps: string[];
  requiredLevel: number | null;
  kappaRequired: boolean;
}

export function QuestBrowser({
  quests,
  traders,
  maps,
}: {
  quests: QuestSummary[];
  traders: Trader[];
  maps: GameMap[];
}) {
  const [query, setQuery] = useState("");
  const [trader, setTrader] = useState<string>("");
  const [map, setMap] = useState<string>("");
  const [kappaOnly, setKappaOnly] = useState(false);
  const [hideDone, setHideDone] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);

  const { completed } = useProgress();
  const traderName = useMemo(
    () => Object.fromEntries(traders.map((t) => [t.id, t.name])),
    [traders],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return quests.filter((quest) => {
      if (q && !quest.title.toLowerCase().includes(q)) return false;
      if (trader && quest.trader !== trader) return false;
      if (map && !quest.maps.includes(map)) return false;
      if (kappaOnly && !quest.kappaRequired) return false;
      if (hideDone && completed?.has(quest.id)) return false;
      return true;
    });
  }, [quests, query, trader, map, kappaOnly, hideDone, completed]);

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search quests…"
          className="min-w-[200px] flex-1 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm outline-none focus:border-[var(--gold-dim)]"
        />
        <select
          value={trader}
          onChange={(e) => setTrader(e.target.value)}
          className="rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm outline-none focus:border-[var(--gold-dim)]"
        >
          <option value="">All traders</option>
          {traders.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
        <select
          value={map}
          onChange={(e) => setMap(e.target.value)}
          className="rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm outline-none focus:border-[var(--gold-dim)]"
        >
          <option value="">All maps</option>
          {maps.map((m) => (
            <option key={m.id} value={m.id}>
              {m.name}
            </option>
          ))}
        </select>
        <label className="flex items-center gap-2 text-sm text-[var(--muted)]">
          <input
            type="checkbox"
            checked={kappaOnly}
            onChange={(e) => setKappaOnly(e.target.checked)}
            className="accent-[var(--gold)]"
          />
          Kappa
        </label>
        <label className="flex items-center gap-2 text-sm text-[var(--muted)]">
          <input
            type="checkbox"
            checked={hideDone}
            onChange={(e) => setHideDone(e.target.checked)}
            className="accent-[var(--gold)]"
          />
          Hide done
        </label>
      </div>

      <p className="mb-3 text-xs uppercase tracking-wider text-[var(--muted)]">
        {filtered.length} quest{filtered.length === 1 ? "" : "s"}
      </p>

      <ul className="grid gap-2 sm:grid-cols-2">
        {filtered.map((quest) => {
          const done = completed?.has(quest.id) ?? false;
          return (
            <li key={quest.id}>
              <button
                type="button"
                onClick={() => setSelected(quest.id)}
                className={`flex w-full items-center gap-3 rounded-lg border px-4 py-3 text-left transition-all hover:-translate-y-0.5 ${
                  done
                    ? "border-[var(--success)]/50 bg-[var(--success)]/10"
                    : "border-[var(--border)] bg-[var(--surface)] hover:border-[var(--gold-dim)]"
                }`}
              >
                <span
                  className={`flex-1 font-medium ${done ? "text-[var(--success)]" : ""}`}
                >
                  {quest.title}
                </span>
                {quest.kappaRequired && (
                  <span className="rounded bg-[var(--brown)]/40 px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-[var(--gold-hi)]">
                    Kappa
                  </span>
                )}
                <span className="text-xs text-[var(--muted)]">
                  {traderName[quest.trader] ?? quest.trader}
                </span>
                {done && <span className="text-[var(--success)]">✓</span>}
              </button>
            </li>
          );
        })}
        {filtered.length === 0 && (
          <li className="col-span-full px-4 py-8 text-center text-sm text-[var(--muted)]">
            No quests match your filters.
          </li>
        )}
      </ul>

      <QuestQuickView questId={selected} onClose={() => setSelected(null)} />
    </div>
  );
}
