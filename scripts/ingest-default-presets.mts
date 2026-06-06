/*
 * Gun builder default attachments.
 *
 * Uses tarkov.dev ONLY to learn each weapon's factory default mod list, then
 * maps those mods to our existing wiki attachments and stores `defaults` (slugs)
 * on each weapon JSON. All stats/modifiers stay wiki-sourced.
 *
 * Usage: node scripts/ingest-default-presets.mts
 */
import { readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";

const ROOT = process.cwd();
const slug = (s: string) =>
  s.toLowerCase().replace(/['’]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
const tokens = (s: string) =>
  new Set(s.toLowerCase().split(/[^a-z0-9]+/).filter((t) => t.length > 2));
function overlap(a: Set<string>, b: Set<string>): number {
  let n = 0;
  for (const t of a) if (b.has(t)) n++;
  return n;
}

async function main() {
  // 1) tarkov.dev: every gun + its default preset's contained mod names.
  const query = `{ items(types: [gun]) { name properties { ... on ItemPropertiesWeapon { defaultPreset { containsItems { item { name } } } } } } }`;
  const res = await fetch("https://api.tarkov.dev/graphql", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query }),
  });
  const json = await res.json();
  const guns: { name: string; mods: string[] }[] = (json.data?.items ?? [])
    .map((it: any) => ({
      name: it.name as string,
      mods: (it.properties?.defaultPreset?.containsItems ?? [])
        .map((c: any) => c.item?.name)
        .filter(Boolean) as string[],
    }))
    .filter((g: { mods: string[] }) => g.mods.length);
  console.log(`tarkov.dev guns with a default preset: ${guns.length}`);

  // 2) attachments slug set (only map mods we actually have).
  const attachments = JSON.parse(await readFile(path.join(ROOT, "content", "attachments.json"), "utf8")) as Record<string, unknown>;
  const haveAttachment = new Set(Object.keys(attachments));

  // 3) For each of our weapons, find the best-matching tarkov.dev gun and map mods.
  const wDir = path.join(ROOT, "content", "weapons");
  const files = (await readdir(wDir)).filter((f) => f.endsWith(".json"));
  let matched = 0;
  let totalDefaults = 0;
  for (const f of files) {
    const file = path.join(wDir, f);
    const w = JSON.parse(await readFile(file, "utf8"));
    const wTok = tokens(w.name);
    let best: { mods: string[]; score: number } | null = null;
    for (const g of guns) {
      const score = overlap(wTok, tokens(g.name));
      if (!best || score > best.score) best = { mods: g.mods, score };
    }
    // Require a decent token overlap to avoid mismatches.
    const defaults =
      best && best.score >= 3
        ? [...new Set(best.mods.map(slug).filter((s) => haveAttachment.has(s)))]
        : [];
    if (defaults.length) {
      matched++;
      totalDefaults += defaults.length;
    }
    if (JSON.stringify(w.defaults) !== JSON.stringify(defaults)) {
      w.defaults = defaults;
      await writeFile(file, JSON.stringify(w, null, 2) + "\n");
    }
  }
  console.log(`Weapons with defaults: ${matched}/${files.length} (avg ${(totalDefaults / Math.max(1, matched)).toFixed(1)} mods).`);
}

main().catch((e) => { console.error(e); process.exit(1); });
