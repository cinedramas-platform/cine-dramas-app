import { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSequence,
  withDelay,
  runOnJS,
} from 'react-native-reanimated';

const AUTO_HIDE_MS = 3000;
const FADE_MS = 250;
const SEEK_PER_PX = 0.15;

const SPEED_OPTIONS = [0.5, 1, 1.5, 2] as const;
type PlaybackSpeed = (typeof SPEED_OPTIONS)[number];

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
  onSpeedChange?: (speed: number) => void;
};

export function PlayerOverlay({
  title,
  seriesName,
  currentTime,
  duration,
  isPlaying,
  onTogglePlay,
  onSeek,
  onLike,
  onShowInfo,
  onSpeedChange,
}: PlayerOverlayProps) {
  const overlayOpacity = useSharedValue(1);
  const likeScale = useSharedValue(0);
  const likeOpacity = useSharedValue(0);
  const seekIndicatorOpacity = useSharedValue(0);
  const visibleRef = useRef(true);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [seekOffset, setSeekOffset] = useState(0);
  const [showSpeedMenu, setShowSpeedMenu] = useState(false);
  const [currentSpeed, setCurrentSpeed] = useState<PlaybackSpeed>(1);
  const seekStartTimeRef = useRef(0);

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

  const toggleOverlay = useCallback(() => {
    if (showSpeedMenu) {
      setShowSpeedMenu(false);
      return;
    }
    if (visibleRef.current) {
      overlayOpacity.value = withTiming(0, { duration: FADE_MS });
      visibleRef.current = false;
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    } else {
      showOverlay();
    }
  }, [overlayOpacity, showOverlay, showSpeedMenu]);

  const handleLongPress = useCallback(() => {
    setShowSpeedMenu(true);
    showOverlay();
  }, [showOverlay]);

  const handleSeekStart = useCallback(() => {
    seekStartTimeRef.current = currentTime;
    seekIndicatorOpacity.value = withTiming(1, { duration: 100 });
  }, [currentTime, seekIndicatorOpacity]);

  const handleSeekUpdate = useCallback((translationX: number) => {
    const offset = translationX * SEEK_PER_PX;
    setSeekOffset(offset);
  }, []);

  const handleSeekEnd = useCallback(
    (translationX: number) => {
      const offset = translationX * SEEK_PER_PX;
      const target = Math.max(0, Math.min(duration, seekStartTimeRef.current + offset));
      onSeek?.(target);
      setSeekOffset(0);
      seekIndicatorOpacity.value = withTiming(0, { duration: 200 });
    },
    [duration, onSeek, seekIndicatorOpacity],
  );

  const handleSpeedSelect = useCallback(
    (speed: PlaybackSpeed) => {
      setCurrentSpeed(speed);
      setShowSpeedMenu(false);
      onSpeedChange?.(speed);
      scheduleHide();
    },
    [onSpeedChange, scheduleHide],
  );

  const singleTap = Gesture.Tap()
    .maxDuration(250)
    .onEnd(() => {
      runOnJS(toggleOverlay)();
    });

  const doubleTap = Gesture.Tap()
    .numberOfTaps(2)
    .maxDuration(250)
    .onEnd(() => {
      runOnJS(triggerLike)();
    });

  const longPress = Gesture.LongPress()
    .minDuration(500)
    .onStart(() => {
      runOnJS(handleLongPress)();
    });

  const horizontalPan = Gesture.Pan()
    .activeOffsetX([-15, 15])
    .failOffsetY([-10, 10])
    .onStart(() => {
      runOnJS(handleSeekStart)();
    })
    .onUpdate((e) => {
      runOnJS(handleSeekUpdate)(e.translationX);
    })
    .onEnd((e) => {
      runOnJS(handleSeekEnd)(e.translationX);
    });

  const tapGestures = Gesture.Exclusive(doubleTap, singleTap);
  const allGestures = Gesture.Race(horizontalPan, longPress, tapGestures);

  const overlayStyle = useAnimatedStyle(() => ({
    opacity: overlayOpacity.value,
  }));

  const likeStyle = useAnimatedStyle(() => ({
    transform: [{ scale: likeScale.value }],
    opacity: likeOpacity.value,
  }));

  const seekIndicatorStyle = useAnimatedStyle(() => ({
    opacity: seekIndicatorOpacity.value,
  }));

  const progress = duration > 0 ? currentTime / duration : 0;
  const formatTime = (seconds: number) => {
    const m = Math.floor(Math.abs(seconds) / 60);
    const s = Math.floor(Math.abs(seconds) % 60);
    const sign = seconds < 0 ? '-' : '+';
    return `${sign}${m}:${s.toString().padStart(2, '0')}`;
  };
  const formatPosition = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <GestureDetector gesture={allGestures}>
      <Animated.View style={styles.touchArea}>
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
            {currentSpeed !== 1 && <Text style={styles.speedBadge}>{currentSpeed}x</Text>}
            <View style={styles.progressContainer}>
              <View style={styles.progressTrack}>
                <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
              </View>
              <Text style={styles.timeText}>
                {formatPosition(currentTime)} / {formatPosition(duration)}
              </Text>
            </View>
          </View>
        </Animated.View>

        {showSpeedMenu && (
          <View style={styles.speedMenu}>
            {SPEED_OPTIONS.map((speed) => (
              <Pressable
                key={speed}
                style={[styles.speedOption, speed === currentSpeed && styles.speedOptionActive]}
                onPress={() => handleSpeedSelect(speed)}
              >
                <Text
                  style={[
                    styles.speedOptionText,
                    speed === currentSpeed && styles.speedOptionTextActive,
                  ]}
                >
                  {speed}x
                </Text>
              </Pressable>
            ))}
          </View>
        )}

        <Animated.View style={[styles.seekIndicator, seekIndicatorStyle]} pointerEvents="none">
          <Text style={styles.seekText}>{formatTime(seekOffset)}</Text>
          <Text style={styles.seekTargetText}>
            {formatPosition(Math.max(0, Math.min(duration, seekStartTimeRef.current + seekOffset)))}
          </Text>
        </Animated.View>

        <Animated.View style={[styles.likeContainer, likeStyle]} pointerEvents="none">
          <Text style={styles.likeHeart}>♥</Text>
        </Animated.View>
      </Animated.View>
    </GestureDetector>
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
  speedBadge: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    marginBottom: 12,
    overflow: 'hidden',
  },
  speedMenu: {
    position: 'absolute',
    bottom: 100,
    alignSelf: 'center',
    flexDirection: 'row',
    backgroundColor: 'rgba(0,0,0,0.8)',
    borderRadius: 12,
    padding: 4,
    gap: 4,
  },
  speedOption: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  speedOptionActive: {
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  speedOptionText: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 15,
    fontWeight: '600',
  },
  speedOptionTextActive: {
    color: '#fff',
  },
  seekIndicator: {
    position: 'absolute',
    top: '45%',
    alignSelf: 'center',
    backgroundColor: 'rgba(0,0,0,0.7)',
    borderRadius: 10,
    paddingHorizontal: 20,
    paddingVertical: 12,
    alignItems: 'center',
  },
  seekText: {
    color: '#fff',
    fontSize: 22,
    fontWeight: '700',
  },
  seekTargetText: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 13,
    marginTop: 2,
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
