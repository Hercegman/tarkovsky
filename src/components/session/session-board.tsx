"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { MapContainer, ImageOverlay, useMap } from "react-leaflet";
import { CRS, type Map as LeafletMap, type LatLngBoundsExpression } from "leaflet";
import "leaflet/dist/leaflet.css";
import {
  useSelf,
  useOthers,
  useUpdateMyPresence,
  useMutation,
} from "@liveblocks/react/suspense";
import type { MapData } from "@/lib/types";
import { DrawingCanvas } from "./drawing-canvas";
import { SessionToolbar, type BoardTool } from "./session-toolbar";

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

  const bounds: LatLngBoundsExpression = [
    [0, 0],
    [map.height, map.width],
  ];

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
        {/* Top bar */}
        <div className="mb-3 flex flex-wrap items-center gap-3">
          <Link
            href="/sessions"
            className="text-sm text-[var(--muted)] transition-colors hover:text-[var(--gold)]"
          >
            ← Leave
          </Link>
          <h1 className="text-lg font-bold">
            <span className="text-gradient">{map.name}</span>
          </h1>

          <button
            type="button"
            onClick={copyCode}
            title="Copy the session code"
            className="rounded-lg border border-[var(--gold-dim)] bg-[var(--surface)] px-3 py-1.5 font-mono text-sm tracking-widest text-[var(--gold)] transition-colors hover:bg-[var(--gold)] hover:text-[var(--background)]"
          >
            {copied ? "Copied!" : `Code: ${code}`}
          </button>

          {!isCoach && (
            <button
              type="button"
              onClick={() => setFollowing((f) => !f)}
              disabled={!coach}
              title={coach ? "Snap to the coach's view" : "Waiting for the coach"}
              className={`rounded-lg border px-3 py-1.5 text-sm transition-colors disabled:opacity-40 ${
                following
                  ? "border-[var(--gold)] bg-[var(--gold)]/20 text-[var(--gold)]"
                  : "border-[var(--border)] hover:bg-[var(--surface-2)]"
              }`}
            >
              {following ? "● Following coach" : "Follow coach"}
            </button>
          )}

          {/* Participants */}
          <div className="ml-auto flex items-center gap-2">
            {participants.map((p) => (
              <span
                key={p.id}
                className="flex items-center gap-1.5 rounded-full border border-[var(--border)] bg-[var(--surface)] px-2.5 py-1 text-xs"
                title={p.role === "coach" ? "Coach" : "Player"}
              >
                <span
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: p.color }}
                />
                {p.name}
                {p.role === "coach" && (
                  <span className="text-[10px] uppercase text-[var(--gold)]">coach</span>
                )}
              </span>
            ))}
          </div>
        </div>

        {/* The board */}
        <div
          style={{ aspectRatio: `${map.width} / ${map.height}` }}
          className="relative max-h-[82vh] w-full overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--background)]"
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
            attributionControl={false}
            className="h-full w-full bg-[var(--surface)]"
          >
            <MapReady onReady={setLeaflet} />
            {map.image && <ImageOverlay url={map.image} bounds={bounds} />}
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
