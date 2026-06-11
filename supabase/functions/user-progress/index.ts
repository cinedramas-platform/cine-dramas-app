import { createClient } from '@supabase/supabase-js';
import { handleCorsPreflightRequest } from '../_shared/cors.ts';
import { jsonResponse, errorResponse } from '../_shared/response.ts';
import { rateLimitCheck } from '../_shared/redis.ts';
import { serve } from '../_shared/logger.ts';

const RATE_LIMIT_MAX = 6;
const RATE_LIMIT_WINDOW = 60;

serve('user-progress', async (req, log) => {
  const corsResponse = handleCorsPreflightRequest(req);
  if (corsResponse) return corsResponse;

  if (req.method !== 'GET' && req.method !== 'PUT') {
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
  log.setUser(user.id, (user.app_metadata?.tenant_id as string) ?? null);

  const url = new URL(req.url);
  const episodeId = url.searchParams.get('episodeId');

  if (req.method === 'GET') {
    if (episodeId) {
      const { data, error } = await supabase
        .from('watch_progress')
        .select('id, episode_id, position_seconds, completed, updated_at')
        .eq('episode_id', episodeId)
        .maybeSingle();

      if (error) return errorResponse(error.message, 500);
      return jsonResponse({ progress: data });
    }

    const { data, error } = await supabase
      .from('watch_progress')
      .select(
        'id, episode_id, position_seconds, completed, updated_at, episodes(title, mux_playback_id, thumbnail_time, duration_seconds)',
      )
      .eq('completed', false)
      .order('updated_at', { ascending: false })
      .limit(20);

    if (error) return errorResponse(error.message, 500);

    const flattened = (data ?? []).map((row: Record<string, unknown>) => {
      const ep = row.episodes as Record<string, unknown> | null;
      return {
        id: row.id,
        episode_id: row.episode_id,
        position_seconds: row.position_seconds,
        completed: row.completed,
        updated_at: row.updated_at,
        episode_title: ep?.title ?? null,
        episode_mux_playback_id: ep?.mux_playback_id ?? null,
        episode_thumbnail_time: ep?.thumbnail_time ?? 0,
        episode_duration_seconds: ep?.duration_seconds ?? null,
      };
    });

    return jsonResponse({ progress: flattened });
  }

  // PUT — upsert progress with rate limiting
  if (!episodeId) {
    return errorResponse('Missing required parameter: episodeId');
  }

  const allowed = await rateLimitCheck(
    `rate:${user.id}:progress`,
    RATE_LIMIT_MAX,
    RATE_LIMIT_WINDOW,
  );
  if (!allowed) {
    log.warn('rate limited', { episodeId });
    return errorResponse('Too many requests', 429);
  }

  let body: { position_seconds?: unknown; completed?: unknown };
  try {
    body = await req.json();
  } catch {
    return errorResponse('Invalid JSON body');
  }

  const { position_seconds, completed } = body;
  if (typeof position_seconds !== 'number' || position_seconds < 0) {
    return errorResponse('position_seconds must be a non-negative number');
  }
  if (typeof completed !== 'boolean') {
    return errorResponse('completed must be a boolean');
  }

  const { data: dbUser, error: userError } = await supabase
    .from('users')
    .select('id, tenant_id')
    .eq('auth_id', user.id)
    .single();

  if (userError || !dbUser) {
    log.info('progress rejected: user profile not found', { episodeId });
    return errorResponse('User profile not found', 404);
  }

  const { data, error } = await supabase
    .from('watch_progress')
    .upsert(
      {
        tenant_id: dbUser.tenant_id,
        user_id: dbUser.id,
        episode_id: episodeId,
        position_seconds: Math.round(position_seconds),
        completed,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'tenant_id,user_id,episode_id' },
    )
    .select('position_seconds, completed, updated_at')
    .single();

  if (error) return errorResponse(error.message, 500);

  return jsonResponse(data);
});
