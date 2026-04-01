-- T1.02: Create seasons table

CREATE TABLE IF NOT EXISTS public.seasons (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   TEXT        NOT NULL REFERENCES public.tenants(id),
  series_id   UUID        NOT NULL REFERENCES public.series(id) ON DELETE CASCADE,
  number      INTEGER     NOT NULL,
  title       TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE (tenant_id, series_id, number)
);

ALTER TABLE public.seasons ENABLE ROW LEVEL SECURITY;
