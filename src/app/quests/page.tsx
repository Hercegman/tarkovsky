import type { Metadata } from "next";
import { getQuests, getTraders, getMaps } from "@/lib/data";
import { QuestBrowser, type QuestSummary } from "@/components/quest-browser";

export const metadata: Metadata = {
  title: "Quests",
  description: "Browse and search every Escape from Tarkov quest by trader and map.",
};

export default async function QuestsPage() {
  const [quests, traders, maps] = await Promise.all([
    getQuests(),
    getTraders(),
    getMaps(),
  ]);

  const summaries: QuestSummary[] = quests.map((q) => ({
    id: q.id,
    title: q.title,
    trader: q.trader,
    maps: q.maps,
    requiredLevel: q.requiredLevel,
    kappaRequired: q.kappaRequired,
  }));

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <h1 className="mb-1 text-2xl font-bold text-[var(--foreground)]">Quests</h1>
      <p className="mb-8 text-sm text-[var(--muted)]">
        Search and filter every task. Pick a trader to follow a quest line in order.
      </p>

      {summaries.length === 0 ? (
        <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-8 text-center text-sm text-[var(--muted)]">
          No quests loaded yet. Run{" "}
          <code className="text-[var(--gold)]">npm run ingest</code> to pull quest
          data from the Escape from Tarkov Wiki.
        </div>
      ) : (
        <QuestBrowser quests={summaries} traders={traders} maps={maps} />
      )}
    </div>
  );
}
