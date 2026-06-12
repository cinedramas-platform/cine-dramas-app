import { Pressable, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Colors, Fonts } from '@/constants/theme';
import { CoinIcon } from '@/components/ui/Icon';

/**
 * The coin-balance pill shown in screen headers. Tapping opens The Vault.
 * Single source of truth — home and profile previously carried byte-identical
 * copies that drifted.
 */
export function CoinBadge({ total }: { total: number }) {
  const router = useRouter();
  return (
    <Pressable onPress={() => router.push('/coins')}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 4,
          paddingVertical: 4,
          paddingLeft: 5,
          paddingRight: 9,
          borderRadius: 100,
          backgroundColor: 'rgba(241,184,68,0.08)',
          borderWidth: 1,
          borderColor: 'rgba(241,184,68,0.22)',
        }}
      >
        <CoinIcon size={13} />
        <Text style={{ fontFamily: Fonts.sans600, fontSize: 11, color: Colors.coin }}>
          {total.toLocaleString()}
        </Text>
      </View>
    </Pressable>
  );
}
