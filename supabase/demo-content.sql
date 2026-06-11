-- Demo catalog expansion (MVP P3).
-- Adds 4 series in the classic short-drama register so the home feed, mood
-- grid, and category rails look like a real product. New episodes REUSE the
-- existing ready Mux assets (no new uploads); posters are Mux thumbnails at
-- distinct time offsets so every series reads visually distinct.
-- Idempotent: safe to run more than once.

-- ============================================================
-- Series
-- ============================================================
INSERT INTO public.series (id, tenant_id, title, description, thumbnail_playback_id, poster_url, category, tags, is_featured, sort_order, status)
VALUES
  ('a5555555-5555-5555-5555-555555555555', 'dev-tenant', 'Contracted to the CEO',
   'She signed for ninety days. He never planned on clause forty-seven: falling first.',
   'Q6Fi7qg02HBytQ01luVTsjFQT00T2zXxcd7pUXu5UIeHEg',
   'https://image.mux.com/Q6Fi7qg02HBytQ01luVTsjFQT00T2zXxcd7pUXu5UIeHEg/thumbnail.png?time=128&width=600&height=900&fit_mode=smartcrop',
   'drama', ARRAY['forbidden', 'billionaire', 'contract'], true, 5, 'published'),
  ('a6666666-6666-6666-6666-666666666666', 'dev-tenant', 'The Midnight Witness',
   'She saw everything from the balcony. Now the city''s most dangerous man knows her name.',
   'qpTRiqpl1ZoxR00W2IqWjPVCU92ADYOGIhOsO5DqJk01M',
   'https://image.mux.com/qpTRiqpl1ZoxR00W2IqWjPVCU92ADYOGIhOsO5DqJk01M/thumbnail.png?time=71&width=600&height=900&fit_mode=smartcrop',
   'thriller', ARRAY['twisty', 'late-night thriller', 'whodunit'], true, 6, 'published'),
  ('a7777777-7777-7777-7777-777777777777', 'dev-tenant', 'Vows of Vengeance',
   'Left at the altar and erased from the will. Five years later she buys the company — and the groom.',
   '02hkTa00V1bidQnbYmRowORsNXF1Pa00REDYaEUdkCMs900',
   'https://image.mux.com/02hkTa00V1bidQnbYmRowORsNXF1Pa00REDYaEUdkCMs900/thumbnail.png?time=201&width=600&height=900&fit_mode=smartcrop',
   'revenge', ARRAY['revenge', 'heiress', 'soap'], false, 7, 'published'),
  ('a8888888-8888-8888-8888-888888888888', 'dev-tenant', 'The Heiress Returns',
   'Presumed dead for a decade, she walks into the reading of her own will.',
   '5uw6wpup02nUdXB00c5s01oJlzelwVLGZ01SuqnBAmtSKhM',
   'https://image.mux.com/5uw6wpup02nUdXB00c5s01oJlzelwVLGZ01SuqnBAmtSKhM/thumbnail.png?time=95&width=600&height=900&fit_mode=smartcrop',
   'mystery', ARRAY['heartbreak', 'family secrets', 'mystery'], false, 8, 'published')
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- Seasons
-- ============================================================
INSERT INTO public.seasons (id, tenant_id, series_id, number, title)
VALUES
  ('b5555555-5555-5555-5555-111111111111', 'dev-tenant', 'a5555555-5555-5555-5555-555555555555', 1, NULL),
  ('b6666666-6666-6666-6666-111111111111', 'dev-tenant', 'a6666666-6666-6666-6666-666666666666', 1, NULL),
  ('b7777777-7777-7777-7777-111111111111', 'dev-tenant', 'a7777777-7777-7777-7777-777777777777', 1, NULL),
  ('b8888888-8888-8888-8888-111111111111', 'dev-tenant', 'a8888888-8888-8888-8888-888888888888', 1, NULL)
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- Episodes — mux fields copied from existing ready episodes so signed
-- playback ids keep working without touching the Mux account.
-- ============================================================
INSERT INTO public.episodes
  (id, tenant_id, season_id, title, description, mux_playback_id, mux_asset_id, mux_signed_playback_id, mux_asset_status, duration_seconds, thumbnail_time, "order", is_free, coin_cost)
