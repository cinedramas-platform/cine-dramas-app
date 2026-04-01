-- T1.02: Create entitlements table
-- One entitlement per user per tenant.

CREATE TABLE IF NOT EXISTS public.entitlements (
  id                        UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id                 TEXT        NOT NULL REFERENCES public.tenants(id),
  user_id                   UUID        NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  tier                      TEXT        NOT NULL DEFAULT 'free' CHECK (tier IN ('free', 'premium', 'vip')),
  expires_at                TIMESTAMPTZ,
  revenuecat_subscriber_id  TEXT,
  store_product_id          TEXT,
  created_at                TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE (tenant_id, user_id)
);

ALTER TABLE public.entitlements ENABLE ROW LEVEL SECURITY;
