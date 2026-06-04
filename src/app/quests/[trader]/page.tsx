import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { getTraders, getTrader, getQuestsByTrader } from "@/lib/data";
import { TraderQuestList, type QuestRow } from "@/components/trader-quest-list";

export async function generateStaticParams() {
  const traders = await getTraders();
  return traders.map((t) => ({ trader: t.id }));
}

export async function generateMetadata(
  props: PageProps<"/quests/[trader]">,
): Promise<Metadata> {
  const { trader } = await props.params;
  const t = await getTrader(trader);
  return { title: t ? `${t.name} quests` : "Trader" };
}

export default async function TraderPage(props: PageProps<"/quests/[trader]">) {
  const { trader } = await props.params;
  const t = await getTrader(trader);
  if (!t) notFound();

  const quests = await getQuestsByTrader(t.id);
  const rows: QuestRow[] = quests.map((q) => ({
    id: q.id,
    title: q.title,
    requiredLevel: q.requiredLevel,
    kappaRequired: q.kappaRequired,
  }));

  return (
    <div className="radial-glow min-h-full">
      <div className="mx-auto max-w-3xl px-4 py-10">
        <Link
          href="/quests"
          className="text-sm text-[var(--muted)] transition-colors hover:text-[var(--gold)]"
        >
          ← All quests
        </Link>
        <h1 className="mt-3 text-3xl font-bold tracking-tight">
          <span className="text-gradient">{t.name}</span>
        </h1>
        {t.blurb && <p className="mt-1 text-sm text-[var(--muted)]">{t.blurb}</p>}
        <p className="mt-1 text-xs uppercase tracking-wider text-[var(--muted)]">
          {quests.length} quests · in unlock order
        </p>

        <div className="mt-6">
          {rows.length === 0 ? (
            <p className="text-sm text-[var(--muted)]">
              No quests loaded for this trader yet.
            </p>
          ) : (
            <TraderQuestList quests={rows} />
          )}
        </div>
      </div>
    </div>
  );
}
