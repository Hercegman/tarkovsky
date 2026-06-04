// Build-time data access for quests, traders and maps.
// Reads the static JSON in /content produced by scripts/ingest-wiki.mts.
import "server-only";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import type { Quest, Trader, GameMap, MapData } from "./types";

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
  const quests = await getQuests();
  return quests
    .filter((q) => q.trader === traderId)
    .sort((a, b) => (a.questNumber ?? 999) - (b.questNumber ?? 999));
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
