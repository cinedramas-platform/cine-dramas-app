import { memo, useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Dimensions, type LayoutChangeEvent, Pressable, StyleSheet, Text, View } from 'react-native';
import { FlashList, type ViewToken } from '@shopify/flash-list';
import { useRouter } from 'expo-router';
import { VideoPlayer, type VideoPlayerRef } from '@/components/video/VideoPlayer';
import { PlayerOverlay } from '@/components/video/PlayerOverlay';
import { useSaveProgress, useWatchProgress } from '@/hooks/useWatchProgress';
import { usePlaybackToken } from '@/hooks/usePlayback';
import { usePlayerStore } from '@/stores/playerStore';
import { Colors, Fonts } from '@/constants/theme';
import { CoinIcon, LockIcon, ChevronIcon } from '@/components/ui/Icon';
import type { OnProgressData } from 'react-native-video';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const PRELOAD_WINDOW = 1;

export type FeedEpisode = {
  id: string;
  playbackId: string;
  token?: string;
  title?: string;
  seriesName?: string;
  seriesId?: string;
  episodeNumber?: number;
  coinCost?: number;
};

export type VerticalFeedProps = {
  episodes: FeedEpisode[];
  onEpisodeChange?: (episode: FeedEpisode, index: number) => void;
};

type FeedItemProps = {
  episode: FeedEpisode;
  isActive: boolean;
  isLoaded: boolean;
  itemHeight: number;
};

const FeedItem = memo<FeedItemProps>(function FeedItem({
  episode,
  isActive,
  isLoaded,
  itemHeight,
}) {
  const playerRef = useRef<VideoPlayerRef>(null);
  const [paused, setPaused] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1);
  const hasSoughtRef = useRef(false);
  const wasActiveRef = useRef(false);

  const router = useRouter();
  const { saveProgress, flush } = useSaveProgress(episode.id);
  const { data: savedProgress } = useWatchProgress(isActive ? episode.id : null);
  // Signed stream URL. A 403 (locked/unpaid) lands in `tokenError`.
  const {
    data: playback,
    isLoading: tokenLoading,
    error: tokenError,
  } = usePlaybackToken(isLoaded ? episode.id : null);

  const effectivePaused = !isActive || paused;

  useEffect(() => {
    if (wasActiveRef.current && !isActive) flush();
    wasActiveRef.current = isActive;
  }, [isActive, flush]);

  useEffect(() => {
    if (
      isActive &&
      savedProgress &&
      !hasSoughtRef.current &&
      savedProgress.position_seconds > 0 &&
      !savedProgress.completed
    ) {
      playerRef.current?.seek(savedProgress.position_seconds);
      hasSoughtRef.current = true;
    }
  }, [isActive, savedProgress]);

  useEffect(() => {
    hasSoughtRef.current = false;
  }, [episode.id]);

  useEffect(() => {
    if (isActive) {
      usePlayerStore.getState().setEpisode(episode.id);
      usePlayerStore.getState().setIsPlaying(!paused);
    }
  }, [isActive, episode.id, paused]);

  const handleProgress = useCallback(
    (data: OnProgressData) => {
      setCurrentTime(data.currentTime);
      setDuration(data.seekableDuration);
      if (isActive) {
        saveProgress(data.currentTime, data.seekableDuration);
        usePlayerStore.getState().setPosition(data.currentTime);
        usePlayerStore.getState().setDuration(data.seekableDuration);
      }
    },
    [isActive, saveProgress],
  );

  const handleTogglePlay = useCallback(() => {
    if (!paused) flush();
    setPaused((p) => !p);
  }, [paused, flush]);

  const handleSeek = useCallback((time: number) => {
    playerRef.current?.seek(time);
  }, []);

  const handleSpeedChange = useCallback((speed: number) => {
    setPlaybackRate(speed);
  }, []);

  if (!isLoaded) {
    return <View style={[styles.item, { height: itemHeight }]} />;
  }

  // Locked / unpaid — playback-token returned an error (403). Show the unlock CTA
  // instead of mounting the video.
  if (tokenError) {
    return (
      <View style={[styles.item, styles.center, { height: itemHeight }]}>
        <Pressable style={styles.backButton} onPress={() => router.back()} hitSlop={10}>
          <ChevronIcon size={16} color="#fff" direction="left" />
        </Pressable>
        <LockIcon size={28} color={Colors.coin} />
        <Text style={styles.lockedSeries}>{episode.seriesName ?? ''}</Text>
        <Text style={styles.lockedTitle}>{episode.title ?? 'Locked episode'}</Text>
        <Pressable
          style={styles.unlockBtn}
          onPress={() =>
            router.push({
              pathname: '/unlock',
              params: {
                episodeId: episode.id,
                seriesId: episode.seriesId ?? '',
                seriesTitle: episode.seriesName ?? '',
                episodeNumber: String(episode.episodeNumber ?? ''),
                episodeTitle: episode.title ?? '',
                coinCost: String(episode.coinCost ?? ''),
                playbackId: episode.playbackId,
              },
            })
          }
        >
          <CoinIcon size={15} />
          <Text style={styles.unlockBtnText}>
            Unlock{episode.coinCost ? ` · ${episode.coinCost}` : ''}
          </Text>
        </Pressable>
      </View>
    );
  }

  // Awaiting signed URL.
  if (tokenLoading || !playback) {
    return (
      <View style={[styles.item, styles.center, { height: itemHeight }]}>
        <Pressable style={styles.backButton} onPress={() => router.back()} hitSlop={10}>
          <ChevronIcon size={16} color="#fff" direction="left" />
        </Pressable>
        <ActivityIndicator size="large" color="#fff" />
      </View>
    );
  }

  return (
    <View style={[styles.item, { height: itemHeight }]}>
      <VideoPlayer
        ref={playerRef}
        playbackId={episode.playbackId}
        streamUrl={playback.stream_url}
        paused={effectivePaused}
        muted={effectivePaused}
        rate={playbackRate}
        onProgress={handleProgress}
        videoTitle={episode.title}
        videoId={episode.id}
      />
      {isActive && (
        <PlayerOverlay
          title={episode.title}
          seriesName={episode.seriesName}
          episodeNumber={episode.episodeNumber}
          currentTime={currentTime}
          duration={duration}
          isPlaying={!effectivePaused}
          onTogglePlay={handleTogglePlay}
          onSeek={handleSeek}
          onSpeedChange={handleSpeedChange}
          onBack={() => router.back()}
        />
      )}
    </View>
  );
});

