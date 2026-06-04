import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { questProgress } from "@/lib/db/schema";
import { getQuests } from "@/lib/data";
import { areFriends, findUserByUsername } from "@/lib/friends";
import { Avatar } from "@/components/avatar";
import { AddFriendButton } from "@/components/add-friend-button";

export const dynamic = "force-dynamic";

export async function generateMetadata(
  props: PageProps<"/u/[username]">,
): Promise<Metadata> {
  const { username } = await props.params;
  return { title: `${username}` };
}

export default async function UserPage(props: PageProps<"/u/[username]">) {
  const { username } = await props.params;
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const target = await findUserByUsername(username);
  if (!target) notFound();
  if (target.id === session.user.id) redirect("/profile");

  const friends = await areFriends(session.user.id, target.id);

  return (
    <div className="mx-auto max-w-5xl px-4 py-12">
      <div className="glass glow-border rounded-2xl p-6 sm:p-8">
        <div className="flex flex-wrap items-center gap-4">
          <Avatar avatar={target.avatar} name={target.username} size={64} />
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-[var(--foreground)]">
              {target.username}
            </h1>
            <p className="text-sm text-[var(--muted)]">
              {friends ? "Friend" : "Not your friend yet"}
            </p>
          </div>
          {!friends && <AddFriendButton username={target.username} />}
        </div>
      </div>

      {friends ? (
        <Progress userId={target.id} username={target.username} />
      ) : (
        <p className="mt-8 text-sm text-[var(--muted)]">
          Add {target.username} as a friend to see their quest progress.
        </p>
      )}

      <Link
        href="/profile"
        className="mt-8 inline-block text-sm text-[var(--muted)] hover:text-[var(--gold)]"
      >
        ← Back to your profile
      </Link>
    </div>
  );
}

async function Progress({ userId, username }: { userId: string; username: string }) {
  const [progress, quests] = await Promise.all([
    db.query.questProgress.findMany({
      where: eq(questProgress.userId, userId),
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
    <div className="mt-8">
      <div className="mb-2 flex items-center justify-between text-sm">
        <span className="text-[var(--muted)]">
          {completed.length} / {quests.length} quests
        </span>
        <span className="text-[var(--gold)]">{pct}%</span>
      </div>
      <div className="mb-6 h-2 overflow-hidden rounded-full bg-[var(--surface-2)]">
        <div
          className="h-full rounded-full bg-[var(--gold)]"
          style={{ width: `${pct}%` }}
        />
      </div>
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-[var(--muted)]">
        {username}&apos;s completed quests
      </h2>
      {completed.length === 0 ? (
        <p className="text-sm text-[var(--muted)]">Nothing completed yet.</p>
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
