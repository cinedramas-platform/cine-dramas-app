-- Seed data for CineDramas development
-- Creates a test tenant with sample catalog content.

-- ============================================================
-- Test Tenant
-- ============================================================
INSERT INTO public.tenants (id, name, mode, status, mux_env_key, revenuecat_api_key, theme_config, feature_flags, legal_urls)
VALUES (
  'dev-tenant',
  'CineDramas Dev',
  'silo',
  'active',
  'dev-mux-env-key',
  'dev-revenuecat-key',
  '{"primary": "#E50914", "secondary": "#141414", "background": "#000000", "text": "#FFFFFF", "accent": "#E50914", "fontFamily": "System"}',
  '{"downloads_enabled": false, "auth_required": true, "ads_enabled": false, "offline_mode": false}',
  '{"terms_of_service": "https://example.com/tos", "privacy_policy": "https://example.com/privacy", "support": "https://example.com/support"}'
);

-- ============================================================
-- Series
-- ============================================================
INSERT INTO public.series (id, tenant_id, title, description, category, tags, is_featured, sort_order, status)
VALUES
  ('a1111111-1111-1111-1111-111111111111', 'dev-tenant', 'The Last Signal', 'A gripping drama about a radio operator in a remote Arctic station who intercepts a mysterious broadcast.', 'drama', ARRAY['thriller', 'mystery', 'arctic'], true, 1, 'published'),
  ('a2222222-2222-2222-2222-222222222222', 'dev-tenant', 'City Lights', 'Follow three interconnected stories unfolding across one night in a bustling metropolis.', 'drama', ARRAY['urban', 'anthology', 'night'], true, 2, 'published'),
  ('a3333333-3333-3333-3333-333333333333', 'dev-tenant', 'Behind the Curtain', 'A documentary series exploring the hidden world of independent theater.', 'documentary', ARRAY['theater', 'arts', 'indie'], false, 3, 'published'),
  ('a4444444-4444-4444-4444-444444444444', 'dev-tenant', 'Echoes', 'A psychological thriller where memories may not be what they seem.', 'drama', ARRAY['psychological', 'thriller', 'memory'], false, 4, 'draft');

-- ============================================================
-- Seasons
-- ============================================================
INSERT INTO public.seasons (id, tenant_id, series_id, number, title)
VALUES
  -- The Last Signal: 2 seasons
  ('b1111111-1111-1111-1111-111111111111', 'dev-tenant', 'a1111111-1111-1111-1111-111111111111', 1, 'The Broadcast'),
  ('b1111111-1111-1111-1111-222222222222', 'dev-tenant', 'a1111111-1111-1111-1111-111111111111', 2, 'The Source'),
  -- City Lights: 1 season
  ('b2222222-2222-2222-2222-111111111111', 'dev-tenant', 'a2222222-2222-2222-2222-222222222222', 1, NULL),
  -- Behind the Curtain: 1 season
  ('b3333333-3333-3333-3333-111111111111', 'dev-tenant', 'a3333333-3333-3333-3333-333333333333', 1, NULL);

-- ============================================================
-- Episodes
-- ============================================================
INSERT INTO public.episodes (id, tenant_id, season_id, title, description, mux_asset_status, duration_seconds, "order", is_free)
VALUES
  -- The Last Signal S1
  ('c1111111-0001-0001-0001-000000000001', 'dev-tenant', 'b1111111-1111-1111-1111-111111111111', 'Static', 'The first signal arrives.', 'ready', 2700, 1, true),
  ('c1111111-0001-0001-0001-000000000002', 'dev-tenant', 'b1111111-1111-1111-1111-111111111111', 'Frequency', 'The pattern becomes clear.', 'ready', 2850, 2, false),
  ('c1111111-0001-0001-0001-000000000003', 'dev-tenant', 'b1111111-1111-1111-1111-111111111111', 'Coordinates', 'A location is revealed.', 'ready', 3000, 3, false),
  -- The Last Signal S2
  ('c1111111-0002-0001-0001-000000000001', 'dev-tenant', 'b1111111-1111-1111-1111-222222222222', 'Return', 'Back to the station.', 'ready', 2900, 1, false),
  ('c1111111-0002-0001-0001-000000000002', 'dev-tenant', 'b1111111-1111-1111-1111-222222222222', 'Decoded', 'The message is finally understood.', 'ready', 3100, 2, false),
  -- City Lights S1
  ('c2222222-0001-0001-0001-000000000001', 'dev-tenant', 'b2222222-2222-2222-2222-111111111111', 'Dusk', 'The night begins.', 'ready', 3200, 1, true),
  ('c2222222-0001-0001-0001-000000000002', 'dev-tenant', 'b2222222-2222-2222-2222-111111111111', 'Midnight', 'Paths cross.', 'ready', 3000, 2, false),
  ('c2222222-0001-0001-0001-000000000003', 'dev-tenant', 'b2222222-2222-2222-2222-111111111111', 'Dawn', 'Everything converges.', 'ready', 3400, 3, false),
  -- Behind the Curtain S1
  ('c3333333-0001-0001-0001-000000000001', 'dev-tenant', 'b3333333-3333-3333-3333-111111111111', 'Opening Night', 'The magic of first performances.', 'ready', 2400, 1, true),
  ('c3333333-0001-0001-0001-000000000002', 'dev-tenant', 'b3333333-3333-3333-3333-111111111111', 'Rehearsal', 'Where the real work happens.', 'ready', 2600, 2, false);
