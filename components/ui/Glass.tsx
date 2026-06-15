// Liquid-glass surface. On web it frosts whatever is behind it via
// backdrop-filter (real glass when it overlays content); on native it falls
// back to a translucent fill (no expo-blur native dependency, so existing dev
// clients / EAS builds stay stable). Use for chrome: nav bars, chips, badges,
// floating panels.
import { Platform, View, type ViewStyle } from 'react-native';
import { Colors } from '@/constants/theme';

type Props = {
  children?: React.ReactNode;
  style?: ViewStyle | ViewStyle[];
  /** 'regular' frost or 'strong' for higher contrast over busy imagery. */
  intensity?: 'regular' | 'strong';
  /** Hairline border (default true) — the bright edge that sells the glass. */
  bordered?: boolean;
};

const isWeb = Platform.OS === 'web';

export function Glass({ children, style, intensity = 'regular', bordered = true }: Props) {
  const blur = intensity === 'strong' ? 28 : 18;
  return (
    <View
      style={[
        {
          backgroundColor: intensity === 'strong' ? Colors.glassStrong : Colors.glass,
          borderWidth: bordered ? 1 : 0,
          borderColor: Colors.glassBorder,
        },
        isWeb
          ? ({
              backdropFilter: `blur(${blur}px) saturate(140%)`,
              WebkitBackdropFilter: `blur(${blur}px) saturate(140%)`,
            } as unknown as ViewStyle)
          : null,
        style,
      ]}
    >
      {children}
    </View>
  );
}
