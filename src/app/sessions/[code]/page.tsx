import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { liveblocks, normalizeCode } from "@/lib/liveblocks";
import { getMapData } from "@/lib/data";
import { SessionRoom } from "@/components/session/session-room";

export const metadata: Metadata = {
  title: "Live session",
  robots: { index: false }, // ephemeral, code-gated rooms shouldn't be indexed
};

export default async function SessionRoomPage(
  props: PageProps<"/sessions/[code]">,
) {
  const { code: raw } = await props.params;
  const code = normalizeCode(raw);

  let mapId: string | null = null;
  try {
    const room = await liveblocks().getRoom(code);
    mapId = typeof room.metadata?.mapId === "string" ? room.metadata.mapId : null;
  } catch {
    notFound();
  }
  if (!mapId) notFound();

  const map = await getMapData(mapId);
  if (!map) notFound();

  return <SessionRoom code={code} map={map} />;
}
