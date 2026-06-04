# Sounds

Part of [[Tarkovsky]]. Synthesized "military digital" UI sounds — no audio files.

## How it works

- `src/lib/sound.ts` — Web Audio API synth. Short square/sawtooth blips with fast
  gain envelopes:
  - `playHover()` — subtle high tick on hover.
  - `playClick()` — two-tone confirm on click.
  - `playClose()` — descending sweep on close/back/exit.
  - `enabled` flag persisted in `localStorage` (`tark:sound`), **off by default**.
  - `AudioContext` is created/resumed lazily on first gesture (autoplay policy).
- `src/components/sound-controller.tsx` — mounted in the root layout; attaches
  global listeners: `mouseover`/`mouseout` (hover, de-duped per element) and a
  capture-phase `click`. Elements matching `[data-sound='close']` or
  `[aria-label='Close']` play the close sound; other interactive elements play
  click.
- `src/components/sound-toggle.tsx` — the 🔊/🔇 icon in the header; toggling
  enables sound, persists it, and plays a click (which also unlocks audio).

## Tuning

Adjust frequencies / durations / gains in the `playHover/playClick/playClose`
definitions in `sound.ts`. Keep `gain` low (≈0.02–0.05) so it stays subtle.
To add a sound to a specific control, give it `data-sound="close"` or rely on the
global click handler.
