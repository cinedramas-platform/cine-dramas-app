import { useQuery } from '@tanstack/react-query';
import { invokeFunction } from '@/services/api';

export interface PlaybackToken {
  stream_url: string;
  thumbnail_url: string;
  expires_at: string;
}

/**
 * Fetches a signed Mux stream URL for an episode from the playback-token edge
 * function. The function gates on free / VIP / coin-unlock and returns 403 for
 * locked episodes — that surfaces here as `error` so the player can show the
 * unlock state instead of playing.
 */
export function usePlaybackToken(episodeId: string | null) {
  return useQuery({
    queryKey: ['playback', episodeId],
    queryFn: () => invokeFunction<PlaybackToken>('playback-token', { episodeId: episodeId! }),
    enabled: !!episodeId,
    staleTime: 1000 * 60 * 60 * 4, // token valid ~6h; refetch well before expiry
    retry: false, // a 403 (locked) must not retry
  });
}
