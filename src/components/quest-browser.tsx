"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { Trader, GameMap } from "@/lib/types";

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
      return true;
    });
  }, [quests, query, trader, map, kappaOnly]);

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search quests…"
          className="min-w-[200px] flex-1 rounded border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm outline-none focus:border-[var(--gold-dim)]"
        />
        <select
          value={trader}
          onChange={(e) => setTrader(e.target.value)}
          className="rounded border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm outline-none focus:border-[var(--gold-dim)]"
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
          className="rounded border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm outline-none focus:border-[var(--gold-dim)]"
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
          Kappa only
        </label>
      </div>

      <p className="mb-3 text-xs uppercase tracking-wider text-[var(--muted)]">
        {filtered.length} quest{filtered.length === 1 ? "" : "s"}
      </p>

      <ul className="divide-y divide-[var(--border)] overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--surface)]">
        {filtered.map((quest) => (
          <li key={quest.id}>
            <Link
              href={`/quest/${quest.id}`}
              className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-[var(--surface-2)]"
            >
              <span className="flex-1 font-medium text-[var(--foreground)]">
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
            </Link>
          </li>
        ))}
        {filtered.length === 0 && (
          <li className="px-4 py-8 text-center text-sm text-[var(--muted)]">
            No quests match your filters.
          </li>
        )}
      </ul>
    </div>
  );
}
