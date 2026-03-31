# Entity Definitions — Complete Field Reference

Source: Master Architecture Blueprint, Section 7.1

## tenants

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | TEXT | PRIMARY KEY | Unique tenant ID (e.g., `client-a`). Used as `tenant_id` everywhere. |
| name | TEXT | NOT NULL | Human-readable display name |
| mode | TEXT | NOT NULL, CHECK (`hub` or `silo`) | Deployment mode |
| status | TEXT | NOT NULL, DEFAULT `active` | `onboarding`, `active`, `suspended` |
| mux_env_key | TEXT | NOT NULL | Mux Data environment key |
| mux_signing_key_id | TEXT | NULLABLE | Mux signing key ID for signed playback |
| mux_signing_private_key | TEXT | NULLABLE | RS256 private key. Stored encrypted. Server-side only. |
| revenuecat_api_key | TEXT | NOT NULL | RevenueCat public API key |
| revenuecat_webhook_secret | TEXT | NULLABLE | Shared secret for webhook verification |
| supabase_url | TEXT | NULLABLE | For silo tenants only. NULL for hub. |
| supabase_anon_key | TEXT | NULLABLE | For silo tenants only. NULL for hub. |
| theme_config | JSONB | NOT NULL, DEFAULT `{}` | `{ primary, secondary, background, text, accent, fontFamily }` |
| feature_flags | JSONB | NOT NULL, DEFAULT `{}` | `{ downloads_enabled, auth_required, ads_enabled, offline_mode }` |
| home_rails_order | TEXT[] | DEFAULT `['continue_watching', 'featured', 'categories']` | Ordered home screen rail types |
| legal_urls | JSONB | NOT NULL, DEFAULT `{}` | `{ terms_of_service, privacy_policy, support }` |
| firebase_project_id | TEXT | NULLABLE | Firebase project for push notifications |
| created_at | TIMESTAMPTZ | NOT NULL, DEFAULT `NOW()` | |
| updated_at | TIMESTAMPTZ | NOT NULL, DEFAULT `NOW()` | |

**Owner:** Control Plane. Never deleted (set to `suspended`).

## series

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | UUID | PK, DEFAULT `gen_random_uuid()` | |
| tenant_id | TEXT | NOT NULL, FK tenants(id) | |
| title | TEXT | NOT NULL | |
| description | TEXT | NULLABLE | Synopsis |
| thumbnail_playback_id | TEXT | NULLABLE | Mux playback ID for thumbnail |
| category | TEXT | NOT NULL | `drama`, `comedy`, `documentary`, etc. |
| tags | TEXT[] | DEFAULT `{}` | Searchable tags |
| is_featured | BOOLEAN | NOT NULL, DEFAULT `false` | Show in featured rail |
| sort_order | INTEGER | NOT NULL, DEFAULT `0` | Display ordering |
| status | TEXT | NOT NULL, DEFAULT `draft` | `draft`, `published`, `archived` |
| created_at | TIMESTAMPTZ | NOT NULL, DEFAULT `NOW()` | |
| updated_at | TIMESTAMPTZ | NOT NULL, DEFAULT `NOW()` | |

## seasons

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | UUID | PK | |
| tenant_id | TEXT | NOT NULL, FK tenants(id) | |
| series_id | UUID | NOT NULL, FK series(id) ON DELETE CASCADE | |
| number | INTEGER | NOT NULL | Season number (1, 2, 3...) |
| title | TEXT | NULLABLE | Optional season title |
| created_at | TIMESTAMPTZ | NOT NULL, DEFAULT `NOW()` | |

**Unique:** `(tenant_id, series_id, number)`

## episodes

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | UUID | PK | |
| tenant_id | TEXT | NOT NULL, FK tenants(id) | |
| season_id | UUID | NOT NULL, FK seasons(id) ON DELETE CASCADE | |
| title | TEXT | NOT NULL | |
| description | TEXT | NULLABLE | |
| mux_playback_id | TEXT | NULLABLE | NULL until asset ready |
| mux_asset_id | TEXT | NULLABLE | For tracking upload/encoding |
| mux_asset_status | TEXT | NOT NULL, DEFAULT `pending` | `pending`, `preparing`, `ready`, `errored` |
| duration_seconds | INTEGER | NULLABLE | From Mux webhook |
| order | INTEGER | NOT NULL | Episode order within season |
| is_free | BOOLEAN | NOT NULL, DEFAULT `false` | Available without subscription |
| subtitle_url | TEXT | NULLABLE | .vtt subtitle file URL |
| thumbnail_time | FLOAT | DEFAULT `0` | Offset for auto-generated thumbnail |
| created_at | TIMESTAMPTZ | NOT NULL, DEFAULT `NOW()` | |
| updated_at | TIMESTAMPTZ | NOT NULL, DEFAULT `NOW()` | |

## users

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | UUID | PK | Application user ID |
| tenant_id | TEXT | NOT NULL, FK tenants(id) | |
| auth_id | UUID | NOT NULL, UNIQUE | Supabase Auth user ID |
| email | TEXT | NOT NULL | |
| display_name | TEXT | NULLABLE | |
| avatar_url | TEXT | NULLABLE | |
| created_at | TIMESTAMPTZ | NOT NULL, DEFAULT `NOW()` | |
| updated_at | TIMESTAMPTZ | NOT NULL, DEFAULT `NOW()` | |

**Created by:** Database trigger on auth.users INSERT.

## watch_progress

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | UUID | PK | |
| tenant_id | TEXT | NOT NULL, FK tenants(id) | |
| user_id | UUID | NOT NULL, FK users(id) ON DELETE CASCADE | |
| episode_id | UUID | NOT NULL, FK episodes(id) ON DELETE CASCADE | |
| position_seconds | INTEGER | NOT NULL, DEFAULT `0` | Current playback position |
| completed | BOOLEAN | NOT NULL, DEFAULT `false` | True at >= 90% watched |
| updated_at | TIMESTAMPTZ | NOT NULL, DEFAULT `NOW()` | Critical for continue-watching ORDER BY |

**Unique:** `(tenant_id, user_id, episode_id)` — UPSERT target.

## entitlements

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | UUID | PK | |
| tenant_id | TEXT | NOT NULL, FK tenants(id) | |
| user_id | UUID | NOT NULL, FK users(id) ON DELETE CASCADE | |
| tier | TEXT | NOT NULL, DEFAULT `free` | `free`, `premium`, `vip` |
| expires_at | TIMESTAMPTZ | NULLABLE | NULL = lifetime |
| revenuecat_subscriber_id | TEXT | NULLABLE | For cross-referencing |
| store_product_id | TEXT | NULLABLE | App Store / Play Store product ID |
| created_at | TIMESTAMPTZ | NOT NULL, DEFAULT `NOW()` | |
| updated_at | TIMESTAMPTZ | NOT NULL, DEFAULT `NOW()` | |

**Unique:** `(tenant_id, user_id)` — one per user per tenant.

## webhook_events

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | UUID | PK | |
| tenant_id | TEXT | NOT NULL | |
| source | TEXT | NOT NULL | `mux`, `revenuecat` |
| event_type | TEXT | NOT NULL | e.g., `video.asset.ready`, `initial_purchase` |
| payload | JSONB | NOT NULL | Raw webhook payload |
| idempotency_key | TEXT | NOT NULL, UNIQUE | Prevents duplicate processing |
| processed_at | TIMESTAMPTZ | NULLABLE | NULL = pending |
| error_message | TEXT | NULLABLE | |
| created_at | TIMESTAMPTZ | NOT NULL, DEFAULT `NOW()` | |

Archive old events after 90 days.
