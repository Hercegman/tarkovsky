// Single-stat tile for the /monitor dashboard (Grafana-style big number).

export function StatTile({
  label,
  value,
  sub,
}: {
  label: string;
  value: string | number;
  sub?: string;
}) {
  return (
    <div className="relative border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-center">
      <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-[var(--muted)]">
        {label}
      </div>
      <div className="mt-1 font-mono text-3xl font-bold tabular-nums text-[var(--gold-hi)]">
        {value}
      </div>
      {sub && (
        <div className="mt-0.5 font-mono text-[10px] text-[var(--gold-dim)]">
          {sub}
        </div>
      )}
    </div>
  );
}
