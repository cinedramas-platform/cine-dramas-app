# Code-review backlog (2026-06-11 session review)

A 7-angle review of the MVP session diff (`ceb6cb4..`) produced 18 verified
findings. **All 18 are now fixed** (top 10 in the first fix commit, the
remaining 8 in the follow-up). Kept as a record of conventions the fixes
established — new code should follow these:

- **Resume/progress**: progress writes are gated until the resume decision
  settles (`hasSoughtRef` in `VerticalFeed`). Don't add new `saveProgress`
  callers that bypass it.
- **Mux assets are not unique per episode** — any lookup by `mux_asset_id`
  must handle multiple rows (see `webhooks-mux`).
- **CTA truthfulness**: any "Continue/Start" affordance must verify the target
  is playable (`mux_asset_status === 'ready'`) and not locked before labeling.
- **FlashList items**: all per-episode state must reset in the `episode.id`
  effect — FlashList recycles component instances.
- **Display serif type**: use `displayType(size)` from `constants/theme.ts`
  (enforces the 1.12× line-height floor that prevents Android clipping).
- **Formatting**: clocks via `formatClock`, episode labels via `episodeCode` /
  `joinDots` from `lib/format.ts`. No hand-rolled `padStart` formatting.
- **Brand copy**: tagline (and name) come from `brands/<variant>/manifest.json`
  via `lib/brand.ts` — never hardcode brand-facing strings in screens.
- **Coin badge**: `components/ui/CoinBadge.tsx` is the single implementation.
- **Mux thumbnails**: `getMuxThumbnailUrl` buckets dimensions to 128px — don't
  pass exact layout pixels anywhere else.
- **Screen focus**: feed items pause themselves via `useIsFocused()` inside
  `FeedItem`; unlock flows return to the originating player (`origin` param)
  instead of stacking player screens.
- **Deno edge functions** are excluded from `import/no-unresolved` (import
  maps); keep node-resolver rules scoped to app code.
