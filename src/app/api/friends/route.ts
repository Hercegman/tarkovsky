import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limit";
import {
  getFriendData,
  requestFriend,
  respondToRequest,
  removeFriend,
} from "@/lib/friends";

export const runtime = "nodejs";

const usernameSchema = z
  .string()
  .trim()
  .min(1)
  .max(24)
  .regex(/^[a-zA-Z0-9_]+$/);

async function uid() {
  const session = await auth();
  return session?.user?.id ?? null;
}

export async function GET() {
  const id = await uid();
  if (!id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const data = await getFriendData(id);
  return NextResponse.json(data, {
    headers: { "Cache-Control": "no-store, private" },
  });
}

// Send a friend request.
export async function POST(req: Request) {
  const id = await uid();
  if (!id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!rateLimit(`friends:${id}`, 30, 60_000).ok) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }
  const parsed = usernameSchema.safeParse(
    (await req.json().catch(() => ({})))?.username,
  );
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid username" }, { status: 400 });
  }
  const result = await requestFriend(id, parsed.data);
  return NextResponse.json(result, { status: result.ok ? 200 : 409 });
}

// Accept or decline an incoming request.
export async function PATCH(req: Request) {
  const id = await uid();
  if (!id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const parsed = usernameSchema.safeParse(body?.username);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid username" }, { status: 400 });
  }
  await respondToRequest(id, parsed.data, Boolean(body?.accept));
  return NextResponse.json({ ok: true });
}

// Remove a friend or cancel a request.
export async function DELETE(req: Request) {
  const id = await uid();
  if (!id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const parsed = usernameSchema.safeParse(body?.username);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid username" }, { status: 400 });
  }
  await removeFriend(id, parsed.data);
  return NextResponse.json({ ok: true });
}
