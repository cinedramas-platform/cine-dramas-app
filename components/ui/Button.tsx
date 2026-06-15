import { Pressable, Text, View, type PressableProps, type ViewStyle } from 'react-native';
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

  return (
    <Pressable
      {...rest}
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
          borderColor: Colors.hairline,
          opacity: pressed ? 0.9 : 1,
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
