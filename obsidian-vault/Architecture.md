# Architecture

Part of [[Tarkovsky]].

## Big picture

Quest/map content is **static**: ingested from the wiki at author time, committed
as JSON under `content/`, and rendered as statically generated pages. A database
is used **only** for user accounts and progress ([[Auth and Profiles]],
[[Progress Tracking]]).

```
EFT Fandom Wiki ──(MediaWiki API)──> scripts/*.mts ──> content/quests/*.json
                                                        content/maps/*.json
                                                        content/traders.json
                                                              │
                                              src/lib/data.ts (build-time read)
                                                              │
                  ┌───────────────────────────┬──────────────┴─────────────┐
              /quests, /quests/[trader]   /quest/[id]                  /maps/[map]
              (lists, search, order)      (task card + mini map)       (MapExplorer + Leaflet)
```

## Folders

- `src/app/` — App Router pages and API routes.
- `src/components/` — UI (client islands for interactivity).
- `src/lib/` — data access (`data.ts`), pure helpers (`quest-utils.ts`),
  colors (`map-colors.ts`), sounds (`sound.ts`), auth (`auth.ts`), db.
- `content/` — committed JSON data (quests, maps, traders).
- `public/quests`, `public/maps`, `public/traders` — self-hosted images.
- `scripts/*.mts` — ingest/processing scripts (run with `node`, Node 24 strips types).

## Rendering model

- Quest/trader/map pages use `generateStaticParams` → **SSG** (prerendered).
- `params`/`searchParams` are **Promises** in Next 16 (must `await`).
- Interactive bits (maps, quick view, checklists, search, sounds) are
  `"use client"` islands. Leaflet is loaded via `next/dynamic` with `ssr:false`.
- Auth pages and API routes are dynamic.

See [[Tech Stack]] for versions and [[Data Ingest]] for where the JSON comes from.
