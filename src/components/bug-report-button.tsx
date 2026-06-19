"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";

type Status = "idle" | "sending" | "sent" | "error";

export function BugReportButton() {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [contact, setContact] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState("");
  // undefined = still checking, true = logged in, false = anonymous.
  const [authed, setAuthed] = useState<boolean | undefined>(undefined);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Bug reports require an account — check login state once on mount.
  useEffect(() => {
    let active = true;
    fetch("/api/me", { cache: "no-store" })
      .then((r) => active && setAuthed(r.ok))
      .catch(() => active && setAuthed(false));
    return () => {
      active = false;
    };
  }, []);

  // Close on Escape; focus the textarea when the form is shown.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    if (authed) textareaRef.current?.focus();
    return () => window.removeEventListener("keydown", onKey);
  }, [open, authed]);

  function reset() {
    setMessage("");
    setContact("");
    setStatus("idle");
    setError("");
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (status === "sending") return;
    setStatus("sending");
    setError("");
    try {
      const page =
        typeof window !== "undefined"
          ? window.location.pathname + window.location.search
          : undefined;
      const res = await fetch("/api/bugs", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ message, contact: contact || undefined, page }),
      });
      if (res.ok) {
        setStatus("sent");
        setTimeout(() => {
          setOpen(false);
          reset();
        }, 1400);
      } else if (res.status === 401) {
        // Session expired or never existed — fall back to the login prompt.
        setAuthed(false);
        setStatus("idle");
      } else {
        const data = await res.json().catch(() => ({}));
        setStatus("error");
        setError(data.error || "Something went wrong. Please try again.");
      }
    } catch {
      setStatus("error");
      setError("Network error. Please try again.");
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Report a bug"
        className="fixed bottom-4 right-4 z-50 flex items-center gap-2 rounded border border-[var(--gold-dim)] bg-[var(--surface)]/90 px-3 py-2 text-sm font-medium text-[var(--gold)] shadow-lg backdrop-blur transition-colors hover:bg-[var(--gold)] hover:text-[var(--background)]"
      >
        <span aria-hidden>🐞</span>
        <span className="hidden sm:inline">Report a bug</span>
      </button>

      {open && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4"
          onClick={() => setOpen(false)}
          role="dialog"
          aria-modal="true"
          aria-label="Report a bug"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-xl"
          >
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-display text-lg text-[var(--gold-hi)]">
                Report a bug
              </h2>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close"
                className="rounded px-2 text-[var(--muted)] hover:text-[var(--foreground)]"
              >
                ✕
              </button>
            </div>

            {authed === undefined ? (
              <p className="py-4 text-sm text-[var(--muted)]">Loading…</p>
            ) : authed === false ? (
              // Not logged in — block the report and point to login.
              <div className="py-2">
                <p className="mb-4 text-sm text-[var(--foreground)]">
                  You need to be logged in to report a bug.
                </p>
                <div className="flex justify-end gap-2">
                  <Link
                    href="/register"
                    className="rounded border border-[var(--border)] px-3 py-2 text-sm text-[var(--muted)] hover:text-[var(--foreground)]"
                  >
                    Register
                  </Link>
                  <Link
                    href="/login"
                    className="rounded border border-[var(--gold-dim)] px-3 py-2 text-sm font-medium text-[var(--gold)] transition-colors hover:bg-[var(--gold)] hover:text-[var(--background)]"
                  >
                    Log in
                  </Link>
                </div>
              </div>
            ) : (
              <form onSubmit={submit}>
                <label className="mb-1 block text-sm text-[var(--muted)]">
                  What went wrong?
                </label>
                <textarea
                  ref={textareaRef}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={5}
                  maxLength={1000}
                  placeholder="Describe the bug — what you did, what you expected, what happened."
                  className="mb-1 w-full resize-y rounded border border-[var(--border)] bg-[var(--surface-2)] p-2 text-sm text-[var(--foreground)] outline-none focus:border-[var(--gold-dim)]"
                />
                <div className="mb-3 text-right text-xs text-[var(--muted)]">
                  {message.length}/1000
                </div>

                <label className="mb-1 block text-sm text-[var(--muted)]">
                  Contact <span className="opacity-70">(optional)</span>
                </label>
                <input
                  type="text"
                  value={contact}
                  onChange={(e) => setContact(e.target.value)}
                  maxLength={120}
                  placeholder="Discord tag or email, if you want a reply"
                  className="mb-4 w-full rounded border border-[var(--border)] bg-[var(--surface-2)] p-2 text-sm text-[var(--foreground)] outline-none focus:border-[var(--gold-dim)]"
                />

                {error && (
                  <p className="mb-3 text-sm text-[var(--danger)]">{error}</p>
                )}
                {status === "sent" && (
                  <p className="mb-3 text-sm text-[var(--success)]">
                    Thanks — report sent. 🫡
                  </p>
                )}

                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setOpen(false)}
                    className="rounded border border-[var(--border)] px-3 py-2 text-sm text-[var(--muted)] hover:text-[var(--foreground)]"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={status === "sending" || status === "sent"}
                    className="rounded border border-[var(--gold-dim)] px-3 py-2 text-sm font-medium text-[var(--gold)] transition-colors hover:bg-[var(--gold)] hover:text-[var(--background)] disabled:opacity-50"
                  >
                    {status === "sending" ? "Sending…" : "Send report"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}
