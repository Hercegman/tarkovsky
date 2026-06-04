/*
 * Project Tarkovsky — wiki ingest.
 *
 * Pulls quest data from the Escape from Tarkov Wiki (Fandom) MediaWiki API and
 * writes content/quests/*.json + content/quests/index.json.
 *
 * Source: https://escapefromtarkov.fandom.com — content licensed CC BY-NC-SA.
 * The wiki blocks direct HTML GETs (403) but api.php is open, so we use it.
 * Etiquette: descriptive User-Agent, ~1 req/s, batch where possible, maxlag.
 *
 * Usage:
 *   node scripts/ingest-wiki.mts                 # full ingest (all quests)
 *   node scripts/ingest-wiki.mts --limit 10      # first 10 quests (fast dev)
 *   node scripts/ingest-wiki.mts --trader Prapor # only one trader's quests
 */
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const API = "https://escapefromtarkov.fandom.com/api.php";
const WIKI = "Escape from Tarkov Wiki";
const LICENSE = "CC BY-NC-SA";
const UA =
  "ProjectTarkovsky/1.0 (https://github.com/Hercegman/tarkovsky; grizelj.roko@gmail.com)";
const CONTENT_DIR = path.resolve(process.cwd(), "content", "quests");

const args = process.argv.slice(2);
const limit = numericFlag("--limit");
const traderFilter = stringFlag("--trader")?.toLowerCase() ?? null;

