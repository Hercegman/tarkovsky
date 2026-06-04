# Maps

Part of [[Tarkovsky]]. Built from the Fandom Interactive Maps data (see
[[Data Ingest]] → `ingest:maps`).

## Data shape (`content/maps/<id>.json`)

`id`, `name`, `image` (`/maps/<id>.webp`), `width`, `height`, `source`,
`categories[]` (id/name/color), `markers[]` (`{ c: categoryId, x, y, t: title }`).
Type: `src/lib/types.ts` → `MapData`.

## Rendering

- `leaflet-map.tsx` — the Leaflet `MapContainer` with `CRS.Simple`, the base image
  as an `ImageOverlay`, and `CircleMarker`s. **Smoothness:** `preferCanvas`,
  fractional zoom (`zoomSnap: 0`), gentle wheel zoom, bounds viscosity.
- `map-explorer.tsx` — the `/maps/[map]` layout: **left** the quest list (with a
  search bar + completed badges), **center** the map (+ fullscreen button),
  **right** a custom layer-toggle panel.
- `quest-mini-map.tsx` — the small map on a quest page.
- Loaded via `next/dynamic` (`ssr:false`) because Leaflet needs `window`.

## Coordinate system (important)

Fandom markers use origin **bottom-left**, order **xy**. Leaflet `CRS.Simple` uses
transformation `(1,0,-1,0)` → latitude increases **upward**, the same direction as
bottom-left. So a bottom-left source needs **no vertical flip** (only a top-left
source would). This was the cause of the early "mirrored markers" bug.

## Marker colors

The wiki ships almost every category as the same pink, so we assign our own in
`src/lib/map-colors.ts` (`categoryColor(id)`): curated colors for common
categories + a stable hash-based hue for the long tail. Used by the markers and
the legend swatches.

## Per-quest location

`link:markers` matches objectives to the map's quest-category markers and stores
them on `quest.markers`. In `map-explorer.tsx`, clicking a quest passes its markers
as `highlight` to `leaflet-map.tsx`, which draws them in gold and flies to them.
Only ~28% of quests have a findable wiki location (many are hand-over/elimination).
