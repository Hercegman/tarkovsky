# Tech Stack

Part of [[Tarkovsky]].

- **Next.js 16** (App Router) + **React 19** + **TypeScript**.
- **Tailwind CSS v4** (CSS `@theme`, no `tailwind.config.js`) — see [[Theming and UI]].
- **motion** (`motion/react`) for animations; CSS for the radar background.
- **Leaflet** + **react-leaflet v5** for maps ([[Maps]]).
- **Drizzle ORM** + **postgres** (postgres-js) on **Neon/Vercel Postgres** ([[Deployment]]).
- **Auth.js v5** (next-auth beta) Credentials provider ([[Auth and Profiles]]).
- **zod** for validation, **bcryptjs** for password hashing.
- Web Audio API for [[Sounds]] (no audio files).

## Conventions / gotchas

- Node 24 runs `.mts` scripts directly (native type stripping) — `npm run ingest` etc.
- `params` and `searchParams` are Promises in Next 16; global `PageProps<'/route'>`
  helper types are generated on build/dev.
- Leaflet touches `window` → only import map components via `dynamic(..., {ssr:false})`.
- The React Compiler lint rules forbid impure calls (`Math.random`) during render
  and synchronous `setState` in effects — work around with deterministic PRNGs
  or a justified `eslint-disable-next-line react-hooks/set-state-in-effect`.

## Scripts (package.json)

- `dev` / `build` / `start` / `lint`
- `ingest` — quests; `ingest:maps` — map images + markers; `ingest:images` —
  quest banners; `ingest:traders` — trader portraits; `link:markers` — link
  objectives to map markers; `order:wiki` — in-game quest order.
- `db:generate` / `db:migrate` / `db:push` — Drizzle.

Details in [[Data Ingest]].
