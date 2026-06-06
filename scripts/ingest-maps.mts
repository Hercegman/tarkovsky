/*
 * Project Tarkovsky — interactive map ingest.
 *
 * Pulls Fandom Interactive Maps data (the `Map:` namespace) for each location:
 * the base image, bounds, categories and markers. Writes:
 *   - public/maps/<id>.<ext>          (self-hosted base image, downscaled)
 *   - content/maps/<id>.json          (bounds, categories, converted markers)
 *
 * Source: Escape from Tarkov Wiki (Fandom) — CC BY-NC-SA, attributed.
 * Marker coordinates are converted from Fandom's (origin bottom-left, xy) space
 * into Leaflet CRS.Simple top-left pixel space, kept in ORIGINAL pixel units so
 * a downscaled image still aligns (ImageOverlay stretches to bounds).
 *
 * Usage: node scripts/ingest-maps.mts [--map customs]
 */
import { mkdir, writeFile, readFile } from "node:fs/promises";
import path from "node:path";
import { mergeSharedExtracts } from "./merge-shared-extracts.mts";

const UA =
  "ProjectTarkovsky/1.0 (https://github.com/Hercegman/tarkovsky; grizelj.roko@gmail.com)";
const API = "https://escapefromtarkov.fandom.com/api.php";
const ROOT = process.cwd();
const IMG_WIDTH = 3000; // downscale cap to keep the repo light

const only = (() => {
  const i = process.argv.indexOf("--map");
  return i >= 0 ? process.argv[i + 1] : null;
})();
const skipImages = process.argv.includes("--skip-images");

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function api(params: Record<string, string>): Promise<any> {
  const url = new URL(API);
  url.search = new URLSearchParams({
    format: "json",
    formatversion: "2",
    ...params,
  }).toString();
  const res = await fetch(url, { headers: { "User-Agent": UA } });
  if (!res.ok) throw new Error(`API ${res.status}`);
  return res.json();
}

function extFor(bytes: Uint8Array): string {
  if (bytes[0] === 0x89 && bytes[1] === 0x50) return "png";
  if (bytes[0] === 0xff && bytes[1] === 0xd8) return "jpg";
  if (bytes[0] === 0x52 && bytes[1] === 0x49) return "webp"; // RIFF
  return "png";
}

interface FandomMarker {
  categoryId: string;
  position: [number, number];
  popup?: { title?: string; description?: string };
}

async function ingestMap(id: string, name: string) {
  console.log(`\n${name} (Map:${name})`);
  const page = await api({
    action: "query",
    titles: `Map:${name}`,
    prop: "revisions",
    rvprop: "content",
    rvslots: "main",
  });
  const content = page.query?.pages?.[0]?.revisions?.[0]?.slots?.main?.content;
  if (!content) {
    console.warn(`  ! no Map: data, skipping`);
    return null;
  }
  const data = JSON.parse(content);

  const [[, ], [bx, by]] = data.mapBounds as [
    [number, number],
    [number, number],
  ];
  const xy = (data.coordinateOrder ?? "xy") === "xy";
  const width = xy ? bx : by;
  const height = xy ? by : bx;
  const bottom = (data.origin ?? "bottom-left").startsWith("bottom");

  // Download the base image (downscaled) via imageinfo thumbnail.
  let image: string | null = null;
  if (skipImages) {
    // Reuse the already-downloaded image path from the existing JSON.
    try {
      const prev = JSON.parse(
        await readFile(path.join(ROOT, "content", "maps", `${id}.json`), "utf8"),
      );
      image = prev.image ?? null;
      console.log(`  (skip-images) keeping ${image}`);
    } catch {
      /* no previous file */
    }
  } else {
  const fileTitle: string = data.mapImage.startsWith("File:")
    ? data.mapImage
    : `File:${data.mapImage}`;
  const info = await api({
    action: "query",
    titles: fileTitle,
    prop: "imageinfo",
    iiprop: "url|size",
    iiurlwidth: String(IMG_WIDTH),
  });
  const ii = info.query?.pages?.[0]?.imageinfo?.[0];
  const dlUrl: string = ii?.thumburl ?? ii?.url;
  if (dlUrl) {
    const buf = new Uint8Array(
      await (await fetch(dlUrl, { headers: { "User-Agent": UA } })).arrayBuffer(),
    );
    const ext = extFor(buf);
    await mkdir(path.join(ROOT, "public", "maps"), { recursive: true });
    await writeFile(path.join(ROOT, "public", "maps", `${id}.${ext}`), buf);
    image = `/maps/${id}.${ext}`;
    console.log(`  image ${ext} ${(buf.length / 1024) | 0}KB`);
  }
  }

  // Categories (id, name, color) for the layer toggle.
  const categories = (data.categories ?? []).map(
    (c: { id: string; name: string; color?: string }) => ({
      id: c.id,
      name: c.name,
      color: c.color ?? "#c8a04d",
    }),
  );

  // Convert markers into Leaflet CRS.Simple coordinates.
  // CRS.Simple uses transformation (1,0,-1,0): latitude increases UPWARD, the
  // same direction as Fandom's "bottom-left" origin — so a bottom-left source
  // needs NO vertical flip; only a top-left source must be flipped.
  const markers = (data.markers ?? []).map((m: FandomMarker) => {
    const [a, b] = m.position;
    const mx = xy ? a : b;
    const myFromOrigin = xy ? b : a;
    const y = bottom ? myFromOrigin : height - myFromOrigin;
    return {
      c: m.categoryId,
      x: Math.round(mx),
      y: Math.round(y),
      t: m.popup?.title || "",
    };
  });
  console.log(`  ${markers.length} markers, ${categories.length} categories`);

  const out = {
    id,
    name,
    image,
    width,
    height,
    source: {
      url: `https://escapefromtarkov.fandom.com/wiki/Map:${name.replace(/ /g, "_")}`,
      license: "CC BY-NC-SA",
      wiki: "Escape from Tarkov Wiki",
      fetchedAt: new Date().toISOString(),
    },
    categories,
    markers,
  };
  // Collapse co-located PMC+Scav extracts into one sunburst "shared" marker.
  const sharedN = mergeSharedExtracts(out);
  if (sharedN) console.log(`  merged ${sharedN} shared extract(s)`);
  await mkdir(path.join(ROOT, "content", "maps"), { recursive: true });
  await writeFile(
    path.join(ROOT, "content", "maps", `${id}.json`),
    JSON.stringify(out, null, 2) + "\n",
  );
  return { id, name };
}

async function main() {
  const index = JSON.parse(
    await readFile(path.join(ROOT, "content", "maps.json"), "utf8"),
  ) as { id: string; name: string }[];

  for (const m of index) {
    if (only && m.id !== only) continue;
    try {
      await ingestMap(m.id, m.name);
    } catch (err) {
      console.warn(`  ! ${m.name}: ${(err as Error).message}`);
    }
    await sleep(1200);
  }
  console.log("\nDone.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
