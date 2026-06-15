# Design

Visual system captured from `constants/theme.ts`. Single source of truth for
tokens; do not introduce parallel palettes. Re-themed 2026-06-15 to a modern
"neo-Instagram / liquid-glass" direction (was cinematic-gold + Playfair serif).

## Theme

Modern, glassy, dark. Cool near-black base with a faint violet cast, a vibrant
violet→pink brand gradient, geometric sans type, and frosted-glass chrome. Light
mode is not offered — the product is a dark viewing surface.

## Color

- `bg #0A0A0F` (cool near-black) · `surface #15151E` · `elevated #1E1E2A`
- Ink ramp: `ink #F4F5FA` / `ink2 66%` / `ink3 44%` / `ink4 24%` (cool white)
- Hairlines: `rgba(255,255,255,0.10)` / `0.05`
- Accent — split by role (this matters):
  - `accent #B7A4FF` (light violet) — TEXT, icons, links, borders ON DARK.
  - `accent2 #7C5CFF` (saturated violet) — FILLS that carry white content.
  - `accentPink #FF5E9C` — warm pole of the brand gradient.
  - `onAccent #FFFFFF` — content on any saturated fill / gradient.
  - Rule: never put white on `accent` (too light); fills use `accent2` or the gradient.
- `Gradients.brand = ['#FF5E9C','#A24BFF','#6B6CFF']` — pink→violet→indigo. The
  signature sweep: primary CTAs (Button accent), hero accents.
- Glass: `glass rgba(255,255,255,0.06)` / `glassStrong 0.10` / `glassBorder 0.14`.
- `coin #FFC24B` · `success #3DDC97`
- Strategy: **Committed** — the violet/pink brand carries CTAs, nav, selection;
  imagery carries the rest.

## Typography

- Display: **Plus Jakarta Sans** (`Fonts.display` 800 ExtraBold, `display600`
  700, `displayItalic` 700 italic) — headings, hero, wordmark, titles. Use
  `displayType(size)` (line-height ≥1.12×, tightened tracking).
- UI/body: **Geist** (`Fonts.sans` 300–700) — labels, body, buttons, metadata.
- Mono: **Geist Mono** — episode codes, timestamps, counters.
- Pairing: geometric display (Jakarta) + neo-grotesque body (Geist), contrast axis.

## Components

- `Button` — accent = brand-gradient fill + white; primary = solid ink + dark
  text; ghost = translucent.
- `Glass` — frosted surface (web `backdrop-filter`; native translucent fallback,
  no native blur dep). Used for nav bars, coin badge, chips.
- `Poster` / `PosterCard` (web hover: scale + violet ring + play), `CineStill`,
  `CoinBadge` (glass pill), `TopNav` (sticky frosted glass, desktop web),
  `Eyebrow`, `Chip`, `Skeleton`, `TabBar`.

## Layout

- Tokens: `Spacing` 4–24, `Radius` sm 6 → md 12 → lg 16 → xl 22 → pill 100
  (softer corners than before, for the modern feel).
- Responsive (`lib/layout.tsx`): `useIsDesktopWeb()` (≥1024px web),
  `useContentWidth(max)`, `<WebContent>`. No-op on native + narrow web.
- Desktop web: sticky glass top nav, centered content, multi-column poster
  grids, hover-to-preview, format-aware player stage. Onboarding is a centered,
  scroll-safe column on every size.

## Motion

- 150–250ms state transitions. Hover: scale ≤1.04 + ring/lift, ease-out.
- `prefers-reduced-motion` drops hover/scale transitions (webShell guard).
