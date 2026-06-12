// Desktop-web navigation bar. Replaces the bottom tab bar on wide viewports —
// brand wordmark left, section links center, coin badge right.
import { Pressable, Text, View } from 'react-native';
import { usePathname, useRouter } from 'expo-router';
import { Colors, Fonts } from '@/constants/theme';
import { CoinBadge } from '@/components/ui/CoinBadge';
import { CONTENT_MAX } from '@/lib/layout';
import { APP_NAME } from '@/lib/brand';
import { useWallet } from '@/hooks/useWallet';

const LINKS = [
  { id: 'index', label: 'Home', route: '/(tabs)' },
  { id: 'search', label: 'Discover', route: '/(tabs)/search' },
  { id: 'feed', label: 'Feed', route: '/(tabs)/feed' },
  { id: 'profile', label: 'Account', route: '/(tabs)/profile' },
] as const;

export function TopNav() {
  const router = useRouter();
  const pathname = usePathname();
  const { data: wallet } = useWallet();

  const activeId =
    LINKS.find((l) => (l.id === 'index' ? pathname === '/' : pathname.includes(l.id)))?.id ??
    'index';

  return (
    <View
      style={{
        width: '100%',
        alignItems: 'center',
        borderBottomWidth: 1,
        borderBottomColor: Colors.hairline,
        backgroundColor: Colors.bg,
        zIndex: 50,
      }}
    >
      <View
        style={{
          width: '100%',
          maxWidth: CONTENT_MAX,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingHorizontal: 24,
          height: 64,
        }}
      >
        <Pressable onPress={() => router.push('/(tabs)')}>
          <Text
            style={{
              fontFamily: Fonts.display,
              fontSize: 24,
              color: Colors.ink,
              letterSpacing: -0.5,
            }}
          >
            {APP_NAME}
          </Text>
        </Pressable>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 28 }}>
          {LINKS.map((link) => {
            const active = link.id === activeId;
            return (
              <Pressable key={link.id} onPress={() => router.push(link.route as never)}>
                <Text
                  style={{
                    fontFamily: active ? Fonts.sans600 : Fonts.sans500,
                    fontSize: 13,
                    letterSpacing: 0.3,
                    color: active ? Colors.accent : Colors.ink2,
                  }}
                >
                  {link.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <CoinBadge total={wallet?.total ?? 0} />
      </View>
    </View>
  );
}
