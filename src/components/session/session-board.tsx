"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { MapContainer, ImageOverlay, Marker, useMap } from "react-leaflet";
import { CRS, divIcon, type Map as LeafletMap, type LatLngBoundsExpression } from "leaflet";
import "leaflet/dist/leaflet.css";
import {
  useSelf,
  useOthers,
  useUpdateMyPresence,
  useMutation,
} from "@liveblocks/react/suspense";
import type { MapData } from "@/lib/types";
import { categoryColor, categoryShape, shapeSvg } from "@/lib/map-colors";
import { DrawingCanvas } from "./drawing-canvas";
import { SessionToolbar, type BoardTool } from "./session-toolbar";

// PMC-usable extracts shown by default on every session map (PMC + Shared).
const EXFIL_CATEGORIES = ["exfil_pmc", "exfil_shared"];

function escapeHtml(s: string): string {
  return s.replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!,
  );
}

// A category glyph with the extract's name pinned underneath (always visible).
function exfilIconHtml(c: string, title: string): string {
  const glyph = shapeSvg(categoryShape(c), categoryColor(c));
  return `<div style="position:relative;width:16px;height:16px;pointer-events:none;filter:drop-shadow(0 1px 2px rgba(0,0,0,.6))">${glyph}<span style="position:absolute;top:17px;left:50%;transform:translateX(-50%);white-space:nowrap;font:600 11px/1.2 Inter,system-ui,sans-serif;color:#f0ead6;background:rgba(20,21,15,.82);border:1px solid rgba(227,193,112,.5);border-radius:4px;padding:1px 5px">${escapeHtml(title)}</span></div>`;
}

// Lifts the Leaflet instance out of the MapContainer so the overlay + viewport
// logic (which live outside the container) can use it.
function MapReady({ onReady }: { onReady: (m: LeafletMap) => void }) {
  const map = useMap();
  useEffect(() => onReady(map), [map, onReady]);
  return null;
}

