import { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSequence,
  withDelay,
  runOnJS,
} from 'react-native-reanimated';
import { Colors, Fonts } from '@/constants/theme';
import { ChevronIcon, MoreIcon, HeartIcon, CommentIcon, BookmarkIcon, ShareIcon, PlayIcon, PauseIcon, SparkleIcon } from '@/components/ui/Icon';
import { Eyebrow } from '@/components/ui/Eyebrow';

const AUTO_HIDE_MS = 3000;
const FADE_MS = 250;
const SEEK_PER_PX = 0.15;

const SPEED_OPTIONS = [0.5, 1, 1.5, 2] as const;
type PlaybackSpeed = (typeof SPEED_OPTIONS)[number];

export type PlayerOverlayProps = {
  title?: string;
  seriesName?: string;
  episodeNumber?: number;
  chapterTitle?: string;
  currentTime: number;
  duration: number;
  isPlaying: boolean;
  onTogglePlay: () => void;
  onSeek?: (time: number) => void;
  onLike?: () => void;
  onShowInfo?: () => void;
  onSpeedChange?: (speed: number) => void;
  onBack?: () => void;
  onUnlockNext?: () => void;
};

export function PlayerOverlay({
  title,
  seriesName,
  episodeNumber,
  chapterTitle,
  currentTime,
  duration,
  isPlaying,
  onTogglePlay,
  onSeek,
  onLike,
  onShowInfo,
  onSpeedChange,
  onBack,
  onUnlockNext,
}: PlayerOverlayProps) {
  const insets = useSafeAreaInsets();
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

  const epLabel = episodeNumber ? `EP ${String(episodeNumber).padStart(2, '0')} / ${Math.ceil(duration / 60)}` : '';
  const chapterLabel = chapterTitle ? `  ·  ${chapterTitle.toUpperCase()}` : '';

  return (
    <GestureDetector gesture={allGestures}>
      <Animated.View style={styles.touchArea}>
        {/* Letterbox bars */}
        <View style={[styles.letterbox, { top: 0 }]} />
        <View style={[styles.letterbox, { bottom: 0 }]} />

        <Animated.View style={[styles.container, overlayStyle]} pointerEvents="box-none">
          {/* Top chrome */}
          <View style={[styles.top, { paddingTop: insets.top + 12 }]}>
            <Pressable style={styles.topButton} onPress={onBack}>
              <ChevronIcon size={14} color="#fff" direction="left" />
            </Pressable>
            <View style={{ alignItems: 'center', gap: 0 }}>
              <Eyebrow color={Colors.accent} style={{ letterSpacing: 2.4 }}>
                {seriesName?.toUpperCase() ?? 'NOW PLAYING'}
              </Eyebrow>
              <Text style={styles.epMeta}>
                {epLabel}{chapterLabel}
              </Text>
            </View>
            <Pressable style={styles.topButton}>
              <MoreIcon size={14} color="#fff" />
            </Pressable>
          </View>

          {/* Right-side action stack */}
          <View style={styles.actionStack}>
            <ActionButton icon={<HeartIcon size={22} color="#fff" />} label="98.4K" />
            <ActionButton icon={<CommentIcon size={22} color="#fff" />} label="1.2K" />
            <ActionButton icon={<BookmarkIcon size={22} color="#fff" />} />
            <ActionButton icon={<ShareIcon size={22} color="#fff" />} />
          </View>

          {/* Center play/pause */}
          <Pressable style={styles.centerPlayPause} onPress={onTogglePlay}>
            {isPlaying ? <PauseIcon size={28} color="#fff" /> : <PlayIcon size={28} color="#fff" />}
          </Pressable>

          {/* Bottom editorial title block */}
          <View style={styles.bottom}>
            <Eyebrow color={Colors.accent}>
              {chapterTitle ? `CHAPTER — ${chapterTitle.toUpperCase()}` : 'NOW PLAYING'}
            </Eyebrow>
            <Text style={styles.bottomTitle}>
              {seriesName ?? title}{' '}
              {episodeNumber && (
                <Text style={{ color: Colors.ink3, fontFamily: Fonts.displayItalic }}>
                  · EP {String(episodeNumber).padStart(2, '0')}
                </Text>
              )}
            </Text>
          </View>

          {/* Unlock prompt — inside overlay so it fades with controls */}
          {onUnlockNext && (
            <Pressable style={styles.unlockPrompt} onPress={onUnlockNext}>
              <View style={styles.unlockIcon}>
                <SparkleIcon size={12} color={Colors.accent} />
              </View>
              <View style={{ gap: 1 }}>
                <Text style={styles.unlockTitle}>DOUBLE-TAP TO UNLOCK</Text>
                <Text style={styles.unlockSub}>Next episode · 80 coins</Text>
              </View>
            </Pressable>
          )}

          {/* Progress bar — thin gold line */}
          <View style={styles.progressWrap}>
            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
            </View>
          </View>
        </Animated.View>

        {/* Speed menu */}
        {showSpeedMenu && (
          <View style={styles.speedMenu}>
            {SPEED_OPTIONS.map((speed) => (
              <Pressable
                key={speed}
                style={[styles.speedOption, speed === currentSpeed && styles.speedOptionActive]}
                onPress={() => handleSpeedSelect(speed)}
              >
                <Text style={[styles.speedOptionText, speed === currentSpeed && styles.speedOptionTextActive]}>
                  {speed}x
                </Text>
              </Pressable>
            ))}
          </View>
        )}

        {/* Seek indicator */}
        <Animated.View style={[styles.seekIndicator, seekIndicatorStyle]} pointerEvents="none">
          <Text style={styles.seekText}>{formatTime(seekOffset)}</Text>
          <Text style={styles.seekTargetText}>
            {formatPosition(Math.max(0, Math.min(duration, seekStartTimeRef.current + seekOffset)))}
          </Text>
        </Animated.View>

        {/* Like heart */}
        <Animated.View style={[styles.likeContainer, likeStyle]} pointerEvents="none">
          <HeartIcon size={80} color={Colors.accent} fill={Colors.accent} />
        </Animated.View>
      </Animated.View>
    </GestureDetector>
  );
}

