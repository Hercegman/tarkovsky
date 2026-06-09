"use client";

import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import type { Ammunition } from "@/lib/types";

/* ------------------------------------------------------------------ *
 * Ammo Explorer — graph-first ammunition wiki.
 *
 * Left: filters + compact list. Center: a damage-vs-penetration scatter
 * (hero) + a per-armor-class penetration chart for the selected round +
 * a muzzle-velocity comparison. Right: a focused spec sheet.
 *
 * All charts are hand-rolled SVG (no chart lib in the project). Data is
 * wiki-sourced; the 0–6 effectiveness is mapped to an approximate %.
 * ------------------------------------------------------------------ */

// Wiki effectiveness colours (level 0–6), used for the per-class display.
const EFF_COLORS = [
  "#b32425", // 0 Pointless
  "#dd3333", // 1 It's possible, but…
  "#EB6C0D", // 2 Magdump only
  "#ac6600", // 3 Slightly effective
  "#FB9C0E", // 4 Effective
  "#3f7d2e", // 5 Very effective
  "#5bb04a", // 6 Usually ignores
];

// Muted caliber palette (cycled) for the scatter dots / compare lines.
const CALIBER_PALETTE = [
  "#c1c39e", "#9db4c0", "#c0a37a", "#a88fb0", "#8fb39b",
  "#cf9f8a", "#b0b06a", "#7fa6a6", "#bb8f8f", "#9a9ac0",
  "#b9a06a", "#88b07f", "#c08f9f", "#90a0b8", "#b0a890",
];

// Approximate penetration tiers shown as soft bands behind the scatter.
const PEN_TIERS = [
  { cls: 2, pen: 20 },
  { cls: 3, pen: 30 },
  { cls: 4, pen: 40 },
  { cls: 5, pen: 50 },
  { cls: 6, pen: 60 },
];

const fmt = (n: number | null) => (n == null ? "—" : String(n));
const signed = (n: number | null) =>
  n == null ? "—" : n > 0 ? `+${n}` : String(n);

