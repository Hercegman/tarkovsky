# Gun Builder

Part of [[Tarkovsky]]. An **approximate, wiki-only** weapon builder at `/gun-builder`.

## What it does

Pick a weapon, fit attachments (filtered by wiki compatibility, including nested
sub-slots like a receiver's barrel/handguard), and see live approximate stats:
ergonomics, recoil ↕/↔, accuracy (MOA), weight. Logged-in users can save, load
and delete builds.

## Why approximate

A *fully accurate* builder needs game-derived data (tarkov.dev API). To keep the
project [[Licensing|wiki-only]], stats come from the EFT Wiki: weapon infoboxes
(base stats), the Mods `tabber` (compatible attachments per slot), and attachment
infoboxes (ergonomics/recoil/weight modifiers). So: not every mod/conflict is
modelled, recoil math is a simple % sum, and **cross-slot conflicts aren't
enforced** — a planning aid, not an exact in-game calculator.

## Data ingest — `scripts/ingest-weapons.mts` (`npm run ingest:weapons`)

1. Enumerates all firearms from `Category:Weapons` (filters out melee/launchers).
2. Per weapon: parse infobox base stats; parse the Mods tabber (rendered HTML +
   wikitext for slot names) → `slots: [{ name, allowed: [attachmentId] }]`.
3. Attachments (2 levels of nesting): batch-fetch infoboxes for stat modifiers +
   type; for mods that have their own Mods tabber, fetch HTML → nested sub-slots.
   Compatibility tabs and over-large lists (>60) are filtered out so the graph
   doesn't explode.
4. Download downscaled icons to `public/weapons/`.
   Output: `content/weapons/<id>.json`, `content/attachments.json`.

## Code

- `src/lib/gun-stats.ts` — pure stat engine (ergo/recoil/MOA/weight).
- `src/lib/data.ts` — `getWeapons`, `getWeapon`, `getAttachments`.
- `src/app/gun-builder/page.tsx` + `src/components/gun-builder.tsx` — the UI
  (weapon picker, recursive `SlotTree`/`SlotPicker`, live stats, save/load).
- `src/app/api/builds/route.ts` + `gun_builds` table — saved builds
  ([[Auth and Profiles]], migration `0002`).

## Extending

Add weapons by widening the `Category:Weapons` filter (already all firearms).
Tune stat math in `gun-stats.ts`. Improve nesting depth / conflict handling as
future work.
