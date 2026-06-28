"use client";

import { useEffect, useRef } from "react";
import {
  layerGroup,
  polyline,
  polygon,
  marker,
  divIcon,
  type LayerGroup,
  type Marker,
  type Layer,
  type Map as LeafletMap,
  type LatLngExpression,
  type LeafletMouseEvent,
} from "leaflet";
import {
  useSelf,
  useStorage,
  useOthers,
  useUpdateMyPresence,
  useMutation,
} from "@liveblocks/react/suspense";
import type { Stroke, Point } from "@/liveblocks.config";
import type { BoardTool } from "./session-toolbar";

const ERASE_THRESHOLD = 12; // px hit radius for the eraser
const CURSOR_EASE = 0.3; // 0..1 — higher snaps faster, lower trails more

function escapeHtml(s: string): string {
  return s.replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!,
  );
}

// Build the Leaflet layer(s) for one stroke. Leaflet keeps them registered to
// the map through any zoom/pan, so drawings never drift or duplicate.
function strokeLayers(map: LeafletMap, s: Stroke): Layer[] {
  if (!s.points.length) return [];
  const a = s.points[0];
  const b = s.points[s.points.length - 1];
  const base = { color: s.color, weight: s.width, interactive: false } as const;

  if (s.tool === "arrow" && s.points.length >= 2) {
    const shaft = polyline([a, b] as LatLngExpression[], { ...base, opacity: 0.95 });
    const p1 = map.latLngToContainerPoint(a);
    const p2 = map.latLngToContainerPoint(b);
    const ang = Math.atan2(p2.y - p1.y, p2.x - p1.x);
    const head = Math.max(10, s.width * 3);
    const left = map.containerPointToLatLng([
      p2.x - head * Math.cos(ang - Math.PI / 7),
      p2.y - head * Math.sin(ang - Math.PI / 7),
    ]);
    const right = map.containerPointToLatLng([
      p2.x - head * Math.cos(ang + Math.PI / 7),
      p2.y - head * Math.sin(ang + Math.PI / 7),
    ]);
    return [
      shaft,
      polygon(
        [b, [left.lat, left.lng], [right.lat, right.lng]] as LatLngExpression[],
        { color: s.color, weight: 1, fillColor: s.color, fillOpacity: 1, interactive: false },
      ),
    ];
  }

  if (s.tool === "x" && s.points.length >= 2) {
    // Two diagonals across the box the user dragged out.
    return [
      polyline([a, b] as LatLngExpression[], base),
      polyline([
        [a[0], b[1]],
        [b[0], a[1]],
      ] as LatLngExpression[], base),
    ];
  }

  if (s.tool === "circle" && s.points.length >= 2) {
    // Paint-style: an ellipse inscribed in the box dragged from a to b.
    const cy = (a[0] + b[0]) / 2;
    const cx = (a[1] + b[1]) / 2;
    const rLat = Math.abs(b[0] - a[0]) / 2;
    const rLng = Math.abs(b[1] - a[1]) / 2;
    const ring: LatLngExpression[] = [];
    const N = 48;
    for (let k = 0; k < N; k++) {
      const t = (2 * Math.PI * k) / N;
      ring.push([cy + rLat * Math.sin(t), cx + rLng * Math.cos(t)]);
    }
    return [polygon(ring, { ...base, fill: false })];
  }

  // pen
  return [
    polyline(s.points as LatLngExpression[], {
      ...base,
      opacity: 0.95,
      lineCap: "round",
      lineJoin: "round",
    }),
  ];
}

function cursorIcon(info: { name: string; color: string; role: string }) {
  const label = info.role === "coach" ? `${info.name} · host` : info.name;
  const html = `<div style="position:relative;pointer-events:none"><span style="position:absolute;left:-5px;top:-5px;width:10px;height:10px;border-radius:50%;background:${info.color};border:1.5px solid rgba(0,0,0,.5)"></span><span style="position:absolute;left:9px;top:-8px;white-space:nowrap;font:600 11px/1.2 Inter,system-ui,sans-serif;color:${info.color};background:rgba(0,0,0,.65);padding:1px 5px;border-radius:4px">${escapeHtml(label)}</span></div>`;
  return divIcon({ className: "", iconSize: [0, 0], html });
}

