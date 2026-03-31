# Migration Conventions

Source: Master Architecture Blueprint, Section 8.5

## File Structure

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

## Rules

- Every migration is idempotent: `CREATE TABLE IF NOT EXISTS`, `CREATE INDEX IF NOT EXISTS`
- Applied in timestamp order by Supabase CLI
- Destructive changes require two-step migration:
  1. Add new structure alongside old
  2. Migrate data
  3. Remove old structure in subsequent release
- RLS policies in their own migration file for auditability

## Commands

- **Dev:** `supabase db reset` — drops and recreates from all migrations + seed
- **Staging/Prod:** `supabase db push` — applies only unapplied migrations
- **CI:** Automated check that migrations apply cleanly to a fresh database

## Connection Pooling

- Use pooled connection string (port 6543) for edge functions
- Use direct connection string (port 5432) for migrations and admin
- PgBouncer in transaction mode
- Pool size per Supabase plan (~150 on Pro)

## Schema Organization

- `public` schema: all CineDramas application tables
- `auth` schema: Supabase Auth tables (managed)
- `storage` schema: Supabase Storage tables (managed)
