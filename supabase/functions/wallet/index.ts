import { createClient } from '@supabase/supabase-js';
import { handleCorsPreflightRequest } from '../_shared/cors.ts';
import { jsonResponse, errorResponse } from '../_shared/response.ts';
import { serve } from '../_shared/logger.ts';

// GET /wallet — balances + VIP status + unlocked episodes + streak.
// Powers home header, unlock screen, and The Vault.
serve('wallet', async (req, log) => {
  const corsResponse = handleCorsPreflightRequest(req);
  if (corsResponse) return corsResponse;

  if (req.method !== 'GET') {
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

  // All three reads are RLS-scoped to the caller.
  const [walletRes, entitlementRes, unlocksRes] = await Promise.all([
    supabase
      .from('wallets')
      .select('coin_balance, bonus_balance, checkin_streak, last_checkin_date')
      .maybeSingle(),
    supabase
      .from('entitlements')
      .select('tier, expires_at')
      .maybeSingle(),
    supabase
      .from('episode_unlocks')
      .select('episode_id'),
  ]);

  if (walletRes.error) {
    log.error('wallet read failed', { error: walletRes.error.message });
    return errorResponse(walletRes.error.message, 500);
  }
  if (unlocksRes.error) {
    log.error('unlocks read failed', { error: unlocksRes.error.message });
    return errorResponse(unlocksRes.error.message, 500);
  }

  const wallet = walletRes.data;
  const entitlement = entitlementRes.data;
  const unlockedEpisodeIds = (unlocksRes.data ?? []).map((r) => r.episode_id);

  const isVip =
    !!entitlement &&
    entitlement.tier !== 'free' &&
    (!entitlement.expires_at || new Date(entitlement.expires_at) > new Date());

  const today = new Date().toISOString().slice(0, 10);

  return jsonResponse({
    coin_balance: wallet?.coin_balance ?? 0,
    bonus_balance: wallet?.bonus_balance ?? 0,
    total: (wallet?.coin_balance ?? 0) + (wallet?.bonus_balance ?? 0),
    is_vip: isVip,
    streak: wallet?.checkin_streak ?? 0,
    checked_in_today: wallet?.last_checkin_date === today,
    unlocked_count: unlockedEpisodeIds.length,
    unlocked_episode_ids: unlockedEpisodeIds,
  });
});
