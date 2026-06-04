/*
 * Project Tarkovsky — derive in-game quest order from the wiki.
 *
 * The wiki "Quests" page shows a per-trader tab, each listing that trader's
 * quests in in-game order. We read each trader's tab block and order our quests
 * by where their title first appears, then store quest.order.
 *
 * Usage: node scripts/order-from-wiki.mts
 */
import { readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";

const UA =
  "ProjectTarkovsky/1.0 (https://github.com/Hercegman/tarkovsky; grizelj.roko@gmail.com)";
const API = "https://escapefromtarkov.fandom.com/api.php";
const ROOT = process.cwd();
const QUESTS = path.join(ROOT, "content", "quests");

async function api(params: Record<string, string>): Promise<any> {
  const url = new URL(API);
  url.search = new URLSearchParams({ format: "json", formatversion: "2", ...params }).toString();
  const res = await fetch(url, { headers: { "User-Agent": UA } });
  if (!res.ok) throw new Error(`API ${res.status}`);
  return res.json();
}

const slug = (s: string) =>
  s.toLowerCase().replace(/['’]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");

async function main() {
  const wt: string = (await api({ action: "parse", page: "Quests", prop: "wikitext" }))
    .parse.wikitext;

  // Trader tab order from the tab labels.
  const tabOrder = [...wt.matchAll(/\[\[File:([A-Za-z ]+?) Portrait\.png/g)].map((m) =>
    slug(m[1].trim()),
  );
  const blocks = wt.split("wds-tab__content").slice(1); // block[i] ~ tabOrder[i]
  console.log("tabs:", tabOrder.join(", "), "| blocks:", blocks.length);

  // Load quests grouped by trader.
  const files = (await readdir(QUESTS)).filter((f) => f.endsWith(".json") && f !== "index.json");
  const byTrader = new Map<string, { id: string; title: string; file: string; json: any }[]>();
  for (const f of files) {
    const file = path.join(QUESTS, f);
    const json = JSON.parse(await readFile(file, "utf8"));
    const arr = byTrader.get(json.trader) ?? [];
    arr.push({ id: json.id, title: json.title, file, json });
    byTrader.set(json.trader, arr);
  }

  let ordered = 0;
  for (let i = 0; i < tabOrder.length; i++) {
    const trader = tabOrder[i];
    const block = blocks[i] ?? "";
    const quests = byTrader.get(trader) ?? [];
    for (const q of quests) {
      const a = block.indexOf(`[[${q.title}]]`);
      const b = block.indexOf(`[[${q.title}|`);
      const pos = Math.min(a < 0 ? Infinity : a, b < 0 ? Infinity : b);
      q.json.order = Number.isFinite(pos) ? pos : null;
    }
    // Reassign as 0..n-1 ranks by position; unmatched (null) keep null.
    const matched = quests.filter((q) => q.json.order != null).sort((x, y) => x.json.order - y.json.order);
    matched.forEach((q, rank) => (q.json.order = rank));
    ordered += matched.length;
  }

  // Quests whose trader had no tab block keep order=null.
  for (const arr of byTrader.values())
    for (const q of arr) {
      if (q.json.order === undefined) q.json.order = null;
      await writeFile(q.file, JSON.stringify(q.json, null, 2) + "\n");
    }

  console.log(`Set wiki order on ${ordered} quests.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
