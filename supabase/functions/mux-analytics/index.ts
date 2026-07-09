import { createClient } from '@supabase/supabase-js';
import { handleCorsPreflightRequest } from '../_shared/cors.ts';
import { jsonResponse, errorResponse } from '../_shared/response.ts';
import { serve } from '../_shared/logger.ts';

// POST /mux-analytics  body: { days? }
//
// Producer-only audience metrics for the portal, proxied from the Mux Data
// API (the Mux token must stay server-side). Returns per-title views and
// watch time over the window plus overall totals. Mux API tokens are scoped
// to a Mux environment, so this reports on the environment the token was
// created in — one env per Silhouette client.

const DEFAULT_DAYS = 30;
const MAX_DAYS = 90;

serve('mux-analytics', async (req, log) => {
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
  const tenantId = (user.app_metadata?.tenant_id as string) ?? null;
  log.setUser(user.id, tenantId);

  const allowlist = (Deno.env.get('PORTAL_PRODUCER_EMAILS') ?? '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  if (!user.email || !allowlist.includes(user.email.toLowerCase())) {
    log.warn('analytics rejected: not a producer account');
    return errorResponse('This account does not have producer access', 403);
  }

  const muxTokenId = Deno.env.get('MUX_TOKEN_ID');
  const muxTokenSecret = Deno.env.get('MUX_TOKEN_SECRET');
  if (!muxTokenId || !muxTokenSecret) {
    log.error('MUX_TOKEN_ID / MUX_TOKEN_SECRET not configured');
    return errorResponse('Analytics service unavailable', 500);
  }

  let days = DEFAULT_DAYS;
  try {
    const body = await req.json();
    if (typeof body?.days === 'number' && Number.isInteger(body.days) && body.days > 0) {
      days = Math.min(body.days, MAX_DAYS);
    }
  } catch {
    // Empty body is fine — use the default window.
  }

  const muxHeaders = {
    Authorization: `Basic ${btoa(`${muxTokenId}:${muxTokenSecret}`)}`,
  };
  const timeframe = `timeframe[]=${days}:days`;

  const [breakdownRes, overallRes] = await Promise.all([
    fetch(
      `https://api.mux.com/data/v1/metrics/watch_time/breakdown?group_by=video_title&${timeframe}&order_by=views&order_direction=desc&limit=25`,
      { headers: muxHeaders },
    ),
    fetch(`https://api.mux.com/data/v1/metrics/watch_time/overall?${timeframe}`, {
      headers: muxHeaders,
    }),
  ]);

  if (!breakdownRes.ok) {
    const detail = await breakdownRes.text();
    log.error('mux breakdown failed', { status: breakdownRes.status, detail });
    return errorResponse('Could not fetch analytics from Mux', 502);
  }

  const breakdown = (await breakdownRes.json()) as {
    data?: { field?: string; views?: number; total_watch_time?: number }[];
  };

  let totals: { views: number | null; watchTimeMs: number | null } = {
    views: null,
    watchTimeMs: null,
  };
  if (overallRes.ok) {
    const overall = (await overallRes.json()) as {
      data?: { total_views?: number; total_watch_time?: number };
    };
    totals = {
      views: overall.data?.total_views ?? null,
      watchTimeMs: overall.data?.total_watch_time ?? null,
    };
  }

  const rows = (breakdown.data ?? [])
    .filter((r) => r.field)
    .map((r) => ({
      title: r.field as string,
      views: r.views ?? 0,
      watchTimeMs: r.total_watch_time ?? 0,
    }));

  log.info('analytics served', { days, row_count: rows.length });
  return jsonResponse({ days, totals, rows });
});
