# Data Ingest

Part of [[Tarkovsky]]. All data comes from the EFT Fandom Wiki via its MediaWiki
API (`https://escapefromtarkov.fandom.com/api.php`). The wiki blocks direct HTML
GETs (403) but the API is open. Etiquette: descriptive `User-Agent`, ~1 req/s,
`maxlag`. Ingest runs at author time and commits JSON — no live calls per user.
See [[Licensing]].

## Scripts (`scripts/*.mts`, run via `npm run …`)

### `ingest` → `scripts/ingest-wiki.mts`
Enumerates `Category:Quests`, fetches each page's wikitext, parses the
`{{Infobox quest}}` (given by, location, previous, leads to, reqkappa) plus the
Objectives/Rewards sections. Writes `content/quests/<id>.json` + `index.json`.
Flags: `--limit N`, `--trader Name`.

### `order:wiki` → `scripts/order-from-wiki.mts`
Reads the wiki **Quests** page, which has a per-trader tab listing quests in
in-game order. Orders our quests by where their title first appears in the
trader's tab block, writing `quest.order`. See [[Quests]].

### `ingest:maps` → `scripts/ingest-maps.mts`
Reads the Fandom Interactive Maps data (`Map:` namespace): base image, bounds,
categories, markers. Downloads a downscaled base image to `public/maps/<id>.<ext>`
and writes `content/maps/<id>.json`. Converts marker coords to Leaflet space.
Flags: `--map id`, `--skip-images`. See [[Maps]].

### `link:markers` → `scripts/link-quest-markers.mts`
Matches each quest's objectives against the map's quest-category marker titles
(substring / shared-words) and writes matched markers into `quest.markers`, so a
quest's location can be shown on a map.

### `ingest:images` → `scripts/ingest-quest-images.mts`
Pulls each quest's infobox banner image (downscaled webp) to
`public/quests/<id>.webp` and sets `quest.image`.

### `ingest:traders` → `scripts/ingest-trader-images.mts`
Pulls each trader's portrait to `public/traders/<id>.<ext>` and sets the image in
`content/traders.json`.

### `ingest:banners` → `scripts/ingest-map-banners.mts`
Pulls each map's wiki-page infobox **banner art** (the in-game screenshot) to
`public/maps/banner/<id>.webp`. Used as the default image on map cards, which
crossfade to the interactive map thumbnail (`public/maps/thumb/`) on hover.

## Re-running

Scripts are idempotent and only rewrite changed files. A full refresh order:
`ingest` → `order:wiki` → `ingest:maps` → `link:markers` → `ingest:images` →
`ingest:traders`. (Note: re-running `ingest` resets quest JSON, so re-run the
later enrich steps after it.)
