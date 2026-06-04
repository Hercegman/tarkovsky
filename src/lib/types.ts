// Core data model for Project Tarkovsky.
// Quest content is ingested from the Escape from Tarkov Wiki (Fandom) — see scripts/ingest-wiki.ts.

export interface QuestRef {
  id: string;
  title: string;
}

export interface ReputationDelta {
  trader: string;
  delta: number;
}

export interface ItemReward {
  name: string;
  amount: number;
}

export interface QuestRewards {
  exp: number | null;
  roubles: number | null;
  reputation: ReputationDelta[];
  items: ItemReward[];
  unlocks: string[];
}

export interface QuestItem {
  name: string;
  amount: number;
  foundInRaid: boolean;
}

export interface MapMarker {
  map: string; // map slug
  x: number; // pixel coordinate on the source map image
  y: number;
  label: string;
}

export interface QuestSource {
  url: string;
  license: string; // "CC BY-NC-SA"
  wiki: string; // "Escape from Tarkov Wiki"
  fetchedAt: string; // ISO timestamp
}

export interface Quest {
  id: string; // stable slug, e.g. "debut"
  title: string;
  pageId: number;
  trader: string; // trader slug, from infobox `given by`
  questNumber: number | null;
  requiredLevel: number | null;
  maps: string[]; // map slugs, from infobox `location`
  kappaRequired: boolean;
  prerequisites: QuestRef[];
  leadsTo: QuestRef[];
  objectives: string[];
  rewards: QuestRewards;
  questItems: QuestItem[];
  guideHtml: string | null;
  guideText: string | null;
  markers: MapMarker[];
  source: QuestSource;
}

export interface Trader {
  id: string; // slug, e.g. "prapor"
  name: string; // "Prapor"
  blurb?: string;
}

export interface GameMap {
  id: string; // slug, e.g. "customs"
  name: string; // "Customs"
  image: string | null; // /maps/customs.png (self-hosted)
  width: number | null; // intrinsic pixel size for Leaflet CRS.Simple bounds
  height: number | null;
  source?: QuestSource;
}
