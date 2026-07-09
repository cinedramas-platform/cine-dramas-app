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

type AdminAction =
  | { action: 'update-episode'; episodeId: string; fields: EpisodeFields }
  | { action: 'update-series'; seriesId: string; fields: SeriesFields };

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
