// Build-time data access for quests, traders and maps.
// Reads the static JSON in /content produced by scripts/ingest-wiki.mts.
import "server-only";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import type {
  Quest,
  Trader,
  GameMap,
  MapData,
  Weapon,
  Attachment,
} from "./types";
import { orderQuests } from "./quest-utils";

let weaponCache: Weapon[] | null = null;
let attachmentCache: Record<string, Attachment> | null = null;

export async function getWeapons(): Promise<Weapon[]> {
  if (weaponCache) return weaponCache;
  const dir = path.join(CONTENT, "weapons");
  let files: string[];
  try {
    files = (await readdir(dir)).filter((f) => f.endsWith(".json"));
  } catch {
    return [];
  }
  const weapons = await Promise.all(
    files.map((f) => readJson<Weapon>(path.join(dir, f))),
  );
  weapons.sort((a, b) => a.name.localeCompare(b.name));
  weaponCache = weapons;
  return weapons;
}

export async function getWeapon(id: string): Promise<Weapon | null> {
  const weapons = await getWeapons();
  return weapons.find((w) => w.id === id) ?? null;
}

export async function getAttachments(): Promise<Record<string, Attachment>> {
  if (attachmentCache) return attachmentCache;
  try {
    attachmentCache = await readJson<Record<string, Attachment>>(
      path.join(CONTENT, "attachments.json"),
    );
  } catch {
    attachmentCache = {};
  }
  return attachmentCache;
}

const CONTENT = path.resolve(process.cwd(), "content");

async function readJson<T>(file: string): Promise<T> {
  return JSON.parse(await readFile(file, "utf8")) as T;
}

export async function getTraders(): Promise<Trader[]> {
  return readJson<Trader[]>(path.join(CONTENT, "traders.json"));
}

export async function getTrader(id: string): Promise<Trader | null> {
  const traders = await getTraders();
  return traders.find((t) => t.id === id) ?? null;
}

export async function getMaps(): Promise<GameMap[]> {
  return readJson<GameMap[]>(path.join(CONTENT, "maps.json"));
}

export async function getMap(id: string): Promise<GameMap | null> {
  const maps = await getMaps();
  return maps.find((m) => m.id === id) ?? null;
}

/** Full interactive-map data (image, bounds, categories, markers). */
export async function getMapData(id: string): Promise<MapData | null> {
  try {
    return await readJson<MapData>(
      path.join(CONTENT, "maps", `${id}.json`),
    );
  } catch {
    return null;
  }
}

let questCache: Quest[] | null = null;

export async function getQuests(): Promise<Quest[]> {
  if (questCache) return questCache;
  const dir = path.join(CONTENT, "quests");
  let files: string[];
  try {
    files = (await readdir(dir)).filter(
      (f) => f.endsWith(".json") && f !== "index.json",
    );
  } catch {
    return []; // no ingest run yet
  }
  const quests = await Promise.all(
    files.map((f) => readJson<Quest>(path.join(dir, f))),
  );
  quests.sort((a, b) => a.title.localeCompare(b.title));
  questCache = quests;
  return quests;
}

export async function getQuest(id: string): Promise<Quest | null> {
  const quests = await getQuests();
  return quests.find((q) => q.id === id) ?? null;
}

export async function getQuestsByTrader(traderId: string): Promise<Quest[]> {
  const quests = (await getQuests()).filter((q) => q.trader === traderId);
  // Prefer the wiki's in-game order; fall back to a topological sort of the
  // prerequisite graph for any quests the wiki order didn't cover.
  const withOrder = quests
    .filter((q) => q.order != null)
    .sort((a, b) => (a.order as number) - (b.order as number));
  const without = orderQuests(quests.filter((q) => q.order == null));
  return [...withOrder, ...without];
}

export async function getQuestsByMap(mapId: string): Promise<Quest[]> {
  const quests = await getQuests();
  return quests.filter((q) => q.maps.includes(mapId));
}

/** Counts of quests per trader id (for listing pages). */
export async function getTraderQuestCounts(): Promise<Record<string, number>> {
  const quests = await getQuests();
  const counts: Record<string, number> = {};
  for (const q of quests) counts[q.trader] = (counts[q.trader] ?? 0) + 1;
  return counts;
}

/** Counts of quests per map id. */
export async function getMapQuestCounts(): Promise<Record<string, number>> {
  const quests = await getQuests();
  const counts: Record<string, number> = {};
  for (const q of quests) for (const m of q.maps) counts[m] = (counts[m] ?? 0) + 1;
  return counts;
}
