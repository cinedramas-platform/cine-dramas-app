# CineDramas Infrastructure Status

Last updated: 2026-04-03

## What We Have

### 1. Expo Mobile App (T1.01 -- Done)

- **Framework:** React Native + Expo SDK 53 + Expo Router (file-based routing)
- **Styling:** NativeWind (Tailwind CSS for React Native)
- **State:** Zustand (client state) + TanStack React Query (server state)
- **Video:** react-native-video v7 (will connect to Mux HLS streams)
- **Lists:** @shopify/flash-list v2 (performant virtualized lists)

**Directory structure:**

```
app/              -- Expo Router screens (tabs, auth, series, player)
components/       -- UI components (video, series, home, paywall, ui)
hooks/            -- Custom React hooks
stores/           -- Zustand stores (auth, player, config)
services/         -- API service layer
brands/default/   -- White-label brand config + assets
theme/            -- NativeWind theme tokens
utils/            -- Shared utilities
supabase/         -- Migrations, edge functions, seed data
```

The app runs on Android emulator via `npx expo start`.

---

### 2. Supabase Backend (T1.02 -- Done)

**Project:** `cinedramas-dev` on Supabase Cloud

#### Database Schema (PostgreSQL)

8 tables, all with `tenant_id` for multi-tenant isolation:

| Table | Purpose |
|-------|---------|
| `tenants` | Tenant config: theme, feature flags, legal URLs, Mux/RevenueCat keys |
| `users` | App users, linked to `auth.users` via `auth_id` |
| `series` | Video series (title, category, tags, featured flag) |
| `seasons` | Seasons within a series |
| `episodes` | Individual episodes with Mux asset references |
| `watch_progress` | Per-user playback position tracking |
| `entitlements` | Subscription/access grants per user |
| `webhook_events` | Idempotent log of Mux/RevenueCat webhook deliveries |

#### Row-Level Security (RLS)

Every table has RLS enabled. Policies enforce tenant isolation:

- **Read policies** check `tenant_id = auth.jwt()->>'tenant_id'`
- **Write policies** additionally check `auth.uid()` matches the user
- Users can only see data belonging to their tenant
- Users can only modify their own records (watch_progress, etc.)

#### Indexes

- Composite indexes on `(tenant_id, ...)` for all major query patterns
- Covering indexes for catalog queries (series by category, episodes by season)
- Unique constraints on business keys (e.g., one progress record per user+episode)

#### Seed Data

- 1 test tenant (`dev-tenant`) with theme config and feature flags
- 4 series, 4 seasons, 10 episodes across them
- Mix of free and premium episodes

---

### 3. Supabase Authentication (T1.03 -- Done)

#### Providers Enabled

- **Email/Password** -- enabled, email confirmation OFF for dev
- **Google OAuth** -- deferred (will add later)
- **Apple Sign-In** -- deferred (will add later)

#### Custom Access Token Hook

A PostgreSQL function `custom_access_token_hook` runs every time Supabase mints a JWT:

```
auth.users.raw_app_meta_data->>'tenant_id'  -->  JWT claims.tenant_id
```

This means every authenticated request carries `tenant_id` in the JWT, which RLS policies use for isolation. Registered in Supabase Dashboard under Authentication > Hooks.

#### User Creation Trigger

When a new user signs up (`auth.users` INSERT), the `handle_new_user` trigger automatically creates a matching `public.users` row with the tenant_id from app_metadata. If tenant_id is not present (e.g., admin-created users), the trigger skips the insert gracefully.

#### How Auth Flows Together

```
User signs up with email + password
  --> Supabase creates auth.users row
  --> handle_new_user trigger creates public.users row (with tenant_id)
  --> On login, Supabase mints JWT
  --> custom_access_token_hook injects tenant_id into JWT claims
  --> App sends JWT with every API request
  --> RLS policies read tenant_id from JWT to filter data
```

---

### 4. GitHub Repository (T1.00 -- Done)

- Private repo with code pushed to `main` and `dev` branches
- Code is committed and tracked

---

## What's Still Remaining (Phase 1)

| Task | Status | What's Needed |
|------|--------|---------------|
| T1.04 -- Mux Account + Test Asset | To Do | Create Mux account, upload test video, get playback ID |
| T1.05 -- RevenueCat Project | To Do | Create project, configure test subscriptions |
| T1.06 -- Sentry Project | To Do | Create project, get DSN |
| T1.07 -- GitHub CI | In Progress | Add CI workflow, branch protection rules |
| T1.08 -- EAS Build System | To Do | Configure eas.json, build profiles, brand manifests |
| T1.09 -- E2E Connectivity | To Do | Verify app connects to Supabase + plays Mux video |

### Other Open Items

- **Node.js upgrade** -- Current version may need update to >= 20.19.4 for React Native 0.81 compatibility
- **External provider registrations** -- GitHub and Expo accounts done; Apple Developer and Google Play registrations still needed

---

## How It All Connects

```
+------------------+       +-------------------+
|   Expo Mobile    |       |   Supabase Cloud  |
|   App (RN)       |       |                   |
|                  | JWT   | +---------------+ |
|  Zustand stores  +------>| | Auth (GoTrue) | |
|  TanStack Query  |       | +-------+-------+ |
|  react-native-   |       |         |         |
|  video (Mux HLS) |       |   custom_access_  |
|  FlashList       |       |   token_hook      |
|  NativeWind      |       |   (adds tenant_id |
|                  |       |    to JWT)        |
+--------+---------+       |         |         |
         |                 | +-------v-------+ |
         |   API calls     | | PostgreSQL    | |
         +---------------->| | 8 tables      | |
                           | | RLS enforced  | |
                           | | tenant_id on  | |
                           | | everything    | |
                           | +---------------+ |
                           +-------------------+

Future connections (not yet configured):
  - Mux (video streaming via HLS)
  - RevenueCat (subscriptions/entitlements)
  - Sentry (crash reporting)
  - Cloudflare (CDN caching)
  - GitHub Actions (CI/CD)
  - EAS Build (app builds)
```
