/*
 * Project Tarkovsky — quest banner images.
 *
 * For each quest in content/quests/*.json, reads the infobox `image` (or `icon`)
 * from the EFT Wiki, downloads a downscaled webp/png to public/quests/<id>.<ext>,
 * and writes the path into the quest JSON's `image` field.
 *
 * Source: Escape from Tarkov Wiki (Fandom) — CC BY-NC-SA, attributed.
 * Usage: node scripts/ingest-quest-images.mts [--limit N]
 */
import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";

const UA =
  "ProjectTarkovsky/1.0 (https://github.com/Hercegman/tarkovsky)";
const API = "https://escapefromtarkov.fandom.com/api.php";
const ROOT = process.cwd();
const QUESTS = path.join(ROOT, "content", "quests");
const OUT = path.join(ROOT, "public", "quests");
const WIDTH = 600;

const limit = (() => {
  const i = process.argv.indexOf("--limit");
  return i >= 0 ? Number(process.argv[i + 1]) : null;
})();
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function api(params: Record<string, string>): Promise<any> {
  const url = new URL(API);
  url.search = new URLSearchParams({
    format: "json",
    formatversion: "2",
    maxlag: "5",
    ...params,
  }).toString();
  const res = await fetch(url, { headers: { "User-Agent": UA } });
  if (!res.ok) throw new Error(`API ${res.status}`);
  return res.json();
}

function chunk<T>(arr: T[], n: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += n) out.push(arr.slice(i, i + n));
  return out;
}

function extractImage(wikitext: string): string | null {
  for (const key of ["image", "icon"]) {
    const m = wikitext.match(new RegExp(`\\|\\s*${key}\\s*=\\s*([^\\n|]+)`, "i"));
    if (m) {
      const v = m[1]
        .replace(/\[\[|\]\]/g, "")
        .replace(/^File:/i, "")
        .split("|")[0]
        .trim();
      if (v) return v;
    }
  }
  return null;
}

function extFor(b: Uint8Array): string {
  if (b[0] === 0x89 && b[1] === 0x50) return "png";
  if (b[0] === 0xff && b[1] === 0xd8) return "jpg";
  if (b[0] === 0x52 && b[1] === 0x49) return "webp";
  return "png";
}
const norm = (s: string) => s.replace(/_/g, " ").trim().toLowerCase();

async function main() {
  await mkdir(OUT, { recursive: true });
  let files = (await readdir(QUESTS)).filter(
    (f) => f.endsWith(".json") && f !== "index.json",
  );
  if (limit) files = files.slice(0, limit);

  const quests = await Promise.all(
    files.map(async (f) => ({
      file: path.join(QUESTS, f),
      json: JSON.parse(await readFile(path.join(QUESTS, f), "utf8")),
    })),
  );
  console.log(`Loaded ${quests.length} quests.`);

  // 1) Batch-fetch wikitext to find each quest's image filename.
  const imageOf = new Map<string, string>(); // quest id -> File title
  for (const part of chunk(quests, 50)) {
    const data = await api({
      action: "query",
      prop: "revisions",
      rvprop: "content",
      rvslots: "main",
      titles: part.map((q) => q.json.title).join("|"),
    });
    const byTitle = new Map<string, string>();
    for (const p of data.query?.pages ?? []) {
      const wt = p.revisions?.[0]?.slots?.main?.content;
      if (wt) byTitle.set(norm(p.title), wt);
    }
    for (const q of part) {
      const wt = byTitle.get(norm(q.json.title));
      const img = wt ? extractImage(wt) : null;
      if (img) imageOf.set(q.json.id, img);
    }
    process.stdout.write(`  wikitext ${imageOf.size} images found\r`);
    await sleep(700);
  }
  console.log(`\nFound image filenames for ${imageOf.size} quests.`);

  // 2) Batch-resolve thumbnail URLs.
  const entries = [...imageOf.entries()]; // [id, filename]
  const thumb = new Map<string, string>(); // File title (norm) -> url
  for (const part of chunk(entries, 50)) {
    const titles = part.map(([, fn]) => `File:${fn}`).join("|");
    const data = await api({
      action: "query",
      titles,
      prop: "imageinfo",
      iiprop: "url",
      iiurlwidth: String(WIDTH),
    });
    for (const p of data.query?.pages ?? []) {
      const u = p.imageinfo?.[0]?.thumburl ?? p.imageinfo?.[0]?.url;
      if (u) thumb.set(norm(p.title), u);
    }
    await sleep(700);
  }

  // 3) Download + write back.
  let ok = 0;
  for (const q of quests) {
    const fn = imageOf.get(q.json.id);
    const url = fn ? thumb.get(norm(`File:${fn}`)) : undefined;
    let image: string | null = null;
    if (url) {
      try {
        const buf = new Uint8Array(
          await (await fetch(url, { headers: { "User-Agent": UA } })).arrayBuffer(),
        );
        const ext = extFor(buf);
        await writeFile(path.join(OUT, `${q.json.id}.${ext}`), buf);
        image = `/quests/${q.json.id}.${ext}`;
        ok++;
        await sleep(250);
      } catch {
        /* skip */
      }
    }
    if (q.json.image !== image) {
      q.json.image = image;
      await writeFile(q.file, JSON.stringify(q.json, null, 2) + "\n");
    }
    if (ok % 50 === 0 && ok) process.stdout.write(`  downloaded ${ok}\r`);
  }
  console.log(`\nDone. ${ok} quest images saved to public/quests/.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
