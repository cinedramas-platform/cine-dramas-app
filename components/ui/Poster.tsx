import { View, Text, type ViewStyle } from 'react-native';
import { LinearGradient } from '@/components/ui/LinearGradient';
import { Image } from 'expo-image';
import { Colors, Fonts } from '@/constants/theme';
import { getMuxThumbnailUrl } from '@/services/mux';

type Props = {
  title?: string;
  genre?: string;
  episodeCount?: number;
  playbackId?: string;
  imageUrl?: string;
  palette?: [string, string, string];
  width?: number;
  height?: number;
  borderRadius?: number;
  showTitle?: boolean;
  progress?: number;
  badge?: React.ReactNode;
  overlay?: React.ReactNode;
  style?: ViewStyle;
};

export function Poster({
  title,
  genre,
  episodeCount,
  playbackId,
  imageUrl,
  palette,
  width = 120,
  height = 180,
  borderRadius = 10,
  showTitle = true,
  progress,
  badge,
  overlay,
  style,
}: Props) {
  const [a = '#111', b = '#222', c = '#333'] = palette ?? [];
  const thumbnailUri = imageUrl
    ? imageUrl
    : playbackId
      ? getMuxThumbnailUrl(playbackId, { width: Math.round(width * 2), height: Math.round(height * 2), fitMode: 'smartcrop' })
      : undefined;

  return (
    <View
      style={[
        {
          width,
          height,
          borderRadius,
          overflow: 'hidden',
          backgroundColor: '#111',
        },
        style,
      ]}
    >
      {thumbnailUri ? (
        <Image source={{ uri: thumbnailUri }} style={{ position: 'absolute', width: '100%', height: '100%' }} contentFit="cover" />
      ) : (
        <LinearGradient colors={[a, '#000']} style={{ position: 'absolute', width: '100%', height: '100%' }} />
      )}

      <LinearGradient
        colors={['transparent', 'rgba(0,0,0,0.65)', 'rgba(0,0,0,0.92)']}
        locations={[0.35, 0.75, 1]}
        style={{ position: 'absolute', width: '100%', height: '100%' }}
      />

      {badge}
      {overlay}

      {showTitle && title && (
        <View style={{ position: 'absolute', left: width * 0.07, right: width * 0.07, bottom: width * 0.07, zIndex: 3 }}>
          <Text
            style={{
              fontFamily: Fonts.display,
              color: '#fff',
              lineHeight: Math.ceil(Math.max(13, width * 0.13) * 1.15),
              fontSize: Math.max(13, width * 0.13),
            }}
            numberOfLines={2}
          >
            {title}
          </Text>
          {genre && (
            <Text
              style={{
                marginTop: 4,
                fontFamily: Fonts.sans500,
                fontSize: 8.5,
                letterSpacing: 1.6,
                textTransform: 'uppercase',
                color: 'rgba(255,255,255,0.78)',
              }}
            >
              {genre}
              {episodeCount ? ` · EP ${episodeCount}` : ''}
            </Text>
          )}
        </View>
      )}

      {typeof progress === 'number' && (
        <View
          style={{
            position: 'absolute',
            left: 6,
            right: 6,
            bottom: 6,
            height: 2,
            borderRadius: 1,
            backgroundColor: 'rgba(255,255,255,0.2)',
            zIndex: 4,
          }}
        >
          <View
            style={{
              width: `${progress * 100}%`,
              height: '100%',
              backgroundColor: Colors.accent,
              borderRadius: 1,
            }}
          />
        </View>
      )}
    </View>
  );
}
