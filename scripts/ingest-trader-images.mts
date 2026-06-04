/*
 * Project Tarkovsky — trader portrait images.
 * Pulls each trader's infobox image from the EFT Wiki into public/traders/<id>.<ext>
 * and writes the path into content/traders.json. Source: EFT Wiki (CC BY-NC-SA).
 */
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const UA =
  "ProjectTarkovsky/1.0 (https://github.com/Hercegman/tarkovsky)";
const API = "https://escapefromtarkov.fandom.com/api.php";
const ROOT = process.cwd();
const OUT = path.join(ROOT, "public", "traders");
const WIDTH = 420;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function api(params: Record<string, string>): Promise<any> {
  const url = new URL(API);
  url.search = new URLSearchParams({ format: "json", formatversion: "2", ...params }).toString();
  const res = await fetch(url, { headers: { "User-Agent": UA } });
  if (!res.ok) throw new Error(`API ${res.status}`);
  return res.json();
}
function extFor(b: Uint8Array): string {
  if (b[0] === 0x89 && b[1] === 0x50) return "png";
  if (b[0] === 0xff && b[1] === 0xd8) return "jpg";
  if (b[0] === 0x52 && b[1] === 0x49) return "webp";
  return "png";
}

async function main() {
  await mkdir(OUT, { recursive: true });
  const file = path.join(ROOT, "content", "traders.json");
  const traders = JSON.parse(await readFile(file, "utf8")) as {
    id: string;
    name: string;
    image?: string | null;
  }[];

  for (const t of traders) {
    try {
      const page = t.name === "BTR Driver" ? "BTR Driver" : t.name;
      const wt = (await api({ action: "parse", page, prop: "wikitext" })).parse
        ?.wikitext as string | undefined;
      const m = wt?.match(/\|\s*image\s*=\s*([^\n|]+)/i);
      const fn = m
        ? m[1].replace(/\[\[|\]\]/g, "").replace(/^File:/i, "").split("|")[0].trim()
        : null;
      if (!fn) {
        console.log(`${t.name}: no image`);
        continue;
      }
      const info = await api({
        action: "query",
        titles: `File:${fn}`,
        prop: "imageinfo",
        iiprop: "url",
        iiurlwidth: String(WIDTH),
      });
      const url = info.query?.pages?.[0]?.imageinfo?.[0];
      const dl = url?.thumburl ?? url?.url;
      if (!dl) {
        console.log(`${t.name}: no url`);
        continue;
      }
      const buf = new Uint8Array(
        await (await fetch(dl, { headers: { "User-Agent": UA } })).arrayBuffer(),
      );
      const ext = extFor(buf);
      await writeFile(path.join(OUT, `${t.id}.${ext}`), buf);
      t.image = `/traders/${t.id}.${ext}`;
      console.log(`${t.name}: ${ext} ${(buf.length / 1024) | 0}KB`);
    } catch (e) {
      console.warn(`${t.name}: ${(e as Error).message}`);
    }
    await sleep(700);
  }

  await writeFile(file, JSON.stringify(traders, null, 2) + "\n");
  console.log("Wrote content/traders.json");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
