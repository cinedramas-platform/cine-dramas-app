import { createClient } from '@supabase/supabase-js';
import { handleCorsPreflightRequest } from '../_shared/cors.ts';
import { jsonResponse, errorResponse } from '../_shared/response.ts';
import { rateLimitCheck } from '../_shared/redis.ts';
import { serve } from '../_shared/logger.ts';

const RATE_LIMIT_MAX = 20;
const RATE_LIMIT_WINDOW = 60;

// MOCK top-up endpoint. Stands in for real IAP until RevenueCat lands.
// Coin packs are paid coins; ad reward is bonus coins.
// TODO(revenuecat): real `purchase` must be driven by a verified
// store receipt / RevenueCat webhook, not a client call.
const COIN_PACKS: Record<string, { coins: number; label: string }> = {
  pack_100: { coins: 100, label: '100 coins' },
  pack_500: { coins: 500, label: '500 coins' },
  pack_1200: { coins: 1200, label: '1,200 coins' },
  pack_3000: { coins: 3000, label: '3,000 coins' },
};

const AD_REWARD_BONUS = 10;

// POST /coins-grant  body: { kind: 'purchase' | 'ad_reward', pack?: string }
serve('coins-grant', async (req, log) => {
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

  let body: { kind?: unknown; pack?: unknown };
  try {
    body = await req.json();
  } catch {
    return errorResponse('Invalid JSON body');
  }

  const allowed = await rateLimitCheck(`rate:${user.id}:grant`, RATE_LIMIT_MAX, RATE_LIMIT_WINDOW);
  if (!allowed) {
    log.warn('rate limited');
    return errorResponse('Too many requests', 429);
  }

  let amount = 0;
  let bonus = 0;
  let kind: string;
  let note: string;

  if (body.kind === 'purchase') {
    const pack = typeof body.pack === 'string' ? COIN_PACKS[body.pack] : undefined;
    if (!pack) {
      return errorResponse('Unknown coin pack');
    }
    amount = pack.coins;
    kind = 'purchase';
    note = `Pack purchased · ${pack.label}`;
  } else if (body.kind === 'ad_reward') {
    bonus = AD_REWARD_BONUS;
    kind = 'ad_reward';
    note = 'Sponsored ad reward';
  } else {
    return errorResponse('Invalid grant kind');
  }

  const { data, error } = await supabase.rpc('grant_coins', {
    p_amount: amount,
    p_bonus: bonus,
    p_kind: kind,
    p_note: note,
  });

  if (error) {
    if ((error.message ?? '').includes('USER_NOT_FOUND')) {
      return errorResponse('User profile not found', 404);
    }
    log.error('grant RPC failed', { kind, error: error.message });
    return errorResponse(error.message ?? 'Grant failed', 500);
  }

  log.info('coins granted', { kind, amount, bonus });
  return jsonResponse(data);
});
