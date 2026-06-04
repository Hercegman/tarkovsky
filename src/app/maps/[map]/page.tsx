import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { getMaps, getMap, getQuestsByMap } from "@/lib/data";
import { MapView, type MapMarkerData } from "@/components/map-view";

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
  const m = await getMap(map);
  if (!m) notFound();

  const quests = await getQuestsByMap(m.id);
  const markers: MapMarkerData[] = quests.flatMap((q) =>
    q.markers
      .filter((mk) => mk.map === m.id)
      .map((mk) => ({
        x: mk.x,
        y: mk.y,
        label: mk.label,
        questId: q.id,
        questTitle: q.title,
      })),
  );

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <Link href="/maps" className="text-sm text-[var(--muted)] hover:text-[var(--gold)]">
        ← All maps
      </Link>
      <h1 className="mt-2 mb-6 text-2xl font-bold text-[var(--foreground)]">
        {m.name}
      </h1>

      <div className="grid gap-6 lg:grid-cols-[1fr_280px]">
        <MapView map={m} markers={markers} />

        <aside>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-[var(--muted)]">
            Quests here ({quests.length})
          </h2>
          <ul className="max-h-[600px] space-y-1 overflow-auto rounded-lg border border-[var(--border)] bg-[var(--surface)] p-2">
            {quests.map((q) => (
              <li key={q.id}>
                <Link
                  href={`/quest/${q.id}`}
                  className="block rounded px-3 py-2 text-sm transition-colors hover:bg-[var(--surface-2)] hover:text-[var(--gold)]"
                >
                  {q.title}
                </Link>
              </li>
            ))}
            {quests.length === 0 && (
              <li className="px-3 py-2 text-sm text-[var(--muted)]">
                No quests mapped here yet.
              </li>
            )}
          </ul>
        </aside>
      </div>
    </div>
  );
}
