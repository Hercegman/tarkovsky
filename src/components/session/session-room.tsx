"use client";

import {
  LiveblocksProvider,
  RoomProvider,
  ClientSideSuspense,
} from "@liveblocks/react/suspense";
import { LiveList } from "@liveblocks/client";
import type { MapData } from "@/lib/types";
import type { Stroke } from "@/liveblocks.config";
import { getOrCreateGuestId, getGuestName } from "@/lib/session-client";
import { SessionBoard } from "./session-board";

export function SessionRoom({ code, map }: { code: string; map: MapData }) {
  return (
    <LiveblocksProvider
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
        initialPresence={{ cursor: null, viewport: null, draft: null }}
        initialStorage={{ strokes: new LiveList<Stroke>([]) }}
      >
        <ClientSideSuspense
          fallback={
            <div className="flex h-[70vh] items-center justify-center text-sm text-[var(--muted)]">
              Connecting to session…
            </div>
          }
        >
          {() => <SessionBoard code={code} map={map} />}
        </ClientSideSuspense>
      </RoomProvider>
    </LiveblocksProvider>
  );
}
