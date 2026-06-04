"use client";

import dynamic from "next/dynamic";
import type { MapData } from "@/lib/types";
import type { HighlightMarker } from "./leaflet-map";

const LeafletMap = dynamic(() => import("./leaflet-map"), {
  ssr: false,
  loading: () => (
    <div className="flex h-[320px] w-full items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--surface)] text-sm text-[var(--muted)]">
      Loading map…
    </div>
  ),
});

/** Small map preview highlighting this quest's location(s). */
export function QuestMiniMap({
  map,
  highlight,
}: {
  map: MapData;
  highlight: HighlightMarker[];
}) {
  // Show the quest's own markers if we have them; otherwise fall back to the
  // generic quest-related layer so the player still gets context.
  const active = highlight.length ? [] : ["quest"];

  return (
    <div className="h-[320px] overflow-hidden rounded-lg border border-[var(--border)] bg-black">
      <LeafletMap map={map} active={active} highlight={highlight} />
    </div>
  );
}
