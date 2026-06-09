/*
 * Project Tarkovsky — ammunition data (wiki-only).
 *
 * Two wiki sources, merged by ammo name:
 *  - Ballistics page §"Ammo and penetration chart": a master table with one row
 *    per ammo across all calibers — DMG, penetration, armor DMG %, accuracy,
 *    recoil, bleed, muzzle speed, and the bullet's effectiveness level (0–6) vs
 *    each armor class 1–6 (the famous colour grid). Authoritative for stats.
 *  - Each caliber page's "Types" table: adds the icon image, the trader/source
 *    string (e.g. "Prapor LL2"), heat % and durability burn %.
 *
 *   → content/ammo.json (Record<id, Ammunition>), public/ammo/<id>.<ext>
 *
 * Source: EFT Wiki (CC BY-NC-SA). No tarkov.dev, no game-mined data. The 0–6
 * effectiveness is mapped to an approximate penetration % for the charts.
 *
 * Usage: node scripts/ingest-ammo.mts [--limit N] [--caliber "7.62x39mm"]
 */
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const UA =
  "ProjectTarkovsky/1.0 (https://github.com/Hercegman/tarkovsky)";
const API = "https://escapefromtarkov.fandom.com/api.php";
const ROOT = process.cwd();
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

const argLimit = (() => {
  const i = process.argv.indexOf("--limit");
  return i >= 0 ? Number(process.argv[i + 1]) : null;
})();
const argCaliber = (() => {
  const i = process.argv.indexOf("--caliber");
  return i >= 0 ? process.argv[i + 1] : null;
})();

async function api(p: Record<string, string>): Promise<any> {
  const url = new URL(API);
  url.search = new URLSearchParams({ format: "json", formatversion: "2", maxlag: "5", ...p }).toString();
  for (let a = 0; a < 4; a++) {
    const res = await fetch(url, { headers: { "User-Agent": UA } });
    if (res.status === 429 || res.status === 503) { await sleep(4000); continue; }
    if (!res.ok) throw new Error(`API ${res.status}`);
    return res.json();
  }
  throw new Error("API retries exhausted");
}
function chunk<T>(a: T[], n: number): T[][] {
  const o: T[][] = [];
  for (let i = 0; i < a.length; i += n) o.push(a.slice(i, i + n));
  return o;
}
const slug = (s: string) =>
  s.toLowerCase().replace(/['’]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
const extFor = (b: Uint8Array) => (b[0] === 0x89 ? "png" : b[0] === 0xff ? "jpg" : b[0] === 0x52 ? "webp" : "png");
const stripTags = (s: string) => s.replace(/<[^>]+>/g, "").trim();
function num(s: string | null): number | null {
  if (s == null) return null;
  const m = stripTags(s).split("|").pop()!.replace(/,/g, "").match(/-?\d+(\.\d+)?/);
  return m ? Number(m[0]) : null;
}
// First [[link]] in a string → its display text (after a pipe if present).
function linkText(s: string): string | null {
  const m = s.match(/\[\[([^\]]+)\]\]/);
  if (!m) return stripTags(s).trim() || null;
  const inner = m[1];
  const bar = inner.indexOf("|");
  return (bar >= 0 ? inner.slice(bar + 1) : inner).trim() || null;
}
// First [[link]] in a string → its target page (before a pipe if present).
function linkPage(s: string): string | null {
  const m = s.match(/\[\[([^\]]+)\]\]/);
  if (!m) return null;
  return m[1].split("|")[0].trim() || null;
}

// A wikitable cell may be "attrs | value" — attributes never contain a pipe, so
// strip a leading attribute segment (it has `=` and isn't a [[link]]). Cells are
// `|`-prefixed; some tables use `!` (header cells) for Icon/Name even in data rows.
function cellValue(raw: string): string {
  const v = raw.replace(/^\s*[|!]/, "").trim();
  const pipe = v.indexOf("|");
  if (pipe >= 0) {
    const head = v.slice(0, pipe);
    if (/=/.test(head) && !head.includes("[[")) return v.slice(pipe + 1).trim();
  }
  return v;
}
// Split a wikitable into its rows (cell arrays). Rows are separated by `|-`;
// each cell sits on its own `|`- or `!`-prefixed line.
function tableRows(table: string): string[][] {
  const body = table.replace(/^[\s\S]*?\n/, "").replace(/\n\|\}[\s\S]*$/, "");
  return body
    .split(/\n\|-/)
    .map((chunk) =>
      chunk
        .split(/\n(?=[|!])/)
        .map((l) => l.trim())
        .filter((l) => (l.startsWith("|") || l.startsWith("!")) && !l.startsWith("|}"))
        .map(cellValue),
    )
    .filter((cells) => cells.length > 0);
}
// Extract the {| … |} table that contains `marker` (first match).
function tableContaining(wt: string, marker: RegExp): string | null {
  let idx = 0;
  while (true) {
    const start = wt.indexOf("{|", idx);
    if (start < 0) return null;
    const end = wt.indexOf("\n|}", start);
    if (end < 0) return null;
    const table = wt.slice(start, end + 3);
    if (marker.test(table)) return table;
    idx = end + 3;
  }
}

