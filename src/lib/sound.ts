// Synthesized UI sounds via the Web Audio API — no audio files. Style: quiet,
// percussive mechanical "key clack" (typewriter-ish) rather than musical beeps.
// Off by default; enabled from the header toggle (which also satisfies the
// browser autoplay gesture requirement).

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

/** Short band-passed noise burst — the "click" of a mechanical key. */
function noise(c: AudioContext, t: number, dur: number, freq: number, q: number, gain: number) {
  const len = Math.max(1, Math.ceil(c.sampleRate * dur));
  const buf = c.createBuffer(1, len, c.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
  const src = c.createBufferSource();
  src.buffer = buf;
  const bp = c.createBiquadFilter();
  bp.type = "bandpass";
  bp.frequency.value = freq;
  bp.Q.value = q;
  const g = c.createGain();
  g.gain.setValueAtTime(gain, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  src.connect(bp);
  bp.connect(g);
  g.connect(c.destination);
  src.start(t);
  src.stop(t + dur);
}

/** Low sine "thock" — the body of the key hitting. */
function thock(c: AudioContext, t: number, dur: number, freq: number, gain: number) {
  const osc = c.createOscillator();
  const g = c.createGain();
  osc.type = "sine";
  osc.frequency.setValueAtTime(freq, t);
  osc.frequency.exponentialRampToValueAtTime(freq * 0.6, t + dur);
  g.gain.setValueAtTime(gain, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  osc.connect(g);
  g.connect(c.destination);
  osc.start(t);
  osc.stop(t + dur + 0.01);
}

// Faint single tick on hover.
export function playHover() {
  if (!enabled) return;
  const c = ensureCtx();
  if (!c) return;
  noise(c, c.currentTime, 0.012, 2600, 1.2, 0.012);
}

// Crisp key clack on click: noise tick + low thock.
export function playClick() {
  if (!enabled) return;
  const c = ensureCtx();
  if (!c) return;
  const t = c.currentTime;
  noise(c, t, 0.022, 2200, 0.9, 0.03);
  thock(c, t, 0.035, 180, 0.035);
}

// Heavier clack on close / back / exit (a different, deeper key).
export function playClose() {
  if (!enabled) return;
  const c = ensureCtx();
  if (!c) return;
  const t = c.currentTime;
  noise(c, t, 0.03, 1300, 0.7, 0.03);
  thock(c, t, 0.05, 120, 0.04);
}