export function AmmoExplorer({ ammo }: { ammo: Ammunition[] }) {
  const calibers = useMemo(
    () => [...new Set(ammo.map((a) => a.caliber))],
    [ammo],
  );
  const caliberColor = useMemo(() => {
    const m = new Map<string, string>();
    calibers.forEach((c, i) =>
      m.set(c, CALIBER_PALETTE[i % CALIBER_PALETTE.length]),
    );
    return m;
  }, [calibers]);

  const [query, setQuery] = useState("");
  const [caliber, setCaliber] = useState<string>("all");
  const [tagFilters, setTagFilters] = useState<string[]>([]);
  const [selectedId, setSelectedId] = useState<string>(ammo[0]?.id ?? "");
  const [hoverId, setHoverId] = useState<string | null>(null);
  const [compare, setCompare] = useState<string[]>([]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return ammo.filter((a) => {
      if (caliber !== "all" && a.caliber !== caliber) return false;
      if (tagFilters.length && !tagFilters.every((t) => a.tags.includes(t)))
        return false;
      if (q && !a.name.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [ammo, query, caliber, tagFilters]);

  const byId = useMemo(() => new Map(ammo.map((a) => [a.id, a])), [ammo]);
  // Derive the effective selection: if the selected round was filtered out,
  // fall back to the first visible one so the charts are never empty. (Derived
  // during render rather than synced via an effect — see React Compiler rules.)
  const selId =
    filtered.some((a) => a.id === selectedId)
      ? selectedId
      : (filtered[0]?.id ?? selectedId);
  const selected = byId.get(selId) ?? null;
  const compareAmmo = compare
    .map((id) => byId.get(id))
    .filter((a): a is Ammunition => Boolean(a));

  function toggleTag(t: string) {
    setTagFilters((prev) =>
      prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t],
    );
  }
  function toggleCompare(id: string) {
    setCompare((prev) =>
      prev.includes(id)
        ? prev.filter((x) => x !== id)
        : prev.length >= 4
          ? prev
          : [...prev, id],
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search ammo…"
          className="w-44 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-1.5 text-sm outline-none focus:border-[var(--gold-dim)]"
        />
        <select
          value={caliber}
          onChange={(e) => setCaliber(e.target.value)}
          className="rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2 py-1.5 text-sm outline-none focus:border-[var(--gold-dim)]"
        >
          <option value="all">All calibers</option>
          {calibers.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        {[
          { id: "meta", label: "Meta" },
          { id: "budget", label: "Budget" },
          { id: "craftable", label: "Craftable" },
        ].map((t) => (
          <Chip
            key={t.id}
            active={tagFilters.includes(t.id)}
            onClick={() => toggleTag(t.id)}
          >
            {t.label}
          </Chip>
        ))}
        {(query || caliber !== "all" || tagFilters.length > 0) && (
          <button
            onClick={() => {
              setQuery("");
              setCaliber("all");
              setTagFilters([]);
            }}
            className="rounded-lg px-2 py-1.5 text-xs text-[var(--muted)] transition-colors hover:text-[var(--gold)]"
          >
            Reset
          </button>
        )}
        <span className="ml-auto text-xs text-[var(--muted)]">
          {filtered.length} rounds
        </span>
      </div>

      <div className="grid gap-4 lg:grid-cols-[250px_minmax(0,1fr)_330px]">
        {/* Left: list */}
        <div className="order-2 max-h-[78vh] overflow-y-auto rounded-xl border border-[var(--border)] bg-[var(--surface)] p-1.5 lg:order-1">
          {filtered.map((a) => (
            <AmmoRow
              key={a.id}
              ammo={a}
              color={caliberColor.get(a.caliber)!}
              selected={a.id === selId}
              comparing={compare.includes(a.id)}
              onSelect={() => setSelectedId(a.id)}
              onHover={setHoverId}
            />
          ))}
          {filtered.length === 0 && (
            <p className="p-4 text-center text-sm text-[var(--muted)]">
              No rounds match.
            </p>
          )}
        </div>

        {/* Center: charts */}
        <div className="order-1 flex flex-col gap-4 lg:order-2">
          <ScatterChart
            ammo={filtered}
            caliberColor={caliberColor}
            selectedId={selId}
            hoverId={hoverId}
            compare={compare}
            onSelect={setSelectedId}
            onHover={setHoverId}
          />
          <ArmorClassChart selected={selected} compareAmmo={compareAmmo} />
          <VelocityChart
            ammo={filtered}
            selectedId={selId}
            onSelect={setSelectedId}
          />
        </div>

        {/* Right: detail */}
        <div className="order-3">
          <div className="lg:sticky lg:top-20">
            <DetailPanel
              ammo={selected}
              comparing={selected ? compare.includes(selected.id) : false}
              onToggleCompare={selected ? () => toggleCompare(selected.id) : undefined}
            />
            {compareAmmo.length > 0 && (
              <CompareTray
                items={compareAmmo}
                color={caliberColor}
                onRemove={toggleCompare}
                onSelect={setSelectedId}
                onClear={() => setCompare([])}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ----------------------------- list row ----------------------------- */

function AmmoRow({
  ammo,
  color,
  selected,
  comparing,
  onSelect,
  onHover,
}: {
  ammo: Ammunition;
  color: string;
  selected: boolean;
  comparing: boolean;
  onSelect: () => void;
  onHover: (id: string | null) => void;
}) {
  return (
    <button
      onClick={onSelect}
      onMouseEnter={() => onHover(ammo.id)}
      onMouseLeave={() => onHover(null)}
      className={`flex w-full items-center gap-2 rounded-lg border px-2 py-1.5 text-left transition-colors ${
        selected
          ? "border-[var(--gold-dim)] bg-[var(--surface-2)]"
          : "border-transparent hover:bg-[var(--surface-2)]"
      }`}
    >
      <span
        className="h-2 w-2 shrink-0 rounded-full"
        style={{ background: color }}
      />
      <span className="flex h-7 w-7 shrink-0 items-center justify-center">
        {ammo.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={ammo.image}
            alt=""
            className="max-h-7 max-w-7 object-contain"
          />
        ) : null}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-xs font-medium">{ammo.name}</span>
        <span className="block truncate text-[10px] text-[var(--muted)]">
          {ammo.caliber}
        </span>
      </span>
      <span className="shrink-0 text-right text-[10px] tabular-nums text-[var(--muted)]">
        <span className="block text-[var(--foreground)]">{fmt(ammo.damage)}</span>
        <span className="block">{fmt(ammo.penetration)} pen</span>
      </span>
      {comparing && (
        <span className="shrink-0 text-xs text-[var(--gold)]">◎</span>
      )}
    </button>
  );
}

/* --------------------------- scatter chart -------------------------- */

function ScatterChart({
  ammo,
  caliberColor,
  selectedId,
  hoverId,
  compare,
  onSelect,
  onHover,
}: {
  ammo: Ammunition[];
  caliberColor: Map<string, string>;
  selectedId: string;
  hoverId: string | null;
  compare: string[];
  onSelect: (id: string) => void;
  onHover: (id: string | null) => void;
}) {
  const W = 760;
  const H = 420;
  const padL = 44;
  const padR = 16;
  const padT = 16;
  const padB = 36;

  const maxDmg = Math.max(80, ...ammo.map((a) => a.damage ?? 0)) * 1.05;
  const maxPen = Math.max(60, ...ammo.map((a) => a.penetration ?? 0)) * 1.08;
  const sx = (v: number) => padL + (v / maxDmg) * (W - padL - padR);
  const sy = (v: number) => H - padB - (v / maxPen) * (H - padT - padB);

  const active = hoverId ?? selectedId;
  const activeAmmo = ammo.find((a) => a.id === active) ?? null;

  return (
    <figure className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3">
      <figcaption className="mb-1 flex items-center justify-between px-1">
        <span className="text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">
          Damage vs Penetration
        </span>
        <span className="text-[10px] text-[var(--muted)]">
          bands = approx. armor tier
        </span>
      </figcaption>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full"
        role="img"
        aria-label="Damage versus penetration scatter plot"
      >
        {/* approximate armor-tier bands (by penetration) */}
        {PEN_TIERS.map((t, i) => {
          const yTop = sy(PEN_TIERS[i + 1]?.pen ?? maxPen);
          const yBot = sy(t.pen);
          return (
            <g key={t.cls}>
              <rect
                x={padL}
                y={yTop}
                width={W - padL - padR}
                height={Math.max(0, yBot - yTop)}
                fill={i % 2 === 0 ? "var(--gold)" : "var(--success)"}
                opacity={0.05}
              />
              <line
                x1={padL}
                x2={W - padR}
                y1={yBot}
                y2={yBot}
                stroke="var(--border)"
                strokeDasharray="3 4"
                strokeWidth={1}
              />
              <text
                x={W - padR - 2}
                y={yBot - 3}
                textAnchor="end"
                className="fill-[var(--muted)]"
                fontSize={9}
              >
                Class {t.cls}
              </text>
            </g>
          );
        })}

        {/* axes */}
        <line x1={padL} x2={padL} y1={padT} y2={H - padB} stroke="var(--border)" />
        <line x1={padL} x2={W - padR} y1={H - padB} y2={H - padB} stroke="var(--border)" />
        {/* axis ticks */}
        {[0, 0.25, 0.5, 0.75, 1].map((f) => (
          <text
            key={`x${f}`}
            x={padL + f * (W - padL - padR)}
            y={H - padB + 14}
            textAnchor="middle"
            className="fill-[var(--muted)]"
            fontSize={9}
          >
            {Math.round(f * maxDmg)}
          </text>
        ))}
        <text
          x={padL + (W - padL - padR) / 2}
          y={H - 4}
          textAnchor="middle"
          className="fill-[var(--muted)]"
          fontSize={10}
        >
          Damage
        </text>
        <text
          x={-(padT + (H - padT - padB) / 2)}
          y={12}
          transform="rotate(-90)"
          textAnchor="middle"
          className="fill-[var(--muted)]"
          fontSize={10}
        >
          Penetration
        </text>

        {/* dots */}
        {ammo.map((a) => {
          if (a.damage == null || a.penetration == null) return null;
          const isActive = a.id === active;
          const isSel = a.id === selectedId;
          const isCmp = compare.includes(a.id);
          const color = caliberColor.get(a.caliber)!;
          return (
            <circle
              key={a.id}
              cx={sx(a.damage)}
              cy={sy(a.penetration)}
              r={isActive ? 6 : isSel || isCmp ? 5 : 3.5}
              fill={color}
              fillOpacity={isActive || isSel ? 1 : 0.7}
              stroke={isCmp ? "var(--gold-hi)" : isSel ? "var(--background)" : "none"}
              strokeWidth={isCmp ? 2 : 1.5}
              className="cursor-pointer transition-all"
              onMouseEnter={() => onHover(a.id)}
              onMouseLeave={() => onHover(null)}
              onClick={() => onSelect(a.id)}
            >
              <title>
                {a.name} — {a.damage} dmg / {a.penetration} pen
              </title>
            </circle>
          );
        })}

        {/* hover/selection tooltip */}
        {activeAmmo && activeAmmo.damage != null && activeAmmo.penetration != null && (
          <g
            transform={`translate(${Math.min(sx(activeAmmo.damage) + 8, W - 168)}, ${Math.max(sy(activeAmmo.penetration) - 34, padT)})`}
            pointerEvents="none"
          >
            <rect
              width={160}
              height={30}
              rx={5}
              fill="var(--surface-2)"
              stroke="var(--gold-dim)"
            />
            <text x={8} y={13} className="fill-[var(--gold)]" fontSize={10} fontWeight={600}>
              {activeAmmo.name.length > 24
                ? activeAmmo.name.slice(0, 23) + "…"
                : activeAmmo.name}
            </text>
            <text x={8} y={24} className="fill-[var(--muted)]" fontSize={9}>
              {activeAmmo.damage} dmg · {activeAmmo.penetration} pen
            </text>
          </g>
        )}
      </svg>
    </figure>
  );
}

/* ------------------------ armor-class chart ------------------------- */

function ArmorClassChart({
  selected,
  compareAmmo,
}: {
  selected: Ammunition | null;
  compareAmmo: Ammunition[];
}) {
  const W = 760;
  const H = 240;
  const padL = 40;
  const padR = 16;
  const padT = 24;
  const padB = 28;
  const cols = 6;
  const colW = (W - padL - padR) / cols;
  const cx = (i: number) => padL + colW * (i + 0.5);
  const cy = (pct: number) => H - padB - (pct / 100) * (H - padT - padB);

  const linePath = (a: Ammunition) =>
    a.penPct.map((p, i) => `${i === 0 ? "M" : "L"}${cx(i)},${cy(p)}`).join(" ");

  // First class the selected round can no longer penetrate (penPct === 0).
  const stopsAt = selected
    ? selected.penPct.findIndex((p) => p === 0)
    : -1;

  return (
    <figure className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3">
      <figcaption className="mb-1 flex items-center justify-between px-1">
        <span className="text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">
          Penetration by armor class
        </span>
        <span className="truncate pl-2 text-[10px] text-[var(--gold)]">
          {selected?.name ?? "—"}
        </span>
      </figcaption>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Penetration by armor class">
        {/* class zones */}
        {Array.from({ length: cols }).map((_, i) => (
          <g key={i}>
            <rect
              x={padL + colW * i}
              y={padT}
              width={colW}
              height={H - padT - padB}
              fill={i % 2 === 0 ? "var(--surface-2)" : "transparent"}
              opacity={0.4}
            />
            <text
              x={cx(i)}
              y={16}
              textAnchor="middle"
              className="fill-[var(--muted)]"
              fontSize={10}
            >
              Class {i + 1}
            </text>
          </g>
        ))}
        {/* y gridlines */}
        {[0, 25, 50, 75, 100].map((p) => (
          <g key={p}>
            <line
              x1={padL}
              x2={W - padR}
              y1={cy(p)}
              y2={cy(p)}
              stroke="var(--border)"
              strokeWidth={0.5}
              opacity={0.6}
            />
            <text x={padL - 5} y={cy(p) + 3} textAnchor="end" className="fill-[var(--muted)]" fontSize={8}>
              {p}
            </text>
          </g>
        ))}

        {/* compared rounds (thin) */}
        {compareAmmo
          .filter((a) => a.id !== selected?.id)
          .map((a) => (
            <path
              key={a.id}
              d={linePath(a)}
              fill="none"
              stroke="var(--gold-dim)"
              strokeWidth={1.5}
              strokeOpacity={0.7}
              strokeDasharray="4 3"
            />
          ))}

        {/* selected round */}
        {selected && (
          <>
            <path
              d={linePath(selected)}
              fill="none"
              stroke="var(--gold)"
              strokeWidth={2.5}
              strokeLinejoin="round"
            />
            {selected.penPct.map((p, i) => (
              <circle
                key={i}
                cx={cx(i)}
                cy={cy(p)}
                r={4}
                fill={EFF_COLORS[selected.armorClass[i]]}
                stroke="var(--surface)"
                strokeWidth={1.5}
              >
                <title>
                  Class {i + 1}: {selected.effLabels[i]} (~{p}%)
                </title>
              </circle>
            ))}
            {stopsAt > 0 && (
              <g transform={`translate(${cx(stopsAt)}, ${cy(0) - 4})`}>
                <rect x={-44} y={-20} width={88} height={18} rx={4} fill="var(--danger)" opacity={0.9} />
                <text x={0} y={-7} textAnchor="middle" className="fill-white" fontSize={9} fontWeight={600}>
                  Stops at class {stopsAt + 1}
                </text>
              </g>
            )}
          </>
        )}
      </svg>
    </figure>
  );
}

/* --------------------------- velocity bars -------------------------- */

function VelocityChart({
  ammo,
  selectedId,
  onSelect,
}: {
  ammo: Ammunition[];
  selectedId: string;
  onSelect: (id: string) => void;
}) {
  const top = useMemo(
    () =>
      [...ammo]
        .filter((a) => a.velocity != null)
        .sort((a, b) => (b.velocity ?? 0) - (a.velocity ?? 0))
        .slice(0, 12),
    [ammo],
  );
  const maxV = Math.max(1, ...top.map((a) => a.velocity ?? 0));

  if (top.length === 0) return null;

  return (
    <figure className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3">
      <figcaption className="mb-2 px-1 text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">
        Muzzle velocity {ammo.length > 12 && "(top 12)"}
      </figcaption>
      <div className="flex flex-col gap-1">
        {top.map((a) => {
          const sel = a.id === selectedId;
          return (
            <button
              key={a.id}
              onClick={() => onSelect(a.id)}
              className="group flex items-center gap-2 text-left"
            >
              <span className="w-28 shrink-0 truncate text-[11px] text-[var(--muted)] group-hover:text-[var(--foreground)]">
                {a.name}
              </span>
              <span className="relative h-3.5 flex-1 overflow-hidden rounded-sm bg-[var(--surface-2)]">
                <span
                  className="absolute inset-y-0 left-0 rounded-sm transition-all"
                  style={{
                    width: `${((a.velocity ?? 0) / maxV) * 100}%`,
                    background: sel ? "var(--gold)" : "var(--gold-dim)",
                  }}
                />
              </span>
              <span className="w-14 shrink-0 text-right text-[11px] tabular-nums text-[var(--foreground)]">
                {a.velocity} m/s
              </span>
            </button>
          );
        })}
      </div>
    </figure>
  );
}

/* ---------------------------- detail panel -------------------------- */

function DetailPanel({
  ammo,
  comparing,
  onToggleCompare,
}: {
  ammo: Ammunition | null;
  comparing: boolean;
  onToggleCompare?: () => void;
}) {
  if (!ammo) {
    return (
      <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-6 text-center text-sm text-[var(--muted)]">
        Select a round to see its full spec sheet.
      </div>
    );
  }

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={ammo.id}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -6 }}
        transition={{ type: "spring", stiffness: 280, damping: 26 }}
        className="overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)]"
      >
        {/* header */}
        <div className="flex items-center gap-3 border-b border-[var(--border)] bg-[var(--surface-2)] p-4">
          <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg bg-[var(--background)]/40">
            {ammo.image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={ammo.image} alt="" className="max-h-12 max-w-12 object-contain" />
            ) : null}
          </span>
          <div className="min-w-0">
            <h2 className="truncate text-lg font-bold leading-tight">{ammo.name}</h2>
            <p className="text-xs text-[var(--muted)]">{ammo.caliber}</p>
          </div>
        </div>

        <div className="space-y-4 p-4">
          {/* hero bars */}
          <div className="grid grid-cols-2 gap-3">
            <StatBar label="Damage" value={ammo.damage} max={200} />
            <StatBar label="Penetration" value={ammo.penetration} max={80} />
          </div>

          {/* armor pen by class */}
          <div>
            <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-[var(--muted)]">
              Armor penetration (approx.)
            </p>
            <div className="grid grid-cols-6 gap-1">
              {ammo.penPct.map((p, i) => (
                <div key={i} className="text-center" title={ammo.effLabels[i]}>
                  <div className="text-[9px] text-[var(--muted)]">{i + 1}</div>
                  <div
                    className="rounded py-1 text-[10px] font-semibold text-white"
                    style={{ background: EFF_COLORS[ammo.armorClass[i]] }}
                  >
                    {p}%
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* stat grid */}
          <dl className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
            <Row label="Armor damage" value={ammo.armorDamage != null ? `${ammo.armorDamage}%` : "—"} />
            <Row label="Accuracy" value={signed(ammo.accuracy)} />
            <Row label="Recoil" value={signed(ammo.recoil)} />
            <Row label="Muzzle velocity" value={ammo.velocity != null ? `${ammo.velocity} m/s` : "—"} />
            <Row label="Light bleed" value={signed(ammo.lightBleed)} />
            <Row label="Heavy bleed" value={signed(ammo.heavyBleed)} />
            <Row label="Heat" value={signed(ammo.heat)} />
            <Row label="Durability burn" value={ammo.durabilityBurn != null ? `${ammo.durabilityBurn}%` : "—"} />
            <Row label="Bullet type" value={ammo.bulletType ?? "—"} />
            {/* Not provided by the wiki — shown for completeness. */}
            <Row label="Fragmentation" value="—" />
            <Row label="Ricochet" value="—" />
            <Row label="Price" value="—" />
          </dl>

          {/* trader / source */}
          <div className="border-t border-[var(--border)] pt-3">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--muted)]">
              Source
            </p>
            <p className="mt-0.5 text-xs">{ammo.traderSource ?? "—"}</p>
          </div>

          {/* tags */}
          {ammo.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {ammo.tags.map((t) => (
                <span
                  key={t}
                  className="rounded border border-[var(--gold-dim)] px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-[var(--gold)]"
                >
                  {t}
                </span>
              ))}
            </div>
          )}

          <div className="flex items-center gap-2 pt-1">
            {onToggleCompare && (
              <button
                onClick={onToggleCompare}
                className={`flex-1 rounded-lg border py-2 text-center text-xs font-medium transition-colors ${
                  comparing
                    ? "border-[var(--gold)] bg-[var(--gold)] text-[var(--background)]"
                    : "border-[var(--gold-dim)] text-[var(--gold)] hover:bg-[var(--surface-2)]"
                }`}
              >
                {comparing ? "✓ Comparing" : "+ Compare"}
              </button>
            )}
            <a
              href={ammo.source.url}
              target="_blank"
              rel="noreferrer"
              className="rounded-lg border border-[var(--border)] px-3 py-2 text-center text-xs text-[var(--muted)] transition-colors hover:text-[var(--gold)]"
            >
              Wiki ↗
            </a>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

/* ----------------------------- compare tray ------------------------- */

function CompareTray({
  items,
  color,
  onRemove,
  onSelect,
  onClear,
}: {
  items: Ammunition[];
  color: Map<string, string>;
  onRemove: (id: string) => void;
  onSelect: (id: string) => void;
  onClear: () => void;
}) {
  return (
    <div className="mt-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--muted)]">
          Comparing ({items.length})
        </span>
        <button
          onClick={onClear}
          className="text-[10px] text-[var(--muted)] hover:text-[var(--danger)]"
        >
          Clear
        </button>
      </div>
      <div className="flex flex-col gap-1">
        {items.map((a) => (
          <div key={a.id} className="flex items-center gap-2 text-xs">
            <span
              className="h-2 w-2 shrink-0 rounded-full"
              style={{ background: color.get(a.caliber) }}
            />
            <button
              onClick={() => onSelect(a.id)}
              className="min-w-0 flex-1 truncate text-left hover:text-[var(--gold)]"
            >
              {a.name}
            </button>
            <button
              onClick={() => onRemove(a.id)}
              aria-label={`Remove ${a.name}`}
              className="shrink-0 text-[var(--muted)] hover:text-[var(--danger)]"
            >
              ✕
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ------------------------------- atoms ------------------------------ */

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded-lg border px-2.5 py-1.5 text-xs transition-colors ${
        active
          ? "border-[var(--gold)] bg-[var(--gold)]/15 text-[var(--gold)]"
          : "border-[var(--border)] text-[var(--muted)] hover:border-[var(--gold-dim)] hover:text-[var(--foreground)]"
      }`}
    >
      {children}
    </button>
  );
}

function StatBar({
  label,
  value,
  max,
}: {
  label: string;
  value: number | null;
  max: number;
}) {
  const pct = value == null ? 0 : Math.min(100, (value / max) * 100);
  return (
    <div>
      <div className="mb-1 flex items-baseline justify-between">
        <span className="text-[10px] uppercase tracking-wider text-[var(--muted)]">
          {label}
        </span>
        <span className="text-lg font-bold tabular-nums leading-none">
          {fmt(value)}
        </span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-[var(--surface-2)]">
        <div
          className="h-full rounded-full bg-[var(--gold)] transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-2 border-b border-[var(--border)]/40 pb-1">
      <dt className="text-[var(--muted)]">{label}</dt>
      <dd className="tabular-nums">{value}</dd>
    </div>
  );
}
