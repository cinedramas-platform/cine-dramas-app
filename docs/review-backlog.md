# Code-review backlog (2026-06-11 session review)

A 7-angle review of the MVP session diff (`ceb6cb4..`) produced 18 verified
findings. The top 10 were fixed in the same session (commit `review fixes`).
These remain — all verified real, deferred as lower severity. Work top-down.

## Correctness-adjacent (small)

1. **`app/onboarding.tsx` — wordmark `key={line}`** can collide when both
   wordmark lines are identical (brand "Boba Boba"). Key by index.
2. **`components/video/VideoPlayer.tsx` — `appliedRateRef` is mutated during
   render.** Works today because props always re-render the player, but breaks
   under future memoization/React Compiler. Replace with state+effect, or pass
   `rate={paused ? lastRate : rate}` derived purely.

## Performance

3. **`app/paywall.tsx` countdown** — 1 Hz `setInterval` at screen root
   re-renders the whole tree (hero image included) every second for the
   modal's lifetime, keeps ticking after 0, and drifts (decrement vs
   deadline). Extract `<OfferCountdown deadline={…}/>` owning its own state.
4. **`components/video/VerticalFeed.tsx` `extraData`** —
   `${activeIndex}:${isFocused}` re-renders all mounted cells on every focus
   flip (2 per push+back). Alternative: route blur-pause through
   `usePlayerStore` so only the active cell reacts.
5. **`app/series/[id].tsx` — `useContinueWatching` per open** — adds an edge
   call to every series-detail visit; never invalidated by `useSaveProgress`
   (stale CTA until 2-min staleTime lapses) and the CTA label flickers
   Start→Continue. Raise staleTime + invalidate `['progress',
   'continue-watching']` on progress flush.
6. **`services/mux.ts` thumbnail width param** — exact pixel widths baked into
   Mux thumbnail URLs mean any layout tweak (or device-width variety) busts
   image caches catalog-wide. Snap requested width up to 128-px buckets.

## Consistency / white-label

7. **`constants/theme.ts` — `displayType()` and `ScreenPad` have zero call
   sites.** Either adopt them in the screens (preferred — the 1.12× line-height
   rule is enforced nowhere and `paywall.tsx` fontSize 28/lineHeight 30 already
   violates it) or delete them. Dead helpers with authoritative comments are
   worse than none.
8. **`lib/brand.ts` — `TAGLINE` is hardcoded English**, rendered on
   onboarding/login/register. Belongs in `brands/<variant>/manifest.json`
   (add `tagline`, pipe through `app.config.js` extra). Same for an explicit
   `wordmark: ["Cine","Dramas"]` field instead of the camel-case heuristic.

## Duplication

9. **Coin badge JSX** byte-identical in `app/(tabs)/index.tsx` and
   `app/(tabs)/profile.tsx` → extract `components/ui/CoinBadge.tsx`.
10. **Time/label formatting** — `formatCountdown` (paywall), `formatTime`
    (player overlay), and `EP ${pad}` label joins (unlock, overlay, series ×2)
    are parallel hand-rolled implementations → `lib/format.ts`.
11. **`lib/network.ts`** — returned cleanup function is dead code (only call
    site discards it) and invites a misuse-prone `useEffect` migration. Make it
    `void`; also consider a shared `optionalNativeModule()` helper before more
    native deps (RevenueCat) land pre-rebuild.
