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
INSERT INTO public.series (id, tenant_id, title, description, thumbnail_playback_id, poster_url, category, tags, is_featured, sort_order, status)
VALUES
  ('a1111111-1111-1111-1111-111111111111', 'dev-tenant', 'A Paris Proposal', 'A whirlwind romance unfolds in the City of Light when two strangers keep crossing paths across Paris.', 'slzJlfCMJmms1jT6SYdFp6283JL01MSi00B6sYf9EKx2s', 'https://kkjjbjrebeoekindsihw.supabase.co/storage/v1/object/public/posters/a-paris-proposal.webp', 'romance', ARRAY['romance', 'paris', 'travel'], true, 1, 'published'),
  ('a2222222-2222-2222-2222-222222222222', 'dev-tenant', 'Love''s Greek to Me', 'A romantic comedy set on the sun-drenched islands of Greece, where love gets lost in translation.', 'QJnfcyZqFd5l69lo9lS9nFs3FlQksrbjFG102TG01taFo', 'https://kkjjbjrebeoekindsihw.supabase.co/storage/v1/object/public/posters/loves-greek-to-me.png', 'comedy', ARRAY['comedy', 'romance', 'greece'], true, 2, 'published'),
  ('a3333333-3333-3333-3333-333333333333', 'dev-tenant', 'An American in Austen', 'A modern retelling of classic courtship, where pride, prejudice, and progress collide across the Atlantic.', '5uw6wpup02nUdXB00c5s01oJlzelwVLGZ01SuqnBAmtSKhM', 'https://kkjjbjrebeoekindsihw.supabase.co/storage/v1/object/public/posters/an-american-in-austen.jpg', 'drama', ARRAY['drama', 'period', 'romance'], true, 3, 'published'),
  ('a4444444-4444-4444-4444-444444444444', 'dev-tenant', 'Very Venice Romance', 'A chance encounter on the canals of Venice leads to an unforgettable love story behind the masks of Carnevale.', '02hkTa00V1bidQnbYmRowORsNXF1Pa00REDYaEUdkCMs900', 'https://kkjjbjrebeoekindsihw.supabase.co/storage/v1/object/public/posters/very-venice-romance.png', 'romance', ARRAY['romance', 'venice', 'italy'], false, 4, 'published');

-- ============================================================
-- Seasons
-- ============================================================
INSERT INTO public.seasons (id, tenant_id, series_id, number, title)
VALUES
  -- A Paris Proposal: 1 season
  ('b1111111-1111-1111-1111-111111111111', 'dev-tenant', 'a1111111-1111-1111-1111-111111111111', 1, NULL),
  -- Love's Greek to Me: 1 season
  ('b2222222-2222-2222-2222-111111111111', 'dev-tenant', 'a2222222-2222-2222-2222-222222222222', 1, NULL),
  -- An American Austein: 1 season
  ('b3333333-3333-3333-3333-111111111111', 'dev-tenant', 'a3333333-3333-3333-3333-333333333333', 1, NULL),
  -- Very Venice Romance: 1 season
  ('b4444444-4444-4444-4444-111111111111', 'dev-tenant', 'a4444444-4444-4444-4444-444444444444', 1, NULL);

