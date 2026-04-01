-- T1.02: Database functions

-- Custom Access Token Hook
-- Injects tenant_id from user's app_metadata into the JWT claims.
-- Must be registered in Supabase Dashboard > Auth > Hooks.
CREATE OR REPLACE FUNCTION public.custom_access_token_hook(event jsonb)
RETURNS jsonb AS $$
DECLARE
  claims jsonb;
  tenant_id text;
BEGIN
  claims := event->'claims';

  SELECT raw_app_meta_data->>'tenant_id' INTO tenant_id
  FROM auth.users
  WHERE id = (event->>'user_id')::uuid;

  IF tenant_id IS NOT NULL THEN
    claims := jsonb_set(claims, '{tenant_id}', to_jsonb(tenant_id));
    event := jsonb_set(event, '{claims}', claims);
  END IF;

  RETURN event;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Grant execute to supabase_auth_admin so the hook can be called
GRANT EXECUTE ON FUNCTION public.custom_access_token_hook TO supabase_auth_admin;

-- updated_at trigger function (reusable)
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
