"use client";

import { useEffect } from "react";
import { initSound, playHover, playClick, playClose } from "@/lib/sound";

const INTERACTIVE = "a, button, [role='button'], input[type='checkbox']";
const CLOSE_SEL = "[data-sound='close'], [aria-label='Close']";

// A "back"/close action: an explicit marker, or a link/button whose label starts
// with the ← arrow (our back links: "← All maps", "← Back to your profile", …).
function isBack(el: Element): boolean {
  if (el.matches(CLOSE_SEL)) return true;
  return (el.textContent ?? "").trim().startsWith("←");
}

/** Mounts global listeners that play UI sounds on hover/click/close. */
export function SoundController() {
  useEffect(() => {
    initSound();
    let lastHover: Element | null = null;

    function onOver(e: MouseEvent) {
      const el = (e.target as Element | null)?.closest?.(INTERACTIVE);
      if (el && el !== lastHover) {
        lastHover = el;
        playHover();
      }
    }
    function onOut(e: MouseEvent) {
      const related = e.relatedTarget as Node | null;
      // Still inside the same interactive element (moved onto a child) — keep it
      // so jittering the cursor over one button doesn't re-trigger the hover sound.
      if (lastHover && related && lastHover.contains(related)) return;
      const el = (e.target as Element | null)?.closest?.(INTERACTIVE);
      if (el && el === lastHover) lastHover = null;
    }
    function onClick(e: MouseEvent) {
      const el = (e.target as Element | null)?.closest?.(INTERACTIVE);
      if (!el) return;
      if (isBack(el)) playClose();
      else playClick();
    }
    // Thumb buttons: button 3 = "mouse 4" (back), button 4 = "mouse 5" (forward).
    function onMouseDown(e: MouseEvent) {
      if (e.button === 3) playClick(); // mouse 4 (back thumb) → click sound
      else if (e.button === 4) playClose(); // mouse 5 (forward thumb) → close sound
    }

    document.addEventListener("mouseover", onOver);
    document.addEventListener("mouseout", onOut);
    document.addEventListener("click", onClick, true);
    document.addEventListener("mousedown", onMouseDown, true);
    return () => {
      document.removeEventListener("mouseover", onOver);
      document.removeEventListener("mouseout", onOut);
      document.removeEventListener("click", onClick, true);
      document.removeEventListener("mousedown", onMouseDown, true);
    };
  }, []);

  return null;
}
