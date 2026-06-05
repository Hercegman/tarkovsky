# Tarkovsky

> Map of Content (MOC) for **Project Tarkovsky** — a beginner-friendly Escape
> from Tarkov quest wiki. This folder is an Obsidian vault: open it directly in
> Obsidian (Open folder as vault) or copy the notes into an existing vault.

**Live:** https://tarkovsky.vercel.app
**Repo:** https://github.com/Hercegman/tarkovsky (private)
**By:** Hercegman and Priestt_

## What it is

A clean, PC-first wiki focused on **quests/tasks** for Escape from Tarkov, plus
interactive maps and per-user progress. The point of difference vs other wikis:
show only what a player needs to plan and finish a task — objectives,
prerequisites, rewards, in-game order, and where to go.

All game data comes **only** from the Escape from Tarkov Wiki (Fandom) — see
[[Licensing]]. No game-mined data and no game/tarkov.dev APIs.

## Notes

- [[Architecture]] — how the pieces fit together
- [[Tech Stack]] — frameworks and libraries
- [[Data Ingest]] — the scripts that pull data from the wiki
- [[Quests]] — quest data, in-game ordering, parts, item checklist
- [[Maps]] — interactive Leaflet maps, markers, per-quest locations
- [[Auth and Profiles]] — accounts, login, profile page
- [[Progress Tracking]] — completed quests + item checklists
- [[Sounds]] — synthesized UI sounds and the toggle
- [[Theming and UI]] — palette, fonts, motion, radar background
- [[Deployment]] — Vercel + Neon, env vars, how to ship
- [[Licensing]] — CC BY-NC-SA and attribution duties
- [[Changelog]] — every commit and what changed

## Quick mental model

```
EFT Fandom Wiki ──API──> ingest scripts ──> content/*.json (committed)
                                                  │
                                     build-time read (src/lib/data.ts)
                                                  │
                         Next.js App Router pages (mostly static) + Leaflet maps
                                                  │
                         Neon Postgres ── only for accounts + progress
```
