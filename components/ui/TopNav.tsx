// Desktop-web navigation bar. Replaces the bottom tab bar on wide viewports —
// brand wordmark left, section links center, coin badge right.
import { useState } from 'react';
import { Platform, Pressable, Text, View, type ViewStyle } from 'react-native';
import { usePathname, useRouter } from 'expo-router';
import { Colors, Fonts } from '@/constants/theme';
import { CoinBadge } from '@/components/ui/CoinBadge';
import { CONTENT_MAX, useWebGutter, useIsWideWeb } from '@/lib/layout';
import { APP_NAME } from '@/lib/brand';
import { useWallet } from '@/hooks/useWallet';

const LINKS = [
  { id: 'index', label: 'Home', route: '/(tabs)' },
  { id: 'search', label: 'Discover', route: '/(tabs)/search' },
  { id: 'feed', label: 'Feed', route: '/(tabs)/feed' },
  { id: 'profile', label: 'Account', route: '/(tabs)/profile' },
] as const;

function NavLink({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  const [hovered, setHovered] = useState(false);
  return (
    <Pressable
      onPress={onPress}
      onHoverIn={() => setHovered(true)}
      onHoverOut={() => setHovered(false)}
      style={{ alignItems: 'center', gap: 6, paddingVertical: 4 }}
    >
      <Text
        style={{
          fontFamily: active ? Fonts.sans600 : Fonts.sans500,
          fontSize: 13,
          letterSpacing: 0.3,
          color: active ? Colors.ink : hovered ? Colors.ink : Colors.ink2,
          ...(Platform.OS === 'web'
            ? ({ transition: 'color 160ms ease' } as unknown as object)
            : null),
        }}
      >
        {label}
      </Text>
      {/* Active/hover underline — the classic web-nav affordance. */}
      <View
        style={{
          height: 2,
          width: active ? 18 : hovered ? 12 : 0,
          borderRadius: 2,
          backgroundColor: active ? Colors.accent : Colors.ink3,
          ...(Platform.OS === 'web'
            ? ({ transition: 'width 180ms ease' } as unknown as object)
            : null),
        }}
      />
    </Pressable>
  );
}

export function TopNav() {
  const router = useRouter();
  const pathname = usePathname();
  const { data: wallet } = useWallet();
  const gutter = useWebGutter();
  const wide = useIsWideWeb();

  const activeId =
    LINKS.find((l) => (l.id === 'index' ? pathname === '/' : pathname.includes(l.id)))?.id ??
    'index';

  return (
    <View
      style={[
        {
          width: '100%',
          alignItems: 'center',
          borderBottomWidth: 1,
          borderBottomColor: Colors.glassBorder,
          backgroundColor: 'rgba(10,10,15,0.62)',
          zIndex: 50,
        },
        // Frosted, sticky bar — content scrolls under it (liquid glass).
        Platform.OS === 'web'
          ? ({
              position: 'sticky',
              top: 0,
              backdropFilter: 'blur(20px) saturate(140%)',
              WebkitBackdropFilter: 'blur(20px) saturate(140%)',
            } as unknown as ViewStyle)
          : null,
      ]}
    >
      <View
        style={{
          width: '100%',
          maxWidth: CONTENT_MAX,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingHorizontal: gutter,
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

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: wide ? 28 : 20 }}>
          {LINKS.map((link) => (
            <NavLink
              key={link.id}
              label={link.label}
              active={link.id === activeId}
              onPress={() => router.push(link.route as never)}
            />
          ))}
        </View>

        <CoinBadge total={wallet?.total ?? 0} />
      </View>
    </View>
  );
}
