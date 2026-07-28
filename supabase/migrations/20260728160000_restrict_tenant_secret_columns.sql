-- SECURITY FIX — tenant secrets were readable by any authenticated user.
--
-- Discovered 2026-07-28 against the live dev project: the `tenant_select_own`
-- RLS policy (20260401190222) grants SELECT on the *row*, and RLS has no column
-- granularity, so `GET /rest/v1/tenants?select=*` with any user's JWT returned
-- `mux_signing_private_key` in full (1588 chars).
--
-- Impact: that key plus `mux_signing_key_id` is everything needed to mint a Mux
-- playback JWT for any playback id (see supabase/functions/_shared/mux-jwt.ts).
-- A viewer — and `auth-register` lets anyone self-register into a tenant —
-- could stream every locked episode without spending a coin, bypassing the
-- entire playback-token gate. `revenuecat_webhook_secret` (currently unset)
-- would likewise have allowed forged entitlement webhooks.
--
-- Fix: replace the blanket table-level SELECT grant with an explicit
-- column-level grant that omits the secrets. RLS still restricts *which* row a
-- caller sees; this restricts *which columns*.
--
-- Safe by design: every server path that needs the secrets uses the
-- service_role client (playback-token, config, webhooks), and service_role
-- bypasses both RLS and column grants. The only user-scoped tenants read in the
-- codebase is catalog-featured's `home_rails_order`, which stays granted.
--
-- NOTE: `select=*` on tenants now fails for anon/authenticated by design —
-- that request shape was the leak. Clients must name the columns they need.

REVOKE SELECT ON public.tenants FROM anon, authenticated;

GRANT SELECT (
  id,
  name,
  mode,
  status,
  mux_env_key,          -- public: ships in every brand manifest
  revenuecat_api_key,   -- public SDK key by design
  supabase_url,
  supabase_anon_key,    -- public by design
  theme_config,
  feature_flags,
  home_rails_order,     -- read by catalog-featured with the user's JWT
  legal_urls,
  firebase_project_id,
  created_at,
  updated_at
) ON public.tenants TO anon, authenticated;

-- Deliberately NOT granted (service_role only):
--   mux_signing_private_key    — signs playback JWTs
--   mux_signing_key_id         — not secret, but no client needs it (least privilege)
--   revenuecat_webhook_secret  — verifies billing webhooks

COMMENT ON COLUMN public.tenants.mux_signing_private_key IS
  'Mux signing key (PKCS#1 DER, base64, no PEM headers). service_role only — never grant to anon/authenticated.';
COMMENT ON COLUMN public.tenants.revenuecat_webhook_secret IS
  'RevenueCat webhook signing secret. service_role only — never grant to anon/authenticated.';
