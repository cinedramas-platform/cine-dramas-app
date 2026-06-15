import { Pressable, Text } from 'react-native';
import { useRouter } from 'expo-router';
import { Colors, Fonts } from '@/constants/theme';
import { CoinIcon } from '@/components/ui/Icon';
import { Glass } from '@/components/ui/Glass';

/**
 * The coin-balance pill shown in screen headers. Tapping opens The Vault.
 * Single source of truth — home and profile previously carried byte-identical
 * copies that drifted.
 */
export function CoinBadge({ total }: { total: number }) {
  const router = useRouter();
  return (
    <Pressable onPress={() => router.push('/coins')}>
      <Glass
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 5,
          paddingVertical: 5,
          paddingLeft: 6,
          paddingRight: 10,
          borderRadius: 100,
        }}
      >
        <CoinIcon size={13} />
        <Text style={{ fontFamily: Fonts.sans600, fontSize: 11, color: Colors.coin }}>
          {total.toLocaleString()}
        </Text>
      </Glass>
    </Pressable>
  );
}
