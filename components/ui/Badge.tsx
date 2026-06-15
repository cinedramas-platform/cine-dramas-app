import { View, Text } from 'react-native';
import { Colors, Fonts } from '@/constants/theme';
import { CoinIcon } from './Icon';

export function FreeBadge() {
  return (
    <View
      style={{
        position: 'absolute',
        top: 6,
        left: 6,
        zIndex: 3,
        paddingVertical: 3,
        paddingHorizontal: 6,
        borderRadius: 3,
        backgroundColor: 'rgba(0,0,0,0.6)',
        borderWidth: 0.5,
        borderColor: 'rgba(255,255,255,0.18)',
      }}
    >
      <Text
        style={{
          fontFamily: Fonts.sans600,
          fontSize: 9,
          letterSpacing: 1.4,
          color: '#fff',
          textTransform: 'uppercase',
        }}
      >
        Free
      </Text>
    </View>
  );
}

export function NewBadge() {
  return (
    <View
      style={{
        position: 'absolute',
        top: 6,
        left: 6,
        zIndex: 3,
        paddingVertical: 3,
        paddingHorizontal: 6,
        borderRadius: 3,
        backgroundColor: Colors.accent2,
      }}
    >
      <Text
        style={{
          fontFamily: Fonts.sans700,
          fontSize: 9,
          letterSpacing: 1.4,
          color: Colors.onAccent,
          textTransform: 'uppercase',
        }}
      >
        New
      </Text>
    </View>
  );
}

export function CoinPill({ amount }: { amount: number }) {
  return (
    <View
      style={{
        position: 'absolute',
        top: 6,
        right: 6,
        zIndex: 3,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingVertical: 3,
        paddingLeft: 4,
        paddingRight: 6,
        borderRadius: 100,
        backgroundColor: 'rgba(0,0,0,0.65)',
        borderWidth: 0.5,
        borderColor: 'rgba(255,255,255,0.15)',
      }}
    >
      <CoinIcon size={11} />
      <Text style={{ fontFamily: Fonts.sans600, fontSize: 10, color: Colors.coin }}>{amount}</Text>
    </View>
  );
}
