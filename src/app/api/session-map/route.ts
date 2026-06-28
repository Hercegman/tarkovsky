import { NextResponse } from "next/server";
import { getMap, getMapData } from "@/lib/data";

export const runtime = "nodejs";

// Public map data, fetched by the session board when the host switches maps live.
export async function GET(req: Request) {
  const id = new URL(req.url).searchParams.get("id") ?? "";
  if (!/^[a-z0-9-]+$/.test(id)) {
    return NextResponse.json({ error: "Invalid map id" }, { status: 400 });
  }
  const meta = await getMap(id);
  if (!meta) return NextResponse.json({ error: "Unknown map" }, { status: 404 });
  const data = await getMapData(id);
  if (!data) return NextResponse.json({ error: "Map data not loaded" }, { status: 404 });
  return NextResponse.json(data);
}
