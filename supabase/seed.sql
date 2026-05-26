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
INSERT INTO public.series (id, tenant_id, title, description, thumbnail_playback_id, category, tags, is_featured, sort_order, status)
VALUES
  ('a1111111-1111-1111-1111-111111111111', 'dev-tenant', 'A Paris Proposal', 'A whirlwind romance unfolds in the City of Light when two strangers keep crossing paths across Paris.', 'Q3fybUQ6ABSrL00KAOQttuSX01I8MrnXp13aEUdBffLBc', 'romance', ARRAY['romance', 'paris', 'travel'], true, 1, 'published'),
  ('a2222222-2222-2222-2222-222222222222', 'dev-tenant', 'Love''s Greek to Me', 'A romantic comedy set on the sun-drenched islands of Greece, where love gets lost in translation.', '1A3wJJrug4tMWb002sstDL39IO8J02idsweNxg3AnWX2o', 'comedy', ARRAY['comedy', 'romance', 'greece'], true, 2, 'published'),
  ('a3333333-3333-3333-3333-333333333333', 'dev-tenant', 'An American Austein', 'A modern retelling of classic courtship, where pride, prejudice, and progress collide across the Atlantic.', 'HyBJTQlP9nF01bGa202WLYjx601Hz0000rwS2a2OxlvsiNNY', 'drama', ARRAY['drama', 'period', 'romance'], true, 3, 'published'),
  ('a4444444-4444-4444-4444-444444444444', 'dev-tenant', 'Very Venice Romance', 'A chance encounter on the canals of Venice leads to an unforgettable love story behind the masks of Carnevale.', 'rgWMkmU6oUIQHhzlYRdHXWBIEmXOsk01SDHRamDEKEis', 'romance', ARRAY['romance', 'venice', 'italy'], false, 4, 'published');

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
  ('c1111111-0001-0001-0001-000000000001', 'dev-tenant', 'b1111111-1111-1111-1111-111111111111', 'The Encounter', 'An unexpected meeting at a Parisian café.', 'Q3fybUQ6ABSrL00KAOQttuSX01I8MrnXp13aEUdBffLBc', 'QbqU01XoVa802INpCa9qwQLFJi002HvLlLrf1PcnwvOKCM', 'ready', 202, 1, true),
  ('c1111111-0001-0001-0001-000000000002', 'dev-tenant', 'b1111111-1111-1111-1111-111111111111', 'City of Light', 'Romance blooms along the Seine.', '1018Nx7e3rPHzQbbORpgT7LzMdwRGVYwtAf2wA01JEcd4', 'Ru2h00mGJ7d3rxhKdTwNxUPQPmHVoyTY5ZZuhNXFwcyM', 'ready', 254, 2, false),
  ('c1111111-0001-0001-0001-000000000003', 'dev-tenant', 'b1111111-1111-1111-1111-111111111111', 'The Proposal', 'A grand gesture under the Eiffel Tower.', 'GUU7GeH4dYKdgapc6WzLWuGXE4hH0102vvWaBu01r2oyoM', '9czHJj7E00lBJ00OoB3OjqkPOimZ7smpKlmXaKEgI4A2M', 'ready', 250, 3, false),
  -- Love's Greek to Me S1
  ('c2222222-0001-0001-0001-000000000001', 'dev-tenant', 'b2222222-2222-2222-2222-111111111111', 'Arrival in Santorini', 'A fresh start on a sun-drenched island.', '1A3wJJrug4tMWb002sstDL39IO8J02idsweNxg3AnWX2o', '53vQxIc1VVUUBQkxqeI16R2DpqxIeUU1Uaqcno7FG2E', 'ready', 193, 1, true),
  ('c2222222-0001-0001-0001-000000000002', 'dev-tenant', 'b2222222-2222-2222-2222-111111111111', 'Lost in Translation', 'Cultural clashes spark unexpected chemistry.', 'iq3gP4glDGGJ3Yke9aTMRp9TE9NPVMKYnQtwp5ConKE', 'zcEC01OfmnAm8fqF4tQ6cfdZhcsb02ifQKLKsYd4MPQwk', 'ready', 138, 2, false),
  ('c2222222-0001-0001-0001-000000000003', 'dev-tenant', 'b2222222-2222-2222-2222-111111111111', 'Under the Stars', 'A magical evening changes everything.', 'CDNF01zJ3gcSzIJjoN2gOJ2uFTipfG1qf6uTADG2E01hM', '756xHoD3dZOVL8xc5xAa02YJY202ZxyyJxRi5cweQz1sc', 'ready', 258, 3, false),
  -- An American Austein S1
  ('c3333333-0001-0001-0001-000000000001', 'dev-tenant', 'b3333333-3333-3333-3333-111111111111', 'First Impressions', 'A modern take on classic courtship.', 'HyBJTQlP9nF01bGa202WLYjx601Hz0000rwS2a2OxlvsiNNY', 'gbu56PMJzxbXWaqwE2znAcQP02s8hxCyKj1kL4ix15uw', 'ready', 188, 1, true),
  ('c3333333-0001-0001-0001-000000000002', 'dev-tenant', 'b3333333-3333-3333-3333-111111111111', 'Pride and Progress', 'Overcoming differences to find true love.', 'Tr9DdHazohlmAHhfAFZrapV58GiV1mwZbkwPmePkqvs', 'oS31Fw2HsojOBtiIvrtcPmAFuxTMIS9dfHGVMJqr5sc', 'ready', 184, 2, false),
  -- Very Venice Romance S1
  ('c4444444-0001-0001-0001-000000000001', 'dev-tenant', 'b4444444-4444-4444-4444-111111111111', 'The Gondolier''s Song', 'A chance encounter on the Venetian canals.', 'rgWMkmU6oUIQHhzlYRdHXWBIEmXOsk01SDHRamDEKEis', '6DhOGGQWX01DwRuHIUvR025PCufZXt3g0000Wt3t01JF9ZsI', 'ready', 299, 1, true),
  ('c4444444-0001-0001-0001-000000000002', 'dev-tenant', 'b4444444-4444-4444-4444-111111111111', 'Masquerade', 'Behind the masks, true feelings emerge.', 'j023HankqedJFLUMp94NFpVlbr00ms64dmDGLN4G9lZlE', '2IX9T01gg02WTvy43JTxzfGj01dcKosZcEnJY8e01Ni101O00', 'ready', 257, 2, false);
