-- T1.02: Create series table

CREATE TABLE IF NOT EXISTS public.series (
  id                      UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id               TEXT        NOT NULL REFERENCES public.tenants(id),
  title                   TEXT        NOT NULL,
  description             TEXT,
  thumbnail_playback_id   TEXT,
  category                TEXT        NOT NULL,
  tags                    TEXT[]      DEFAULT '{}',
  is_featured             BOOLEAN     NOT NULL DEFAULT false,
  sort_order              INTEGER     NOT NULL DEFAULT 0,
  status                  TEXT        NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.series ENABLE ROW LEVEL SECURITY;
