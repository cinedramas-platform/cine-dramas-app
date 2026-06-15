// Streaming-grid poster card with desktop-web hover. Phones get a plain
// pressable poster (no hover); on desktop web, hovering lifts and scales the
// art, fades in a play affordance, and rings it in gold — the ReelShort/Netflix
// "preview on hover" feel. Title + meta sit below the art like a real catalog.
import { useRef, useState } from 'react';
import { Animated, Platform, Pressable, Text, View } from 'react-native';
import { Poster } from '@/components/ui/Poster';
import { PlayIcon } from '@/components/ui/Icon';
import { Colors, Fonts, Radius } from '@/constants/theme';

const isWeb = Platform.OS === 'web';

export type PosterCardSeries = {
  id: string;
  title: string;
  category?: string;
  poster_url?: string | null;
  thumbnail_playback_id?: string | null;
  episode_count?: number;
};

export function PosterCard({
  series,
  width,
  onPress,
  showMeta = true,
}: {
  series: PosterCardSeries;
  width: number;
  onPress: () => void;
  showMeta?: boolean;
}) {
  const height = Math.round(width * 1.5); // 2:3 portrait poster
  const [hovered, setHovered] = useState(false);
  const scale = useRef(new Animated.Value(1)).current;
  const overlay = useRef(new Animated.Value(0)).current;

  const animate = (to: number) => {
    Animated.timing(scale, {
      toValue: to === 1 ? 1.04 : 1,
      duration: 200,
      useNativeDriver: true,
    }).start();
    Animated.timing(overlay, {
      toValue: to,
      duration: 180,
      useNativeDriver: true,
    }).start();
  };

  const onIn = () => {
    setHovered(true);
    animate(1);
  };
  const onOut = () => {
    setHovered(false);
    animate(0);
  };

  return (
    <Pressable
      onPress={onPress}
      onHoverIn={isWeb ? onIn : undefined}
      onHoverOut={isWeb ? onOut : undefined}
      style={{ width }}
    >
      <Animated.View
        style={{
          transform: [{ scale }],
          borderRadius: Radius.lg,
          overflow: 'hidden',
          borderWidth: 1,
          borderColor: hovered ? Colors.accent : 'transparent',
          shadowColor: '#000',
          shadowOpacity: hovered ? 0.55 : 0,
          shadowRadius: hovered ? 24 : 0,
          shadowOffset: { width: 0, height: 12 },
        }}
      >
        <Poster
          title={series.title}
          genre={series.category}
          episodeCount={series.episode_count}
          imageUrl={series.poster_url ?? undefined}
          playbackId={series.thumbnail_playback_id ?? undefined}
          width={width}
          height={height}
          borderRadius={Radius.lg}
          showTitle={!showMeta}
        />
        {/* Hover scrim + play affordance (web only; opacity stays 0 otherwise) */}
        <Animated.View
          pointerEvents="none"
          style={{
            position: 'absolute',
            width: '100%',
            height: '100%',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'rgba(8,7,10,0.35)',
            opacity: overlay,
          }}
        >
          <View
            style={{
              width: 52,
              height: 52,
              borderRadius: 52,
              backgroundColor: Colors.accent,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <PlayIcon size={20} color={Colors.black} />
          </View>
        </Animated.View>
      </Animated.View>

      {showMeta && (
        <View style={{ paddingTop: 10, gap: 3 }}>
          <Text
            style={{ fontFamily: Fonts.sans600, fontSize: 13, color: Colors.ink }}
            numberOfLines={1}
          >
            {series.title}
          </Text>
          {series.category && (
            <Text
              style={{
                fontFamily: Fonts.sans500,
                fontSize: 10,
                letterSpacing: 1.4,
                textTransform: 'uppercase',
                color: hovered ? Colors.accent : Colors.ink3,
              }}
            >
              {series.category}
              {series.episode_count ? ` · ${series.episode_count} EP` : ''}
            </Text>
          )}
        </View>
      )}
    </Pressable>
  );
}
