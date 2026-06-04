"use client";

import { useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import { groupQuestParts } from "@/lib/quest-utils";
import { useProgress } from "@/hooks/use-progress";

export interface QuestRow {
  id: string;
  title: string;
  requiredLevel: number | null;
  kappaRequired: boolean;
}

export function TraderQuestList({ quests }: { quests: QuestRow[] }) {
  const groups = groupQuestParts(quests);
  const { completed } = useProgress();
  const isDone = (id: string) => completed?.has(id) ?? false;

  return (
    <ol className="space-y-2">
      {groups.map((g, i) =>
        g.isSeries ? (
          <SeriesRow
            key={g.key}
            index={i + 1}
            base={g.base}
            items={g.items}
            isDone={isDone}
          />
        ) : (
          <li key={g.key}>
            <QuestLink index={i + 1} quest={g.items[0]} done={isDone(g.items[0].id)} />
          </li>
        ),
      )}
    </ol>
  );
}

function QuestLink({
  index,
  quest,
  done,
}: {
  index: number;
  quest: QuestRow;
  done: boolean;
}) {
  return (
    <Link
      href={`/quest/${quest.id}`}
      className={`flex items-center gap-3 rounded-lg border px-4 py-3 transition-colors ${
        done
          ? "border-[var(--success)]/50 bg-[var(--success)]/10"
          : "border-[var(--border)] bg-[var(--surface)] hover:border-[var(--gold-dim)]"
      }`}
    >
      <span className="w-6 text-right font-mono text-xs text-[var(--muted)]">
        {index}
      </span>
      <span className={`flex-1 font-medium ${done ? "text-[var(--success)]" : ""}`}>
        {quest.title}
      </span>
      {quest.requiredLevel && (
        <span className="text-xs text-[var(--muted)]">Lvl {quest.requiredLevel}</span>
      )}
      {quest.kappaRequired && (
        <span className="rounded bg-[var(--brown)]/40 px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-[var(--gold-hi)]">
          Kappa
        </span>
      )}
      {done && <span className="text-sm text-[var(--success)]">✓</span>}
    </Link>
  );
}

function SeriesRow({
  index,
  base,
  items,
  isDone,
}: {
  index: number;
  base: string;
  items: QuestRow[];
  isDone: (id: string) => boolean;
}) {
  const [open, setOpen] = useState(false);
  const doneCount = items.filter((q) => isDone(q.id)).length;
  const allDone = doneCount === items.length;

  return (
    <li>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className={`flex w-full items-center gap-3 rounded-lg border px-4 py-3 text-left transition-colors ${
          allDone
            ? "border-[var(--success)]/50 bg-[var(--success)]/10"
            : "border-[var(--border)] bg-[var(--surface)] hover:border-[var(--gold-dim)]"
        }`}
      >
        <span className="w-6 text-right font-mono text-xs text-[var(--muted)]">
          {index}
        </span>
        <span className={`flex-1 font-medium ${allDone ? "text-[var(--success)]" : ""}`}>
          {base}
          <span className="ml-2 rounded bg-[var(--surface-2)] px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-[var(--muted)]">
            {items.length} parts
          </span>
        </span>
        <span className="text-xs text-[var(--muted)]">
          {doneCount}/{items.length}
        </span>
        <motion.span animate={{ rotate: open ? 90 : 0 }} className="text-[var(--gold)]">
          ›
        </motion.span>
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.ol
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden pl-9"
          >
            {items.map((q, i) => (
              <li key={q.id} className="mt-2">
                <Link
                  href={`/quest/${q.id}`}
                  className={`flex items-center gap-3 rounded-lg border px-3 py-2 text-sm transition-colors ${
                    isDone(q.id)
                      ? "border-[var(--success)]/50 bg-[var(--success)]/10 text-[var(--success)]"
                      : "border-[var(--border)] bg-[var(--surface-2)] hover:border-[var(--gold-dim)]"
                  }`}
                >
                  <span className="font-mono text-xs text-[var(--muted)]">
                    {i + 1}
                  </span>
                  <span className="flex-1">{q.title}</span>
                  {isDone(q.id) && <span>✓</span>}
                </Link>
              </li>
            ))}
          </motion.ol>
        )}
      </AnimatePresence>
    </li>
  );
}
