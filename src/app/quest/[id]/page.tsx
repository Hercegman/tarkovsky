import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { getQuests, getQuest, getTrader, getMaps } from "@/lib/data";
import { QuestProgressButton } from "@/components/quest-progress-button";

export async function generateStaticParams() {
  const quests = await getQuests();
  return quests.map((q) => ({ id: q.id }));
}

export async function generateMetadata(
  props: PageProps<"/quest/[id]">,
): Promise<Metadata> {
  const { id } = await props.params;
  const quest = await getQuest(id);
  return {
    title: quest?.title ?? "Quest",
    description: quest
      ? `${quest.title}: objectives, rewards and prerequisites.`
      : undefined,
  };
}

export default async function QuestPage(props: PageProps<"/quest/[id]">) {
  const { id } = await props.params;
  const quest = await getQuest(id);
  if (!quest) notFound();

  const [trader, maps] = await Promise.all([
    getTrader(quest.trader),
    getMaps(),
  ]);
  const mapName = Object.fromEntries(maps.map((m) => [m.id, m.name]));

  return (
    <article className="mx-auto max-w-3xl px-4 py-10">
      <div className="mb-6">
        <Link
          href={trader ? `/quests/${trader.id}` : "/quests"}
          className="text-sm text-[var(--muted)] hover:text-[var(--gold)]"
        >
          ← {trader?.name ?? "Quests"}
        </Link>
        <div className="mt-2 flex items-start justify-between gap-4">
          <h1 className="text-3xl font-bold text-[var(--foreground)]">
            {quest.title}
          </h1>
          <QuestProgressButton questId={quest.id} />
        </div>
        <div className="mt-3 flex flex-wrap gap-2 text-xs">
          {trader && (
            <Badge>
              <Link href={`/quests/${trader.id}`} className="hover:text-[var(--gold)]">
                {trader.name}
              </Link>
            </Badge>
          )}
          {quest.requiredLevel && <Badge>Level {quest.requiredLevel}</Badge>}
          {quest.kappaRequired && <Badge accent>Required for Kappa</Badge>}
          {quest.maps.map((m) => (
            <Badge key={m}>
              <Link href={`/maps/${m}`} className="hover:text-[var(--gold)]">
                {mapName[m] ?? m}
              </Link>
            </Badge>
          ))}
        </div>
      </div>

      {quest.objectives.length > 0 && (
        <Section title="Objectives">
          <ul className="space-y-1.5">
            {quest.objectives.map((o, i) => (
              <li key={i} className="flex gap-2 text-sm">
                <span className="text-[var(--gold)]">▸</span>
                <span>{o}</span>
              </li>
            ))}
          </ul>
        </Section>
      )}

      {(quest.prerequisites.length > 0 || quest.leadsTo.length > 0) && (
        <Section title="Quest line">
          <div className="grid gap-4 sm:grid-cols-2">
            <QuestRefList label="Requires" refs={quest.prerequisites} />
            <QuestRefList label="Unlocks" refs={quest.leadsTo} />
          </div>
        </Section>
      )}

      {(quest.rewards.exp || quest.rewards.items.length > 0) && (
        <Section title="Rewards">
          <ul className="space-y-1 text-sm">
            {quest.rewards.exp ? (
              <li>+{quest.rewards.exp.toLocaleString()} EXP</li>
            ) : null}
            {quest.rewards.items.map((it, i) => (
              <li key={i}>
                {it.amount}× {it.name}
              </li>
            ))}
            {quest.rewards.unlocks.map((u, i) => (
              <li key={i}>{u}</li>
            ))}
          </ul>
        </Section>
      )}

      <p className="mt-10 border-t border-[var(--border)] pt-4 text-xs text-[var(--muted)]">
        Source:{" "}
        <a
          href={quest.source.url}
          target="_blank"
          rel="noreferrer"
          className="text-[var(--gold)] hover:underline"
        >
          {quest.title} on the {quest.source.wiki}
        </a>{" "}
        · {quest.source.license}
      </p>
    </article>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-8">
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-[var(--muted)]">
        {title}
      </h2>
      <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4">
        {children}
      </div>
    </section>
  );
}

function Badge({
  children,
  accent,
}: {
  children: React.ReactNode;
  accent?: boolean;
}) {
  return (
    <span
      className={`rounded border px-2 py-0.5 ${
        accent
          ? "border-[var(--gold-dim)] text-[var(--gold-hi)]"
          : "border-[var(--border)] bg-[var(--surface)] text-[var(--muted)]"
      }`}
    >
      {children}
    </span>
  );
}

function QuestRefList({
  label,
  refs,
}: {
  label: string;
  refs: { id: string; title: string }[];
}) {
  return (
    <div>
      <h3 className="mb-2 text-xs uppercase tracking-wider text-[var(--muted)]">
        {label}
      </h3>
      {refs.length === 0 ? (
        <p className="text-sm text-[var(--muted)]">—</p>
      ) : (
        <ul className="space-y-1">
          {refs.map((r) => (
            <li key={r.id}>
              <Link
                href={`/quest/${r.id}`}
                className="text-sm text-[var(--foreground)] hover:text-[var(--gold)]"
              >
                {r.title}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