const viewabilityConfig = {
  itemVisiblePercentThreshold: 50,
};

export function VerticalFeed({ episodes, onEpisodeChange }: VerticalFeedProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [containerHeight, setContainerHeight] = useState(SCREEN_HEIGHT);
  const onEpisodeChangeRef = useRef(onEpisodeChange);
  onEpisodeChangeRef.current = onEpisodeChange;

  const handleLayout = useCallback((e: LayoutChangeEvent) => {
    setContainerHeight(e.nativeEvent.layout.height);
  }, []);

  const onViewableItemsChanged = useCallback(
    ({ viewableItems }: { viewableItems: ViewToken<FeedEpisode>[] }) => {
      const visible = viewableItems.find((v) => v.isViewable);
      if (visible?.index != null) {
        setActiveIndex(visible.index);
        if (visible.item) {
          onEpisodeChangeRef.current?.(visible.item, visible.index);
        }
      }
    },
    [],
  );

  const renderItem = useCallback(
    ({ item, index }: { item: FeedEpisode; index: number }) => (
      <FeedItem
        episode={item}
        isActive={index === activeIndex}
        isLoaded={Math.abs(index - activeIndex) <= PRELOAD_WINDOW}
        itemHeight={containerHeight}
      />
    ),
    [activeIndex, containerHeight],
  );

  const keyExtractor = useCallback((item: FeedEpisode) => item.id, []);

  if (episodes.length === 0) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyText}>No episodes available</Text>
      </View>
    );
  }

  return (
    <View style={styles.feed} onLayout={handleLayout}>
      <FlashList
        data={episodes}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        pagingEnabled
        decelerationRate="fast"
        showsVerticalScrollIndicator={false}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        drawDistance={containerHeight * 3}
        extraData={activeIndex}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  feed: {
    flex: 1,
  },
  item: {
    backgroundColor: '#000',
  },
  center: {
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 32,
  },
  backButton: {
    position: 'absolute',
    top: 50,
    left: 16,
    width: 36,
    height: 36,
    borderRadius: 36,
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 20,
  },
  lockedSeries: {
    color: Colors.ink3,
    fontFamily: Fonts.sans600,
    fontSize: 11,
    letterSpacing: 1.6,
    textTransform: 'uppercase',
    marginTop: 6,
  },
  lockedTitle: {
    color: '#fff',
    fontFamily: Fonts.display,
    fontSize: 22,
    textAlign: 'center',
  },
  unlockBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 14,
    paddingVertical: 12,
    paddingHorizontal: 22,
    borderRadius: 100,
    backgroundColor: Colors.accent,
  },
  unlockBtnText: {
    color: Colors.black,
    fontFamily: Fonts.sans700,
    fontSize: 13,
    letterSpacing: 0.4,
  },
  empty: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
  },
  emptyText: {
    color: '#888',
    fontSize: 16,
  },
});
