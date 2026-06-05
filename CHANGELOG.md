# Changelog — Project Tarkovsky

A record of every commit on `main` and what it added / changed / fixed / removed.
Live: https://tarkovsky.vercel.app · Repo: `Hercegman/tarkovsky` (auto-deploys on push).

Newest first.

---

## `8a65e76` — revert quest item images; keep shaped markers · 2026-06-05
- **Removed:** the "Items in this quest" gallery, all ~1,550 item icons
  (`public/items`), `content/items.json`, the `items` quest field, and the
  `ingest-items` script (item images looked poor).
- **Kept:** the distinct shaped map markers from the previous commit.

## `960677b` — quest item images + shaped map markers · 2026-06-05
- **Added:** item-icon ingest (`scripts/ingest-items.mts` → `content/items.json`
  + `public/items`, ~1,550 icons) and an "Items in this quest" gallery on quest
  pages. *(reverted in `8a65e76`)*
- **Changed:** map markers now use a **distinct shape per category** (diamond =
  quest, triangle = extracts, square/star = spawns, cross = locked, key = keys,
  circles for containers) plus colour; the legend shows the shapes.

## `fc446b2` — homepage cycling backdrop · 2026-06-05
- **Added:** a faint crossfading backdrop (map banners + trader portraits) behind
  the lower homepage sections (below the radar hero). `CyclingBackdrop` gained an
  `absolute` mode.

## `f51b29b` — cycling faint backdrops on /quests and /maps · 2026-06-05
- **Added:** `CyclingBackdrop` — crossfades a set of images every 4s as a faint
  fixed backdrop. Quests page cycles trader portraits (grayscale); maps page
  cycles map banner art.

## `dd87aca` — logout modal centering · 2026-06-05
- **Fixed:** the logout confirmation rendered inside the header's
  `backdrop-filter` (which becomes a containing block for fixed children), so it
  wasn't centered. Now rendered via a React portal to `document.body` — centered
  with a full-screen blur.

## `4d65ccd` — trader page polish + logout confirmation · 2026-06-05
- **Added:** the expand/reveal-image/spread-text hover to the trader quest list;
  a faint blurred trader portrait behind the trader page; a logout confirmation
  modal (`LogoutButton`) used in the header and profile.

## `c7f5589` — quest cards hover reveal · 2026-06-05
- **Added:** quest browser cards grow slightly on hover, fade in the quest banner
  behind a scrim, and spread the title (letter-spacing).

## `8988984` — profiles: avatars + friends · 2026-06-05
- **Added:** profile avatars (pick a trader portrait), a friends system (add by
  username, accept/decline, remove), and `/u/[username]` to view a friend's quest
  progress. DB: `users.avatar` + `friendships` table (migration `0001`).
  APIs: `/api/me`, `/api/me/avatar`, `/api/friends`. Header shows the avatar.

## `684de83` — map cards: art banner + interactive on hover · 2026-06-05
- **Added:** map-banner art ingest (`scripts/ingest-map-banners.mts`).
- **Changed:** map cards (homepage + `/maps`) show the banner art by default and
  crossfade to the interactive map on hover.

## `4cd02e7` — homepage map hover + smaller cursor · 2026-06-05
- **Added:** map thumbnails; homepage map cards reveal the map image on hover.
- **Changed:** shrank the Tarkov cursor (~40%).

## `8618275` — single cursor, signup notice, footer · 2026-06-05
- **Changed:** one Tarkov-style arrow cursor everywhere (from the in-game cursor
  image, background made transparent) — removed the reticle variant.
- **Added:** an IMPORTANT NOTICE modal on signup (don't reuse your real Tarkov
  password); footer states data is sourced exclusively from the official wiki.

## `7fd96be` — typewriter sounds + first cursor · 2026-06-05
- **Changed:** UI sounds became quieter percussive "key clacks" (noise + thock).
- **Added:** a first custom Tarkov cursor (later replaced by the real image).

## `feda14f` — UI sounds + Obsidian docs · 2026-06-04
- **Added:** synthesized Web-Audio UI sounds (hover/click/close) with a header
  toggle; an Obsidian documentation vault (`obsidian-vault/`).

## `22df256` — in-game quest order + trader search · 2026-06-04
- **Fixed:** trader quests were alphabetical — now in real in-game order pulled
  from the wiki Quests-page tabs (`scripts/order-from-wiki.mts` → `quest.order`).
- **Added:** a search bar on the trader page.

## `b88663b` — centered quick view + lint fix · 2026-06-04
- **Changed:** the quest quick view became a centered floating modal (was a right
  drawer). **Fixed:** a checklist lint error.

## `ab4a3be` — item checklist + smoother maps · 2026-06-04
- **Added:** per-objective checkboxes (localStorage) with a progress bar (great
  for the Collector).
- **Changed:** smoother Leaflet maps (canvas rendering, fractional zoom).

## `d62ff6e` — header Traders dropdown · 2026-06-04
- **Added:** a Traders dropdown (with portraits) in the global header.

## `db4c54c` — homepage traders + map search · 2026-06-04
- **Added:** trader portrait grid on the homepage; a search bar above the quest
  list on map pages.

## `33af03b` — per-quest map location + marker colors · 2026-06-04
- **Added:** click a quest on a map to fly to its location (objectives matched to
  wiki markers → `quest.markers`); distinct per-category marker colours.
- **Changed:** homepage shows "Provided to you by Hercegman and Priestt_" instead
  of the counts line.

## `e1e8ecc` — visual refinement · 2026-06-04
- **Changed:** grey-olive military palette (less yellow); replaced the 3D
  particle hero with a CSS radar/intel background; removed the spinning trader
  marquee; switched fonts (Oswald + Inter); added a stone-grain texture.

## `14b33fd` — v2: visuals, in-game UI, map fixes, auth hardening · 2026-06-04
- **Added:** motion library + animated landing, gold theme utilities, custom
  scrollbar, wider layouts, in-game-style quest task card + slide-in quick view,
  multi-part quest dropdowns, completed-quest badges, quest banner images +
  mini-map, `/profile` page.
- **Fixed:** map marker alignment (CRS.Simple needs no y-flip for bottom-left
  origin); hardened auth (redirect-safe sign-in, gated `trustHost`, prod DB SSL).

## `2afcb16` — interactive maps for all 10 maps · 2026-06-04
- **Added:** Fandom Interactive Maps ingest — self-hosted images + ~3,500 markers
  per category, left quests / right layer panel, fullscreen.

## `4143398` — DB connection fallback · 2026-06-04
- **Fixed:** read `POSTGRES_URL` as a fallback for `DATABASE_URL` (Vercel/Neon).

## `8c4f394` — Project Tarkovsky v1 · 2026-06-04
- **Added:** initial app — Next.js 16 quest wiki, 808 quests ingested from the
  EFT Wiki, browse/search/filter, quest pages, Leaflet maps scaffold, Auth.js
  credentials accounts + quest progress, Tarkov dark theme, docs.

---

*Generated from the git history. See [README](./README.md) and the Obsidian vault
for how each system works.*
