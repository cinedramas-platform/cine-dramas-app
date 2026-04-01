-- T1.02: Create episodes table

CREATE TABLE IF NOT EXISTS public.episodes (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         TEXT        NOT NULL REFERENCES public.tenants(id),
  season_id         UUID        NOT NULL REFERENCES public.seasons(id) ON DELETE CASCADE,
  title             TEXT        NOT NULL,
  description       TEXT,
  mux_playback_id   TEXT,
  mux_asset_id      TEXT,
  mux_asset_status  TEXT        NOT NULL DEFAULT 'pending' CHECK (mux_asset_status IN ('pending', 'preparing', 'ready', 'errored')),
  duration_seconds  INTEGER,
  "order"           INTEGER     NOT NULL,
  is_free           BOOLEAN     NOT NULL DEFAULT false,
  subtitle_url      TEXT,
  thumbnail_time    FLOAT       DEFAULT 0,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.episodes ENABLE ROW LEVEL SECURITY;
