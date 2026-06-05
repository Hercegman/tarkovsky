/*
 * Re-parse weapon + attachment numeric stats from the wiki with the corrected
 * field parser (empty infobox fields no longer bleed into the next field).
 * Keeps slots / images / types; only patches the numbers. Fast (batched wikitext).
 *
 * Usage: node scripts/fix-weapon-stats.mts
 */
import { readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";

const UA = "ProjectTarkovsky/1.0 (https://github.com/Hercegman/tarkovsky; grizelj.roko@gmail.com)";
const API = "https://escapefromtarkov.fandom.com/api.php";
const ROOT = process.cwd();
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
function ibField(wt: string, key: string): string | null {
  const m = wt.match(new RegExp(`\\|\\s*${key}\\s*=\\s*([^\\n]*)`, "i"));
  return m ? m[1].trim() : null;
}
const stripTags = (s: string) => s.replace(/<[^>]+>/g, "").trim();
function num(s: string | null): number | null {
  if (!s) return null;
  const m = stripTags(s).split("|")[0].replace(/,/g, "").match(/-?\d+(\.\d+)?/);
  return m ? Number(m[0]) : null;
}

async function fetchWt(titles: string[]): Promise<Map<string, string>> {
  const out = new Map<string, string>();
  for (const part of chunk(titles, 50)) {
    const data = await api({ action: "query", prop: "revisions", rvprop: "content", rvslots: "main", titles: part.join("|") });
    for (const p of data.query?.pages ?? []) {
      const wt = p.revisions?.[0]?.slots?.main?.content;
      if (wt) out.set(p.title, wt);
    }
    process.stdout.write(`  …${out.size}\r`);
    await sleep(500);
  }
  return out;
}

async function main() {
  // Weapons
  const wDir = path.join(ROOT, "content", "weapons");
  const wFiles = (await readdir(wDir)).filter((f) => f.endsWith(".json"));
  const weapons = await Promise.all(wFiles.map(async (f) => ({ file: path.join(wDir, f), json: JSON.parse(await readFile(path.join(wDir, f), "utf8")) })));
  console.log(`Weapons: ${weapons.length}`);
  const wWt = await fetchWt(weapons.map((w) => w.json.page));
  for (const w of weapons) {
    const wt = wWt.get(w.json.page);
    if (!wt) continue;
    const rec = ibField(wt, "Weaprecoil") || "";
    w.json.ergonomics = num(ibField(wt, "ergonomics"));
    w.json.recoilVertical = num((rec.match(/Vertical:\s*([^<|]+)/i) || [])[1] || null);
    w.json.recoilHorizontal = num((rec.match(/Horizontal:\s*([^<|]+)/i) || [])[1] || null);
    w.json.moa = num(ibField(wt, "MOA"));
    w.json.weight = num(ibField(wt, "weight"));
    w.json.fireRate = num(ibField(wt, "rof"));
    await writeFile(w.file, JSON.stringify(w.json, null, 2) + "\n");
  }
  console.log(`\nPatched ${weapons.length} weapons.`);

  // Attachments
  const aPath = path.join(ROOT, "content", "attachments.json");
  const attachments = JSON.parse(await readFile(aPath, "utf8")) as Record<string, any>;
  const ids = Object.keys(attachments);
  console.log(`Attachments: ${ids.length}`);
  const aWt = await fetchWt(ids.map((id) => attachments[id].name));
  for (const id of ids) {
    const a = attachments[id];
    const wt = aWt.get(a.name);
    if (!wt) continue;
    a.ergo = num(ibField(wt, "ergonomics")) ?? 0;
    a.recoil = num(ibField(wt, "recoil")) ?? 0;
    a.accuracy = num(ibField(wt, "accuracy")) ?? 0;
    a.weight = num(ibField(wt, "weight")) ?? 0;
  }
  await writeFile(aPath, JSON.stringify(attachments, null, 2) + "\n");
  console.log(`\nPatched ${ids.length} attachments.`);
}

main().catch((e) => { console.error(e); process.exit(1); });
