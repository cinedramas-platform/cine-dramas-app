import { createClient } from '@supabase/supabase-js';
import { handleCorsPreflightRequest } from '../_shared/cors.ts';
import { jsonResponse, errorResponse } from '../_shared/response.ts';

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

  const { data: entitlement, error } = await supabase
    .from('entitlements')
    .select('tier, expires_at')
    .maybeSingle();

  if (error) {
    return errorResponse(error.message, 500);
  }

  if (!entitlement) {
    return jsonResponse({
      tier: 'free',
      expires_at: null,
      is_active: false,
    });
  }

  const isActive =
    entitlement.tier !== 'free' &&
    (!entitlement.expires_at ||
      new Date(entitlement.expires_at) > new Date());

  return jsonResponse({
    tier: entitlement.tier,
    expires_at: entitlement.expires_at,
    is_active: isActive,
  });
});
