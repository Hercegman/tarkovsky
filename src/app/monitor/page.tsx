// Tarkovsky — Quest Monitor. A hidden, retro "tactical CRT" dashboard over the
// committed wiki data. Server Component: all metrics are computed at build time
// from the same JSON the rest of the site reads (src/lib/data.ts). Not linked in
// the nav and not indexed — reachable only at /monitor.
import type { Metadata } from "next";
import {
  getQuests,
  getTraders,
  getMaps,
  getTraderQuestCounts,
  getMapQuestCounts,
} from "@/lib/data";
import { groupQuestParts } from "@/lib/quest-utils";
import { MonitorWindow } from "@/components/monitor/monitor-window";
import { StatTile } from "@/components/monitor/stat-tile";
import { BarPanel } from "@/components/monitor/bar-panel";

export const metadata: Metadata = {
  title: "Tarkovsky — Quest Monitor",
  description: "Live metrics over the Tarkovsky quest dataset.",
  robots: { index: false, follow: false },
};

export default async function MonitorPage() {
  const [quests, traders, maps, traderCounts, mapCounts] = await Promise.all([
    getQuests(),
    getTraders(),
    getMaps(),
    getTraderQuestCounts(),
    getMapQuestCounts(),
  ]);

  const totalQuests = quests.length;
  const kappaCount = quests.filter((q) => q.kappaRequired).length;
  const kappaPct = totalQuests ? Math.round((kappaCount / totalQuests) * 100) : 0;
  const seriesCount = groupQuestParts(quests).filter((g) => g.isSeries).length;

  const perTrader = traders
    .map((t) => ({ name: t.name, value: traderCounts[t.id] ?? 0 }))
    .sort((a, b) => b.value - a.value);

  const perMap = maps
    .map((m) => ({ name: m.name, value: mapCounts[m.id] ?? 0 }))
    .sort((a, b) => b.value - a.value);

  const status = `STATUS: ONLINE · quests indexed: ${totalQuests} · source: EFT Wiki (CC BY-NC-SA) · Hercegman & Priestt_`;

  return (
    <div className="grid-bg min-h-screen px-4 py-10 sm:py-16">
      <MonitorWindow title="TARKOVSKY // QUEST MONITOR" status={status}>
        {/* single-stat tiles */}
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <StatTile label="Total quests" value={totalQuests} />
          <StatTile label="Traders" value={traders.length} />
          <StatTile label="Maps" value={maps.length} />
          <StatTile
            label="Kappa %"
            value={`${kappaPct}%`}
            sub={`${kappaCount} required`}
          />
        </div>

        {/* bar panels */}
        <div className="mt-3 grid gap-2 lg:grid-cols-2">
          <BarPanel title="Quests per trader" data={perTrader} />
          <BarPanel title="Quest load by map" data={perMap} />
        </div>

        {/* secondary metrics */}
        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
          <StatTile label="Multi-part series" value={seriesCount} />
          <StatTile
            label="Non-Kappa"
            value={totalQuests - kappaCount}
            sub="optional"
          />
          <StatTile
            label="Avg / trader"
            value={traders.length ? Math.round(totalQuests / traders.length) : 0}
          />
          <StatTile
            label="Avg / map"
            value={maps.length ? Math.round(totalQuests / maps.length) : 0}
          />
        </div>
      </MonitorWindow>

      <p className="mx-auto mt-4 max-w-4xl text-center font-mono text-[10px] uppercase tracking-[0.2em] text-[var(--gold-dim)]">
        Win2K system-monitor mockup · reskinned for Tarkovsky · best viewed full-screen
      </p>
    </div>
  );
}
