import { Pressable, Text, type PressableProps, type ViewStyle } from 'react-native';
import { Colors, Fonts, Radius } from '@/constants/theme';

type Variant = 'primary' | 'accent' | 'ghost';

type Props = PressableProps & {
  label: string;
  variant?: Variant;
  block?: boolean;
  icon?: React.ReactNode;
  height?: number;
};

const variantStyles: Record<Variant, { bg: string; text: string; border?: string }> = {
  primary: { bg: Colors.ink, text: Colors.black },
  accent: { bg: Colors.accent, text: Colors.black },
  ghost: { bg: 'rgba(255,255,255,0.08)', text: Colors.ink, border: Colors.hairline },
};

export function Button({ label, variant = 'primary', block, icon, height = 48, style, ...rest }: Props) {
  const v = variantStyles[variant];
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
          backgroundColor: v.bg,
          borderWidth: v.border ? 1 : 0,
          borderColor: v.border,
          opacity: pressed ? 0.85 : 1,
          ...(block ? { width: '100%' } : {}),
        } as ViewStyle,
        typeof style === 'function' ? undefined : (style as ViewStyle),
      ]}
    >
      {icon}
      <Text
        style={{
          fontFamily: Fonts.sans600,
          fontSize: 15,
          letterSpacing: -0.15,
          color: v.text,
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}
