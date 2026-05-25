import { Text, type TextProps } from 'react-native';
import { Colors, Fonts } from '@/constants/theme';

type Props = TextProps & { color?: string };

export function Eyebrow({ style, color = Colors.ink3, ...rest }: Props) {
  return (
    <Text
      {...rest}
      style={[
        {
          fontFamily: Fonts.sans500,
          fontSize: 10,
          letterSpacing: 1.8,
          textTransform: 'uppercase',
          color,
        },
        style,
      ]}
    />
  );
}
