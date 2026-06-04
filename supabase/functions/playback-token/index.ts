import { createClient } from '@supabase/supabase-js';
import { handleCorsPreflightRequest } from '../_shared/cors.ts';
import { jsonResponse, errorResponse } from '../_shared/response.ts';
import { cacheGet, cacheSet } from '../_shared/redis.ts';
import { signMuxJwt } from '../_shared/mux-jwt.ts';
import { serve } from '../_shared/logger.ts';

const TOKEN_EXPIRY_HOURS = 6;
const CACHE_TTL_HOURS = 5;

serve('playback-token', async (req, log) => {
  const corsResponse = handleCorsPreflightRequest(req);
  if (corsResponse) return corsResponse;

  if (req.method !== 'GET') {
    return errorResponse('Method not allowed', 405);
  }

  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    return errorResponse('Missing authorization header', 401);
  }

  const url = new URL(req.url);
  const episodeId = url.searchParams.get('episodeId');
  if (!episodeId) {
    return errorResponse('Missing required parameter: episodeId');
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: authHeader } } },
  );

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) {
    return errorResponse('Invalid or expired token', 401);
  }
  log.setUser(user.id, (user.app_metadata?.tenant_id as string) ?? null);

  const { data: episode, error: episodeError } = await supabase
    .from('episodes')
    .select('id, tenant_id, mux_playback_id, mux_signed_playback_id, mux_asset_status, is_free, coin_cost')
    .eq('id', episodeId)
    .single();

  if (episodeError) {
    if (episodeError.code === 'PGRST116') {
      return errorResponse('Episode not found', 404);
    }
    return errorResponse(episodeError.message, 500);
  }

  if (episode.mux_asset_status !== 'ready' || !episode.mux_playback_id) {
    return errorResponse('Episode not available for playback', 404);
  }

  const isFree = episode.is_free || episode.coin_cost === 0;
  if (!isFree) {
    // Access if the user has a coin-unlocked grant for this episode...
    const { data: unlock } = await supabase
      .from('episode_unlocks')
      .select('id')
      .eq('episode_id', episode.id)
      .maybeSingle();

    let hasAccess = !!unlock;

    // ...or an active VIP/premium entitlement (unlimited unlocks).
    if (!hasAccess) {
      const { data: entitlement } = await supabase
        .from('entitlements')
        .select('tier, expires_at')
        .maybeSingle();

      hasAccess =
        !!entitlement &&
        entitlement.tier !== 'free' &&
        (!entitlement.expires_at ||
          new Date(entitlement.expires_at) > new Date());
    }

    if (!hasAccess) {
      log.info('playback denied: episode locked', { episodeId });
      return errorResponse('Episode locked', 403);
    }
  }

  // Sign the SIGNED playback id (gated video). Fall back to the public id for
  // assets that don't have a signed id yet.
  const playbackId = episode.mux_signed_playback_id || episode.mux_playback_id;

  const cacheKey = `mux_token:${playbackId}:${user.id}`;
  const cached = await cacheGet(cacheKey);
  if (cached) {
    return jsonResponse(JSON.parse(cached));
  }

  const supabaseAdmin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  const { data: tenant, error: tenantError } = await supabaseAdmin
    .from('tenants')
    .select('mux_signing_key_id, mux_signing_private_key')
    .eq('id', episode.tenant_id)
    .single();

  if (
    tenantError ||
    !tenant?.mux_signing_key_id ||
    !tenant?.mux_signing_private_key
  ) {
    log.error('playback signing not configured', { episodeId });
    return errorResponse('Playback signing not configured', 500);
  }

  const expiresAt = new Date(
    Date.now() + TOKEN_EXPIRY_HOURS * 60 * 60 * 1000,
  );

  const keyId = tenant.mux_signing_key_id;
  const keyBase64 = tenant.mux_signing_private_key;

  const videoToken = await signMuxJwt(
    playbackId, 'v', keyId, keyBase64, expiresAt,
  );

  const thumbnailToken = await signMuxJwt(
    playbackId, 't', keyId, keyBase64, expiresAt,
  );

  const responseData = {
    stream_url: `https://stream.mux.com/${playbackId}.m3u8?token=${videoToken}`,
    thumbnail_url: `https://image.mux.com/${playbackId}/thumbnail.webp?token=${thumbnailToken}`,
    expires_at: expiresAt.toISOString(),
  };

  await cacheSet(
    cacheKey,
    JSON.stringify(responseData),
    CACHE_TTL_HOURS * 60 * 60,
  );

  return jsonResponse(responseData);
});
