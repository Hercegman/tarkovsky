/*
 * Merge co-located PMC + Scav extracts into a single "Shared" extract.
 *
 * On the wiki maps a co-op / shared extract is drawn twice — once as an
 * exfil_pmc marker and once as an exfil_scav marker at (nearly) the same spot
 * with the same name. That clutters the map. This collapses each such pair into
 * one `exfil_shared` marker (sunburst-yellow in the UI) and adds the
 * `exfil_shared` category. Idempotent — running it again is a no-op.
 *
 * Usage: node scripts/merge-shared-extracts.mts
 */
import { readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";

const ROOT = process.cwd();

interface Marker { c: string; x: number; y: number; t: string }
interface Category { id: string; name: string; color?: string }
interface MapData {
  width: number;
  height: number;
  categories: Category[];
  markers: Marker[];
  [k: string]: unknown;
}

const norm = (s: string) =>
  (s || "")
    .toLowerCase()
    .replace(/\(co-?op\)/g, "")
    .replace(/[^a-z0-9 ]/g, "")
    .replace(/\s+/g, " ")
    .trim();

/** Collapse same-name, co-located PMC+Scav extracts into exfil_shared. */
export function mergeSharedExtracts(data: MapData): number {
  const tol = data.width * 0.02; // co-located if within ~2% of map width
  const markers = data.markers;
  const pmcIdx = markers.map((m, i) => (m.c === "exfil_pmc" ? i : -1)).filter((i) => i >= 0);
  const scavIdx = markers.map((m, i) => (m.c === "exfil_scav" ? i : -1)).filter((i) => i >= 0);

  const drop = new Set<number>();
  const shared: Marker[] = [];
  const usedScav = new Set<number>();

  for (const pi of pmcIdx) {
    const p = markers[pi];
    let best = -1;
    let bestDist = Infinity;
    for (const si of scavIdx) {
      if (usedScav.has(si)) continue;
      const s = markers[si];
      if (norm(p.t) !== norm(s.t)) continue;
      const dist = Math.hypot(p.x - s.x, p.y - s.y);
      if (dist <= tol && dist < bestDist) {
        bestDist = dist;
        best = si;
      }
    }
    if (best >= 0) {
      usedScav.add(best);
      drop.add(pi);
      drop.add(best);
      shared.push({ c: "exfil_shared", x: p.x, y: p.y, t: p.t.trim() });
    }
  }

  if (!shared.length) return 0;

  data.markers = markers.filter((_, i) => !drop.has(i)).concat(shared);

  // Ensure the category exists for the layer toggle / legend.
  if (!data.categories.some((c) => c.id === "exfil_shared")) {
    data.categories.push({
      id: "exfil_shared",
      name: "Shared Extraction",
      color: "#ffb01f",
    });
  }
  return shared.length;
}

async function main() {
  const dir = path.join(ROOT, "content", "maps");
  const files = (await readdir(dir)).filter((f) => f.endsWith(".json"));
  let total = 0;
  for (const f of files) {
    const file = path.join(dir, f);
    const data = JSON.parse(await readFile(file, "utf8")) as MapData;
    const n = mergeSharedExtracts(data);
    if (n) {
      await writeFile(file, JSON.stringify(data, null, 2) + "\n");
      console.log(`${f.padEnd(24)} merged ${n} shared extract(s)`);
      total += n;
    }
  }
  console.log(`\nDone. ${total} shared extracts merged across ${files.length} maps.`);
}

// Only auto-run when invoked directly (so ingest-maps can import the function).
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
