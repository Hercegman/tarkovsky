import type { Metadata } from "next";
import { getAmmo } from "@/lib/data";
import { AmmoExplorer } from "@/components/ammo-explorer";

export const metadata: Metadata = {
  title: "Ammo",
  description:
    "Compare Escape from Tarkov ammunition at a glance — damage vs penetration, effectiveness against each armor class, and full ballistic stats.",
};

export default async function AmmoPage() {
  const ammo = await getAmmo();

  return (
    <div className="radial-glow min-h-full">
      <div className="mx-auto max-w-[1500px] px-4 py-8">
        <h1 className="mb-1 text-3xl font-bold tracking-tight">
          <span className="text-gradient">Ammo</span>
        </h1>
        <p className="mb-6 max-w-2xl text-sm text-[var(--muted)]">
          Damage versus penetration at a glance, with each round&apos;s
          effectiveness against armor classes 1–6. Data is wiki-sourced;
          per-class penetration is approximate. Click a round for full stats.
        </p>

        {ammo.length === 0 ? (
          <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-8 text-center text-sm text-[var(--muted)]">
            No ammo loaded yet. Run{" "}
            <code className="text-[var(--gold)]">npm run ingest:ammo</code>.
          </div>
        ) : (
          <AmmoExplorer ammo={ammo} />
        )}
      </div>
    </div>
  );
}
