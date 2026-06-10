// Horizontal bar list for the /monitor dashboard. Pure presentational, server-
// rendered. Bar width is computed from value / max (not hard-coded), the longest
// bar fills the track. Numbers are monospace to keep the terminal feel.

export interface BarDatum {
  name: string;
  value: number;
}

export function BarPanel({
  title,
  data,
  unit = "quests",
}: {
  title: string;
  data: BarDatum[];
  unit?: string;
}) {
  const max = Math.max(1, ...data.map((d) => d.value));

  return (
    <section className="relative border border-[var(--border)] bg-[var(--surface)] p-4">
      <h2 className="mb-3 font-mono text-[11px] uppercase tracking-[0.2em] text-[var(--gold)]">
        {title}
      </h2>
      <ul className="space-y-1.5">
        {data.map((d, i) => (
          <li
            key={d.name}
            className="grid grid-cols-[7rem_1fr_auto] items-center gap-3 font-mono text-[11px]"
            aria-label={`${d.name}: ${d.value} ${unit}`}
          >
            <span className="truncate text-[var(--muted)]">{d.name}</span>
            <span className="h-2.5 bg-[var(--surface-2)]">
              <span
                className="crt-bar block h-full bg-[var(--gold)]"
                style={{
                  width: `${(d.value / max) * 100}%`,
                  animationDelay: `${i * 45}ms`,
                }}
              />
            </span>
            <span className="tabular-nums text-[var(--gold-hi)]">{d.value}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