SELECT v.id::uuid, 'dev-tenant', v.season_id::uuid, v.title, v.description,
       e.mux_playback_id, e.mux_asset_id, e.mux_signed_playback_id, e.mux_asset_status,
       e.duration_seconds, v.thumb_time, v.ord, v.is_free, v.coin_cost
FROM (VALUES
  -- Contracted to the CEO
  ('c5555555-0001-0001-0001-000000000001', 'b5555555-5555-5555-5555-111111111111', 'The Ninety-Day Clause', 'A contract marriage with one rule: no feelings.', 'c1111111-0001-0001-0001-000000000002', 30.0, 1, true,  0),
  ('c5555555-0001-0001-0001-000000000002', 'b5555555-5555-5555-5555-111111111111', 'Clause Forty-Seven',    'The board suspects. The tabloids know.',          'c1111111-0001-0001-0001-000000000003', 95.0, 2, false, 80),
  ('c5555555-0001-0001-0001-000000000003', 'b5555555-5555-5555-5555-111111111111', 'The Press Conference',  'One question ruins everything.',                  'c2222222-0001-0001-0001-000000000003', 140.0, 3, false, 80),
  -- The Midnight Witness
  ('c6666666-0001-0001-0001-000000000001', 'b6666666-6666-6666-6666-111111111111', 'The Balcony',           'Eleven floors up, she sees what no one should.',  'c2222222-0001-0001-0001-000000000002', 20.0, 1, true,  0),
  ('c6666666-0001-0001-0001-000000000002', 'b6666666-6666-6666-6666-111111111111', 'Do Not Answer',         'An unknown number. A familiar voice.',            'c4444444-0001-0001-0001-000000000002', 110.0, 2, false, 60),
  -- Vows of Vengeance
  ('c7777777-0001-0001-0001-000000000001', 'b7777777-7777-7777-7777-111111111111', 'The Empty Altar',       'Two hundred guests watch her world end.',         'c4444444-0001-0001-0001-000000000001', 45.0, 1, true,  0),
  ('c7777777-0001-0001-0001-000000000002', 'b7777777-7777-7777-7777-111111111111', 'Hostile Takeover',      'She owns fifty-one percent of his future.',       'c3333333-0001-0001-0001-000000000002', 88.0, 2, false, 80),
  ('c7777777-0001-0001-0001-000000000003', 'b7777777-7777-7777-7777-111111111111', 'The Second Wedding',    'Same church. Different bride. Her rules.',        'c1111111-0001-0001-0001-000000000001', 60.0, 3, false, 120),
  -- The Heiress Returns
  ('c8888888-0001-0001-0001-000000000001', 'b8888888-8888-8888-8888-111111111111', 'The Reading of the Will', 'A dead woman objects from the back row.',       'c3333333-0001-0001-0001-000000000001', 33.0, 1, true,  0),
  ('c8888888-0001-0001-0001-000000000002', 'b8888888-8888-8888-8888-111111111111', 'Ten Years Gone',        'Where she was is worse than why she left.',       'c2222222-0001-0001-0001-000000000001', 77.0, 2, false, 60)
) AS v(id, season_id, title, description, source_episode_id, thumb_time, ord, is_free, coin_cost)
JOIN public.episodes e ON e.id = v.source_episode_id::uuid
ON CONFLICT (id) DO NOTHING;

-- Give the original four series proper coin pricing if they still sit on the
-- blanket default (first episode free, rest priced).
UPDATE public.episodes SET coin_cost = 0 WHERE is_free = true AND coin_cost <> 0;
