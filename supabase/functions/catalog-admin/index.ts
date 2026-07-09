import { createClient } from '@supabase/supabase-js';
import { handleCorsPreflightRequest } from '../_shared/cors.ts';
import { jsonResponse, errorResponse } from '../_shared/response.ts';
import { serve } from '../_shared/logger.ts';
import { isProducer } from '../_shared/producer.ts';

// POST /catalog-admin
//   { action: 'update-episode', episodeId, fields: { title?, description?, is_free?, coin_cost? } }
//   { action: 'update-series',  seriesId,  fields: { status?, is_featured? } }
//   { action: 'create-series',  fields: { title, category, description? } }
//     → creates a draft series plus Season 1, returns { seriesId, seasonId }
//   { action: 'delete-episode', episodeId }
//     → only for episodes that never went live (pending/errored), so failed
//       uploads can be cleaned up without touching purchased content
//
// Producer-only catalog writes for the portal. Producers are allowlisted via
// PORTAL_PRODUCER_EMAILS (fails closed if unset) — same gate as
// mux-direct-upload. Rows are always matched on the caller's tenant_id, so a
// producer can never touch another tenant's catalog even with a valid id.

const SERIES_STATUSES = ['draft', 'published', 'archived'];

serve('catalog-admin', async (req, log) => {
  const corsResponse = handleCorsPreflightRequest(req);
  if (corsResponse) return corsResponse;

  if (req.method !== 'POST') {
    return errorResponse('Method not allowed', 405);
  }

  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    return errorResponse('Missing authorization header', 401);
  }

  const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
    global: { headers: { Authorization: authHeader } },
  });

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) {
    return errorResponse('Invalid or expired token', 401);
  }
  const tenantId = (user.app_metadata?.tenant_id as string) ?? null;
  log.setUser(user.id, tenantId);
  if (!tenantId) {
    return errorResponse('No tenant associated with this account', 403);
  }

  const service = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  // Producer gate: users.role, with the env allowlist as fallback.
  if (!(await isProducer(user, service))) {
    log.warn('catalog write rejected: not a producer account');
    return errorResponse('This account does not have producer access', 403);
  }

  let body: {
    action?: unknown;
    episodeId?: unknown;
    seriesId?: unknown;
    fields?: Record<string, unknown>;
  };
  try {
    body = await req.json();
  } catch {
    return errorResponse('Invalid JSON body');
  }

  if (body.action === 'delete-episode') {
    if (typeof body.episodeId !== 'string' || !body.episodeId) {
      return errorResponse('episodeId is required');
    }
    const { data: episode, error: fetchError } = await service
      .from('episodes')
      .select('id, mux_asset_status')
      .eq('id', body.episodeId)
      .eq('tenant_id', tenantId)
      .maybeSingle();
    if (fetchError) {
      log.error('episode fetch failed', { error: fetchError.message });
      return errorResponse('Delete failed', 500);
    }
    if (!episode) {
      return errorResponse('Episode not found', 404);
    }
    if (episode.mux_asset_status !== 'pending' && episode.mux_asset_status !== 'errored') {
      return errorResponse('Only episodes that never went live can be deleted', 409);
    }
    const { error: deleteError } = await service
      .from('episodes')
      .delete()
      .eq('id', body.episodeId)
      .eq('tenant_id', tenantId);
    if (deleteError) {
      log.error('episode delete failed', { error: deleteError.message });
      return errorResponse('Delete failed', 500);
    }
    log.info('episode deleted', { episode_id: body.episodeId });
    return jsonResponse({ ok: true });
  }

  const fields = body.fields;
  if (!fields || typeof fields !== 'object') {
    return errorResponse('fields is required');
  }

  if (body.action === 'update-episode') {
    if (typeof body.episodeId !== 'string' || !body.episodeId) {
      return errorResponse('episodeId is required');
    }

    const update: Record<string, unknown> = {};
    if (typeof fields.title === 'string' && fields.title.trim()) {
      update.title = fields.title.trim();
    }
    if (typeof fields.description === 'string' || fields.description === null) {
      update.description = fields.description;
    }
    if (typeof fields.is_free === 'boolean') {
      update.is_free = fields.is_free;
    }
    if (
      typeof fields.coin_cost === 'number' &&
      Number.isInteger(fields.coin_cost) &&
      fields.coin_cost >= 0
    ) {
      update.coin_cost = fields.coin_cost;
    }
    if (Object.keys(update).length === 0) {
      return errorResponse('No valid fields to update');
    }
    update.updated_at = new Date().toISOString();

    const { data, error } = await service
      .from('episodes')
      .update(update)
      .eq('id', body.episodeId)
      .eq('tenant_id', tenantId)
      .select('id')
      .maybeSingle();
    if (error) {
      log.error('episode update failed', { error: error.message });
      return errorResponse('Update failed', 500);
    }
    if (!data) {
      return errorResponse('Episode not found', 404);
    }
    log.info('episode updated', { episode_id: body.episodeId, fields: Object.keys(update) });
    return jsonResponse({ ok: true });
  }

  if (body.action === 'update-series') {
    if (typeof body.seriesId !== 'string' || !body.seriesId) {
      return errorResponse('seriesId is required');
    }

    const update: Record<string, unknown> = {};
    if (typeof fields.status === 'string' && SERIES_STATUSES.includes(fields.status)) {
      update.status = fields.status;
    }
    if (typeof fields.is_featured === 'boolean') {
      update.is_featured = fields.is_featured;
    }
    if (Object.keys(update).length === 0) {
      return errorResponse('No valid fields to update');
    }
    update.updated_at = new Date().toISOString();

    const { data, error } = await service
      .from('series')
      .update(update)
      .eq('id', body.seriesId)
      .eq('tenant_id', tenantId)
      .select('id')
      .maybeSingle();
    if (error) {
      log.error('series update failed', { error: error.message });
      return errorResponse('Update failed', 500);
    }
    if (!data) {
      return errorResponse('Series not found', 404);
    }
    log.info('series updated', { series_id: body.seriesId, fields: Object.keys(update) });
    return jsonResponse({ ok: true });
  }

  if (body.action === 'create-series') {
    if (typeof fields.title !== 'string' || !fields.title.trim()) {
      return errorResponse('title is required');
    }
    if (typeof fields.category !== 'string' || !fields.category.trim()) {
      return errorResponse('category is required');
    }
    const description = typeof fields.description === 'string' ? fields.description : null;

    const { data: created, error: seriesError } = await service
      .from('series')
      .insert({
        tenant_id: tenantId,
        title: fields.title.trim(),
        description,
        category: fields.category.trim().toLowerCase(),
        status: 'draft',
      })
      .select('id')
      .single();
    if (seriesError || !created) {
      log.error('series insert failed', { error: seriesError?.message });
      return errorResponse('Could not create series', 500);
    }

    const { data: season, error: seasonError } = await service
      .from('seasons')
      .insert({ tenant_id: tenantId, series_id: created.id, number: 1 })
      .select('id')
      .single();
    if (seasonError || !season) {
      // Keep the catalog consistent: no series without a season to upload into.
      await service.from('series').delete().eq('id', created.id);
      log.error('season insert failed', { error: seasonError?.message });
      return errorResponse('Could not create series', 500);
    }

    log.info('series created', { series_id: created.id });
    return jsonResponse({ ok: true, seriesId: created.id, seasonId: season.id });
  }

  return errorResponse('Unknown action');
});
