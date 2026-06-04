import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { getQuests, getQuest, getTrader, getMaps, getMapData } from "@/lib/data";
import { QuestProgressButton } from "@/components/quest-progress-button";
import { QuestMiniMap } from "@/components/quest-mini-map";

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

  const [trader, maps] = await Promise.all([getTrader(quest.trader), getMaps()]);
  const mapName = Object.fromEntries(maps.map((m) => [m.id, m.name]));

  // Mini-map: the quest's first known location, highlighting its own markers.
  const primaryMapId = quest.maps[0];
  const mapData = primaryMapId ? await getMapData(primaryMapId) : null;
  const questMarkers = quest.markers
    .filter((m) => m.map === primaryMapId)
    .map((m) => ({ x: m.x, y: m.y, label: m.label }));

  return (
    <div className="radial-glow min-h-full">
      <article className="mx-auto max-w-3xl px-4 py-10">
        <Link
          href={trader ? `/quests/${trader.id}` : "/quests"}
          className="text-sm text-[var(--muted)] transition-colors hover:text-[var(--gold)]"
        >
          ← {trader?.name ?? "Quests"}
        </Link>

        {/* In-game style task card */}
        <div className="glass glow-border mt-4 overflow-hidden rounded-2xl border-l-2 border-l-[var(--gold)]">
          {quest.image && (
            <div className="relative h-44 w-full sm:h-56">
              <Image
                src={quest.image}
                alt={quest.title}
                fill
                sizes="(max-width: 768px) 100vw, 768px"
                className="object-cover opacity-90"
                unoptimized
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[var(--surface)] via-transparent" />
            </div>
          )}

          <div className="p-5 sm:p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-[var(--gold)]">
                  {trader?.name ?? "Task"}
                </p>
                <h1 className="mt-1 text-2xl font-bold sm:text-3xl">{quest.title}</h1>
              </div>
              <QuestProgressButton questId={quest.id} />
            </div>

            <div className="mt-3 flex flex-wrap gap-2 text-xs">
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
        </div>

        {quest.objectives.length > 0 && (
          <Section title="Objectives">
            <ul className="space-y-2">
              {quest.objectives.map((o, i) => (
                <li key={i} className="flex items-start gap-3 text-sm">
                  <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-sm border border-[var(--gold-dim)] text-[10px] text-[var(--gold)]">
                    ◆
                  </span>
                  <span>{o}</span>
                </li>
              ))}
            </ul>
          </Section>
        )}

        {mapData && (
          <Section title={`Location · ${mapData.name}`}>
            <QuestMiniMap map={mapData} highlight={questMarkers} />
            <p className="mt-2 text-xs text-[var(--muted)]">
              {questMarkers.length
                ? "Gold markers show this quest's objectives. "
                : "No specific location markers for this quest — showing quest-related spots. "}
              Open the{" "}
              <Link href={`/maps/${mapData.id}`} className="text-[var(--gold)] hover:underline">
                full map
              </Link>{" "}
              for all layers.
            </p>
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
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-8">
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-[var(--muted)]">
        {title}
      </h2>
      <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
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
                className="text-sm transition-colors hover:text-[var(--gold)]"
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
