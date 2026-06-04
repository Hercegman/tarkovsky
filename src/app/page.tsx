import Link from "next/link";
import Image from "next/image";
import {
  getMaps,
  getTraders,
  getTraderQuestCounts,
  getMapQuestCounts,
} from "@/lib/data";
import { RadarBackground } from "@/components/radar-background";
import { Reveal, RevealGroup, RevealItem } from "@/components/ui/reveal";
import { AnimatedCard } from "@/components/ui/animated-card";
import { MapRevealCard } from "@/components/map-reveal-card";
import { CyclingBackdrop } from "@/components/cycling-backdrop";

export default async function Home() {
  const [maps, traders, traderCounts, mapCounts] = await Promise.all([
    getMaps(),
    getTraders(),
    getTraderQuestCounts(),
    getMapQuestCounts(),
  ]);

  const backdropImages = [
    ...maps.map((m) => `/maps/banner/${m.id}.webp`),
    ...traders.map((t) => t.image).filter((s): s is string => !!s),
  ];

  return (
    <div className="radial-glow">
      {/* Hero */}
      <section className="relative overflow-hidden border-b border-[var(--border)]">
        <div className="grid-bg absolute inset-0 opacity-60" />
        <RadarBackground />
        <div className="relative mx-auto max-w-6xl px-4 py-28 text-center sm:py-36">
          <Reveal>
            <span className="inline-block rounded-full border border-[var(--gold-dim)] bg-[var(--surface)]/60 px-4 py-1 text-xs uppercase tracking-[0.2em] text-[var(--gold)]">
              Escape from Tarkov · Quest Wiki
            </span>
          </Reveal>
          <Reveal delay={0.08}>
            <h1 className="mt-6 text-5xl font-bold tracking-tight sm:text-7xl">
              Finish quests, <span className="text-gradient">without the noise</span>
            </h1>
          </Reveal>
          <Reveal delay={0.16}>
            <p className="mx-auto mt-5 max-w-2xl text-lg text-[var(--muted)]">
              A clean, beginner-friendly companion for every Tarkov task —
              objectives, prerequisites, rewards and interactive maps. Built for
              players who just want to know what to do next.
            </p>
          </Reveal>
          <Reveal delay={0.24}>
            <div className="mt-9 flex items-center justify-center gap-3">
              <Link
                href="/quests"
                className="rounded-lg border border-[var(--gold-dim)] bg-[var(--gold)] px-6 py-3 font-medium text-[var(--background)] shadow-[0_0_24px_rgba(200,160,77,0.25)] transition-all hover:bg-[var(--gold-hi)] hover:shadow-[0_0_40px_rgba(200,160,77,0.45)]"
              >
                Browse quests
              </Link>
              <Link
                href="/maps"
                className="rounded-lg border border-[var(--border)] px-6 py-3 font-medium transition-colors hover:border-[var(--gold-dim)] hover:text-[var(--gold)]"
              >
                Explore maps
              </Link>
            </div>
          </Reveal>
          <Reveal delay={0.32}>
            <p className="mt-7 text-sm uppercase tracking-[0.15em] text-[var(--muted)]">
              Provided to you by{" "}
              <span className="text-[var(--gold)]">Hercegman</span> and{" "}
              <span className="text-[var(--gold)]">Priestt_</span>
            </p>
          </Reveal>
        </div>
      </section>

      {/* Cycling faint backdrop behind the lower sections (traders & maps) */}
      <div className="relative">
        <CyclingBackdrop absolute images={backdropImages} opacity={0.08} />
        <div className="relative z-10">

      {/* Feature cards */}
      <section className="mx-auto max-w-6xl px-4 py-20">
        <RevealGroup className="grid gap-5 sm:grid-cols-3">
          {[
            {
              t: "Quest tracker",
              b: "Every task, in the order you unlock it. Filter by map and level, see what comes next.",
            },
            {
              t: "Interactive maps",
              b: "Pan-and-zoom maps with extract, spawn and quest markers — toggle exactly what you need.",
            },
            {
              t: "Track progress",
              b: "Make an account and tick off quests as you complete them, across every raid.",
            },
          ].map((f) => (
            <RevealItem key={f.t}>
              <AnimatedCard className="h-full p-6">
                <h3 className="mb-2 font-semibold text-[var(--gold)]">{f.t}</h3>
                <p className="text-sm text-[var(--muted)]">{f.b}</p>
              </AnimatedCard>
            </RevealItem>
          ))}
        </RevealGroup>
      </section>

      {/* Traders */}
      <section className="mx-auto max-w-6xl px-4 py-16">
        <Reveal>
          <h2 className="mb-6 text-sm font-semibold uppercase tracking-wider text-[var(--muted)]">
            Traders
          </h2>
        </Reveal>
        <RevealGroup className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {traders.map((t) => (
            <RevealItem key={t.id}>
              <Link href={`/quests/${t.id}`}>
                <AnimatedCard className="overflow-hidden">
                  <div className="relative aspect-[3/4] w-full bg-[var(--surface-2)]">
                    {t.image && (
                      <Image
                        src={t.image}
                        alt={t.name}
                        fill
                        sizes="(max-width: 640px) 50vw, 200px"
                        className="object-cover object-top opacity-90 transition-transform duration-300 group-hover:scale-105"
                        unoptimized
                      />
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-[var(--surface)] via-[var(--surface)]/20 to-transparent" />
                    <div className="absolute bottom-0 left-0 right-0 p-3">
                      <p className="font-display text-lg font-semibold leading-tight text-[var(--foreground)]">
                        {t.name}
                      </p>
                      <p className="text-xs text-[var(--gold)]">
                        {traderCounts[t.id] ?? 0} quests
                      </p>
                    </div>
                  </div>
                </AnimatedCard>
              </Link>
            </RevealItem>
          ))}
        </RevealGroup>
      </section>

      {/* Maps grid */}
      <section className="mx-auto max-w-6xl px-4 py-20">
        <Reveal>
          <h2 className="mb-6 text-sm font-semibold uppercase tracking-wider text-[var(--muted)]">
            Maps
          </h2>
        </Reveal>
        <RevealGroup className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {maps.map((m) => (
            <RevealItem key={m.id}>
              <MapRevealCard id={m.id} name={m.name} count={mapCounts[m.id] ?? 0} />
            </RevealItem>
          ))}
        </RevealGroup>
      </section>
        </div>
      </div>
    </div>
  );
}
