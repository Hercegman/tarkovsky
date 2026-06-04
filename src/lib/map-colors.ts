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

// Distinct shape per category family so layers are tellable apart at a glance.
const SHAPES: Record<string, string> = {
  quest: "diamond",
  exfil_pmc: "triangle",
  exfil_scav: "triangle",
  exfil_transit: "triangle",
  exfil_shared: "triangle",
  spawn_pmc: "square",
  spawn_scav: "square",
  spawn_sniper: "square",
  spawn_boss: "star",
  spawn_cultist: "star",
  locked: "cross",
  loot_key: "key",
  lever: "cross",
  stationarygun: "square",
};

export function categoryShape(id: string): string {
  return SHAPES[id] ?? "circle";
}

/** Inline SVG (16×16) for a category marker. */
export function shapeSvg(shape: string, color: string): string {
  const f = `fill='${color}' stroke='#14150f' stroke-width='1.4' stroke-linejoin='round'`;
  const wrap = (inner: string) =>
    `<svg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 16 16'>${inner}</svg>`;
  switch (shape) {
    case "square":
      return wrap(`<rect x='3' y='3' width='10' height='10' ${f}/>`);
    case "triangle":
      return wrap(`<polygon points='8,2.5 13.5,13 2.5,13' ${f}/>`);
    case "diamond":
      return wrap(`<polygon points='8,1.5 14.5,8 8,14.5 1.5,8' ${f}/>`);
    case "star":
      return wrap(
        `<polygon points='8,1.5 9.7,6 14.5,6 10.6,9 12.2,14 8,10.8 3.8,14 5.4,9 1.5,6 6.3,6' ${f}/>`,
      );
    case "cross":
      return wrap(
        `<path d='M6,2 h4 v4 h4 v4 h-4 v4 h-4 v-4 h-4 v-4 h4 z' ${f}/>`,
      );
    case "key":
      return wrap(
        `<circle cx='5.5' cy='6' r='3.2' fill='none' stroke='${color}' stroke-width='2'/><path d='M8,8 L13.5,13.5 M11.5,11.5 l1.6,-0.4 M12.5,12.5 l1,-1.4' stroke='${color}' stroke-width='2' fill='none' stroke-linecap='round'/>`,
      );
    default:
      return wrap(`<circle cx='8' cy='8' r='5' ${f}/>`);
  }
}

export function shapeDataUri(id: string): string {
  return `data:image/svg+xml,${encodeURIComponent(shapeSvg(categoryShape(id), categoryColor(id)))}`;
}
