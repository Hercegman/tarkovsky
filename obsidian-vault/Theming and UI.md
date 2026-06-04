# Theming and UI

Part of [[Tarkovsky]].

## Palette (grey-olive military)

Defined as CSS variables + Tailwind v4 `@theme` tokens in `src/app/globals.css`.
Desaturated, low-yellow: dark olive-grey background/surfaces, a grey-olive accent
(`--gold` ≈ `#9da079`), gunmetal and olive-brown. Earlier it was a brighter gold;
it was toned down on request.

## Fonts

`src/app/layout.tsx` loads **Oswald** (condensed, tactical) for headings/brand via
`--font-display`, and **Inter** for body via `--font-body`. `h1,h2,h3,.font-display`
use the display font.

## Effects

- Utility classes in `globals.css`: `.text-gradient`, `.glass`, `.glow-border`,
  `.grid-bg`, `.radial-glow`; custom gold-on-dark scrollbar; a subtle SVG
  fractal-noise **stone/grain** overlay on `body::before`.
- **motion** (`motion/react`): `Reveal`/`RevealGroup`/`RevealItem` (scroll fade-up),
  `AnimatedCard` (hover lift + cursor spotlight). Variants in `src/lib/motion.ts`.
- **Radar background** (`radar-background.tsx`) — pure CSS rings + grid + rotating
  sweep + ping blips on the homepage hero (replaced an earlier 3D particle hero).
- `prefers-reduced-motion` disables animations.
- **Custom cursor** (in `globals.css`): a tactical arrow (SVG data URI) site-wide
  and a military reticle on interactive elements; text fields keep the text cursor.

## Header / nav

`site-header.tsx`: brand, Quests, Maps, a **Traders dropdown** with portraits
(`traders-menu.tsx`), the [[Sounds]] toggle, and auth controls. The homepage also
shows a trader portrait grid and a maps grid.
