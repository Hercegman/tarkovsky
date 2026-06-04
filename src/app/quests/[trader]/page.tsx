import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { getTraders, getTrader, getQuestsByTrader } from "@/lib/data";

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

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <Link
        href="/quests"
        className="text-sm text-[var(--muted)] hover:text-[var(--gold)]"
      >
        ← All quests
      </Link>
      <h1 className="mt-2 text-2xl font-bold text-[var(--foreground)]">
        {t.name}
      </h1>
      {t.blurb && <p className="mt-1 text-sm text-[var(--muted)]">{t.blurb}</p>}

      {quests.length === 0 ? (
        <p className="mt-8 text-sm text-[var(--muted)]">
          No quests loaded for this trader yet.
        </p>
      ) : (
        <ol className="mt-6 space-y-2">
          {quests.map((q, i) => (
            <li key={q.id}>
              <Link
                href={`/quest/${q.id}`}
                className="flex items-center gap-3 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-4 py-3 transition-colors hover:border-[var(--gold-dim)]"
              >
                <span className="w-6 text-right font-mono text-xs text-[var(--muted)]">
                  {q.questNumber ?? i + 1}
                </span>
                <span className="flex-1 font-medium">{q.title}</span>
                {q.requiredLevel && (
                  <span className="text-xs text-[var(--muted)]">
                    Lvl {q.requiredLevel}
                  </span>
                )}
                {q.kappaRequired && (
                  <span className="rounded bg-[var(--brown)]/40 px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-[var(--gold-hi)]">
                    Kappa
                  </span>
                )}
              </Link>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
