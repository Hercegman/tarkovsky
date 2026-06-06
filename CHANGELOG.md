# Changelog — Project Tarkovsky

A record of every commit on `main` and what it added / changed / fixed / removed.
Live: https://tarkovsky.vercel.app · Repo: `Hercegman/tarkovsky` (auto-deploys on push).

Newest first.

---

## `_pending_` — real UI sounds, gun stat baseline, shared extracts · 2026-06-06
- **Changed:** UI sounds now play three real audio clips (hover / click / close,
  in `public/sounds/`) decoded via Web Audio for low-latency overlap, replacing
  the synthesized key-clack. Hover is throttled; volume per clip is tuned.
- **Changed:** the gun builder now reports stats relative to the weapon's **factory
  default build** (all default attachments installed), matching the Totov Builder
  model — recoil = base × (1 + Σ recoil%), ergonomics/weight additive. Picking a
  weapon starts at delta 0; swapping a mod shows the change vs the default loadout.
- **Added:** co-located PMC + Scav extracts that share a name are merged into a
  single **Shared Extraction** pin (sunburst-yellow) to cut map clutter — 33 across
  the 10 maps. New `scripts/merge-shared-extracts.mts` (idempotent, also run inside
  `ingest:maps`); `exfil_shared` is on by default in the layer panel.

## `2fb3f3a` — centre the map vertically · 2026-06-06
- **Changed:** the map is now vertically centred within the sidebar row
  (`lg:self-center`) so it sits towards the middle instead of pinned to the top.

## `4dee050` — full-bleed map layout: edge sidebars, bigger map · 2026-06-06
- **Changed:** the map page now spans the full page width — the quests and layers
  sidebars sit at the left/right page edges, and the map fills the freed centre
  space (bigger). Both sidebars are now the same fixed height (`88vh`) and scroll
  independently; the map cap was raised to `88vh` so it's taller too.

## `c9f6b2a` — map fills its box; gun builder default loadouts · 2026-06-06
- **Changed:** the map container now uses the map image's aspect ratio, so the
  image fills the box edge-to-edge (no empty/white margin); fullscreen still fills.
- **Added:** gun builder pre-installs each weapon's **factory default attachments**
  (default presets fetched from tarkov.dev → `scripts/ingest-default-presets.mts`,
  mapped to wiki attachments). So stats start at the default gun and swapping a mod
  computes the correct delta. Footer notes default loadouts come from tarkov.dev;
  all other data stays wiki-sourced.

## `6ff4da9` — maps: bigger layout, no white background · 2026-06-06
- **Changed:** wider map page; bigger quests + layers sidebars; taller map (82vh).
- **Fixed:** removed Leaflet's default light-grey background around the map image
  (`.leaflet-container` transparent) so there's no white box around the map.

## `69de476` — gun builder: fix stat parsing + show base/delta · 2026-06-05
- **Fixed:** empty wiki infobox fields bled into the next field, so `accuracy`
  picked up recoil values (negative MOA) — numbers now stop at a pipe
  (`scripts/fix-weapon-stats.mts` re-parsed all weapons/attachments). Accuracy and
  weight are now sane.
- **Changed:** the stats panel shows the change vs the bare-weapon base (coloured
  +/- delta) and clarifies that base = bare weapon, mods add modifiers.

## `1c35e7c` — gun builder: all firearms + nested slots · 2026-06-05
- **Added:** the builder now covers **all 145 firearms** (auto-ingested from the
  wiki) with **1,790 attachments**, and **nested sub-slots** (e.g. a receiver's
  barrel/handguard) rendered recursively. Filters drop wiki "Compatibility" tabs
  so the attachment graph stays sane. Obsidian `Gun Builder` note added.

## `3fc7a78` — gun builder: fix blank attachment/weapon images · 2026-06-05
- **Fixed:** images in the builder rendered blank — switched from `next/image`
  `fill` (in flex containers) to plain `<img>`, so weapon and attachment icons show.

## `1682b60` — gun builder: save & load builds · 2026-06-05
- **Added:** logged-in users can name and save gun builds, then load or delete
  them. DB `gun_builds` table (migration `0002`); `/api/builds` GET/POST/DELETE
  (session-scoped, validated, rate-limited); save/load UI in the builder.

## `9e24753` — gun builder (wiki-sourced, approximate) · 2026-06-05
- **Added:** a `/gun-builder` page — pick a weapon, fit attachments (filtered by
  wiki compatibility), and see live approximate stats (ergonomics, recoil V/H,
  MOA, weight). Data ingested from the EFT Wiki for a curated weapon set
  (`scripts/ingest-weapons.mts` → `content/weapons`, `content/attachments.json`,
  `public/weapons`); stat engine in `src/lib/gun-stats.ts`. Header nav link added.
  (Saving builds + nested slots + more weapons come next.)

## `f2d89ee` — dynamic backdrop on the full quest page · 2026-06-05
- **Added:** the quest detail page now has a faint cycling backdrop (its map
  banners + trader portrait) like the other pages.

## `8ce223a` — quest marker hover image + description · 2026-06-05
- **Added:** quest location markers now show a hover tooltip with a template
  image (`public/location-template.webp`, red "TEMPLATE" overlay) plus the
  objective text. The wiki has no per-marker location images, so a template is
  used everywhere (swap the file when real images exist).

## `58d7804` — clearer extraction layer labels · 2026-06-05
- **Changed:** the map layer panel now labels the extraction categories "PMC
  Extraction", "Scav Extraction", "Transit Extraction" (were just "PMC", "Scav",
  "Transit") via a `categoryLabel` override.

## `fa662bb` — themed hover tooltips + extract template image · 2026-06-05
- **Changed:** map marker info now shows on **hover** (Leaflet `Tooltip`) instead
  of on click, styled in the site's colours (dark surface, gold-dim border, gold
  title) instead of the white/black default.
- **Added:** extraction markers show a **template extract image**
  (`public/extract-template.webp`) in the tooltip with a red "TEMPLATE" overlay.

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
