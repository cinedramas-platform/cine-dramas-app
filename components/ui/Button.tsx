import { useState } from 'react';
import { Platform, Pressable, Text, View, type PressableProps, type ViewStyle } from 'react-native';
import { LinearGradient } from '@/components/ui/LinearGradient';
import { Colors, Fonts, Gradients, Radius } from '@/constants/theme';

type Variant = 'primary' | 'accent' | 'ghost';

type Props = PressableProps & {
  label: string;
  variant?: Variant;
  block?: boolean;
  icon?: React.ReactNode;
  height?: number;
};

const isWeb = Platform.OS === 'web';

export function Button({
  label,
  variant = 'primary',
  block,
  icon,
  height = 48,
  style,
  ...rest
}: Props) {
  // accent → brand gradient fill with white content; primary → solid ink with
  // dark text; ghost → translucent fill.
  const isAccent = variant === 'accent';
  const textColor = variant === 'primary' ? Colors.bg : isAccent ? Colors.onAccent : Colors.ink;
  const [hovered, setHovered] = useState(false);

  return (
    <Pressable
      {...rest}
      onHoverIn={isWeb ? () => setHovered(true) : undefined}
      onHoverOut={isWeb ? () => setHovered(false) : undefined}
      style={({ pressed }) => [
        {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
          height,
          paddingHorizontal: 20,
          borderRadius: Radius.pill,
          overflow: 'hidden',
          backgroundColor:
            variant === 'primary'
              ? Colors.ink
              : isAccent
                ? Colors.accent2
                : 'rgba(255,255,255,0.08)',
          borderWidth: variant === 'ghost' ? 1 : 0,
          borderColor: hovered && variant === 'ghost' ? Colors.accent : Colors.hairline,
          opacity: pressed ? 0.9 : 1,
          // Lift on hover (web) — subtle, instant.
          transform: hovered ? [{ translateY: -1 }] : undefined,
          ...(block ? { width: '100%' } : {}),
        } as ViewStyle,
        typeof style === 'function' ? undefined : (style as ViewStyle),
      ]}
    >
      {isAccent && (
        <LinearGradient
          colors={Gradients.brand}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{ position: 'absolute', left: 0, top: 0, right: 0, bottom: 0 }}
        />
      )}
      {/* Hover sheen — brightens any fill, including the gradient. */}
      {hovered && (
        <View
          pointerEvents="none"
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(255,255,255,0.10)',
          }}
        />
      )}
      {icon != null && <View>{icon}</View>}
      <Text
        style={{
          fontFamily: Fonts.sans600,
          fontSize: 15,
          letterSpacing: -0.15,
          color: textColor,
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}
