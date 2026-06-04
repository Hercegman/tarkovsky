/*
 * Project Tarkovsky — link quest objectives to map markers.
 *
 * The wiki's interactive-map "quest" markers carry objective-like titles
 * ("Obtain the Bronze Pocket Watch on a Chain"). This matches them to each
 * quest's objectives and writes the located markers into quest.markers, so the
 * UI can show "this quest's location" on a map.
 *
 * Usage: node scripts/link-quest-markers.mts
 */
import { readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";

const ROOT = process.cwd();
const MAPS = path.join(ROOT, "content", "maps");
const QUESTS = path.join(ROOT, "content", "quests");

const norm = (s: string) =>
  s.toLowerCase().replace(/[^a-z0-9 ]/g, " ").replace(/\s+/g, " ").trim();

function sharedWords(a: string, b: string): number {
  const A = new Set(a.split(" ").filter((w) => w.length > 3));
  let n = 0;
  for (const w of b.split(" ")) if (A.has(w)) n++;
  return n;
}

interface QMarker {
  x: number;
  y: number;
  t: string;
  tn: string;
}

async function main() {
  // Collect quest-category markers per map.
  const mapFiles = (await readdir(MAPS)).filter((f) => f.endsWith(".json"));
  const questMarkers = new Map<string, QMarker[]>();
  for (const f of mapFiles) {
    const map = JSON.parse(await readFile(path.join(MAPS, f), "utf8"));
    const ms = (map.markers as { c: string; x: number; y: number; t: string }[])
      .filter((m) => m.c === "quest" && m.t && m.t.toLowerCase() !== "marker spot")
      .map((m) => ({ x: m.x, y: m.y, t: m.t, tn: norm(m.t) }));
    questMarkers.set(map.id, ms);
  }

  const files = (await readdir(QUESTS)).filter(
    (f) => f.endsWith(".json") && f !== "index.json",
  );
  let linked = 0;
  let links = 0;

  for (const f of files) {
    const file = path.join(QUESTS, f);
    const quest = JSON.parse(await readFile(file, "utf8"));
    const objs: string[] = (quest.objectives as string[]).map(norm);
    const markers: { map: string; x: number; y: number; label: string }[] = [];

    for (const mapId of quest.maps as string[]) {
      const candidates = questMarkers.get(mapId) ?? [];
      for (const m of candidates) {
        const hit = objs.some(
          (o) =>
            (o.length > 6 && (o.includes(m.tn) || m.tn.includes(o))) ||
            sharedWords(o, m.tn) >= 2,
        );
        if (hit) {
          markers.push({ map: mapId, x: m.x, y: m.y, label: m.t });
        }
      }
    }

    // Dedup by map+coords.
    const seen = new Set<string>();
    const deduped = markers.filter((mk) => {
      const k = `${mk.map}:${mk.x}:${mk.y}`;
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    });

    if (JSON.stringify(quest.markers) !== JSON.stringify(deduped)) {
      quest.markers = deduped;
      await writeFile(file, JSON.stringify(quest, null, 2) + "\n");
    }
    if (deduped.length) {
      linked++;
      links += deduped.length;
    }
  }

  console.log(
    `Linked ${links} markers across ${linked} quests (of ${files.length}).`,
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
