import type { Metadata } from "next";
import { auth } from "@/lib/auth";
import { getMaps } from "@/lib/data";
import { SessionLanding } from "@/components/session/session-landing";

export const metadata: Metadata = {
  title: "Session Maps",
  description:
    "Create a live map session and draw together — coach a teammate in real time over any Escape from Tarkov map.",
};

export default async function SessionsPage() {
  const [maps, session] = await Promise.all([getMaps(), auth()]);

  return (
    <div className="radial-glow min-h-full">
      <div className="mx-auto max-w-3xl px-4 py-10">
        <h1 className="mb-1 text-3xl font-bold tracking-tight">
          <span className="text-gradient">Session Maps</span>
        </h1>
        <p className="mb-8 text-sm text-[var(--muted)]">
          Open a shared map and draw on it live. Host a session, share the code,
          and point things out in real time — like sharing a strategy board.
        </p>
        <SessionLanding loggedIn={!!session?.user?.id} maps={maps} />
      </div>
    </div>
  );
}
