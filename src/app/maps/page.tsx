import type { Metadata } from "next";
import { getMaps, getMapQuestCounts } from "@/lib/data";
import { Reveal, RevealGroup, RevealItem } from "@/components/ui/reveal";
import { MapRevealCard } from "@/components/map-reveal-card";

export const metadata: Metadata = {
  title: "Maps",
  description: "Interactive Escape from Tarkov maps with quest objective markers.",
};

export default async function MapsPage() {
  const [maps, counts] = await Promise.all([getMaps(), getMapQuestCounts()]);

  return (
    <div className="radial-glow min-h-full">
      <div className="mx-auto max-w-5xl px-4 py-10">
        <Reveal>
          <h1 className="mb-1 text-3xl font-bold tracking-tight">
            <span className="text-gradient">Maps</span>
          </h1>
          <p className="mb-8 text-sm text-[var(--muted)]">
            Hover a location to peek at its interactive map. Click to open it.
          </p>
        </Reveal>
        <RevealGroup className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {maps.map((m) => (
            <RevealItem key={m.id}>
              <MapRevealCard id={m.id} name={m.name} count={counts[m.id] ?? 0} />
            </RevealItem>
          ))}
        </RevealGroup>
      </div>
    </div>
  );
}
