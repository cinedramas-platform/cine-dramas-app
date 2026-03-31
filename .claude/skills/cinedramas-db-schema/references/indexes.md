# Indexing Strategy

Source: Master Architecture Blueprint, Section 8.4

## Index Definitions

| Table | Index Name | Columns | Purpose |
|-------|-----------|---------|---------|
| series | idx_series_tenant | `(tenant_id)` | Base tenant-scoped filtering |
| series | idx_series_tenant_category | `(tenant_id, category)` | Category-filtered listing |
| series | idx_series_tenant_featured | `(tenant_id, is_featured) WHERE is_featured = true` | Featured rail (partial index) |
| series | idx_series_search | GIN on `to_tsvector('english', title \|\| ' ' \|\| COALESCE(description, '') \|\| ' ' \|\| array_to_string(tags, ' '))` | Full-text search |
| seasons | idx_seasons_series | `(tenant_id, series_id, number)` | Season listing for a series |
| episodes | idx_episodes_season_order | `(tenant_id, season_id, order)` | Episode listing within season |
| episodes | idx_episodes_mux_asset | `(mux_asset_id) WHERE mux_asset_id IS NOT NULL` | Mux webhook lookup |
| watch_progress | idx_progress_continue_watching | `(tenant_id, user_id, updated_at DESC)` | Continue watching rail |
| watch_progress | idx_progress_upsert | `UNIQUE (tenant_id, user_id, episode_id)` | UPSERT conflict target |
| entitlements | idx_entitlements_user | `UNIQUE (tenant_id, user_id)` | Single-row lookup |
| entitlements | idx_entitlements_revenuecat | `(revenuecat_subscriber_id) WHERE NOT NULL` | Webhook subscriber lookup |
| webhook_events | idx_webhook_idempotency | `UNIQUE (idempotency_key)` | Duplicate detection |
| webhook_events | idx_webhook_tenant_created | `(tenant_id, created_at DESC)` | Admin: recent events per tenant |
| users | idx_users_auth_id | `UNIQUE (auth_id)` | Auth trigger lookup |
| users | idx_users_tenant | `(tenant_id)` | Tenant-scoped user listing |

## Performance Notes

- **Watch progress UPSERT** uses `(tenant_id, user_id, episode_id)` unique index as conflict target — index-only operation
- **Featured rail** uses partial index (`WHERE is_featured = true`) — tiny index for fast queries
- **Full-text search** uses GIN index on tsvector for efficient catalog search
- **Mux webhook lookup** uses partial index (`WHERE mux_asset_id IS NOT NULL`) to keep index small
