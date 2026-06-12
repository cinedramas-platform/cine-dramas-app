import { View } from 'react-native';
import { Tabs } from 'expo-router';
import { Colors, Fonts } from '@/constants/theme';
import { HomeIcon, SearchIcon, FeedIcon, UserIcon } from '@/components/ui/Icon';
import { TopNav } from '@/components/ui/TopNav';
import { useIsDesktopWeb } from '@/lib/layout';

export default function TabsLayout() {
  // Desktop web gets a top navigation bar instead of phone bottom tabs.
  const desktop = useIsDesktopWeb();

  return (
    <View style={{ flex: 1, backgroundColor: Colors.bg }}>
      {desktop && <TopNav />}
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarStyle: desktop
            ? { display: 'none' }
            : {
                backgroundColor: Colors.bg,
                borderTopColor: Colors.hairline,
                borderTopWidth: 1,
                paddingTop: 8,
                height: 80,
              },
          tabBarActiveTintColor: Colors.accent,
          tabBarInactiveTintColor: 'rgba(250,250,250,0.45)',
          tabBarLabelStyle: {
            fontFamily: Fonts.sans500,
            fontSize: 10,
            letterSpacing: 0.2,
          },
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: 'Home',
            tabBarIcon: ({ color, focused }) => (
              <HomeIcon size={22} color={color} filled={focused} />
            ),
          }}
        />
        <Tabs.Screen
          name="search"
          options={{
            title: 'Search',
            tabBarIcon: ({ color }) => <SearchIcon size={22} color={color} />,
          }}
        />
        <Tabs.Screen
          name="feed"
          options={{
            title: 'Feed',
            tabBarIcon: ({ color }) => <FeedIcon size={22} color={color} />,
          }}
        />
        <Tabs.Screen
          name="profile"
          options={{
            title: 'Account',
            tabBarIcon: ({ color }) => <UserIcon size={22} color={color} />,
          }}
        />
      </Tabs>
    </View>
  );
}
