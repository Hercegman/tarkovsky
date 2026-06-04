"use client";

import { useRef, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import type { MapData } from "@/lib/types";
import { useProgress } from "@/hooks/use-progress";

const LeafletMap = dynamic(() => import("./leaflet-map"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center text-sm text-[var(--muted)]">
      Loading map…
    </div>
  ),
});

const DEFAULT_ON = ["quest", "exfil_pmc", "exfil_scav", "exfil_transit"];
const PRIORITY = [
  "quest",
  "exfil_pmc",
  "exfil_scav",
  "exfil_transit",
  "spawn_pmc",
  "spawn_scav",
  "spawn_boss",
  "locked",
  "loot_key",
];

export interface MapQuest {
  id: string;
  title: string;
}

export function MapExplorer({
  map,
  quests,
}: {
  map: MapData;
  quests: MapQuest[];
}) {
  const counts = map.markers.reduce<Record<string, number>>((acc, m) => {
    acc[m.c] = (acc[m.c] ?? 0) + 1;
    return acc;
  }, {});
  const cats = map.categories
    .filter((c) => counts[c.id])
    .sort((a, b) => {
      const ia = PRIORITY.indexOf(a.id);
      const ib = PRIORITY.indexOf(b.id);
      return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib);
    });

  const [active, setActive] = useState<string[]>(
    DEFAULT_ON.filter((id) => counts[id]),
  );
  const toggle = (id: string) =>
    setActive((a) => (a.includes(id) ? a.filter((x) => x !== id) : [...a, id]));

  const { completed } = useProgress();
  const mapRef = useRef<HTMLDivElement>(null);

  function fullscreen() {
    const el = mapRef.current;
    if (!el) return;
    if (document.fullscreenElement) document.exitFullscreen();
    else el.requestFullscreen?.();
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[260px_1fr_230px]">
      {/* Left — quests on this map */}
      <aside className="order-2 lg:order-1">
        <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">
          Quests here ({quests.length})
        </h2>
        <ul className="max-h-[300px] space-y-1 overflow-auto rounded-xl border border-[var(--border)] bg-[var(--surface)] p-2 lg:max-h-[640px]">
          {quests.map((q) => {
            const done = completed?.has(q.id) ?? false;
            return (
              <li key={q.id}>
                <Link
                  href={`/quest/${q.id}`}
                  className={`flex items-center gap-2 rounded px-3 py-2 text-sm transition-colors ${
                    done
                      ? "bg-[var(--success)]/10 text-[var(--success)]"
                      : "hover:bg-[var(--surface-2)] hover:text-[var(--gold)]"
                  }`}
                >
                  <span className="flex-1">{q.title}</span>
                  {done && <span>✓</span>}
                </Link>
              </li>
            );
          })}
          {quests.length === 0 && (
            <li className="px-3 py-2 text-sm text-[var(--muted)]">
              No quests reference this map.
            </li>
          )}
        </ul>
      </aside>

      {/* Center — the map */}
      <div className="order-1 lg:order-2">
        <div
          ref={mapRef}
          className="relative h-[640px] overflow-hidden rounded-xl border border-[var(--border)] bg-black"
        >
          <LeafletMap map={map} active={active} />
          <button
            type="button"
            onClick={fullscreen}
            className="absolute right-3 top-3 z-[500] rounded-lg border border-[var(--gold-dim)] bg-[var(--surface)]/90 px-3 py-1.5 text-xs text-[var(--gold)] backdrop-blur transition-colors hover:bg-[var(--gold)] hover:text-[var(--background)]"
          >
            ⤢ Fullscreen
          </button>
        </div>
        {map.source && (
          <p className="mt-2 text-xs text-[var(--muted)]">
            Map data &amp; image:{" "}
            <a
              href={map.source.url}
              target="_blank"
              rel="noreferrer"
              className="text-[var(--gold)] hover:underline"
            >
              {map.source.wiki}
            </a>{" "}
            · {map.source.license}
          </p>
        )}
      </div>

      {/* Right — layer toggles */}
      <aside className="order-3">
        <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">
          Layers
        </h2>
        <div className="max-h-[640px] space-y-1 overflow-auto rounded-xl border border-[var(--border)] bg-[var(--surface)] p-2">
          {cats.map((c) => {
            const on = active.includes(c.id);
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => toggle(c.id)}
                className={`flex w-full items-center gap-2 rounded px-2.5 py-1.5 text-left text-sm transition-colors ${
                  on ? "bg-[var(--surface-2)]" : "opacity-60 hover:opacity-100"
                }`}
              >
                <span
                  className="h-3 w-3 shrink-0 rounded-full border border-black/40"
                  style={{ background: on ? c.color : "transparent", borderColor: c.color }}
                />
                <span className="flex-1 truncate">{c.name}</span>
                <span className="text-xs text-[var(--muted)]">{counts[c.id]}</span>
              </button>
            );
          })}
        </div>
      </aside>
    </div>
  );
}
