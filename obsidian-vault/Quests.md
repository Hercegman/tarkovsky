# Quests

Part of [[Tarkovsky]]. See [[Data Ingest]] for how quest JSON is produced.

## Data shape (`content/quests/<id>.json`)

Key fields: `id`, `title`, `trader`, `requiredLevel`, `maps`, `kappaRequired`,
`prerequisites[]`, `leadsTo[]`, `objectives[]`, `rewards`, `markers[]` (map
locations), `image` (banner), `order` (in-game order), `source` (attribution).
Type: `src/lib/types.ts` → `Quest`.

## Pages

- `/quests` — searchable/filterable list (trader, map, Kappa, hide-done). Clicking
  a quest opens a **centered modal quick view** (`quest-quick-view.tsx`) that lazy
  loads `/api/quest/[id]`.
- `/quests/[trader]` — that trader's quests in **in-game order**, with a search bar
  and multi-part series collapsed into dropdowns (`trader-quest-list.tsx`).
- `/quest/[id]` — in-game-style task card: banner image, objectives as a
  checklist, quest line (requires/unlocks), rewards, and a mini map of the
  location ([[Maps]]).

## In-game order

`questNumber` is present on almost no quests, and the within-trader prerequisite
graph alone sorts roughly alphabetically. So order comes from the wiki Quests-page
tabs (`order:wiki` → `quest.order`). `getQuestsByTrader` sorts by `order`, then
falls back to a topological sort (`orderQuests` in `src/lib/quest-utils.ts`) for
quests the wiki order didn't cover.

## Multi-part series (#11)

`groupQuestParts` (in `quest-utils.ts`) collapses `"<Base> - Part N"` titles into
one collapsible group with ordered children. Used on the trader page.

## Item checklist

`objective-checklist.tsx` renders each objective with a checkbox, persisted in
`localStorage` (key `tark:items:<questId>`) with a progress bar — great for the
**Collector**. This is browser-local and needs no login (distinct from
[[Progress Tracking]] which is the per-quest "completed" state in the DB).
