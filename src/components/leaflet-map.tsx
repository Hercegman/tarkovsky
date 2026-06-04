"use client";

import { MapContainer, ImageOverlay, Marker, Popup } from "react-leaflet";
import { CRS, divIcon, type LatLngBoundsExpression } from "leaflet";
import Link from "next/link";
import "leaflet/dist/leaflet.css";
import type { GameMap } from "@/lib/types";
import type { MapMarkerData } from "./map-view";

// A small gold pin built from a div, so we don't depend on Leaflet's
// default marker image assets (which break under bundlers).
const pin = divIcon({
  className: "",
  html: `<div style="width:14px;height:14px;border-radius:50%;background:#c8a04d;border:2px solid #14110d;box-shadow:0 0 0 2px #c8a04d55"></div>`,
  iconSize: [14, 14],
  iconAnchor: [7, 7],
});

export default function LeafletMap({
  map,
  markers,
}: {
  map: GameMap;
  markers: MapMarkerData[];
}) {
  const width = map.width ?? 1000;
  const height = map.height ?? 1000;
  // CRS.Simple: coordinates are [y, x] in image pixels.
  const bounds: LatLngBoundsExpression = [
    [0, 0],
    [height, width],
  ];

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
      {markers.map((mk, i) => (
        <Marker key={i} position={[mk.y, mk.x]} icon={pin}>
          <Popup>
            <Link href={`/quest/${mk.questId}`}>{mk.questTitle}</Link>
            {mk.label && <div>{mk.label}</div>}
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}
