// UI sounds — plays three short user-provided clips (hover / click / close).
// Decoded once into AudioBuffers via the Web Audio API so they can overlap with
// near-zero latency. Off by default; enabled from the header toggle (which also
// satisfies the browser autoplay gesture requirement).

const FILES = {
  hover: "/sounds/hover.mp3",
  click: "/sounds/click.mp3",
  close: "/sounds/close.mp3",
} as const;

type SoundName = keyof typeof FILES;

// Per-sound output gain (the source files differ in loudness / length).
const GAIN: Record<SoundName, number> = {
  hover: 0.35,
  click: 0.6,
  close: 0.6,
};

let ctx: AudioContext | null = null;
let enabled = false;
let initialized = false;
const buffers: Partial<Record<SoundName, AudioBuffer>> = {};
let loading = false;
// Throttle hover so rapid pointer travel doesn't machine-gun the clip.
let lastHoverAt = 0;

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

async function loadBuffers(): Promise<void> {
  const c = ensureCtx();
  if (!c || loading) return;
  loading = true;
  await Promise.all(
    (Object.keys(FILES) as SoundName[]).map(async (name) => {
      if (buffers[name]) return;
      try {
        const res = await fetch(FILES[name]);
        const arr = await res.arrayBuffer();
        buffers[name] = await c.decodeAudioData(arr);
      } catch {
        /* ignore a failed clip */
      }
    }),
  );
  loading = false;
}

export function initSound(): void {
  if (initialized || typeof window === "undefined") return;
  initialized = true;
  try {
    enabled = localStorage.getItem("tark:sound") === "on";
  } catch {
    /* ignore */
  }
  if (enabled) void loadBuffers();
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
  if (v) {
    ensureCtx();
    void loadBuffers();
  }
}

function play(name: SoundName) {
  if (!enabled) return;
  const c = ensureCtx();
  const buf = buffers[name];
  if (!c || !buf) {
    // Buffers not decoded yet — kick off loading for next time.
    void loadBuffers();
    return;
  }
  const src = c.createBufferSource();
  src.buffer = buf;
  const g = c.createGain();
  g.gain.value = GAIN[name];
  src.connect(g);
  g.connect(c.destination);
  src.start();
}

export function playHover() {
  if (!enabled) return;
  const now = typeof performance !== "undefined" ? performance.now() : 0;
  if (now - lastHoverAt < 60) return;
  lastHoverAt = now;
  play("hover");
}

export function playClick() {
  play("click");
}

export function playClose() {
  play("close");
}
