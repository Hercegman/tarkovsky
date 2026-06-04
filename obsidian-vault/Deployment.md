# Deployment

Part of [[Tarkovsky]].

## Where it runs

- **Vercel**, team **"Roko's projects"** (slug `rocode`), project `tarkovsky`,
  **git-connected** to `Hercegman/tarkovsky` → every push to `main` auto-deploys.
- **Database:** Neon Postgres (`neon-coffee-harbor`) via the Vercel Marketplace,
  connected to the project (injects `DATABASE_URL` / `POSTGRES_URL`).
- Live: https://tarkovsky.vercel.app

## Environment variables

| Variable | Purpose |
|---|---|
| `AUTH_SECRET` | Auth.js JWT/session signing secret |
| `DATABASE_URL` (or `POSTGRES_URL`) | Neon/Postgres connection (code reads either) |
| `AUTH_TRUST_HOST` | set `true` only off-Vercel / for local `npm start` |

## Ship a change

1. `npm run build` and `npm run lint` locally.
2. Commit and `git push origin main` → Vercel builds and deploys automatically.
3. Verify live routes (curl) and check runtime logs (Vercel dashboard / MCP).

## Database migrations

Drizzle migrations live in `drizzle/`. Apply with `npm run db:migrate` against the
production `DATABASE_URL` (e.g. `vercel env pull .env.local` first, or paste the
Neon URL). Only needed when `src/lib/db/schema.ts` changes.

## Local dev

`cp .env.example .env.local`, set `AUTH_SECRET` (`npx auth secret`) and the Neon
`DATABASE_URL`; for local auth also `AUTH_TRUST_HOST=true`. Then `npm run dev`.
Content renders without a DB; only accounts/progress need it. See
[[Auth and Profiles]].
