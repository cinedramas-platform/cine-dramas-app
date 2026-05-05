import { memo, useCallback, useRef, useState } from 'react';
import { Dimensions, StyleSheet, Text, View } from 'react-native';
import { FlashList, type ViewToken } from '@shopify/flash-list';
import { VideoPlayer } from '@/components/video/VideoPlayer';

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
};

const FeedItem = memo<FeedItemProps>(function FeedItem({ episode, isActive, isLoaded }) {
  if (!isLoaded) {
    return <View style={styles.item} />;
  }

  return (
    <View style={styles.item}>
      <VideoPlayer
        playbackId={episode.playbackId}
        token={episode.token}
        paused={!isActive}
        videoTitle={episode.title}
        videoId={episode.id}
      />
    </View>
  );
});

const viewabilityConfig = {
  itemVisiblePercentThreshold: 50,
};

export function VerticalFeed({ episodes, onEpisodeChange }: VerticalFeedProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const onEpisodeChangeRef = useRef(onEpisodeChange);
  onEpisodeChangeRef.current = onEpisodeChange;

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
      />
    ),
    [activeIndex],
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
    <FlashList
      data={episodes}
      renderItem={renderItem}
      keyExtractor={keyExtractor}
      pagingEnabled
      decelerationRate="fast"
      showsVerticalScrollIndicator={false}
      onViewableItemsChanged={onViewableItemsChanged}
      viewabilityConfig={viewabilityConfig}
      drawDistance={SCREEN_HEIGHT * 3}
      extraData={activeIndex}
    />
  );
}

const styles = StyleSheet.create({
  item: {
    height: SCREEN_HEIGHT,
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
