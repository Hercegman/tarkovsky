"use client";

import { useMemo } from "react";
import {
  MapContainer,
  ImageOverlay,
  CircleMarker,
  Popup,
  LayersControl,
  LayerGroup,
} from "react-leaflet";
import { CRS, type LatLngBoundsExpression } from "leaflet";
import "leaflet/dist/leaflet.css";
import type { MapData } from "@/lib/types";

// Categories shown (checked) by default — the most useful for quests.
const DEFAULT_ON = new Set([
  "quest",
  "exfil_pmc",
  "exfil_scav",
  "exfil_transit",
]);

// Ordering so the useful layers sit at the top of the control.
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

export default function LeafletMap({ map }: { map: MapData }) {
  const bounds: LatLngBoundsExpression = [
    [0, 0],
    [map.height, map.width],
  ];

  const grouped = useMemo(() => {
    const byCat = new Map<string, MapData["markers"]>();
    for (const m of map.markers) {
      const arr = byCat.get(m.c) ?? [];
      arr.push(m);
      byCat.set(m.c, arr);
    }
    return map.categories
      .filter((c) => byCat.has(c.id))
      .sort((a, b) => {
        const ia = PRIORITY.indexOf(a.id);
        const ib = PRIORITY.indexOf(b.id);
        return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib);
      })
      .map((c) => ({ cat: c, pins: byCat.get(c.id)! }));
  }, [map]);

  return (
    <MapContainer
      crs={CRS.Simple}
      bounds={bounds}
      maxBounds={bounds}
      minZoom={-3}
      maxZoom={2}
      zoomSnap={0.25}
      className="h-[600px] w-full rounded-lg border border-[var(--border)] bg-[var(--surface)]"
    >
      {map.image && <ImageOverlay url={map.image} bounds={bounds} />}
      <LayersControl position="topright" collapsed={false}>
        {grouped.map(({ cat, pins }) => (
          <LayersControl.Overlay
            key={cat.id}
            name={`${cat.name} (${pins.length})`}
            checked={DEFAULT_ON.has(cat.id)}
          >
            <LayerGroup>
              {pins.map((p, i) => (
                <CircleMarker
                  key={i}
                  center={[p.y, p.x]}
                  radius={5}
                  pathOptions={{
                    color: "#14110d",
                    weight: 1,
                    fillColor: cat.color,
                    fillOpacity: 0.9,
                  }}
                >
                  {(p.t || cat.name) && (
                    <Popup>
                      <strong>{p.t || cat.name}</strong>
                      <div style={{ opacity: 0.7 }}>{cat.name}</div>
                    </Popup>
                  )}
                </CircleMarker>
              ))}
            </LayerGroup>
          </LayersControl.Overlay>
        ))}
      </LayersControl>
    </MapContainer>
  );
}
