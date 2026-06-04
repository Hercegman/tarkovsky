# Tarkovsky

A clean, **beginner-focused wiki for Escape from Tarkov quests**, with interactive
maps. Other wikis bury you in detail — Tarkovsky shows just what you need to plan
and finish tasks: objectives, prerequisites, rewards, and where to go.

Primarily built for PC web.

## Features

- **Quest wiki** — every task, grouped by trader, with search and filters (trader,
  map, Kappa-required). Quest pages show objectives, the quest line (requires /
  unlocks), rewards, and a link back to the source wiki page.
- **Interactive maps** — pan/zoom Leaflet maps (`CRS.Simple`) for all 10 locations,
  with toggleable marker layers (quest-related, extracts, spawns, keys, loot)
  ingested from the wiki's interactive-map data.
- **Accounts & progress** — register (email + username + password), log in with
  **username + password**, and tick off quests as you complete them.

## Data source & licensing

All quest data is ingested **only** from the
[Escape from Tarkov Wiki](https://escapefromtarkov.fandom.com) via its MediaWiki
API — **no game-mined data and no game/tarkov.dev APIs**. Content is licensed
**CC BY-NC-SA**; this project is free and **non-commercial**, attributes the wiki
site-wide and per quest, and is not affiliated with Battlestate Games. See
[ATTRIBUTION.md](./ATTRIBUTION.md).

## Tech stack

- Next.js 16 (App Router) + TypeScript, Tailwind CSS v4 (Tarkov dark theme)
- Drizzle ORM + Postgres (Vercel Postgres / Neon)
- Auth.js v5 (Credentials: username + password, JWT sessions, bcrypt hashing)
- Leaflet / react-leaflet for maps
- Deployed on Vercel

## Getting started

```bash
npm install
cp .env.example .env.local          # then fill in AUTH_SECRET and DATABASE_URL
npx auth secret                      # generates AUTH_SECRET into .env.local
npm run db:migrate                   # apply DB schema (needs DATABASE_URL)
npm run ingest                       # pull quest data from the EFT Wiki → content/quests
npm run dev
```

Open http://localhost:3000.

### Environment variables

| Variable       | Purpose                                             |
| -------------- | --------------------------------------------------- |
| `AUTH_SECRET`  | Auth.js session/JWT signing secret                  |
| `DATABASE_URL` | Postgres connection string (Vercel Postgres / Neon) |

## Scripts

| Script                | Description                                                   |
| --------------------- | ------------------------------------------------------------ |
| `npm run dev`         | Start the dev server                                         |
| `npm run build`       | Production build                                             |
| `npm run ingest`      | Ingest quests from the EFT Wiki (`--limit`, `--trader` flags) |
| `npm run ingest:maps` | Ingest map images + marker layers from the wiki (`--map` flag) |
| `npm run db:migrate`  | Apply Drizzle migrations                                     |
| `npm run db:generate` | Regenerate migrations after editing the schema               |

## Deploying to Vercel

1. Push to GitHub and import the repo in Vercel.
2. Add a **Vercel Postgres** (Neon) integration → it sets `DATABASE_URL`.
3. Add `AUTH_SECRET` to the project's environment variables.
4. Run `npm run db:migrate` against the database once.
5. Deploy. Quest content is committed in `content/`, so no DB is needed to render
   the wiki — only accounts/progress use the database.

See [ARCHITECTURE.md](./ARCHITECTURE.md) for how the pieces fit together.
