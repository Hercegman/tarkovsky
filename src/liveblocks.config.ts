// Liveblocks types for the Session Maps coaching whiteboard.
// Global augmentation pattern (Liveblocks v2/v3): declaring the `Liveblocks`
// interface makes every hook (useStorage, useOthers, useMutation, …) strongly
// typed without per-room context factories.
//
// Coordinates are stored in Leaflet CRS.Simple space as [lat, lng] = [y, x]
// (the same order the existing maps use), so drawings stay anchored to the
// terrain through everyone's independent pan/zoom — see [[Session Maps]].
import type { LiveList } from "@liveblocks/client";

export type Tool = "pen" | "arrow" | "x" | "circle";

/** A point in map coordinates: [lat, lng] === [y, x] in CRS.Simple. */
export type Point = [number, number];

export type Stroke = {
  id: string;
  author: string; // UserMeta id of whoever drew it (only they can erase/clear it)
  tool: Tool;
  color: string;
  width: number;
  points: Point[];
};

export type Viewport = {
  center: Point;
  zoom: number;
};

export type Role = "coach" | "player";

declare global {
  interface Liveblocks {
    // Live, per-user ephemeral state.
    Presence: {
      cursor: Point | null;
      viewport: Viewport | null;
      draft: Stroke | null;
      color: string; // the user's currently selected color (claimed exclusively)
    };

    // Shared document — committed strokes + the live map everyone is looking at.
    Storage: {
      strokes: LiveList<Stroke>;
      activeMapId: string;
    };

    // Server-assigned identity from the auth endpoint (trusted; clients can't forge).
    UserMeta: {
      id: string;
      info: {
        name: string;
        color: string;
        role: Role;
      };
    };
  }
}

export {};
