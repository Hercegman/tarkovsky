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

const VOL_KEY = "tark:vol";
const LEGACY_KEY = "tark:sound"; // old on/off flag — migrated to a volume level
const LEGACY_DEFAULT_VOL = 0.7; // volume given to users who had sound "on"

let ctx: AudioContext | null = null;
// Master volume 0..1; 0 means muted (off by default). Multiplies per-sound gain.
let volume = 0;
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
    const stored = localStorage.getItem(VOL_KEY);
    if (stored !== null) {
      volume = clampVol(parseFloat(stored));
    } else if (localStorage.getItem(LEGACY_KEY) === "on") {
      // Migrate users who had the old on/off toggle enabled.
      volume = LEGACY_DEFAULT_VOL;
      localStorage.setItem(VOL_KEY, String(volume));
    }
  } catch {
    /* ignore */
  }
  if (volume > 0) void loadBuffers();
}

function clampVol(v: number): number {
  if (!Number.isFinite(v)) return 0;
  return Math.min(1, Math.max(0, v));
}

export function getVolume(): number {
  return volume;
}

export function setVolume(v: number): void {
  volume = clampVol(v);
  try {
    localStorage.setItem(VOL_KEY, String(volume));
  } catch {
    /* ignore */
  }
  if (volume > 0) {
    ensureCtx();
    void loadBuffers();
  }
}

export function isSoundEnabled(): boolean {
  return volume > 0;
}

function play(name: SoundName) {
  if (volume <= 0) return;
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
  g.gain.value = GAIN[name] * volume;
  src.connect(g);
  g.connect(c.destination);
  src.start();
}

export function playHover() {
  if (volume <= 0) return;
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
