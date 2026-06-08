"use client";

import { useEffect, useRef, useState } from "react";
import { initSound, getVolume, setVolume, playClick } from "@/lib/sound";

// Speaker glyph that reflects the current level: muted (x), low (one wave),
// high (two waves). Uses currentColor so the header hover colour applies.
function SpeakerIcon({ volume }: { volume: number }) {
  const muted = volume <= 0;
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {/* speaker body */}
      <path d="M4 9v6h3.5L13 19V5L7.5 9H4z" fill="currentColor" stroke="none" />
      {muted ? (
        <path d="M17 9.5l4 5M21 9.5l-4 5" />
      ) : (
        <>
          <path d="M16 9.2a4 4 0 0 1 0 5.6" />
          {volume > 0.5 && <path d="M18.6 6.8a7.5 7.5 0 0 1 0 10.4" />}
        </>
      )}
    </svg>
  );
}

export function SoundToggle() {
  const [open, setOpen] = useState(false);
  const [vol, setVol] = useState(0);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    initSound();
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setVol(getVolume());
  }, []);

  useEffect(() => {
    function onDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  function onSlide(e: React.ChangeEvent<HTMLInputElement>) {
    const next = Number(e.target.value);
    setVol(next);
    setVolume(next);
    // Live feedback + unlocks the audio context on first gesture.
    if (next > 0) playClick();
  }

  const pct = Math.round(vol * 100);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-label={vol > 0 ? `Sound ${pct}%` : "Sound muted"}
        title={vol > 0 ? `Sound ${pct}%` : "Sound muted"}
        className="flex items-center rounded px-2 py-1.5 text-[var(--muted)] transition-colors hover:text-[var(--gold)]"
      >
        <SpeakerIcon volume={vol} />
      </button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-1 w-56 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3 shadow-2xl">
          <div className="mb-2 flex items-center justify-between text-xs text-[var(--muted)]">
            <span className="uppercase tracking-wide">Volume</span>
            <span className="tabular-nums text-[var(--gold)]">{pct}%</span>
          </div>
          <div className="flex items-center gap-2 text-[var(--muted)]">
            <SpeakerIcon volume={vol} />
            <input
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={vol}
              onChange={onSlide}
              aria-label="Volume"
              className="vol-range flex-1"
            />
          </div>
        </div>
      )}
    </div>
  );
}
