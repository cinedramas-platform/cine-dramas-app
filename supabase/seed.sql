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
  ('a1111111-1111-1111-1111-111111111111', 'dev-tenant', 'A Paris Proposal', 'A whirlwind romance unfolds in the City of Light when two strangers keep crossing paths across Paris.', 'V1QNh5T7OB5UTN02LlX4j1Z9fstLjGb2WMOm3u7ndYPo', 'https://image.mux.com/V1QNh5T7OB5UTN02LlX4j1Z9fstLjGb2WMOm3u7ndYPo/thumbnail.png?time=12&width=600&height=900&fit_mode=smartcrop', 'romance', ARRAY['romance', 'paris', 'travel'], true, 1, 'published'),
  ('a2222222-2222-2222-2222-222222222222', 'dev-tenant', 'Love''s Greek to Me', 'A romantic comedy set on the sun-drenched islands of Greece, where love gets lost in translation.', 'Zfra93hdUL00rdrK8QUlOUgSzUt1sw8jeKiEJzQ3kk9U', 'https://image.mux.com/Zfra93hdUL00rdrK8QUlOUgSzUt1sw8jeKiEJzQ3kk9U/thumbnail.png?time=40&width=600&height=900&fit_mode=smartcrop', 'comedy', ARRAY['comedy', 'romance', 'greece'], true, 2, 'published'),
  ('a3333333-3333-3333-3333-333333333333', 'dev-tenant', 'An American in Austen', 'A modern retelling of classic courtship, where pride, prejudice, and progress collide across the Atlantic.', 'oCtrpPyxeIygEedPA75jrwiLhbrFAFQNDqgQhqfa1WA', 'https://image.mux.com/oCtrpPyxeIygEedPA75jrwiLhbrFAFQNDqgQhqfa1WA/thumbnail.png?time=25&width=600&height=900&fit_mode=smartcrop', 'drama', ARRAY['drama', 'period', 'romance'], true, 3, 'published'),
  ('a4444444-4444-4444-4444-444444444444', 'dev-tenant', 'Very Venice Romance', 'A chance encounter on the canals of Venice leads to an unforgettable love story behind the masks of Carnevale.', 'TSFAqbxDyKb3001VPnSHVP4ZZQL1pBYaivVuD01dUX8ls', 'https://image.mux.com/TSFAqbxDyKb3001VPnSHVP4ZZQL1pBYaivVuD01dUX8ls/thumbnail.png?time=30&width=600&height=900&fit_mode=smartcrop', 'romance', ARRAY['romance', 'venice', 'italy'], false, 4, 'published');

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
INSERT INTO public.episodes (id, tenant_id, season_id, title, description, mux_playback_id, mux_asset_id, mux_signed_playback_id, mux_asset_status, duration_seconds, "order", is_free)
VALUES
  -- A Paris Proposal S1
  ('c1111111-0001-0001-0001-000000000001', 'dev-tenant', 'b1111111-1111-1111-1111-111111111111', 'The Encounter', 'An unexpected meeting at a Parisian café.', 'V1QNh5T7OB5UTN02LlX4j1Z9fstLjGb2WMOm3u7ndYPo', 'bOyBP8t1pVmOYQxuZtL9jsfdRC3AL8K1X7XCKkfgW9M', 'Omiiw4vCC2OE3wEgxXxEMQkFINnVshh9gwuTQKxp02BU', 'ready', 202, 1, true),
  ('c1111111-0001-0001-0001-000000000002', 'dev-tenant', 'b1111111-1111-1111-1111-111111111111', 'City of Light', 'Romance blooms along the Seine.', 'c700Gpsk6AoTSkfTffFTceoJqsx7601o400vWt8az2yvoc', 'CDaUBq7NNH2JOKnENSPTRSRXXK1Htxy005bSHSXf1GMk', 'pW3JS4lX008CMOeV34eJvyAybmmGj00uJPh018u72sE1JQ', 'ready', 254, 2, false),
  ('c1111111-0001-0001-0001-000000000003', 'dev-tenant', 'b1111111-1111-1111-1111-111111111111', 'The Proposal', 'A grand gesture under the Eiffel Tower.', 'cDXbq01PXb011XRBPXLsYIkYSrtXHzfjnZF233pan1OkY', 'NfyExdV3hjHws14irLg8A4M7dH6iEpomJLdw9P9N6AQ', 'gqux01CtWonRtrkvFeUaYAEvLU4HsJLmIDDon1zlx43I', 'ready', 250, 3, false),
  -- Love's Greek to Me S1
  ('c2222222-0001-0001-0001-000000000001', 'dev-tenant', 'b2222222-2222-2222-2222-111111111111', 'Arrival in Santorini', 'A fresh start on a sun-drenched island.', 'Zfra93hdUL00rdrK8QUlOUgSzUt1sw8jeKiEJzQ3kk9U', 'OxJqNaexQiFX4ZVjzPUXKZp4vhIC1HBZ2JuJPr018ujQ', 'Lb3e3m7MIOXPWaabz5X2y789xE003RGmGbPjbQdWDEc4', 'ready', 193, 1, true),
  ('c2222222-0001-0001-0001-000000000002', 'dev-tenant', 'b2222222-2222-2222-2222-111111111111', 'Lost in Translation', 'Cultural clashes spark unexpected chemistry.', 'XtrGA6BbsSy9ta02QOcX02v1PvTepNUEBNP7KeMGPc934', 'cO2HHS02w00mKpKqZUsV9M5FREQgKGLWEO6T6RehdN5hQ', '01ewBP1c500nhAf1MTNZd2KayaEWAq4nW8R55vn2GtKdE', 'ready', 138, 2, false),
  ('c2222222-0001-0001-0001-000000000003', 'dev-tenant', 'b2222222-2222-2222-2222-111111111111', 'Under the Stars', 'A magical evening changes everything.', 'JuUA2xXf63F4L4c3PRvV00WOVuG4icFyyil6gRvFCVeA', 'KdxIKIuFXTW1W7S02myPizjyBmstQzx4xAvIcAiHM5fc', 'r4PrpHAEuEiz00sYJrYfKBM8BYSGUKKS83rgR4M4IZdw', 'ready', 258, 3, false),
  -- An American Austein S1
  ('c3333333-0001-0001-0001-000000000001', 'dev-tenant', 'b3333333-3333-3333-3333-111111111111', 'First Impressions', 'A modern take on classic courtship.', 'oCtrpPyxeIygEedPA75jrwiLhbrFAFQNDqgQhqfa1WA', '4W2QOjq9pNV4kguuR4CDyO02fSoJVl67rEjUvDTj02ELs', 'VBl7EfrGaNUpfLrDbi7BjkYXsfSk85k9gAB4AeMAj9o', 'ready', 188, 1, true),
  ('c3333333-0001-0001-0001-000000000002', 'dev-tenant', 'b3333333-3333-3333-3333-111111111111', 'Pride and Progress', 'Overcoming differences to find true love.', 'yRHwR2UtjUmz1rtW004vciP4H02SWNdKVb5Xo3c6R21Mc', 'slV1HON7z6gpMwrE6laB5zLoxKE702a8BEq00ovbS8Dl4', 'R00MVpV3OwcpQ979CC002xMmPS6IW3HSE9XeS501slctnU', 'ready', 184, 2, false),
  -- Very Venice Romance S1
  ('c4444444-0001-0001-0001-000000000001', 'dev-tenant', 'b4444444-4444-4444-4444-111111111111', 'The Gondolier''s Song', 'A chance encounter on the Venetian canals.', 'TSFAqbxDyKb3001VPnSHVP4ZZQL1pBYaivVuD01dUX8ls', 'XrX1AK5fyB12YZjX4kxke2zHDbfjGTJtsfbHNULQ3JU', 'x5QVJ9901AyuF22nWceBvRM4xUQg173aV7ANCDPOc7Bs', 'ready', 299, 1, true),
  ('c4444444-0001-0001-0001-000000000002', 'dev-tenant', 'b4444444-4444-4444-4444-111111111111', 'Masquerade', 'Behind the masks, true feelings emerge.', 'vgI02uIaX56hfGF01tIVt8LfuoXyiVI8cSJjoc6nrcNDk', '7B5MP3XHBvY1Vc00RWJ9GkW87Se02bgSMGdMapgi01cEus', '001WaIczHxWKDLZLxMbw0219lyFUTlpkn2wUYw59m7WIY', 'ready', 257, 2, false);
