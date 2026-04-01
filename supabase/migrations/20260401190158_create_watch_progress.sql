-- T1.02: Create watch_progress table
-- UPSERT target: (tenant_id, user_id, episode_id)

CREATE TABLE IF NOT EXISTS public.watch_progress (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         TEXT        NOT NULL REFERENCES public.tenants(id),
  user_id           UUID        NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  episode_id        UUID        NOT NULL REFERENCES public.episodes(id) ON DELETE CASCADE,
  position_seconds  INTEGER     NOT NULL DEFAULT 0,
  completed         BOOLEAN     NOT NULL DEFAULT false,
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE (tenant_id, user_id, episode_id)
);

ALTER TABLE public.watch_progress ENABLE ROW LEVEL SECURITY;
