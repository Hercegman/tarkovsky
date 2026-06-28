import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { liveblocksAuthSchema, guestNameSchema } from "@/lib/validation";
import { rateLimit, clientIp } from "@/lib/rate-limit";
import {
  liveblocks,
  normalizeCode,
  userColor,
  SESSION_CAPACITY,
} from "@/lib/liveblocks";
import type { Role } from "@/liveblocks.config";

export const runtime = "nodejs";

// Issues a Liveblocks access token scoped to a single session room.
// Identity & role are decided here on the server (trusted): the room creator is
// the "coach", everyone else is a "player". Logged-in users join as themselves;
// anonymous joiners get a stable guest id + the display name they typed.
export async function POST(req: Request) {
  const ip = clientIp(req.headers);
  if (!rateLimit(`lb-auth:${ip}`, 60, 60_000).ok) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = liveblocksAuthSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const room = normalizeCode(parsed.data.room);

  // Only mint tokens for rooms that actually exist.
  let creatorId: string | null = null;
  try {
    const r = await liveblocks().getRoom(room);
    creatorId = typeof r.metadata?.creatorId === "string" ? r.metadata.creatorId : null;
  } catch {
    return NextResponse.json({ error: "Session not found." }, { status: 403 });
  }

  const authed = await auth();

  let userId: string;
  let name: string;
  let role: Role;

  if (authed?.user?.id) {
    userId = authed.user.id;
    name = authed.user.name || authed.user.email || "User";
    role = creatorId && userId === creatorId ? "coach" : "player";
  } else {
    // Anonymous joiner: stable guest id (from the client) + typed name.
    const guestId = parsed.data.guestId || crypto.randomUUID();
    userId = `guest:${guestId}`;
    const nameParse = guestNameSchema.safeParse(parsed.data.name ?? "");
    name = nameParse.success ? nameParse.data : "Guest";
    role = "player";
  }

  // Capacity guard (anti-spam). The host is exempt so they can't be locked out
  // of their own room, and an already-connected user (reconnect/extra tab) is
  // always let back in.
  if (userId !== creatorId) {
    try {
      const { data } = await liveblocks().getActiveUsers(room);
      const ids = new Set(data.map((u) => u.id));
      if (!ids.has(userId) && ids.size >= SESSION_CAPACITY) {
        return NextResponse.json({ error: "This session is full." }, { status: 403 });
      }
    } catch {
      /* don't block on a failed presence check */
    }
  }

  const color = userColor(userId, role);

  const lbSession = liveblocks().prepareSession(userId, {
    userInfo: { name, color, role },
  });
  lbSession.allow(room, lbSession.FULL_ACCESS);

  const { status, body: tokenBody } = await lbSession.authorize();
  return new Response(tokenBody, {
    status,
    headers: { "content-type": "application/json" },
  });
}
