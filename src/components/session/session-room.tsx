"use client";

import dynamic from "next/dynamic";
import {
  LiveblocksProvider,
  RoomProvider,
  ClientSideSuspense,
} from "@liveblocks/react/suspense";
import { LiveList } from "@liveblocks/client";
import type { MapData, GameMap } from "@/lib/types";
import type { Stroke } from "@/liveblocks.config";
import { getOrCreateGuestId, getGuestName } from "@/lib/session-client";

// Leaflet touches `window` at import time, so the board (and its leaflet imports)
// must never be evaluated on the server — load it client-only, like the existing
// map components do with dynamic(ssr:false).
const SessionBoard = dynamic(
  () => import("./session-board").then((m) => m.SessionBoard),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-[70vh] items-center justify-center text-sm text-[var(--muted)]">
        Loading map…
      </div>
    ),
  },
);

export function SessionRoom({
  code,
  map,
  maps,
}: {
  code: string;
  map: MapData;
  maps: GameMap[];
}) {
  return (
    <LiveblocksProvider
      throttle={16}
      authEndpoint={async (room) => {
        const res = await fetch("/api/liveblocks-auth", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            room: room ?? code,
            name: getGuestName(),
            guestId: getOrCreateGuestId(),
          }),
        });
        if (!res.ok) throw new Error("Could not authorize this session.");
        return await res.json();
      }}
    >
      <RoomProvider
        id={code}
        initialPresence={{ cursor: null, viewport: null, draft: null, color: "" }}
        initialStorage={{ strokes: new LiveList<Stroke>([]), activeMapId: map.id }}
      >
        <ClientSideSuspense
          fallback={
            <div className="flex h-[70vh] items-center justify-center text-sm text-[var(--muted)]">
              Connecting to session…
            </div>
          }
        >
          {() => <SessionBoard code={code} map={map} maps={maps} />}
        </ClientSideSuspense>
      </RoomProvider>
    </LiveblocksProvider>
  );
}
