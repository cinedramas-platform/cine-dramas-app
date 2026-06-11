// T3.05 — Skeleton loading states.
//
// A single shared shimmer (opacity pulse on the UI thread via Reanimated) drives
// the base <Skeleton> block; the variants compose blocks into the shapes the
// real screens render, so swapping a spinner for a skeleton keeps layout stable
// and avoids content jumping in when data arrives.
import { useEffect } from 'react';
import { View, type ViewStyle, type DimensionValue } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { Colors, Radius, Spacing } from '@/constants/theme';

type SkeletonProps = {
  width?: DimensionValue;
  height?: DimensionValue;
  radius?: number;
  style?: ViewStyle;
};

/** A single shimmering block. Compose these into screen-shaped placeholders. */
export function Skeleton({
  width = '100%',
  height = 16,
  radius = Radius.sm,
  style,
}: SkeletonProps) {
  const pulse = useSharedValue(0.4);

  useEffect(() => {
    pulse.value = withRepeat(
      withTiming(1, { duration: 850, easing: Easing.inOut(Easing.ease) }),
      -1,
      true,
    );
  }, [pulse]);

  const animatedStyle = useAnimatedStyle(() => ({ opacity: pulse.value }));

  return (
    <Animated.View
      style={[
        { width, height, borderRadius: radius, backgroundColor: Colors.elevated },
        animatedStyle,
        style,
      ]}
    />
  );
}

/** Poster card placeholder — poster block + title/subtitle lines. */
export function SkeletonCard({ width = 132 }: { width?: number }) {
  return (
    <View style={{ width, gap: Spacing.sm }}>
      <Skeleton width={width} height={width * 1.5} radius={Radius.lg} />
      <Skeleton width={width * 0.85} height={12} />
      <Skeleton width={width * 0.5} height={10} />
    </View>
  );
}

/** Horizontal rail placeholder — section label + a row of cards. */
export function SkeletonRail({
  count = 4,
  cardWidth = 132,
}: {
  count?: number;
  cardWidth?: number;
}) {
  return (
    <View style={{ gap: Spacing.md, paddingVertical: Spacing.md }}>
      <Skeleton width={140} height={14} style={{ marginHorizontal: Spacing.xl }} />
      <View style={{ flexDirection: 'row', gap: Spacing.md, paddingHorizontal: Spacing.xl }}>
        {Array.from({ length: count }).map((_, i) => (
          <SkeletonCard key={i} width={cardWidth} />
        ))}
      </View>
    </View>
  );
}

/** Episode list row placeholder — thumbnail + two text lines. */
export function SkeletonEpisodeRow() {
  return (
    <View
      style={{
        flexDirection: 'row',
        gap: Spacing.md,
        paddingHorizontal: Spacing.xl,
        paddingVertical: Spacing.sm,
        alignItems: 'center',
      }}
    >
      <Skeleton width={120} height={68} radius={Radius.md} />
      <View style={{ flex: 1, gap: Spacing.sm }}>
        <Skeleton width="70%" height={14} />
        <Skeleton width="40%" height={11} />
      </View>
    </View>
  );
}

/** Full-screen player placeholder shown while the playback token resolves. */
export function SkeletonPlayer() {
  return (
    <View
      style={{
        flex: 1,
        backgroundColor: Colors.black,
        justifyContent: 'flex-end',
        padding: Spacing.xl,
      }}
    >
      <View style={{ gap: Spacing.md, paddingBottom: Spacing.xxl }}>
        <Skeleton width="55%" height={20} />
        <Skeleton width="80%" height={12} />
        <Skeleton width="35%" height={12} />
      </View>
    </View>
  );
}
