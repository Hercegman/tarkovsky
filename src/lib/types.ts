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
  image: string | null; // self-hosted banner image, e.g. /quests/debut.webp
  order: number | null; // in-game order within the trader (from the wiki)
  source: QuestSource;
}

export interface Trader {
  id: string; // slug, e.g. "prapor"
  name: string; // "Prapor"
  blurb?: string;
  image?: string | null; // self-hosted portrait, e.g. /traders/prapor.webp
}

export interface GameMap {
  id: string; // slug, e.g. "customs"
  name: string; // "Customs"
}

// ---- Gun builder (approximate, wiki-sourced) ----

export interface WeaponSlot {
  name: string;
  allowed: string[]; // attachment ids
}

export interface Weapon {
  id: string;
  name: string;
  page: string;
  image: string | null;
  ergonomics: number | null;
  recoilVertical: number | null;
  recoilHorizontal: number | null;
  moa: number | null;
  weight: number | null;
  fireRate: number | null;
  caliber: string | null;
  slots: WeaponSlot[];
  source: { url: string; license: string; wiki: string };
}

export interface Attachment {
  id: string;
  name: string;
  image: string | null;
  ergo: number; // ergonomics delta
  recoil: number; // recoil % delta (e.g. -20 = -20%)
  accuracy: number; // MOA delta
  weight: number; // kg
  type: string | null;
  slots?: WeaponSlot[]; // nested sub-slots (e.g. a handguard's rails)
}

export interface GunBuild {
  weaponId: string;
  items: Record<string, string>; // slotName -> attachmentId
}

export interface MapCategory {
  id: string; // e.g. "quest", "exfil_pmc"
  name: string; // "Quest Related"
  color: string; // hex
}

export interface MapPin {
  c: string; // category id
  x: number; // pixel coordinate (Leaflet CRS.Simple, top-left origin)
  y: number;
  t: string; // popup title
}

export interface MapData {
  id: string;
  name: string;
  image: string | null;
  width: number;
  height: number;
  source: QuestSource;
  categories: MapCategory[];
  markers: MapPin[];
}
