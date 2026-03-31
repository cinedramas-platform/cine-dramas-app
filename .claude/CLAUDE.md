# CineDramas - Claude Code Project Context

## What Is CineDramas

A **multi-tenant streaming infrastructure platform** — "Shopify for streaming apps." Enables creators, studios, and media brands to launch branded mobile streaming apps from a single shared codebase.

## Two Deployment Models (Bridge Tenancy)

- **Silhouette (Stage 1):** Single-tenant, physically isolated — dedicated DB, Mux env, RevenueCat project, branded app per client.
- **Hub (Stage 2):** Multi-tenant, logically isolated — shared DB with RLS, one or more apps serving multiple tenants.

## Core Tech Stack

| Layer | Technology |
|-------|-----------|
| Mobile | React Native + Expo + Expo Router |
| Video | react-native-video v7 + Mux (HLS streaming, signed playback) |
| Lists | @shopify/flash-list v2 (cell recycling for 60 FPS) |
| Styling | NativeWind (Tailwind CSS variables for theming) |
| State | Zustand (auth, player, config stores) + TanStack React Query (server state) |
| Backend | Supabase (PostgreSQL + RLS + Edge Functions + Auth + Storage) |
| Billing | RevenueCat (subscriptions, entitlements via webhooks) |
| CDN | Cloudflare (edge caching catalog/config, WAF, rate limiting) |
| Cache | Upstash Redis (rate limiting, token caching) |
| Monitoring | Sentry (crashes + performance, tenant-tagged) + Mux Data (video QoE) |
| CI/CD | GitHub Actions + EAS Build (matrix builds per brand variant) |

## Architecture Principles

1. **Managed-Services-First** — Mux for video, RevenueCat for billing, Supabase for backend
2. **Two-Plane SaaS** — Control plane (tenant management) + Application plane (runtime APIs)
3. **Defense-in-Depth Isolation** — RLS at DB + tenant from JWT at API + tenant baked into builds
4. **Edge-First Performance** — CDN-cached reads, edge functions for token issuance
5. **Progressive Evolution** — `tenant_id` on every table from day one, same code for Silhouette & Hub

## Key Design Constraints

- Single codebase for all apps (behavior via build-time `APP_VARIANT` + runtime tenant context)
- No custom video infra (Mux handles everything)
- No custom billing logic (RevenueCat handles store interactions)
- PostgreSQL is the single source of truth (Redis is ephemeral only)
- Mux signing keys are server-side only (Edge Functions)

## Database Tables

`tenants`, `series`, `seasons`, `episodes`, `users`, `watch_progress`, `entitlements`, `webhook_events`

All tables have `tenant_id`. RLS enforces isolation via `auth.jwt()->>'tenant_id'`.

## API Surface (Supabase Edge Functions)

- Auth: `/auth/login`, `/auth/register`, `/auth/refresh`, `/auth/logout`
- Catalog: `/catalog/series`, `/catalog/series/:id`, `/catalog/featured`, `/catalog/search`
- Progress: `/user/progress` (GET), `/user/progress/:episodeId` (PUT, rate-limited 6/min/user)
- Entitlements: `/user/entitlements`
- Playback: `/playback/token/:episodeId` (signed Mux JWT generation)
- Config: `/config/:tenantId` (CDN-cached 10min)
- Webhooks: `/webhooks/mux`, `/webhooks/revenuecat`

## Implementation Phases

1. **Foundation Infrastructure** (Weeks 1-2): Project setup, accounts, connectivity
2. **Silhouette Platform Core** (Weeks 3-8): Player, catalog, auth, progress, subscriptions
3. **Silhouette Stabilization** (Weeks 9-12): White-label system, monitoring, store submission
4. **Hub Expansion** (Weeks 13-18): Multi-tenant control plane, shared infra
5. **Production Scaling** (Weeks 19-26): Load testing, DRM, GDPR, 100k+ concurrent

## Skills Reference

Detailed domain knowledge is segmented into Claude skills at `.claude/skills/`:

- `cinedramas-architecture` — System design, component boundaries, Silhouette/Hub models
- `cinedramas-db-schema` — Data models, RLS policies, indexes, migrations
- `cinedramas-api-conventions` — API contracts, request flows, error handling, caching
- `cinedramas-feature-tickets` — Implementation roadmap and micro-level task breakdown
- `cinedramas-stack-guide` — Deep explanation of each technology and its integration
- `cinedramas-testing-strategy` — Test conventions, RLS isolation tests, security audit
- `cinedramas-infrastructure` — Hosting, deployment, environments, CI/CD, secrets, monitoring

See `.claude/skills/INDEX.md` for the full index.

## Master Document

The complete architecture blueprint (~55k tokens) lives at:
`cinedramas MASTER DOC/CineDramas-Architecture-Blueprint.md`
