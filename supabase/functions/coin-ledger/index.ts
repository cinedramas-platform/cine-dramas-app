import { createClient } from '@supabase/supabase-js';
import { handleCorsPreflightRequest } from '../_shared/cors.ts';
import { jsonResponse, errorResponse } from '../_shared/response.ts';
import { serve } from '../_shared/logger.ts';

const DEFAULT_LIMIT = 30;
const MAX_LIMIT = 100;

// GET /coin-ledger?limit=30 — recent transactions for The Vault.
serve('coin-ledger', async (req, log) => {
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

  const url = new URL(req.url);
  const limit = Math.min(
    Number(url.searchParams.get('limit')) || DEFAULT_LIMIT,
    MAX_LIMIT,
  );

  const { data, error } = await supabase
    .from('coin_transactions')
    .select('id, amount, bonus_amount, kind, balance_after, bonus_after, episode_id, note, created_at')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    log.error('ledger read failed', { error: error.message });
    return errorResponse(error.message, 500);
  }

  return jsonResponse({ transactions: data ?? [] });
});
