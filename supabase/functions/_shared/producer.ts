// Producer gate + shared request preamble for portal edge functions
// (mux-direct-upload, catalog-admin, mux-analytics).
//
// Role source of truth: users.role ('producer' or 'admin'), added by
// migration 20260709150000_add_user_role. Until that migration is applied
// everywhere, the PORTAL_PRODUCER_EMAILS env allowlist keeps working as a
// fallback. With neither configured, access is denied — fail closed.

import { createClient } from '@supabase/supabase-js';
import { handleCorsPreflightRequest } from './cors.ts';
import { errorResponse } from './response.ts';
import type { Logger } from './logger.ts';

// deno-lint-ignore no-explicit-any
type AnyClient = any;

export async function isProducer(
  user: { id: string; email?: string | null },
  service: AnyClient,
  log?: Pick<Logger, 'warn'>,
): Promise<boolean> {
  const { data, error } = await service
    .from('users')
    .select('role')
    .eq('auth_id', user.id)
    .maybeSingle();
  if (error) {
    // Still fail closed, but make an availability problem distinguishable
    // from a genuine non-producer in the logs.
    log?.warn('producer role lookup failed — denying via fallback', { error: error.message });
  }
  if (data?.role === 'producer' || data?.role === 'admin') {
    return true;
  }

  const allowlist = (Deno.env.get('PORTAL_PRODUCER_EMAILS') ?? '')
    .split(',')
    .map((e: string) => e.trim().toLowerCase())
    .filter(Boolean);
  return !!user.email && allowlist.includes(user.email.toLowerCase());
}

export interface ProducerContext {
  ok: true;
  user: { id: string; email?: string | null; app_metadata?: Record<string, unknown> };
  tenantId: string;
  /** RLS-scoped client carrying the caller's JWT. */
  supabase: AnyClient;
  /** Service-role client — every query MUST still scope by tenantId. */
  service: AnyClient;
}

export type ProducerGate = ProducerContext | { ok: false; response: Response };

/**
 * The shared preamble of every producer-only POST endpoint: CORS preflight,
 * method check, JWT resolution, tenant extraction, and the producer gate.
 * Returns either the request context or the Response to send immediately.
 */
export async function requireProducer(req: Request, log: Logger): Promise<ProducerGate> {
  const corsResponse = handleCorsPreflightRequest(req);
  if (corsResponse) return { ok: false, response: corsResponse };

  if (req.method !== 'POST') {
    return { ok: false, response: errorResponse('Method not allowed', 405) };
  }

  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    return { ok: false, response: errorResponse('Missing authorization header', 401) };
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
    return { ok: false, response: errorResponse('Invalid or expired token', 401) };
  }
  const tenantId = (user.app_metadata?.tenant_id as string) ?? null;
  log.setUser(user.id, tenantId);
  if (!tenantId) {
    return { ok: false, response: errorResponse('No tenant associated with this account', 403) };
  }

  const service = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  if (!(await isProducer(user, service, log))) {
    log.warn('request rejected: not a producer account');
    return {
      ok: false,
      response: errorResponse('This account does not have producer access', 403),
    };
  }

  return { ok: true, user, tenantId, supabase, service };
}
