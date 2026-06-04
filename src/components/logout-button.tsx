"use client";

import { useState } from "react";
import { signOut } from "next-auth/react";
import { AnimatePresence, motion } from "motion/react";

export function LogoutButton({
  className = "",
  label = "Log out",
}: {
  className?: string;
  label?: string;
}) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={className}>
        {label}
      </button>

      <AnimatePresence>
        {open && (
          <>
            <motion.div
              className="fixed inset-0 z-[1000] bg-black/60 backdrop-blur-sm"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => !busy && setOpen(false)}
            />
            <div className="fixed inset-0 z-[1001] flex items-center justify-center p-4">
              <motion.div
                role="alertdialog"
                aria-modal="true"
                className="w-full max-w-sm rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-2xl"
                initial={{ opacity: 0, scale: 0.94, y: 12 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.96 }}
                transition={{ type: "spring", stiffness: 280, damping: 26 }}
              >
                <h2 className="font-display text-lg font-bold text-[var(--foreground)]">
                  Log out?
                </h2>
                <p className="mt-1 text-sm text-[var(--muted)]">
                  You&apos;ll need to sign in again to track quest progress.
                </p>
                <div className="mt-5 flex justify-end gap-2">
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => setOpen(false)}
                    className="rounded-lg border border-[var(--border)] px-4 py-2 text-sm text-[var(--muted)] transition-colors hover:text-[var(--foreground)]"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => {
                      setBusy(true);
                      signOut({ callbackUrl: "/" });
                    }}
                    className="rounded-lg border border-[var(--danger)] bg-[var(--danger)]/15 px-4 py-2 text-sm font-medium text-[var(--danger)] transition-colors hover:bg-[var(--danger)]/25 disabled:opacity-60"
                  >
                    {busy ? "Logging out…" : "Log out"}
                  </button>
                </div>
              </motion.div>
            </div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
