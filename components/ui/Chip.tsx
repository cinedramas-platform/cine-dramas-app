import { View, Text, type ViewProps } from 'react-native';
import { Colors, Fonts, Radius } from '@/constants/theme';

type Props = ViewProps & {
  label: string;
  accent?: boolean;
  icon?: React.ReactNode;
};

export function Chip({ label, accent, icon, style, ...rest }: Props) {
  return (
    <View
      {...rest}
      style={[
        {
          flexDirection: 'row',
          alignItems: 'center',
          gap: 6,
          paddingVertical: 6,
          paddingHorizontal: 10,
          borderRadius: Radius.pill,
          backgroundColor: accent ? Colors.accentTint : 'rgba(255,255,255,0.06)',
          borderWidth: 1,
          borderColor: accent
            ? 'rgba(232,197,112,0.30)'
            : Colors.hairline,
        },
        style,
      ]}
    >
      {icon}
      <Text
        style={{
          fontFamily: Fonts.sans500,
          fontSize: 11,
          letterSpacing: 0.2,
          color: accent ? Colors.accent : Colors.ink2,
        }}
      >
        {label}
      </Text>
    </View>
  );
}
