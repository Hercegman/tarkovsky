# Progress Tracking

Part of [[Tarkovsky]]. Two distinct mechanisms:

## 1. Per-quest "completed" (server, needs login)

- Table `quest_progress (userId, questId, completedAt)` with composite PK.
- API `src/app/api/progress/route.ts`: `GET` → the user's completed quest ids;
  `POST { questId, completed }` toggles one. Both derive `userId` from the session
  only (no IDOR), validate input (zod), rate-limit, and set `no-store`.
- Client: `quest-progress-button.tsx` (the Mark complete / Completed button) and
  the `useProgress` hook (`src/hooks/use-progress.ts`) which fetches the completed
  set once to render green badges in lists, the map quest panel, and `/profile`.

## 2. Per-item checklist (browser-local, no login)

- `objective-checklist.tsx` ticks individual objectives, persisted in
  `localStorage` (`tark:items:<questId>`) with a progress bar.
- Purpose: track items you've collected for big collection quests (the Collector).
- Independent of login and of the server "completed" state above.

See [[Auth and Profiles]] for accounts and [[Quests]] for where these appear.
