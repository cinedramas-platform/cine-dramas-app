import { supabase } from './supabase';

export interface EpisodeFields {
  title?: string;
  description?: string | null;
  is_free?: boolean;
  coin_cost?: number;
}

export interface SeriesFields {
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
  | { action: 'delete-episode'; episodeId: string };

/** Calls the producer-gated catalog-admin edge function. Throws with a
 *  human-readable message on failure. */
export async function catalogAdmin(payload: AdminAction): Promise<void> {
  const { data, error } = await supabase.functions.invoke('catalog-admin', {
    body: payload,
  });
  if (error) {
    const status = 'status' in error ? (error as { status?: number }).status : undefined;
    if (status === 404 || error.message === 'Failed to send a request to the Edge Function') {
      throw new Error(
        'Editing service is not deployed yet (supabase functions deploy catalog-admin).',
      );
    }
    throw new Error(data?.error ?? error.message ?? 'Save failed.');
  }
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

/** Fetches audience metrics from the mux-analytics edge function. */
export async function fetchAnalytics(days = 30): Promise<AnalyticsReport> {
  const { data, error } = await supabase.functions.invoke('mux-analytics', {
    body: { days },
  });
  if (error) {
    const status = 'status' in error ? (error as { status?: number }).status : undefined;
    if (status === 404 || error.message === 'Failed to send a request to the Edge Function') {
      throw new Error(
        'Analytics service is not deployed yet (supabase functions deploy mux-analytics).',
      );
    }
    throw new Error(data?.error ?? error.message ?? 'Could not load analytics.');
  }
  return data as AnalyticsReport;
}
