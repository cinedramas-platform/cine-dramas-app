import { memo, useCallback, useRef, useState } from 'react';
import { Dimensions, type LayoutChangeEvent, StyleSheet, Text, View } from 'react-native';
import { FlashList, type ViewToken } from '@shopify/flash-list';
import { VideoPlayer, type VideoPlayerRef } from '@/components/video/VideoPlayer';
import { PlayerOverlay } from '@/components/video/PlayerOverlay';
import type { OnProgressData } from 'react-native-video';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const PRELOAD_WINDOW = 1;

export type FeedEpisode = {
  id: string;
  playbackId: string;
  token?: string;
  title?: string;
  seriesName?: string;
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

  const effectivePaused = !isActive || paused;

  const handleProgress = useCallback((data: OnProgressData) => {
    setCurrentTime(data.currentTime);
    setDuration(data.seekableDuration);
  }, []);

  const handleTogglePlay = useCallback(() => {
    setPaused((p) => !p);
  }, []);

  const handleSeek = useCallback((time: number) => {
    playerRef.current?.seek(time);
  }, []);

  const handleSpeedChange = useCallback((speed: number) => {
    setPlaybackRate(speed);
  }, []);

  if (!isLoaded) {
    return <View style={[styles.item, { height: itemHeight }]} />;
  }

  return (
    <View style={[styles.item, { height: itemHeight }]}>
      <VideoPlayer
        ref={playerRef}
        playbackId={episode.playbackId}
        token={episode.token}
        paused={effectivePaused}
        rate={playbackRate}
        onProgress={handleProgress}
        videoTitle={episode.title}
        videoId={episode.id}
      />
      {isActive && (
        <PlayerOverlay
          title={episode.title}
          seriesName={episode.seriesName}
          currentTime={currentTime}
          duration={duration}
          isPlaying={!effectivePaused}
          onTogglePlay={handleTogglePlay}
          onSeek={handleSeek}
          onSpeedChange={handleSpeedChange}
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
