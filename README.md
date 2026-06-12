# CineDramas

A multi-tenant streaming infrastructure platform — "Shopify for streaming apps." Built with React Native, Expo, and Supabase.

## Prerequisites

| Tool    | Version                | Install              |
| ------- | ---------------------- | -------------------- |
| Node.js | v20.19.4+ (LTS)        | https://nodejs.org/  |
| npm     | v10+ (comes with Node) | Included             |
| Git     | Latest                 | https://git-scm.com/ |
| EAS CLI | Latest                 | `npm i -g eas-cli`   |

> **Do not install Expo Go for this project** — the app uses native modules and
> only runs in a development build or an EAS internal build (see below).

> **Note:** The project uses Expo SDK 54 with React Native 0.81, which requires Node.js >= 20.19.4. Check your version with `node -v`.

## Installation

```bash
# Clone the repository
git clone https://github.com/cinedramas-platform/cine-dramas-app.git
cd cine-dramas-app

# Switch to the dev branch
git checkout dev

# Install dependencies
npm install --legacy-peer-deps
```

> `--legacy-peer-deps` is currently required due to peer dependency conflicts between some packages.

## Running the App

### Start the development server

```bash
npx expo start
```

This starts the Metro bundler and shows a QR code in the terminal.

### Running on a physical device

> **This app cannot run in Expo Go.** It uses native modules (`react-native-video`,
> Mux, Reanimated, SecureStore, Sentry) that Expo Go does not bundle — Expo Go will
> load then crash on the video player. You need a **development build**. See
> [ADR 0002](docs/adr/0002-eas-build-and-update-deployment.md).

**Primary path — dev build + over-the-air updates (no tunnel needed):**

1. Build a development client once with EAS, install it on your phone.
2. Push JS changes over-the-air: `eas update` (no Metro server, no QR, no ngrok).
3. Rebuild the dev client only when native dependencies change.

**Fast inner loop (friendly network only):** `npx expo start --dev-client`, then open
the URL from your installed dev build over LAN.

**Tunnel is a fallback, not the primary path.** `npx expo start --tunnel` relies on a
vendored ngrok patch (`scripts/apply-ngrok-v3.js`) and is fragile on corporate
networks. Prefer EAS Update. For client distribution, ship an **EAS preview build**
(internal) — see [docs/MVP-PLAN.md](docs/MVP-PLAN.md) §2/§5.

### Running on simulators/emulators

```bash
# iOS Simulator (macOS only, requires Xcode)
npx expo start --ios

# Android Emulator (requires Android Studio)
npx expo start --android
```

### Running on web (for quick previews)

```bash
npx expo start --web
```

## Environment Setup

### Environment variables

Create a `.env` file in the project root (it's gitignored):

```bash
# Copy the example (when available)
cp .env.example .env
```

Runtime configuration (Supabase URL/key, Mux env key, tenant id, Sentry DSN) does
**not** come from `.env` — it lives in the per-brand manifest at
`brands/<variant>/manifest.json` and is baked in at build time by `app.config.js`.
`.env` is only used for local tooling secrets (e.g. `SENTRY_AUTH_TOKEN` in CI).

### Brand configuration

The app supports multiple branded builds via the `APP_VARIANT` environment variable:

```bash
# Default (dev) brand
npx expo start

# Specific brand variant
APP_VARIANT=clientA npx expo start
```

Brand configs are stored in `brands/{variant}/manifest.json`.

## Project Structure

```
cine-dramas-app/
├── app/                    # Expo Router screens (file-based routing)
│   ├── _layout.tsx         # Root layout (Stack navigator)
│   ├── (tabs)/             # Tab navigation
│   │   ├── _layout.tsx     # Tab layout (Home, Search, Profile)
│   │   ├── index.tsx       # Home screen
│   │   ├── search.tsx      # Search screen
│   │   └── profile.tsx     # Profile screen
│   ├── series/             # Series detail screens
│   ├── player/             # Video player screens
│   └── auth/               # Authentication screens
├── components/             # Reusable components
│   ├── video/              # VideoPlayer, VerticalFeed, PreloadManager
│   ├── series/             # SeriesCard, SeasonSelector, EpisodeRow
│   ├── home/               # Rails, banners
│   ├── paywall/            # Subscription UI
│   └── ui/                 # ThemeProvider, ErrorBoundary, Skeleton
├── hooks/                  # Custom React hooks
├── stores/                 # Zustand state stores
├── services/               # API clients and service integrations
├── brands/                 # Per-brand config and assets
│   ├── default/            # Default brand manifest
│   └── index.js            # Brand config registry
├── theme/                  # Design tokens and global styles
├── utils/                  # Shared utilities
├── supabase/               # Backend
│   ├── migrations/         # Versioned SQL migrations
│   └── functions/          # Edge function source
├── scripts/                # Build and validation scripts
├── assets/                 # Default app icons and splash
├── app.config.js           # Dynamic Expo config (reads APP_VARIANT)
├── eas.json                # EAS build matrix (per-brand profiles)
├── tsconfig.json           # TypeScript config
├── eslint.config.js        # ESLint config
└── .prettierrc             # Prettier config
```

## Web (same codebase)

The app compiles to a web SPA (react-native-web + expo-router URLs). Desktop
renders a centered phone column; mobile web is full-bleed. Video plays via
hls.js (`components/video/VideoPlayer.web.tsx`).

```bash
npx expo start --web                 # dev
npx expo export --platform web      # build -> dist/
npx eas-cli deploy --export-dir dist          # preview deploy (EAS Hosting)
npx eas-cli deploy --export-dir dist --prod   # production
```

Live: https://cinedramas-dev.expo.app

## Client demo builds (EAS internal distribution)

The MVP deliverable is an installable internal build per brand — no store listing.

```bash
# Android APK, default brand — produces a shareable install link
eas build --profile preview --platform android

# iOS internal (requires registered device UDIDs via `eas device:create`)
eas build --profile preview --platform ios

# Branded build for a client
eas build --profile clientA-preview --platform android

# Push JS-only updates to installed builds (no rebuild)
eas update --channel preview --message "demo polish"
```

The build page on expo.dev gives a QR/install link to send to a client. See
[ADR 0002](docs/adr/0002-eas-build-and-update-deployment.md) and
[docs/eas-build-matrix.md](docs/eas-build-matrix.md).

## Tech Stack

| Layer      | Technology                                    |
| ---------- | --------------------------------------------- |
| Mobile     | React Native 0.81 + Expo SDK 54 + Expo Router |
| Video      | react-native-video + Mux                      |
| Lists      | @shopify/flash-list                           |
| Styling    | NativeWind (Tailwind CSS)                     |
| State      | Zustand + TanStack React Query                |
| Backend    | Supabase (PostgreSQL + Edge Functions + Auth) |
| Billing    | RevenueCat                                    |
| Monitoring | Sentry + Mux Data                             |

## Git Workflow

| Branch    | Purpose                        |
| --------- | ------------------------------ |
| `main`    | Stable releases, documentation |
| `staging` | Pre-production testing         |
| `dev`     | Active development             |

## Useful Commands

```bash
# Type check
npx tsc --noEmit

# Lint
npx eslint .

# Format
npx prettier --write .

# Validate Expo config
npx expo config
```
