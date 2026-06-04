"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { AnimatePresence, motion } from "motion/react";
import type { Quest } from "@/lib/types";
import { QuestProgressButton } from "./quest-progress-button";

export function QuestQuickView({
  questId,
  onClose,
}: {
  questId: string | null;
  onClose: () => void;
}) {
  const [quest, setQuest] = useState<Quest | null>(null);

  useEffect(() => {
    if (!questId) return;
    let active = true;
    fetch(`/api/quest/${questId}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => active && setQuest(d));
    return () => {
      active = false;
    };
  }, [questId]);

  // Treat as loading until the fetched quest matches the requested id.
  const loaded = quest && quest.id === questId ? quest : null;

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <AnimatePresence>
      {questId && (
        <>
          <motion.div
            className="fixed inset-0 z-[1000] bg-black/60 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.aside
            className="fixed right-0 top-0 z-[1001] flex h-full w-full max-w-md flex-col overflow-y-auto border-l border-[var(--border)] bg-[var(--surface)] shadow-2xl"
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", stiffness: 260, damping: 30 }}
          >
            <button
              onClick={onClose}
              className="absolute right-3 top-3 z-10 rounded-full bg-[var(--surface-2)]/80 px-2.5 py-1 text-sm text-[var(--muted)] backdrop-blur hover:text-[var(--gold)]"
            >
              ✕
            </button>

            {!loaded ? (
              <div className="flex h-40 items-center justify-center text-sm text-[var(--muted)]">
                Loading…
              </div>
            ) : (
              <div>
                {loaded.image && (
                  <div className="relative h-40 w-full">
                    <Image
                      src={loaded.image}
                      alt={loaded.title}
                      fill
                      sizes="448px"
                      className="object-cover opacity-90"
                      unoptimized
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-[var(--surface)] to-transparent" />
                  </div>
                )}
                <div className="p-5">
                  <h2 className="text-xl font-bold">{loaded.title}</h2>
                  <div className="mt-2 flex items-center justify-between gap-3">
                    <div className="flex flex-wrap gap-1.5 text-xs">
                      {loaded.requiredLevel && (
                        <Chip>Lvl {loaded.requiredLevel}</Chip>
                      )}
                      {loaded.kappaRequired && <Chip>Kappa</Chip>}
                      {loaded.maps.slice(0, 2).map((m) => (
                        <Chip key={m}>{m.replace(/-/g, " ")}</Chip>
                      ))}
                    </div>
                    <QuestProgressButton questId={loaded.id} />
                  </div>

                  {loaded.objectives.length > 0 && (
                    <>
                      <h3 className="mt-5 mb-2 text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">
                        Objectives
                      </h3>
                      <ul className="space-y-1.5 text-sm">
                        {loaded.objectives.map((o, i) => (
                          <li key={i} className="flex gap-2">
                            <span className="text-[var(--gold)]">◆</span>
                            <span>{o}</span>
                          </li>
                        ))}
                      </ul>
                    </>
                  )}

                  {loaded.rewards.exp ? (
                    <p className="mt-4 text-sm text-[var(--muted)]">
                      Reward: +{loaded.rewards.exp.toLocaleString()} EXP
                    </p>
                  ) : null}

                  <Link
                    href={`/quest/${loaded.id}`}
                    className="mt-6 block rounded-lg border border-[var(--gold-dim)] py-2.5 text-center text-sm font-medium text-[var(--gold)] transition-colors hover:bg-[var(--gold)] hover:text-[var(--background)]"
                  >
                    Open full quest →
                  </Link>
                </div>
              </div>
            )}
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}

function Chip({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded border border-[var(--border)] bg-[var(--surface-2)] px-1.5 py-0.5 capitalize text-[var(--muted)]">
      {children}
    </span>
  );
}
