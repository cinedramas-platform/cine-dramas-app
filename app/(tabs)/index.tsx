import { useCallback } from 'react';
import { View, Text, Pressable, ActivityIndicator, ScrollView, RefreshControl, Dimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { LinearGradient } from '@/components/ui/LinearGradient';
import { Colors, Fonts, Radius } from '@/constants/theme';
import { Eyebrow } from '@/components/ui/Eyebrow';
import { Poster } from '@/components/ui/Poster';
import { CineStill } from '@/components/ui/CineStill';
import { Button } from '@/components/ui/Button';
import { CoinIcon, PlayIcon, ChevronIcon } from '@/components/ui/Icon';
import { useFeatured } from '@/hooks/useCatalog';
import { useContinueWatching } from '@/hooks/useWatchProgress';
import { useWallet } from '@/hooks/useWallet';
import type { Series } from '@/types/catalog';
import type { WatchProgress } from '@/types/progress';

const { width: SCREEN_W } = Dimensions.get('window');

export default function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { data: featured, isLoading, refetch, isRefetching } = useFeatured();
  const { data: continueWatching } = useContinueWatching();
  const { data: wallet, refetch: refetchWallet } = useWallet();

  // Keep the coin badge fresh — coins may be spent/earned on other screens.
  useFocusEffect(useCallback(() => { refetchWallet(); }, [refetchWallet]));

  const goToSeries = useCallback((id: string) => router.push(`/series/${id}`), [router]);
  const goToPlayer = useCallback((episodeId: string) => router.push(`/player/${episodeId}`), [router]);

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.bg }}>
        <ActivityIndicator size="large" color={Colors.accent} />
      </View>
    );
  }

  const featuredSeries = featured?.featured ?? [];
  const categories = featured?.categories ?? {};
  const hero = featuredSeries[0];
  const editPicks = featuredSeries.slice(1, 3);
  const newThisWeek = featuredSeries.slice(0, 4);
  const railsOrder = Object.keys(categories);

  return (
    <View style={{ flex: 1, backgroundColor: Colors.bg, paddingTop: insets.top }}>
    <ScrollView
      style={{ flex: 1 }}
      refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={Colors.accent} />}
    >
      {/* Top Bar */}
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 8, paddingBottom: 14 }}>
        <View style={{ gap: 1 }}>
          <Eyebrow color={Colors.accent} style={{ letterSpacing: 3 }}>
            VOL. 12 — JUN
          </Eyebrow>
          <Text style={{ fontFamily: Fonts.display, fontSize: 26, color: Colors.ink, letterSpacing: -0.5 }}>
            CineDramas
          </Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <Pressable
            onPress={() => router.push('/coins')}
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
              {(wallet?.total ?? 0).toLocaleString()}
            </Text>
          </Pressable>
          {wallet?.is_vip && (
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                paddingVertical: 4,
                paddingHorizontal: 9,
                borderRadius: 100,
                backgroundColor: Colors.accent,
              }}
            >
              <Text style={{ fontFamily: Fonts.displayItalic, fontSize: 14, color: Colors.black, marginRight: -1 }}>V</Text>
              <Text style={{ fontFamily: Fonts.sans700, fontSize: 10, letterSpacing: 1.4, color: Colors.black }}>IP</Text>
            </View>
          )}
        </View>
      </View>

      {/* Hero */}
      {hero && (
        <Pressable onPress={() => goToSeries(hero.id)} style={{ paddingHorizontal: 16, paddingBottom: 22 }}>
          <CineStill
            imageUrl={hero.poster_url ?? undefined}
            playbackId={hero.thumbnail_playback_id ?? undefined}
            width={SCREEN_W - 32}
            height={460}
            borderRadius={Radius.xl}
            noFade
            style={{ width: '100%' }}
          >
            <LinearGradient
              colors={['rgba(0,0,0,0.45)', 'transparent', 'transparent', 'rgba(0,0,0,0.85)']}
              locations={[0, 0.25, 0.5, 0.95]}
              style={{ position: 'absolute', width: '100%', height: '100%' }}
            />
            <View style={{ position: 'absolute', top: 14, left: 14, right: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', zIndex: 5 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <View style={{ width: 6, height: 6, borderRadius: 6, backgroundColor: Colors.accent }} />
                <Eyebrow color={Colors.accent}>Now Playing on the Cover</Eyebrow>
              </View>
            </View>

            <View style={{ position: 'absolute', left: 22, right: 22, bottom: 22, zIndex: 4, gap: 10 }}>
              <Eyebrow color={Colors.accent}>The June Cover</Eyebrow>
              <Text style={{ fontFamily: Fonts.display, fontSize: 48, lineHeight: 44, color: '#fff', letterSpacing: -0.6 }}>
                {hero.title}
              </Text>
              {hero.description && (
                <Text style={{ fontFamily: Fonts.sans, fontSize: 13, color: 'rgba(255,255,255,0.78)', lineHeight: 19, maxWidth: 280 }} numberOfLines={3}>
                  {hero.description}
                </Text>
              )}
              <View style={{ flexDirection: 'row', gap: 6, marginTop: 4 }}>
                <Button
                  label="Episode 01"
                  variant="accent"
                  height={44}
                  icon={<PlayIcon size={14} color={Colors.black} />}
                  onPress={() => goToSeries(hero.id)}
                />
                <Button label="About" variant="ghost" height={44} onPress={() => goToSeries(hero.id)} />
              </View>
            </View>
          </CineStill>
        </Pressable>
      )}

      {/* Continue Watching */}
      {continueWatching && continueWatching.length > 0 && (
        <View style={{ paddingBottom: 24 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', paddingHorizontal: 20, marginBottom: 12 }}>
            <Text style={{ fontFamily: Fonts.display, fontSize: 22, color: Colors.ink }}>Continue watching</Text>
            <Eyebrow>Resume</Eyebrow>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20, gap: 10 }}>
            {continueWatching.map((item: WatchProgress) => {
              const duration = item.episode_duration_seconds ?? 3000;
              const prog = item.completed ? 1 : Math.min(item.position_seconds / duration, 0.95);
              return (
                <Pressable key={item.episode_id} onPress={() => goToPlayer(item.episode_id)} style={{ gap: 6 }}>
                  <Poster
                    playbackId={item.episode_mux_playback_id ?? undefined}
                    width={132}
                    height={86}
                    borderRadius={8}
                    showTitle={false}
                    progress={prog}
                    overlay={
                      <View style={{ position: 'absolute', width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center', zIndex: 3 }}>
                        <View style={{ width: 30, height: 30, borderRadius: 30, backgroundColor: 'rgba(0,0,0,0.55)', alignItems: 'center', justifyContent: 'center' }}>
                          <PlayIcon size={14} color="#fff" />
                        </View>
                      </View>
                    }
                  />
                  <View style={{ width: 132 }}>
                    <Text style={{ fontFamily: Fonts.sans600, fontSize: 11, color: Colors.ink }} numberOfLines={1}>
                      {item.episode_title ?? 'Episode'}
                    </Text>
                    <Text style={{ fontFamily: Fonts.sans, fontSize: 10, color: Colors.ink3, marginTop: 1 }}>
                      {item.completed ? 'Completed' : `${Math.floor(item.position_seconds / 60)}m watched`}
                    </Text>
                  </View>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>
      )}

      {/* The Edit — two-up editorial */}
      {editPicks.length >= 2 && (
        <View style={{ paddingHorizontal: 16, paddingBottom: 24 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 12 }}>
            <Text style={{ fontFamily: Fonts.display, fontSize: 22, color: Colors.ink }}>The Edit</Text>
            <Eyebrow>Curated</Eyebrow>
          </View>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            {editPicks.map((s: Series) => (
              <Pressable key={s.id} onPress={() => goToSeries(s.id)} style={{ flex: 1, gap: 6 }}>
                <Poster
                  title={s.title}
                  imageUrl={s.poster_url ?? undefined}
                  playbackId={s.thumbnail_playback_id ?? undefined}
                  genre={s.category}
                  width={(SCREEN_W - 42) / 2}
                  height={240}
                  borderRadius={10}
                />
                <Eyebrow color={Colors.accent}>{s.category}</Eyebrow>
                <Text style={{ fontFamily: Fonts.sans600, fontSize: 13, color: Colors.ink, lineHeight: 17 }} numberOfLines={2}>
                  {s.title}
                </Text>
                {s.description && (
                  <Text style={{ fontFamily: Fonts.sans, fontSize: 11, color: Colors.ink3, lineHeight: 16 }} numberOfLines={2}>
                    {s.description}
                  </Text>
                )}
              </Pressable>
            ))}
          </View>
        </View>
      )}

      {/* New this week — numbered list */}
      {newThisWeek.length > 0 && (
        <View style={{ paddingHorizontal: 20, paddingBottom: 24 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 12 }}>
            <Text style={{ fontFamily: Fonts.display, fontSize: 22, color: Colors.ink }}>New this week</Text>
            <Eyebrow>{String(newThisWeek.length).padStart(2, '0')} titles</Eyebrow>
          </View>
          {newThisWeek.map((s: Series, i: number) => (
            <Pressable
              key={s.id}
              onPress={() => goToSeries(s.id)}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 12,
                paddingVertical: 12,
                borderBottomWidth: 1,
                borderBottomColor: Colors.hairline,
              }}
            >
              <Text style={{ fontFamily: Fonts.displayItalic, fontSize: 30, color: Colors.ink4, width: 32 }}>
                0{i + 1}
              </Text>
              <Poster
                imageUrl={s.poster_url ?? undefined}
                playbackId={s.thumbnail_playback_id ?? undefined}
                width={56}
                height={80}
                borderRadius={4}
                showTitle={false}
              />
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={{ fontFamily: Fonts.sans600, fontSize: 14, color: Colors.ink }} numberOfLines={1}>
                  {s.title}
                </Text>
                <View style={{ flexDirection: 'row', gap: 6 }}>
                  <Text style={{ fontFamily: Fonts.sans, fontSize: 10, color: Colors.ink3 }}>{s.category}</Text>
                  <Text style={{ fontFamily: Fonts.sans, fontSize: 10, color: Colors.ink3 }}>·</Text>
                  <Text style={{ fontFamily: Fonts.sans, fontSize: 10, color: Colors.ink3 }}>New</Text>
                </View>
              </View>
              <ChevronIcon size={16} color={Colors.ink3} direction="right" />
            </Pressable>
          ))}
        </View>
      )}

      {/* Category rails */}
      {railsOrder.map((category) => {
        const series = categories[category];
        if (!series || series.length === 0) return null;
        return (
          <View key={category} style={{ marginBottom: 24 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', paddingHorizontal: 20, marginBottom: 12 }}>
              <Text style={{ fontFamily: Fonts.display, fontSize: 20, color: Colors.ink }}>
                {category.charAt(0).toUpperCase() + category.slice(1)}
              </Text>
              <Eyebrow>See all</Eyebrow>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20, gap: 10 }}>
              {series.map((s: Series) => (
                <Pressable key={s.id} onPress={() => goToSeries(s.id)}>
                  <Poster
                    title={s.title}
                    genre={s.category}
                    imageUrl={s.poster_url ?? undefined}
                    playbackId={s.thumbnail_playback_id ?? undefined}
                    width={108}
                    height={162}
                    borderRadius={8}
                  />
                </Pressable>
              ))}
            </ScrollView>
          </View>
        );
      })}

      <View style={{ height: 20 }} />
    </ScrollView>
    </View>
  );
}
