# Phase 2 — Silhouette Platform Core Tasks (Weeks 3-8)

Source: Master Architecture Blueprint, Section 12

## T2.01: Build VideoPlayer Component
**Owner:** Frontend | **Deps:** T1.09
- Create `components/video/VideoPlayer.tsx` wrapping react-native-video
- Props: playbackId, token (optional), onProgress, onEnd
- HLS URL: `https://stream.mux.com/{playbackId}.m3u8` + `?token=` if signed
- Play/pause/seek via ref. Loading/error/buffering states.
- Integrate `@mux/mux-data-react-native-video`

## T2.02: Build PreloadManager
**Owner:** Frontend | **Deps:** T2.01
- `components/video/PreloadManager.ts`
- Use v7 `VideoPlayer.preload()` API
- Pool: current, N+1, N-1 episodes. Only one actively playing.
- Target: < 500ms time-to-first-frame on swipe

## T2.03: Build VerticalFeed
**Owner:** Frontend | **Deps:** T2.01, T2.02
- `components/video/VerticalFeed.tsx` using FlashList vertical paging
- estimatedItemSize = screen height, drawDistance = 3 items
- Snap-to-item. On visible change: play current, pause others, update PreloadManager.
- Target: 60 FPS. Use React.memo on items.

## T2.04: Build PlayerOverlay
**Owner:** Frontend | **Deps:** T2.01
- Episode title, series name, progress bar, play/pause
- Auto-hide after 3s (Reanimated fade). Show on tap.
- Double-tap like, swipe up for info sheet.

## T2.05: Implement Gesture Controls
**Owner:** Frontend | **Deps:** T2.03, T2.04
- Single tap: toggle overlay. Double tap: like animation. Long press: speed options.
- Horizontal pan: seek. Ensure no conflict with vertical scroll.

## T2.06: Set Up Expo Router Navigation
**Owner:** Frontend | **Deps:** T1.01
- Root layout: `app/_layout.tsx` (auth check, ThemeProvider, QueryClientProvider)
- Tabs: `app/(tabs)/_layout.tsx` (Home, Search, Profile)
- Screens: `app/series/[id].tsx`, `app/player/[episodeId].tsx`
- Auth: `app/auth/login.tsx`, `app/auth/register.tsx`
- Others: `app/onboarding.tsx`, `app/paywall.tsx`

## T2.07: Build Home Screen
**Owner:** Frontend | **Deps:** T2.06, T2.10
- ContinueWatchingRail, FeaturedBanner, CategoryRail (all FlashList horizontal)
- Pull-to-refresh. Thumbnail via expo-image with blurhash.

## T2.08: Build Series Detail Screen
**Owner:** Frontend | **Deps:** T2.06, T2.10
- SeriesCard, SeasonSelector (horizontal pills), EpisodeRow
- Fetch with useSeriesDetail(id). Tap episode -> player.

## T2.09: Build Catalog Edge Functions
**Owner:** Backend | **Deps:** T1.02
- `catalog-series`: paginated, filterable by category. Cache-Control: 300s.
- `catalog-series-detail`: series + seasons + episodes (JOINs)
- `catalog-featured`: home screen data structure
- `catalog-search`: PostgreSQL full-text search (to_tsquery)

## T2.10: Build Catalog TanStack Query Hooks
**Owner:** Frontend | **Deps:** T2.09
- `services/api.ts`: base HTTP client with auth header
- `hooks/useCatalog.ts`: useFeatured (5min stale), useSeriesList, useSeriesDetail, useSearch (1min, enabled when query > 2 chars)
- persistQueryClient to AsyncStorage

## T2.11: Build Search Screen
**Owner:** Frontend | **Deps:** T2.06, T2.10
- Debounced input (300ms). Results as cards/rows. No results + loading + error states.

## T2.12: Implement Supabase Auth Integration
**Owner:** Frontend | **Deps:** T1.03, T2.06
- `services/auth.ts`: signIn, signUp, signOut, refreshSession
- `stores/authStore.ts`: user, session, tenantId, isAuthenticated
- Login/register screens. Store tokens in expo-secure-store.
- Session hydration in root layout. Protected route wrapper.

## T2.13: Build Profile Screen
**Owner:** Frontend | **Deps:** T2.12
- User info, subscription status, restore purchases, version, legal links, logout.

## T2.14: Build Onboarding Screen
**Owner:** Frontend | **Deps:** T2.06
- 3 slides with Reanimated transitions. Skip/Next. AsyncStorage flag.

## T2.15: Build Watch Progress System
**Owner:** Fullstack | **Deps:** T2.01, T2.12, T1.02
- Edge function: GET progress, PUT with rate limit (6/min/user via Redis UPSERT)
- Hook: debounce 10s, send on pause/background, completed at 90%
- `stores/playerStore.ts`: current episode, position, isPlaying
- ContinueWatchingRail with progress bars. Resume from last position.

## T2.16: Build Playback Token Service
**Owner:** Backend | **Deps:** T1.04, T1.02
- Edge function: validate JWT, check entitlements, get mux_playback_id
- Redis cache check. Generate RS256 Mux JWT (exp: 6h). Cache 5h TTL.
- Return: { stream_url, thumbnail_url, expires_at }
- Use `jose` library. Signing key in env vars.

## T2.17: Build Entitlements System
**Owner:** Fullstack | **Deps:** T1.05, T2.12, T1.02
- `services/revenuecat.ts`: init SDK, getCustomerInfo, getOfferings, purchase, restore
- `hooks/useEntitlements.ts`: hasPremium, isLoading, offerings
- Edge function: GET entitlements, RevenueCat webhook handler (verify, idempotency, UPSERT)

## T2.18: Build Paywall Screen
**Owner:** Frontend | **Deps:** T2.17
- PlanCard, OfferBanner. Fetch offerings. Subscribe button -> purchase flow.
- States: loading, success, error, cancelled. Restore purchases. Apple guidelines.

## T2.19: Build Mux Webhook Handler
**Owner:** Backend | **Deps:** T1.04, T1.02
- Verify HMAC-SHA256 signature + timestamp tolerance
- Idempotency check. Process video.asset.ready and video.asset.errored.
- Update episodes table (status, playback_id, duration).

## T2.20: Build Config Service
**Owner:** Backend | **Deps:** T1.02
- Edge function: query tenants for theme, features, legal, rails order. Cache 600s.
- `stores/configStore.ts`: fetchConfig, loadCachedConfig. ThemeProvider reads from store.