export function SessionBoard({ code, map }: { code: string; map: MapData }) {
  const self = useSelf();
  const others = useOthers();
  const updateMyPresence = useUpdateMyPresence();

  const [leaflet, setLeaflet] = useState<LeafletMap | null>(null);
  const [tool, setTool] = useState<BoardTool>("pan");
  const [color, setColor] = useState(self.info.color);
  const [width, setWidth] = useState(4);
  const [following, setFollowing] = useState(false);
  const [copied, setCopied] = useState(false);

  const isCoach = self.info.role === "coach";
  const coach = others.find((o) => o.info.role === "coach");
  const coachViewport = coach?.presence.viewport ?? null;
  const programmatic = useRef(false);
  const mapWrapRef = useRef<HTMLDivElement>(null);

  const bounds: LatLngBoundsExpression = [
    [0, 0],
    [map.height, map.width],
  ];

  // PMC + Shared extracts, shown by default with a permanent name label.
  const exfils = useMemo(
    () =>
      map.markers
        .filter((mk) => EXFIL_CATEGORIES.includes(mk.c))
        .map((mk) => ({
          key: `${mk.c}-${mk.x}-${mk.y}-${mk.t}`,
          pos: [mk.y, mk.x] as [number, number],
          icon: divIcon({
            className: "",
            iconSize: [16, 16],
            iconAnchor: [8, 8],
            html: exfilIconHtml(mk.c, mk.t),
          }),
        })),
    [map.markers],
  );

  const clearAll = useMutation(({ storage }) => {
    storage.get("strokes").clear();
  }, []);

  // Coach: broadcast viewport so followers can snap to it.
  useEffect(() => {
    if (!leaflet || !isCoach) return;
    const broadcast = () => {
      const c = leaflet.getCenter();
      updateMyPresence({
        viewport: { center: [c.lat, c.lng], zoom: leaflet.getZoom() },
      });
    };
    broadcast();
    leaflet.on("moveend", broadcast);
    leaflet.on("zoomend", broadcast);
    return () => {
      leaflet.off("moveend", broadcast);
      leaflet.off("zoomend", broadcast);
    };
  }, [leaflet, isCoach, updateMyPresence]);

  // Follower: when following, mirror the coach's viewport.
  useEffect(() => {
    if (!leaflet || !following || !coachViewport) return;
    programmatic.current = true;
    leaflet.setView(coachViewport.center, coachViewport.zoom, { animate: true });
    const done = () => {
      programmatic.current = false;
    };
    leaflet.once("moveend", done);
  }, [leaflet, following, coachViewport]);

  // A manual pan/zoom cancels Follow (programmatic moves are flagged).
  useEffect(() => {
    if (!leaflet) return;
    const onUser = () => {
      if (!programmatic.current) setFollowing(false);
    };
    leaflet.on("dragstart", onUser);
    leaflet.on("zoomstart", onUser);
    return () => {
      leaflet.off("dragstart", onUser);
      leaflet.off("zoomstart", onUser);
    };
  }, [leaflet]);

  // Keep Leaflet (and the drawing canvas) sized to its container — covers
  // entering/leaving fullscreen and any responsive resize.
  useEffect(() => {
    if (!leaflet) return;
    const ro = new ResizeObserver(() => leaflet.invalidateSize());
    ro.observe(leaflet.getContainer());
    return () => ro.disconnect();
  }, [leaflet]);

  const toggleFullscreen = useCallback(() => {
    const el = mapWrapRef.current;
    if (!el) return;
    if (document.fullscreenElement) document.exitFullscreen();
    else el.requestFullscreen?.();
  }, []);

  const copyCode = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard may be blocked; the code is shown anyway */
    }
  }, [code]);

  const participants = [
    { id: "self", name: self.info.name, color: self.info.color, role: self.info.role },
    ...others.map((o) => ({
      id: String(o.connectionId),
      name: o.info.name,
      color: o.info.color,
      role: o.info.role,
    })),
  ];

  return (
    <div className="radial-glow min-h-full">
      <div className="mx-auto max-w-6xl px-4 py-6">
        {/* Top bar (session controls live inside the map so they show in fullscreen) */}
        <div className="mb-3 flex items-center gap-3">
          <Link
            href="/sessions"
            className="text-sm text-[var(--muted)] transition-colors hover:text-[var(--gold)]"
          >
            ← Leave
          </Link>
          <h1 className="text-lg font-bold">
            <span className="text-gradient">{map.name}</span>
          </h1>
        </div>

        {/* The board */}
        <div
          ref={mapWrapRef}
          style={{ aspectRatio: `${map.width} / ${map.height}` }}
          className="map-fs relative max-h-[82vh] w-full overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--background)]"
        >
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
            // The drawing canvas is an external overlay that can't ride Leaflet's
            // zoom animation, so animating zoom desyncs/ghosts the strokes. Snap
            // zoom instead — the map image and drawings then move together.
            zoomAnimation={false}
            markerZoomAnimation={false}
            attributionControl={false}
            className="h-full w-full bg-[var(--surface)]"
          >
            <MapReady onReady={setLeaflet} />
            {map.image && <ImageOverlay url={map.image} bounds={bounds} />}
            {exfils.map((e) => (
              <Marker key={e.key} position={e.pos} icon={e.icon} interactive={false} />
            ))}
          </MapContainer>

          {leaflet && (
            <DrawingCanvas map={leaflet} tool={tool} color={color} width={width} />
          )}

          <SessionToolbar
            tool={tool}
            setTool={setTool}
            color={color}
            setColor={setColor}
            width={width}
            setWidth={setWidth}
            onClear={clearAll}
          />

          {/* Floating control cluster — inside the map so it stays in fullscreen.
              The container ignores pointer events; each control re-enables them. */}
          <div className="pointer-events-none absolute right-3 top-3 z-[1100] flex max-w-[70%] flex-col items-end gap-2">
            <div className="flex items-center gap-2">
              {!isCoach && (
                <button
                  type="button"
                  onClick={() => setFollowing((f) => !f)}
                  disabled={!coach}
                  title={coach ? "Snap to the coach's view" : "Waiting for the coach"}
                  className={`pointer-events-auto rounded-lg border px-3 py-1.5 text-xs backdrop-blur transition-colors disabled:opacity-40 ${
                    following
                      ? "border-[var(--gold)] bg-[var(--gold)]/20 text-[var(--gold)]"
                      : "border-[var(--border)] bg-[var(--surface)]/90 hover:bg-[var(--surface-2)]"
                  }`}
                >
                  {following ? "● Following coach" : "Follow coach"}
                </button>
              )}
              <button
                type="button"
                onClick={copyCode}
                title="Copy the session code"
                className="pointer-events-auto rounded-lg border border-[var(--gold-dim)] bg-[var(--surface)]/90 px-3 py-1.5 font-mono text-xs tracking-widest text-[var(--gold)] backdrop-blur transition-colors hover:bg-[var(--gold)] hover:text-[var(--background)]"
              >
                {copied ? "Copied!" : `Code: ${code}`}
              </button>
              <button
                type="button"
                onClick={toggleFullscreen}
                title="Toggle fullscreen"
                className="pointer-events-auto rounded-lg border border-[var(--gold-dim)] bg-[var(--surface)]/90 px-3 py-1.5 text-xs text-[var(--gold)] backdrop-blur transition-colors hover:bg-[var(--gold)] hover:text-[var(--background)]"
              >
                ⤢
              </button>
            </div>

            {/* Participants */}
            <div className="pointer-events-auto flex flex-wrap justify-end gap-1.5">
              {participants.map((p) => (
                <span
                  key={p.id}
                  className="flex items-center gap-1.5 rounded-full border border-[var(--border)] bg-[var(--surface)]/90 px-2.5 py-1 text-xs backdrop-blur"
                  title={p.role === "coach" ? "Coach" : "Player"}
                >
                  <span
                    className="h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: p.color }}
                  />
                  {p.name}
                  {p.role === "coach" && (
                    <span className="text-[10px] uppercase text-[var(--gold)]">
                      coach
                    </span>
                  )}
                </span>
              ))}
            </div>
          </div>
        </div>

        <p className="mt-2 text-xs text-[var(--muted)]">
          {isCoach
            ? "You're the coach — your view is shared. Pick a tool and draw to point things out."
            : "Use the Move tool to look around, or Follow the coach. Drawings from everyone sync live."}
        </p>
      </div>
    </div>
  );
}
