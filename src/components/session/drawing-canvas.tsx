"use client";

import { useEffect, useRef } from "react";
import {
  layerGroup,
  polyline,
  polygon,
  marker,
  divIcon,
  type LayerGroup,
  type Polyline,
  type Layer,
  type Map as LeafletMap,
  type LatLngExpression,
  type LeafletMouseEvent,
} from "leaflet";
import {
  useStorage,
  useOthers,
  useUpdateMyPresence,
  useMutation,
} from "@liveblocks/react/suspense";
import type { Stroke, Point } from "@/liveblocks.config";
import type { BoardTool } from "./session-toolbar";

const ERASE_THRESHOLD = 12; // px hit radius for the eraser

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
  if (s.tool === "arrow" && s.points.length >= 2) {
    const a = s.points[0];
    const b = s.points[s.points.length - 1];
    const shaft = polyline([a, b] as LatLngExpression[], {
      color: s.color,
      weight: s.width,
      opacity: 0.95,
      interactive: false,
    });
    // Pixel-sized arrowhead at the current zoom (rebuilt on zoomend).
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
    const headPoly = polygon(
      [b, [left.lat, left.lng], [right.lat, right.lng]] as LatLngExpression[],
      { color: s.color, weight: 1, fillColor: s.color, fillOpacity: 1, interactive: false },
    );
    return [shaft, headPoly];
  }
  return [
    polyline(s.points as LatLngExpression[], {
      color: s.color,
      weight: s.width,
      opacity: 0.95,
      lineCap: "round",
      lineJoin: "round",
      interactive: false,
    }),
  ];
}

function cursorLayer(p: Point, info: { name: string; color: string; role: string }): Layer {
  const label = info.role === "coach" ? `${info.name} · coach` : info.name;
  const html = `<div style="position:relative;pointer-events:none"><span style="position:absolute;left:-5px;top:-5px;width:10px;height:10px;border-radius:50%;background:${info.color};border:1.5px solid rgba(0,0,0,.5)"></span><span style="position:absolute;left:9px;top:-8px;white-space:nowrap;font:600 11px/1.2 Inter,system-ui,sans-serif;color:${info.color};background:rgba(0,0,0,.65);padding:1px 5px;border-radius:4px">${escapeHtml(label)}</span></div>`;
  return marker(p as LatLngExpression, {
    icon: divIcon({ className: "", iconSize: [0, 0], html }),
    interactive: false,
    keyboard: false,
    zIndexOffset: 1000,
  });
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
  const strokes = useStorage((root) => root.strokes);
  const others = useOthers();
  const updateMyPresence = useUpdateMyPresence();

  const commitStroke = useMutation(({ storage }, s: Stroke) => {
    storage.get("strokes").push(s);
  }, []);

  const eraseStroke = useMutation(({ storage }, id: string) => {
    const list = storage.get("strokes");
    const idx = list.findIndex((s) => s.id === id);
    if (idx >= 0) list.delete(idx);
  }, []);

  const strokeGroupRef = useRef<LayerGroup | null>(null);
  const peerGroupRef = useRef<LayerGroup | null>(null);
  const currentLayerRef = useRef<Polyline | null>(null);
  const drawing = useRef(false);
  const erasing = useRef(false);
  const current = useRef<Stroke | null>(null);

  // Committed strokes → Leaflet layers. Rebuild when they change, and on zoomend
  // so the pixel-sized arrowheads stay crisp (the lines reproject on their own).
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

  // Peers' in-progress drafts + live cursors.
  useEffect(() => {
    if (!peerGroupRef.current) peerGroupRef.current = layerGroup().addTo(map);
    const group = peerGroupRef.current;
    group.clearLayers();
    for (const o of others) {
      if (o.presence.draft)
        for (const l of strokeLayers(map, o.presence.draft)) l.addTo(group);
      if (o.presence.cursor) cursorLayer(o.presence.cursor, o.info).addTo(group);
    }
  }, [map, others]);

  // Clean up all layers on unmount.
  useEffect(
    () => () => {
      strokeGroupRef.current?.remove();
      peerGroupRef.current?.remove();
      currentLayerRef.current?.remove();
    },
    [],
  );

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

  function eraseAt(ll: Point) {
    const target = map.latLngToContainerPoint(ll);
    const list = strokes ?? [];
    for (let i = list.length - 1; i >= 0; i--) {
      const s = list[i];
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
      tool: tool === "arrow" ? "arrow" : "pen",
      color,
      width,
      points: [ll],
    };
    // Live local preview (a plain polyline; the arrowhead lands on commit).
    currentLayerRef.current = polyline([ll] as LatLngExpression[], {
      color,
      weight: width,
      opacity: 0.95,
      lineCap: "round",
      lineJoin: "round",
      interactive: false,
    }).addTo(map);
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
    const points =
      current.current.tool === "arrow"
        ? [current.current.points[0], ll]
        : [...current.current.points, ll];
    current.current = { ...current.current, points };
    currentLayerRef.current?.setLatLngs(points as LatLngExpression[]);
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
    currentLayerRef.current?.remove();
    currentLayerRef.current = null;
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
