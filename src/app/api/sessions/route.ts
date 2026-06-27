import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getMap } from "@/lib/data";
import { createSessionSchema } from "@/lib/validation";
import { rateLimit, clientIp } from "@/lib/rate-limit";
import { liveblocks, generateSessionCode, normalizeCode } from "@/lib/liveblocks";

export const runtime = "nodejs";

// Create a session: only logged-in users can host (the host is the "coach").
export async function POST(req: Request) {
  const ip = clientIp(req.headers);
  if (!rateLimit(`session-create:${ip}`, 10, 60_000).ok) {
    return NextResponse.json(
      { error: "Too many sessions — please wait a minute." },
      { status: 429 },
    );
  }

  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json(
      { error: "You must be logged in to create a session." },
      { status: 401 },
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = createSessionSchema.safeParse(body);
  if (!parsed.success) {
    const msg = parsed.error.issues[0]?.message ?? "Invalid input";
    return NextResponse.json({ error: msg }, { status: 400 });
  }

  // Only allow real maps we ship.
  const map = await getMap(parsed.data.mapId);
  if (!map) {
    return NextResponse.json({ error: "Unknown map." }, { status: 400 });
  }

  const lb = liveblocks();
  const metadata = {
    mapId: map.id,
    creatorId: session.user.id,
    createdAt: new Date().toISOString(),
  };

  // Generate a unique code; retry the rare collision.
  for (let attempt = 0; attempt < 5; attempt++) {
    const code = generateSessionCode();
    try {
      await lb.createRoom(code, { defaultAccesses: [], metadata });
      return NextResponse.json({ code });
    } catch (err) {
      // 409 = room id already taken → try another code.
      const status = (err as { status?: number })?.status;
      if (status === 409) continue;
      console.error("createRoom failed", err);
      return NextResponse.json(
        { error: "Could not create the session right now." },
        { status: 502 },
      );
    }
  }

  return NextResponse.json(
    { error: "Could not allocate a session code, please retry." },
    { status: 503 },
  );
}

// Validate a code (used by the Join screen) → returns the map it points to.
export async function GET(req: Request) {
  const code = normalizeCode(new URL(req.url).searchParams.get("code") ?? "");
  if (!code) {
    return NextResponse.json({ error: "Missing code." }, { status: 400 });
  }
  try {
    const room = await liveblocks().getRoom(code);
    const mapId = room.metadata?.mapId;
    return NextResponse.json({
      code,
      mapId: typeof mapId === "string" ? mapId : null,
    });
  } catch {
    return NextResponse.json({ error: "Session not found." }, { status: 404 });
  }
}