function ActionButton({ icon, label }: { icon: React.ReactNode; label?: string }) {
  return (
    <View style={{ alignItems: 'center', gap: 2 }}>
      <View style={styles.actionBubble}>{icon}</View>
      {label ? <Text style={styles.actionLabel}>{label}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  touchArea: {
    ...StyleSheet.absoluteFillObject,
  },
  container: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'space-between',
    // Above the letterbox bars (zIndex 8) so the top chrome / back button isn't occluded.
    zIndex: 9,
  },
  letterbox: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 50,
    backgroundColor: '#000',
    zIndex: 8,
  },
  top: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 14,
    paddingHorizontal: 16,
    zIndex: 10,
  },
  topButton: {
    width: 30,
    height: 30,
    borderRadius: 30,
    backgroundColor: 'rgba(255,255,255,0.10)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  epMeta: {
    fontFamily: Fonts.mono,
    fontSize: 9,
    color: 'rgba(255,255,255,0.55)',
    letterSpacing: 1,
  },
  actionStack: {
    position: 'absolute',
    right: 14,
    bottom: 80,
    gap: 18,
    alignItems: 'center',
    zIndex: 6,
  },
  actionBubble: {
    width: 38,
    height: 38,
    borderRadius: 38,
    backgroundColor: 'rgba(0,0,0,0.4)',
    borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionLabel: {
    fontFamily: Fonts.sans500,
    fontSize: 9,
    color: 'rgba(255,255,255,0.7)',
  },
  bottom: {
    paddingHorizontal: 22,
    paddingBottom: 86,
    gap: 6,
    zIndex: 5,
  },
  bottomTitle: {
    fontFamily: Fonts.display,
    fontSize: 22,
    lineHeight: 24,
    color: '#fff',
    letterSpacing: -0.1,
  },
  progressWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 56,
    height: 2,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  progressTrack: {
    height: '100%',
    width: '100%',
  },
  progressFill: {
    height: '100%',
    backgroundColor: Colors.accent,
  },
  centerPlayPause: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    marginLeft: -28,
    marginTop: -28,
    width: 56,
    height: 56,
    borderRadius: 56,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 7,
  },
  unlockPrompt: {
    position: 'absolute',
    bottom: 70,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    paddingLeft: 12,
    paddingRight: 16,
    borderRadius: 100,
    backgroundColor: 'rgba(20,17,14,0.85)',
    borderWidth: 1,
    borderColor: 'rgba(232,197,112,0.3)',
    zIndex: 9,
  },
  unlockIcon: {
    width: 24,
    height: 24,
    borderRadius: 24,
    backgroundColor: 'rgba(232,197,112,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  unlockTitle: {
    fontFamily: Fonts.sans600,
    fontSize: 10,
    color: Colors.accent,
    letterSpacing: 1.4,
  },
  unlockSub: {
    fontFamily: Fonts.sans,
    fontSize: 11,
    color: 'rgba(250,246,238,0.7)',
  },
  speedMenu: {
    position: 'absolute',
    bottom: 140,
    alignSelf: 'center',
    flexDirection: 'row',
    backgroundColor: 'rgba(0,0,0,0.85)',
    borderRadius: 12,
    padding: 4,
    gap: 4,
    borderWidth: 1,
    borderColor: Colors.hairline,
    zIndex: 10,
  },
  speedOption: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  speedOptionActive: {
    backgroundColor: 'rgba(232,197,112,0.2)',
  },
  speedOptionText: {
    fontFamily: Fonts.sans600,
    color: 'rgba(255,255,255,0.6)',
    fontSize: 15,
  },
  speedOptionTextActive: {
    color: Colors.accent,
  },
  seekIndicator: {
    position: 'absolute',
    top: '45%',
    alignSelf: 'center',
    backgroundColor: 'rgba(0,0,0,0.8)',
    borderRadius: 10,
    paddingHorizontal: 20,
    paddingVertical: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.hairline,
  },
  seekText: {
    fontFamily: Fonts.mono500,
    color: '#fff',
    fontSize: 22,
  },
  seekTargetText: {
    fontFamily: Fonts.mono,
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
});
