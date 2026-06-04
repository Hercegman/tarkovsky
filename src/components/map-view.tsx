"use client";

import dynamic from "next/dynamic";
import type { MapData } from "@/lib/types";

// Leaflet touches `window`, so load the map only on the client.
const LeafletMap = dynamic(() => import("./leaflet-map"), {
  ssr: false,
  loading: () => (
    <div className="flex h-[600px] w-full items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--surface)] text-sm text-[var(--muted)]">
      Loading map…
    </div>
  ),
});

export function MapView({ map }: { map: MapData }) {
  if (!map.image) {
    return (
      <div className="flex h-[600px] w-full flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-[var(--border)] bg-[var(--surface)] text-center text-sm text-[var(--muted)]">
        <p className="font-medium text-[var(--foreground)]">
          Map image not available
        </p>
      </div>
    );
  }

  return (
    <div>
      <LeafletMap map={map} />
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
  );
}
