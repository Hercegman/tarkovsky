// Synthesized "military digital" UI sounds via the Web Audio API — no audio
// files needed. Short square/sawtooth blips with fast envelopes. Off by default;
// the user enables it from the header toggle (which also satisfies the browser
// autoplay gesture requirement).

let ctx: AudioContext | null = null;
let enabled = false;
let initialized = false;

function ensureCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    const AC =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;
    if (AC) ctx = new AC();
  }
  if (ctx && ctx.state === "suspended") void ctx.resume();
  return ctx;
}

export function initSound(): void {
  if (initialized || typeof window === "undefined") return;
  initialized = true;
  try {
    enabled = localStorage.getItem("tark:sound") === "on";
  } catch {
    /* ignore */
  }
}

export function isSoundEnabled(): boolean {
  return enabled;
}

export function setSoundEnabled(v: boolean): void {
  enabled = v;
  try {
    localStorage.setItem("tark:sound", v ? "on" : "off");
  } catch {
    /* ignore */
  }
  if (v) ensureCtx();
}

interface Tone {
  freq: number;
  type: OscillatorType;
  dur: number;
  gain?: number;
  slideTo?: number;
}

function blip(tones: Tone[]): void {
  if (!enabled) return;
  const c = ensureCtx();
  if (!c) return;
  let t = c.currentTime;
  for (const tn of tones) {
    const osc = c.createOscillator();
    const g = c.createGain();
    osc.type = tn.type;
    osc.frequency.setValueAtTime(tn.freq, t);
    if (tn.slideTo) {
      osc.frequency.exponentialRampToValueAtTime(tn.slideTo, t + tn.dur);
    }
    const peak = tn.gain ?? 0.04;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(peak, t + 0.005);
    g.gain.exponentialRampToValueAtTime(0.0001, t + tn.dur);
    osc.connect(g);
    g.connect(c.destination);
    osc.start(t);
    osc.stop(t + tn.dur + 0.02);
    t += tn.dur * 0.55;
  }
}

// Subtle high tick on hover.
export const playHover = () =>
  blip([{ freq: 1300, type: "square", dur: 0.025, gain: 0.018 }]);

// Two-tone confirm on click.
export const playClick = () =>
  blip([
    { freq: 640, type: "square", dur: 0.045, gain: 0.05 },
    { freq: 960, type: "square", dur: 0.05, gain: 0.045 },
  ]);

// Descending sweep on close / back / exit.
export const playClose = () =>
  blip([{ freq: 720, type: "sawtooth", dur: 0.13, gain: 0.045, slideTo: 280 }]);
