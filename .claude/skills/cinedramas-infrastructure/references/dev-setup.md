# Development Environment Setup

Source: Master Architecture Blueprint, Section 10

## Prerequisites

| Tool | Version | Install |
|------|---------|---------|
| Node.js | v20 LTS+ | https://nodejs.org/ |
| npm | v10+ | Included with Node |
| Git | Latest | https://git-scm.com/ |
| Supabase CLI | Latest | `npm install -g supabase` |
| EAS CLI | Latest | `npm install -g eas-cli` |
| Expo CLI | Latest | Via `npx expo` |
| Android Studio | Latest stable | For Android emulator |
| Xcode | 15+ (macOS) | Mac App Store |

## Core Dependencies

```bash
# Navigation
npx expo install expo-router react-native-screens react-native-safe-area-context

# Video
npx expo install react-native-video
npm install @mux/mux-data-react-native-video

# Lists and images
npm install @shopify/flash-list
npx expo install expo-image

# State management
npm install zustand @tanstack/react-query

# Styling
npm install nativewind
npx expo install tailwindcss

# Animations and gestures
npx expo install react-native-reanimated react-native-gesture-handler

# Auth and storage
npx expo install expo-secure-store
npm install @supabase/supabase-js

# Subscriptions
npm install react-native-purchases

# Monitoring
npx expo install @sentry/react-native

# Utilities
npm install uuid
npx expo install expo-constants expo-device expo-notifications
```

## Dev Dependencies

```bash
npm install -D typescript @types/react eslint prettier
npm install -D eslint-config-expo
npm install -D vitest @testing-library/react-native
npm install -D @testing-library/jest-native
```

## Directory Structure

```
app/(tabs)/          # Tab navigation screens
app/series/          # Series detail
app/player/          # Full-screen player
app/auth/            # Login, register
components/video/    # VideoPlayer, PreloadManager, VerticalFeed
components/series/   # SeriesCard, SeasonSelector, EpisodeRow
components/home/     # Rails, banners
components/paywall/  # PlanCard, OfferBanner
components/ui/       # ThemeProvider, ErrorBoundary, Skeleton
hooks/               # useCatalog, useWatchProgress, useEntitlements
stores/              # authStore, playerStore, configStore
services/            # api, auth, catalog, progress, revenuecat
brands/default/      # Default brand config + assets
theme/               # tokens, global.css
utils/               # Shared utilities
supabase/migrations/ # Versioned SQL files
supabase/functions/  # Edge function source
scripts/             # validate-brands, build-all
```

## Environment Variables (.env.example)

```bash
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
SUPABASE_JWT_SECRET=your-jwt-secret
MUX_TOKEN_ID=your-mux-token-id
MUX_TOKEN_SECRET=your-mux-token-secret
MUX_SIGNING_KEY_ID=your-signing-key-id
MUX_SIGNING_PRIVATE_KEY=your-signing-private-key
MUX_WEBHOOK_SECRET=your-mux-webhook-secret
REVENUECAT_API_KEY=your-public-api-key
REVENUECAT_WEBHOOK_SECRET=your-webhook-secret
SENTRY_DSN=https://your-dsn@sentry.io/project-id
APP_VARIANT=default
```

## External Service Setup Summary

### Supabase
1. Create project `cinedramas-dev`
2. Enable Email + Google + Apple auth providers
3. Register custom_access_token_hook in Auth > Hooks
4. Create storage buckets: `brand-assets` (public), `thumbnails` (public)

### Mux
1. Generate API access token (Video + Data Full Access)
2. Generate signing key pair
3. Upload test video, note Playback ID
4. Note Mux Data Environment Key

### RevenueCat
1. Create project, add iOS + Android apps
2. Create `premium` entitlement, Monthly/Yearly products, default offering
3. Note Public SDK Keys

### EAS
1. `eas login` + `eas init`
2. Create eas.json with build profiles
3. Create app.config.js with dynamic brand loading
4. Create brands/default/manifest.json

### Cloudflare
1. Add domain, configure DNS (CNAME api -> Supabase)
2. Cache Rules: /catalog/* (300s), /config/* (600s)
3. Rate limiting: /user/progress/* PUT (10/min/IP), /auth/* POST (20/min/IP)
