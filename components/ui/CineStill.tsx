import { View, type ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Image } from 'expo-image';
import { getMuxThumbnailUrl } from '@/services/mux';

type Props = {
  playbackId?: string;
  palette?: [string, string, string];
  width: number;
  height: number;
  noFade?: boolean;
  borderRadius?: number;
  style?: ViewStyle;
  children?: React.ReactNode;
};

export function CineStill({ playbackId, palette, width, height, noFade, borderRadius = 0, style, children }: Props) {
  const [a = '#111', b = '#222', c = '#333'] = palette ?? [];
  const thumbnailUri = playbackId
    ? getMuxThumbnailUrl(playbackId, { width: Math.round(width * 2), height: Math.round(height * 2), fitMode: 'smartcrop' })
    : undefined;

  return (
    <View style={[{ position: 'relative', width, height, overflow: 'hidden', borderRadius }, style]}>
      {thumbnailUri ? (
        <Image source={{ uri: thumbnailUri }} style={{ position: 'absolute', width: '100%', height: '100%' }} contentFit="cover" />
      ) : (
        <LinearGradient colors={[a, '#000']} style={{ position: 'absolute', width: '100%', height: '100%' }} />
      )}

      {!noFade && (
        <LinearGradient
          colors={['transparent', 'rgba(0,0,0,0.50)', 'rgba(0,0,0,0.95)']}
          locations={[0.3, 0.65, 1]}
          style={{ position: 'absolute', width: '100%', height: '100%' }}
        />
      )}

      {children}
    </View>
  );
}
