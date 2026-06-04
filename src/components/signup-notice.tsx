"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";

export function SignupNotice() {
  const [open, setOpen] = useState(true);

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            className="fixed inset-0 z-[1000] bg-black/70 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />
          <div className="fixed inset-0 z-[1001] flex items-center justify-center p-4">
            <motion.div
              role="alertdialog"
              aria-modal="true"
              className="w-full max-w-md rounded-2xl border border-[var(--danger)] bg-[var(--surface)] p-6 shadow-2xl"
              initial={{ opacity: 0, scale: 0.94, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96 }}
              transition={{ type: "spring", stiffness: 280, damping: 26 }}
            >
              <div className="mb-3 flex items-center gap-2">
                <span className="text-xl">⚠️</span>
                <h2 className="font-display text-lg font-bold uppercase tracking-wide text-[var(--danger)]">
                  Important Notice
                </h2>
              </div>
              <p className="text-sm leading-relaxed text-[var(--foreground)]">
                For your safety, do <strong>not</strong> use the same password as
                your real Escape from Tarkov account. Using a unique password here
                prevents your game account from being compromised if this site is
                ever affected by a cyber attack or data breach.
              </p>
              <p className="mt-2 text-xs text-[var(--muted)]">
                This is a fan project — treat it like any third-party site and pick
                a fresh password.
              </p>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="mt-5 w-full rounded-lg border border-[var(--gold-dim)] bg-[var(--gold)] py-2.5 font-medium text-[var(--background)] transition-colors hover:bg-[var(--gold-hi)]"
              >
                I understand
              </button>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}
