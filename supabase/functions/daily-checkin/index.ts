import { createClient } from '@supabase/supabase-js';
import { handleCorsPreflightRequest } from '../_shared/cors.ts';
import { jsonResponse, errorResponse } from '../_shared/response.ts';
import { serve } from '../_shared/logger.ts';

// POST /daily-checkin — award daily bonus coins + advance streak.
serve('daily-checkin', async (req, log) => {
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
  log.setUser(user.id, (user.app_metadata?.tenant_id as string) ?? null);

  const { data, error } = await supabase.rpc('claim_daily_checkin');

  if (error) {
    const msg = error.message ?? '';
    if (msg.includes('ALREADY_CLAIMED')) {
      log.info('checkin rejected: already claimed');
      return jsonResponse({ error: 'already_claimed' }, { status: 409 });
    }
    if (msg.includes('USER_NOT_FOUND')) {
      return errorResponse('User profile not found', 404);
    }
    log.error('checkin RPC failed', { error: msg });
    return errorResponse(msg || 'Check-in failed', 500);
  }

  log.info('daily checkin claimed');
  return jsonResponse(data);
});
