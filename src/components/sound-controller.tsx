"use client";

import { useEffect } from "react";
import { initSound, playHover, playClick, playClose } from "@/lib/sound";

const INTERACTIVE = "a, button, [role='button'], input[type='checkbox']";
const CLOSE_SEL = "[data-sound='close'], [aria-label='Close']";

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
      const el = (e.target as Element | null)?.closest?.(INTERACTIVE);
      if (el && el === lastHover) lastHover = null;
    }
    function onClick(e: MouseEvent) {
      const el = (e.target as Element | null)?.closest?.(INTERACTIVE);
      if (!el) return;
      if (el.matches(CLOSE_SEL)) playClose();
      else playClick();
    }

    document.addEventListener("mouseover", onOver);
    document.addEventListener("mouseout", onOut);
    document.addEventListener("click", onClick, true);
    return () => {
      document.removeEventListener("mouseover", onOver);
      document.removeEventListener("mouseout", onOut);
      document.removeEventListener("click", onClick, true);
    };
  }, []);

  return null;
}
