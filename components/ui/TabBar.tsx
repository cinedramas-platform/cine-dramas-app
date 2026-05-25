import { View, Text, Pressable } from 'react-native';
import { useRouter, usePathname } from 'expo-router';
import { Colors, Fonts } from '@/constants/theme';
import { HomeIcon, SearchIcon, FeedIcon, UserIcon } from './Icon';

const TABS = [
  { id: 'index', label: 'Home', route: '/(tabs)', Icon: HomeIcon },
  { id: 'search', label: 'Search', route: '/(tabs)/search', Icon: SearchIcon },
  { id: 'feed', label: 'Feed', route: '/(tabs)/feed', Icon: FeedIcon },
  { id: 'profile', label: 'Account', route: '/(tabs)/profile', Icon: UserIcon },
] as const;

export function AppTabBar() {
  const router = useRouter();
  const pathname = usePathname();

  const activeId = TABS.find((t) => {
    if (t.id === 'index') return pathname === '/' || pathname === '/(tabs)';
    return pathname.includes(t.id);
  })?.id;

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-around',
        paddingTop: 10,
        paddingBottom: 28,
        paddingHorizontal: 12,
        borderTopWidth: 1,
        borderTopColor: Colors.hairline,
        backgroundColor: Colors.bg,
      }}
    >
      {TABS.map((tab) => {
        const isActive = tab.id === activeId;
        const color = isActive ? Colors.accent : 'rgba(250,250,250,0.45)';
        return (
          <Pressable
            key={tab.id}
            onPress={() => router.push(tab.route as any)}
            style={{ alignItems: 'center', gap: 4 }}
          >
            <tab.Icon size={22} color={color} filled={isActive && tab.id === 'index'} />
            <Text
              style={{
                fontFamily: isActive ? Fonts.sans600 : Fonts.sans500,
                fontSize: 10,
                letterSpacing: 0.2,
                color,
              }}
            >
              {tab.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
