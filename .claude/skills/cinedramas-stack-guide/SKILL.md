---
name: cinedramas-stack-guide
description: CineDramas technology stack deep explanation — what each technology is, how it works internally, why it was chosen, and how it integrates. Use when implementing features with specific libraries or making technology decisions.
user-invocable: true
disable-model-invocation: false
---

# CineDramas Stack Guide

Use this skill when you need to understand how a specific technology works, why it was chosen, or how it integrates into the CineDramas architecture.

## Technology Stack Summary

### Mobile Framework
- **React Native** — Native UI from JS/TS. Hermes engine. Single codebase -> iOS + Android.
- **Expo + EAS** — Managed workflow, cloud builds (EAS Build), OTA updates (EAS Update). `APP_VARIANT` drives white-label builds.
- **Expo Router** — File-system routing in `app/` directory. Auto deep linking.

### Video
- **react-native-video v7** — Wraps AVPlayer (iOS) / ExoPlayer (Android). HLS playback. `VideoPlayer.preload()` for instant swipes.
- **Mux** — Video infrastructure: ingest, encode, HLS delivery, signed playback (RS256 JWT), Mux Data QoE analytics, webhooks.

### UI Performance
- **@shopify/flash-list v2** — Cell recycling for 60 FPS lists. Used for home rails (horizontal) and vertical video feed (paging mode).
- **NativeWind** — Tailwind CSS -> RN StyleSheet via Babel. CSS variables enable per-brand theming.
- **react-native-reanimated** — UI-thread animations (worklets). Player overlay, onboarding transitions.
- **react-native-gesture-handler** — Native-thread gesture recognition. Tap, double-tap, pan, long press.

### State & Data
- **Zustand** — Lightweight global state. Three stores: authStore, playerStore, configStore. Selector-based subscriptions prevent re-renders.
- **TanStack React Query** — Server state: caching, background refetch, persistence to AsyncStorage. Per-endpoint staleTime.

### Backend
- **Supabase** — PostgreSQL + RLS + Edge Functions (Deno) + Auth (GoTrue) + Storage. PgBouncer for connection pooling.
- **Upstash Redis** — Serverless edge-compatible Redis. Rate limiting counters + playback token cache.

### Billing
- **RevenueCat** — `react-native-purchases` SDK. Handles store interactions, receipt validation, subscription lifecycle. Webhook -> entitlements sync.

### Infrastructure
- **Cloudflare** — CDN caching (catalog 5min, config 10min), WAF, DDoS, rate limiting. Cache key includes tenant_id.
- **Sentry** — Crash reporting + performance. `@sentry/react-native` with tenant_id tags. Source maps via Expo plugin.

### Supporting Libraries
- **expo-secure-store** — Encrypted storage (Keychain/EncryptedSharedPreferences) for JWT tokens.
- **expo-image** — Disk-cached images with blurhash placeholders. Used for Mux thumbnails.

## Key Integration Patterns

### Video Playback Chain
`episode.mux_playback_id` -> construct HLS URL -> (if premium) edge function generates signed Mux JWT -> `stream.mux.com/{id}.m3u8?token={jwt}`

### Auth Chain
Supabase Auth -> JWT with tenant_id claim (via custom_access_token_hook) -> stored in expo-secure-store -> sent as Bearer token -> RLS scopes all queries

### Subscription Chain
RevenueCat SDK (offerings) -> user purchases -> RevenueCat validates receipt -> webhook to edge function -> UPSERT entitlements table -> playback token service checks entitlements

### Caching Chain
TanStack Query (memory + AsyncStorage) -> Cloudflare CDN (edge) -> Supabase Edge Function -> PostgreSQL

## For Full Details

See `references/technology-deep-dive.md` for the complete explanation of each technology.
