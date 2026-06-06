import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { getMaps, getMap, getMapData, getQuestsByMap } from "@/lib/data";
import { MapExplorer, type MapQuest } from "@/components/map-explorer";

export async function generateStaticParams() {
  const maps = await getMaps();
  return maps.map((m) => ({ map: m.id }));
}

export async function generateMetadata(
  props: PageProps<"/maps/[map]">,
): Promise<Metadata> {
  const { map } = await props.params;
  const m = await getMap(map);
  return { title: m ? `${m.name} map` : "Map" };
}

export default async function MapPage(props: PageProps<"/maps/[map]">) {
  const { map } = await props.params;
  const [meta, data, quests] = await Promise.all([
    getMap(map),
    getMapData(map),
    getQuestsByMap(map),
  ]);
  if (!meta) notFound();

  const mapQuests: MapQuest[] = quests.map((q) => ({
    id: q.id,
    title: q.title,
    markers: q.markers
      .filter((mk) => mk.map === map)
      .map((mk) => ({ x: mk.x, y: mk.y, label: mk.label })),
  }));

  return (
    <div className="radial-glow min-h-full">
      <div className="mx-auto max-w-[1600px] px-4 py-8">
        <Link
          href="/maps"
          className="text-sm text-[var(--muted)] transition-colors hover:text-[var(--gold)]"
        >
          ← All maps
        </Link>
        <h1 className="mt-2 mb-1 text-2xl font-bold">
          <span className="text-gradient">{meta.name}</span>
        </h1>
        <p className="mb-6 text-sm text-[var(--muted)]">
          Quests on the left, layer toggles on the right. Hit fullscreen for a closer look.
        </p>

        {data ? (
          <MapExplorer map={data} quests={mapQuests} />
        ) : (
          <div className="flex h-[400px] items-center justify-center rounded-xl border border-dashed border-[var(--border)] bg-[var(--surface)] text-sm text-[var(--muted)]">
            Map data not loaded. Run{" "}
            <code className="mx-1 text-[var(--gold)]">npm run ingest:maps</code>.
          </div>
        )}
      </div>
    </div>
  );
}
