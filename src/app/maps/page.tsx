import type { Metadata } from "next";
import Link from "next/link";
import { getMaps, getQuests } from "@/lib/data";

export const metadata: Metadata = {
  title: "Maps",
  description: "Interactive Escape from Tarkov maps with quest objective markers.",
};

export default async function MapsPage() {
  const [maps, quests] = await Promise.all([getMaps(), getQuests()]);
  const counts: Record<string, number> = {};
  for (const q of quests) for (const m of q.maps) counts[m] = (counts[m] ?? 0) + 1;

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <h1 className="mb-1 text-2xl font-bold text-[var(--foreground)]">Maps</h1>
      <p className="mb-8 text-sm text-[var(--muted)]">
        Interactive maps with quest objective markers. Pick a location.
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        {maps.map((m) => (
          <Link
            key={m.id}
            href={`/maps/${m.id}`}
            className="flex items-center justify-between rounded-lg border border-[var(--border)] bg-[var(--surface)] px-4 py-4 transition-colors hover:border-[var(--gold-dim)]"
          >
            <span className="font-medium text-[var(--foreground)]">{m.name}</span>
            <span className="text-xs text-[var(--muted)]">
              {counts[m.id] ?? 0} quests
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
