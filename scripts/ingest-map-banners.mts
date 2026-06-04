/*
 * Project Tarkovsky — map banner art.
 * Pulls each map's wiki page infobox banner (the artistic in-game screenshot)
 * into public/maps/banner/<id>.<ext>. Source: EFT Wiki (CC BY-NC-SA).
 */
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const UA =
  "ProjectTarkovsky/1.0 (https://github.com/Hercegman/tarkovsky; grizelj.roko@gmail.com)";
const API = "https://escapefromtarkov.fandom.com/api.php";
const ROOT = process.cwd();
const OUT = path.join(ROOT, "public", "maps", "banner");
const WIDTH = 640;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function api(p: Record<string, string>): Promise<any> {
  const url = new URL(API);
  url.search = new URLSearchParams({ format: "json", formatversion: "2", ...p }).toString();
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
  const maps = JSON.parse(
    await readFile(path.join(ROOT, "content", "maps.json"), "utf8"),
  ) as { id: string; name: string }[];

  for (const m of maps) {
    try {
      const wt = (await api({ action: "parse", page: m.name, prop: "wikitext" })).parse
        ?.wikitext as string | undefined;
      const match = wt?.match(/\|\s*image\s*=\s*([^\n|]+)/i);
      const fn = match
        ? match[1].replace(/\[\[|\]\]/g, "").replace(/^File:/i, "").split("|")[0].trim()
        : null;
      if (!fn) {
        console.log(`${m.name}: no banner`);
        continue;
      }
      const info = await api({
        action: "query",
        titles: `File:${fn}`,
        prop: "imageinfo",
        iiprop: "url",
        iiurlwidth: String(WIDTH),
      });
      const ii = info.query?.pages?.[0]?.imageinfo?.[0];
      const dl = ii?.thumburl ?? ii?.url;
      if (!dl) {
        console.log(`${m.name}: no url`);
        continue;
      }
      const buf = new Uint8Array(
        await (await fetch(dl, { headers: { "User-Agent": UA } })).arrayBuffer(),
      );
      const ext = extFor(buf);
      await writeFile(path.join(OUT, `${m.id}.${ext}`), buf);
      console.log(`${m.name}: ${ext} ${(buf.length / 1024) | 0}KB`);
    } catch (e) {
      console.warn(`${m.name}: ${(e as Error).message}`);
    }
    await sleep(700);
  }
  console.log("Done.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
