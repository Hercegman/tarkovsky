# Auth and Profiles

Part of [[Tarkovsky]].

## Model

- **Auth.js v5** (`src/lib/auth.ts`), **Credentials** provider, **JWT** sessions.
- Registration collects **email + username + password**; **login is username +
  password** (not email).
- Passwords hashed with **bcryptjs** (cost 12). Login runs a constant-time compare
  against a dummy hash when the user is missing → no username enumeration.
- DB tables (`src/lib/db/schema.ts`): `users` (id, username, email, passwordHash,
  createdAt) and `quest_progress` (see [[Progress Tracking]]).

## Flow

- Server actions in `src/app/(auth)/actions.ts`:
  - `registerAction` — validates (zod), hashes regardless of existence, inserts,
    catches Postgres unique violation (`23505`) → single generic message (no
    leak of which field collided), then signs in.
  - `loginAction` — rate-limited, then `signInOrError`.
  - `signInOrError` uses `signIn("credentials", { redirect:false })` then a manual
    `redirect("/quests")` — avoids a cookie-loss gotcha in the Auth.js beta.
  - `logoutAction` — `signOut`.
- Pages: `/login`, `/register` (`auth-form.tsx`, `useActionState`), `/profile`
  (stats + completed list + logout, redirects anon → `/login`).
- Header shows username → `/profile` + logout when signed in (`header-auth.tsx`,
  client, reads `/api/auth/session`).

## Security notes

- `trustHost` is gated behind `AUTH_TRUST_HOST` (auto-trusted on Vercel). Locally,
  set `AUTH_TRUST_HOST=true` or auth requests 500 with "UntrustedHost".
- Rate limiting (`src/lib/rate-limit.ts`) keyed on real client IP **and** identity
  (username/email) so a spoofed `X-Forwarded-For` can't bypass per-account limits.
  In-memory (per serverless instance) — back with Upstash for production-grade.
- Security headers + CSP in `next.config.ts`. Env-only secrets (`AUTH_SECRET`,
  `DATABASE_URL`). See [[Deployment]].
