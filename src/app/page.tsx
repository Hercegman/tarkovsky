import Link from "next/link";
import { getTraders, getMaps, getQuests } from "@/lib/data";

export default async function Home() {
  const [traders, maps, quests] = await Promise.all([
    getTraders(),
    getMaps(),
    getQuests(),
  ]);

  return (
    <div className="mx-auto max-w-6xl px-4">
      {/* Hero */}
      <section className="py-16 text-center sm:py-24">
        <h1 className="text-4xl font-bold tracking-tight text-[var(--foreground)] sm:text-5xl">
          The <span className="text-[var(--gold)]">beginner-friendly</span> Tarkov
          quest wiki
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-[var(--muted)]">
          Other wikis bury you in detail. Tarkovsky shows just what you need to
          plan and finish quests — objectives, prerequisites, rewards and
          interactive maps.
        </p>
        <div className="mt-8 flex items-center justify-center gap-3">
          <Link
            href="/quests"
            className="rounded border border-[var(--gold-dim)] bg-[var(--gold)] px-5 py-2.5 font-medium text-[var(--background)] transition-colors hover:bg-[var(--gold-hi)]"
          >
            Browse quests
          </Link>
          <Link
            href="/maps"
            className="rounded border border-[var(--border)] px-5 py-2.5 font-medium text-[var(--foreground)] transition-colors hover:border-[var(--gold-dim)] hover:text-[var(--gold)]"
          >
            View maps
          </Link>
        </div>
        <p className="mt-6 text-sm text-[var(--muted)]">
          {quests.length > 0
            ? `${quests.length} quests across ${traders.length} traders`
            : "Run the wiki ingest to load quests"}
        </p>
      </section>

      {/* Feature cards */}
      <section className="grid gap-4 pb-16 sm:grid-cols-3">
        <FeatureCard
          title="Quest tracker"
          body="Every task, grouped by trader. Filter by map and level, see what unlocks next."
        />
        <FeatureCard
          title="Interactive maps"
          body="Pan-and-zoom maps with objective markers, so you know exactly where to go."
        />
        <FeatureCard
          title="Track your progress"
          body="Make an account and tick off quests as you complete them."
        />
      </section>

      {/* Quick links */}
      <section className="grid gap-8 pb-20 sm:grid-cols-2">
        <div>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-[var(--muted)]">
            Traders
          </h2>
          <div className="flex flex-wrap gap-2">
            {traders.map((t) => (
              <Link
                key={t.id}
                href={`/quests/${t.id}`}
                className="rounded border border-[var(--border)] bg-[var(--surface)] px-3 py-1.5 text-sm transition-colors hover:border-[var(--gold-dim)] hover:text-[var(--gold)]"
              >
                {t.name}
              </Link>
            ))}
          </div>
        </div>
        <div>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-[var(--muted)]">
            Maps
          </h2>
          <div className="flex flex-wrap gap-2">
            {maps.map((m) => (
              <Link
                key={m.id}
                href={`/maps/${m.id}`}
                className="rounded border border-[var(--border)] bg-[var(--surface)] px-3 py-1.5 text-sm transition-colors hover:border-[var(--gold-dim)] hover:text-[var(--gold)]"
              >
                {m.name}
              </Link>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}

function FeatureCard({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-5">
      <h3 className="mb-2 font-semibold text-[var(--gold)]">{title}</h3>
      <p className="text-sm text-[var(--muted)]">{body}</p>
    </div>
  );
}
