-- T1.02: Indexes for performance

-- Immutable wrapper for full-text search index
-- (to_tsvector with a named config is STABLE, not IMMUTABLE — Supabase rejects it in indexes)
CREATE OR REPLACE FUNCTION public.series_search_vector(title text, description text, tags text[])
RETURNS tsvector
LANGUAGE sql IMMUTABLE AS $$
  SELECT to_tsvector('english', title || ' ' || COALESCE(description, '') || ' ' || array_to_string(tags, ' '));
$$;

-- series
CREATE INDEX IF NOT EXISTS idx_series_tenant
  ON public.series (tenant_id);

CREATE INDEX IF NOT EXISTS idx_series_tenant_category
  ON public.series (tenant_id, category);

CREATE INDEX IF NOT EXISTS idx_series_tenant_featured
  ON public.series (tenant_id, is_featured)
  WHERE is_featured = true;

CREATE INDEX IF NOT EXISTS idx_series_search
  ON public.series
  USING GIN (series_search_vector(title, COALESCE(description, ''), tags));

-- seasons
CREATE INDEX IF NOT EXISTS idx_seasons_series
  ON public.seasons (tenant_id, series_id, number);

-- episodes
CREATE INDEX IF NOT EXISTS idx_episodes_season_order
  ON public.episodes (tenant_id, season_id, "order");

CREATE INDEX IF NOT EXISTS idx_episodes_mux_asset
  ON public.episodes (mux_asset_id)
  WHERE mux_asset_id IS NOT NULL;

-- watch_progress
CREATE INDEX IF NOT EXISTS idx_progress_continue_watching
  ON public.watch_progress (tenant_id, user_id, updated_at DESC);

-- entitlements
CREATE INDEX IF NOT EXISTS idx_entitlements_revenuecat
  ON public.entitlements (revenuecat_subscriber_id)
  WHERE revenuecat_subscriber_id IS NOT NULL;

-- webhook_events
CREATE INDEX IF NOT EXISTS idx_webhook_tenant_created
  ON public.webhook_events (tenant_id, created_at DESC);

-- users
CREATE INDEX IF NOT EXISTS idx_users_tenant
  ON public.users (tenant_id);
