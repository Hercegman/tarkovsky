import type { Metadata } from "next";
import { getWeapons, getAttachments } from "@/lib/data";
import { GunBuilder } from "@/components/gun-builder";

export const metadata: Metadata = {
  title: "Gun Builder",
  description:
    "Build a weapon with all attachments and see approximate stats — ergonomics, recoil, weight.",
};

export default async function GunBuilderPage() {
  const [weapons, attachments] = await Promise.all([
    getWeapons(),
    getAttachments(),
  ]);

  return (
    <div className="radial-glow min-h-full">
      <div className="mx-auto max-w-5xl px-4 py-10">
        <h1 className="mb-1 text-3xl font-bold tracking-tight">
          <span className="text-gradient">Gun Builder</span>
        </h1>
        <p className="mb-8 max-w-2xl text-sm text-[var(--muted)]">
          Pick a weapon, fit attachments, and see the resulting stats. Data is
          wiki-sourced and approximate — a planning aid, not an exact in-game
          calculator.
        </p>

        {weapons.length === 0 ? (
          <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-8 text-center text-sm text-[var(--muted)]">
            No weapons loaded yet. Run{" "}
            <code className="text-[var(--gold)]">npm run ingest:weapons</code>.
          </div>
        ) : (
          <GunBuilder weapons={weapons} attachments={attachments} />
        )}
      </div>
    </div>
  );
}
