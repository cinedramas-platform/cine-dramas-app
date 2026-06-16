import { memo, useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  type LayoutChangeEvent,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { FlashList, type ViewToken } from '@shopify/flash-list';
import { useIsFocused } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import { VideoPlayer, type VideoPlayerRef } from '@/components/video/VideoPlayer';
import { PlayerOverlay } from '@/components/video/PlayerOverlay';
import { useSaveProgress, useWatchProgress } from '@/hooks/useWatchProgress';
import { usePlaybackToken } from '@/hooks/usePlayback';
import { usePlayerStore } from '@/stores/playerStore';
import { Colors, Fonts } from '@/constants/theme';
import { CoinIcon, LockIcon, ChevronIcon } from '@/components/ui/Icon';
import type { OnLoadData, OnProgressData } from 'react-native-video';

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
  /**
   * Render only the first episode, sized to the container (desktop-web cinema
   * stage). Skips FlashList entirely — its cells cache their mount width and
   * fight the stage's aspect-driven resizing.
   */
  single?: boolean;
  /** Fired when the active episode finishes (desktop auto-advance). */
  onEnded?: () => void;
};

type FeedItemProps = {
  episode: FeedEpisode;
  isActive: boolean;
  isLoaded: boolean;
  itemHeight: number;
  onEnded?: () => void;
};

const FeedItem = memo<FeedItemProps>(function FeedItem({
  episode,
  isActive,
  isLoaded,
  itemHeight,
  onEnded,
}) {
  const playerRef = useRef<VideoPlayerRef>(null);
  const [paused, setPaused] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [videoLoaded, setVideoLoaded] = useState(false);
  const hasSoughtRef = useRef(false);
  const wasActiveRef = useRef(false);
  // width/height from load metadata — drives the desktop-web stage layout
  // (landscape episodes get a wide player instead of the portrait reel).
  const aspectRef = useRef<number | null>(null);

  const router = useRouter();
  const { saveProgress, flush } = useSaveProgress(episode.id);
  const progressQuery = useWatchProgress(isActive ? episode.id : null);
  const savedProgress = progressQuery.data;
  // The saved position is only trustworthy once the fetch settles (success OR
  // error) — until then we must not record new progress, or an early flush
  // would overwrite the server's resume point with position ≈ 0.
  const progressSettled = progressQuery.isSuccess || progressQuery.isError;
  // Signed stream URL. A 403 (locked/unpaid) lands in `tokenError`.
  const {
    data: playback,
    isLoading: tokenLoading,
    error: tokenError,
  } = usePlaybackToken(isLoaded ? episode.id : null);

  // A covered screen (unlock/paywall pushed on top) stays mounted in the
  // navigation stack — without this gate its video keeps playing AUDIO under
  // the new screen. Subscribed per-item so a focus flip re-renders only the
  // mounted items instead of forcing a list-wide extraData pass.
  const screenFocused = useIsFocused();
  const effectivePaused = !isActive || !screenFocused || paused;

  useEffect(() => {
    if (wasActiveRef.current && !isActive) flush();
    wasActiveRef.current = isActive;
  }, [isActive, flush]);

  // Resume: only seek once the video has actually loaded — react-native-video
  // drops seeks issued before onLoad, and before the playback token resolves the
  // player isn't even mounted. hasSoughtRef doubles as "resume settled": progress
  // saving stays disabled until this effect has run once for the episode.
  useEffect(() => {
    if (!isActive || !videoLoaded || !progressSettled || hasSoughtRef.current) return;
    if (savedProgress && savedProgress.position_seconds > 0 && !savedProgress.completed) {
      playerRef.current?.seek(savedProgress.position_seconds);
    }
    hasSoughtRef.current = true;
  }, [isActive, videoLoaded, progressSettled, savedProgress]);

  // FlashList recycles this component instance for a different episode — reset
  // every piece of per-episode playback state, not just the seek bookkeeping.
  useEffect(() => {
    hasSoughtRef.current = false;
    aspectRef.current = null;
    setVideoLoaded(false);
    setPaused(false);
    setPlaybackRate(1);
    setCurrentTime(0);
    setDuration(0);
  }, [episode.id]);

  const handleVideoLoad = useCallback(
    (data: OnLoadData) => {
      const { width, height } = data.naturalSize ?? { width: 0, height: 0 };
      aspectRef.current = width > 0 && height > 0 ? width / height : null;
      if (isActive) usePlayerStore.getState().setVideoAspect(aspectRef.current);
      setVideoLoaded(true);
    },
    [isActive],
  );

  useEffect(() => {
    if (isActive) {
      usePlayerStore.getState().setEpisode(episode.id);
      usePlayerStore.getState().setIsPlaying(!paused);
      usePlayerStore.getState().setVideoAspect(aspectRef.current);
    }
  }, [isActive, episode.id, paused]);

  const handleProgress = useCallback(
    (data: OnProgressData) => {
      setCurrentTime(data.currentTime);
      setDuration(data.seekableDuration);
      if (isActive) {
        // Don't record progress until the resume decision has been made —
        // otherwise an early flush clobbers the saved position with ~0s.
        if (hasSoughtRef.current) {
          saveProgress(data.currentTime, data.seekableDuration);
        }
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
                origin: 'player',
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
        onLoad={handleVideoLoad}
        onEnd={onEnded}
        videoTitle={episode.title}
        videoId={episode.id}
      />
      {/* Web uses the native <mux-player> control bar; the custom phone overlay
          would double the controls and swallow clicks, so on web we render only
          a back button. Native keeps the full TikTok-style overlay. */}
      {isActive && Platform.OS === 'web' ? (
        <Pressable style={styles.backButton} onPress={() => router.back()} hitSlop={10}>
          <ChevronIcon size={16} color="#fff" direction="left" />
        </Pressable>
      ) : isActive ? (
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
          rate={playbackRate}
          onBack={() => router.back()}
        />
      ) : null}
    </View>
  );
});

const viewabilityConfig = {
  itemVisiblePercentThreshold: 50,
};

export function VerticalFeed({
  episodes,
  onEpisodeChange,
  single = false,
  onEnded,
}: VerticalFeedProps) {
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

  if (single) {
    return (
      <View style={styles.feed} onLayout={handleLayout}>
        <FeedItem
          episode={episodes[0]}
          isActive
          isLoaded
          itemHeight={containerHeight}
          onEnded={onEnded}
        />
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
    backgroundColor: Colors.accent2,
  },
  unlockBtnText: {
    color: Colors.onAccent,
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
