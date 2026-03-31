---
name: cinedramas-db-schema
description: CineDramas database schema — all table definitions, entity relationships, RLS policies, indexing strategy, and migration patterns. Use before writing migrations, RLS policies, or database queries.
user-invocable: true
disable-model-invocation: false
---

# CineDramas Database Schema Reference

Use this skill when writing migrations, creating/modifying tables, writing RLS policies, optimizing queries, or understanding data relationships.

## Tables Overview

| Table | Primary Writer | Primary Reader | Key Columns |
|-------|---------------|----------------|-------------|
| tenants | Admin/Control Plane | Config Service | id (TEXT PK), mode, status, theme_config, feature_flags |
| series | Admin Dashboard | Catalog Service | id (UUID), tenant_id, title, category, is_featured, status |
| seasons | Admin Dashboard | Catalog Service | id (UUID), tenant_id, series_id, number |
| episodes | Admin + Mux Webhook | Catalog + Playback Token | id (UUID), tenant_id, season_id, mux_playback_id, is_free |
| users | Auth Trigger | Progress + Entitlements | id (UUID), tenant_id, auth_id, email |
| watch_progress | Progress Service | Catalog (continue watching) | tenant_id, user_id, episode_id, position_seconds, completed |
| entitlements | RevenueCat Webhook | Playback Token Service | tenant_id, user_id, tier, expires_at |
| webhook_events | Webhook Handlers | Admin (debugging) | source, event_type, idempotency_key (UNIQUE) |

## Entity Relationships

```
tenants (1) ──< (many) series
tenants (1) ──< (many) users
series  (1) ──< (many) seasons
seasons (1) ──< (many) episodes
users   (1) ──< (many) watch_progress
episodes(1) ──< (many) watch_progress
users   (1) ──< (1)    entitlements
```

## RLS Pattern

All tables use `tenant_id = (auth.jwt()->>'tenant_id')` for tenant isolation.
User-scoped tables (watch_progress, entitlements) additionally check `user_id`.
Service role bypasses RLS for webhook handlers and admin operations.

## Key Unique Constraints

- `(tenant_id, series_id, number)` on seasons
- `(tenant_id, user_id, episode_id)` on watch_progress (UPSERT target)
- `(tenant_id, user_id)` on entitlements
- `(idempotency_key)` on webhook_events
- `(auth_id)` on users

## For Full Details

- Complete field definitions: `references/entity-definitions.md`
- RLS policies SQL: `references/rls-policies.md`
- Indexing strategy: `references/indexes.md`
- Migration conventions: `references/migrations.md`
