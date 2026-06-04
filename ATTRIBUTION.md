# Attribution & Licensing

## Quest content

Quest data displayed in Tarkovsky is sourced from the
**[Escape from Tarkov Wiki](https://escapefromtarkov.fandom.com)** (hosted on
Fandom) via its MediaWiki API.

That content is licensed under
**[Creative Commons Attribution-NonCommercial-ShareAlike (CC BY-NC-SA)](https://creativecommons.org/licenses/by-nc-sa/3.0/)**.

To comply with the license, this project:

1. **Attributes** the source site-wide (footer) and **per quest** — every quest
   page links back to its original wiki article (`source.url` in the data).
2. Remains **non-commercial (NC)** — no paywalls, no monetization of the
   wiki-derived content.
3. Is **share-alike (SA)** — the derived dataset in `content/` is likewise made
   available under CC BY-NC-SA.

We do **not** use game-mined data or any direct game / `tarkov.dev` API. The ingest
talks only to the Fandom wiki API.

## Map images

Map images (in `public/maps/`) must come from a source with a clear license.
Record each image's source URL, author and license in `content/maps.json`. If a
source is non-commercial, the whole project stays non-commercial. Self-host images;
do not hotlink Fandom (it blocks hotlinking).

## Trademark

*Escape from Tarkov* is a trademark of **Battlestate Games**. This is an unofficial,
free fan project and is **not affiliated with or endorsed by** Battlestate Games.

## Ingest etiquette

The ingest script (`scripts/ingest-wiki.mts`) sends a descriptive `User-Agent` with
a contact, throttles to ~1 request/second, and respects `maxlag` / `Retry-After`,
per Wikimedia/Fandom API etiquette. It runs at author time, not per user request.
