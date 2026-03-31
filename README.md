# CineDramas

A multi-tenant streaming infrastructure platform — "Shopify for streaming apps." Built with React Native, Expo, and Supabase.

## Prerequisites

| Tool | Version | Install |
|------|---------|---------|
| Node.js | v20.19.4+ (LTS) | https://nodejs.org/ |
| npm | v10+ (comes with Node) | Included |
| Git | Latest | https://git-scm.com/ |
| Expo Go (mobile) | Latest | [iOS App Store](https://apps.apple.com/app/expo-go/id982107779) / [Google Play](https://play.google.com/store/apps/details?id=host.exp.exponent) |

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

### Running on a physical device (Expo Go)

1. Install **Expo Go** on your phone:
   - [iOS App Store](https://apps.apple.com/app/expo-go/id982107779)
   - [Google Play Store](https://play.google.com/store/apps/details?id=host.exp.exponent)
2. Start the dev server: `npx expo start`
3. **Important:** Press `s` in the terminal to switch to **Expo Go** mode (it defaults to development build)
4. Scan the QR code:
   - **iOS:** Open the Camera app and point at the QR code — it will prompt to open in Expo Go
   - **Android:** Open Expo Go and tap "Scan QR Code"
5. The app should load on your device

**If the QR code doesn't connect** (common on corporate/different networks):
```bash
npx expo start --tunnel
```
This routes through Expo's servers. It will prompt to install `@expo/ngrok` on first use — accept it.

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

Currently required variables:

```env
# None required for basic app startup
# The following will be needed as services are connected:

# SUPABASE_URL=https://your-project.supabase.co
# SUPABASE_ANON_KEY=your-anon-key
# MUX_ENV_KEY=your-mux-env-key
# REVENUECAT_API_KEY=your-revenuecat-key
# SENTRY_DSN=https://your-dsn@sentry.io/project-id
```

The app runs without any env vars for now — API integrations are not yet connected.

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
├── tsconfig.json           # TypeScript config
├── .eslintrc.js            # ESLint config
└── .prettierrc             # Prettier config
```

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Mobile | React Native 0.81 + Expo SDK 54 + Expo Router |
| Video | react-native-video + Mux |
| Lists | @shopify/flash-list |
| Styling | NativeWind (Tailwind CSS) |
| State | Zustand + TanStack React Query |
| Backend | Supabase (PostgreSQL + Edge Functions + Auth) |
| Billing | RevenueCat |
| Monitoring | Sentry + Mux Data |

## Git Workflow

| Branch | Purpose |
|--------|---------|
| `main` | Stable releases, documentation |
| `staging` | Pre-production testing |
| `dev` | Active development |

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
