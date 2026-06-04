// Distinct per-category marker colors. The wiki ships nearly every category as
// the same pink, so we assign our own. Important categories get curated colors;
// anything else gets a stable hash-based hue so every category is distinct.

const CURATED: Record<string, string> = {
  quest: "#e3c170", // gold (highlight)
  exfil_pmc: "#57b85a", // green
  exfil_scav: "#4f8fe0", // blue
  exfil_transit: "#46c7c7", // cyan
  exfil_shared: "#7fd06a",
  spawn_pmc: "#e05a5a", // red
  spawn_scav: "#d98a3a", // orange
  spawn_sniper: "#b06be0", // purple
  spawn_boss: "#e34db8", // magenta
  spawn_cultist: "#8a5cf0", // violet
  lever: "#c9c9c9",
  stationarygun: "#9aa06a",
  locked: "#e0c020", // yellow
  loot_key: "#f0d840", // bright yellow
  loot_loose: "#cdbf72",
  container_ammo: "#b07a45",
  container_weapon: "#a85f3a",
  container_safe: "#8fa0b0",
  container_cash: "#5fae7a",
  container_medical: "#e88aa0",
  container_pc: "#6fb0c0",
};

function hashHue(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h % 360;
}

export function categoryColor(id: string): string {
  if (CURATED[id]) return CURATED[id];
  // Deterministic distinct hue for the long tail of container_* etc.
  return `hsl(${hashHue(id)} 58% 62%)`;
}