// Effectiveness level 0–6 → approximate penetration chance % (for the charts).
const PEN_PCT = [0, 10, 25, 45, 65, 85, 100];
// Effectiveness level → short label (from the wiki "How to read" legend).
const EFF_LABEL = ["Pointless", "It's possible, but…", "Magdump only", "Slightly effective", "Effective", "Very effective", "Usually ignores"];

function bulletType(name: string, caliber: string): string | null {
  const rest = name.replace(caliber, "").trim();
  const upper = ` ${rest.toUpperCase()} `;
  const has = (t: string) => upper.includes(` ${t} `) || upper.includes(`${t} `) || rest.toUpperCase().includes(t);
  if (/buck|shot/i.test(rest)) return "Buckshot";
  if (/slug/i.test(rest)) return "Slug";
  if (/flechette/i.test(rest)) return "Flechette";
  if (has("AP") || /\bAP\b/.test(rest)) return "AP";
  if (/JHP|HP\b|hollow/i.test(rest)) return "HP";
  if (/FMJ/i.test(rest)) return "FMJ";
  if (/tracer|\bT\b/i.test(rest)) return "Tracer";
  return rest || null;
}

interface AmmoRec {
  id: string; name: string; image: string | null; caliber: string;
  damage: number | null; penetration: number | null; armorDamage: number | null;
  accuracy: number | null; recoil: number | null; lightBleed: number | null;
  heavyBleed: number | null; velocity: number | null; heat: number | null;
  durabilityBurn: number | null; bulletType: string | null; traderSource: string | null;
  tags: string[]; armorClass: number[]; penPct: number[]; effLabels: string[];
  source: { url: string; license: string; wiki: string };
}

const wikiUrl = (title: string) =>
  `https://escapefromtarkov.fandom.com/wiki/${encodeURIComponent(title.replace(/ /g, "_"))}`;

