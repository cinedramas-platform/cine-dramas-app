-- T1.02: Create tenants table
-- Tenants are the root entity. Every other table references tenant_id.

CREATE TABLE IF NOT EXISTS public.tenants (
  id                        TEXT        PRIMARY KEY,
  name                      TEXT        NOT NULL,
  mode                      TEXT        NOT NULL CHECK (mode IN ('hub', 'silo')),
  status                    TEXT        NOT NULL DEFAULT 'active' CHECK (status IN ('onboarding', 'active', 'suspended')),
  mux_env_key               TEXT        NOT NULL,
  mux_signing_key_id        TEXT,
  mux_signing_private_key   TEXT,
  revenuecat_api_key        TEXT        NOT NULL,
  revenuecat_webhook_secret TEXT,
  supabase_url              TEXT,
  supabase_anon_key         TEXT,
  theme_config              JSONB       NOT NULL DEFAULT '{}',
  feature_flags             JSONB       NOT NULL DEFAULT '{}',
  home_rails_order          TEXT[]      DEFAULT ARRAY['continue_watching', 'featured', 'categories'],
  legal_urls                JSONB       NOT NULL DEFAULT '{}',
  firebase_project_id       TEXT,
  created_at                TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;
