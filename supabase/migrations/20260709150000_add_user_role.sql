-- Adds a role to users so producer access to the portal stops depending on
-- the PORTAL_PRODUCER_EMAILS env allowlist. Portal edge functions
-- (supabase/functions/_shared/producer.ts) treat 'producer' and 'admin' as
-- portal producers; the env allowlist remains a fallback until every
-- environment has this migration applied.
--
-- Promote an account with:
--   UPDATE public.users SET role = 'producer' WHERE email = '...';

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'viewer'
  CHECK (role IN ('viewer', 'producer', 'admin'));

COMMENT ON COLUMN public.users.role IS
  'viewer = consumer app user; producer/admin = portal (CRM) access';
