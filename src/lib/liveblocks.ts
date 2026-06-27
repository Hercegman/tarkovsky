import "server-only";
import { Liveblocks } from "@liveblocks/node";
import type { Role } from "@/liveblocks.config";

// Server-side Liveblocks client. The secret key is runtime-only (never bundled
// to the client, never committed). See [[Session Maps]] / [[Deployment]].
let _client: Liveblocks | null = null;

export function liveblocks(): Liveblocks {
  if (!_client) {
    const secret = process.env.LIVEBLOCKS_SECRET_KEY;
    if (!secret) throw new Error("LIVEBLOCKS_SECRET_KEY is not set");
    _client = new Liveblocks({ secret });
  }
  return _client;
}

// Unambiguous code charset — no 0/O/1/I/L so codes are easy to read out loud.
const CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
const CODE_LENGTH = 6;

/** Generate a short, shareable, hard-to-confuse session code. */
export function generateSessionCode(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(CODE_LENGTH));
  let code = "";
  for (const b of bytes) code += CODE_ALPHABET[b % CODE_ALPHABET.length];
  return code;
}

/** Normalize user-typed codes (case-insensitive, trims spaces). */
export function normalizeCode(raw: string): string {
  return raw.trim().toUpperCase().replace(/\s+/g, "");
}

export const COACH_COLOR = "#e3c170"; // matches --gold; the coach is always gold

// Distinct, readable cursor colors for players (coach uses COACH_COLOR).
const PLAYER_COLORS = [
  "#5eb1ff",
  "#7bdc8f",
  "#ff8f6b",
  "#c89bff",
  "#ff6bd0",
  "#4fd6c8",
  "#ffd24f",
];

/** Stable color for a user, derived from their id (coach overrides to gold). */
export function userColor(id: string, role: Role): string {
  if (role === "coach") return COACH_COLOR;
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) | 0;
  return PLAYER_COLORS[Math.abs(hash) % PLAYER_COLORS.length];
}
