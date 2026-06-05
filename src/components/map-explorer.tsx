"use client";

import { useRef, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import type { MapData } from "@/lib/types";
import type { HighlightMarker } from "./leaflet-map";
import { useProgress } from "@/hooks/use-progress";
import { shapeDataUri, categoryLabel } from "@/lib/map-colors";

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
  markers: HighlightMarker[];
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

  const [selected, setSelected] = useState<string | null>(null);
  const selectedQuest = quests.find((q) => q.id === selected) ?? null;
  const highlight = selectedQuest?.markers ?? [];

  const [query, setQuery] = useState("");
  const visibleQuests = query.trim()
    ? quests.filter((q) =>
        q.title.toLowerCase().includes(query.trim().toLowerCase()),
      )
    : quests;

  const { completed } = useProgress();
  const mapRef = useRef<HTMLDivElement>(null);

  function fullscreen() {
    const el = mapRef.current;
    if (!el) return;
    if (document.fullscreenElement) document.exitFullscreen();
    else el.requestFullscreen?.();
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[270px_1fr_230px]">
      {/* Left — quests on this map */}
      <aside className="order-2 lg:order-1">
        <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">
          Quests here ({quests.length})
        </h2>
        <p className="mb-2 text-[11px] text-[var(--muted)]">
          Click a quest to show its location.
        </p>
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search quests…"
          className="mb-2 w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm outline-none focus:border-[var(--gold-dim)]"
        />
        <ul className="max-h-[320px] space-y-1 overflow-auto rounded-xl border border-[var(--border)] bg-[var(--surface)] p-2 lg:max-h-[572px]">
          {visibleQuests.map((q) => {
            const done = completed?.has(q.id) ?? false;
            const isSel = q.id === selected;
            const hasLoc = q.markers.length > 0;
            return (
              <li key={q.id}>
                <div
                  className={`flex items-center gap-1 rounded px-2 py-1.5 transition-colors ${
                    isSel
                      ? "bg-[var(--gold)]/15 ring-1 ring-[var(--gold-dim)]"
                      : "hover:bg-[var(--surface-2)]"
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => setSelected(isSel ? null : q.id)}
                    title={hasLoc ? "Show location" : "No mapped location"}
                    className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border text-[10px] ${
                      isSel
                        ? "border-[var(--gold)] bg-[var(--gold)] text-[var(--background)]"
                        : hasLoc
                          ? "border-[var(--gold-dim)] text-[var(--gold)]"
                          : "border-[var(--border)] text-[var(--muted)]"
                    }`}
                  >
                    {isSel ? "✓" : hasLoc ? "📍" : "·"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelected(isSel ? null : q.id)}
                    className={`flex-1 truncate text-left text-sm ${
                      done ? "text-[var(--success)]" : ""
                    }`}
                  >
                    {q.title}
                  </button>
                  {done && <span className="text-xs text-[var(--success)]">✓</span>}
                  <Link
                    href={`/quest/${q.id}`}
                    className="px-1 text-xs text-[var(--muted)] hover:text-[var(--gold)]"
                    title="Open quest"
                  >
                    ↗
                  </Link>
                </div>
              </li>
            );
          })}
          {visibleQuests.length === 0 && (
            <li className="px-3 py-2 text-sm text-[var(--muted)]">
              {quests.length === 0
                ? "No quests reference this map."
                : "No quests match your search."}
            </li>
          )}
        </ul>
      </aside>

      {/* Center — the map */}
      <div className="order-1 lg:order-2">
        <div
          ref={mapRef}
          className="relative h-[620px] overflow-hidden rounded-xl border border-[var(--border)] bg-black"
        >
          <LeafletMap map={map} active={active} highlight={highlight} />
          <button
            type="button"
            onClick={fullscreen}
            className="absolute right-3 top-3 z-[500] rounded-lg border border-[var(--gold-dim)] bg-[var(--surface)]/90 px-3 py-1.5 text-xs text-[var(--gold)] backdrop-blur transition-colors hover:bg-[var(--gold)] hover:text-[var(--background)]"
          >
            ⤢ Fullscreen
          </button>
          {selectedQuest && (
            <div className="absolute left-3 top-3 z-[500] max-w-[60%] rounded-lg border border-[var(--gold-dim)] bg-[var(--surface)]/90 px-3 py-1.5 text-xs backdrop-blur">
              <span className="text-[var(--gold)]">{selectedQuest.title}</span>
              {highlight.length === 0 && (
                <span className="text-[var(--muted)]"> · no mapped location</span>
              )}
            </div>
          )}
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
        <div className="max-h-[620px] space-y-1 overflow-auto rounded-xl border border-[var(--border)] bg-[var(--surface)] p-2">
          {cats.map((c) => {
            const on = active.includes(c.id);
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => toggle(c.id)}
                className={`flex w-full items-center gap-2 rounded px-2.5 py-1.5 text-left text-sm transition-colors ${
                  on ? "bg-[var(--surface-2)]" : "opacity-55 hover:opacity-100"
                }`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={shapeDataUri(c.id)}
                  alt=""
                  className={`h-4 w-4 shrink-0 ${on ? "" : "opacity-40 grayscale"}`}
                />
                <span className="flex-1 truncate">{categoryLabel(c.id, c.name)}</span>
                <span className="text-xs text-[var(--muted)]">{counts[c.id]}</span>
              </button>
            );
          })}
        </div>
      </aside>
    </div>
  );
}
