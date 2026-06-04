import { NextResponse } from "next/server";
import { getQuest } from "@/lib/data";

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;
  const quest = await getQuest(id);
  if (!quest) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json(quest, {
    headers: { "Cache-Control": "public, max-age=3600" },
  });
}
