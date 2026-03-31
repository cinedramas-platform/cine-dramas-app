# CineDramas — Master Architecture Blueprint & Execution Guide

**Version:** 1.0
**Date:** March 16, 2026
**Classification:** Internal — Engineering Reference
**Status:** Approved for Implementation

---

## Table of Contents

1. [Executive Architecture Overview](#1-executive-architecture-overview)
2. [High-Level System Architecture](#2-high-level-system-architecture)
3. [Technology Stack Deep Explanation](#3-technology-stack-deep-explanation)
4. [Platform Architecture Flow](#4-platform-architecture-flow)
5. [Silhouette Platform Architecture — Stage 1](#5-silhouette-platform-architecture--stage-1)
6. [Hub Architecture Expansion — Stage 2](#6-hub-architecture-expansion--stage-2)
7. [Data Architecture](#7-data-architecture)
8. [Database Design](#8-database-design)
9. [Infrastructure Architecture](#9-infrastructure-architecture)
10. [Development Environment Setup](#10-development-environment-setup)
11. [Implementation Roadmap](#11-implementation-roadmap)
12. [Development Task Breakdown — Micro-Level](#12-development-task-breakdown--micro-level)
13. [Technology Dependency Map](#13-technology-dependency-map)
14. [Risks and Architectural Trade-offs](#14-risks-and-architectural-trade-offs)

---

## 1. Executive Architecture Overview

### 1.1 Platform Vision

CineDramas is a **multi-tenant streaming infrastructure platform** that enables creators, studios, and media brands to launch their own branded mobile streaming applications from a single shared codebase and platform. The business model follows a **"Shopify for streaming apps"** paradigm: CineDramas provides the technology, infrastructure, and operational tooling; each client (tenant) receives branded mobile apps, their own content catalog, their own subscription products, and their own analytics — all powered by the same underlying platform.

The platform supports two deployment models that coexist:

- **Silhouette (Single-Tenant White-Label):** Each client receives a physically isolated deployment — dedicated database, dedicated video environment, dedicated billing project, and a custom-branded mobile application published under the client's own developer account. This is the silo model.
- **Hub (Shared Multi-Tenant):** Multiple clients share a single platform instance with strict logical isolation. One mobile application serves multiple tenants, with tenant context resolved at runtime. This is the pool model.

Both models are managed by a unified control plane, forming what the AWS (Amazon Web Services) SaaS Lens defines as a **bridge model** — a combination of silo and pool tenancy applied across different tenants and services based on their requirements.

### 1.2 Architecture Philosophy

The architecture follows five governing principles:

**Managed-Services-First:** The most operationally complex domains — video encoding/delivery, subscription billing, authentication, and database management — are delegated to purpose-built managed services (Mux, RevenueCat, Supabase). The CineDramas team builds only the thin orchestration layer that connects these services and enforces business rules.

**Two-Plane SaaS Design:** The system separates concerns into a **control plane** (tenant onboarding, configuration, routing, build automation, operational visibility) and an **application plane** (runtime API (Application Programming Interface) endpoints, catalog, entitlements, progress tracking, playback token issuance). The control plane is always shared. The application plane can be shared (Hub) or dedicated (Silhouette).

**Defense-in-Depth Tenant Isolation:** Tenant data is protected at three layers simultaneously — the database layer (Row-Level Security policies), the API (Application Programming Interface) layer (tenant extracted from JWT (JSON Web Token) claims, never from client parameters), and the application layer (tenant identity baked into mobile builds). Even if one layer has a bug, the others prevent cross-tenant data leakage.

**Edge-First Performance:** Read-heavy endpoints (catalog, configuration) are aggressively cached at the CDN (Content Delivery Network) edge. Write-heavy endpoints (watch progress) use client-side debouncing and server-side rate limiting. Playback token issuance runs on geographically distributed edge functions. The system is designed so that the database receives only a fraction of total request volume.

**Progressive Platform Evolution:** The system is built in two stages. Stage 1 (Silhouette) delivers a complete, production-ready single-tenant platform. Stage 2 (Hub) extends that platform into a shared multi-tenant model. Every architectural decision in Stage 1 must be forward-compatible with Stage 2. The database schema includes `tenant_id` from day one, even in single-tenant Silhouette deployments, to ensure seamless evolution.

### 1.3 Platform Goals

| Goal                        | Target                                                                               | Measurement                               |
| --------------------------- | ------------------------------------------------------------------------------------ | ----------------------------------------- |
| Concurrent viewer support   | 100,000+ (path to 200,000+)                                                          | Load testing with simulated users         |
| Cold start to interactive   | < 2 seconds                                                                          | Splash screen masking async loads         |
| Time-to-first-frame (video) | < 500ms on Wi-Fi                                                                     | Mux Data startup time metric              |
| Vertical swipe frame rate   | 60 FPS (Frames Per Second)                                                           | Flashlight performance profiling          |
| Tenant onboarding time      | < 1 day (Hub), < 1 week (Silhouette)                                                 | Operational SLA (Service Level Agreement) |
| White-label app deployment  | Same day from single CI/CD (Continuous Integration / Continuous Deployment) pipeline | EAS Build matrix completion time          |
| Cross-tenant data leakage   | Zero tolerance                                                                       | Automated negative isolation tests        |

### 1.4 Design Constraints

- **Single Codebase:** All mobile applications — both Silhouette white-label apps and the Hub shared app — are built from one React Native / Expo codebase. Platform-specific behavior is driven by build-time configuration and runtime tenant context, never by code forks.
- **No Custom Video Infrastructure:** CineDramas does not encode, store, or deliver video. Mux handles the entire video pipeline. CineDramas controls access to video through catalog management and signed playback token issuance.
- **No Custom Billing Logic:** CineDramas does not process payments or manage subscription state machines. RevenueCat handles store interactions, receipt validation, and subscription lifecycle. CineDramas consumes webhook events to maintain an entitlements table for server-side access decisions.
- **PostgreSQL as System of Record:** All persistent state (tenants, catalog, users, entitlements, progress) lives in PostgreSQL via Supabase. There is no secondary database. Redis is used only as an ephemeral cache/rate-limiter, never as a source of truth.
- **Server-Side Token Generation:** Signed playback tokens (Mux JWT) are generated exclusively on the server (Supabase Edge Functions). Signing keys never exist in mobile builds or client-accessible storage.

### 1.5 Why This Architecture Is Appropriate

The dominant cost and complexity in a streaming platform is video infrastructure (encoding, storage, multi-CDN delivery, DRM (Digital Rights Management)). By delegating this to Mux, CineDramas eliminates the need for a dedicated video engineering team and avoids multi-million-dollar CDN contracts. Similarly, subscription billing across Apple and Google stores is notoriously complex — RevenueCat absorbs that complexity entirely.

What remains is a thin but critical orchestration layer: catalog management, tenant isolation, entitlement enforcement, and playback authorization. This is the domain where CineDramas adds unique value, and it maps cleanly to a Supabase-backed API surface with edge functions for low-latency operations.

The bridge tenancy model allows CineDramas to serve both high-value enterprise clients (who demand physical isolation) and long-tail creators (who benefit from shared infrastructure economics) — without maintaining two separate platforms.

---

## 2. High-Level System Architecture

### 2.1 Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          CLIENT LAYER                                       │
│                                                                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐   │
│  │ Silhouette   │  │ Silhouette   │  │   Hub App    │  │   Admin      │   │
│  │ App Client A │  │ App Client B │  │ (Multi-Ten.) │  │  Dashboard   │   │
│  │ (Branded)    │  │ (Branded)    │  │              │  │  (React Web) │   │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘   │
│         │                  │                  │                  │           │
└─────────┼──────────────────┼──────────────────┼──────────────────┼───────────┘
          │ HTTPS            │ HTTPS            │ HTTPS            │ HTTPS
          ▼                  ▼                  ▼                  ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                     EDGE / CDN LAYER (Cloudflare)                           │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  TLS Termination → WAF / DDoS Protection → Cache Layer → Routing  │   │
│  │                                                                     │   │
│  │  Cached: /catalog/*, /config/*  (public, max-age=300, SWR=60)      │   │
│  │  Passed: /auth/*, /user/*, /playback/*, /webhooks/*                │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────┬───────────────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                   APPLICATION PLANE (Supabase Edge Functions)                │
│                                                                             │
│  ┌────────────┐ ┌────────────┐ ┌────────────┐ ┌────────────┐              │
│  │ Auth       │ │ Catalog    │ │ Progress   │ │ Playback   │              │
│  │ Service    │ │ Service    │ │ Service    │ │ Token Svc  │              │
│  └────────────┘ └────────────┘ └────────────┘ └────────────┘              │
│  ┌────────────┐ ┌────────────┐ ┌────────────┐                             │
│  │ Config     │ │ Mux        │ │ RevenueCat │                             │
│  │ Service    │ │ Webhook    │ │ Webhook    │                             │
│  └────────────┘ └────────────┘ └────────────┘                             │
│                                                                             │
│  JWT Validation │ Tenant Resolution │ Rate Limiting │ Structured Logging   │
│                                                                             │
└────────────┬─────────────────────────────┬──────────────────────────────────┘
             │                             │
             ▼                             ▼
┌──────────────────────────┐   ┌──────────────────────────┐
│      DATA LAYER          │   │   EXTERNAL PLATFORMS     │
│                          │   │                          │
│  ┌────────────────────┐  │   │  ┌────────────────────┐  │
│  │  PostgreSQL        │  │   │  │  Mux               │  │
│  │  (Supabase)        │  │   │  │  Video Streaming   │  │
│  │  + RLS Policies    │  │   │  │  + Mux Data QoE    │  │
│  │  + Connection Pool │  │   │  │  + Webhooks        │  │
│  └────────────────────┘  │   │  └────────────────────┘  │
│  ┌────────────────────┐  │   │  ┌────────────────────┐  │
│  │  Object Storage    │  │   │  │  RevenueCat        │  │
│  │  (Supabase Storage)│  │   │  │  Subscriptions     │  │
│  │  + Storage RLS     │  │   │  │  + Webhooks        │  │
│  └────────────────────┘  │   │  └────────────────────┘  │
│  ┌────────────────────┐  │   │  ┌────────────────────┐  │
│  │  Redis (Upstash)   │  │   │  │  App Store /       │  │
│  │  Rate Limiting     │  │   │  │  Google Play       │  │
│  │  Token Cache       │  │   │  └────────────────────┘  │
│  └────────────────────┘  │   │                          │
└──────────────────────────┘   └──────────────────────────┘
```

### 2.2 Component Boundaries and Responsibilities

#### Client Layer

| Component       | Responsibility                                                                                                                                                                                   | Technology                                                  |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------- |
| Silhouette Apps | Branded mobile apps, each deployed under a client's App Store / Google Play account. Contains hardcoded `tenant_id`, tenant-specific assets (icon, splash, theme), and tenant-specific API keys. | React Native + Expo, built via EAS Build with `APP_VARIANT` |
| Hub App         | Single mobile app serving multiple tenants. Tenant context is resolved at login or via deep link. Shares the same codebase as Silhouette apps but uses dynamic tenant selection.                 | React Native + Expo, same codebase                          |
| Admin Dashboard | Internal web application for content ingestion (series/episode management), tenant configuration, and operational monitoring.                                                                    | React (web) hitting Supabase API                            |

#### Edge / CDN (Content Delivery Network) Layer

| Component                                        | Responsibility                                                                                                                                                    |
| ------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| TLS (Transport Layer Security) Termination       | Terminates HTTPS connections, offloads encryption from origin                                                                                                     |
| WAF (Web Application Firewall) / DDoS Protection | Blocks malicious traffic, rate-limits abusive clients                                                                                                             |
| Cache Layer                                      | Caches read-heavy responses (catalog, config) at edge PoPs (Points of Presence) worldwide. Cache key includes `tenant_id` to prevent cross-tenant cache pollution |
| Request Routing                                  | Routes non-cached requests to Supabase Edge Functions                                                                                                             |

#### Application Plane (Edge Functions)

| Service                    | Endpoint Pattern                                                        | Responsibility                                                                         |
| -------------------------- | ----------------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| Auth Service               | `POST /auth/login`, `POST /auth/register`                               | User authentication via Supabase Auth; embeds `tenant_id` in JWT custom claims         |
| Catalog Service            | `GET /catalog/series`, `GET /catalog/series/:id`, `GET /catalog/search` | Tenant-scoped catalog queries; returns series, seasons, episodes with Mux playback IDs |
| Progress Service           | `GET /user/progress`, `PUT /user/progress/:episodeId`                   | Watch progress read/write with UPSERT semantics and rate limiting                      |
| Playback Token Service     | `GET /playback/token/:episodeId`                                        | Generates signed Mux JWT for premium content after entitlement verification            |
| Config Service             | `GET /config/:tenantId`                                                 | Returns runtime tenant configuration (theme, feature flags, legal URLs)                |
| Entitlements Service       | `GET /user/entitlements`                                                | Returns current subscription tier and accessible content                               |
| Mux Webhook Handler        | `POST /webhooks/mux`                                                    | Receives `video.asset.ready` and other Mux events; updates catalog asset state         |
| RevenueCat Webhook Handler | `POST /webhooks/revenuecat`                                             | Receives subscription events; updates entitlements table                               |

#### Data Layer

| Component                         | Responsibility                                                                                                                                                             |
| --------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| PostgreSQL (Supabase)             | System of record for all persistent data: tenants, catalog, users, entitlements, watch progress. RLS (Row-Level Security) enforces tenant isolation at the database level. |
| Object Storage (Supabase Storage) | Non-video assets: brand logos, thumbnail overrides, admin-uploaded images. Access controlled via Storage RLS policies.                                                     |
| Redis (Upstash)                   | Ephemeral cache for rate limiting counters, playback token caching (per user+episode), and session-level data. Not a source of truth.                                      |

#### External Platforms

| Platform   | What CineDramas Delegates                                                                                                                                                           | What CineDramas Retains                                                                      |
| ---------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| Mux        | Video upload, encoding, storage, HLS (HTTP Live Streaming) adaptive bitrate delivery, multi-CDN, thumbnail generation, subtitle hosting, DRM, QoE (Quality of Experience) analytics | Catalog management, playback authorization (signed token issuance), content access decisions |
| RevenueCat | Store interactions (Apple/Google), receipt validation, subscription lifecycle, trial management, regional pricing                                                                   | Entitlement storage (server-side), access gating, paywall UI, webhook-driven state sync      |
| Cloudflare | TLS, DDoS protection, edge caching, WAF                                                                                                                                             | Cache rules configuration, cache key design, invalidation triggers                           |

### 2.3 Service Communication Patterns

**Client-to-Server:** All client-to-server communication uses HTTPS REST (Representational State Transfer) APIs. Every request includes a Bearer token (JWT) in the `Authorization` header. The JWT contains the user's `sub` (subject/user ID), `tenant_id`, and `role` claims.

**Server-to-External (Outbound):** Edge functions make outbound HTTPS calls to Mux (for signing key operations and playback token generation) and to RevenueCat (for customer info verification). These calls use server-side API keys stored in environment variables.

**External-to-Server (Inbound Webhooks):** Mux and RevenueCat send HTTPS POST requests to dedicated webhook endpoints. Every webhook is verified using cryptographic signature validation (HMAC-SHA256 (Hash-based Message Authentication Code using SHA-256) for Mux, shared secret verification for RevenueCat) and processed idempotently using an idempotency key stored in the `webhook_events` table.

**No Inter-Service Communication:** Edge functions are stateless and independent. There is no service-to-service mesh or message bus. Each edge function reads from and writes to the shared PostgreSQL database. This eliminates distributed transaction complexity and keeps the architecture simple.

### 2.4 End-to-End System Flow: User Watches a Video

1. **App Launch:** Mobile app starts. Reads cached tenant config from local storage (AsyncStorage). Simultaneously fetches fresh config from `GET /config/:tenantId` (CDN-cached, returns in < 50ms from edge).
2. **Authentication Check:** App checks `expo-secure-store` for a stored JWT. If valid and not expired, proceeds. If expired or absent, redirects to login screen.
3. **Home Screen Load:** App calls `GET /catalog/featured` (CDN-cached). TanStack Query serves from persisted cache immediately, then background-refetches. Home screen renders with continue-watching rail, featured banners, and category rows.
4. **Series Selection:** User taps a series card. App calls `GET /catalog/series/:id` (CDN-cached). Renders series detail with season selector and episode list.
5. **Episode Play (Free):** User taps a free episode. App uses the public Mux playback ID directly: `https://stream.mux.com/{playbackId}.m3u8`. Video loads via HLS adaptive bitrate streaming.
6. **Episode Play (Premium):** User taps a premium episode. App calls `GET /playback/token/:episodeId`. Edge function validates JWT, checks entitlements table, generates a signed Mux JWT (RS256), and returns the tokenized URL. App loads: `https://stream.mux.com/{playbackId}.m3u8?token={signedJwt}`.
7. **Playback Progress Tracking:** During playback, the app sends `PUT /user/progress/:episodeId` every 10 seconds, on pause, and on app background. Edge function rate-limits to 6 writes/min/user and performs UPSERT on `watch_progress`.
8. **Subscription Gate:** If the user lacks an active entitlement for premium content, step 6 returns `403 Forbidden` and the app displays the paywall screen. The paywall pulls RevenueCat offerings and presents subscription options.

---

## 3. Technology Stack Deep Explanation

This section explains every technology in the CineDramas stack. For each technology: what it is, how it works internally, why it was chosen for CineDramas, and how it integrates into the architecture.

### 3.1 React Native

**What it is:** React Native is an open-source framework created by Meta that enables building native mobile applications for iOS and Android using JavaScript and React. Unlike hybrid frameworks that render in a web view, React Native renders actual native UI components (UIKit on iOS, Android Views on Android) through a bridge between JavaScript and native code.

**How it works internally:** React Native runs a JavaScript engine (Hermes, by default) on the mobile device. The React reconciler computes a virtual component tree in JavaScript. A bridge (or the newer JSI (JavaScript Interface) / Fabric architecture) translates this tree into native UI commands. When a developer writes `<View>`, it becomes `UIView` on iOS and `android.view.View` on Android. Styling uses a Flexbox-based layout engine (Yoga) that runs natively — not CSS in a browser.

**Why chosen for CineDramas:** A single JavaScript/TypeScript codebase produces both iOS and Android apps, reducing development cost by roughly 40-60% compared to native teams for each platform. The React paradigm (components, hooks, state management) is familiar to web React developers, enabling faster onboarding. React Native's ecosystem includes mature video playback, gesture handling, and animation libraries required for a streaming app.

**How it integrates:** React Native is the foundation of every CineDramas mobile app. All screens, components, hooks, and business logic are written in TypeScript targeting React Native. Platform-specific code (iOS vs Android) is handled through `Platform.OS` checks and native module configuration, not separate codebases.

### 3.2 Expo and EAS (Expo Application Services)

**What it is:** Expo is a framework and platform built on top of React Native that provides a managed development workflow, pre-configured native modules, and cloud build/update services. EAS Build is a cloud CI/CD service that compiles React Native apps into signed iOS `.ipa` and Android `.aab` binaries. EAS Update provides OTA (Over-The-Air) updates that push JavaScript bundle changes to users without requiring a store review.

**How it works internally:** Expo provides a "managed workflow" where the native iOS and Android project files are generated and maintained by Expo (developers write only JavaScript/TypeScript). When native modules are needed beyond what Expo provides, a "custom dev client" is used — Expo generates the native projects, and developers can add native dependencies. EAS Build runs builds on Expo's cloud infrastructure, producing signed binaries for each platform. EAS Update uses a code-signing mechanism to deliver OTA JavaScript bundle updates to deployed apps, scoped per release channel.

**Why chosen for CineDramas:** The white-label model requires building many branded apps from one codebase. Expo's `app.config.js` supports dynamic configuration — setting the `APP_VARIANT` environment variable before build changes the app name, bundle ID, icons, splash screen, and all API keys. EAS Build profiles allow defining build configurations per brand variant in `eas.json`. This means adding a new white-label client requires adding a brand configuration directory and a build profile — not forking the codebase. EAS Update enables pushing bug fixes and UI changes to all deployed apps without waiting for store review (typically 1-3 days per platform).

**How it integrates:** `app.config.js` reads `APP_VARIANT` and loads the corresponding brand configuration from `brands/{variant}/manifest.json`. EAS Build compiles the app with that configuration. The resulting binary contains the correct bundle ID, app name, icons, and embedded API keys for the specific tenant. For the Hub app, `APP_VARIANT=hub` produces a single app that resolves tenant context at runtime rather than build time.

### 3.3 Expo Router

**What it is:** Expo Router is a file-system-based routing library for React Native apps built with Expo. It uses the file and folder structure inside the `app/` directory to automatically generate navigation routes — similar to how Next.js handles routing in React web applications.

**How it works internally:** Expo Router maps files in the `app/` directory to screens. `app/index.tsx` is the root route. `app/series/[id].tsx` creates a dynamic route that accepts a series ID parameter. `app/(tabs)/_layout.tsx` defines a tab navigator layout. Under the hood, Expo Router wraps React Navigation and generates the navigation tree from the filesystem at build time.

**Why chosen for CineDramas:** File-based routing reduces boilerplate compared to manual React Navigation configuration. Deep linking is built in — each file-based route automatically corresponds to a URL path, which is critical for per-brand deep links and universal links. Developers familiar with Next.js immediately understand the routing model.

**How it integrates:** The `app/` directory contains all screen files organized by feature area: `app/(tabs)/` for tab navigation (Home, Search, Profile), `app/series/[id].tsx` for series detail, `app/player/[episodeId].tsx` for the full-screen player, `app/auth/` for authentication screens, `app/paywall.tsx` for subscription, and `app/onboarding.tsx` for first-launch experience.

### 3.4 react-native-video (Version 7)

**What it is:** `react-native-video` is an open-source React Native library that provides a native video player component for iOS and Android. Version 7 introduced a new architecture with a `VideoPlayer` class that supports programmatic control, preloading, and improved performance.

**How it works internally:** On iOS, it wraps `AVPlayer` (Apple's media playback framework). On Android, it wraps ExoPlayer (Google's extensible media player). Both players natively support HLS (HTTP Live Streaming) adaptive bitrate streams, which is the format Mux delivers. The v7 `VideoPlayer.preload()` API allows pre-buffering a video stream before it is displayed, enabling instant playback when the user swipes to the next episode.

**Why chosen for CineDramas:** CineDramas requires HLS playback compatible with Mux, sub-500ms time-to-first-frame (achieved via preloading), and native performance for vertical swipe feeds at 60 FPS. `react-native-video` v7's preload API is the key enabler for the vertical feed UX: the app preloads the next and previous episodes so that swiping is instant. The library also integrates with Mux Data for video QoE analytics.

**How it integrates:** The `VideoPlayer` component is wrapped in a `components/video/VideoPlayer.tsx` abstraction that handles Mux HLS URL construction, preloading lifecycle, and Mux Data integration. The `PreloadManager.ts` manages a pool of preloaded video instances (N-1 and N+1 episodes relative to the current position in the feed).

### 3.5 @shopify/flash-list (Version 2)

**What it is:** FlashList is a high-performance list component for React Native created by Shopify. It is a drop-in replacement for React Native's built-in `FlatList` with significantly better performance for long lists.

**How it works internally:** Unlike `FlatList` which creates and destroys list item components as the user scrolls, FlashList uses **cell recycling** — it maintains a pool of rendered components and reuses them as items scroll in and out of view, changing only the data they display. This eliminates the JavaScript-to-native bridge overhead of creating/destroying components and reduces garbage collection pressure. FlashList requires an `estimatedItemSize` prop to optimize its recycling pool.

**Why chosen for CineDramas:** The home screen contains multiple horizontal rails (continue watching, featured, categories) and the player screen uses a vertical feed of full-screen video items. These are performance-critical scroll interactions. FlashList provides up to 5x better scroll performance compared to FlatList, particularly important for maintaining 60 FPS during rapid vertical swipes through the video feed.

**How it integrates:** FlashList is used in two configurations: (1) horizontal mode for home screen rails (`ContinueWatchingRail.tsx`, `CategoryRail.tsx`), and (2) vertical paging mode for the full-screen video feed (`VerticalFeed.tsx`) with snap-to-item behavior and a `drawDistance` tuned to render only 3 items (previous, current, next).

### 3.6 NativeWind (Tailwind CSS for React Native)

**What it is:** NativeWind is a library that brings Tailwind CSS utility classes to React Native. It compiles Tailwind class names into React Native `StyleSheet` objects at build time, allowing developers to style components using familiar Tailwind syntax.

**How it works internally:** NativeWind uses a Babel plugin that processes Tailwind class names (e.g., `className="bg-primary text-white p-4 rounded-lg"`) and converts them to the equivalent React Native style objects (e.g., `{ backgroundColor: '#E50914', color: '#ffffff', padding: 16, borderRadius: 8 }`). It supports CSS custom properties (variables), which enables runtime theming by switching variable values.

**Why chosen for CineDramas:** The white-label system requires per-brand theming — each tenant has different colors, typography, and spacing. NativeWind's CSS variable support allows defining a base design system with variables (`--color-primary`, `--color-background`, `--font-heading`) that are swapped per brand at build time or runtime. Developers familiar with Tailwind CSS from web development can immediately write styles.

**How it integrates:** A `global.css` file defines base CSS variables. Each brand's `theme.ts` overrides these variables. The `ThemeProvider` component wraps the app and applies the active brand's variables. All component styling uses Tailwind classes that reference these variables (e.g., `bg-primary` resolves to `var(--color-primary)`).

### 3.7 Zustand

**What it is:** Zustand is a lightweight state management library for React. It provides a simple API for creating global state stores without the boilerplate of Redux or the complexity of context-based solutions.

**How it works internally:** A Zustand store is created with `create()` and returns a hook. The store holds state and actions (functions that modify state). Components subscribe to specific slices of state using selectors (e.g., `useAuthStore(state => state.user)`), and only re-render when their selected slice changes. This selector-based subscription model eliminates unnecessary re-renders that are common with React Context.

**Why chosen for CineDramas:** CineDramas needs global state for authentication status (including `tenant_id`), current playback state (active episode, position, paused/playing), and runtime brand configuration. Zustand's minimal API (no providers, no reducers, no action types) reduces boilerplate. Its selector model prevents re-renders in the video feed — critical for maintaining 60 FPS.

**How it integrates:** Three stores: `authStore.ts` (user, tenant_id, JWT, login/logout actions), `playerStore.ts` (current episode, playback position, active player reference), `configStore.ts` (runtime brand config fetched from `/config/:tenantId`).

### 3.8 TanStack React Query

**What it is:** TanStack React Query (formerly React Query) is a server-state management library for React applications. It manages the lifecycle of data fetched from APIs — caching, background refetching, stale data handling, pagination, and optimistic updates.

**How it works internally:** Each API call is associated with a **query key** (e.g., `['catalog', 'series', tenantId]`). React Query caches the response data against this key. When a component mounts and requests data with the same key, React Query serves the cached data immediately (if not stale) and optionally refetches in the background. The `staleTime` configuration controls how long data is considered fresh. The `persistQueryClient` plugin can serialize the cache to AsyncStorage, enabling offline-first rendering from cached data on app launch.

**Why chosen for CineDramas:** Catalog data is read-heavy and rarely changes — ideal for aggressive caching (`staleTime: 5 minutes`). User progress data changes frequently but can tolerate brief staleness (`staleTime: 30 seconds`). React Query's cache persistence enables the app to render a cached home screen instantly on cold start (while fetching fresh data in the background), meeting the < 2 second cold start requirement. Its built-in retry logic handles transient network failures gracefully.

**How it integrates:** All API calls go through React Query hooks: `useCatalog()`, `useSeriesDetail(id)`, `useWatchProgress()`, `useEntitlements()`. These hooks wrap `fetch()` calls to Supabase endpoints and configure per-endpoint caching policies. The query client is persisted to AsyncStorage on every change and hydrated on app start.

### 3.9 Supabase

**What it is:** Supabase is an open-source backend-as-a-service (BaaS) platform built on PostgreSQL. It provides a managed PostgreSQL database, authentication (email, social providers, magic link), serverless edge functions (Deno-based), object storage, and real-time subscriptions — all accessible via auto-generated REST and GraphQL APIs (Application Programming Interfaces).

**How it works internally:**

- **Database:** Supabase runs a managed PostgreSQL instance with the PostgREST API layer that automatically generates REST endpoints for every table. RLS policies are native PostgreSQL policies created with `CREATE POLICY` that filter rows based on the executing user's JWT claims.
- **Auth:** Supabase Auth is a Go-based service (GoTrue) that handles user registration, login, JWT issuance, and social provider OAuth (Open Authorization) flows. JWTs include standard claims (`sub`, `email`, `role`) and support custom claims (where `tenant_id` is injected).
- **Edge Functions:** Deno-based serverless functions that run on a globally distributed edge runtime. They execute close to users, reducing latency for operations like playback token generation. They can access the database directly via the Supabase client SDK.
- **Storage:** S3-compatible object storage with access control enforced through PostgreSQL RLS policies on the `storage.objects` table. Files are organized in buckets.
- **Connection Pooling:** Supabase uses PgBouncer (a PostgreSQL connection pooler) in transaction mode to multiplex many concurrent edge function invocations over a smaller pool of database connections. This is essential for serverless workloads where each function invocation would otherwise require its own database connection.

**Why chosen for CineDramas:** Supabase provides the entire backend stack in one platform: database, auth, serverless compute, and storage. Its RLS model is the strongest tenant isolation mechanism available in a BaaS — policies are enforced at the database engine level, not in application code. Edge functions provide low-latency token issuance without managing servers. The auto-generated REST API accelerates development for standard CRUD (Create, Read, Update, Delete) operations while edge functions handle custom logic.

**How it integrates:** Each Silhouette tenant gets a dedicated Supabase project (separate database, auth, storage). The Hub shares one Supabase project with RLS policies scoping all queries to the authenticated user's `tenant_id`. Edge functions implement the API surface (catalog, progress, token, webhooks). Supabase Auth issues JWTs with embedded `tenant_id` claims that flow through every API call.

### 3.10 Mux

**What it is:** Mux is a managed video infrastructure platform. It provides APIs for video upload and ingestion, server-side encoding into multiple quality levels, storage, adaptive bitrate streaming delivery via a global multi-CDN network, thumbnail/poster generation, subtitle hosting, DRM, and video Quality of Experience (QoE) analytics via Mux Data.

**How it works internally:**

- **Ingestion:** Videos are uploaded via the Mux Upload API (direct upload from browser/server) or pulled from a URL. Mux encodes the video into multiple renditions (quality levels) — typically 360p, 540p, 720p, 1080p, and sometimes 4K.
- **HLS (HTTP Live Streaming) Delivery:** Encoded video is delivered as HLS streams — a protocol where video is split into small segments (typically 2-6 seconds each) and a manifest file (`.m3u8`) lists all available quality levels. The player dynamically selects the best quality based on the viewer's bandwidth, switching seamlessly during playback (adaptive bitrate).
- **Playback IDs:** Each uploaded video asset receives a `playback_id`. A public playback ID allows anyone with the URL to watch. A signed playback ID requires a valid JWT token appended to the URL.
- **Signed Playback:** For premium content, the playback policy is set to `signed`. The CineDramas server generates a JWT (using an RS256 (RSA Signature with SHA-256) private key provided by Mux) with claims including `sub` (the playback ID), `aud` (audience: `v` for video, `t` for thumbnail, `s` for storyboard), and `exp` (expiration). This JWT is appended to the stream URL as a query parameter.
- **Mux Data:** A separate analytics product that tracks viewer-side metrics: startup time (how long until the first frame plays), rebuffering ratio, playback failure rate, engagement (how much of the video was watched), and more. Data is collected via the `@mux/mux-data-react-native-video` SDK integrated into the player.
- **Webhooks:** Mux sends HTTP POST requests to your configured endpoint when events occur (e.g., `video.asset.ready` when encoding completes, `video.asset.errored` on failure). Each webhook includes a `Mux-Signature` header for HMAC-SHA256 verification.

**Why chosen for CineDramas:** Building a video pipeline (encoding, storage, multi-CDN delivery) is a multi-million-dollar infrastructure investment requiring specialized expertise. Mux eliminates this entirely. At 100,000+ concurrent viewers, Mux's global multi-CDN network handles delivery without CineDramas managing any video infrastructure. Signed playback provides content protection. Mux Data provides video QoE analytics that would otherwise require a custom telemetry pipeline.

**How it integrates:** Episode records in the CineDramas database store `mux_playback_id` and `mux_asset_id`. The mobile app constructs stream URLs from playback IDs. For premium content, the Playback Token edge function generates a signed Mux JWT and returns the tokenized URL. The Mux Webhook handler processes `video.asset.ready` events to update asset status in the catalog. Mux Data SDK is initialized in the video player component with the tenant's Mux environment key.

### 3.11 RevenueCat

**What it is:** RevenueCat is a subscription management platform that abstracts the complexity of in-app purchases across Apple App Store and Google Play Store. It provides SDKs for mobile apps, a server-side API, a webhook system for subscription events, and a dashboard for configuring products, offerings, and entitlements.

**How it works internally:**

- **SDK:** The `react-native-purchases` SDK handles store communication (presenting products, initiating purchases, validating receipts). The app initializes the SDK with a RevenueCat API key (public, safe to embed in the app).
- **Offerings:** Configured in the RevenueCat dashboard, offerings define what subscription products a user sees (e.g., "Monthly $9.99", "Yearly $79.99", "Lifetime $199.99"). The app fetches offerings at runtime, so pricing can be changed without app updates.
- **Entitlements:** RevenueCat maps store products to entitlements (e.g., both "Monthly" and "Yearly" products grant the "premium" entitlement). The app checks `customerInfo.entitlements.active['premium']` to determine access.
- **Receipt Validation:** When a user purchases, the SDK sends the receipt to RevenueCat's servers, which validate it with Apple/Google. This happens entirely server-side — no custom receipt validation code is needed.
- **Webhooks:** RevenueCat sends HTTP POST requests to your backend when subscription events occur (initial purchase, renewal, cancellation, billing issue, expiration). Your backend updates the `entitlements` table based on these events.

**Why chosen for CineDramas:** Subscription billing across Apple and Google is notoriously complex — different APIs, different receipt formats, different edge cases (grace periods, billing retries, family sharing, promotional offers). RevenueCat handles all of this. For a multi-tenant platform, each tenant can have its own RevenueCat project with tenant-specific products and pricing. The webhook-to-entitlements pipeline ensures the server always has an accurate entitlement record for access gating.

**How it integrates:** Each tenant has a RevenueCat API key stored in the brand manifest (build-time) and tenant config (runtime). The SDK is initialized on app launch with the active tenant's key. The paywall screen fetches offerings from RevenueCat and renders subscription options. On purchase, RevenueCat validates the receipt and sends a webhook to `POST /webhooks/revenuecat`. The edge function verifies the webhook signature, extracts the subscriber ID and entitlement state, and UPSERT-s the `entitlements` table.

### 3.12 Cloudflare

**What it is:** Cloudflare is a global edge network platform that provides CDN (Content Delivery Network) caching, DDoS (Distributed Denial of Service) protection, WAF (Web Application Firewall), DNS (Domain Name System) management, and edge compute capabilities. It operates over 300 PoPs (Points of Presence) worldwide.

**How it works internally:** When a request arrives at Cloudflare, it first passes through DDoS mitigation and WAF rule evaluation. Then, Cloudflare checks if a cached response exists for the request. Cache behavior is controlled by `Cache-Control` response headers and Cloudflare-specific cache rules. By default, Cloudflare does **not** cache JSON or HTML responses — this must be explicitly configured via Cache Rules or Page Rules. The `stale-while-revalidate` directive allows Cloudflare to serve a stale cached response immediately while asynchronously fetching a fresh response from the origin, reducing perceived latency and origin load.

**Why chosen for CineDramas:** At 100,000+ concurrent users, even "simple" catalog reads would overwhelm the database if every request hit the origin. Cloudflare absorbs the majority of read traffic: catalog endpoints are cached for 5 minutes with stale-while-revalidate, config endpoints are similarly cached. This reduces origin database load to a fraction of total request volume. WAF and rate limiting protect write endpoints (progress, token) from abuse.

**How it integrates:** Cloudflare sits in front of all Supabase Edge Function endpoints. Cache Rules are configured to cache `GET /catalog/*` and `GET /config/*` responses with `Cache-Control: public, max-age=300, stale-while-revalidate=60` and a cache key that includes `tenant_id` (extracted from the URL path or a custom header). Write endpoints (`PUT`, `POST`) are never cached. Rate limiting rules enforce per-IP and per-user limits on write endpoints.

### 3.13 Sentry

**What it is:** Sentry is an application monitoring platform that provides crash reporting, performance tracing, and error tracking for mobile and web applications. For React Native, it captures JavaScript exceptions, native crashes, performance transactions (screen load times, API call durations), and source-mapped stack traces.

**How it works internally:** The `@sentry/react-native` SDK captures unhandled JavaScript exceptions, native crashes (using platform crash reporters), and performance data. It attaches contextual data: device info, OS version, app version, breadcrumbs (user actions leading to the error), and custom tags. Crash reports are uploaded to Sentry's servers where they are symbolicated (source maps for JS, dSYMs for iOS, ProGuard maps for Android) to produce readable stack traces.

**Why chosen for CineDramas:** In a multi-tenant platform, debugging requires knowing which tenant is affected. Sentry's tagging system allows attaching `tenant_id` to every event, enabling tenant-scoped error dashboards. Performance tracing identifies slow screens or API calls per tenant. Source map support produces readable stack traces even from minified production builds.

**How it integrates:** Sentry is initialized in `app/_layout.tsx` (root layout). The `tenant_id` is set as a Sentry tag on login. All unhandled errors and performance transactions automatically include this tag. Error boundaries on every screen capture component-level errors and report them to Sentry with screen context. Source maps are uploaded during EAS Build via the Sentry Expo plugin.

### 3.14 Supporting Libraries

**react-native-reanimated:** An animation library that runs animations on the native UI thread (not the JavaScript thread). Animations are defined as "worklets" — small JavaScript functions compiled to run natively. This enables 60 FPS gesture-driven animations (e.g., player overlay fade, onboarding slide transitions, swipe gestures) without JavaScript thread jank. Chosen because the vertical video feed and player controls require fluid, gesture-responsive animations.

**react-native-gesture-handler:** A gesture recognition library that processes touch events on the native thread. It supports tap, double-tap, long press, pan, pinch, and rotation gestures with composition (e.g., double-tap for like, single-tap for pause, vertical pan for scrubbing). Chosen because the video player requires multi-gesture recognition running at native speed.

**expo-secure-store:** Encrypted key-value storage using the device's secure enclave (Keychain on iOS, EncryptedSharedPreferences on Android). Used to store authentication tokens (JWT), refresh tokens, and any sensitive data. Chosen over AsyncStorage (which is unencrypted) because auth tokens grant access to tenant data and must be stored securely.

**expo-image:** An image component with built-in disk caching, progressive loading, and blurhash placeholder support. Blurhash generates a compact blurred representation of an image that can be displayed instantly while the full image loads. Used for all thumbnails and poster images. Mux provides thumbnail URLs (`https://image.mux.com/{playbackId}/thumbnail.webp`) that are loaded through `expo-image` with blurhash placeholders extracted from Mux thumbnail metadata.

---

## 4. Platform Architecture Flow

This section documents the complete system flow for every major operation. Each flow is described step-by-step with the participating components, data payloads, and failure handling.

### 4.1 User Request Lifecycle (App Launch to Content Browsing)

```
Step  Component               Action
────  ────────────────────    ──────────────────────────────────────────────────
1     Mobile App              App process starts. Expo splash screen displayed.
2     Mobile App              ThemeProvider reads brand config from AsyncStorage
                              (last-known-good cache). Applies brand colors
                              and typography immediately.
3     Mobile App              Zustand authStore hydrates from expo-secure-store.
                              Checks for stored JWT.
4     Mobile App              If JWT exists and not expired:
                                → Skip to step 7.
                              If JWT is absent or expired:
                                → Navigate to auth/login screen (step 5).
5     Mobile App              User completes login/register (see Auth Flow 4.2).
6     Supabase Auth           Returns JWT with claims: { sub, email, tenant_id, role }.
                              App stores JWT in expo-secure-store.
7     Mobile App              Parallel requests fire:
                              (a) GET /config/:tenantId → runtime config
                              (b) GET /catalog/featured → home screen data
                              (c) GET /user/progress → continue-watching data
8     Cloudflare CDN          Request (a) and (b) are cache hits (if within 5-min
                              TTL). Served from edge PoP in < 50ms.
                              Request (c) is passed through to origin (user-specific).
9     Edge Functions          For (c): validate JWT, extract tenant_id from claims,
                              query watch_progress table (RLS scoped), return
                              recent episodes with positions.
10    Mobile App              TanStack Query caches all responses. If offline,
                              serves from persisted AsyncStorage cache.
11    Mobile App              Home screen renders:
                              → Continue Watching rail (from step 7c)
                              → Featured Banner (from step 7b)
                              → Category Rails (from step 7b)
                              Splash screen dismissed. Time: < 2 seconds.
12    Mobile App              User taps a series card.
13    Mobile App              GET /catalog/series/:id (CDN-cached).
                              Series detail screen renders with seasons + episodes.
14    Mobile App              User taps an episode. Navigate to player screen.
                              (See Playback Flow 4.4)
```

**Failure Handling:**

- If config fetch fails (step 7a): app uses last-known-good config from AsyncStorage. Logs warning to Sentry.
- If catalog fetch fails (step 7b): app renders from TanStack Query persisted cache. Shows "offline" banner. Retry button triggers refetch.
- If progress fetch fails (step 7c): continue-watching rail is hidden. Other rails render normally.

### 4.2 Authentication Flow

```
Step  Component               Action
────  ────────────────────    ──────────────────────────────────────────────────
1     Mobile App              User enters email + password (or selects social
                              provider: Google, Apple).
2     Mobile App              Calls Supabase Auth SDK:
                              supabase.auth.signInWithPassword({ email, password })
                              OR supabase.auth.signInWithOAuth({ provider: 'google' })
3     Supabase Auth           Validates credentials. For social: completes OAuth
                              flow with provider, receives profile data.
4     Supabase Auth           Creates or retrieves user record. Generates JWT
                              with standard claims (sub, email, role) and custom
                              claims (tenant_id).

                              tenant_id injection: A Supabase database function
                              (trigger on auth.users insert/update) sets
                              raw_app_meta_data.tenant_id based on the app's
                              configured tenant. This value flows into the JWT
                              via a custom access token hook.
5     Supabase Auth           Returns:
                              {
                                access_token: "<JWT>",
                                refresh_token: "<refresh_token>",
                                expires_in: 3600,
                                user: { id, email, tenant_id, ... }
                              }
6     Mobile App              Stores access_token and refresh_token in
                              expo-secure-store (encrypted storage).
                              Updates Zustand authStore with user data.
7     Mobile App              Sets Supabase client auth header for all
                              subsequent requests:
                              Authorization: Bearer <access_token>
8     Mobile App              Token refresh: When access_token is within 5 min
                              of expiry, Supabase client SDK automatically
                              refreshes using the refresh_token.
```

**JWT Custom Claims Structure:**

```json
{
  "sub": "user-uuid-here",
  "email": "user@example.com",
  "role": "authenticated",
  "tenant_id": "client-a",
  "aud": "authenticated",
  "exp": 1742000000,
  "iat": 1741996400
}
```

**tenant_id Injection Mechanism (Database Function):**

```sql
CREATE OR REPLACE FUNCTION public.custom_access_token_hook(event jsonb)
RETURNS jsonb AS $$
DECLARE
  claims jsonb;
  tenant_id text;
BEGIN
  claims := event->'claims';

  SELECT raw_app_meta_data->>'tenant_id' INTO tenant_id
  FROM auth.users
  WHERE id = (event->>'user_id')::uuid;

  claims := jsonb_set(claims, '{tenant_id}', to_jsonb(tenant_id));
  event := jsonb_set(event, '{claims}', claims);

  RETURN event;
END;
$$ LANGUAGE plpgsql;
```

### 4.3 API Request Flow (Generic)

Every API request follows this pipeline:

```
Step  Layer                   Action
────  ────────────────────    ──────────────────────────────────────────────────
1     Mobile App              Constructs request with:
                              - URL: https://api.cinedramas.com/catalog/series
                              - Headers:
                                Authorization: Bearer <jwt>
                                Content-Type: application/json
                                X-Request-ID: <uuid>

2     Cloudflare CDN          DNS resolves to nearest Cloudflare PoP.
                              TLS terminated.
                              WAF rules evaluated (block if malicious).
                              Rate limit check (per-IP, per-user).

3     Cloudflare Cache        For GET requests to cacheable endpoints:
                              If cache HIT → return cached response (step 9).
                              If cache MISS → forward to origin.
                              Cache key: {tenant_id}:{endpoint}:{query_params}

4     Edge Function           Function cold-starts (if not warm) in < 100ms.
                              Extracts JWT from Authorization header.

5     Edge Function           JWT validation:
                              - Verify signature (Supabase JWT secret)
                              - Check expiration (exp claim)
                              - Extract tenant_id from claims
                              - Extract user_id (sub claim)

6     Edge Function           Rate limiting check (for write endpoints):
                              - Increment Redis counter: rate:{user_id}:{endpoint}
                              - If exceeded → return 429 Too Many Requests

7     Edge Function           Business logic execution:
                              - Construct SQL query
                              - Supabase client executes query
                              - RLS automatically filters by tenant_id
                                (WHERE tenant_id = auth.jwt()->>'tenant_id')

8     PostgreSQL              Query executes with RLS enforcement.
                              Returns tenant-scoped results.

9     Edge Function           Constructs response:
                              - Set Cache-Control headers (for cacheable endpoints)
                              - Set X-Request-ID header
                              - Log: { tenant_id, user_id, endpoint, latency_ms,
                                       status_code, request_id }

10    Cloudflare CDN          For cacheable responses: store in edge cache.
                              Return response to client.

11    Mobile App              TanStack Query processes response:
                              - Cache data with query key
                              - Update component state
                              - Persist to AsyncStorage (if configured)
```

### 4.4 Video Playback Flow (Premium Content)

```
Step  Component               Action
────  ────────────────────    ──────────────────────────────────────────────────
1     Mobile App              User taps premium episode. App checks local
                              entitlement cache (Zustand/React Query).

2     Mobile App              If no cached entitlement:
                              → GET /user/entitlements
                              Edge function checks entitlements table.

3     Mobile App              If user has active entitlement (tier >= required):
                              → Proceed to step 4.
                              If no entitlement:
                              → Display paywall screen. Exit this flow.

4     Mobile App              GET /playback/token/:episodeId
                              Authorization: Bearer <jwt>

5     Edge Function           Validate JWT. Extract tenant_id and user_id.
                              Query entitlements table to confirm active sub.
                              Query episodes table to get mux_playback_id.

6     Edge Function           Check token cache (Redis):
                              Key: token:{user_id}:{episode_id}
                              If cached and not expired → return cached token.

7     Edge Function           Generate signed Mux JWT:
                              {
                                sub: mux_playback_id,
                                aud: "v",           // "v" = video
                                exp: now + 6 hours, // long enough for session
                                kid: mux_signing_key_id
                              }
                              Sign with RS256 using Mux private key
                              (stored in environment variable, never in client).

8     Edge Function           Cache token in Redis:
                              Key: token:{user_id}:{episode_id}
                              TTL: 5 hours (less than token expiry)

9     Edge Function           Return to client:
                              {
                                stream_url: "https://stream.mux.com/{id}.m3u8?token={jwt}",
                                thumbnail_url: "https://image.mux.com/{id}/thumbnail.webp?token={jwt}",
                                expires_at: "2026-03-16T18:00:00Z"
                              }

10    Mobile App              VideoPlayer loads HLS stream from stream_url.
                              Mux CDN validates the JWT on the stream URL.
                              Adaptive bitrate playback begins.

11    Mobile App              Mux Data SDK reports QoE metrics:
                              startup_time, rebuffering, errors.

12    Mobile App              Progress tracking begins (see Flow 4.5).
```

### 4.5 Watch Progress Data Flow

```
Step  Component               Action
────  ────────────────────    ──────────────────────────────────────────────────
1     Mobile App              Video plays. Player fires onProgress callback
                              with current position (seconds).

2     Mobile App              useWatchProgress hook debounces updates:
                              - Batches position updates
                              - Sends on: every 10 seconds, on pause, on
                                AppState change to background

3     Mobile App              PUT /user/progress/:episodeId
                              Body: {
                                position_seconds: 342,
                                completed: false
                              }
                              Authorization: Bearer <jwt>

4     Edge Function           Validate JWT. Extract tenant_id, user_id.
                              Rate limit check: max 6 writes/min/user.
                              If rate exceeded → return 429. Client silently
                              skips and retries on next interval.

5     Edge Function           Execute UPSERT:
                              INSERT INTO watch_progress
                                (tenant_id, user_id, episode_id,
                                 position_seconds, completed, updated_at)
                              VALUES ($1, $2, $3, $4, $5, NOW())
                              ON CONFLICT (tenant_id, user_id, episode_id)
                              DO UPDATE SET
                                position_seconds = EXCLUDED.position_seconds,
                                completed = EXCLUDED.completed,
                                updated_at = NOW();

6     PostgreSQL              UPSERT executes atomically. RLS verifies
                              tenant_id matches JWT claim.

7     Mobile App              On next app launch, GET /user/progress returns
                              this position. Continue Watching rail shows
                              the episode with a progress bar at 342s.

8     Mobile App              When position_seconds >= 90% of episode duration:
                              Set completed = true. Episode moves from
                              "continue watching" to "watched" state.
```

### 4.6 Webhook Processing Flow

#### 4.6.1 Mux Webhook (video.asset.ready)

```
Step  Component               Action
────  ────────────────────    ──────────────────────────────────────────────────
1     Mux                     Video encoding completes. Mux sends POST to
                              https://api.cinedramas.com/webhooks/mux
                              Headers: Mux-Signature: t=<timestamp>,v1=<hmac>
                              Body: {
                                type: "video.asset.ready",
                                data: { id, playback_ids: [...], duration, ... }
                              }

2     Edge Function           Extract Mux-Signature header.
                              Compute expected HMAC-SHA256 over raw body
                              using Mux webhook secret.
                              Compare with provided signature.
                              Check timestamp is within 5-minute tolerance
                              (prevents replay attacks).

3     Edge Function           Extract idempotency key: event ID from payload.
                              Check webhook_events table for existing record.
                              If exists → return 200 (already processed).

4     Edge Function           Insert into webhook_events:
                              { source: 'mux', event_type: 'video.asset.ready',
                                payload: <full body>, idempotency_key: <event_id> }

5     Edge Function           Update episodes table:
                              SET mux_asset_status = 'ready',
                                  mux_playback_id = <from payload>,
                                  duration_seconds = <from payload>
                              WHERE mux_asset_id = <from payload>
                              AND tenant_id = <from tenant mapping>

6     Edge Function           Return 200 OK to Mux.
```

#### 4.6.2 RevenueCat Webhook (subscription events)

```
Step  Component               Action
────  ────────────────────    ──────────────────────────────────────────────────
1     RevenueCat              Subscription event occurs (initial_purchase,
                              renewal, cancellation, billing_issue, expiration).
                              POST to https://api.cinedramas.com/webhooks/revenuecat
                              Headers: Authorization: Bearer <shared_secret>
                              Body: { event: { type, subscriber_id, entitlements, ... } }

2     Edge Function           Verify Authorization header matches stored
                              RevenueCat webhook secret.

3     Edge Function           Extract idempotency key: event ID.
                              Check webhook_events for duplicate.
                              If exists → return 200.

4     Edge Function           Insert into webhook_events:
                              { source: 'revenuecat', event_type: <type>,
                                payload: <body>, idempotency_key: <event_id> }

5     Edge Function           Map event type to entitlement action:
                              - initial_purchase / renewal →
                                UPSERT entitlements: tier='premium',
                                expires_at=<from event>
                              - cancellation →
                                UPDATE entitlements: tier='free',
                                expires_at=<end of current period>
                              - expiration →
                                UPDATE entitlements: tier='free',
                                expires_at=NOW()

6     Edge Function           Return 200 OK to RevenueCat.
```

---

## 5. Silhouette Platform Architecture — Stage 1

### 5.1 Overview

The Silhouette platform is the **foundation layer** of CineDramas. It represents the single-tenant, white-label deployment model where each client receives physically isolated infrastructure and a custom-branded mobile application. Every architectural decision, data model, API contract, and service boundary designed in Silhouette must be forward-compatible with the Hub expansion in Stage 2.

Silhouette is not a temporary prototype — it is a production-grade platform that serves enterprise clients who require physical data isolation. Even after Hub launches, Silhouette deployments continue to operate for premium-tier tenants.

### 5.2 Platform Responsibilities

The Silhouette platform is responsible for:

| Domain                 | Responsibility                                               | Not Responsible For                                 |
| ---------------------- | ------------------------------------------------------------ | --------------------------------------------------- |
| Content Catalog        | Storing and serving series/season/episode metadata, search   | Video encoding, storage, delivery (Mux)             |
| User Management        | Registration, authentication, profile, session management    | Social provider OAuth internals (Supabase Auth)     |
| Entitlements           | Server-side subscription state, access gating                | Payment processing, receipt validation (RevenueCat) |
| Watch Progress         | Tracking and resuming playback position per user per episode | Video playback rendering (react-native-video)       |
| Playback Authorization | Generating signed playback tokens for premium content        | Video stream delivery (Mux CDN)                     |
| Tenant Configuration   | Runtime brand config (theme, features, legal URLs)           | Build-time app compilation (EAS Build)              |
| Webhook Processing     | Ingesting and processing Mux and RevenueCat events           | Event generation (Mux/RevenueCat)                   |
| Content Ingestion      | Linking Mux assets to catalog records, status tracking       | Video upload and encoding (Mux)                     |

### 5.3 Core Services Architecture

#### Service Decomposition

Silhouette implements seven logical services, all deployed as Supabase Edge Functions sharing the same PostgreSQL database:

```
┌─────────────────────────────────────────────────────────────────┐
│                    SILHOUETTE PLATFORM                           │
│                                                                  │
│  ┌───────────┐  ┌───────────┐  ┌───────────┐  ┌───────────┐   │
│  │   Auth    │  │  Catalog  │  │ Progress  │  │ Playback  │   │
│  │  Service  │  │  Service  │  │  Service  │  │  Token    │   │
│  │           │  │           │  │           │  │  Service  │   │
│  │ register  │  │ series    │  │ get prog  │  │ generate  │   │
│  │ login     │  │ seasons   │  │ set prog  │  │ signed    │   │
│  │ refresh   │  │ episodes  │  │ mark done │  │ mux jwt   │   │
│  │ logout    │  │ search    │  │           │  │           │   │
│  └───────────┘  │ featured  │  └───────────┘  └───────────┘   │
│                  └───────────┘                                   │
│  ┌───────────┐  ┌───────────┐  ┌───────────┐                   │
│  │  Config   │  │   Mux     │  │ RevenueCat│                   │
│  │  Service  │  │  Webhook  │  │  Webhook  │                   │
│  │           │  │  Handler  │  │  Handler  │                   │
│  │ get config│  │ asset.rdy │  │ purchase  │                   │
│  │ get flags │  │ asset.err │  │ renewal   │                   │
│  │           │  │           │  │ cancel    │                   │
│  └───────────┘  └───────────┘  └───────────┘                   │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │              Shared Middleware Layer                       │   │
│  │  JWT Validation │ Rate Limiting │ Logging │ Error Handler │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │              PostgreSQL + RLS + Object Storage             │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

#### Service Contracts (API Surface)

```
POST   /auth/login                     → { email, password } → { access_token, refresh_token, user }
POST   /auth/register                  → { email, password, display_name } → { access_token, refresh_token, user }
POST   /auth/refresh                   → { refresh_token } → { access_token, refresh_token }
POST   /auth/logout                    → {} → { success: true }

GET    /catalog/series                 → ?page=1&limit=20&category=drama → { data: Series[], total, page }
GET    /catalog/series/:id             → → { series, seasons: [{ season, episodes: Episode[] }] }
GET    /catalog/series/:id/episodes    → ?season=1 → { episodes: Episode[] }
GET    /catalog/featured               → → { continue_watching: Episode[], featured: Series[], rails: Rail[] }
GET    /catalog/search?q=term          → → { results: (Series | Episode)[] }

GET    /user/progress                  → → { progress: WatchProgress[] }
PUT    /user/progress/:episodeId       → { position_seconds, completed } → { success: true }

GET    /user/entitlements              → → { tier, expires_at, features: string[] }

GET    /playback/token/:episodeId      → → { stream_url, thumbnail_url, expires_at }

GET    /config/:tenantId               → → { theme, features, legal_urls, home_rails_order }

POST   /webhooks/mux                   → <mux event payload> → 200 OK
POST   /webhooks/revenuecat            → <revenuecat event payload> → 200 OK
```

### 5.4 Authentication Model

Silhouette uses Supabase Auth with tenant-scoped JWT claims.

**Registration Flow:**

1. Mobile app calls `supabase.auth.signUp({ email, password, options: { data: { tenant_id: TENANT_ID, display_name } } })`.
2. The `tenant_id` is passed in `user_metadata` and copied to `raw_app_meta_data` via a database trigger.
3. A custom access token hook (`custom_access_token_hook`) injects `tenant_id` into every JWT issued for this user.
4. A trigger on `auth.users` INSERT creates a corresponding row in the `public.users` table with `tenant_id` and `auth_id`.

**Token Lifecycle:**

- Access token TTL: 1 hour (configurable in Supabase project settings).
- Refresh token TTL: 30 days.
- The Supabase client SDK automatically refreshes the access token when it is within 5 minutes of expiry.
- Refresh tokens are single-use (rotated on each refresh).

**Key Security Invariant:** The `tenant_id` in the JWT is derived from the user's database record, not from the client request. A user cannot change their tenant_id by manipulating request parameters. RLS policies use `auth.jwt()->>'tenant_id'` to scope queries, creating an unbreakable chain: user → JWT → tenant_id → RLS → data access.

### 5.5 Data Ownership (Silhouette Model)

In Silhouette, each tenant owns a **dedicated Supabase project**, which means:

| Resource            | Isolation Level | Details                                                                |
| ------------------- | --------------- | ---------------------------------------------------------------------- |
| PostgreSQL Database | Physical        | Separate database instance per tenant. Own connection pool.            |
| Supabase Auth       | Physical        | Separate auth service. Separate user table.                            |
| Edge Functions      | Logical         | Same function code deployed to each project. Tenant-specific env vars. |
| Object Storage      | Physical        | Separate storage buckets per tenant project.                           |
| Mux Environment     | Physical        | Dedicated Mux environment per tenant. Separate API keys.               |
| RevenueCat Project  | Physical        | Dedicated RevenueCat project per tenant. Separate products.            |

Even with physical isolation, the database schema still includes `tenant_id` on every table. This is defense-in-depth: if a Silhouette deployment is ever migrated to Hub, or if a configuration error points the wrong app at the wrong database, RLS prevents data leakage.

### 5.6 Platform Boundaries

```
┌─────────────────────────────────────────────────────────────┐
│                   CineDramas Silhouette                      │
│                   (What We Build & Own)                       │
│                                                              │
│  Catalog API ─── Progress API ─── Token Service              │
│  Auth Flow   ─── Config Service ── Webhook Handlers          │
│  Database Schema + RLS Policies + Migrations                 │
│  Mobile App (all screens, components, hooks)                 │
│  Brand Config System (manifests, themes)                     │
│  CI/CD Pipeline (EAS builds, edge function deploys)          │
│  Monitoring (Sentry config, logging, dashboards)             │
│                                                              │
├──────────────────────────┬──────────────────────────────────┤
│   Mux (Delegated)        │   RevenueCat (Delegated)         │
│                          │                                   │
│   Video upload/encode    │   Store integration               │
│   HLS streaming          │   Receipt validation              │
│   Multi-CDN delivery     │   Subscription lifecycle          │
│   Thumbnail generation   │   Trial management                │
│   DRM                    │   Regional pricing                │
│   QoE analytics          │   Webhook events                  │
└──────────────────────────┴──────────────────────────────────┘
```

### 5.7 How Silhouette Acts as the Foundation for Hub

Every design decision in Silhouette is made with Hub compatibility in mind:

| Silhouette Design Decision                                | Why It Enables Hub                                                            |
| --------------------------------------------------------- | ----------------------------------------------------------------------------- |
| `tenant_id` on every database row                         | Hub reuses the same schema; RLS policies work without modification            |
| JWT contains `tenant_id` claim                            | Hub uses the same JWT structure; only the tenant resolution mechanism differs |
| API endpoints accept no tenant parameter from client      | Hub doesn't need API changes; tenant is always from JWT                       |
| Edge functions extract tenant from JWT, not from env vars | Hub can run the same functions with RLS doing tenant filtering                |
| Brand config is a JSON structure, not code                | Hub serves multiple configs from one database; same API contract              |
| Database migrations are versioned SQL files               | Same migrations apply to Hub's shared database                                |
| Webhook handlers store events with tenant_id              | Hub's shared webhook endpoints can demultiplex by tenant                      |

The critical insight: Silhouette and Hub run the **same code**. The difference is infrastructure topology (dedicated vs shared) and tenant resolution (build-time vs runtime). The application logic, API contracts, and data model are identical.

---

## 6. Hub Architecture Expansion — Stage 2

### 6.1 Overview

The Hub is the multi-tenant expansion of CineDramas that enables multiple clients to share a single platform instance with strict logical isolation. It evolves from Silhouette by adding a **control plane** for tenant management and switching the application plane from dedicated to shared infrastructure.

The Hub enables:

- Faster tenant onboarding (hours instead of days — no infrastructure provisioning needed)
- Lower per-tenant cost (shared database, shared compute, shared monitoring)
- Centralized operations (one database to monitor, one set of edge functions to deploy)

### 6.2 Evolution from Silhouette to Hub

```
SILHOUETTE (Stage 1)                    HUB (Stage 2)
═══════════════════                     ═══════════════

┌──────────┐  ┌──────────┐             ┌──────────────────────────────┐
│ Client A │  │ Client B │             │       Control Plane           │
│ Supabase │  │ Supabase │             │ Tenant Registry + Routing    │
│ Project  │  │ Project  │             │ Build Automation + Secrets   │
└──────────┘  └──────────┘             └──────────┬───────────────────┘
      │              │                             │
      │              │                             ▼
┌──────────┐  ┌──────────┐             ┌──────────────────────────────┐
│ Client A │  │ Client B │             │   Shared Application Plane    │
│ Database │  │ Database │             │ One Supabase Project          │
│ (silo)   │  │ (silo)   │             │ One Database + RLS            │
└──────────┘  └──────────┘             │ One Edge Functions Deploy     │
                                        │ One Storage with Prefixes    │
      │              │                  │                              │
      │              │                  │ Tenants: A, B, C, D, ...     │
┌──────────┐  ┌──────────┐             └──────────────────────────────┘
│ App A    │  │ App B    │                          │
│(branded) │  │(branded) │             ┌──────────────────────────────┐
└──────────┘  └──────────┘             │      Hub Mobile App          │
                                        │ (or white-label apps using  │
                                        │  shared backend)             │
                                        └──────────────────────────────┘
```

**What changes from Silhouette to Hub:**

| Aspect            | Silhouette                            | Hub                                                    |
| ----------------- | ------------------------------------- | ------------------------------------------------------ |
| Database          | Dedicated Supabase project per tenant | Shared Supabase project, all tenants in one database   |
| Tenant Isolation  | Physical (separate DB)                | Logical (RLS on `tenant_id` column)                    |
| Mux Environment   | Dedicated per tenant                  | Shared; assets attributed by catalog DB                |
| RevenueCat        | Dedicated project per tenant          | Per-tenant API keys in shared config                   |
| Object Storage    | Dedicated buckets per tenant          | Shared bucket with `tenant/<tenant_id>/` prefixes      |
| Edge Functions    | Same code, deployed per project       | Same code, single deployment serving all tenants       |
| Mobile App        | One branded app per tenant            | One Hub app OR branded apps pointing to shared backend |
| Tenant Resolution | Build-time (`APP_VARIANT` → config)   | Runtime (JWT `tenant_id` claim → RLS)                  |
| Onboarding Time   | Days (provision infra)                | Hours (add tenant record + config)                     |
| Per-Tenant Cost   | Higher (dedicated resources)          | Lower (shared resources)                               |

**What does NOT change:**

- API surface (same endpoints, same contracts)
- JWT structure (same claims, same `tenant_id`)
- Database schema (same tables, same columns, same indexes)
- Mobile app codebase (same screens, components, hooks)
- RLS policies (same policies, but now the primary isolation mechanism)
- Edge function logic (same code, same middleware)

### 6.3 Control Plane Architecture

The control plane is a new layer added in Stage 2 that manages tenant lifecycle and cross-tenant operations.

```
┌─────────────────────────────────────────────────────────────────┐
│                      CONTROL PLANE                               │
│                                                                  │
│  ┌─────────────────┐  ┌─────────────────┐  ┌────────────────┐  │
│  │ Tenant Registry │  │ Build           │  │ Secrets        │  │
│  │                 │  │ Automation      │  │ Management     │  │
│  │ tenant_id       │  │                 │  │                │  │
│  │ name            │  │ EAS build       │  │ Mux keys       │  │
│  │ mode (hub/silo) │  │ profiles        │  │ RevenueCat     │  │
│  │ status          │  │ Brand manifest  │  │ keys           │  │
│  │ mux_env_key     │  │ validation      │  │ Webhook        │  │
│  │ revenuecat_key  │  │ CI/CD triggers  │  │ secrets        │  │
│  │ theme_config    │  │                 │  │                │  │
│  │ feature_flags   │  │                 │  │                │  │
│  └─────────────────┘  └─────────────────┘  └────────────────┘  │
│                                                                  │
│  ┌─────────────────┐  ┌─────────────────┐                       │
│  │ Tenant Routing  │  │ Operational     │                       │
│  │                 │  │ Visibility      │                       │
│  │ Hub vs Silo     │  │                 │                       │
│  │ resolution      │  │ Per-tenant      │                       │
│  │ Database target │  │ metrics         │                       │
│  │ selection       │  │ Cost tracking   │                       │
│  │                 │  │ Usage dashboards│                       │
│  └─────────────────┘  └─────────────────┘                       │
└─────────────────────────────────────────────────────────────────┘
```

**Tenant Registry Table (in Hub database):**

```sql
CREATE TABLE tenants (
  id              TEXT PRIMARY KEY,
  name            TEXT NOT NULL,
  mode            TEXT NOT NULL CHECK (mode IN ('hub', 'silo')),
  status          TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'onboarding')),
  mux_env_key     TEXT NOT NULL,
  mux_signing_key_id TEXT,
  mux_signing_private_key TEXT,
  revenuecat_api_key TEXT NOT NULL,
  revenuecat_webhook_secret TEXT,
  supabase_url    TEXT,          -- NULL for hub tenants (uses shared), populated for silo
  supabase_anon_key TEXT,        -- NULL for hub tenants
  theme_config    JSONB NOT NULL DEFAULT '{}',
  feature_flags   JSONB NOT NULL DEFAULT '{}',
  home_rails_order TEXT[] DEFAULT ARRAY['continue_watching', 'featured', 'categories'],
  legal_urls      JSONB NOT NULL DEFAULT '{}',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### 6.4 Service Orchestration in Hub

**Tenant Resolution Middleware:**

Every edge function in Hub begins with tenant resolution:

```typescript
async function resolveTenant(req: Request): Promise<TenantContext> {
  const jwt = extractJWT(req);
  const claims = verifyJWT(jwt);
  const tenantId = claims.tenant_id;

  // For hub tenants: tenant config is in the shared database
  // For silo tenants: tenant registry points to dedicated database
  const tenant = await getTenantFromRegistry(tenantId);

  if (tenant.status !== 'active') {
    throw new ForbiddenError('Tenant is suspended');
  }

  return {
    tenantId,
    userId: claims.sub,
    mode: tenant.mode,
    dbClient:
      tenant.mode === 'hub' ? sharedSupabaseClient : createClient(tenant.supabase_url, tenant.supabase_anon_key),
    muxConfig: { envKey: tenant.mux_env_key, signingKey: tenant.mux_signing_private_key },
  };
}
```

This middleware is the **only** code that differs between Silhouette and Hub. All downstream service logic operates on the `TenantContext` object — it does not know or care whether the database is shared or dedicated.

### 6.5 Modular Integrations and Tenant Onboarding

**Onboarding a New Hub Tenant (No Code Changes Required):**

1. Insert a row into the `tenants` table with the new tenant's configuration (name, Mux key, RevenueCat key, theme, features).
2. Create the tenant's content in the catalog tables (series, seasons, episodes) with the new `tenant_id`.
3. Configure the Mux environment (create signing keys, set up webhook if separate).
4. Configure RevenueCat project (create products, set webhook URL).
5. For branded apps: create a `brands/{tenantId}/` directory with manifest.json, icons, and theme. Run EAS Build.
6. For Hub app: the tenant is immediately accessible — users registering with this tenant_id see the new catalog.

**No edge function redeployment is needed.** No database migration is needed. The tenant registry and RLS-scoped tables handle everything.

### 6.6 Scaling Strategy (Hub)

| Bottleneck           | Strategy                                          | Implementation                                                        |
| -------------------- | ------------------------------------------------- | --------------------------------------------------------------------- |
| Catalog reads        | Edge caching with tenant-scoped cache keys        | Cloudflare Cache Rules: key = `{tenant_id}:{path}:{query}`            |
| Config reads         | Edge caching with long TTL                        | `Cache-Control: public, max-age=600, stale-while-revalidate=120`      |
| Progress writes      | Client debouncing + server rate limiting + UPSERT | 10s client interval, 6/min/user server limit, `ON CONFLICT DO UPDATE` |
| Token issuance       | Edge function (geo-distributed) + Redis caching   | Token cached per `(user_id, episode_id)` with TTL < token expiry      |
| Database connections | PgBouncer transaction-mode pooling                | Pool size tuned per Supabase plan. Serverless-compatible.             |
| Cold-start burst     | Persisted TanStack Query cache on client          | App renders from AsyncStorage cache; background refetch               |

**Growth Path Beyond 100,000 Concurrent:**

1. Enable Supabase read replicas for catalog queries (read-heavy).
2. Partition `watch_progress` table by tenant hash to reduce index contention.
3. Introduce write-behind buffering: edge function writes to Redis, a worker flushes to Postgres in batches.
4. Graduate high-traffic tenants from Hub to Silhouette (dedicated infra) — this is the bridge model in action.

### 6.7 How Silhouette Enables Hub

The entire Hub architecture works because Silhouette was designed with these invariants:

1. **`tenant_id` exists everywhere.** Even single-tenant Silhouette databases have `tenant_id` on every row. This means the same schema, same RLS policies, and same queries work in Hub without modification.

2. **Tenant context comes from JWT, not configuration.** Edge functions extract `tenant_id` from the authenticated user's JWT, not from environment variables or hardcoded config. This means the same function code serves any tenant.

3. **API contracts are tenant-agnostic.** No endpoint requires the client to specify a tenant. The tenant is implicit in the JWT. Hub and Silhouette apps call the same endpoints with the same parameters.

4. **Brand configuration is data, not code.** Theme, feature flags, and legal URLs are stored in the `tenants` table or `brands/` manifests, not in conditional code branches. Adding a tenant means adding data, not code.

5. **Infrastructure is parameterized.** Mux keys, RevenueCat keys, and Supabase credentials are passed via environment variables (Silhouette) or the tenant registry (Hub). The same edge function code uses whatever credentials are provided for the current tenant context.

---

## 7. Data Architecture

### 7.1 Entity Definitions

This section defines every core entity in the CineDramas data model, including all fields, data types, constraints, and ownership.

#### 7.1.1 tenants

The `tenants` table is the **control plane registry**. It stores configuration for every tenant, regardless of whether they use Hub (shared) or Silhouette (dedicated) infrastructure. In Silhouette deployments, this table exists in the control plane database but may also be mirrored locally for self-contained operation.

| Field                     | Type        | Constraints                                               | Description                                                                                         |
| ------------------------- | ----------- | --------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| id                        | TEXT        | PRIMARY KEY                                               | Unique tenant identifier (e.g., `client-a`, `studio-xyz`). Used as `tenant_id` in all other tables. |
| name                      | TEXT        | NOT NULL                                                  | Human-readable tenant display name (e.g., "Acme Studios")                                           |
| mode                      | TEXT        | NOT NULL, CHECK (`hub` or `silo`)                         | Deployment mode. `hub` = shared infrastructure. `silo` = dedicated Silhouette.                      |
| status                    | TEXT        | NOT NULL, DEFAULT `active`                                | Tenant lifecycle state: `onboarding`, `active`, `suspended`                                         |
| mux_env_key               | TEXT        | NOT NULL                                                  | Mux Data environment key for this tenant's video analytics                                          |
| mux_signing_key_id        | TEXT        | NULLABLE                                                  | Mux signing key ID for signed playback (NULL if using public playback only)                         |
| mux_signing_private_key   | TEXT        | NULLABLE                                                  | RS256 private key for generating signed Mux JWTs. Stored encrypted. Server-side only.               |
| revenuecat_api_key        | TEXT        | NOT NULL                                                  | RevenueCat public API key for this tenant's subscription products                                   |
| revenuecat_webhook_secret | TEXT        | NULLABLE                                                  | Shared secret for verifying RevenueCat webhook authenticity                                         |
| supabase_url              | TEXT        | NULLABLE                                                  | For silo tenants: URL of dedicated Supabase project. NULL for hub tenants.                          |
| supabase_anon_key         | TEXT        | NULLABLE                                                  | For silo tenants: anonymous key for dedicated Supabase project. NULL for hub.                       |
| theme_config              | JSONB       | NOT NULL, DEFAULT `{}`                                    | Runtime theme: `{ primary, secondary, background, text, accent, fontFamily }`                       |
| feature_flags             | JSONB       | NOT NULL, DEFAULT `{}`                                    | Feature toggles: `{ downloads_enabled, auth_required, ads_enabled, offline_mode }`                  |
| home_rails_order          | TEXT[]      | DEFAULT `['continue_watching', 'featured', 'categories']` | Ordered list of home screen rail types                                                              |
| legal_urls                | JSONB       | NOT NULL, DEFAULT `{}`                                    | Legal page URLs: `{ terms_of_service, privacy_policy, support }`                                    |
| firebase_project_id       | TEXT        | NULLABLE                                                  | Firebase project for push notifications (per tenant)                                                |
| created_at                | TIMESTAMPTZ | NOT NULL, DEFAULT `NOW()`                                 | Record creation timestamp                                                                           |
| updated_at                | TIMESTAMPTZ | NOT NULL, DEFAULT `NOW()`                                 | Last modification timestamp                                                                         |

**Owner:** Control Plane
**Lifecycle:** Created during tenant onboarding. Updated when configuration changes. Never deleted (set to `suspended`).

#### 7.1.2 series

| Field                 | Type        | Constraints                              | Description                                               |
| --------------------- | ----------- | ---------------------------------------- | --------------------------------------------------------- |
| id                    | UUID        | PRIMARY KEY, DEFAULT `gen_random_uuid()` | Unique series identifier                                  |
| tenant_id             | TEXT        | NOT NULL, REFERENCES tenants(id)         | Owning tenant                                             |
| title                 | TEXT        | NOT NULL                                 | Series display title                                      |
| description           | TEXT        | NULLABLE                                 | Series synopsis / description                             |
| thumbnail_playback_id | TEXT        | NULLABLE                                 | Mux playback ID for series thumbnail image                |
| category              | TEXT        | NOT NULL                                 | Content category (e.g., `drama`, `comedy`, `documentary`) |
| tags                  | TEXT[]      | DEFAULT `{}`                             | Searchable tags for discovery                             |
| is_featured           | BOOLEAN     | NOT NULL, DEFAULT `false`                | Whether to show in featured rail                          |
| sort_order            | INTEGER     | NOT NULL, DEFAULT `0`                    | Display ordering within category                          |
| status                | TEXT        | NOT NULL, DEFAULT `draft`                | Content lifecycle: `draft`, `published`, `archived`       |
| created_at            | TIMESTAMPTZ | NOT NULL, DEFAULT `NOW()`                | Record creation timestamp                                 |
| updated_at            | TIMESTAMPTZ | NOT NULL, DEFAULT `NOW()`                | Last modification timestamp                               |

**Owner:** Catalog Service
**Lifecycle:** Created by admin when onboarding content. Published when ready for users. Archived when removed from catalog.

#### 7.1.3 seasons

| Field      | Type        | Constraints                                       | Description                                       |
| ---------- | ----------- | ------------------------------------------------- | ------------------------------------------------- |
| id         | UUID        | PRIMARY KEY, DEFAULT `gen_random_uuid()`          | Unique season identifier                          |
| tenant_id  | TEXT        | NOT NULL, REFERENCES tenants(id)                  | Owning tenant                                     |
| series_id  | UUID        | NOT NULL, REFERENCES series(id) ON DELETE CASCADE | Parent series                                     |
| number     | INTEGER     | NOT NULL                                          | Season number (1, 2, 3, ...)                      |
| title      | TEXT        | NULLABLE                                          | Optional season title (e.g., "Season 1: Origins") |
| created_at | TIMESTAMPTZ | NOT NULL, DEFAULT `NOW()`                         | Record creation timestamp                         |

**Owner:** Catalog Service
**Lifecycle:** Created when series content is organized into seasons.
**Unique Constraint:** `(tenant_id, series_id, number)` — no duplicate season numbers within a series.

#### 7.1.4 episodes

| Field            | Type        | Constraints                                        | Description                                                        |
| ---------------- | ----------- | -------------------------------------------------- | ------------------------------------------------------------------ |
| id               | UUID        | PRIMARY KEY, DEFAULT `gen_random_uuid()`           | Unique episode identifier                                          |
| tenant_id        | TEXT        | NOT NULL, REFERENCES tenants(id)                   | Owning tenant                                                      |
| season_id        | UUID        | NOT NULL, REFERENCES seasons(id) ON DELETE CASCADE | Parent season                                                      |
| title            | TEXT        | NOT NULL                                           | Episode display title                                              |
| description      | TEXT        | NULLABLE                                           | Episode synopsis                                                   |
| mux_playback_id  | TEXT        | NULLABLE                                           | Mux playback ID for streaming. NULL until asset is ready.          |
| mux_asset_id     | TEXT        | NULLABLE                                           | Mux asset ID for tracking upload/encoding status                   |
| mux_asset_status | TEXT        | NOT NULL, DEFAULT `pending`                        | Asset processing state: `pending`, `preparing`, `ready`, `errored` |
| duration_seconds | INTEGER     | NULLABLE                                           | Episode duration in seconds. Populated from Mux webhook.           |
| order            | INTEGER     | NOT NULL                                           | Episode order within season (1, 2, 3, ...)                         |
| is_free          | BOOLEAN     | NOT NULL, DEFAULT `false`                          | If true, episode is available without subscription                 |
| subtitle_url     | TEXT        | NULLABLE                                           | URL to .vtt subtitle file (hosted on Mux or Supabase Storage)      |
| thumbnail_time   | FLOAT       | DEFAULT `0`                                        | Time offset (seconds) for Mux auto-generated thumbnail             |
| created_at       | TIMESTAMPTZ | NOT NULL, DEFAULT `NOW()`                          | Record creation timestamp                                          |
| updated_at       | TIMESTAMPTZ | NOT NULL, DEFAULT `NOW()`                          | Last modification timestamp                                        |

**Owner:** Catalog Service (metadata), Mux Webhook Handler (asset status, playback ID, duration)
**Lifecycle:** Created by admin with `mux_asset_id`. Status updated to `ready` by Mux webhook when encoding completes. `mux_playback_id` populated from webhook payload.

#### 7.1.5 users

| Field        | Type        | Constraints                              | Description                                      |
| ------------ | ----------- | ---------------------------------------- | ------------------------------------------------ |
| id           | UUID        | PRIMARY KEY, DEFAULT `gen_random_uuid()` | Application user identifier                      |
| tenant_id    | TEXT        | NOT NULL, REFERENCES tenants(id)         | Owning tenant                                    |
| auth_id      | UUID        | NOT NULL, UNIQUE                         | Supabase Auth user ID (references auth.users.id) |
| email        | TEXT        | NOT NULL                                 | User email address                               |
| display_name | TEXT        | NULLABLE                                 | User display name                                |
| avatar_url   | TEXT        | NULLABLE                                 | Profile image URL                                |
| created_at   | TIMESTAMPTZ | NOT NULL, DEFAULT `NOW()`                | Record creation timestamp                        |
| updated_at   | TIMESTAMPTZ | NOT NULL, DEFAULT `NOW()`                | Last modification timestamp                      |

**Owner:** Auth Service
**Lifecycle:** Created automatically by database trigger when a new auth.users row is inserted. Updated when user modifies profile.

#### 7.1.6 watch_progress

| Field            | Type        | Constraints                                         | Description                              |
| ---------------- | ----------- | --------------------------------------------------- | ---------------------------------------- |
| id               | UUID        | PRIMARY KEY, DEFAULT `gen_random_uuid()`            | Record identifier                        |
| tenant_id        | TEXT        | NOT NULL, REFERENCES tenants(id)                    | Owning tenant                            |
| user_id          | UUID        | NOT NULL, REFERENCES users(id) ON DELETE CASCADE    | User who watched                         |
| episode_id       | UUID        | NOT NULL, REFERENCES episodes(id) ON DELETE CASCADE | Episode being watched                    |
| position_seconds | INTEGER     | NOT NULL, DEFAULT `0`                               | Current playback position in seconds     |
| completed        | BOOLEAN     | NOT NULL, DEFAULT `false`                           | True when user watched >= 90% of episode |
| updated_at       | TIMESTAMPTZ | NOT NULL, DEFAULT `NOW()`                           | Last progress update timestamp           |

**Owner:** Progress Service
**Lifecycle:** Created on first progress write for a user+episode pair. Updated via UPSERT on subsequent writes. The `updated_at` field is critical for the "continue watching" query (ORDER BY updated_at DESC).
**Unique Constraint:** `(tenant_id, user_id, episode_id)` — one progress record per user per episode per tenant.

#### 7.1.7 entitlements

| Field                    | Type        | Constraints                                      | Description                                            |
| ------------------------ | ----------- | ------------------------------------------------ | ------------------------------------------------------ |
| id                       | UUID        | PRIMARY KEY, DEFAULT `gen_random_uuid()`         | Record identifier                                      |
| tenant_id                | TEXT        | NOT NULL, REFERENCES tenants(id)                 | Owning tenant                                          |
| user_id                  | UUID        | NOT NULL, REFERENCES users(id) ON DELETE CASCADE | Subscribing user                                       |
| tier                     | TEXT        | NOT NULL, DEFAULT `free`                         | Subscription tier: `free`, `premium`, `vip`            |
| expires_at               | TIMESTAMPTZ | NULLABLE                                         | When the current entitlement expires. NULL = lifetime. |
| revenuecat_subscriber_id | TEXT        | NULLABLE                                         | RevenueCat subscriber ID for cross-referencing         |
| store_product_id         | TEXT        | NULLABLE                                         | App Store / Play Store product identifier              |
| created_at               | TIMESTAMPTZ | NOT NULL, DEFAULT `NOW()`                        | Record creation timestamp                              |
| updated_at               | TIMESTAMPTZ | NOT NULL, DEFAULT `NOW()`                        | Last modification timestamp                            |

**Owner:** RevenueCat Webhook Handler
**Lifecycle:** Created on first purchase. Updated by RevenueCat webhooks on renewal, cancellation, or expiration. The Playback Token Service reads this table to gate access.
**Unique Constraint:** `(tenant_id, user_id)` — one entitlement record per user per tenant.

#### 7.1.8 webhook_events

| Field           | Type        | Constraints                              | Description                                                 |
| --------------- | ----------- | ---------------------------------------- | ----------------------------------------------------------- |
| id              | UUID        | PRIMARY KEY, DEFAULT `gen_random_uuid()` | Record identifier                                           |
| tenant_id       | TEXT        | NOT NULL                                 | Owning tenant (extracted from event payload or mapping)     |
| source          | TEXT        | NOT NULL                                 | Event source: `mux`, `revenuecat`                           |
| event_type      | TEXT        | NOT NULL                                 | Event type (e.g., `video.asset.ready`, `initial_purchase`)  |
| payload         | JSONB       | NOT NULL                                 | Raw webhook payload (for debugging and replay)              |
| idempotency_key | TEXT        | NOT NULL, UNIQUE                         | Event ID from source system. Prevents duplicate processing. |
| processed_at    | TIMESTAMPTZ | NULLABLE                                 | When the event was successfully processed. NULL = pending.  |
| error_message   | TEXT        | NULLABLE                                 | Error details if processing failed                          |
| created_at      | TIMESTAMPTZ | NOT NULL, DEFAULT `NOW()`                | When the webhook was received                               |

**Owner:** Webhook Handlers (Mux + RevenueCat)
**Lifecycle:** Inserted on webhook receipt. `processed_at` set after successful processing. Old events can be archived after 90 days.

### 7.2 Entity Relationships

```
tenants (1) ──────< (many) series
tenants (1) ──────< (many) users
tenants (1) ──────< (many) webhook_events

series  (1) ──────< (many) seasons
seasons (1) ──────< (many) episodes

users   (1) ──────< (many) watch_progress
episodes(1) ──────< (many) watch_progress

users   (1) ──────< (1)    entitlements
```

**Relationship Details:**

- **tenants → series:** One tenant has many series. Every series belongs to exactly one tenant. RLS ensures queries return only the authenticated tenant's series.
- **series → seasons → episodes:** Hierarchical content structure. Deleting a series cascades to seasons, which cascades to episodes.
- **users → watch_progress:** One user has many progress records (one per episode). Deleting a user cascades to their progress records.
- **episodes → watch_progress:** One episode has many progress records (one per user). Deleting an episode cascades to progress records.
- **users → entitlements:** One user has at most one entitlement record per tenant (unique constraint). This simplifies entitlement checks to a single row lookup.
- **tenants → webhook_events:** Events are associated with tenants for audit and debugging. Multiple events per tenant.

### 7.3 Service Ownership of Data

| Table          | Primary Writer               | Primary Reader                               | Notes                                                                  |
| -------------- | ---------------------------- | -------------------------------------------- | ---------------------------------------------------------------------- |
| tenants        | Admin / Control Plane        | Config Service, Tenant Resolution Middleware | Written during onboarding. Read on every request (cached).             |
| series         | Admin Dashboard              | Catalog Service                              | Written by content managers. Read by home/search/detail screens.       |
| seasons        | Admin Dashboard              | Catalog Service                              | Written alongside series management.                                   |
| episodes       | Admin Dashboard, Mux Webhook | Catalog Service, Playback Token Service      | Admin creates records. Mux webhook updates status/playback ID.         |
| users          | Auth Trigger                 | Progress Service, Entitlements Service       | Auto-created on registration. Referenced by progress and entitlements. |
| watch_progress | Progress Service             | Catalog Service (continue watching)          | Written during playback. Read for home screen rail.                    |
| entitlements   | RevenueCat Webhook           | Playback Token Service                       | Written by webhook. Read before issuing playback tokens.               |
| webhook_events | Mux/RevenueCat Webhooks      | Admin Dashboard (debugging)                  | Write-heavy audit log. Read for debugging and replay.                  |

---

## 8. Database Design

### 8.1 Database Choice and Rationale

**PostgreSQL via Supabase** is the single database technology for CineDramas.

**Why PostgreSQL:**

- **Row-Level Security (RLS):** PostgreSQL is the only major RDBMS (Relational Database Management System) with native, declarative row-level security policies. This is the foundation of tenant isolation in the Hub model. RLS policies are enforced by the database engine itself — even direct SQL access (e.g., via Supabase Studio) respects RLS for non-superuser roles.
- **UPSERT:** PostgreSQL's `INSERT ... ON CONFLICT DO UPDATE` provides atomic, concurrency-safe upsert semantics. This is critical for the watch progress write path where thousands of concurrent users may update their progress simultaneously.
- **JSONB:** Native JSON storage and querying for semi-structured data (theme_config, feature_flags, webhook payloads). Supports indexing with GIN (Generalized Inverted Index) indexes for efficient querying.
- **Full-Text Search:** PostgreSQL's `tsvector` and `tsquery` provide built-in full-text search for the catalog search endpoint, eliminating the need for a separate search service (like Elasticsearch) at MVP scale.
- **Supabase Integration:** Supabase's Edge Functions, Auth, and Storage all integrate natively with the PostgreSQL database, allowing RLS policies to apply uniformly across all access paths.

**Why NOT a separate database per service (microservice pattern):**
At CineDramas's current scale (< 10 services, single team), a shared database is simpler to operate, migrate, and reason about. The API surface is thin enough that service boundaries are enforced at the edge function level, not the database level. If a service needs to be extracted later, the well-defined table ownership (Section 7.3) makes this possible without refactoring.

### 8.2 Schema Organization

All CineDramas application tables live in the `public` schema. Supabase Auth tables live in the `auth` schema (managed by Supabase). Supabase Storage tables live in the `storage` schema (managed by Supabase).

```
public schema:
  tenants
  series
  seasons
  episodes
  users
  watch_progress
  entitlements
  webhook_events

auth schema (Supabase-managed):
  auth.users
  auth.sessions
  auth.refresh_tokens

storage schema (Supabase-managed):
  storage.buckets
  storage.objects
```

### 8.3 Row-Level Security (RLS) Policies

RLS must be enabled on **every** tenant-scoped table. PostgreSQL defaults to "deny all" when RLS is enabled but no policy applies — this is a safe default.

**Core RLS Policy Pattern (applied to series, seasons, episodes, watch_progress, entitlements, webhook_events):**

```sql
-- Enable RLS
ALTER TABLE series ENABLE ROW LEVEL SECURITY;

-- SELECT: users can only read their tenant's data
CREATE POLICY "tenant_isolation_select" ON series
  FOR SELECT
  USING (tenant_id = (auth.jwt()->>'tenant_id'));

-- INSERT: users can only insert into their tenant
CREATE POLICY "tenant_isolation_insert" ON series
  FOR INSERT
  WITH CHECK (tenant_id = (auth.jwt()->>'tenant_id'));

-- UPDATE: users can only update their tenant's data
CREATE POLICY "tenant_isolation_update" ON series
  FOR UPDATE
  USING (tenant_id = (auth.jwt()->>'tenant_id'))
  WITH CHECK (tenant_id = (auth.jwt()->>'tenant_id'));

-- DELETE: users can only delete their tenant's data
CREATE POLICY "tenant_isolation_delete" ON series
  FOR DELETE
  USING (tenant_id = (auth.jwt()->>'tenant_id'));
```

**User-Scoped Policies (for watch_progress and entitlements):**

```sql
-- watch_progress: users can only read/write their own progress
CREATE POLICY "user_progress_select" ON watch_progress
  FOR SELECT
  USING (
    tenant_id = (auth.jwt()->>'tenant_id')
    AND user_id = (SELECT id FROM users WHERE auth_id = auth.uid())
  );

CREATE POLICY "user_progress_upsert" ON watch_progress
  FOR INSERT
  WITH CHECK (
    tenant_id = (auth.jwt()->>'tenant_id')
    AND user_id = (SELECT id FROM users WHERE auth_id = auth.uid())
  );

CREATE POLICY "user_progress_update" ON watch_progress
  FOR UPDATE
  USING (
    tenant_id = (auth.jwt()->>'tenant_id')
    AND user_id = (SELECT id FROM users WHERE auth_id = auth.uid())
  )
  WITH CHECK (
    tenant_id = (auth.jwt()->>'tenant_id')
    AND user_id = (SELECT id FROM users WHERE auth_id = auth.uid())
  );
```

**Service Role Bypass:** Edge functions that need to write across tenant boundaries (e.g., webhook handlers processing events for specific tenants) use the Supabase `service_role` key, which bypasses RLS. The service role key is stored server-side only and never exposed to clients.

### 8.4 Indexing Strategy

Indexes are designed around the most frequent query patterns identified in the API surface.

| Table          | Index                            | Columns                                                                 | Purpose                                       |
| -------------- | -------------------------------- | ----------------------------------------------------------------------- | --------------------------------------------- | --- | --- | ------------------------- | --- | --- | --- | ---------------------------- | ---------------- |
| series         | `idx_series_tenant`              | `(tenant_id)`                                                           | Base tenant-scoped catalog query filtering    |
| series         | `idx_series_tenant_category`     | `(tenant_id, category)`                                                 | Category-filtered catalog listing             |
| series         | `idx_series_tenant_featured`     | `(tenant_id, is_featured) WHERE is_featured = true`                     | Featured rail query (partial index)           |
| series         | `idx_series_search`              | GIN index on `to_tsvector('english', title                              |                                               | ' ' |     | COALESCE(description, '') |     | ' ' |     | array_to_string(tags, ' '))` | Full-text search |
| seasons        | `idx_seasons_series`             | `(tenant_id, series_id, number)`                                        | Season listing for a series                   |
| episodes       | `idx_episodes_season_order`      | `(tenant_id, season_id, order)`                                         | Episode listing within a season               |
| episodes       | `idx_episodes_mux_asset`         | `(mux_asset_id) WHERE mux_asset_id IS NOT NULL`                         | Mux webhook lookup by asset ID                |
| watch_progress | `idx_progress_continue_watching` | `(tenant_id, user_id, updated_at DESC)`                                 | "Continue watching" rail query                |
| watch_progress | `idx_progress_upsert`            | `UNIQUE (tenant_id, user_id, episode_id)`                               | UPSERT conflict target                        |
| entitlements   | `idx_entitlements_user`          | `UNIQUE (tenant_id, user_id)`                                           | Single-row entitlement lookup                 |
| entitlements   | `idx_entitlements_revenuecat`    | `(revenuecat_subscriber_id) WHERE revenuecat_subscriber_id IS NOT NULL` | RevenueCat webhook subscriber lookup          |
| webhook_events | `idx_webhook_idempotency`        | `UNIQUE (idempotency_key)`                                              | Duplicate webhook detection                   |
| webhook_events | `idx_webhook_tenant_created`     | `(tenant_id, created_at DESC)`                                          | Admin dashboard: recent events per tenant     |
| users          | `idx_users_auth_id`              | `UNIQUE (auth_id)`                                                      | Auth trigger: lookup by Supabase Auth user ID |
| users          | `idx_users_tenant`               | `(tenant_id)`                                                           | Tenant-scoped user listing                    |

### 8.5 Migrations Strategy

Database schema changes are managed through **versioned SQL migration files** using the Supabase CLI.

**Migration File Structure:**

```
supabase/
  migrations/
    20260301000000_create_tenants.sql
    20260301000001_create_series.sql
    20260301000002_create_seasons.sql
    20260301000003_create_episodes.sql
    20260301000004_create_users.sql
    20260301000005_create_watch_progress.sql
    20260301000006_create_entitlements.sql
    20260301000007_create_webhook_events.sql
    20260301000008_create_rls_policies.sql
    20260301000009_create_indexes.sql
    20260301000010_create_functions.sql
    20260301000011_create_triggers.sql
  seed.sql
```

**Migration Rules:**

- Every migration is an idempotent SQL file (uses `CREATE TABLE IF NOT EXISTS`, `CREATE INDEX IF NOT EXISTS`, etc.).
- Migrations are applied in timestamp order by the Supabase CLI (`supabase db push` for dev, `supabase db migrate` for staging/prod).
- Destructive changes (dropping columns, changing types) require a two-step migration: (1) add the new structure alongside the old, (2) migrate data, (3) remove the old structure in a subsequent release.
- RLS policies are defined in their own migration file to make them auditable and reviewable.

**Applying Migrations:**

- **Dev:** `supabase db reset` drops and recreates from all migrations + seed data.
- **Staging/Prod:** `supabase db push` applies only unapplied migrations.
- **CI:** Automated check that migrations apply cleanly to a fresh database.

### 8.6 Performance Considerations

**Connection Pooling:**
Supabase uses PgBouncer in **transaction mode** for connection pooling. In transaction mode, a database connection is assigned to an edge function invocation only for the duration of a transaction, then returned to the pool. This allows thousands of concurrent edge function invocations to share a pool of ~100-200 database connections.

Configuration:

- Use the pooled connection string (port 6543) for edge functions.
- Use the direct connection string (port 5432) for migrations and admin operations.
- Pool size is determined by the Supabase plan (Pro plan: ~150 connections).

**Write Performance (Watch Progress):**
The `watch_progress` UPSERT is the highest-volume write operation. Performance is ensured by:

1. Client-side debouncing (10-second intervals, not per-frame).
2. Server-side rate limiting (6 writes/min/user).
3. UPSERT uses the `(tenant_id, user_id, episode_id)` unique index as the conflict target — this is an index-only operation (no table scan).
4. The `updated_at` column update is lightweight (single column change on an existing row).

**Read Performance (Catalog):**
Catalog queries benefit from:

1. Edge caching (5-minute TTL) — most reads never hit the database.
2. Indexes on `(tenant_id)` and `(tenant_id, category)` for filtered queries.
3. Partial index on `(tenant_id, is_featured) WHERE is_featured = true` — the featured rail query hits a tiny index.
4. TanStack Query client-side caching — repeat views serve from memory.

**Estimated Database Load at 100,000 Concurrent Users:**

- Catalog reads: ~500/min at origin (99% served from CDN cache).
- Progress writes: ~50,000/min (after client debounce + server rate limit: ~17,000/min actual DB writes).
- Token issuance: ~5,000/min at origin (after Redis cache: ~1,000/min actual DB reads for entitlement check).
- Config reads: ~100/min at origin (99.9% served from CDN cache).

---

## 9. Infrastructure Architecture

### 9.1 Hosting Architecture

| Component                                  | Hosting Provider                   | Justification                                                                 |
| ------------------------------------------ | ---------------------------------- | ----------------------------------------------------------------------------- |
| Database + Auth + Edge Functions + Storage | Supabase (cloud-hosted)            | Integrated BaaS; RLS, Auth, and Edge Functions work seamlessly together       |
| CDN + WAF + DNS                            | Cloudflare (Pro plan or higher)    | Global edge caching, DDoS protection, cache rules for JSON responses          |
| Mobile App Builds                          | EAS Build (Expo cloud)             | Cloud-based iOS and Android compilation with build profiles per brand variant |
| OTA Updates                                | EAS Update (Expo cloud)            | Push JS bundle updates without store review, scoped per release channel       |
| Rate Limiting / Token Cache                | Upstash Redis (serverless)         | Edge-compatible Redis for rate limiting and playback token caching            |
| Crash Reporting + Performance              | Sentry (cloud-hosted)              | Source-mapped crash reports and performance traces with tenant tagging        |
| Video Infrastructure                       | Mux (cloud-hosted)                 | End-to-end video pipeline: ingest, encode, store, stream, analytics           |
| Subscription Billing                       | RevenueCat (cloud-hosted)          | Cross-platform subscription management with webhook events                    |
| Source Control                             | GitHub                             | Repository hosting, CI/CD via GitHub Actions, branch protection               |
| CI/CD (Backend)                            | GitHub Actions                     | Run tests, validate brand manifests, deploy edge functions                    |
| CI/CD (Mobile)                             | EAS Build + GitHub Actions trigger | Matrix builds for all brand variants, triggered by CI                         |

### 9.2 Environments

| Environment | Purpose                                       | Supabase Project                                           | Mux Environment         | Cloudflare        | Data                |
| ----------- | --------------------------------------------- | ---------------------------------------------------------- | ----------------------- | ----------------- | ------------------- |
| Development | Local development and feature testing         | `cinedramas-dev`                                           | Test environment        | N/A (local)       | Seed data           |
| Staging     | Pre-production testing, QA, stakeholder demos | `cinedramas-staging`                                       | Test environment        | Staging subdomain | Synthetic test data |
| Production  | Live user traffic                             | `cinedramas-prod` (Hub) + per-tenant projects (Silhouette) | Production environments | Production domain | Real user data      |

**Environment Variable Management:**

Each environment has its own set of secrets and configuration. These are stored in:

- **Supabase:** Project-level environment variables (for edge functions).
- **EAS:** EAS Secrets (for mobile build-time variables).
- **GitHub Actions:** Repository secrets (for CI/CD workflows).
- **Cloudflare:** Environment variables (for edge Workers, if used).

**Environment Variable Template (`.env.example`):**

```bash
# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
SUPABASE_JWT_SECRET=your-jwt-secret

# Mux
MUX_TOKEN_ID=your-mux-token-id
MUX_TOKEN_SECRET=your-mux-token-secret
MUX_SIGNING_KEY_ID=your-signing-key-id
MUX_SIGNING_PRIVATE_KEY=your-signing-private-key
MUX_WEBHOOK_SECRET=your-mux-webhook-secret

# RevenueCat
REVENUECAT_API_KEY=your-public-api-key
REVENUECAT_WEBHOOK_SECRET=your-webhook-secret

# Sentry
SENTRY_DSN=https://your-dsn@sentry.io/project-id

# App
APP_VARIANT=default
```

### 9.3 Deployment Architecture

#### Backend Deployment (Edge Functions)

```
Developer pushes to GitHub
         │
         ▼
GitHub Actions CI Pipeline
  ├─ Run TypeScript type check
  ├─ Run unit tests (Vitest)
  ├─ Run RLS isolation tests
  ├─ Validate brand manifests
  │
  ├─ On merge to 'main':
  │    └─ Deploy edge functions to STAGING
  │         └─ supabase functions deploy --project-ref staging-ref
  │
  └─ On release tag (v*):
       └─ Deploy edge functions to PRODUCTION (manual approval)
            └─ supabase functions deploy --project-ref prod-ref
```

#### Mobile Deployment

```
Developer pushes to GitHub
         │
         ▼
GitHub Actions CI Pipeline
  ├─ Run TypeScript type check
  ├─ Run unit tests
  ├─ Run component tests (RNTL)
  │
  ├─ On merge to 'main':
  │    └─ EAS Update (OTA) to STAGING channel
  │         └─ eas update --channel staging
  │
  └─ On release tag (v*):
       ├─ EAS Build matrix (all brand variants):
       │    for variant in clientA clientB hub; do
       │      APP_VARIANT=$variant eas build --platform all --profile production
       │    done
       │
       └─ EAS Submit (to App Store / Google Play):
            for variant in clientA clientB hub; do
              APP_VARIANT=$variant eas submit --platform all
            done
```

#### Database Migrations

```
Developer creates migration
         │
         ▼
Local: supabase db reset (applies all migrations + seed)
         │
         ▼
PR Review: migration SQL reviewed by team
         │
         ▼
On merge to 'main':
  └─ GitHub Actions: supabase db push --project-ref staging-ref
         │
         ▼
On release tag:
  └─ GitHub Actions: supabase db push --project-ref prod-ref
       (with manual approval gate)
```

### 9.4 Secrets Management

| Secret                      | Storage Location                                   | Access Scope                   | Rotation Strategy                                               |
| --------------------------- | -------------------------------------------------- | ------------------------------ | --------------------------------------------------------------- |
| Supabase JWT Secret         | Supabase project settings                          | Edge functions (auto-injected) | Rotate via Supabase dashboard; update all mobile builds         |
| Supabase Service Role Key   | Supabase project settings + GitHub Actions secrets | Edge functions, CI/CD          | Rotate via Supabase; update GitHub Actions secrets              |
| Mux API Token (ID + Secret) | Supabase Edge Function env vars                    | Edge functions                 | Rotate via Mux dashboard; update Supabase env vars              |
| Mux Signing Private Key     | Supabase Edge Function env vars                    | Playback Token Service         | Rotate via Mux API (create new key, phase out old)              |
| Mux Webhook Secret          | Supabase Edge Function env vars                    | Mux Webhook Handler            | Rotate via Mux dashboard; update Supabase env vars              |
| RevenueCat Webhook Secret   | Supabase Edge Function env vars                    | RevenueCat Webhook Handler     | Rotate via RevenueCat dashboard; update Supabase env vars       |
| Sentry DSN                  | Mobile app build config (public)                   | Mobile app                     | Not secret (DSN is public); project-level protection via Sentry |
| EAS Secrets (per variant)   | EAS Secret Store                                   | EAS Build                      | Managed via `eas secret:push`; scoped per project               |

**Key Security Rules:**

1. No secret is ever committed to the repository. `.env` files are in `.gitignore`.
2. The Mux signing private key (used to generate signed playback JWTs) exists only in server-side environment variables. It is never included in mobile builds.
3. The Supabase service role key bypasses RLS. It is used only by webhook handlers and admin operations, never by client-facing APIs.
4. All webhook secrets are used for HMAC verification — they prove the webhook came from the expected source.

### 9.5 Monitoring and Observability

#### Monitoring Stack

| Layer                    | Tool                                | What It Monitors                                                    |
| ------------------------ | ----------------------------------- | ------------------------------------------------------------------- |
| Mobile App (Crashes)     | Sentry                              | Unhandled JS exceptions, native crashes, source-mapped stack traces |
| Mobile App (Performance) | Sentry Performance                  | Screen load times, API call durations, slow frames                  |
| Video Playback (QoE)     | Mux Data                            | Startup time, rebuffering ratio, playback failure rate, engagement  |
| API (Latency + Errors)   | Supabase Dashboard + Custom Logging | Request latency (p50/p95/p99), error rates, slow queries            |
| Database                 | Supabase Dashboard                  | Connection pool usage, slow queries, table sizes, index usage       |
| Edge Caching             | Cloudflare Analytics                | Cache hit ratio, bandwidth saved, origin requests                   |
| Infrastructure           | Upstash Dashboard                   | Redis operations, memory usage, rate limit hits                     |

#### Structured Logging Standard

Every API log entry must contain these fields:

```json
{
  "timestamp": "2026-03-16T12:00:00.000Z",
  "level": "info",
  "tenant_id": "client-a",
  "user_id": "user-uuid",
  "request_id": "req-uuid",
  "endpoint": "GET /catalog/series",
  "method": "GET",
  "status_code": 200,
  "latency_ms": 45,
  "cache_status": "MISS",
  "error": null
}
```

This enables:

- **Tenant-level debugging:** Filter logs by `tenant_id` to investigate "why is Client B's catalog slow?"
- **User-level tracing:** Filter by `user_id` to reproduce a specific user's issue.
- **Endpoint performance analysis:** Aggregate by `endpoint` to find slow APIs.
- **Cache effectiveness:** Track `cache_status` to verify CDN is working.

#### Alerting Rules

| Alert                          | Condition                       | Channel           | Severity |
| ------------------------------ | ------------------------------- | ----------------- | -------- |
| High API Error Rate            | 5xx rate > 1% for 5 minutes     | Slack + PagerDuty | Critical |
| Elevated Latency               | p95 latency > 2s for 10 minutes | Slack             | Warning  |
| Database Connection Saturation | Pool usage > 80% for 5 minutes  | Slack + PagerDuty | Critical |
| Webhook Processing Failure     | > 10 failed webhooks in 1 hour  | Slack             | Warning  |
| Mux Playback Failure Rate      | > 0.5% failure rate (Mux Data)  | Slack             | Warning  |
| Sentry Error Spike             | > 50 new errors in 15 minutes   | Slack             | Warning  |
| Cache Hit Ratio Drop           | CDN cache hit ratio < 80%       | Slack             | Info     |

---

## 10. Development Environment Setup

This section provides step-by-step instructions for setting up the complete CineDramas development environment from scratch. Follow these instructions in order — later steps depend on earlier ones.

### 10.1 Prerequisites

Install the following tools before proceeding:

| Tool           | Version                   | Installation                                                |
| -------------- | ------------------------- | ----------------------------------------------------------- |
| Node.js        | v20 LTS or later          | https://nodejs.org/ (use the LTS installer)                 |
| npm            | v10+ (comes with Node.js) | Included with Node.js                                       |
| Git            | Latest                    | https://git-scm.com/                                        |
| Supabase CLI   | Latest                    | `npm install -g supabase`                                   |
| EAS CLI        | Latest                    | `npm install -g eas-cli`                                    |
| Expo CLI       | Latest (via npx)          | No global install needed; use `npx expo`                    |
| Android Studio | Latest stable             | https://developer.android.com/studio (for Android emulator) |
| Xcode          | 15+ (macOS only)          | Mac App Store (for iOS simulator)                           |
| VS Code        | Latest                    | https://code.visualstudio.com/ (recommended IDE)            |

### 10.2 Repository Setup

**Step 1: Create the repository**

```bash
mkdir cinedramas-app
cd cinedramas-app
git init
```

**Step 2: Initialize the Expo project**

```bash
npx create-expo-app@latest . --template blank-typescript
```

**Step 3: Install core dependencies**

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

**Step 4: Install dev dependencies**

```bash
npm install -D typescript @types/react eslint prettier
npm install -D eslint-config-expo
npm install -D vitest @testing-library/react-native
npm install -D @testing-library/jest-native
```

**Step 5: Configure TypeScript**
Create `tsconfig.json`:

```json
{
  "extends": "expo/tsconfig.base",
  "compilerOptions": {
    "strict": true,
    "paths": {
      "@/*": ["./*"]
    }
  },
  "include": ["**/*.ts", "**/*.tsx", ".expo/types/**/*.ts", "expo-env.d.ts"]
}
```

**Step 6: Configure ESLint**
Create `.eslintrc.js`:

```javascript
module.exports = {
  extends: ['expo', 'prettier'],
  rules: {
    'no-console': 'warn',
  },
};
```

**Step 7: Configure Prettier**
Create `.prettierrc`:

```json
{
  "singleQuote": true,
  "trailingComma": "all",
  "tabWidth": 2,
  "semi": true,
  "printWidth": 100
}
```

**Step 8: Create directory structure**

```bash
mkdir -p app/(tabs) app/series app/player app/auth
mkdir -p components/video components/series components/home components/paywall components/ui
mkdir -p hooks stores services
mkdir -p brands/default
mkdir -p theme utils
mkdir -p supabase/migrations supabase/functions
mkdir -p scripts
```

**Step 9: Create .gitignore**

```
node_modules/
.expo/
dist/
*.jks
*.p8
*.p12
*.key
*.mobileprovision
*.orig.*
web-build/
.env
.env.local
.env.*.local
```

**Step 10: Initial commit**

```bash
git add .
git commit -m "Initial Expo project setup with CineDramas dependencies"
```

### 10.3 Supabase Setup

**Step 1: Create Supabase account**

1. Go to https://supabase.com and create an account.
2. Create a new organization (e.g., "CineDramas").

**Step 2: Create development project**

1. Click "New Project".
2. Name: `cinedramas-dev`.
3. Database password: Generate a strong password and save it securely.
4. Region: Select the closest region to your development location.
5. Plan: Free tier is sufficient for development.

**Step 3: Record project credentials**
From the Supabase dashboard (Settings > API):

- Copy the **Project URL** (e.g., `https://abcdef.supabase.co`).
- Copy the **anon (public) key**.
- Copy the **service_role key** (keep this secret — server-side only).
- Copy the **JWT Secret** (Settings > API > JWT Secret).

**Step 4: Enable authentication providers**

1. Go to Authentication > Providers in the Supabase dashboard.
2. Enable **Email** provider (enabled by default):
   - Set "Confirm email" to OFF for development (ON for production).
   - Set "Secure email change" to ON.
3. Enable **Google** provider:
   - Create a Google Cloud OAuth 2.0 client ID.
   - Enter the Client ID and Client Secret in Supabase.
4. Enable **Apple** provider:
   - Create an Apple Sign-In service ID.
   - Enter the Service ID, Team ID, Key ID, and Private Key.

**Step 5: Initialize Supabase locally**

```bash
supabase init
supabase link --project-ref your-project-ref
```

**Step 6: Create database schema (initial migration)**

```bash
supabase migration new create_initial_schema
```

Edit the generated migration file (`supabase/migrations/TIMESTAMP_create_initial_schema.sql`) with all table definitions from Section 7, all RLS policies from Section 8.3, all indexes from Section 8.4, and the `custom_access_token_hook` function from Section 4.2.

**Step 7: Apply the migration**

```bash
supabase db reset
```

**Step 8: Create seed data**
Create `supabase/seed.sql` with test data:

```sql
-- Insert test tenant
INSERT INTO tenants (id, name, mode, status, mux_env_key, revenuecat_api_key)
VALUES ('dev-tenant', 'Development Tenant', 'hub', 'active', 'mux-env-key', 'rc-api-key');

-- Insert test series
INSERT INTO series (tenant_id, title, description, category, is_featured, status)
VALUES ('dev-tenant', 'Test Drama', 'A test drama series', 'drama', true, 'published');

-- Insert test season and episodes (with placeholder Mux IDs)
-- ... (expand with realistic test data)
```

**Step 9: Create storage buckets**
In the Supabase dashboard (Storage):

1. Create bucket `brand-assets` (public).
2. Create bucket `thumbnails` (public).
3. Add RLS policies to restrict writes to service role.

**Step 10: Configure Row Level Security**
Verify RLS is enabled on all tables:

```sql
SELECT schemaname, tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public';
```

All tables must show `rowsecurity = true`.

### 10.4 Mux Setup

**Step 1: Create Mux account**

1. Go to https://mux.com and create an account.
2. Navigate to Settings > Access Tokens.

**Step 2: Create API access token**

1. Click "Generate new token".
2. Name: `cinedramas-dev`.
3. Permissions: Mux Video (Full Access) + Mux Data (Full Access).
4. Copy the **Token ID** and **Token Secret** (shown only once).

**Step 3: Create a signing key (for signed playback)**

1. Go to Settings > Signing Keys.
2. Click "Generate new key".
3. Copy the **Signing Key ID** and **Private Key** (base64-encoded).
4. Store the private key securely — this is used to sign playback JWTs.

**Step 4: Upload a test video**

1. Go to Video > Assets.
2. Click "Create new asset".
3. Provide a test video URL or upload directly.
4. Set playback policy to "public" for initial testing (switch to "signed" later).
5. Note the **Playback ID** — this is used in the mobile app.

**Step 5: Configure Mux Data**

1. Go to Data > Environments.
2. Note the **Environment Key** for the dev environment.
3. This key is used to initialize the Mux Data SDK in the mobile app.

**Step 6: Set up webhook endpoint (after edge functions are deployed)**

1. Go to Settings > Webhooks.
2. Add endpoint: `https://your-staging-url.supabase.co/functions/v1/mux-webhook`.
3. Note the **Webhook Signing Secret**.

### 10.5 RevenueCat Setup

**Step 1: Create RevenueCat account**

1. Go to https://app.revenuecat.com and create an account.

**Step 2: Create a project**

1. Click "Create new project".
2. Name: `cinedramas-dev`.

**Step 3: Configure platforms**

1. Add an iOS app:
   - App name: `CineDramas Dev`.
   - Bundle ID: `com.cinedramas.dev`.
   - App Store Connect API Key: Create one in App Store Connect (Users and Access > Keys > In-App Purchase).
2. Add an Android app:
   - App name: `CineDramas Dev`.
   - Package name: `com.cinedramas.dev`.
   - Service Account credentials: Create in Google Cloud Console, upload JSON key.

**Step 4: Create products and entitlements**

1. Go to Products > Entitlements.
2. Create entitlement: `premium`.
3. Go to Products > Products.
4. Create products mapping to App Store / Play Store product IDs.
5. Go to Products > Offerings.
6. Create offering: `default`.
7. Add packages: Monthly, Yearly (linking to the products above).

**Step 5: Get API keys**

1. Go to Project Settings > API Keys.
2. Copy the **Public SDK key** (iOS and Android).
3. These are used in the mobile app to initialize RevenueCat.

**Step 6: Configure webhook**

1. Go to Project Settings > Webhooks.
2. Add webhook URL: `https://your-staging-url.supabase.co/functions/v1/revenuecat-webhook`.
3. Note the **Authorization header value** (shared secret).

### 10.6 Expo / EAS Setup

**Step 1: Create Expo account**

1. Go to https://expo.dev and create an account.
2. Create an organization (e.g., "CineDramas").

**Step 2: Log in to EAS CLI**

```bash
eas login
```

**Step 3: Initialize EAS**

```bash
eas init
```

**Step 4: Configure EAS build profiles**
Create `eas.json`:

```json
{
  "cli": {
    "version": ">= 13.0.0",
    "appVersionSource": "remote"
  },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal",
      "env": {
        "APP_VARIANT": "default"
      }
    },
    "preview": {
      "distribution": "internal",
      "env": {
        "APP_VARIANT": "default"
      }
    },
    "production": {
      "autoIncrement": true
    },
    "production-clientA": {
      "extends": "production",
      "env": {
        "APP_VARIANT": "clientA"
      }
    },
    "production-clientB": {
      "extends": "production",
      "env": {
        "APP_VARIANT": "clientB"
      }
    },
    "production-hub": {
      "extends": "production",
      "env": {
        "APP_VARIANT": "hub"
      }
    }
  },
  "submit": {
    "production": {}
  }
}
```

**Step 5: Configure dynamic app.config.js**
Create `app.config.js` (replace `app.json`):

```javascript
import clientConfigs from './brands/index';

const variant = process.env.APP_VARIANT || 'default';
const brand = clientConfigs[variant];

export default ({ config }) => ({
  ...config,
  name: brand.appName,
  slug: brand.slug,
  version: '1.0.0',
  orientation: 'portrait',
  icon: brand.iconPath,
  splash: {
    image: brand.splashPath,
    resizeMode: 'contain',
    backgroundColor: brand.splashBackgroundColor,
  },
  ios: {
    bundleIdentifier: brand.ios.bundleId,
    supportsTablet: false,
  },
  android: {
    package: brand.android.packageName,
    adaptiveIcon: {
      foregroundImage: brand.android.adaptiveIconPath,
      backgroundColor: brand.splashBackgroundColor,
    },
  },
  extra: {
    eas: { projectId: brand.easProjectId },
    supabaseUrl: brand.supabaseUrl,
    supabaseAnonKey: brand.supabaseAnonKey,
    muxEnvKey: brand.muxEnvKey,
    revenuecatApiKey: brand.revenuecatApiKey,
    sentryDsn: brand.sentryDsn,
    tenantId: brand.tenantId,
    brandId: variant,
  },
  plugins: [
    'expo-router',
    'expo-secure-store',
    ['@sentry/react-native/expo', { organization: 'cinedramas', project: brand.sentryProject }],
  ],
});
```

**Step 6: Create default brand config**
Create `brands/default/manifest.json`:

```json
{
  "appName": "CineDramas Dev",
  "slug": "cinedramas-dev",
  "tenantId": "dev-tenant",
  "ios": {
    "bundleId": "com.cinedramas.dev"
  },
  "android": {
    "packageName": "com.cinedramas.dev"
  },
  "supabaseUrl": "https://your-project.supabase.co",
  "supabaseAnonKey": "your-anon-key",
  "muxEnvKey": "your-mux-env-key",
  "revenuecatApiKey": "your-rc-public-key",
  "sentryDsn": "https://your-dsn@sentry.io/project",
  "sentryProject": "cinedramas-dev",
  "easProjectId": "your-eas-project-id",
  "splashBackgroundColor": "#000000"
}
```

Create `brands/index.ts`:

```typescript
import defaultConfig from './default/manifest.json';

const configs: Record<string, typeof defaultConfig> = {
  default: {
    ...defaultConfig,
    iconPath: './brands/default/icon.png',
    splashPath: './brands/default/splash.png',
  },
};

export default configs;
```

**Step 7: Push EAS secrets**

```bash
eas secret:push --scope project --env-file .env.production
```

### 10.7 Cloudflare Setup

**Step 1: Create Cloudflare account**

1. Go to https://cloudflare.com and create an account.

**Step 2: Add domain**

1. Add your domain (e.g., `cinedramas.com`).
2. Update nameservers at your domain registrar to Cloudflare's nameservers.

**Step 3: Configure DNS**

1. Add CNAME record: `api.cinedramas.com` → your Supabase project URL (proxied through Cloudflare).

**Step 4: Configure Cache Rules**
Create Cache Rules in the Cloudflare dashboard:

1. **Rule: Cache Catalog API**
   - Match: `api.cinedramas.com/catalog/*`
   - Action: Cache, Respect origin Cache-Control headers
   - Edge TTL: 300 seconds
2. **Rule: Cache Config API**
   - Match: `api.cinedramas.com/config/*`
   - Action: Cache, Respect origin Cache-Control headers
   - Edge TTL: 600 seconds

**Step 5: Configure WAF / Rate Limiting**

1. Create rate limiting rule for write endpoints:
   - Match: `api.cinedramas.com/user/progress/*` (PUT)
   - Rate: 10 requests per minute per IP
   - Action: Block for 60 seconds
2. Create rate limiting rule for auth endpoints:
   - Match: `api.cinedramas.com/auth/*` (POST)
   - Rate: 20 requests per minute per IP
   - Action: Challenge

### 10.8 Sentry Setup

**Step 1: Create Sentry account**

1. Go to https://sentry.io and create an account.

**Step 2: Create project**

1. Create a new project of type "React Native".
2. Name: `cinedramas-dev`.
3. Copy the **DSN** (Data Source Name).

**Step 3: Configure source maps**
Source maps are automatically uploaded by the `@sentry/react-native` Expo plugin during EAS Build. The Sentry plugin is already configured in `app.config.js` (Step 10.6, Step 5).

**Step 4: Set up tenant tagging**
In the app initialization code, set the tenant tag:

```typescript
Sentry.init({
  dsn: Constants.expoConfig.extra.sentryDsn,
  tracesSampleRate: 0.2,
});

// After login:
Sentry.setTag('tenant_id', tenantId);
Sentry.setUser({ id: userId, email: userEmail });
```

### 10.9 CI/CD Setup (GitHub Actions)

**Step 1: Create GitHub repository**

```bash
gh repo create cinedramas/cinedramas-app --private
git remote add origin git@github.com:cinedramas/cinedramas-app.git
git push -u origin main
```

**Step 2: Add repository secrets**
In GitHub repository Settings > Secrets and variables > Actions, add:

- `SUPABASE_ACCESS_TOKEN` (from Supabase dashboard > Account > Access Tokens)
- `SUPABASE_PROJECT_REF_STAGING` (staging project reference ID)
- `SUPABASE_PROJECT_REF_PROD` (production project reference ID)
- `EXPO_TOKEN` (from Expo account settings > Access Tokens)

**Step 3: Create CI workflow**
Create `.github/workflows/ci.yml`:

```yaml
name: CI
on:
  pull_request:
    branches: [main]
  push:
    branches: [main]

jobs:
  lint-and-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm
      - run: npm ci
      - run: npx tsc --noEmit
      - run: npx eslint .
      - run: npx vitest run
      - run: npx ts-node scripts/validate-brands.ts

  deploy-staging:
    needs: lint-and-test
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: supabase/setup-cli@v1
      - run: supabase db push --project-ref ${{ secrets.SUPABASE_PROJECT_REF_STAGING }}
        env:
          SUPABASE_ACCESS_TOKEN: ${{ secrets.SUPABASE_ACCESS_TOKEN }}
```

**Step 4: Create release workflow**
Create `.github/workflows/release.yml`:

```yaml
name: Release
on:
  push:
    tags: ['v*']

jobs:
  deploy-production:
    runs-on: ubuntu-latest
    environment: production
    steps:
      - uses: actions/checkout@v4
      - uses: supabase/setup-cli@v1
      - run: supabase db push --project-ref ${{ secrets.SUPABASE_PROJECT_REF_PROD }}
        env:
          SUPABASE_ACCESS_TOKEN: ${{ secrets.SUPABASE_ACCESS_TOKEN }}

  build-mobile:
    needs: deploy-production
    runs-on: ubuntu-latest
    strategy:
      matrix:
        variant: [clientA, hub]
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm
      - run: npm ci
      - uses: expo/expo-github-action@v8
        with:
          eas-version: latest
          token: ${{ secrets.EXPO_TOKEN }}
      - run: APP_VARIANT=${{ matrix.variant }} eas build --platform all --profile production --non-interactive
```

---

## 11. Implementation Roadmap

The implementation is divided into five phases that progressively build the CineDramas platform from foundation infrastructure through to production-scale multi-tenant operations. The phases follow the Silhouette-first, Hub-second directive.

### 11.1 Phase 1 — Foundation Infrastructure (Weeks 1-2)

**Goals:**

- Establish all external service accounts and development environments
- Initialize the repository with project scaffolding and dependencies
- Verify basic connectivity between all services
- Get a test video playing in a bare React Native component

**Deliverables:**

- Initialized Expo project with all dependencies installed
- Supabase dev project with schema, RLS policies, and seed data
- Mux account with a test video asset and playback ID verified
- RevenueCat project with test products configured
- Sentry project with DSN configured
- GitHub repository with CI workflow running
- Brand config system scaffolded (`brands/default/`)
- One test video playing in a simple Video component on device/emulator

**Dependencies:** None (this is the starting point).

**Estimated Duration:** 2 weeks (includes developer onboarding and learning).

### 11.2 Phase 2 — Silhouette Platform Core (Weeks 3-8)

**Goals:**

- Build the complete single-tenant platform (all core services)
- Implement all screens and user-facing features for one tenant
- Achieve end-to-end flow: register → browse → play → track progress → subscribe

**Deliverables:**

_Week 3-4: Player + Feed_

- VideoPlayer component wrapping react-native-video with Mux HLS
- VerticalFeed with FlashList paging and snap behavior
- PreloadManager for N+1/N-1 video preloading
- Gesture controls (tap pause, double-tap like, swipe)
- PlayerOverlay (title, progress bar, episode info)
- Mux Data integration for QoE metrics
- **Milestone:** Swipe through 10+ test videos at 60 FPS

_Week 4-5: Navigation + Catalog + Search_

- Expo Router tab navigation (Home, Search, Profile)
- Home screen with horizontal rails (FlashList)
- Series detail screen with season selector + episode list
- Catalog edge functions (GET /catalog/series, /catalog/featured, /catalog/search)
- TanStack Query hooks for all catalog endpoints
- Search screen with debounced text search
- **Milestone:** Full navigation from home → series → player with real data

_Week 5-6: Auth + Profile_

- Supabase Auth integration (email + Google + Apple)
- tenant_id injection into JWT custom claims
- Auth state in Zustand (authStore), token in expo-secure-store
- Protected routes (redirect to login if not authenticated)
- Profile/settings screen
- Onboarding screen (3 slides with Reanimated transitions)
- **Milestone:** User can register, login, see tenant-scoped personalized home

_Week 6-7: Watch Progress + Continue Watching_

- useWatchProgress hook (debounced writes: 10s interval, pause, background)
- Progress edge function with UPSERT + rate limiting
- Continue Watching rail on home screen
- Resume playback from last position
- Mark episode as watched at 90% completion
- **Milestone:** Full continue-watching flow with rate-controlled writes

_Week 7-8: Subscriptions + Paywall_

- RevenueCat SDK integration (initialized with tenant key)
- Custom Paywall screen pulling offerings from RevenueCat
- Entitlement checks (client-side + server-side)
- Signed playback token generation (Playback Token edge function)
- RevenueCat webhook handler with entitlements sync
- Restore purchases flow
- **Milestone:** Purchase subscription, unlock premium content, restore on new device

**Dependencies:** Phase 1 completed (all accounts and infrastructure ready).

**Estimated Duration:** 6 weeks.

### 11.3 Phase 3 — Silhouette Stabilization (Weeks 9-12)

**Goals:**

- Harden the platform for production deployment
- Build the white-label system for multiple branded apps
- Deploy first two Silhouette clients to app stores
- Implement observability and monitoring

**Deliverables:**

_Week 9-10: White-Label System_

- Brand manifest system (`brands/{clientId}/manifest.json`)
- CI validation script (`validate-brands.ts`)
- Dynamic `app.config.js` reading APP_VARIANT
- ThemeProvider consuming brand tokens
- Runtime config endpoint (`GET /config/:tenantId`)
- configStore (Zustand) for runtime brand config
- EAS Build matrix for two brand variants
- EAS Submit for both clients
- Per-client push notification setup (expo-notifications + FCM)
- **Milestone:** Two distinct branded apps built and submitted from one codebase

_Week 11-12: Production Hardening_

- Sentry integration with tenant_id tags on all events
- Error boundaries on every screen
- Skeleton/shimmer loading states for all async views
- Offline graceful degradation (cached catalog, queued progress)
- Splash screen optimization (< 2s cold start)
- Structured logging on all edge functions
- Mux webhook handler for asset.ready pipeline
- Cloudflare cache rules configured and verified
- Observability dashboard setup (API latency, error rates, video QoE)
- App Store / Play Store metadata and screenshots
- Security audit: RLS isolation tests, webhook verification, secret rotation test
- **Milestone:** V1 production-ready, two Silhouette clients live, observability operational

**Dependencies:** Phase 2 completed (all core services functional).

**Estimated Duration:** 4 weeks.

### 11.4 Phase 4 — Hub Architecture Expansion (Weeks 13-18)

**Goals:**

- Evolve the platform from single-tenant Silhouette to multi-tenant Hub
- Implement the control plane (tenant registry, routing, onboarding)
- Deploy the shared Hub instance with multiple tenants
- Validate tenant isolation under Hub model

**Deliverables:**

_Week 13-14: Control Plane + Tenant Registry_

- Tenant registry table in Hub database
- Tenant resolution middleware for edge functions
- Hub Supabase project setup (shared database with RLS)
- Migrate schema + policies to Hub database
- Tenant onboarding workflow (add tenant → configure → activate)
- Hub-specific environment configuration

_Week 15-16: Hub Application Plane_

- Edge functions updated with tenant resolution middleware
- Hub mobile app variant (APP_VARIANT=hub)
- Runtime tenant selection (login screen with tenant picker, or deep link-based)
- Shared storage with tenant-prefixed paths + Storage RLS
- Shared Mux environment with catalog-based asset attribution
- RevenueCat multi-tenant configuration (per-tenant API keys in tenant config)
- Config service serving per-tenant theme and features from Hub database

_Week 17-18: Validation + Bridge Model_

- Cross-tenant isolation test suite (automated: attempt reads/writes across tenants, verify denial)
- Hub performance testing (multiple tenants, concurrent users)
- Bridge model validation: Silhouette tenants continue operating alongside Hub tenants
- Tenant migration tooling: script to move a tenant from Hub to Silhouette (or vice versa)
- Admin dashboard MVP (React web) for tenant management and content ingestion
- **Milestone:** Hub live with 3+ tenants, Silhouette tenants unaffected, isolation verified

**Dependencies:** Phase 3 completed (Silhouette stable in production).

**Estimated Duration:** 6 weeks.

### 11.5 Phase 5 — Production Scaling and V2 Features (Weeks 19-26)

**Goals:**

- Scale the platform to 100,000+ concurrent users
- Implement V2 features (DRM, downloads, deep links, GDPR)
- Establish operational maturity (load testing, runbooks, SLOs)

**Deliverables:**

_Week 19-20: Scale Testing + Performance_

- Load testing framework (k6 or Artillery) with realistic user behavior models
- Simulate 100,000 concurrent users: cold-start bursts, steady viewing, progress writes
- Identify and resolve bottlenecks (connection pool tuning, cache optimization)
- Database read replica setup (if needed for catalog reads)
- Write-behind buffer for progress writes (Redis → Postgres, if needed)

_Week 21-22: V2 Content Features_

- Signed playback URLs via edge functions (cached per user+episode)
- Content ingestion CMS (admin dashboard for series/episode management)
- Mux webhook pipeline for automated asset status tracking
- Subtitle/caption support (VTT files from Mux or Supabase Storage)
- Advanced search (filters by category, tags; full-text search optimization)

_Week 23-24: V2 Platform Features_

- Offline downloads with DRM (Mux DRM: Widevine for Android, FairPlay for iOS)
- Deep linking per client (unique URL schemes + associated domains)
- Push notifications (new episodes, expiring trials)
- Recommendations engine (simple: "because you watched X" based on category/tag similarity)

_Week 25-26: Compliance + Operational Maturity_

- GDPR consent flow (EU users)
- Data export endpoint (`GET /user/data`)
- Data deletion endpoint (`DELETE /user`)
- Privacy policy per tenant in runtime config
- Operational runbooks for common incidents
- Tenant-level SLO (Service Level Objective) dashboards
- Cost tracking per tenant
- Regional pricing via RevenueCat
- A/B testing framework for paywall/UI variants
- **Milestone:** V2 shipped, 100,000 concurrent validated, compliance ready

---

## 12. Development Task Breakdown — Micro-Level

Each task below includes a task name, description, owner type, dependencies (by task ID), and concrete implementation steps. Tasks are organized by phase.

### Phase 1 — Foundation Infrastructure

#### T1.01: Initialize Expo Project

- **Owner:** Frontend
- **Dependencies:** None
- **Description:** Create the Expo project with TypeScript template and install all dependencies.
- **Steps:**
  1. Run `npx create-expo-app@latest cinedramas-app --template blank-typescript`
  2. Install all dependencies listed in Section 10.2, Steps 3-4
  3. Configure `tsconfig.json` per Section 10.2, Step 5
  4. Configure ESLint and Prettier per Section 10.2, Steps 6-7
  5. Create full directory structure per Section 10.2, Step 8
  6. Create `.gitignore` per Section 10.2, Step 9
  7. Verify the app runs on Android emulator and iOS simulator with `npx expo start`
  8. Commit and push to GitHub

#### T1.02: Create Supabase Development Project

- **Owner:** Backend
- **Dependencies:** None
- **Description:** Set up the Supabase project with complete database schema.
- **Steps:**
  1. Create Supabase account and organization
  2. Create `cinedramas-dev` project (see Section 10.3, Steps 1-3)
  3. Record Project URL, anon key, service role key, JWT secret
  4. Run `supabase init` and `supabase link` locally
  5. Create migration file with all tables from Section 7
  6. Add all RLS policies from Section 8.3 to the migration
  7. Add all indexes from Section 8.4 to the migration
  8. Add the `custom_access_token_hook` function (Section 4.2)
  9. Add the user creation trigger (on auth.users insert → public.users insert)
  10. Run `supabase db reset` to apply
  11. Create `seed.sql` with test tenant, series, seasons, and episodes
  12. Verify schema in Supabase Studio

#### T1.03: Configure Supabase Authentication

- **Owner:** Backend
- **Dependencies:** T1.02
- **Description:** Enable and configure all authentication providers.
- **Steps:**
  1. Enable Email provider in Supabase dashboard (Authentication > Providers)
  2. Set "Confirm email" to OFF for dev environment
  3. Create Google Cloud OAuth 2.0 client ID for Supabase Auth
  4. Enable Google provider in Supabase, enter Client ID and Secret
  5. Create Apple Sign-In service ID (requires Apple Developer account)
  6. Enable Apple provider in Supabase, enter credentials
  7. Configure JWT custom claims hook: register `custom_access_token_hook` in Supabase Auth settings (Authentication > Hooks)
  8. Test: register a user, verify JWT contains `tenant_id` claim

#### T1.04: Create Mux Account and Test Asset

- **Owner:** Backend
- **Dependencies:** None
- **Description:** Set up Mux and verify video playback with a test asset.
- **Steps:**
  1. Create Mux account at mux.com
  2. Generate API access token (Mux Video + Mux Data permissions)
  3. Generate signing key pair for signed playback
  4. Store Token ID, Token Secret, Signing Key ID, and Private Key securely
  5. Upload a test video (use Mux dashboard or API)
  6. Set playback policy to `public` for initial testing
  7. Note the Playback ID
  8. Note the Mux Data Environment Key
  9. Verify the test video plays in a browser: `https://stream.mux.com/{playbackId}.m3u8`

#### T1.05: Create RevenueCat Project

- **Owner:** Backend
- **Dependencies:** None
- **Description:** Set up RevenueCat with test products.
- **Steps:**
  1. Create RevenueCat account
  2. Create project `cinedramas-dev`
  3. Add iOS app with bundle ID `com.cinedramas.dev`
  4. Add Android app with package name `com.cinedramas.dev`
  5. Create entitlement `premium`
  6. Create test products (Monthly, Yearly)
  7. Create default offering linking products to entitlement
  8. Note the Public SDK Key (iOS and Android)

#### T1.06: Create Sentry Project

- **Owner:** DevOps
- **Dependencies:** None
- **Description:** Set up Sentry for crash reporting.
- **Steps:**
  1. Create Sentry account and organization
  2. Create React Native project `cinedramas-dev`
  3. Note the DSN (Data Source Name)
  4. Verify the `@sentry/react-native` Expo plugin is in `app.config.js`

#### T1.07: Configure GitHub Repository and CI

- **Owner:** DevOps
- **Dependencies:** T1.01
- **Description:** Set up GitHub repo with branch protection and CI workflow.
- **Steps:**
  1. Create private GitHub repository `cinedramas/cinedramas-app`
  2. Push initial code to main branch
  3. Enable branch protection on `main`: require PR review, require CI pass
  4. Add repository secrets (SUPABASE_ACCESS_TOKEN, EXPO_TOKEN, project refs)
  5. Create `.github/workflows/ci.yml` per Section 10.9, Step 3
  6. Verify CI workflow runs on a test PR

#### T1.08: Configure EAS Build System

- **Owner:** DevOps
- **Dependencies:** T1.01
- **Description:** Set up EAS with build profiles for all variants.
- **Steps:**
  1. Run `eas login` and `eas init`
  2. Create `eas.json` with dev, preview, and production profiles (Section 10.6, Step 4)
  3. Create `app.config.js` with dynamic brand config loading (Section 10.6, Step 5)
  4. Create `brands/default/manifest.json` with dev credentials (Section 10.6, Step 6)
  5. Create `brands/index.ts` exporting all brand configs
  6. Create placeholder icon.png (1024x1024) and splash.png for default brand
  7. Run `eas build --platform android --profile development` to verify build succeeds
  8. Push EAS secrets for production builds

#### T1.09: Verify End-to-End Connectivity

- **Owner:** Fullstack
- **Dependencies:** T1.01, T1.02, T1.04
- **Description:** Confirm the mobile app can connect to Supabase and play a Mux video.
- **Steps:**
  1. Create `.env.local` with Supabase URL, anon key, and Mux playback ID
  2. Create a minimal screen that initializes the Supabase client
  3. Create a minimal Video component with the Mux HLS URL
  4. Run on emulator/simulator and verify: (a) Supabase connection works, (b) video plays
  5. This is a throwaway verification — production components are built in Phase 2

### Phase 2 — Silhouette Platform Core

#### T2.01: Build VideoPlayer Component

- **Owner:** Frontend
- **Dependencies:** T1.09
- **Description:** Create the core video player wrapping react-native-video with Mux HLS support.
- **Steps:**
  1. Create `components/video/VideoPlayer.tsx`
  2. Wrap `react-native-video` `<Video>` component
  3. Accept props: `playbackId`, `token` (optional, for signed), `onProgress`, `onEnd`
  4. Construct HLS URL: `https://stream.mux.com/{playbackId}.m3u8` (add `?token=` if signed)
  5. Implement play, pause, seek controls via ref
  6. Handle loading, error, and buffering states
  7. Integrate `@mux/mux-data-react-native-video` for QoE tracking
  8. Pass Mux Data environment key from app config
  9. Test with the Mux test asset from T1.04

#### T2.02: Build PreloadManager

- **Owner:** Frontend
- **Dependencies:** T2.01
- **Description:** Implement video preloading for instant swipe transitions.
- **Steps:**
  1. Create `components/video/PreloadManager.ts`
  2. Use `react-native-video` v7 `VideoPlayer.preload()` API
  3. Maintain a preload pool: current, next (N+1), previous (N-1) episodes
  4. On feed position change: preload new N+1 and N-1, release old preloads
  5. Ensure only one video is actively playing at a time (pause off-screen players)
  6. Test: swipe between episodes and verify < 500ms time-to-first-frame

#### T2.03: Build VerticalFeed Component

- **Owner:** Frontend
- **Dependencies:** T2.01, T2.02
- **Description:** Create the full-screen vertical swipe video feed.
- **Steps:**
  1. Create `components/video/VerticalFeed.tsx`
  2. Use `@shopify/flash-list` in vertical paging mode
  3. Configure: `estimatedItemSize` = screen height, `drawDistance` = 3 items
  4. Implement snap-to-item behavior (pagingEnabled equivalent)
  5. Each item renders a full-screen VideoPlayer
  6. On visible item change: play current, pause others, update PreloadManager
  7. Measure performance with Flashlight — must sustain 60 FPS during swipes
  8. Optimize with `React.memo` on list item components

#### T2.04: Build PlayerOverlay Component

- **Owner:** Frontend
- **Dependencies:** T2.01
- **Description:** Create the transparent overlay showing player controls.
- **Steps:**
  1. Create `components/video/PlayerOverlay.tsx`
  2. Display: episode title, series name, progress bar, play/pause button
  3. Auto-hide after 3 seconds of inactivity (Reanimated fade animation)
  4. Show on tap (toggle visibility)
  5. Double-tap for like (Gesture Handler double-tap recognizer)
  6. Swipe up for episode info sheet

#### T2.05: Implement Gesture Controls

- **Owner:** Frontend
- **Dependencies:** T2.03, T2.04
- **Description:** Add multi-gesture recognition to the player.
- **Steps:**
  1. Use `react-native-gesture-handler` composed gestures
  2. Single tap: toggle overlay visibility
  3. Double tap: like animation (heart burst using Reanimated)
  4. Long press: show playback speed options
  5. Horizontal pan on progress bar: seek to position
  6. Ensure gestures do not conflict with vertical feed scroll

#### T2.06: Set Up Expo Router Navigation

- **Owner:** Frontend
- **Dependencies:** T1.01
- **Description:** Configure file-based routing with tab navigation.
- **Steps:**
  1. Create `app/_layout.tsx` (root layout with auth check, ThemeProvider, QueryClientProvider)
  2. Create `app/(tabs)/_layout.tsx` (tab navigator: Home, Search, Profile)
  3. Create `app/(tabs)/index.tsx` (Home screen placeholder)
  4. Create `app/(tabs)/search.tsx` (Search screen placeholder)
  5. Create `app/(tabs)/profile.tsx` (Profile screen placeholder)
  6. Create `app/series/[id].tsx` (Series detail screen)
  7. Create `app/player/[episodeId].tsx` (Full-screen player)
  8. Create `app/auth/login.tsx` and `app/auth/register.tsx`
  9. Create `app/onboarding.tsx`
  10. Create `app/paywall.tsx`
  11. Test navigation flow between all screens

#### T2.07: Build Home Screen

- **Owner:** Frontend
- **Dependencies:** T2.06, T2.10
- **Description:** Implement the home screen with horizontal rails.
- **Steps:**
  1. Create `components/home/ContinueWatchingRail.tsx` (FlashList horizontal)
  2. Create `components/home/FeaturedBanner.tsx` (featured series card)
  3. Create `components/home/CategoryRail.tsx` (horizontal series list per category)
  4. Build home screen in `app/(tabs)/index.tsx`: compose rails vertically
  5. Use `useCatalog` hook (T2.10) to fetch featured data
  6. Each series card shows thumbnail (expo-image with blurhash), title, category
  7. Implement pull-to-refresh

#### T2.08: Build Series Detail Screen

- **Owner:** Frontend
- **Dependencies:** T2.06, T2.10
- **Description:** Implement the series detail page with season selector.
- **Steps:**
  1. Create `components/series/SeriesCard.tsx`
  2. Create `components/series/SeasonSelector.tsx` (horizontal tab/pill selector)
  3. Create `components/series/EpisodeRow.tsx` (episode list item with thumbnail, title, duration, progress bar)
  4. Build series detail in `app/series/[id].tsx`: header, season selector, episode list
  5. Use `useSeriesDetail(id)` hook to fetch series + seasons + episodes
  6. Tapping an episode navigates to `app/player/[episodeId].tsx`

#### T2.09: Build Catalog Edge Functions

- **Owner:** Backend
- **Dependencies:** T1.02
- **Description:** Implement all catalog API endpoints as Supabase Edge Functions.
- **Steps:**
  1. Create `supabase/functions/catalog-series/index.ts`
     - GET handler: parse query params (page, limit, category)
     - Query series table with RLS (tenant-scoped automatically)
     - Return paginated results with `Cache-Control: public, max-age=300, stale-while-revalidate=60`
  2. Create `supabase/functions/catalog-series-detail/index.ts`
     - GET handler: parse series ID from path
     - Query series + seasons + episodes with JOINs
     - Return nested structure
  3. Create `supabase/functions/catalog-featured/index.ts`
     - GET handler: query featured series, category rails
     - Compose home screen data structure
  4. Create `supabase/functions/catalog-search/index.ts`
     - GET handler: parse search query `q`
     - Use PostgreSQL full-text search (`to_tsquery`)
     - Return ranked results
  5. Deploy functions: `supabase functions deploy`
  6. Test each endpoint with curl, verifying RLS scoping

#### T2.10: Build Catalog TanStack Query Hooks

- **Owner:** Frontend
- **Dependencies:** T2.09
- **Description:** Create React Query hooks for all catalog endpoints.
- **Steps:**
  1. Create `services/api.ts` (base HTTP client with Supabase auth header injection)
  2. Create `services/catalog.ts` (catalog API functions: fetchSeries, fetchSeriesDetail, fetchFeatured, search)
  3. Create `hooks/useCatalog.ts`:
     - `useFeatured()` — staleTime: 5 min, returns home screen data
     - `useSeriesList(category?)` — staleTime: 5 min, paginated
     - `useSeriesDetail(id)` — staleTime: 5 min
     - `useSearch(query)` — staleTime: 1 min, enabled only when query.length > 2
  4. Configure `persistQueryClient` in root layout to persist cache to AsyncStorage
  5. Verify: app renders home screen from cache on cold start

#### T2.11: Build Search Screen

- **Owner:** Frontend
- **Dependencies:** T2.06, T2.10
- **Description:** Implement the search screen with debounced text search.
- **Steps:**
  1. Build search screen in `app/(tabs)/search.tsx`
  2. Text input with debounced onChange (300ms debounce)
  3. Display results as series cards and episode rows
  4. Show "no results" state, loading skeleton, and error state
  5. Recent searches stored in AsyncStorage

#### T2.12: Implement Supabase Auth Integration

- **Owner:** Frontend
- **Dependencies:** T1.03, T2.06
- **Description:** Build auth screens and connect to Supabase Auth.
- **Steps:**
  1. Create `services/auth.ts` (Supabase client initialization, signIn, signUp, signOut, refreshSession)
  2. Create `stores/authStore.ts` (Zustand store: user, session, tenantId, isAuthenticated, login/logout actions)
  3. Build `app/auth/login.tsx` (email/password form, social login buttons)
  4. Build `app/auth/register.tsx` (email/password/name form, social signup)
  5. On successful auth: store tokens in expo-secure-store, update authStore
  6. Implement session hydration in `app/_layout.tsx` (check stored token on mount)
  7. Implement protected route wrapper: if not authenticated, redirect to login
  8. Test: register → login → see personalized home → logout → redirected to login

#### T2.13: Build Profile and Settings Screen

- **Owner:** Frontend
- **Dependencies:** T2.12
- **Description:** Implement the profile/settings screen.
- **Steps:**
  1. Build `app/(tabs)/profile.tsx`
  2. Display: user name, email, avatar
  3. Settings: subscription status, restore purchases button, app version
  4. Links: terms of service, privacy policy, support (from tenant config)
  5. Logout button (calls authStore.logout)

#### T2.14: Build Onboarding Screen

- **Owner:** Frontend
- **Dependencies:** T2.06
- **Description:** Implement the first-launch onboarding experience.
- **Steps:**
  1. Build `app/onboarding.tsx`
  2. Three slides with Reanimated page transitions
  3. Each slide: illustration, title, description
  4. "Skip" button and "Next" button
  5. On completion: set `hasOnboarded=true` in AsyncStorage, navigate to home/auth
  6. Root layout checks `hasOnboarded` and shows onboarding on first launch

#### T2.15: Build Watch Progress System

- **Owner:** Fullstack
- **Dependencies:** T2.01, T2.12, T1.02
- **Description:** Implement the complete watch progress tracking pipeline.
- **Steps:**
  1. Create `supabase/functions/user-progress/index.ts`:
     - GET handler: query watch_progress table for current user, ORDER BY updated_at DESC
     - PUT handler: validate body, rate limit check (6/min/user via Upstash Redis), execute UPSERT
  2. Create `services/progress.ts` (API client for progress endpoints)
  3. Create `hooks/useWatchProgress.ts`:
     - On mount: fetch current progress for the episode
     - During playback: debounce position updates (10-second interval)
     - On pause: send immediate update
     - On AppState change to background: send immediate update
     - Set completed=true when position >= 90% of duration
  4. Create `stores/playerStore.ts` (current episode, position, isPlaying)
  5. Wire useWatchProgress into VideoPlayer component
  6. Build ContinueWatchingRail: query recent progress, show episodes with progress bars
  7. Test: play → pause → close app → reopen → continue watching rail shows episode → tap → resumes from position

#### T2.16: Build Playback Token Service

- **Owner:** Backend
- **Dependencies:** T1.04, T1.02
- **Description:** Implement signed Mux JWT generation for premium content.
- **Steps:**
  1. Create `supabase/functions/playback-token/index.ts`:
     - Validate JWT, extract user_id and tenant_id
     - Query entitlements table: confirm active subscription or episode.is_free
     - If no entitlement: return 403
     - Query episodes table: get mux_playback_id
     - Check Redis cache: `token:{user_id}:{episode_id}`
     - If cached: return cached token
     - Generate Mux JWT: { sub: playbackId, aud: "v", exp: now + 6h, kid: signingKeyId }
     - Sign with RS256 using Mux signing private key
     - Cache in Redis with TTL 5 hours
     - Return: { stream_url, thumbnail_url, expires_at }
  2. Install `jose` library for JWT signing in edge function
  3. Store Mux signing key ID and private key as Supabase function env vars
  4. Test: request token for free episode (should work without entitlement), request token for premium episode without subscription (should 403), purchase test subscription, request again (should succeed)

#### T2.17: Build Entitlements System

- **Owner:** Fullstack
- **Dependencies:** T1.05, T2.12, T1.02
- **Description:** Implement RevenueCat integration and entitlements checking.
- **Steps:**
  1. Create `services/revenuecat.ts`:
     - Initialize RevenueCat SDK with tenant-specific API key
     - Function: getCustomerInfo() → entitlement status
     - Function: getOfferings() → subscription options
     - Function: purchasePackage(pkg) → purchase flow
     - Function: restorePurchases() → restore
  2. Create `hooks/useEntitlements.ts`:
     - On mount: fetch customer info from RevenueCat SDK
     - Check `customerInfo.entitlements.active['premium']`
     - Expose: hasPremium, isLoading, offerings
  3. Create `supabase/functions/user-entitlements/index.ts`:
     - GET handler: query entitlements table for current user
     - Return tier, expires_at, features
  4. Create `supabase/functions/revenuecat-webhook/index.ts`:
     - Verify webhook Authorization header
     - Check idempotency (webhook_events table)
     - Map event type to entitlement UPSERT
     - Store raw event in webhook_events
  5. Test: check entitlement (should be free), make test purchase, verify webhook fires, verify entitlement updates

#### T2.18: Build Paywall Screen

- **Owner:** Frontend
- **Dependencies:** T2.17
- **Description:** Implement the subscription paywall UI.
- **Steps:**
  1. Build `app/paywall.tsx`
  2. Create `components/paywall/PlanCard.tsx` (displays price, features, period)
  3. Create `components/paywall/OfferBanner.tsx` (trial offer highlight)
  4. Fetch offerings from RevenueCat via useEntitlements hook
  5. Display plan cards for each available package
  6. "Subscribe" button triggers RevenueCat purchase flow
  7. Handle states: loading, success (navigate to content), error, user cancelled
  8. "Restore Purchases" button calls `Purchases.restorePurchases()`
  9. Follow Apple paywall guidelines (required by App Store review)

#### T2.19: Build Mux Webhook Handler

- **Owner:** Backend
- **Dependencies:** T1.04, T1.02
- **Description:** Implement the Mux webhook processor for asset events.
- **Steps:**
  1. Create `supabase/functions/mux-webhook/index.ts`:
     - Extract `Mux-Signature` header
     - Compute expected HMAC-SHA256 over raw body using webhook secret
     - Verify signature match and timestamp tolerance (< 5 minutes)
     - Extract idempotency key (event ID)
     - Check webhook_events table for duplicate
     - Process `video.asset.ready`: update episodes SET mux_asset_status='ready', mux_playback_id, duration_seconds
     - Process `video.asset.errored`: update episodes SET mux_asset_status='errored'
     - Store raw event in webhook_events
  2. Configure Mux webhook URL in Mux dashboard (after deploying function)
  3. Test: upload a new video to Mux, verify webhook fires, verify episode record updates

#### T2.20: Build Config Service

- **Owner:** Backend
- **Dependencies:** T1.02
- **Description:** Implement the runtime tenant configuration endpoint.
- **Steps:**
  1. Create `supabase/functions/config/index.ts`:
     - Parse tenant ID from URL path
     - Query tenants table for theme_config, feature_flags, legal_urls, home_rails_order
     - Return JSON with Cache-Control: public, max-age=600, stale-while-revalidate=120
  2. Create `stores/configStore.ts` (Zustand):
     - State: theme, features, legalUrls, railsOrder, isLoaded
     - Actions: fetchConfig(tenantId), loadCachedConfig()
  3. In root layout: load cached config immediately, fetch fresh config in background
  4. ThemeProvider reads from configStore and applies CSS variables

### Phase 3 — Silhouette Stabilization

#### T3.01: Create Brand Manifest System

- **Owner:** Fullstack
- **Dependencies:** T1.08
- **Description:** Build the brand configuration directory structure and CI validation.
- **Steps:**
  1. Define manifest.json JSON Schema (required fields: appName, slug, tenantId, ios.bundleId, android.packageName, supabaseUrl, supabaseAnonKey, muxEnvKey, revenuecatApiKey)
  2. Create `brands/clientA/manifest.json` with Client A configuration
  3. Create `brands/clientA/icon.png` (1024x1024), `splash.png`, `adaptive-icon.png`
  4. Create `brands/clientA/theme.ts` (color and typography tokens)
  5. Repeat for Client B (`brands/clientB/`)
  6. Update `brands/index.ts` to export all brand configs
  7. Create `scripts/validate-brands.ts`:
     - Iterate all directories in `brands/`
     - Validate manifest.json against JSON schema
     - Verify all required image assets exist
     - Verify image dimensions (icon.png = 1024x1024)
     - Verify API keys are non-empty
     - Verify bundle ID follows reverse-domain convention
     - Exit with non-zero code on any failure
  8. Add validation script to CI workflow

#### T3.02: Build ThemeProvider

- **Owner:** Frontend
- **Dependencies:** T3.01, T2.20
- **Description:** Implement runtime theming that applies brand colors and typography.
- **Steps:**
  1. Create `theme/tokens.ts` (default design tokens: colors, spacing, typography)
  2. Create `theme/global.css` (NativeWind CSS variables with defaults)
  3. Create `components/ui/ThemeProvider.tsx`:
     - Reads theme from configStore (runtime) with fallback to brand theme (build-time)
     - Sets CSS variables via NativeWind's CSS variable API
     - Wraps children
  4. Integrate ThemeProvider into `app/_layout.tsx`
  5. Update all components to use Tailwind classes referencing theme variables
  6. Test: build with APP_VARIANT=clientA (green theme), APP_VARIANT=clientB (purple theme)

#### T3.03: Configure EAS Build Matrix

- **Owner:** DevOps
- **Dependencies:** T3.01, T1.08
- **Description:** Set up EAS to build all brand variants.
- **Steps:**
  1. Add build profiles to `eas.json` for each brand (production-clientA, production-clientB)
  2. Configure EAS secrets per variant (or shared secrets with variant-specific env vars)
  3. Test: `APP_VARIANT=clientA eas build --platform android --profile production-clientA`
  4. Verify resulting APK has correct app name, icon, and bundle ID
  5. Create `scripts/build-all.sh`:
     ```bash
     for variant in clientA clientB; do
       APP_VARIANT=$variant eas build --platform all --profile production-$variant --non-interactive
     done
     ```
  6. Integrate into release CI workflow

#### T3.04: Implement Error Boundaries

- **Owner:** Frontend
- **Dependencies:** T2.06, T1.06
- **Description:** Add error boundaries to every screen for graceful failure handling.
- **Steps:**
  1. Create `components/ui/ErrorBoundary.tsx` (React error boundary component)
  2. On catch: log to Sentry with screen context, display "Something went wrong" UI with retry button
  3. Wrap every screen in `app/` with ErrorBoundary
  4. Test: throw an error in a component, verify Sentry receives the event, verify user sees retry UI

#### T3.05: Build Skeleton Loading States

- **Owner:** Frontend
- **Dependencies:** T2.07, T2.08
- **Description:** Add shimmer/skeleton placeholders for all async views.
- **Steps:**
  1. Create `components/ui/Skeleton.tsx` (shimmer animation using Reanimated)
  2. Create skeleton variants: SkeletonCard, SkeletonRail, SkeletonEpisodeRow, SkeletonPlayer
  3. In every screen: show skeleton while React Query `isLoading` is true
  4. Test: throttle network, verify skeletons render smoothly

#### T3.06: Implement Offline Graceful Degradation

- **Owner:** Frontend
- **Dependencies:** T2.10, T2.15
- **Description:** Ensure the app works gracefully when offline.
- **Steps:**
  1. Configure TanStack Query `persistQueryClient` with AsyncStorage adapter
  2. On cold start: hydrate query cache from AsyncStorage before rendering
  3. If catalog fetch fails: render from persisted cache, show "offline" banner
  4. If progress write fails: queue in local storage, retry on next interval or connectivity change
  5. If config fetch fails: use last-known-good config from AsyncStorage
  6. Monitor network state with `@react-native-community/netinfo`
  7. Test: enable airplane mode, launch app, verify cached content renders

#### T3.07: Integrate Sentry with Tenant Tags

- **Owner:** Frontend
- **Dependencies:** T1.06, T2.12
- **Description:** Configure Sentry with full context for multi-tenant debugging.
- **Steps:**
  1. Initialize Sentry in `app/_layout.tsx` with DSN from app config
  2. Set `tracesSampleRate: 0.2` for production, `1.0` for dev
  3. After login: call `Sentry.setTag('tenant_id', tenantId)` and `Sentry.setUser({ id, email })`
  4. Add navigation breadcrumbs (Sentry's React Navigation integration)
  5. Verify source maps upload during EAS Build (automatic via Sentry Expo plugin)
  6. Test: trigger a crash, verify it appears in Sentry with tenant_id tag and readable stack trace

#### T3.08: Implement Structured Logging in Edge Functions

- **Owner:** Backend
- **Dependencies:** T2.09
- **Description:** Add consistent structured logging to all edge functions.
- **Steps:**
  1. Create a shared logging utility (`supabase/functions/_shared/logger.ts`)
  2. Log format: JSON with timestamp, level, tenant_id, user_id, request_id, endpoint, method, status_code, latency_ms
  3. Wrap every edge function handler with logging middleware:
     - Generate request_id (UUID) on entry
     - Record start time
     - Execute handler
     - Log on completion (success or error)
  4. Forward logs to external aggregator if needed (Supabase logs are available in dashboard)

#### T3.09: Configure Cloudflare Cache Rules

- **Owner:** DevOps
- **Dependencies:** T2.09, T2.20
- **Description:** Set up CDN caching for catalog and config endpoints.
- **Steps:**
  1. Add domain to Cloudflare and configure DNS
  2. Create CNAME record for `api.cinedramas.com` pointing to Supabase
  3. Create Cache Rule for `/catalog/*`: cache, respect origin headers, edge TTL 300s
  4. Create Cache Rule for `/config/*`: cache, respect origin headers, edge TTL 600s
  5. Create rate limiting rule for `/user/progress/*` (PUT): 10 req/min/IP
  6. Create rate limiting rule for `/auth/*` (POST): 20 req/min/IP
  7. Verify: make repeated requests to catalog, check Cloudflare analytics for cache hit ratio

#### T3.10: Security Audit — RLS Isolation Tests

- **Owner:** Backend
- **Dependencies:** T1.02, T2.09
- **Description:** Create automated tests verifying tenant isolation.
- **Steps:**
  1. Create test suite (`supabase/tests/isolation.test.ts` or Vitest)
  2. Create two test users in different tenants (tenant-a, tenant-b)
  3. Test cases:
     - User A queries series → receives only tenant-a series
     - User A queries with explicit tenant_id=tenant-b → receives only tenant-a series (RLS overrides)
     - User A attempts to insert series with tenant_id=tenant-b → rejected
     - User A queries watch_progress → receives only their own progress
     - User A attempts to read User B's progress → empty result
     - User A attempts to update User B's entitlement → rejected
  4. Run tests in CI on every PR
  5. If any test fails, block merge

#### T3.11: Prepare Store Submissions

- **Owner:** DevOps
- **Dependencies:** T3.03
- **Description:** Prepare metadata and screenshots for App Store and Play Store.
- **Steps:**
  1. Generate screenshots for each brand variant (home, player, series detail, paywall)
  2. Write app descriptions per brand
  3. Configure age ratings, privacy labels
  4. Set up TestFlight for iOS beta testing
  5. Set up Google Play internal testing track
  6. Submit first brand variant (clientA) for review
  7. Address any review feedback

### Phase 4 — Hub Architecture Expansion

#### T4.01: Create Hub Supabase Project

- **Owner:** Backend
- **Dependencies:** T1.02
- **Description:** Set up the shared Hub database with multi-tenant RLS.
- **Steps:**
  1. Create Supabase project `cinedramas-hub` (production-grade plan)
  2. Apply the same migration files from Silhouette
  3. Verify all RLS policies are active
  4. Insert tenant records for Hub tenants in the tenants table
  5. Seed with test content for multiple tenants
  6. Run the isolation test suite (T3.10) against Hub database
  7. Configure connection pooling (transaction mode, appropriate pool size)

#### T4.02: Implement Tenant Resolution Middleware

- **Owner:** Backend
- **Dependencies:** T4.01
- **Description:** Build the middleware that resolves tenant context from JWT.
- **Steps:**
  1. Create `supabase/functions/_shared/tenant.ts`:
     - Extract JWT from request
     - Verify JWT signature
     - Extract tenant_id from claims
     - Query tenants table for tenant config (cache for 5 minutes)
     - Return TenantContext object: { tenantId, userId, mode, muxConfig }
  2. For hub tenants: use shared Supabase client (RLS scopes automatically)
  3. For silo tenants: create Supabase client with tenant's dedicated project URL
  4. Update all edge functions to use this middleware as the first step
  5. Test: make requests with different tenant JWTs, verify correct scoping

#### T4.03: Configure Hub Mobile App Variant

- **Owner:** Frontend
- **Dependencies:** T4.01, T3.01
- **Description:** Create the Hub app variant that serves multiple tenants.
- **Steps:**
  1. Create `brands/hub/manifest.json` with Hub-specific config
  2. The Hub variant connects to the shared Supabase project
  3. Implement tenant selection on login screen (or via deep link)
  4. Store selected tenant_id; pass during auth registration
  5. After login, JWT contains the selected tenant_id
  6. All subsequent API calls are automatically scoped via RLS
  7. Test: log in as tenant-A user (see tenant-A content), log out, log in as tenant-B user (see tenant-B content)

#### T4.04: Configure Shared Storage with Tenant Prefixes

- **Owner:** Backend
- **Dependencies:** T4.01
- **Description:** Set up shared Supabase Storage with per-tenant access control.
- **Steps:**
  1. Create storage bucket `brand-assets` in Hub project
  2. Organize files under `tenant/{tenant_id}/` prefixes
  3. Create Storage RLS policy: users can only read files under their tenant's prefix
  4. Service role can write to any prefix (for admin uploads)
  5. Test: upload a file for tenant-A, try to read it as tenant-B (should fail)

#### T4.05: Build Admin Dashboard MVP

- **Owner:** Fullstack
- **Dependencies:** T4.01
- **Description:** Build a minimal web admin for tenant and content management.
- **Steps:**
  1. Create a separate React web project (or use Supabase Studio for MVP)
  2. Screens: tenant list, tenant detail/config editor, series manager, episode manager
  3. Tenant creation form: name, mode, Mux key, RevenueCat key, theme
  4. Series/episode CRUD with Mux asset linking
  5. Authenticate via Supabase Auth (admin role)
  6. Use service_role key for cross-tenant operations

#### T4.06: Validate Bridge Model

- **Owner:** Backend
- **Dependencies:** T4.01, T4.02
- **Description:** Verify that Silhouette and Hub tenants coexist correctly.
- **Steps:**
  1. Confirm Silhouette tenant A (dedicated database) continues operating normally
  2. Confirm Hub tenant B (shared database) operates correctly
  3. Make API requests from both apps simultaneously
  4. Verify no cross-contamination in responses
  5. Document the bridge model operational playbook

### Phase 5 — Production Scaling

#### T5.01: Build Load Testing Framework

- **Owner:** Backend
- **Dependencies:** T4.01
- **Description:** Create realistic load tests simulating 100,000 concurrent users.
- **Steps:**
  1. Set up k6 (or Artillery) load testing tool
  2. Create user behavior model scripts:
     - Cold start: fetch config + catalog + progress simultaneously
     - Steady viewing: progress writes every 10s
     - Browse: catalog reads (series list, series detail, search)
     - Token issuance: playback token requests
  3. Run against staging environment
  4. Identify bottlenecks: connection pool saturation, slow queries, cache misses
  5. Tune based on results

#### T5.02: Implement DRM Protected Playback

- **Owner:** Backend
- **Dependencies:** T2.16
- **Description:** Enable DRM for premium content using Mux DRM.
- **Steps:**
  1. Enable DRM on Mux assets (Widevine for Android, FairPlay for iOS)
  2. Update Playback Token Service to generate DRM license tokens
  3. Configure react-native-video DRM properties
  4. Test: play DRM content on both platforms, verify screen recording is blocked

#### T5.03: Implement GDPR Compliance

- **Owner:** Fullstack
- **Dependencies:** T2.12, T2.15
- **Description:** Build GDPR consent and data management features.
- **Steps:**
  1. Build consent banner component (shown on first launch for EU users)
  2. Store consent preferences in user profile
  3. Build `GET /user/data` endpoint: export all user data as JSON
  4. Build `DELETE /user` endpoint: delete user account and all associated data (progress, entitlements)
  5. Ensure analytics respect consent state (disable Mux Data if consent not given)

---

## 13. Technology Dependency Map

### 13.1 Setup Dependency Graph

The following diagram shows which technologies must be configured before others. Technologies on the left must be set up before technologies on the right.

```
                    ┌────────────────┐
                    │   Node.js      │
                    │   Git          │
                    └───────┬────────┘
                            │
              ┌─────────────┼─────────────┐
              ▼             ▼             ▼
     ┌────────────┐ ┌────────────┐ ┌────────────┐
     │   Expo     │ │  Supabase  │ │    Mux     │
     │   Project  │ │  Project   │ │  Account   │
     └─────┬──────┘ └─────┬──────┘ └─────┬──────┘
           │               │               │
     ┌─────┤         ┌─────┤               │
     ▼     ▼         ▼     ▼               ▼
  ┌──────┐ ┌────┐ ┌─────┐ ┌──────┐  ┌──────────┐
  │ EAS  │ │ RN │ │Auth │ │Edge  │  │Mux Test  │
  │Build │ │Nav │ │Setup│ │Func. │  │Asset     │
  └──┬───┘ └──┬─┘ └──┬──┘ └──┬───┘  └────┬─────┘
     │        │      │       │            │
     │        │      │       │            │
     ▼        ▼      ▼       ▼            ▼
  ┌──────────────────────────────────────────┐
  │         Mobile App Integration            │
  │  (Player, Catalog, Auth, Progress)        │
  └──────────────────┬───────────────────────┘
                     │
         ┌───────────┼───────────┐
         ▼           ▼           ▼
  ┌────────────┐ ┌────────┐ ┌────────────┐
  │ RevenueCat │ │Sentry  │ │ Cloudflare │
  │ (Paywall)  │ │(Errors)│ │  (Cache)   │
  └────────────┘ └────────┘ └────────────┘
                     │
                     ▼
         ┌───────────────────────┐
         │  White-Label System   │
         │  (Brands + EAS Matrix)│
         └───────────┬───────────┘
                     │
                     ▼
         ┌───────────────────────┐
         │  Hub Architecture     │
         │  (Multi-Tenant RLS)   │
         └───────────────────────┘
```

### 13.2 Sequencing Requirements

| Technology            | Must Be Set Up Before                         | Reason                                                                    |
| --------------------- | --------------------------------------------- | ------------------------------------------------------------------------- |
| Node.js / npm         | Everything else                               | Runtime for Expo, Supabase CLI, EAS CLI                                   |
| Supabase Project      | Edge Functions, Auth, Storage                 | Edge Functions deploy to a Supabase project; Auth is a project feature    |
| Supabase Auth         | JWT-based API calls, RLS policies             | RLS uses `auth.jwt()` function; all API auth depends on Supabase Auth JWT |
| Supabase Schema + RLS | Edge Functions (catalog, progress, etc.)      | Functions query tables that must exist with correct policies              |
| Mux Account           | VideoPlayer component, Playback Token Service | Player needs a playback ID; token service needs signing keys              |
| Mux Signing Keys      | Playback Token Service                        | Token generation requires the private key                                 |
| Expo Project          | EAS Build, all mobile components              | EAS builds the Expo project                                               |
| EAS Build Profiles    | White-label builds, store submissions         | Brand variants are built via EAS profiles                                 |
| Brand Manifests       | EAS Build (branded)                           | `app.config.js` reads brand config at build time                          |
| RevenueCat Project    | Paywall screen, entitlements                  | SDK needs API key; webhook needs product configuration                    |
| Cloudflare Domain     | Production API traffic                        | Edge caching and WAF require DNS proxying through Cloudflare              |
| Sentry Project        | Crash reporting                               | SDK needs DSN at app initialization                                       |
| Upstash Redis         | Rate limiting, token caching                  | Edge functions use Redis for rate counters and cached tokens              |

### 13.3 Critical Path

The critical path is the longest chain of dependent tasks that determines the minimum project duration:

```
Supabase Project Setup
  → Database Schema + RLS
    → Auth Configuration + JWT Claims
      → Catalog Edge Functions
        → VideoPlayer Component (needs playback IDs from catalog)
          → Full App Integration (Player + Catalog + Auth + Progress)
            → White-Label Brand System
              → Store Submission
                → Hub Architecture (extends Silhouette)
                  → Production Scale Testing
```

**Critical Path Duration Estimate:** 18-20 weeks from project start to Hub with production scaling.

**Parallelizable Work (not on critical path):**

- Mux account setup (parallel with Supabase setup)
- RevenueCat setup (parallel with core app development)
- Sentry setup (parallel with core app development)
- Cloudflare setup (parallel with edge function development)
- Admin dashboard (parallel with mobile app development)
- UI component development (parallel with backend API development)

---

## 14. Risks and Architectural Trade-offs

### 14.1 Technical Risks

| Risk                                                                                                                             | Probability | Impact                           | Mitigation                                                                                                                                                                                                                                 |
| -------------------------------------------------------------------------------------------------------------------------------- | ----------- | -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **react-native-video v7 instability** — v7 is relatively new and may have bugs in preloading or HLS playback on specific devices | Medium      | High (core UX depends on player) | Pin to a stable minor version. Wrap in an abstraction layer (`VideoPlayer.tsx`) to allow swapping the underlying player library. Maintain a list of known-good versions. Consider `expo-video` as fallback.                                |
| **Expo EAS Build queue delays** — EAS Build queues can be long during peak hours, delaying CI/CD pipelines                       | Medium      | Medium (delays releases)         | Use `--local` builds for development (builds on developer machine). Reserve EAS cloud builds for staging/production. Consider EAS Priority Plan for production.                                                                            |
| **Mux DRM in beta** — Mux's DRM support is still in beta and may have limitations on certain devices                             | Medium      | Low (DRM is V2 feature)          | Start with signed playback URLs (stable, well-tested). Add DRM only in Phase 5 when Mux DRM reaches GA (General Availability). Signed URLs provide sufficient protection for most content.                                                 |
| **App Store rejection for paywall** — Apple has strict guidelines for subscription UI presentation                               | Medium      | High (blocks launch)             | Study Apple's Human Interface Guidelines for subscriptions before building the paywall. Include all required disclosures (price, period, trial terms). Submit to TestFlight review early (Week 8) to catch issues before store submission. |
| **Supabase Edge Function cold starts** — Serverless functions may have cold start latency of 100-500ms                           | Low         | Medium (increases API latency)   | Use Supabase's "warm" function feature if available. Design the mobile app to tolerate 500ms API latency with loading states. Critical paths (token issuance) benefit from token caching, reducing cold start frequency.                   |
| **react-native-reanimated Hermes compatibility** — Animation worklets require Hermes JS engine and may have edge cases           | Low         | Medium (UI glitches)             | Use Reanimated with Hermes (Expo default). Keep animations simple for critical paths (player overlay, feed swipe). Test on low-end devices (Pixel 4a, iPhone SE).                                                                          |

### 14.2 Scaling Risks

| Risk                                                                                                                               | Probability | Impact                             | Mitigation                                                                                                                                                                                                                                                                                                                |
| ---------------------------------------------------------------------------------------------------------------------------------- | ----------- | ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Watch progress write storms** — At 100,000 concurrent viewers, progress writes could overwhelm the database even with debouncing | Medium      | High (database saturation)         | Three-layer defense: (1) Client debouncing (10s intervals, not every frame), (2) Server rate limiting (6 writes/min/user via Redis), (3) UPSERT semantics (no row multiplication). If still insufficient, implement write-behind buffer: edge function writes to Redis, background worker flushes to Postgres in batches. |
| **Playback token issuance bottleneck** — Burst of token requests at content launch events (new series drops)                       | Medium      | High (users cannot start playback) | Token caching per (user_id, episode_id) with TTL < token expiry (5 hours). Tokens are reused across seeks, replays, and brief app closures. Edge function execution (geo-distributed) avoids single-point bottleneck. Pre-warm cache for anticipated hot content.                                                         |
| **Cold-start catalog burst** — App updates or new feature launches cause simultaneous cold starts with catalog fetches             | Medium      | Medium (slow home screen)          | CDN edge caching absorbs 99%+ of catalog reads. TanStack Query persisted cache ensures the app renders immediately from local cache even if CDN is slow. `stale-while-revalidate` serves stale data while refreshing.                                                                                                     |
| **Database connection pool exhaustion** — Serverless edge functions create many short-lived connections                            | Medium      | High (API failures)                | PgBouncer transaction-mode pooling. Monitor pool usage in Supabase dashboard. Alert at 80% utilization. If approaching limits: upgrade Supabase plan (larger pool), add read replica for catalog queries, or introduce connection-aware queue for non-critical writes.                                                    |
| **CDN cache poisoning / cache key collision** — Incorrect cache keys could serve Tenant A's data to Tenant B                       | Low         | Critical (data leakage)            | Cache key must include `tenant_id` as a component. Verify with automated tests: request from Tenant A, then from Tenant B — responses must differ. Use `Vary` header or explicit cache key rules in Cloudflare.                                                                                                           |

### 14.3 Complexity Risks

| Risk                                                                                                                                                     | Probability | Impact                      | Mitigation                                                                                                                                                                                                                                                         |
| -------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------- | --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **White-label asset management complexity** — Managing icons, splash screens, themes for many brands becomes error-prone                                 | High        | Medium (broken builds)      | Strict `brands/{id}/manifest.json` convention with JSON Schema validation. CI script (`validate-brands.ts`) blocks builds if any manifest is invalid or assets are missing. Automate image dimension checks. Onboarding checklist for new brands.                  |
| **Cross-tenant data leakage in Hub** — RLS policy bugs or misconfiguration could expose data across tenants                                              | Low         | Critical (trust violation)  | Defense in depth: RLS at DB level + tenant extraction from JWT at API level + `tenant_id` never from client params. Automated negative isolation test suite runs on every PR. Regular security audits of RLS policies. Penetration testing before Hub launch.      |
| **Webhook idempotency failures** — Webhooks may be delivered multiple times; processing them twice could corrupt data                                    | Medium      | Medium (data inconsistency) | Store webhook events with unique `idempotency_key` (event ID from source). Check for existing record before processing. Use database unique constraint on `idempotency_key` as final safety net. Return 200 for duplicates.                                        |
| **JWT custom claims synchronization** — `tenant_id` in JWT could become stale if user's tenant changes                                                   | Low         | Medium (wrong data access)  | For Silhouette: tenant never changes (baked into build). For Hub: tenant is set at registration and immutable. If tenant migration is needed: force re-authentication to issue new JWT with correct claims. Short JWT TTL (1 hour) limits stale claim window.      |
| **Multi-tenant RevenueCat configuration** — Each tenant needs separate RevenueCat products and API keys                                                  | Medium      | Medium (billing errors)     | Document RevenueCat setup per tenant in onboarding checklist. Store per-tenant API keys in the tenants table. SDK initialization reads the key from tenant config. Webhook handler maps subscriber IDs to tenants via the RevenueCat project configuration.        |
| **Migration coordination across environments** — Database migrations must be applied consistently across dev, staging, prod, and all Silhouette projects | Medium      | High (schema drift)         | Migrations are versioned SQL files in the repository. CI applies migrations to staging on merge. Production migrations require manual approval. Silhouette projects share the same migration files. A script can apply migrations to all linked Supabase projects. |

### 14.4 Architectural Trade-offs

| Decision                                                       | Trade-off                                                          | Rationale                                                                                                                                                                                                                                                                                                                                                                            |
| -------------------------------------------------------------- | ------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Single database (not microservice DBs)**                     | Less service isolation; schema changes affect all services         | At current scale (< 10 services, 1 team), a shared database is simpler to operate, migrate, and query across. Service boundaries are enforced at the edge function level. If a service needs extraction later, table ownership is clearly documented (Section 7.3).                                                                                                                  |
| **Supabase Edge Functions (not custom Node.js server)**        | Limited to Deno runtime; less flexibility than Express/Fastify     | Edge functions provide geo-distributed execution (lower latency for token issuance), automatic scaling, and no server management. The API surface is thin enough that edge function limitations are not constraining.                                                                                                                                                                |
| **RLS for tenant isolation (not application-level filtering)** | Performance overhead per query (~1-5% for simple policies)         | RLS is enforced by the database engine regardless of how data is accessed (API, direct SQL, Supabase Studio). This eliminates an entire class of bugs where a developer forgets a WHERE clause. The performance cost is negligible compared to the security benefit.                                                                                                                 |
| **RevenueCat (not custom billing)**                            | Vendor dependency; RevenueCat takes a % of revenue above free tier | Custom billing across Apple and Google stores requires handling receipt validation, subscription state machines, grace periods, billing retries, family sharing, refunds, and regional pricing. RevenueCat handles all of this. The cost is justified by the development time saved (estimated 3-6 months of custom work).                                                           |
| **Mux (not custom video pipeline)**                            | Vendor dependency; per-minute streaming costs                      | A custom video pipeline requires FFmpeg encoding clusters, multi-CDN contracts, DRM license servers, and a QoE telemetry system. Mux provides all of this with a per-minute pricing model that scales linearly. The break-even point (where custom infra becomes cheaper) is far beyond CineDramas's initial scale.                                                                  |
| **Redis for rate limiting and caching (not in-database)**      | Additional infrastructure component                                | PostgreSQL could technically handle rate limiting (with advisory locks or counter tables), but Redis provides atomic operations (INCR with TTL) at much lower latency. Upstash Redis is serverless and edge-compatible, requiring no operational overhead.                                                                                                                           |
| **Bridge tenancy model (not pure silo or pure pool)**          | Operational complexity of supporting both models                   | Pure silo is expensive (dedicated infra per tenant). Pure pool is cheaper but doesn't satisfy enterprise isolation requirements. The bridge model allows CineDramas to offer both tiers, serving long-tail creators on Hub (low cost) and enterprise clients on Silhouette (premium price). The architectural consistency (same code, same schema) minimizes the operational burden. |

---

## Appendix A: Glossary

| Abbreviation | Full Term                                      |
| ------------ | ---------------------------------------------- |
| API          | Application Programming Interface              |
| BaaS         | Backend as a Service                           |
| CDN          | Content Delivery Network                       |
| CI/CD        | Continuous Integration / Continuous Deployment |
| COPPA        | Children's Online Privacy Protection Act       |
| CRUD         | Create, Read, Update, Delete                   |
| DDoS         | Distributed Denial of Service                  |
| DNS          | Domain Name System                             |
| DRM          | Digital Rights Management                      |
| DSN          | Data Source Name                               |
| EAS          | Expo Application Services                      |
| FPS          | Frames Per Second                              |
| GDPR         | General Data Protection Regulation             |
| GIN          | Generalized Inverted Index (PostgreSQL)        |
| HMAC         | Hash-based Message Authentication Code         |
| HLS          | HTTP Live Streaming                            |
| JSI          | JavaScript Interface                           |
| JWT          | JSON Web Token                                 |
| OTA          | Over-The-Air                                   |
| PoP          | Point of Presence                              |
| QoE          | Quality of Experience                          |
| RDBMS        | Relational Database Management System          |
| REST         | Representational State Transfer                |
| RLS          | Row-Level Security                             |
| RS256        | RSA Signature with SHA-256                     |
| SLA          | Service Level Agreement                        |
| SLO          | Service Level Objective                        |
| SQL          | Structured Query Language                      |
| SWR          | Stale-While-Revalidate                         |
| TLS          | Transport Layer Security                       |
| TTL          | Time To Live                                   |
| UUID         | Universally Unique Identifier                  |
| WAF          | Web Application Firewall                       |

---

## Appendix B: Quick Reference — API Endpoint Summary

| Method | Endpoint                     | Auth      | Cached    | Rate Limited | Service        |
| ------ | ---------------------------- | --------- | --------- | ------------ | -------------- |
| POST   | /auth/login                  | No        | No        | 20/min/IP    | Auth           |
| POST   | /auth/register               | No        | No        | 20/min/IP    | Auth           |
| POST   | /auth/refresh                | Yes       | No        | No           | Auth           |
| POST   | /auth/logout                 | Yes       | No        | No           | Auth           |
| GET    | /catalog/series              | Yes       | CDN 5min  | No           | Catalog        |
| GET    | /catalog/series/:id          | Yes       | CDN 5min  | No           | Catalog        |
| GET    | /catalog/series/:id/episodes | Yes       | CDN 5min  | No           | Catalog        |
| GET    | /catalog/featured            | Yes       | CDN 5min  | No           | Catalog        |
| GET    | /catalog/search?q=           | Yes       | CDN 1min  | No           | Catalog        |
| GET    | /user/progress               | Yes       | No        | No           | Progress       |
| PUT    | /user/progress/:episodeId    | Yes       | No        | 6/min/user   | Progress       |
| GET    | /user/entitlements           | Yes       | No        | No           | Entitlements   |
| GET    | /playback/token/:episodeId   | Yes       | No        | 30/min/user  | Playback Token |
| GET    | /config/:tenantId            | No        | CDN 10min | No           | Config         |
| POST   | /webhooks/mux                | Signature | No        | No           | Mux Webhook    |
| POST   | /webhooks/revenuecat         | Secret    | No        | No           | RC Webhook     |

---

_End of document. This blueprint is intended to be a living document updated as architectural decisions evolve during implementation._
