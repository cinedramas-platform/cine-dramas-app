# RLS Policies — SQL Reference

Source: Master Architecture Blueprint, Section 8.3

## Core Tenant Isolation Pattern

Applied to: series, seasons, episodes, watch_progress, entitlements, webhook_events

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

## User-Scoped Policies (watch_progress, entitlements)

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

## Service Role Bypass

Edge functions that need cross-tenant writes (webhook handlers, admin operations) use the Supabase `service_role` key, which bypasses RLS. This key is stored server-side only and never exposed to clients.

## Custom Access Token Hook

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

## Verification Query

```sql
-- Verify RLS is enabled on all tables
SELECT schemaname, tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public';
-- All tables must show rowsecurity = true
```
