import { useMemo } from 'react';
import { useLocalSearchParams } from 'expo-router';
import { useSeriesDetail } from '@/hooks/useCatalog';
import { SkeletonPlayer } from '@/components/ui/Skeleton';
import { VerticalFeed, type FeedEpisode } from '@/components/video/VerticalFeed';

export default function PlayerScreen() {
  const { episodeId, seriesId } = useLocalSearchParams<{ episodeId: string; seriesId?: string }>();
  const { data: series, isLoading } = useSeriesDetail(seriesId ?? '');

  const episodes = useMemo<FeedEpisode[]>(() => {
    // Build the reel from the originating series, ordered, starting at the tapped episode.
    if (seriesId && series) {
      const all = (series.seasons ?? [])
        .flatMap((s) => s.episodes ?? [])
        .sort((a, b) => a.order - b.order)
        .filter((e) => e.mux_playback_id && e.mux_asset_status === 'ready')
        .map<FeedEpisode>((e) => ({
          id: e.id,
          playbackId: e.mux_playback_id!,
          title: e.title,
          seriesName: series.title,
          seriesId: series.id,
          episodeNumber: e.order,
          coinCost: e.coin_cost,
        }));
      const start = all.findIndex((e) => e.id === episodeId);
      return start > 0 ? [...all.slice(start), ...all.slice(0, start)] : all;
    }
    // No series context (e.g. continue-watching): single-episode feed.
    // Playback is driven by the signed stream URL, so playbackId can be empty.
    return [{ id: episodeId, playbackId: '' }];
  }, [seriesId, series, episodeId]);

  if (seriesId && isLoading) {
    return <SkeletonPlayer />;
  }

  return <VerticalFeed episodes={episodes} />;
}
