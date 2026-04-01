-- T1.02: RLS policies for tenant isolation
-- Pattern: tenant_id = auth.jwt()->>'tenant_id'
-- User-scoped tables additionally check user_id.

-- ============================================================
-- tenants: read-only for authenticated users matching tenant
-- ============================================================
CREATE POLICY "tenant_select_own" ON public.tenants
  FOR SELECT
  USING (id = (auth.jwt()->>'tenant_id'));

-- ============================================================
-- series: tenant-scoped read
-- ============================================================
CREATE POLICY "series_tenant_select" ON public.series
  FOR SELECT
  USING (tenant_id = (auth.jwt()->>'tenant_id'));

CREATE POLICY "series_tenant_insert" ON public.series
  FOR INSERT
  WITH CHECK (tenant_id = (auth.jwt()->>'tenant_id'));

CREATE POLICY "series_tenant_update" ON public.series
  FOR UPDATE
  USING (tenant_id = (auth.jwt()->>'tenant_id'))
  WITH CHECK (tenant_id = (auth.jwt()->>'tenant_id'));

CREATE POLICY "series_tenant_delete" ON public.series
  FOR DELETE
  USING (tenant_id = (auth.jwt()->>'tenant_id'));

-- ============================================================
-- seasons: tenant-scoped
-- ============================================================
CREATE POLICY "seasons_tenant_select" ON public.seasons
  FOR SELECT
  USING (tenant_id = (auth.jwt()->>'tenant_id'));

CREATE POLICY "seasons_tenant_insert" ON public.seasons
  FOR INSERT
  WITH CHECK (tenant_id = (auth.jwt()->>'tenant_id'));

CREATE POLICY "seasons_tenant_update" ON public.seasons
  FOR UPDATE
  USING (tenant_id = (auth.jwt()->>'tenant_id'))
  WITH CHECK (tenant_id = (auth.jwt()->>'tenant_id'));

CREATE POLICY "seasons_tenant_delete" ON public.seasons
  FOR DELETE
  USING (tenant_id = (auth.jwt()->>'tenant_id'));

-- ============================================================
-- episodes: tenant-scoped
-- ============================================================
CREATE POLICY "episodes_tenant_select" ON public.episodes
  FOR SELECT
  USING (tenant_id = (auth.jwt()->>'tenant_id'));

CREATE POLICY "episodes_tenant_insert" ON public.episodes
  FOR INSERT
  WITH CHECK (tenant_id = (auth.jwt()->>'tenant_id'));

CREATE POLICY "episodes_tenant_update" ON public.episodes
  FOR UPDATE
  USING (tenant_id = (auth.jwt()->>'tenant_id'))
  WITH CHECK (tenant_id = (auth.jwt()->>'tenant_id'));

CREATE POLICY "episodes_tenant_delete" ON public.episodes
  FOR DELETE
  USING (tenant_id = (auth.jwt()->>'tenant_id'));

-- ============================================================
-- users: tenant-scoped, users can read own record
-- ============================================================
CREATE POLICY "users_tenant_select" ON public.users
  FOR SELECT
  USING (tenant_id = (auth.jwt()->>'tenant_id'));

CREATE POLICY "users_own_update" ON public.users
  FOR UPDATE
  USING (
    tenant_id = (auth.jwt()->>'tenant_id')
    AND auth_id = auth.uid()
  )
  WITH CHECK (
    tenant_id = (auth.jwt()->>'tenant_id')
    AND auth_id = auth.uid()
  );

-- ============================================================
-- watch_progress: tenant + user scoped
-- ============================================================
CREATE POLICY "progress_user_select" ON public.watch_progress
  FOR SELECT
  USING (
    tenant_id = (auth.jwt()->>'tenant_id')
    AND user_id = (SELECT id FROM public.users WHERE auth_id = auth.uid())
  );

CREATE POLICY "progress_user_insert" ON public.watch_progress
  FOR INSERT
  WITH CHECK (
    tenant_id = (auth.jwt()->>'tenant_id')
    AND user_id = (SELECT id FROM public.users WHERE auth_id = auth.uid())
  );

CREATE POLICY "progress_user_update" ON public.watch_progress
  FOR UPDATE
  USING (
    tenant_id = (auth.jwt()->>'tenant_id')
    AND user_id = (SELECT id FROM public.users WHERE auth_id = auth.uid())
  )
  WITH CHECK (
    tenant_id = (auth.jwt()->>'tenant_id')
    AND user_id = (SELECT id FROM public.users WHERE auth_id = auth.uid())
  );

-- ============================================================
-- entitlements: tenant + user scoped (read-only for users)
-- ============================================================
CREATE POLICY "entitlements_user_select" ON public.entitlements
  FOR SELECT
  USING (
    tenant_id = (auth.jwt()->>'tenant_id')
    AND user_id = (SELECT id FROM public.users WHERE auth_id = auth.uid())
  );

-- ============================================================
-- webhook_events: no client access (service_role only)
-- ============================================================
-- No policies = deny all client access. Service role bypasses RLS.