-- ============================================================
-- Episodes
-- ============================================================
INSERT INTO public.episodes (id, tenant_id, season_id, title, description, mux_playback_id, mux_asset_id, mux_asset_status, duration_seconds, "order", is_free)
VALUES
  -- A Paris Proposal S1
  ('c1111111-0001-0001-0001-000000000001', 'dev-tenant', 'b1111111-1111-1111-1111-111111111111', 'The Encounter', 'An unexpected meeting at a Parisian café.', 'slzJlfCMJmms1jT6SYdFp6283JL01MSi00B6sYf9EKx2s', '00VKHEKuOSF8fkJLRKVPPd01k9jGWiB01v2y01KjSRjsK4g', 'ready', 202, 1, true),
  ('c1111111-0001-0001-0001-000000000002', 'dev-tenant', 'b1111111-1111-1111-1111-111111111111', 'City of Light', 'Romance blooms along the Seine.', 'Q6Fi7qg02HBytQ01luVTsjFQT00T2zXxcd7pUXu5UIeHEg', 'H00ABTDkaadCbr4WK01JLAxG11Y2Nro7uOGAIMwoxTgIs', 'ready', 253, 2, false),
  ('c1111111-0001-0001-0001-000000000003', 'dev-tenant', 'b1111111-1111-1111-1111-111111111111', 'The Proposal', 'A grand gesture under the Eiffel Tower.', 'qJO6rxZ1jo01B02Bi1TLP0075gewaYm17XIAEqgoJ3H602w', 'gfRhVeAgHnD3rKL01UkCSTmkcES29FN6TPknV5Rvxcvc', 'ready', 250, 3, false),
  -- Love's Greek to Me S1
  ('c2222222-0001-0001-0001-000000000001', 'dev-tenant', 'b2222222-2222-2222-2222-111111111111', 'Arrival in Santorini', 'A fresh start on a sun-drenched island.', 'QJnfcyZqFd5l69lo9lS9nFs3FlQksrbjFG102TG01taFo', 'TvntN5xFzZzAR7j14SIeWLn5XF02flR3VZY2OG24GC9U', 'ready', 193, 1, true),
  ('c2222222-0001-0001-0001-000000000002', 'dev-tenant', 'b2222222-2222-2222-2222-111111111111', 'Lost in Translation', 'Cultural clashes spark unexpected chemistry.', 'qpTRiqpl1ZoxR00W2IqWjPVCU92ADYOGIhOsO5DqJk01M', 'BPZBshmMRDRFVVFejWE8KffuuynIY48TsCLYXkk01GfM', 'ready', 138, 2, false),
  ('c2222222-0001-0001-0001-000000000003', 'dev-tenant', 'b2222222-2222-2222-2222-111111111111', 'Under the Stars', 'A magical evening changes everything.', 'dGcDpmdtAYfXzmDSu75k1v7iTx02FWWucatu7bVyWOCk', 'dmtEn102fO2Ng01101qcMcg85v71il14RHoY01HBzyAmrfw', 'ready', 258, 3, false),
  -- An American Austein S1
  ('c3333333-0001-0001-0001-000000000001', 'dev-tenant', 'b3333333-3333-3333-3333-111111111111', 'First Impressions', 'A modern take on classic courtship.', '5uw6wpup02nUdXB00c5s01oJlzelwVLGZ01SuqnBAmtSKhM', 'KEYPZX9tcdP79c6wj5CGmT6b3Cm2wKIykZhfl8tpRyA', 'ready', 188, 1, true),
  ('c3333333-0001-0001-0001-000000000002', 'dev-tenant', 'b3333333-3333-3333-3333-111111111111', 'Pride and Progress', 'Overcoming differences to find true love.', 'FwZFrR3O9vSGyE4yBnlBAf0001SjSFMaWz3d2ISFNRZNY', 'xYffaYpn702yEseK02T00C2LKkzEpcf1s4ZytlRSfZz02pw', 'ready', 184, 2, false),
  -- Very Venice Romance S1
  ('c4444444-0001-0001-0001-000000000001', 'dev-tenant', 'b4444444-4444-4444-4444-111111111111', 'The Gondolier''s Song', 'A chance encounter on the Venetian canals.', '02hkTa00V1bidQnbYmRowORsNXF1Pa00REDYaEUdkCMs900', 'rgh5L15asAXh9osW2yjrYv8X8n4wMd8qBquSe3H1YJY', 'ready', 299, 1, true),
  ('c4444444-0001-0001-0001-000000000002', 'dev-tenant', 'b4444444-4444-4444-4444-111111111111', 'Masquerade', 'Behind the masks, true feelings emerge.', 'Sb3aCsPj8FsQVfqM4EZqV01qsuvsIcujdRjLj5P3fFBs', 'FNSXBmorHpdQNSM6X4vydB4Z9VC6Ope2RciwRP72URk', 'ready', 257, 2, false);
