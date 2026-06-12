import { useMemo } from 'react';
import { useLocalSearchParams } from 'expo-router';
import { useSeriesDetail } from '@/hooks/useCatalog';
import { SkeletonPlayer } from '@/components/ui/Skeleton';
import { VerticalFeed, type FeedEpisode } from '@/components/video/VerticalFeed';
import { View, useWindowDimensions } from 'react-native';
import { useIsDesktopWeb, CONTENT_MAX } from '@/lib/layout';
import { usePlayerStore } from '@/stores/playerStore';

export default function PlayerScreen() {
  const desktop = useIsDesktopWeb();
  const { height: winH } = useWindowDimensions();
  const videoAspect = usePlayerStore((s) => s.videoAspect);
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

  // Desktop web: cinema mode — a black stage whose width adapts to the active
  // episode's format. Vertical dramas get the portrait reel column; landscape
  // ("web format") episodes get a wide player sized to fit the viewport.
  if (desktop) {
    const landscape = videoAspect != null && videoAspect > 1.05;
    const stageWidth = landscape
      ? Math.min(CONTENT_MAX, Math.round((winH - 96) * videoAspect))
      : 480;
    return (
      <View style={{ flex: 1, backgroundColor: '#000', alignItems: 'center' }}>
        <View style={{ flex: 1, width: stageWidth, maxWidth: '100%' }}>
          <VerticalFeed episodes={episodes} single />
        </View>
      </View>
    );
  }

  return <VerticalFeed episodes={episodes} />;
}
