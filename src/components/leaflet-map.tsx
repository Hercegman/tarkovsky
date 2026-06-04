"use client";

import { useEffect, useMemo } from "react";
import {
  MapContainer,
  ImageOverlay,
  CircleMarker,
  Popup,
  useMap,
} from "react-leaflet";
import { CRS, latLngBounds, type LatLngBoundsExpression } from "leaflet";
import "leaflet/dist/leaflet.css";
import type { MapData } from "@/lib/types";
import { categoryColor } from "@/lib/map-colors";

export interface HighlightMarker {
  x: number;
  y: number;
  label: string;
}

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

/** Flies to the highlighted markers when a quest is selected. */
function FlyToHighlight({ highlight }: { highlight: HighlightMarker[] }) {
  const map = useMap();
  useEffect(() => {
    if (highlight.length) {
      const b = latLngBounds(highlight.map((h) => [h.y, h.x] as [number, number]));
      map.flyToBounds(b.pad(0.6), { maxZoom: 1, duration: 0.6 });
    }
  }, [map, highlight]);
  return null;
}

export default function LeafletMap({
  map,
  active,
  highlight = [],
  interactive = true,
}: {
  map: MapData;
  active: string[];
  highlight?: HighlightMarker[];
  interactive?: boolean;
}) {
  const bounds: LatLngBoundsExpression = [
    [0, 0],
    [map.height, map.width],
  ];
  const activeSet = useMemo(() => new Set(active), [active]);
  const shown = useMemo(
    () => map.markers.filter((m) => activeSet.has(m.c)),
    [map.markers, activeSet],
  );

  return (
    <MapContainer
      crs={CRS.Simple}
      bounds={bounds}
      maxBounds={bounds}
      maxBoundsViscosity={0.85}
      minZoom={-3}
      maxZoom={2}
      zoomSnap={0}
      zoomDelta={0.5}
      wheelPxPerZoomLevel={110}
      wheelDebounceTime={20}
      zoomControl={interactive}
      dragging={interactive}
      scrollWheelZoom={interactive}
      doubleClickZoom={interactive}
      attributionControl={false}
      preferCanvas
      className="h-full w-full bg-[var(--surface)]"
    >
      <AutoResize />
      <FlyToHighlight highlight={highlight} />
      {map.image && <ImageOverlay url={map.image} bounds={bounds} />}

      {shown.map((p, i) => (
        <CircleMarker
          key={i}
          center={[p.y, p.x]}
          radius={5}
          pathOptions={{
            color: "#14150f",
            weight: 1,
            fillColor: categoryColor(p.c),
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

      {/* Selected quest's own location(s), drawn on top. */}
      {highlight.map((p, i) => (
        <CircleMarker
          key={`h-${i}`}
          center={[p.y, p.x]}
          radius={9}
          pathOptions={{
            color: "#fff7e0",
            weight: 2,
            fillColor: "#e3c170",
            fillOpacity: 1,
          }}
        >
          <Popup>
            <strong>{p.label}</strong>
          </Popup>
        </CircleMarker>
      ))}
    </MapContainer>
  );
}
