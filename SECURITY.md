# Security

This documents the security posture of Tarkovsky and known follow-ups. A focused
adversarial review of the auth/DB/API surface found **no critical or exploitable
issues**; the items below are the hardening that was applied and what remains.

## Applied

- **Password hashing** with bcrypt (cost 12). Login runs a constant-time compare
  against a dummy hash when the user is missing, so it can't be used to enumerate
  usernames (`src/lib/auth.ts`).
- **Registration does not leak account existence.** No racy pre-check: it hashes
  regardless, inserts, and on a unique-constraint violation returns a single
  generic message that doesn't reveal whether the username or the email collided
  (`src/app/(auth)/actions.ts`).
- **Authorization / no IDOR.** Progress reads/writes derive `userId` only from the
  session, never from client input; `questId` is validated and the table uses a
  composite primary key (`src/app/api/progress/route.ts`).
- **Input validation** with zod on every form and API body (`src/lib/validation.ts`).
- **Parameterized queries** everywhere via Drizzle — no string-built SQL.
- **Rate limiting** on login, register and progress, keyed on the real client IP
  *and* the account identity (username/email), so a spoofed `X-Forwarded-For`
  can't bypass per-account limits (`src/lib/rate-limit.ts`).
- **Security headers + CSP** on every response (`next.config.ts`): `X-Frame-Options:
  DENY`, `nosniff`, `Referrer-Policy`, `Permissions-Policy`, HSTS, and a CSP that
  restricts sources.
- **`trustHost`** is gated behind `AUTH_TRUST_HOST` (auto-trusted on Vercel) to
  avoid host-header poisoning of auth redirects.
- **DB SSL** is required in production (`src/lib/db/index.ts`).
- **Per-user responses** (`/api/progress`) are `Cache-Control: no-store, private`.
- Secrets (`AUTH_SECRET`, `DATABASE_URL`) come from the environment only.

## Known follow-ups

- **Nonce-based script CSP.** The CSP currently allows `'unsafe-inline'` for
  scripts (and styles, required by Leaflet/Tailwind). There is no HTML-injection
  sink today — `guideHtml` exists in the type but is never rendered, and there is
  zero `dangerouslySetInnerHTML` usage — so this is not exploitable, but moving
  scripts to a per-request nonce (`'strict-dynamic'`) via middleware is the next
  hardening step. **If anyone ever renders `guideHtml`, sanitize it (DOMPurify)
  first and tighten the CSP.**
- **Distributed rate limiting.** The limiter is in-memory (per serverless
  instance). For production-grade limits, back it with Upstash Redis.
