"use client";

import { useCallback, useEffect, useRef } from "react";
import type { Map as LeafletMap, LeafletMouseEvent, Point as LPoint } from "leaflet";
import {
  useStorage,
  useOthers,
  useUpdateMyPresence,
  useMutation,
} from "@liveblocks/react/suspense";
import type { Stroke, Point } from "@/liveblocks.config";
import type { BoardTool } from "./session-toolbar";

const ERASE_THRESHOLD = 12; // px hit radius for the eraser

function drawArrow(
  ctx: CanvasRenderingContext2D,
  from: LPoint,
  to: LPoint,
  color: string,
  width: number,
) {
  const head = Math.max(10, width * 2.5);
  const angle = Math.atan2(to.y - from.y, to.x - from.x);
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = width;
  ctx.beginPath();
  ctx.moveTo(from.x, from.y);
  ctx.lineTo(to.x, to.y);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(to.x, to.y);
  ctx.lineTo(
    to.x - head * Math.cos(angle - Math.PI / 6),
    to.y - head * Math.sin(angle - Math.PI / 6),
  );
  ctx.lineTo(
    to.x - head * Math.cos(angle + Math.PI / 6),
    to.y - head * Math.sin(angle + Math.PI / 6),
  );
  ctx.closePath();
  ctx.fill();
}

function drawCursor(
  ctx: CanvasRenderingContext2D,
  pt: LPoint,
  color: string,
  name: string,
  isCoach: boolean,
) {
  // Pointer dot
  ctx.beginPath();
  ctx.arc(pt.x, pt.y, 5, 0, Math.PI * 2);
  ctx.fillStyle = color;
  ctx.fill();
  ctx.lineWidth = 1.5;
  ctx.strokeStyle = "rgba(0,0,0,0.5)";
  ctx.stroke();
  // Name label
  const label = isCoach ? `${name} · coach` : name;
  ctx.font = "12px Inter, system-ui, sans-serif";
  const w = ctx.measureText(label).width;
  ctx.fillStyle = "rgba(0,0,0,0.65)";
  ctx.fillRect(pt.x + 9, pt.y - 8, w + 8, 16);
  ctx.fillStyle = color;
  ctx.fillText(label, pt.x + 13, pt.y + 4);
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
  const canvasRef = useRef<HTMLCanvasElement>(null);
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

  const drawing = useRef(false);
  const erasing = useRef(false);
  const current = useRef<Stroke | null>(null);
  const rafRef = useRef<number | null>(null);

  const toPx = useCallback(
    (p: Point): LPoint => map.latLngToContainerPoint([p[0], p[1]]),
    [map],
  );

  const eventToLatLng = useCallback(
    (clientX: number, clientY: number): Point => {
      const rect = map.getContainer().getBoundingClientRect();
      const ll = map.containerPointToLatLng([
        clientX - rect.left,
        clientY - rect.top,
      ]);
      return [ll.lat, ll.lng];
    },
    [map],
  );

  const render = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const drawStroke = (s: Stroke) => {
      if (!s.points.length) return;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      if (s.tool === "arrow" && s.points.length >= 2) {
        drawArrow(ctx, toPx(s.points[0]), toPx(s.points[s.points.length - 1]), s.color, s.width);
        return;
      }
      ctx.strokeStyle = s.color;
      ctx.lineWidth = s.width;
      ctx.beginPath();
      s.points.forEach((p, i) => {
        const pt = toPx(p);
        if (i === 0) ctx.moveTo(pt.x, pt.y);
        else ctx.lineTo(pt.x, pt.y);
      });
      ctx.stroke();
    };

    for (const s of strokes ?? []) drawStroke(s);
    for (const o of others) if (o.presence.draft) drawStroke(o.presence.draft);
    if (current.current) drawStroke(current.current);

    for (const o of others) {
      const c = o.presence.cursor;
      if (c) drawCursor(ctx, toPx(c), o.info.color, o.info.name, o.info.role === "coach");
    }
  }, [strokes, others, toPx]);

  const scheduleRender = useCallback(() => {
    if (rafRef.current != null) return;
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = null;
      render();
    });
  }, [render]);

  const resize = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = map.getContainer().getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.round(rect.width * dpr);
    canvas.height = Math.round(rect.height * dpr);
    canvas.style.width = `${rect.width}px`;
    canvas.style.height = `${rect.height}px`;
    const ctx = canvas.getContext("2d");
    if (ctx) ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    render();
  }, [map, render]);

  // Reproject on every pan/zoom + keep the canvas sized to the map.
  useEffect(() => {
    resize();
    map.on("move zoom viewreset zoomend moveend", scheduleRender);
    map.on("resize", resize);
    window.addEventListener("resize", resize);
    return () => {
      map.off("move zoom viewreset zoomend moveend", scheduleRender);
      map.off("resize", resize);
      window.removeEventListener("resize", resize);
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    };
  }, [map, scheduleRender, resize]);

  // Redraw whenever shared data changes.
  useEffect(() => {
    render();
  }, [render]);

  // Broadcast the cursor from the map itself (covers pan mode, where the canvas
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

  const eraseAt = useCallback(
    (ll: Point) => {
      const target = toPx(ll);
      const list = strokes ?? [];
      for (let i = list.length - 1; i >= 0; i--) {
        const s = list[i];
        for (const p of s.points) {
          const pt = toPx(p);
          if (Math.hypot(pt.x - target.x, pt.y - target.y) <= ERASE_THRESHOLD + s.width) {
            eraseStroke(s.id);
            return;
          }
        }
      }
    },
    [strokes, toPx, eraseStroke],
  );

  const onPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (tool === "pan") return;
    canvasRef.current?.setPointerCapture(e.pointerId);
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
    updateMyPresence({ draft: current.current, cursor: ll });
    render();
  };

  const onPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const ll = eventToLatLng(e.clientX, e.clientY);
    updateMyPresence({ cursor: ll });
    if (tool === "eraser") {
      if (erasing.current) eraseAt(ll);
      return;
    }
    if (!drawing.current || !current.current) return;
    const next =
      current.current.tool === "arrow"
        ? [current.current.points[0], ll]
        : [...current.current.points, ll];
    current.current = { ...current.current, points: next };
    updateMyPresence({ draft: current.current });
    render();
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
    updateMyPresence({ draft: null });
    if (s.points.length >= 2) commitStroke(s);
    render();
  };

  return (
    <canvas
      ref={canvasRef}
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
