"use client";

import dynamic from "next/dynamic";
import type { MapData } from "@/lib/types";

const LeafletMap = dynamic(() => import("./leaflet-map"), {
  ssr: false,
  loading: () => (
    <div className="flex h-[320px] w-full items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--surface)] text-sm text-[var(--muted)]">
      Loading map…
    </div>
  ),
});

/** Small map preview showing only quest-related markers for a location. */
export function QuestMiniMap({ map }: { map: MapData }) {
  const hasQuestLayer = map.markers.some((m) => m.c === "quest");
  const active = hasQuestLayer ? ["quest"] : ["exfil_pmc", "exfil_scav"];

  return (
    <div className="h-[320px] overflow-hidden rounded-lg border border-[var(--border)] bg-black">
      <LeafletMap map={map} active={active} />
    </div>
  );
}
