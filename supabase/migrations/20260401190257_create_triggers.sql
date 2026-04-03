-- T1.02: Triggers

-- ============================================================
-- Auto-create public.users row when a new auth user signs up
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  _tenant_id text;
BEGIN
  _tenant_id := NEW.raw_app_meta_data->>'tenant_id';

  -- Only create public.users row if tenant_id is present.
  -- Admin-created users without tenant_id can be linked later.
  IF _tenant_id IS NOT NULL THEN
    INSERT INTO public.users (auth_id, tenant_id, email)
    VALUES (NEW.id, _tenant_id, NEW.email);
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- updated_at auto-update triggers
-- ============================================================
CREATE TRIGGER set_updated_at_tenants
  BEFORE UPDATE ON public.tenants
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_updated_at_series
  BEFORE UPDATE ON public.series
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_updated_at_episodes
  BEFORE UPDATE ON public.episodes
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_updated_at_users
  BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_updated_at_watch_progress
  BEFORE UPDATE ON public.watch_progress
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_updated_at_entitlements
  BEFORE UPDATE ON public.entitlements
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
