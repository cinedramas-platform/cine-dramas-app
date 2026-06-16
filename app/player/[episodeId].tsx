import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, View, useWindowDimensions } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useSeriesDetail } from '@/hooks/useCatalog';
import { useWallet } from '@/hooks/useWallet';
import { SkeletonPlayer } from '@/components/ui/Skeleton';
import { VerticalFeed, type FeedEpisode } from '@/components/video/VerticalFeed';
import { Poster } from '@/components/ui/Poster';
import { Eyebrow } from '@/components/ui/Eyebrow';
import { LockIcon, PlayIcon } from '@/components/ui/Icon';
import { Colors, Fonts, Radius } from '@/constants/theme';
import { episodeCode } from '@/lib/format';
import { useIsDesktopWeb, CONTENT_MAX } from '@/lib/layout';
import { usePlayerStore } from '@/stores/playerStore';
import type { Episode } from '@/types/catalog';

const RAIL_W = 340;

export default function PlayerScreen() {
  const desktop = useIsDesktopWeb();
  const { width: winW, height: winH } = useWindowDimensions();
  const videoAspect = usePlayerStore((s) => s.videoAspect);
  const { episodeId, seriesId } = useLocalSearchParams<{ episodeId: string; seriesId?: string }>();
  const { data: series, isLoading } = useSeriesDetail(seriesId ?? '');
  const { data: wallet } = useWallet();

  // The episode currently in the player. Seeded from the route, then driven by
  // the desktop rail / auto-advance without re-navigating.
  const [currentId, setCurrentId] = useState(episodeId);
  useEffect(() => setCurrentId(episodeId), [episodeId]);

  // Ready episodes in series order (rail + stage share this).
  const ordered = useMemo<Episode[]>(
    () =>
      (series?.seasons ?? [])
        .flatMap((s) => s.episodes ?? [])
        .filter((e) => e.mux_playback_id && e.mux_asset_status === 'ready')
        .sort((a, b) => a.order - b.order),
    [series],
  );

  const toFeed = (e: Episode): FeedEpisode => ({
    id: e.id,
    playbackId: e.mux_playback_id!,
    title: e.title,
    seriesName: series?.title,
    seriesId: series?.id,
    episodeNumber: e.order,
    coinCost: e.coin_cost,
  });

  // Stage feed: chosen episode first (VerticalFeed `single` plays episodes[0]).
  const episodes = useMemo<FeedEpisode[]>(() => {
    if (seriesId && series) {
      const mapped = ordered.map(toFeed);
      const start = mapped.findIndex((e) => e.id === currentId);
      return start > 0 ? [...mapped.slice(start), ...mapped.slice(0, start)] : mapped;
    }
    return [{ id: currentId, playbackId: '' }];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seriesId, series, ordered, currentId]);

  if (seriesId && isLoading) {
    return <SkeletonPlayer />;
  }

  // ---- Desktop web: cinema stage + episode rail + auto-advance ----
  if (desktop) {
    const landscape = videoAspect != null && videoAspect > 1.05;
    const hasRail = ordered.length > 1;
    const maxStage = winW - (hasRail ? RAIL_W + 72 : 0) - 48;
    const stageWidth = landscape
      ? Math.min(CONTENT_MAX, maxStage, Math.round((winH - 96) * videoAspect))
      : Math.min(480, maxStage);

    const isVip = wallet?.is_vip ?? false;
    const unlocked = wallet?.unlocked_episode_ids ?? [];
    const isLocked = (e: Episode) =>
      !e.is_free && e.coin_cost > 0 && !isVip && !unlocked.includes(e.id);

    const goNext = () => {
      const i = ordered.findIndex((e) => e.id === currentId);
      const next = ordered[i + 1];
      if (next) setCurrentId(next.id);
    };

    return (
      <View
        style={{
          flex: 1,
          backgroundColor: '#000',
          flexDirection: 'row',
          justifyContent: 'center',
          gap: hasRail ? 24 : 0,
          paddingHorizontal: 24,
        }}
      >
        <View style={{ width: stageWidth, maxWidth: '100%' }}>
          <VerticalFeed key={currentId} episodes={episodes} single onEnded={goNext} />
        </View>

        {hasRail && (
          <View style={{ width: RAIL_W, paddingVertical: 24 }}>
            <View style={{ paddingHorizontal: 4, paddingBottom: 12, gap: 2 }}>
              <Text
                style={{ fontFamily: Fonts.display, fontSize: 20, color: Colors.ink }}
                numberOfLines={1}
              >
                {series?.title}
              </Text>
              <Eyebrow>
                {ordered.length} {ordered.length === 1 ? 'Episode' : 'Episodes'}
              </Eyebrow>
            </View>
            <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1 }}>
              {ordered.map((e) => {
                const active = e.id === currentId;
                const locked = isLocked(e);
                return (
                  <Pressable
                    key={e.id}
                    onPress={() => setCurrentId(e.id)}
                    style={{
                      flexDirection: 'row',
                      gap: 12,
                      alignItems: 'center',
                      padding: 8,
                      borderRadius: Radius.md,
                      marginBottom: 4,
                      backgroundColor: active ? 'rgba(124,92,255,0.16)' : 'transparent',
                      borderWidth: 1,
                      borderColor: active ? Colors.accent2 : 'transparent',
                    }}
                  >
                    <View style={{ position: 'relative' }}>
                      <Poster
                        playbackId={e.mux_playback_id ?? undefined}
                        width={92}
                        height={56}
                        borderRadius={8}
                        showTitle={false}
                      />
                      <View
                        style={{
                          position: 'absolute',
                          width: '100%',
                          height: '100%',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <View
                          style={{
                            width: 26,
                            height: 26,
                            borderRadius: 26,
                            backgroundColor: active ? Colors.accent2 : 'rgba(10,10,15,0.6)',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          {locked ? (
                            <LockIcon size={12} color="#fff" />
                          ) : (
                            <PlayIcon size={12} color="#fff" />
                          )}
                        </View>
                      </View>
                    </View>
                    <View style={{ flex: 1, gap: 2 }}>
                      <Eyebrow color={active ? Colors.accent : Colors.ink3}>
                        {episodeCode(e.order)}
                      </Eyebrow>
                      <Text
                        style={{
                          fontFamily: active ? Fonts.sans600 : Fonts.sans500,
                          fontSize: 13,
                          color: active ? Colors.ink : Colors.ink2,
                        }}
                        numberOfLines={2}
                      >
                        {e.title ?? `Episode ${e.order}`}
                      </Text>
                    </View>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        )}
      </View>
    );
  }

  return <VerticalFeed episodes={episodes} />;
}