export function DrawingCanvas({
  map,
  tool,
  color,
  width,
}: {
  map: LeafletMap;
  tool: BoardTool;
  color: string;
  width: number;
}) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const self = useSelf();
  const myId = self.id;
  const amHost = self.info.role === "coach";
  const strokes = useStorage((root) => root.strokes);
  const others = useOthers();
  const updateMyPresence = useUpdateMyPresence();

  const commitStroke = useMutation(({ storage }, s: Stroke) => {
    storage.get("strokes").push(s);
  }, []);

  // You can erase your own strokes; the host can erase anyone's.
  const eraseStroke = useMutation(({ storage, self }, id: string) => {
    const host = self.info.role === "coach";
    const list = storage.get("strokes");
    const idx = list.findIndex(
      (s) => s.id === id && (host || s.author === self.id),
    );
    if (idx >= 0) list.delete(idx);
  }, []);

  const strokeGroupRef = useRef<LayerGroup | null>(null);
  const draftGroupRef = useRef<LayerGroup | null>(null);
  const currentGroupRef = useRef<LayerGroup | null>(null);
  const cursorsRef = useRef<
    Map<number, { marker: Marker; cur: Point; target: Point; color: string }>
  >(new Map());
  const drawing = useRef(false);
  const erasing = useRef(false);
  const current = useRef<Stroke | null>(null);

  // Committed strokes → Leaflet layers. Rebuild on change + on zoomend (so the
  // pixel-sized arrowheads stay crisp; the lines reproject on their own).
  useEffect(() => {
    if (!strokeGroupRef.current) strokeGroupRef.current = layerGroup().addTo(map);
    const group = strokeGroupRef.current;
    const rebuild = () => {
      group.clearLayers();
      for (const s of strokes ?? []) for (const l of strokeLayers(map, s)) l.addTo(group);
    };
    rebuild();
    map.on("zoomend", rebuild);
    return () => {
      map.off("zoomend", rebuild);
    };
  }, [map, strokes]);

  // Peers' in-progress drafts + cursor targets (markers persist & interpolate).
  useEffect(() => {
    if (!draftGroupRef.current) draftGroupRef.current = layerGroup().addTo(map);
    const drafts = draftGroupRef.current;
    drafts.clearLayers();
    const seen = new Set<number>();
    for (const o of others) {
      if (o.presence.draft)
        for (const l of strokeLayers(map, o.presence.draft)) l.addTo(drafts);
      const c = o.presence.cursor;
      if (!c) continue;
      seen.add(o.connectionId);
      const peerColor = o.presence.color || o.info.color;
      const info = { name: o.info.name, color: peerColor, role: o.info.role };
      const entry = cursorsRef.current.get(o.connectionId);
      if (entry) {
        entry.target = c;
        if (entry.color !== peerColor) {
          entry.color = peerColor;
          entry.marker.setIcon(cursorIcon(info));
        }
      } else {
        const m = marker(c as LatLngExpression, {
          icon: cursorIcon(info),
          interactive: false,
          keyboard: false,
          zIndexOffset: 1000,
        }).addTo(map);
        cursorsRef.current.set(o.connectionId, {
          marker: m,
          cur: c,
          target: c,
          color: peerColor,
        });
      }
    }
    // Drop cursors for peers who left or hid their cursor.
    for (const [id, entry] of cursorsRef.current) {
      if (!seen.has(id)) {
        entry.marker.remove();
        cursorsRef.current.delete(id);
      }
    }
  }, [map, others]);

  // Smoothly ease every cursor toward its latest target each animation frame.
  useEffect(() => {
    let raf = 0;
    const tick = () => {
      for (const entry of cursorsRef.current.values()) {
        const dLat = entry.target[0] - entry.cur[0];
        const dLng = entry.target[1] - entry.cur[1];
        if (Math.abs(dLat) < 0.5 && Math.abs(dLng) < 0.5) {
          entry.cur = entry.target;
        } else {
          entry.cur = [entry.cur[0] + dLat * CURSOR_EASE, entry.cur[1] + dLng * CURSOR_EASE];
        }
        entry.marker.setLatLng(entry.cur as LatLngExpression);
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [map]);

  // Clean up all layers on unmount.
  useEffect(() => {
    const cursors = cursorsRef.current;
    return () => {
      strokeGroupRef.current?.remove();
      draftGroupRef.current?.remove();
      currentGroupRef.current?.remove();
      for (const e of cursors.values()) e.marker.remove();
      cursors.clear();
    };
  }, []);

  // Broadcast the cursor from the map itself (covers pan mode, where the overlay
  // lets pointer events through to Leaflet).
  useEffect(() => {
    const onMove = (e: LeafletMouseEvent) =>
      updateMyPresence({ cursor: [e.latlng.lat, e.latlng.lng] });
    const onOut = () => updateMyPresence({ cursor: null });
    map.on("mousemove", onMove);
    map.on("mouseout", onOut);
    return () => {
      map.off("mousemove", onMove);
      map.off("mouseout", onOut);
    };
  }, [map, updateMyPresence]);

  function eventToLatLng(clientX: number, clientY: number): Point {
    const rect = map.getContainer().getBoundingClientRect();
    const ll = map.containerPointToLatLng([clientX - rect.left, clientY - rect.top]);
    return [ll.lat, ll.lng];
  }

  function renderCurrent() {
    if (!currentGroupRef.current) currentGroupRef.current = layerGroup().addTo(map);
    const g = currentGroupRef.current;
    g.clearLayers();
    if (current.current) for (const l of strokeLayers(map, current.current)) l.addTo(g);
  }

  function eraseAt(ll: Point) {
    const target = map.latLngToContainerPoint(ll);
    const list = strokes ?? [];
    for (let i = list.length - 1; i >= 0; i--) {
      const s = list[i];
      if (s.author !== myId && !amHost) continue; // own only, unless host
      for (const p of s.points) {
        const pt = map.latLngToContainerPoint(p);
        if (Math.hypot(pt.x - target.x, pt.y - target.y) <= ERASE_THRESHOLD + s.width) {
          eraseStroke(s.id);
          return;
        }
      }
    }
  }

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (tool === "pan") return;
    overlayRef.current?.setPointerCapture(e.pointerId);
    const ll = eventToLatLng(e.clientX, e.clientY);
    if (tool === "eraser") {
      erasing.current = true;
      eraseAt(ll);
      return;
    }
    drawing.current = true;
    current.current = {
      id: crypto.randomUUID(),
      author: myId,
      tool,
      color,
      width,
      points: [ll],
    };
    renderCurrent();
    updateMyPresence({ draft: current.current, cursor: ll });
  };

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const ll = eventToLatLng(e.clientX, e.clientY);
    updateMyPresence({ cursor: ll });
    if (tool === "eraser") {
      if (erasing.current) eraseAt(ll);
      return;
    }
    if (!drawing.current || !current.current) return;
    // Freehand accumulates points; the 2-point shapes track start → drag end.
    const points =
      current.current.tool === "pen"
        ? [...current.current.points, ll]
        : [current.current.points[0], ll];
    current.current = { ...current.current, points };
    renderCurrent();
    updateMyPresence({ draft: current.current });
  };

  const endStroke = () => {
    if (erasing.current) {
      erasing.current = false;
      return;
    }
    if (!drawing.current || !current.current) return;
    drawing.current = false;
    const s = current.current;
    current.current = null;
    currentGroupRef.current?.clearLayers();
    updateMyPresence({ draft: null });
    if (s.points.length >= 2) commitStroke(s);
  };

  return (
    <div
      ref={overlayRef}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endStroke}
      onPointerCancel={endStroke}
      onPointerLeave={() => updateMyPresence({ cursor: null })}
      className="absolute inset-0 z-[450]"
      style={{
        pointerEvents: tool === "pan" ? "none" : "auto",
        touchAction: "none",
        cursor: tool === "pan" ? "grab" : tool === "eraser" ? "cell" : "crosshair",
      }}
    />
  );
}