async function main() {
  await mkdir(path.join(ROOT, "content"), { recursive: true });
  await mkdir(path.join(ROOT, "public", "ammo"), { recursive: true });

  // 1) Master ballistics + effectiveness table (Ballistics §6).
  const ballisticsWt = (await api({ action: "parse", page: "Ballistics", section: "6", prop: "wikitext" }))
    .parse?.wikitext as string | undefined;
  if (!ballisticsWt) throw new Error("Ballistics section 6 missing");
  const master = tableContaining(ballisticsWt, /Bullet effectiveness against armor class/i);
  if (!master) throw new Error("master penetration table not found");

  const ammo = new Map<string, AmmoRec>(); // id -> record
  const byName = new Map<string, string>(); // slug(name) -> id (for merge)
  let curCaliber = "";
  for (const cells of tableRows(master)) {
    // Header rows start with `!`; our parser keeps only `|` cells, so headers
    // come through as empty/short rows — skip anything without the 6 class cols.
    if (cells.length < 15) continue;
    const hasCaliber = cells.length >= 16;
    const c = hasCaliber ? cells.slice() : [curCaliber, ...cells];
    if (hasCaliber) curCaliber = linkText(c[0]) ?? curCaliber;
    const caliber = linkText(c[0]) ?? curCaliber;
    const name = linkText(c[1]);
    if (!name || !caliber) continue;
    const armorClass = c.slice(10, 16).map((x) => {
      const n = num(x);
      return n == null ? 0 : Math.max(0, Math.min(6, Math.round(n)));
    });
    if (armorClass.length < 6) continue;
    const id = slug(name);
    const tags: string[] = [];
    // "meta" = genuinely effective against high armor (class 4 very-effective,
    // or class 5 effective). Class 1 effectiveness alone (every round shreds
    // unarmored) is not meaningful, so it isn't counted.
    if (armorClass[3] >= 5 || armorClass[4] >= 4) tags.push("meta");
    if (/tracer|\bT\b/i.test(name.replace(caliber, ""))) tags.push("tracer");
    const rec: AmmoRec = {
      id, name, image: null, caliber,
      damage: num(c[2]), penetration: num(c[3]), armorDamage: num(c[4]),
      accuracy: num(c[5]), recoil: num(c[6]), lightBleed: num(c[7]),
      heavyBleed: num(c[8]), velocity: num(c[9]),
      heat: null, durabilityBurn: null,
      bulletType: bulletType(name, caliber), traderSource: null,
      tags, armorClass, penPct: armorClass.map((l) => PEN_PCT[l]),
      effLabels: armorClass.map((l) => EFF_LABEL[l]),
      source: { url: wikiUrl(caliber), license: "CC BY-NC-SA", wiki: "Escape from Tarkov Wiki" },
    };
    ammo.set(id, rec);
    byName.set(id, id);
  }
  console.log(`Ammo from master table: ${ammo.size}`);

  // 2) Per-caliber "Types" tables → icon File, trader source, heat, durability burn.
  let calibers = [...new Set([...ammo.values()].map((a) => a.caliber))];
  if (argCaliber) calibers = calibers.filter((c) => c.toLowerCase() === argCaliber.toLowerCase());
  const iconJobs = new Map<string, string>(); // ammo id -> File title

  const cleanSource = (raw: string) =>
    raw.replace(/\[\[[^\]|]*\|([^\]]+)\]\]/g, "$1").replace(/\[\[([^\]]+)\]\]/g, "$1")
      .replace(/<br\s*\/?>/gi, " · ").replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim() || null;

  for (const caliber of calibers) {
    try {
      const wt = (await api({ action: "parse", page: caliber, prop: "wikitext" })).parse?.wikitext as string | undefined;
      if (!wt) continue;
      const typesSec = wt.match(/==\s*Types\s*==([\s\S]*?)(?=\n==[^=]|$)/i)?.[1] ?? "";
      const table = tableContaining(typesSec, /penetration|DMG/i);
      if (!table) { console.warn(`  ! ${caliber}: no Types table`); await sleep(500); continue; }
      const rows = tableRows(table);
      if (!rows.length) continue;
      // Build a header→index map from the first row that looks like headers
      // (the raw header line uses `!`; our cellValue keeps the text after attrs).
      const rawHeader = table.match(/\{\|[\s\S]*?\n((?:!.*\n?)+)/)?.[1] ?? "";
      const headers = rawHeader.split(/\n!|!!/).map((h) => stripTags(h.replace(/^.*\|/, "")).toLowerCase().trim()).filter(Boolean);
      const col = (pred: (h: string) => boolean) => headers.findIndex(pred);
      const iName = col((h) => h === "name");
      const iIcon = col((h) => h.includes("icon"));
      const iSrc = col((h) => h.includes("source"));
      const iHeat = col((h) => h.includes("heat"));
      const iDur = col((h) => h.includes("durability"));
      for (const cells of rows) {
        if (cells.length < headers.length - 1) continue;
        const nm = iName >= 0 ? linkText(cells[iName]) : null;
        if (!nm) continue;
        const id = slug(nm);
        const rec = ammo.get(id);
        if (!rec) continue;
        if (iSrc >= 0 && cells[iSrc] != null) rec.traderSource = cleanSource(cells[iSrc]);
        if (iHeat >= 0) rec.heat = num(cells[iHeat]);
        if (iDur >= 0) rec.durabilityBurn = num(cells[iDur]);
        if (iIcon >= 0) {
          const file = cells[iIcon].match(/File:([^|\]]+)/i)?.[1]?.trim();
          if (file) iconJobs.set(id, file);
        }
        // Derived tags from the trader source.
        const src = (rec.traderSource ?? "").toLowerCase();
        if (/ll1|ll2|level\s*[12]|lv1|lv2/.test(src) && !rec.tags.includes("budget")) rec.tags.push("budget");
        if (/workbench|hideout/.test(src) && !rec.tags.includes("craftable")) rec.tags.push("craftable");
      }
      console.log(`  ${caliber}: matched sources/icons`);
      await sleep(700);
    } catch (e) {
      console.warn(`  ! ${caliber}: ${(e as Error).message}`);
    }
  }

  // 3) Download icons (batched imageinfo + fetch).
  let entries = [...iconJobs.entries()];
  if (argLimit) entries = entries.slice(0, argLimit);
  console.log(`Downloading ${entries.length} icons…`);
  let ok = 0;
  const norm = (s: string) => s.replace(/_/g, " ").toLowerCase();
  for (const part of chunk(entries, 50)) {
    const titlesParam = part.map(([, fn]) => `File:${fn}`).join("|");
    const info = await api({ action: "query", titles: titlesParam, prop: "imageinfo", iiprop: "url", iiurlwidth: "128" });
    const byFile = new Map<string, string>();
    for (const p of info.query?.pages ?? []) {
      const u = p.imageinfo?.[0]?.thumburl ?? p.imageinfo?.[0]?.url;
      if (u) byFile.set(norm(p.title), u);
    }
    for (const [id, fn] of part) {
      const u = byFile.get(norm(`File:${fn}`));
      if (!u) continue;
      try {
        const buf = new Uint8Array(await (await fetch(u, { headers: { "User-Agent": UA } })).arrayBuffer());
        const ext = extFor(buf);
        await writeFile(path.join(ROOT, "public", "ammo", `${id}.${ext}`), buf);
        const rec = ammo.get(id);
        if (rec) rec.image = `/ammo/${id}.${ext}`;
        ok++;
        await sleep(110);
      } catch { /* skip */ }
    }
    process.stdout.write(`  …${ok} downloaded\r`);
    await sleep(500);
  }

  // 4) Write content/ammo.json (Record<id, Ammunition>).
  const out: Record<string, AmmoRec> = {};
  for (const rec of ammo.values()) out[rec.id] = rec;
  await writeFile(path.join(ROOT, "content", "ammo.json"), JSON.stringify(out, null, 2) + "\n");
  console.log(`\nDone. ${ammo.size} ammo, ${ok} icons → content/ammo.json`);
}

main().catch((e) => { console.error(e); process.exit(1); });
