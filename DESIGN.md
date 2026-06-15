# Design

Visual system captured from the existing codebase (`constants/theme.ts`).
Single source of truth for tokens; do not introduce parallel palettes.

## Theme

Cinematic dark. Near-black theatre background, warm off-white ink, a single
gold accent. Light mode is not offered — the product is a dark viewing surface.

## Color

- `bg #08070A` (theatre black) · `surface #15110E` · `elevated #1E1A14`
- Ink ramp: `ink #FAF6EE` / `ink2 62%` / `ink3 40%` / `ink4 22%` (warm off-white)
- Hairlines: `rgba(255,255,255,0.08)` / `0.04`
- Accent (gold): `accent #E8C570` / `accent2 #C9A857` / `accentTint 12%`
- `coin #F1B844` · `success #4ADE80`
- Strategy: **Restrained** — gold accent on primary actions, selection, and
  state only; never decorative. Color comes from poster/still imagery.

## Typography

- Display (serif): **Playfair Display** (`Fonts.display` 500, `display600`,
  `displayItalic`) — titles, hero, section headers. Use `displayType(size)` so
  line-height clears serif ascenders (≥1.12×).
- UI (sans): **Geist** (`Fonts.sans` 300–700) — labels, body, buttons, metadata.
- Mono: **Geist Mono** — episode codes, timestamps, counters.
- Pairing is serif-display + geometric-sans (contrast axis, intentional).

## Components

- `Poster` — 2:3 still/poster with gradient scrim + optional title/genre/progress.
- `PosterCard` (web hover) — Poster + desktop hover: scale, lift, play overlay.
- `CineStill` — large still for heroes/backdrops.
- `CoinBadge`, `Button` (accent/ghost), `Eyebrow`, `Chip`, `Skeleton`, `TabBar`.
- `TopNav` (desktop web) — wordmark + section links + coin badge.
- States: skeletons for loading (not spinners); hover/focus on interactive web.

## Layout

- Tokens: `Spacing` 4–24, `Radius` sm 4 → xl 18 → pill 100.
- Responsive (`lib/layout.tsx`): `useIsDesktopWeb()` (≥1024px web),
  `useContentWidth(max)`, `<WebContent>` centering. All no-op on native + narrow
  web — phones keep the designed phone layout.
- Desktop web: top nav (no bottom tabs), centered max-width content (home 1140),
  multi-column poster grids, cinematic hero, hover-to-preview. Player stage is
  format-aware (vertical reel vs wide landscape).

## Motion

- 150–250ms state transitions. Hover: scale ≤1.04 + shadow lift, ease-out.
- Reduced-motion: crossfade/instant fallback. No bounce/elastic.
