import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";

export const runtime = "nodejs";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const u = await db.query.users.findFirst({
    where: eq(users.id, session.user.id),
    columns: { id: true, username: true, email: true, avatar: true },
  });
  return NextResponse.json(u ?? {}, {
    headers: { "Cache-Control": "no-store, private" },
  });
}
