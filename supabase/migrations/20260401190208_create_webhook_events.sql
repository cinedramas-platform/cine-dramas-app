-- T1.02: Create webhook_events table
-- Idempotency key prevents duplicate processing.

CREATE TABLE IF NOT EXISTS public.webhook_events (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       TEXT        NOT NULL,
  source          TEXT        NOT NULL CHECK (source IN ('mux', 'revenuecat')),
  event_type      TEXT        NOT NULL,
  payload         JSONB       NOT NULL,
  idempotency_key TEXT        NOT NULL UNIQUE,
  processed_at    TIMESTAMPTZ,
  error_message   TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.webhook_events ENABLE ROW LEVEL SECURITY;
