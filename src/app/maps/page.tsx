import type { Metadata } from "next";
import Link from "next/link";
import { getMaps, getQuests } from "@/lib/data";
import { Reveal, RevealGroup, RevealItem } from "@/components/ui/reveal";
import { AnimatedCard } from "@/components/ui/animated-card";

export const metadata: Metadata = {
  title: "Maps",
  description: "Interactive Escape from Tarkov maps with quest objective markers.",
};

export default async function MapsPage() {
  const [maps, quests] = await Promise.all([getMaps(), getQuests()]);
  const counts: Record<string, number> = {};
  for (const q of quests) for (const m of q.maps) counts[m] = (counts[m] ?? 0) + 1;

  return (
    <div className="radial-glow min-h-full">
      <div className="mx-auto max-w-5xl px-4 py-10">
        <Reveal>
          <h1 className="mb-1 text-3xl font-bold tracking-tight">
            <span className="text-gradient">Maps</span>
          </h1>
          <p className="mb-8 text-sm text-[var(--muted)]">
            Interactive maps with extract, spawn and quest markers. Pick a location.
          </p>
        </Reveal>
        <RevealGroup className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {maps.map((m) => (
            <RevealItem key={m.id}>
              <Link href={`/maps/${m.id}`}>
                <AnimatedCard className="flex items-center justify-between px-5 py-5">
                  <span className="font-medium text-[var(--foreground)]">
                    {m.name}
                  </span>
                  <span className="text-xs text-[var(--muted)]">
                    {counts[m.id] ?? 0} quests
                  </span>
                </AnimatedCard>
              </Link>
            </RevealItem>
          ))}
        </RevealGroup>
      </div>
    </div>
  );
}
