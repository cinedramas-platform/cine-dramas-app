import { createClient } from '@supabase/supabase-js';
import { handleCorsPreflightRequest } from '../_shared/cors.ts';
import { jsonResponse, errorResponse } from '../_shared/response.ts';
import { serve } from '../_shared/logger.ts';
import { isProducer } from '../_shared/producer.ts';

// POST /mux-analytics  body: { days? }
//
// Producer-only analytics for the portal, combining two sources:
//   mux   — audience metrics (views, watch time) proxied from the Mux Data
//           API; the Mux token stays server-side. Mux API tokens are scoped
//           to a Mux environment — one env per Silhouette client.
//   coins — unlock revenue aggregated from episode_unlocks (service role,
//           always tenant-scoped).
// The sections degrade independently: a Mux outage or missing token returns
// muxError alongside intact coin data rather than failing the request.

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
  if (!tenantId) {
    return errorResponse('No tenant associated with this account', 403);
  }

  const service = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  // Producer gate: users.role, with the env allowlist as fallback.
  if (!(await isProducer(user, service))) {
    log.warn('analytics rejected: not a producer account');
    return errorResponse('This account does not have producer access', 403);
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

  // --- Coin revenue (Supabase) ---

  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
  const { data: unlocks, error: unlockError } = await service
    .from('episode_unlocks')
    .select('coins_spent, bonus_spent, episodes(title)')
    .eq('tenant_id', tenantId)
    .gte('created_at', since);

  if (unlockError) {
    log.error('unlock aggregation failed', { error: unlockError.message });
    return errorResponse('Could not load coin analytics', 500);
  }

  const byTitle = new Map<string, { unlocks: number; coins: number }>();
  let totalUnlocks = 0;
  let totalCoins = 0;
  for (const u of unlocks ?? []) {
    const title =
      ((u.episodes as unknown as { title?: string } | null)?.title as string) ?? 'Deleted episode';
    const coins = (u.coins_spent ?? 0) + (u.bonus_spent ?? 0);
    const entry = byTitle.get(title) ?? { unlocks: 0, coins: 0 };
    entry.unlocks += 1;
    entry.coins += coins;
    byTitle.set(title, entry);
    totalUnlocks += 1;
    totalCoins += coins;
  }
  const coins = {
    totals: { unlocks: totalUnlocks, coins: totalCoins },
    rows: [...byTitle.entries()]
      .map(([title, v]) => ({ title, ...v }))
      .sort((a, b) => b.unlocks - a.unlocks)
      .slice(0, 25),
  };

  // --- Audience metrics (Mux Data) ---

  let mux: {
    totals: { views: number | null; watchTimeMs: number | null };
    rows: { title: string; views: number; watchTimeMs: number }[];
  } | null = null;
  let muxError: string | null = null;

  const muxTokenId = Deno.env.get('MUX_TOKEN_ID');
  const muxTokenSecret = Deno.env.get('MUX_TOKEN_SECRET');
  if (!muxTokenId || !muxTokenSecret) {
    muxError = 'Mux API token not configured';
  } else {
    // The Mux token is env-wide, and today multiple tenants can share one Mux
    // env — so breakdown rows MUST be intersected with this tenant's episode
    // titles or producers would see other tenants' audience data. Totals are
    // summed from the intersected rows for the same reason (the /overall
    // endpoint is env-wide). Title collisions across tenants remain a known
    // limitation until each Silhouette client gets its own Mux env.
    const { data: ownEpisodes, error: titlesError } = await service
      .from('episodes')
      .select('title')
      .eq('tenant_id', tenantId);
    if (titlesError) {
      log.error('episode title lookup failed', { error: titlesError.message });
      return errorResponse('Could not load analytics', 500);
    }
    const ownTitles = new Set((ownEpisodes ?? []).map((e) => e.title as string));
    try {
      const muxHeaders = {
        Authorization: `Basic ${btoa(`${muxTokenId}:${muxTokenSecret}`)}`,
      };
      const timeframe = `timeframe[]=${days}:days`;

      const breakdownRes = await fetch(
        `https://api.mux.com/data/v1/metrics/watch_time/breakdown?group_by=video_title&${timeframe}&order_by=views&order_direction=desc&limit=100`,
        { headers: muxHeaders },
      );

      if (!breakdownRes.ok) {
        const detail = await breakdownRes.text();
        log.error('mux breakdown failed', { status: breakdownRes.status, detail });
        muxError = 'Could not fetch audience metrics from Mux';
      } else {
        const breakdown = (await breakdownRes.json()) as {
          data?: { field?: string; views?: number; total_watch_time?: number }[];
        };
        const rows = (breakdown.data ?? [])
          .filter((r) => r.field && ownTitles.has(r.field))
          .map((r) => ({
            title: r.field as string,
            views: r.views ?? 0,
            watchTimeMs: r.total_watch_time ?? 0,
          }))
          .slice(0, 25);
        mux = {
          totals: {
            views: rows.reduce((n, r) => n + r.views, 0),
            watchTimeMs: rows.reduce((n, r) => n + r.watchTimeMs, 0),
          },
          rows,
        };
      }
    } catch (err) {
      log.error('mux request failed', {
        error: err instanceof Error ? err.message : 'unknown',
      });
      muxError = 'Could not reach Mux';
    }
  }

  log.info('analytics served', {
    days,
    mux_rows: mux?.rows.length ?? 0,
    coin_rows: coins.rows.length,
    mux_error: muxError,
  });
  return jsonResponse({ days, mux, muxError, coins });
});
