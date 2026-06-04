# Architecture

## Overview

Tarkovsky is a Next.js (App Router) app. Quest content is **static**: it is
ingested from the Escape from Tarkov Wiki at author time, committed as JSON, and
rendered as statically generated pages. The database is used **only** for user
accounts and quest progress.

```
EFT Fandom Wiki ──(MediaWiki API)──> scripts/ingest-wiki.mts ──> content/quests/*.json
                                                                       │
                                                                       ▼
                                                       src/lib/data.ts (build-time read)
                                                                       │
                                          ┌────────────────────────────┼─────────────────────────┐
                                          ▼                            ▼                          ▼
                                  /quests (browse)            /quest/[id] (detail)        /maps/[map] (Leaflet)
```

## Data flow

- **Ingest** — `scripts/ingest-wiki.mts` enumerates `Category:Quests`, fetches each
  page's wikitext via `action=parse`, parses the `{{Infobox quest}}` template plus
  the Objectives/Rewards sections, and writes one JSON file per quest to
  `content/quests/`, plus an `index.json`. Etiquette: descriptive User-Agent,
  ~1 req/s, `maxlag`. Each quest records its `source` URL + license for attribution.
- **Read** — `src/lib/data.ts` reads `content/` at build time (server-only). It is
  the single access point for quests, traders (`content/traders.json`) and maps
  (`content/maps.json`).
- **Render** — quest/trader/map pages use `generateStaticParams` and are statically
  generated. The quest browser (`components/quest-browser.tsx`) is a client island
  that filters an in-memory summary list.

## Maps

`components/map-view.tsx` is a client wrapper that dynamically imports
`leaflet-map.tsx` (`ssr: false`, since Leaflet needs `window`). Maps use
`L.CRS.Simple` with the source image as an `ImageOverlay`; markers are pixel
coordinates `{x, y}` stored per quest in `content/`. Map images live in
`public/maps/` and are recorded in `content/maps.json` with intrinsic pixel size.

## Auth & progress

- `src/lib/auth.ts` — Auth.js v5 with a **Credentials** provider (username +
  password), JWT sessions, bcrypt hashing (cost 12), and a timing-safe compare to
  avoid user enumeration.
- `src/app/(auth)/` — server actions (`registerAction`, `loginAction`,
  `logoutAction`) and the login/register pages. Registration stores email +
  username + password hash; login uses username + password.
- `src/app/api/progress/route.ts` — `GET` returns the user's completed quest ids;
  `POST` toggles one. Both require a session.
- `src/lib/db/` — Drizzle schema (`users`, `quest_progress`) and the Postgres
  client. Migrations live in `drizzle/`.

## Security

- Passwords hashed with bcrypt (cost 12); login returns a generic error and always
  runs a compare to prevent username enumeration.
- All form/API input validated with zod (`src/lib/validation.ts`).
- Parameterized queries via Drizzle (no string-built SQL).
- Security headers + CSP in `next.config.ts`.
- Baseline in-memory rate limiting (`src/lib/rate-limit.ts`) on login, register and
  progress. For production-grade limits across serverless instances, back this with
  Upstash Redis.
- Secrets (`AUTH_SECRET`, `DATABASE_URL`) come from the environment; never committed.

## Theme

Tarkov dark palette is defined as CSS variables + Tailwind v4 `@theme` tokens in
`src/app/globals.css`: dark grey background, gold accent, gunmetal and brown.
