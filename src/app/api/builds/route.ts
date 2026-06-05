import { NextResponse } from "next/server";
import { z } from "zod";
import { and, desc, eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { gunBuilds } from "@/lib/db/schema";
import { rateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";

const slug = z.string().regex(/^[a-z0-9-]+$/).max(80);
const saveSchema = z.object({
  name: z.string().trim().min(1).max(40),
  weaponId: slug,
  items: z
    .record(z.string().max(60), slug)
    .refine((o) => Object.keys(o).length <= 30, "Too many slots"),
});

async function uid() {
  const session = await auth();
  return session?.user?.id ?? null;
}

export async function GET() {
  const id = await uid();
  if (!id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const rows = await db.query.gunBuilds.findMany({
    where: eq(gunBuilds.userId, id),
    orderBy: desc(gunBuilds.createdAt),
  });
  return NextResponse.json(
    { builds: rows },
    { headers: { "Cache-Control": "no-store, private" } },
  );
}

export async function POST(req: Request) {
  const id = await uid();
  if (!id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!rateLimit(`builds:${id}`, 40, 60_000).ok) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }
  const parsed = saveSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid build" }, { status: 400 });
  }
  // Cap stored builds per user.
  const existing = await db.query.gunBuilds.findMany({
    where: eq(gunBuilds.userId, id),
    columns: { id: true },
  });
  if (existing.length >= 50) {
    return NextResponse.json({ error: "Build limit reached (50)" }, { status: 409 });
  }
  const [row] = await db
    .insert(gunBuilds)
    .values({ userId: id, name: parsed.data.name, weaponId: parsed.data.weaponId, items: parsed.data.items })
    .returning();
  return NextResponse.json({ ok: true, build: row });
}

export async function DELETE(req: Request) {
  const id = await uid();
  if (!id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const buildId = z.string().max(40).safeParse(body?.id);
  if (!buildId.success) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }
  await db
    .delete(gunBuilds)
    .where(and(eq(gunBuilds.id, buildId.data), eq(gunBuilds.userId, id)));
  return NextResponse.json({ ok: true });
}
