// Terminal-window chrome for the /monitor dashboard: a titlebar, a CRT scanline
// overlay over the body, and a status line with a blinking caret. Pure CSS, no
// client JS — animations are auto-disabled under prefers-reduced-motion (global
// rule in globals.css).

export function MonitorWindow({
  title,
  status,
  children,
}: {
  title: string;
  status: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mx-auto w-full max-w-4xl border border-[var(--gold-dim)] bg-[var(--background)] shadow-[0_0_40px_rgba(157,160,121,0.12)]">
      {/* titlebar */}
      <div className="flex items-center justify-between border-b border-[var(--gold-dim)] bg-[var(--surface-2)] px-3 py-1.5">
        <span className="font-mono text-[11px] uppercase tracking-[0.2em] text-[var(--gold)]">
          {title}
        </span>
        <span className="flex items-center gap-1.5" aria-hidden="true">
          <span className="h-2 w-2 rounded-full bg-[var(--gold-dim)]" />
          <span className="h-2 w-2 rounded-full bg-[var(--gold-dim)]" />
          <span className="h-2 w-2 rounded-full bg-[var(--success)]" />
        </span>
      </div>

      {/* body with scanlines */}
      <div className="crt-scanlines relative p-3 sm:p-4">{children}</div>

      {/* status line */}
      <div className="flex items-center gap-2 border-t border-[var(--gold-dim)] bg-[var(--surface-2)] px-3 py-1.5 font-mono text-[10px] text-[var(--muted)]">
        <span className="text-[var(--success)]">●</span>
        <span className="truncate">{status}</span>
        <span className="ml-auto text-[var(--gold)]">
          &gt;&nbsp;scan complete<span className="crt-caret">_</span>
        </span>
      </div>
    </div>
  );
}
