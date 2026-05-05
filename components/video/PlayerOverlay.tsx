import { useCallback, useEffect, useRef } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSequence,
  withDelay,
} from 'react-native-reanimated';

const AUTO_HIDE_MS = 3000;
const FADE_MS = 250;

export type PlayerOverlayProps = {
  title?: string;
  seriesName?: string;
  currentTime: number;
  duration: number;
  isPlaying: boolean;
  onTogglePlay: () => void;
  onSeek?: (time: number) => void;
  onLike?: () => void;
  onShowInfo?: () => void;
};

export function PlayerOverlay({
  title,
  seriesName,
  currentTime,
  duration,
  isPlaying,
  onTogglePlay,
  onLike,
  onShowInfo,
}: PlayerOverlayProps) {
  const overlayOpacity = useSharedValue(1);
  const likeScale = useSharedValue(0);
  const likeOpacity = useSharedValue(0);
  const visibleRef = useRef(true);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastTapRef = useRef(0);

  const scheduleHide = useCallback(() => {
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    hideTimerRef.current = setTimeout(() => {
      overlayOpacity.value = withTiming(0, { duration: FADE_MS });
      visibleRef.current = false;
    }, AUTO_HIDE_MS);
  }, [overlayOpacity]);

  const showOverlay = useCallback(() => {
    overlayOpacity.value = withTiming(1, { duration: FADE_MS });
    visibleRef.current = true;
    scheduleHide();
  }, [overlayOpacity, scheduleHide]);

  useEffect(() => {
    scheduleHide();
    return () => {
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    };
  }, [scheduleHide]);

  useEffect(() => {
    if (!isPlaying && visibleRef.current === false) {
      showOverlay();
    }
    if (isPlaying && visibleRef.current) {
      scheduleHide();
    }
  }, [isPlaying, showOverlay, scheduleHide]);

  const triggerLike = useCallback(() => {
    likeScale.value = withSequence(
      withTiming(1.4, { duration: 200 }),
      withTiming(1, { duration: 150 }),
    );
    likeOpacity.value = withSequence(
      withTiming(1, { duration: 100 }),
      withDelay(400, withTiming(0, { duration: 300 })),
    );
    onLike?.();
  }, [likeScale, likeOpacity, onLike]);

  const handlePress = useCallback(() => {
    const now = Date.now();
    const delta = now - lastTapRef.current;
    lastTapRef.current = now;

    if (delta < 300) {
      triggerLike();
      return;
    }

    if (visibleRef.current) {
      overlayOpacity.value = withTiming(0, { duration: FADE_MS });
      visibleRef.current = false;
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    } else {
      showOverlay();
    }
  }, [overlayOpacity, showOverlay, triggerLike]);

  const overlayStyle = useAnimatedStyle(() => ({
    opacity: overlayOpacity.value,
  }));

  const likeStyle = useAnimatedStyle(() => ({
    transform: [{ scale: likeScale.value }],
    opacity: likeOpacity.value,
  }));

  const progress = duration > 0 ? currentTime / duration : 0;
  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <Pressable style={styles.touchArea} onPress={handlePress}>
      <Animated.View style={[styles.container, overlayStyle]} pointerEvents="box-none">
        <View style={styles.top}>
          {seriesName ? <Text style={styles.seriesName}>{seriesName}</Text> : null}
          {title ? <Text style={styles.title}>{title}</Text> : null}
        </View>

        <View style={styles.center}>
          <Pressable style={styles.playButton} onPress={onTogglePlay}>
            <Text style={styles.playIcon}>{isPlaying ? '❚❚' : '▶'}</Text>
          </Pressable>
        </View>

        <View style={styles.bottom}>
          <View style={styles.progressContainer}>
            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
            </View>
            <Text style={styles.timeText}>
              {formatTime(currentTime)} / {formatTime(duration)}
            </Text>
          </View>
        </View>
      </Animated.View>

      <Animated.View style={[styles.likeContainer, likeStyle]} pointerEvents="none">
        <Text style={styles.likeHeart}>♥</Text>
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  touchArea: {
    ...StyleSheet.absoluteFillObject,
  },
  container: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'space-between',
  },
  top: {
    paddingTop: 60,
    paddingHorizontal: 16,
  },
  seriesName: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 13,
    fontWeight: '500',
  },
  title: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
    marginTop: 4,
  },
  center: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  playButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  playIcon: {
    fontSize: 28,
    color: '#fff',
  },
  bottom: {
    paddingBottom: 40,
    paddingHorizontal: 16,
  },
  progressContainer: {
    gap: 8,
  },
  progressTrack: {
    height: 3,
    backgroundColor: 'rgba(255,255,255,0.3)',
    borderRadius: 1.5,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#fff',
    borderRadius: 1.5,
  },
  timeText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 12,
  },
  likeContainer: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    marginLeft: -40,
    marginTop: -40,
  },
  likeHeart: {
    fontSize: 80,
    color: '#ff2d55',
  },
});
