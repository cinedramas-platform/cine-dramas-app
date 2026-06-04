import { createClient } from '@supabase/supabase-js';
import { handleCorsPreflightRequest } from '../_shared/cors.ts';
import { jsonResponse, errorResponse } from '../_shared/response.ts';
import { rateLimitCheck } from '../_shared/redis.ts';
import { serve } from '../_shared/logger.ts';

const RATE_LIMIT_MAX = 12;
const RATE_LIMIT_WINDOW = 60;

// POST /unlock-episode  body: { episodeId }
// Atomic coin spend via unlock_episode RPC (bonus-first, row-locked).
serve('unlock-episode', async (req, log) => {
  const corsResponse = handleCorsPreflightRequest(req);
  if (corsResponse) return corsResponse;

  if (req.method !== 'POST') {
    return errorResponse('Method not allowed', 405);
  }

  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    return errorResponse('Missing authorization header', 401);
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

  let body: { episodeId?: unknown };
  try {
    body = await req.json();
  } catch {
    return errorResponse('Invalid JSON body');
  }

  const episodeId = body.episodeId;
  if (typeof episodeId !== 'string' || !episodeId) {
    return errorResponse('episodeId is required');
  }

  const allowed = await rateLimitCheck(
    `rate:${user.id}:unlock`,
    RATE_LIMIT_MAX,
    RATE_LIMIT_WINDOW,
  );
  if (!allowed) {
    log.warn('rate limited', { episodeId });
    return errorResponse('Too many requests', 429);
  }

  const { data, error } = await supabase.rpc('unlock_episode', {
    p_episode_id: episodeId,
  });

  if (error) {
    const msg = error.message ?? '';
    if (msg.includes('INSUFFICIENT_FUNDS')) {
      log.info('unlock rejected: insufficient funds', { episodeId });
      return jsonResponse({ error: 'insufficient_funds' }, { status: 402 });
    }
    if (msg.includes('EPISODE_NOT_FOUND')) {
      return errorResponse('Episode not found', 404);
    }
    if (msg.includes('USER_NOT_FOUND')) {
      return errorResponse('User profile not found', 404);
    }
    log.error('unlock RPC failed', { episodeId, error: msg });
    return errorResponse(msg || 'Unlock failed', 500);
  }

  log.info('episode unlocked', { episodeId });
  return jsonResponse(data);
});
