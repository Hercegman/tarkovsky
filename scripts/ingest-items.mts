/*
 * Project Tarkovsky — quest item images.
 *
 * For each quest, extracts the item wikilinks from its wiki page (filtering out
 * traders, maps, other quests and noise), stores them as quest.items, and
 * downloads each unique item's icon to public/items/<slug>.webp +
 * content/items.json. Source: EFT Wiki (CC BY-NC-SA).
 *
 * Usage: node scripts/ingest-items.mts [--limit N]
 */
import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";

const UA =
  "ProjectTarkovsky/1.0 (https://github.com/Hercegman/tarkovsky; grizelj.roko@gmail.com)";
const API = "https://escapefromtarkov.fandom.com/api.php";
const ROOT = process.cwd();
const QUESTS = path.join(ROOT, "content", "quests");
const OUT_IMG = path.join(ROOT, "public", "items");
const ITEMS_JSON = path.join(ROOT, "content", "items.json");

const limit = (() => {
  const i = process.argv.indexOf("--limit");
  return i >= 0 ? Number(process.argv[i + 1]) : null;
})();
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function api(p: Record<string, string>): Promise<any> {
  const url = new URL(API);
  url.search = new URLSearchParams({ format: "json", formatversion: "2", maxlag: "5", ...p }).toString();
  const res = await fetch(url, { headers: { "User-Agent": UA } });
  if (!res.ok) throw new Error(`API ${res.status}`);
  return res.json();
}
function chunk<T>(a: T[], n: number): T[][] {
  const o: T[][] = [];
  for (let i = 0; i < a.length; i += n) o.push(a.slice(i, i + n));
  return o;
}
const slug = (s: string) =>
  s.toLowerCase().replace(/['’]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
const extFor = (b: Uint8Array) =>
  b[0] === 0x89 ? "png" : b[0] === 0xff ? "jpg" : b[0] === 0x52 ? "webp" : "png";

const NOISE = new Set(
  [
    "escape from tarkov", "quests", "exp", "scavs", "scav", "found in raid",
    "pagename", "roubles", "dollars", "euros", "reputation", "pmc", "pmcs",
    "usec", "bear", "kappa", "secure container kappa", "the unheard",
    "raiders", "rogues", "boss", "labyrinth", "arena", "gp coin", "experience",
    "hideout", "flea market", "wishlist", "trader", "traders", "stash",
    "skill", "skills", "quest", "task", "tasks", "level", "loyalty level",
  ].map((s) => s.toLowerCase()),
);

function extractInfoboxImage(wt: string): string | null {
  for (const key of ["image", "icon"]) {
    const m = wt.match(new RegExp(`\\|\\s*${key}\\s*=\\s*([^\\n|]+)`, "i"));
    if (m) {
      const v = m[1].replace(/\[\[|\]\]/g, "").replace(/^File:/i, "").split("|")[0].trim();
      if (v) return v;
    }
  }
  return null;
}

async function main() {
  await mkdir(OUT_IMG, { recursive: true });

  // Build exclusion sets.
  const traders = JSON.parse(await readFile(path.join(ROOT, "content", "traders.json"), "utf8")) as { id: string; name: string }[];
  const maps = JSON.parse(await readFile(path.join(ROOT, "content", "maps.json"), "utf8")) as { id: string; name: string }[];
  let files = (await readdir(QUESTS)).filter((f) => f.endsWith(".json") && f !== "index.json");
  if (limit) files = files.slice(0, limit);
  const quests = await Promise.all(
    files.map(async (f) => ({ file: path.join(QUESTS, f), json: JSON.parse(await readFile(path.join(QUESTS, f), "utf8")) })),
  );

  const exclude = new Set<string>([...NOISE]);
  for (const t of traders) { exclude.add(t.name.toLowerCase()); exclude.add(t.id); }
  for (const m of maps) { exclude.add(m.name.toLowerCase()); exclude.add(m.id); }
  for (const q of quests) exclude.add(q.json.title.toLowerCase());

  // 1) Batch-fetch quest wikitext → item links per quest.
  const allItems = new Set<string>();
  for (const part of chunk(quests, 50)) {
    const data = await api({ action: "query", prop: "revisions", rvprop: "content", rvslots: "main", titles: part.map((q) => q.json.title).join("|") });
    const byTitle = new Map<string, string>();
    for (const p of data.query?.pages ?? []) {
      const wt = p.revisions?.[0]?.slots?.main?.content;
      if (wt) byTitle.set(p.title.toLowerCase(), wt);
    }
    for (const q of part) {
      const wt = byTitle.get(q.json.title.toLowerCase());
      if (!wt) { q.json.items = []; continue; }
      const links = [...wt.matchAll(/\[\[([^\]|#:]+)(?:\|[^\]]+)?\]\]/g)].map((m) => m[1].trim());
      const items = [...new Set(links)].filter((l) => l && !exclude.has(l.toLowerCase()) && l.length > 2 && !/^\d+$/.test(l));
      q.json.items = items;
      items.forEach((i) => allItems.add(i));
    }
    process.stdout.write(`  quests scanned, ${allItems.size} unique items\r`);
    await sleep(700);
  }
  console.log(`\nUnique item candidates: ${allItems.size}`);

  // 2) Resolve each item's icon filename (batched wikitext).
  const itemList = [...allItems];
  const fileOf = new Map<string, string>();
  for (const part of chunk(itemList, 50)) {
    const data = await api({ action: "query", prop: "revisions", rvprop: "content", rvslots: "main", titles: part.join("|") });
    for (const p of data.query?.pages ?? []) {
      if (p.missing) continue;
      const wt = p.revisions?.[0]?.slots?.main?.content;
      const img = wt ? extractInfoboxImage(wt) : null;
      if (img) fileOf.set(p.title, img);
    }
    process.stdout.write(`  resolved ${fileOf.size} item icons\r`);
    await sleep(600);
  }
  console.log(`\nItems with an icon: ${fileOf.size}`);

  // 3) Batch imageinfo → thumb urls.
  const thumb = new Map<string, string>();
  const entries = [...fileOf.entries()];
  for (const part of chunk(entries, 50)) {
    const data = await api({ action: "query", titles: part.map(([, fn]) => `File:${fn}`).join("|"), prop: "imageinfo", iiprop: "url", iiurlwidth: "128" });
    const norm = (s: string) => s.replace(/_/g, " ").toLowerCase();
    const urlByFile = new Map<string, string>();
    for (const p of data.query?.pages ?? []) {
      const u = p.imageinfo?.[0]?.thumburl ?? p.imageinfo?.[0]?.url;
      if (u) urlByFile.set(norm(p.title), u);
    }
    for (const [item, fn] of part) {
      const u = urlByFile.get(norm(`File:${fn}`));
      if (u) thumb.set(item, u);
    }
    await sleep(600);
  }

  // 4) Download icons + build items.json.
  const items: Record<string, { name: string; image: string | null }> = {};
  let ok = 0;
  for (const item of itemList) {
    const s = slug(item);
    const url = thumb.get(item);
    let image: string | null = null;
    if (url) {
      try {
        const buf = new Uint8Array(await (await fetch(url, { headers: { "User-Agent": UA } })).arrayBuffer());
        const ext = extFor(buf);
        await writeFile(path.join(OUT_IMG, `${s}.${ext}`), buf);
        image = `/items/${s}.${ext}`;
        ok++;
        await sleep(120);
      } catch { /* skip */ }
    }
    items[s] = { name: item, image };
    if (ok % 100 === 0 && ok) process.stdout.write(`  downloaded ${ok}\r`);
  }

  await writeFile(ITEMS_JSON, JSON.stringify(items, null, 2) + "\n");
  // Persist quest.items (store slugs for lookup).
  for (const q of quests) {
    q.json.items = (q.json.items as string[]).map(slug);
    await writeFile(q.file, JSON.stringify(q.json, null, 2) + "\n");
  }
  console.log(`\nDone. ${ok} item icons; items.json with ${Object.keys(items).length} entries.`);
}

main().catch((e) => { console.error(e); process.exit(1); });
