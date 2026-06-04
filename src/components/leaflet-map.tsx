"use client";

import { useEffect, useMemo } from "react";
import {
  MapContainer,
  ImageOverlay,
  CircleMarker,
  Popup,
  useMap,
} from "react-leaflet";
import { CRS, type LatLngBoundsExpression } from "leaflet";
import "leaflet/dist/leaflet.css";
import type { MapData } from "@/lib/types";

/** Keeps Leaflet sized correctly when the container resizes (fullscreen, panels). */
function AutoResize() {
  const map = useMap();
  useEffect(() => {
    const el = map.getContainer();
    const ro = new ResizeObserver(() => map.invalidateSize());
    ro.observe(el);
    return () => ro.disconnect();
  }, [map]);
  return null;
}

export default function LeafletMap({
  map,
  active,
  interactive = true,
}: {
  map: MapData;
  active: string[]; // category ids to show
  interactive?: boolean;
}) {
  const bounds: LatLngBoundsExpression = [
    [0, 0],
    [map.height, map.width],
  ];
  const activeSet = useMemo(() => new Set(active), [active]);
  const colorOf = useMemo(
    () => Object.fromEntries(map.categories.map((c) => [c.id, c.color])),
    [map.categories],
  );
  const shown = useMemo(
    () => map.markers.filter((m) => activeSet.has(m.c)),
    [map.markers, activeSet],
  );

  return (
    <MapContainer
      crs={CRS.Simple}
      bounds={bounds}
      maxBounds={bounds}
      minZoom={-3}
      maxZoom={2}
      zoomSnap={0.25}
      zoomControl={interactive}
      dragging={interactive}
      scrollWheelZoom={interactive}
      doubleClickZoom={interactive}
      attributionControl={false}
      className="h-full w-full bg-[var(--surface)]"
    >
      <AutoResize />
      {map.image && <ImageOverlay url={map.image} bounds={bounds} />}
      {shown.map((p, i) => (
        <CircleMarker
          key={i}
          center={[p.y, p.x]}
          radius={5}
          pathOptions={{
            color: "#14110d",
            weight: 1,
            fillColor: colorOf[p.c] ?? "#c8a04d",
            fillOpacity: 0.9,
          }}
        >
          {p.t && (
            <Popup>
              <strong>{p.t}</strong>
            </Popup>
          )}
        </CircleMarker>
      ))}
    </MapContainer>
  );
}