function numericFlag(name: string): number | null {
  const i = args.indexOf(name);
  return i >= 0 && args[i + 1] ? Number(args[i + 1]) : null;
}
function stringFlag(name: string): string | null {
  const i = args.indexOf(name);
  return i >= 0 && args[i + 1] ? args[i + 1] : null;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function api(params: Record<string, string>): Promise<any> {
  const url = new URL(API);
  url.search = new URLSearchParams({
    format: "json",
    formatversion: "2",
    maxlag: "5",
    ...params,
  }).toString();

  for (let attempt = 0; attempt < 5; attempt++) {
    const res = await fetch(url, { headers: { "User-Agent": UA } });
    if (res.status === 429 || res.status === 503) {
      const retry = Number(res.headers.get("retry-after")) || 5;
      console.warn(`  rate-limited, waiting ${retry}s…`);
      await sleep(retry * 1000);
      continue;
    }
    if (!res.ok) throw new Error(`API ${res.status} for ${url}`);
    const json = await res.json();
    if (json.error?.code === "maxlag") {
      await sleep(5000);
      continue;
    }
    return json;
  }
  throw new Error(`API failed after retries: ${url}`);
}

function slugify(title: string): string {
  return title
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function stripLinks(s: string): string {
  // [[Page|Label]] -> Label ; [[Page]] -> Page ; ''bold''/'''italic''' removed
  return s
    .replace(/\[\[([^\]|]+)\|([^\]]+)\]\]/g, "$2")
    .replace(/\[\[([^\]]+)\]\]/g, "$1")
    .replace(/'''?/g, "")
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<[^>]+>/g, "")
    .trim();
}

function toRefs(field: string): { id: string; title: string }[] {
  if (!field) return [];
  const refs: { id: string; title: string }[] = [];
  const re = /\[\[([^\]|]+)(?:\|[^\]]+)?\]\]/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(field))) {
    const title = m[1].trim();
    if (title) refs.push({ id: slugify(title), title });
  }
  return refs;
}

/** Extract the first {{Infobox quest ...}} block respecting nested braces. */
function extractInfobox(wikitext: string): string | null {
  const start = wikitext.search(/\{\{\s*Infobox quest/i);
  if (start < 0) return null;
  let depth = 0;
  for (let i = start; i < wikitext.length - 1; i++) {
    if (wikitext[i] === "{" && wikitext[i + 1] === "{") {
      depth++;
      i++;
    } else if (wikitext[i] === "}" && wikitext[i + 1] === "}") {
      depth--;
      i++;
      if (depth === 0) return wikitext.slice(start, i + 1);
    }
  }
  return null;
}

/** Split infobox body on top-level pipes (ignoring those inside {{}} or [[]]). */
function parseInfobox(infobox: string): Record<string, string> {
  const body = infobox.replace(/^\{\{\s*Infobox quest/i, "").replace(/\}\}$/, "");
  const parts: string[] = [];
  let depthBrace = 0;
  let depthBracket = 0;
  let cur = "";
  for (let i = 0; i < body.length; i++) {
    const c = body[i];
    const c2 = body[i + 1];
    if (c === "{" && c2 === "{") {
      depthBrace++;
      cur += "{{";
      i++;
    } else if (c === "}" && c2 === "}") {
      depthBrace--;
      cur += "}}";
      i++;
    } else if (c === "[" && c2 === "[") {
      depthBracket++;
      cur += "[[";
      i++;
    } else if (c === "]" && c2 === "]") {
      depthBracket--;
      cur += "]]";
      i++;
    } else if (c === "|" && depthBrace === 0 && depthBracket === 0) {
      parts.push(cur);
      cur = "";
    } else {
      cur += c;
    }
  }
  parts.push(cur);

  const out: Record<string, string> = {};
  for (const p of parts) {
    const eq = p.indexOf("=");
    if (eq < 0) continue;
    const key = p.slice(0, eq).trim().toLowerCase();
    const val = p.slice(eq + 1).trim();
    if (key) out[key] = val;
  }
  return out;
}

/** Pull a "== Section ==" block's bulleted lines as plain text. */
function sectionBullets(wikitext: string, heading: RegExp): string[] {
  const lines = wikitext.split("\n");
  const out: string[] = [];
  let inSection = false;
  for (const line of lines) {
    const h = line.match(/^==+\s*(.+?)\s*==+\s*$/);
    if (h) {
      inSection = heading.test(h[1].trim());
      continue;
    }
    if (inSection && /^\*+\s*/.test(line)) {
      const text = stripLinks(line.replace(/^\*+\s*/, ""));
      if (text) out.push(text);
    }
  }
  return out;
}

function firstNumber(s: string): number | null {
  const m = s.replace(/[, ]/g, "").match(/-?\d+/);
  return m ? Number(m[0]) : null;
}

function mapSlugs(location: string): string[] {
  return toRefs(location)
    .map((r) => r.title)
    .concat(stripLinks(location).split(/[,/]| and /))
    .map((s) => slugify(s.trim()))
    .filter((s, i, a) => s && a.indexOf(s) === i);
}

interface QuestOut {
  id: string;
  title: string;
  pageId: number;
  trader: string;
  questNumber: number | null;
  requiredLevel: number | null;
  maps: string[];
  kappaRequired: boolean;
  prerequisites: { id: string; title: string }[];
  leadsTo: { id: string; title: string }[];
  objectives: string[];
  rewards: {
    exp: number | null;
    roubles: number | null;
    reputation: { trader: string; delta: number }[];
    items: { name: string; amount: number }[];
    unlocks: string[];
  };
  questItems: { name: string; amount: number; foundInRaid: boolean }[];
  guideHtml: string | null;
  guideText: string | null;
  markers: { map: string; x: number; y: number; label: string }[];
  image: string | null;
  source: { url: string; license: string; wiki: string; fetchedAt: string };
}

async function listQuestTitles(): Promise<{ title: string; pageid: number }[]> {
  const titles: { title: string; pageid: number }[] = [];
  let cmcontinue: string | undefined;
  do {
    const data = await api({
      action: "query",
      list: "categorymembers",
      cmtitle: "Category:Quests",
      cmlimit: "500",
      cmtype: "page",
      ...(cmcontinue ? { cmcontinue } : {}),
    });
    for (const m of data.query?.categorymembers ?? []) {
      titles.push({ title: m.title, pageid: m.pageid });
    }
    cmcontinue = data.continue?.cmcontinue;
    if (cmcontinue) await sleep(1000);
  } while (cmcontinue);
  return titles;
}

async function fetchQuest(
  title: string,
  pageid: number,
  fetchedAt: string,
): Promise<QuestOut | null> {
  const data = await api({ action: "parse", page: title, prop: "wikitext" });
  const wikitext: string | undefined = data.parse?.wikitext;
  if (!wikitext) return null;

  const infoRaw = extractInfobox(wikitext);
  const info = infoRaw ? parseInfobox(infoRaw) : {};

  const trader = slugify(stripLinks(info["given by"] ?? ""));
  if (traderFilter && trader !== traderFilter) return null;

  const objectives = sectionBullets(wikitext, /objective/i);
  const rewardLines = sectionBullets(wikitext, /reward/i);
  const exp = rewardLines.map(firstNumber).find((n) => n && n > 0) ?? null;

  return {
    id: slugify(title),
    title,
    pageId: pageid,
    trader: trader || "unknown",
    questNumber: info["quest number"] ? firstNumber(info["quest number"]) : null,
    requiredLevel: info["required level"]
      ? firstNumber(info["required level"])
      : null,
    maps: mapSlugs(info["location"] ?? ""),
    kappaRequired: /yes|true|1/i.test(info["reqkappa"] ?? ""),
    prerequisites: toRefs(info["previous"] ?? ""),
    leadsTo: toRefs(info["leads to"] ?? ""),
    objectives,
    rewards: {
      exp,
      roubles: null,
      reputation: [],
      items: [],
      unlocks: [],
    },
    questItems: [],
    guideHtml: null,
    guideText: null,
    markers: [],
    image: null,
    source: {
      url: `https://escapefromtarkov.fandom.com/wiki/${encodeURIComponent(title.replace(/ /g, "_"))}`,
      license: LICENSE,
      wiki: WIKI,
      fetchedAt,
    },
  };
}

async function main() {
  const fetchedAt = new Date().toISOString();
  await mkdir(CONTENT_DIR, { recursive: true });

  console.log("Enumerating Category:Quests…");
  let titles = await listQuestTitles();
  console.log(`Found ${titles.length} quest pages.`);
  if (limit) titles = titles.slice(0, limit);

  const index: { id: string; title: string; trader: string; maps: string[] }[] = [];
  let ok = 0;
  for (const [i, t] of titles.entries()) {
    try {
      const quest = await fetchQuest(t.title, t.pageid, fetchedAt);
      if (quest) {
        await writeFile(
          path.join(CONTENT_DIR, `${quest.id}.json`),
          JSON.stringify(quest, null, 2) + "\n",
        );
        index.push({
          id: quest.id,
          title: quest.title,
          trader: quest.trader,
          maps: quest.maps,
        });
        ok++;
      }
      if ((i + 1) % 25 === 0)
        console.log(`  …${i + 1}/${titles.length} processed (${ok} written)`);
    } catch (err) {
      console.warn(`  ! ${t.title}: ${(err as Error).message}`);
    }
    await sleep(1000); // ~1 req/s etiquette
  }

  index.sort((a, b) => a.title.localeCompare(b.title));
  await writeFile(
    path.join(CONTENT_DIR, "index.json"),
    JSON.stringify({ generatedAt: fetchedAt, count: index.length, quests: index }, null, 2) +
      "\n",
  );
  console.log(`Done. Wrote ${ok} quests + index.json to content/quests/.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
