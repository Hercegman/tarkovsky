import "server-only";
import { and, eq, or } from "drizzle-orm";
import { db } from "@/lib/db";
import { friendships, users } from "@/lib/db/schema";

export interface PublicUser {
  id: string;
  username: string;
  avatar: string | null;
}

const pair = (a: string, b: string) =>
  or(
    and(eq(friendships.requesterId, a), eq(friendships.addresseeId, b)),
    and(eq(friendships.requesterId, b), eq(friendships.addresseeId, a)),
  );

export async function areFriends(a: string, b: string): Promise<boolean> {
  const row = await db.query.friendships.findFirst({
    where: and(pair(a, b), eq(friendships.status, "accepted")),
  });
  return !!row;
}

export async function findUserByUsername(
  username: string,
): Promise<PublicUser | null> {
  const u = await db.query.users.findFirst({
    where: eq(users.username, username),
    columns: { id: true, username: true, avatar: true },
  });
  return u ?? null;
}

/** Lists for the signed-in user: accepted friends, incoming + outgoing requests. */
export async function getFriendData(userId: string): Promise<{
  friends: PublicUser[];
  incoming: PublicUser[];
  outgoing: PublicUser[];
}> {
  const rows = await db.query.friendships.findMany({
    where: or(
      eq(friendships.requesterId, userId),
      eq(friendships.addresseeId, userId),
    ),
  });
  const otherIds = rows.map((r) =>
    r.requesterId === userId ? r.addresseeId : r.requesterId,
  );
  const people = otherIds.length
    ? await db.query.users.findMany({
        where: (u, { inArray }) => inArray(u.id, otherIds),
        columns: { id: true, username: true, avatar: true },
      })
    : [];
  const byId = new Map(people.map((p) => [p.id, p as PublicUser]));

  const friends: PublicUser[] = [];
  const incoming: PublicUser[] = [];
  const outgoing: PublicUser[] = [];
  for (const r of rows) {
    const otherId = r.requesterId === userId ? r.addresseeId : r.requesterId;
    const person = byId.get(otherId);
    if (!person) continue;
    if (r.status === "accepted") friends.push(person);
    else if (r.addresseeId === userId) incoming.push(person);
    else outgoing.push(person);
  }
  return { friends, incoming, outgoing };
}

/** Send a friend request (or auto-accept if the other person already asked). */
export async function requestFriend(
  userId: string,
  targetUsername: string,
): Promise<{ ok: boolean; message: string }> {
  const target = await findUserByUsername(targetUsername);
  if (!target) return { ok: false, message: "No user with that username." };
  if (target.id === userId)
    return { ok: false, message: "You can't add yourself." };

  const existing = await db.query.friendships.findFirst({
    where: pair(userId, target.id),
  });
  if (existing) {
    if (existing.status === "accepted")
      return { ok: false, message: "You're already friends." };
    if (existing.addresseeId === userId) {
      // They already requested you — accept it.
      await db
        .update(friendships)
        .set({ status: "accepted" })
        .where(
          and(
            eq(friendships.requesterId, target.id),
            eq(friendships.addresseeId, userId),
          ),
        );
      return { ok: true, message: `You are now friends with ${target.username}.` };
    }
    return { ok: false, message: "Request already sent." };
  }

  await db
    .insert(friendships)
    .values({ requesterId: userId, addresseeId: target.id, status: "pending" });
  return { ok: true, message: `Friend request sent to ${target.username}.` };
}

export async function respondToRequest(
  userId: string,
  requesterUsername: string,
  accept: boolean,
): Promise<{ ok: boolean }> {
  const requester = await findUserByUsername(requesterUsername);
  if (!requester) return { ok: false };
  const where = and(
    eq(friendships.requesterId, requester.id),
    eq(friendships.addresseeId, userId),
    eq(friendships.status, "pending"),
  );
  if (accept) await db.update(friendships).set({ status: "accepted" }).where(where);
  else await db.delete(friendships).where(where);
  return { ok: true };
}

export async function removeFriend(
  userId: string,
  otherUsername: string,
): Promise<{ ok: boolean }> {
  const other = await findUserByUsername(otherUsername);
  if (!other) return { ok: false };
  await db.delete(friendships).where(pair(userId, other.id));
  return { ok: true };
}
