import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { questProgress } from "@/lib/db/schema";
import { progressSchema } from "@/lib/validation";
import { rateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const rows = await db.query.questProgress.findMany({
    where: eq(questProgress.userId, session.user.id),
    columns: { questId: true },
  });
  return NextResponse.json(
    { completed: rows.map((r) => r.questId) },
    { headers: { "Cache-Control": "no-store, private" } },
  );
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!rateLimit(`progress:${session.user.id}`, 120, 60_000).ok) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const parsed = progressSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const { questId, completed } = parsed.data;
  const userId = session.user.id;

  if (completed) {
    await db
      .insert(questProgress)
      .values({ userId, questId })
      .onConflictDoNothing();
  } else {
    await db
      .delete(questProgress)
      .where(
        and(
          eq(questProgress.userId, userId),
          eq(questProgress.questId, questId),
        ),
      );
  }

  return NextResponse.json({ ok: true, questId, completed });
}
