import { View, Text, Pressable, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from '@/components/ui/LinearGradient';
import { Colors, Fonts } from '@/constants/theme';
import { Eyebrow } from '@/components/ui/Eyebrow';
import { Poster } from '@/components/ui/Poster';
import { ChevronIcon, VipIcon, MoreIcon } from '@/components/ui/Icon';
import { CoinBadge } from '@/components/ui/CoinBadge';
import { useAuthStore } from '@/stores/authStore';
import { useContinueWatching } from '@/hooks/useWatchProgress';
import { useWallet } from '@/hooks/useWallet';
import { APP_NAME } from '@/lib/brand';
import type { WatchProgress } from '@/types/progress';
import { WebContent } from '@/lib/layout';

const TASTE_TAGS = [
  'Slow-burn romance',
  'Whodunit',
  'Forbidden',
  'Soap',
  'Late-night thriller',
  'Werewolf rom-com',
];

const SETTINGS = [
  'Notifications',
  'Playback & captions',
  'Mature content',
  'Downloads',
  'Account',
  'Legal',
  'Sign out',
];

export default function ProfileScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user, signOut } = useAuthStore();
  const { data: continueWatching } = useContinueWatching();
  const { data: wallet } = useWallet();

  const displayName = user?.email?.split('@')[0] ?? 'Member';
  const initial = displayName.charAt(0).toUpperCase();
  const history = (continueWatching ?? []).slice(0, 4);

  const handleSettingPress = async (setting: string) => {
    if (setting === 'Sign out') {
      await signOut();
      router.replace('/auth/login');
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: Colors.bg, paddingTop: insets.top }}>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: insets.bottom + 20 }}>
        <WebContent max={760}>
          {/* Top bar */}
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              paddingHorizontal: 20,
              paddingTop: 18,
              paddingBottom: 6,
            }}
          >
            <Eyebrow>MEMBER DOSSIER · NO. 03471</Eyebrow>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <CoinBadge total={wallet?.total ?? 0} />
              <MoreIcon size={20} color="rgba(255,255,255,0.5)" />
            </View>
          </View>

          {/* Avatar + Name */}
          <View style={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
              <View
                style={{
                  width: 84,
                  height: 84,
                  borderRadius: 84,
                  borderWidth: 1,
                  borderColor: Colors.accent,
                  position: 'relative',
                  overflow: 'visible',
                }}
              >
                <LinearGradient
                  colors={['#7E1F4A', '#3A0A14']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={{
                    width: 84,
                    height: 84,
                    borderRadius: 84,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Text
                    style={{ fontFamily: Fonts.displayItalic, fontSize: 38, color: Colors.accent }}
                  >
                    {initial}
                  </Text>
                </LinearGradient>
                {wallet?.is_vip && (
                  <View style={{ position: 'absolute', right: -6, bottom: -6 }}>
                    <VipIcon size={20} color={Colors.accent} />
                  </View>
                )}
              </View>
              <View style={{ gap: 2 }}>
                <Text
                  style={{
                    fontFamily: Fonts.display,
                    fontSize: 30,
                    lineHeight: 36,
                    color: Colors.ink,
                    letterSpacing: -0.5,
                  }}
                  numberOfLines={1}
                >
                  <Text style={{ fontFamily: Fonts.displayItalic }}>{displayName}</Text>
                </Text>
                <Text
                  style={{
                    fontFamily: Fonts.sans,
                    fontSize: 11,
                    color: Colors.ink3,
                    letterSpacing: 0.8,
                  }}
                >
                  {wallet?.is_vip ? 'VIP MEMBER' : 'MEMBER'} · {APP_NAME.toUpperCase()}
                </Text>
              </View>
            </View>
          </View>

          {/* Stat block */}
          <View style={{ paddingHorizontal: 20, paddingTop: 18 }}>
            <View
              style={{
                flexDirection: 'row',
                paddingVertical: 14,
                borderTopWidth: 1,
                borderBottomWidth: 1,
                borderColor: Colors.hairline,
                justifyContent: 'space-between',
              }}
            >
              {[
                { label: 'UNLOCKED', value: String(wallet?.unlocked_count ?? 0) },
                { label: 'COINS', value: (wallet?.total ?? 0).toLocaleString() },
                { label: 'STREAK', value: `${wallet?.streak ?? 0}d`, gold: true },
                { label: 'TIER', value: wallet?.is_vip ? 'VIP' : 'Std' },
              ].map((s) => (
                <View key={s.label} style={{ gap: 2 }}>
                  <Eyebrow>{s.label}</Eyebrow>
                  <Text
                    style={{
                      fontFamily: Fonts.displayItalic,
                      fontSize: 22,
                      color: s.gold ? Colors.accent : Colors.ink,
                    }}
                  >
                    {s.value}
                  </Text>
                </View>
              ))}
            </View>
          </View>

          {/* Taste portrait */}
          <View style={{ paddingHorizontal: 20, paddingTop: 18, paddingBottom: 4 }}>
            <Eyebrow style={{ marginBottom: 12 }}>YOUR TASTE PORTRAIT</Eyebrow>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
              {TASTE_TAGS.map((t, i) => (
                <View
                  key={t}
                  style={{
                    paddingVertical: 7,
                    paddingHorizontal: 12,
                    borderRadius: 100,
                    backgroundColor: i < 2 ? Colors.accent2 : 'rgba(255,255,255,0.04)',
                    borderWidth: 1,
                    borderColor: i < 2 ? Colors.accent : Colors.hairline,
                  }}
                >
                  <Text
                    style={{
                      fontFamily: i < 2 ? Fonts.sans600 : Fonts.sans500,
                      fontSize: 12,
                      color: i < 2 ? Colors.onAccent : Colors.ink2,
                    }}
                  >
                    {t}
                  </Text>
                </View>
              ))}
            </View>
          </View>

          {/* The History */}
          {history.length > 0 && (
            <View style={{ paddingHorizontal: 20, paddingTop: 24, paddingBottom: 4 }}>
              <View
                style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'baseline',
                  marginBottom: 12,
                }}
              >
                <Text style={{ fontFamily: Fonts.display, fontSize: 20, color: Colors.ink }}>
                  The History
                </Text>
                <Eyebrow>See all</Eyebrow>
              </View>
              {history.map((item: WatchProgress, i: number) => {
                const duration = item.episode_duration_seconds ?? 3000;
                const pct = item.completed
                  ? 100
                  : Math.round(Math.min(item.position_seconds / duration, 0.99) * 100);
                return (
                  <View
                    key={item.episode_id}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 12,
                      paddingVertical: 10,
                      borderBottomWidth: i < history.length - 1 ? 1 : 0,
                      borderBottomColor: Colors.hairline2,
                    }}
                  >
                    <Text
                      style={{
                        fontFamily: Fonts.displayItalic,
                        fontSize: 18,
                        color: Colors.ink4,
                        width: 22,
                      }}
                    >
                      0{i + 1}
                    </Text>
                    <Poster
                      playbackId={item.episode_mux_playback_id ?? undefined}
                      width={44}
                      height={64}
                      borderRadius={4}
                      showTitle={false}
                    />
                    <View style={{ flex: 1, gap: 2 }}>
                      <Text
                        style={{ fontFamily: Fonts.sans500, fontSize: 13, color: Colors.ink }}
                        numberOfLines={1}
                      >
                        {item.episode_title ?? 'Episode'}
                      </Text>
                      <Text style={{ fontFamily: Fonts.sans, fontSize: 10, color: Colors.ink3 }}>
                        {`${Math.floor(item.position_seconds / 60)}m watched`}
                      </Text>
                    </View>
                    <Text style={{ fontFamily: Fonts.mono, fontSize: 10, color: Colors.ink3 }}>
                      {pct}%
                    </Text>
                  </View>
                );
              })}
            </View>
          )}

          {/* Settings */}
          <View style={{ paddingHorizontal: 20, paddingTop: 24, paddingBottom: 22 }}>
            <Eyebrow style={{ marginBottom: 12 }}>SETTINGS</Eyebrow>
            <View style={{ borderTopWidth: 1, borderTopColor: Colors.hairline }}>
              {SETTINGS.map((s, i) => (
                <Pressable
                  key={s}
                  onPress={() => handleSettingPress(s)}
                  style={{
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    paddingVertical: 12,
                    borderBottomWidth: 1,
                    borderBottomColor: Colors.hairline2,
                  }}
                >
                  <Text
                    style={{
                      fontFamily: Fonts.sans,
                      fontSize: 13,
                      color: i === SETTINGS.length - 1 ? Colors.ink3 : Colors.ink,
                    }}
                  >
                    {s}
                  </Text>
                  <ChevronIcon size={14} color={Colors.ink4} direction="right" />
                </Pressable>
              ))}
            </View>
          </View>
        </WebContent>
      </ScrollView>
    </View>
  );
}
