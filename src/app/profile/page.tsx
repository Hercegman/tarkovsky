import type { Metadata } from "next";
import { redirect } from "next/navigation";
import Link from "next/link";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { questProgress } from "@/lib/db/schema";
import { getQuests } from "@/lib/data";
import { logoutAction } from "../(auth)/actions";

export const metadata: Metadata = { title: "Profile" };
export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const [progress, quests] = await Promise.all([
    db.query.questProgress.findMany({
      where: eq(questProgress.userId, session.user.id),
      columns: { questId: true },
    }),
    getQuests(),
  ]);

  const done = new Set(progress.map((p) => p.questId));
  const completed = quests.filter((q) => done.has(q.id));
  const pct = quests.length
    ? Math.round((completed.length / quests.length) * 100)
    : 0;

  return (
    <div className="mx-auto max-w-5xl px-4 py-12">
      <div className="glass glow-border rounded-2xl p-6 sm:p-8">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-full border border-[var(--gold-dim)] bg-[var(--surface-2)] text-2xl font-bold text-[var(--gold)]">
            {session.user.name?.[0]?.toUpperCase() ?? "?"}
          </div>
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-[var(--foreground)]">
              {session.user.name}
            </h1>
            <p className="text-sm text-[var(--muted)]">{session.user.email}</p>
          </div>
          <form action={logoutAction}>
            <button
              type="submit"
              className="rounded-lg border border-[var(--border)] px-4 py-2 text-sm text-[var(--muted)] transition-colors hover:border-[var(--danger)] hover:text-[var(--danger)]"
            >
              Log out
            </button>
          </form>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          <Stat label="Quests completed" value={String(completed.length)} />
          <Stat label="Total quests" value={String(quests.length)} />
          <Stat label="Completion" value={`${pct}%`} />
        </div>

        <div className="mt-4 h-2 overflow-hidden rounded-full bg-[var(--surface-2)]">
          <div
            className="h-full rounded-full bg-[var(--gold)] transition-all"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      <h2 className="mt-10 mb-3 text-sm font-semibold uppercase tracking-wider text-[var(--muted)]">
        Completed quests ({completed.length})
      </h2>
      {completed.length === 0 ? (
        <p className="text-sm text-[var(--muted)]">
          None yet. Browse{" "}
          <Link href="/quests" className="text-[var(--gold)] hover:underline">
            quests
          </Link>{" "}
          and mark them complete as you go.
        </p>
      ) : (
        <ul className="grid gap-2 sm:grid-cols-2">
          {completed.map((q) => (
            <li key={q.id}>
              <Link
                href={`/quest/${q.id}`}
                className="block rounded-lg border border-[var(--border)] bg-[var(--surface)] px-4 py-2.5 text-sm transition-colors hover:border-[var(--success)] hover:text-[var(--success)]"
              >
                {q.title}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-4 text-center">
      <div className="text-2xl font-bold text-[var(--gold)]">{value}</div>
      <div className="text-xs uppercase tracking-wider text-[var(--muted)]">
        {label}
      </div>
    </div>
  );
}
