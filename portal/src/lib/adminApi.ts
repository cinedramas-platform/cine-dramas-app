import { supabase } from './supabase';

export interface EpisodeFields {
  title?: string;
  description?: string | null;
  is_free?: boolean;
  coin_cost?: number;
}

export interface SeriesFields {
  title?: string;
  description?: string | null;
  category?: string;
  status?: 'draft' | 'published' | 'archived';
  is_featured?: boolean;
}

export interface NewSeriesFields {
  title: string;
  category: string;
  description?: string | null;
}

type AdminAction =
  | { action: 'update-episode'; episodeId: string; fields: EpisodeFields }
  | { action: 'update-series'; seriesId: string; fields: SeriesFields }
  | { action: 'create-series'; fields: NewSeriesFields }
  | { action: 'create-season'; seriesId: string }
  | { action: 'delete-episode'; episodeId: string };

/**
 * Invokes a portal edge function and normalizes every failure into an Error
 * with a human-readable message.
 *
 * supabase-js does NOT put non-2xx response bodies in `data` — they are only
 * reachable through `error.context` (the raw Response), so the server's
 * `{ error: "..." }` message has to be extracted from there.
 */
export async function invokeEdgeFn<T>(name: string, body: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.functions.invoke(name, { body });
  if (!error) return data as T;

  const context = (error as { context?: unknown }).context;
  if (context instanceof Response) {
    if (context.status === 404) {
      throw new Error(`This feature is not deployed yet (supabase functions deploy ${name}).`);
    }
    let serverMessage: string | null = null;
    try {
      const payload = await context.json();
      if (typeof payload?.error === 'string') serverMessage = payload.error;
    } catch {
      // Non-JSON body — fall through to the generic message.
    }
    if (serverMessage) throw new Error(serverMessage);
    throw new Error(`Request failed (HTTP ${context.status}).`);
  }

  // No Response context → the function was never reached (network/DNS/not deployed).
  throw new Error(`Could not reach ${name} — is it deployed? (supabase functions deploy ${name})`);
}

/** Calls the producer-gated catalog-admin edge function. */
export async function catalogAdmin(payload: AdminAction): Promise<void> {
  await invokeEdgeFn('catalog-admin', payload);
}

export interface AnalyticsRow {
  title: string;
  views: number;
  watchTimeMs: number;
}

export interface CoinRow {
  title: string;
  unlocks: number;
  coins: number;
}

export interface AnalyticsReport {
  days: number;
  mux: {
    totals: { views: number | null; watchTimeMs: number | null };
    rows: AnalyticsRow[];
  } | null;
  muxError: string | null;
  coins: {
    totals: { unlocks: number; coins: number };
    rows: CoinRow[];
  };
}

/** Fetches audience + coin metrics from the mux-analytics edge function. */
export async function fetchAnalytics(days = 30): Promise<AnalyticsReport> {
  return invokeEdgeFn<AnalyticsReport>('mux-analytics', { days });
}
