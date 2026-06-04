"use client";

import { useEffect, useState } from "react";

const PREFIXES = [
  /^hand over the found in raid item:\s*/i,
  /^hand over the item:\s*/i,
  /^hand over\s*/i,
  /^obtain\s*/i,
  /^find\s*/i,
];

function clean(o: string): string {
  for (const re of PREFIXES) if (re.test(o)) return o.replace(re, "");
  return o;
}

/**
 * Per-objective checklist persisted in localStorage (per browser, no login
 * needed) — handy for collection quests like Collector to track items you've
 * gathered.
 */
export function ObjectiveChecklist({
  questId,
  objectives,
}: {
  questId: string;
  objectives: string[];
}) {
  const storageKey = `tark:items:${questId}`;
  const [checked, setChecked] = useState<Set<number>>(new Set());
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) setChecked(new Set(JSON.parse(raw) as number[]));
    } catch {
      /* ignore */
    }
    setReady(true);
  }, [storageKey]);

  function toggle(i: number) {
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      try {
        localStorage.setItem(storageKey, JSON.stringify([...next]));
      } catch {
        /* ignore */
      }
      return next;
    });
  }

  function reset() {
    setChecked(new Set());
    try {
      localStorage.removeItem(storageKey);
    } catch {
      /* ignore */
    }
  }

  const done = checked.size;
  const total = objectives.length;
  const pct = total ? Math.round((done / total) * 100) : 0;

  return (
    <div>
      <div className="mb-3 flex items-center gap-3">
        <div className="h-2 flex-1 overflow-hidden rounded-full bg-[var(--surface-2)]">
          <div
            className="h-full rounded-full bg-[var(--gold)] transition-all"
            style={{ width: `${pct}%` }}
          />
        </div>
        <span className="shrink-0 text-xs text-[var(--muted)]">
          {done}/{total} collected
        </span>
        {done > 0 && (
          <button
            type="button"
            onClick={reset}
            className="shrink-0 text-xs text-[var(--muted)] hover:text-[var(--danger)]"
          >
            Reset
          </button>
        )}
      </div>

      <ul className="space-y-1">
        {objectives.map((o, i) => {
          const on = checked.has(i);
          return (
            <li key={i}>
              <button
                type="button"
                onClick={() => toggle(i)}
                disabled={!ready}
                className={`flex w-full items-start gap-3 rounded-lg border px-3 py-2 text-left text-sm transition-colors ${
                  on
                    ? "border-[var(--success)]/50 bg-[var(--success)]/10 text-[var(--success)]"
                    : "border-[var(--border)] bg-[var(--surface-2)] hover:border-[var(--gold-dim)]"
                }`}
              >
                <span
                  className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-sm border text-[10px] ${
                    on
                      ? "border-[var(--success)] bg-[var(--success)] text-[var(--background)]"
                      : "border-[var(--gold-dim)] text-transparent"
                  }`}
                >
                  ✓
                </span>
                <span className={on ? "line-through opacity-80" : ""}>
                  {clean(o)}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
