import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { getTraders } from "@/lib/data";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const avatar = (body as { avatar?: unknown }).avatar;

  // Allow clearing, or any trader id as the icon.
  let value: string | null = null;
  if (avatar !== null && avatar !== undefined) {
    if (typeof avatar !== "string") {
      return NextResponse.json({ error: "Invalid avatar" }, { status: 400 });
    }
    const allowed = new Set((await getTraders()).map((t) => t.id));
    if (!allowed.has(avatar)) {
      return NextResponse.json({ error: "Unknown avatar" }, { status: 400 });
    }
    value = avatar;
  }

  await db.update(users).set({ avatar: value }).where(eq(users.id, session.user.id));
  return NextResponse.json({ ok: true, avatar: value });
}
