"use client";

import { useEffect, useState } from "react";
import { initSound, isSoundEnabled, setSoundEnabled, playClick } from "@/lib/sound";

export function SoundToggle() {
  const [on, setOn] = useState(false);

  useEffect(() => {
    initSound();
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setOn(isSoundEnabled());
  }, []);

  function toggle() {
    const next = !on;
    setSoundEnabled(next);
    setOn(next);
    if (next) playClick(); // audible confirmation + unlocks the audio context
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={on ? "Disable sound" : "Enable sound"}
      title={on ? "Sound on" : "Sound off"}
      className="rounded px-2 py-1.5 text-[var(--muted)] transition-colors hover:text-[var(--gold)]"
    >
      {on ? "🔊" : "🔇"}
    </button>
  );
}
