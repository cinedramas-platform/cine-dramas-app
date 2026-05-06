import { createClient } from '@supabase/supabase-js';
import { handleCorsPreflightRequest } from '../_shared/cors.ts';
import { jsonResponse, errorResponse } from '../_shared/response.ts';
import { cacheGet, cacheSet } from '../_shared/redis.ts';
import { signMuxJwt } from '../_shared/mux-jwt.ts';

const TOKEN_EXPIRY_HOURS = 6;
const CACHE_TTL_HOURS = 5;

Deno.serve(async (req) => {
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

  const { data: episode, error: episodeError } = await supabase
    .from('episodes')
    .select('id, tenant_id, mux_playback_id, mux_asset_status, is_free')
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

  if (!episode.is_free) {
    const { data: entitlement } = await supabase
      .from('entitlements')
      .select('tier, expires_at')
      .single();

    const hasAccess =
      entitlement &&
      entitlement.tier !== 'free' &&
      (!entitlement.expires_at ||
        new Date(entitlement.expires_at) > new Date());

    if (!hasAccess) {
      return errorResponse('Premium subscription required', 403);
    }
  }

  const cacheKey = `mux_token:${episode.mux_playback_id}:${user.id}`;
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
    return errorResponse('Playback signing not configured', 500);
  }

  const expiresAt = new Date(
    Date.now() + TOKEN_EXPIRY_HOURS * 60 * 60 * 1000,
  );

  const keyId = tenant.mux_signing_key_id;
  const keyBase64 = tenant.mux_signing_private_key;

  const videoToken = await signMuxJwt(
    episode.mux_playback_id, 'v', keyId, keyBase64, expiresAt,
  );

  const thumbnailToken = await signMuxJwt(
    episode.mux_playback_id, 't', keyId, keyBase64, expiresAt,
  );

  const responseData = {
    stream_url: `https://stream.mux.com/${episode.mux_playback_id}.m3u8?token=${videoToken}`,
    thumbnail_url: `https://image.mux.com/${episode.mux_playback_id}/thumbnail.webp?token=${thumbnailToken}`,
    expires_at: expiresAt.toISOString(),
  };

  await cacheSet(
    cacheKey,
    JSON.stringify(responseData),
    CACHE_TTL_HOURS * 60 * 60,
  );

  return jsonResponse(responseData);
});
