"use client";

import { useEffect, useMemo } from "react";
import { MapContainer, ImageOverlay, Marker, Popup, useMap } from "react-leaflet";
import {
  CRS,
  divIcon,
  latLngBounds,
  type DivIcon,
  type LatLngBoundsExpression,
} from "leaflet";
import "leaflet/dist/leaflet.css";
import type { MapData } from "@/lib/types";
import { categoryColor, categoryShape, shapeSvg } from "@/lib/map-colors";

export interface HighlightMarker {
  x: number;
  y: number;
  label: string;
}

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

const highlightIcon = (): DivIcon =>
  divIcon({
    className: "",
    iconSize: [26, 26],
    iconAnchor: [13, 13],
    html: `<svg xmlns='http://www.w3.org/2000/svg' width='26' height='26' viewBox='0 0 26 26' style='filter:drop-shadow(0 0 4px rgba(227,193,112,0.9))'><polygon points='13,2 24,13 13,24 2,13' fill='#e3c170' stroke='#fff7e0' stroke-width='2' stroke-linejoin='round'/></svg>`,
  });

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

  // One shaped icon per category, built once.
  const iconByCat = useMemo(() => {
    const make = (id: string) =>
      divIcon({
        className: "",
        iconSize: [16, 16],
        iconAnchor: [8, 8],
        html: shapeSvg(categoryShape(id), categoryColor(id)),
      });
    const m = new Map<string, DivIcon>();
    for (const c of map.categories) m.set(c.id, make(c.id));
    for (const mk of map.markers) if (!m.has(mk.c)) m.set(mk.c, make(mk.c));
    return m;
  }, [map.categories, map.markers]);
  const hIcon = useMemo(() => highlightIcon(), []);

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
      className="h-full w-full bg-[var(--surface)]"
    >
      <AutoResize />
      <FlyToHighlight highlight={highlight} />
      {map.image && <ImageOverlay url={map.image} bounds={bounds} />}

      {shown.map((p, i) => (
        <Marker key={i} position={[p.y, p.x]} icon={iconByCat.get(p.c)}>
          {p.t && (
            <Popup>
              <strong>{p.t}</strong>
            </Popup>
          )}
        </Marker>
      ))}

      {highlight.map((p, i) => (
        <Marker key={`h-${i}`} position={[p.y, p.x]} icon={hIcon} zIndexOffset={1000}>
          <Popup>
            <strong>{p.label}</strong>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}
