import { useState, useCallback } from 'react';
import { View, Text, Pressable, ActivityIndicator, ScrollView, Dimensions } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from '@/components/ui/LinearGradient';
import { Colors, Fonts, Radius } from '@/constants/theme';
import { Eyebrow } from '@/components/ui/Eyebrow';
import { Poster } from '@/components/ui/Poster';
import { CineStill } from '@/components/ui/CineStill';
import { Button } from '@/components/ui/Button';
import { ChevronIcon, ShareIcon, PlayIcon, LockIcon, CoinIcon, SparkleIcon } from '@/components/ui/Icon';
import { useSeriesDetail } from '@/hooks/useCatalog';
import { useWallet } from '@/hooks/useWallet';
import type { Episode } from '@/types/catalog';

const { width: SCREEN_W } = Dimensions.get('window');
const GRID_GAP = 8;
const GRID_PAD = 22;
const GRID_COLS = 4;
const GRID_ITEM_W = (SCREEN_W - GRID_PAD * 2 - GRID_GAP * (GRID_COLS - 1)) / GRID_COLS;

export default function SeriesDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { data: series, isLoading, error } = useSeriesDetail(id);
  const { data: wallet } = useWallet();
  const [selectedSeasonIndex, setSelectedSeasonIndex] = useState(0);
  const [activeTab, setActiveTab] = useState(0);

  const unlockedIds = wallet?.unlocked_episode_ids ?? [];
  const isVip = wallet?.is_vip ?? false;
  const isLocked = useCallback(
    (ep: Episode) => !ep.is_free && ep.coin_cost > 0 && !isVip && !unlockedIds.includes(ep.id),
    [isVip, unlockedIds],
  );

  const handlePlayEpisode = useCallback(
    (episodeId: string) => router.push({ pathname: `/player/${episodeId}`, params: { seriesId: id } }),
    [router, id],
  );

  const handleUnlockEpisode = useCallback(
    (ep: Episode) => router.push({
      pathname: '/unlock',
      params: {
        episodeId: ep.id,
        seriesId: series?.id ?? '',
        seriesTitle: series?.title ?? '',
        episodeNumber: String(ep.order),
        episodeTitle: ep.title ?? 'Untitled',
        coinCost: String(ep.coin_cost),
        playbackId: series?.thumbnail_playback_id ?? '',
      },
    }),
    [router, series],
  );

  if (isLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: Colors.bg, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color={Colors.accent} />
      </View>
    );
  }

  if (error || !series) {
    return (
      <View style={{ flex: 1, backgroundColor: Colors.bg, justifyContent: 'center', alignItems: 'center' }}>
        <Text style={{ fontFamily: Fonts.sans, fontSize: 16, color: '#ff4444' }}>Failed to load series</Text>
      </View>
    );
  }

  const seasons = series.seasons ?? [];
  const activeSeason = seasons[selectedSeasonIndex];
  const episodes = activeSeason?.episodes ?? [];
  const totalEpisodes = seasons.reduce((sum, s) => sum + (s.episodes?.length ?? 0), 0);
  const firstPlayableEp = episodes.find((e) => e.mux_playback_id && e.mux_asset_status === 'ready');
  const nextLockedEp = episodes.find((e) => isLocked(e));

  return (
    <View style={{ flex: 1, backgroundColor: Colors.bg, paddingTop: insets.top }}>
    <ScrollView style={{ flex: 1 }}>
      {/* Masthead */}
      <View
        style={{
          position: 'absolute',
          top: 10,
          left: 0,
          right: 0,
          zIndex: 10,
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          paddingHorizontal: 20,
        }}
      >
        <Pressable
          onPress={() => router.back()}
          style={{
            width: 36,
            height: 36,
            borderRadius: 36,
            backgroundColor: 'rgba(255,255,255,0.08)',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <ChevronIcon size={16} color="#fff" direction="left" />
        </Pressable>
        <Eyebrow>SERIES NO. {String(series.sort_order ?? 1).padStart(3, '0')}</Eyebrow>
        <Pressable
          style={{
            width: 36,
            height: 36,
            borderRadius: 36,
            backgroundColor: 'rgba(255,255,255,0.08)',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <ShareIcon size={16} color="#fff" />
        </Pressable>
      </View>

      {/* Hero */}
      <View style={{ paddingHorizontal: 20, paddingTop: 54, paddingBottom: 14 }}>
        <CineStill
          imageUrl={series.poster_url ?? undefined}
          playbackId={series.thumbnail_playback_id ?? undefined}
          width={SCREEN_W - 40}
          height={440}
          borderRadius={Radius.lg}
          style={{ width: '100%' }}
        >
          <LinearGradient
            colors={['transparent', 'rgba(0,0,0,0.85)']}
            locations={[0.5, 1]}
            style={{ position: 'absolute', width: '100%', height: '100%' }}
          />
          <View style={{ position: 'absolute', left: 22, right: 22, bottom: 22, gap: 8 }}>
            <Eyebrow color={Colors.accent}>
              {series.tags?.length ? series.tags.join(' · ').toUpperCase() : series.category?.toUpperCase()}
            </Eyebrow>
            <Text style={{ fontFamily: Fonts.display, fontSize: 56, lineHeight: 50, color: '#fff', letterSpacing: -0.6 }}>
              {series.title}
            </Text>
          </View>
        </CineStill>
      </View>

      {/* Meta bar */}
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          paddingHorizontal: 22,
          paddingVertical: 14,
          borderBottomWidth: 1,
          borderBottomColor: Colors.hairline,
        }}
      >
        {[
          { label: 'Episodes', value: String(totalEpisodes) },
          { label: 'Seasons', value: String(seasons.length) },
          { label: 'Category', value: series.category },
        ].map((m) => (
          <View key={m.label} style={{ gap: 2 }}>
            <Text style={{ fontFamily: Fonts.sans500, fontSize: 9, letterSpacing: 1.6, textTransform: 'uppercase', color: Colors.ink3 }}>
              {m.label}
            </Text>
            <Text style={{ fontFamily: Fonts.display, fontSize: 18, color: Colors.ink }}>{m.value}</Text>
          </View>
        ))}
      </View>

      {/* Logline */}
      {series.description && (
        <View style={{ paddingHorizontal: 22, paddingTop: 16, paddingBottom: 8 }}>
          <Text style={{ fontFamily: Fonts.displayItalic, fontSize: 18, color: Colors.ink, lineHeight: 24 }}>
            "{series.description}"
          </Text>
        </View>
      )}

      {/* CTA */}
      <View style={{ paddingHorizontal: 22, paddingTop: 14, paddingBottom: 18 }}>
        <Button
          label={firstPlayableEp ? `Continue — Episode ${firstPlayableEp.order}` : 'No episodes available'}
          variant="accent"
          block
          height={52}
          icon={<PlayIcon size={15} color={Colors.black} />}
          onPress={() => firstPlayableEp && handlePlayEpisode(firstPlayableEp.id)}
        />
      </View>

      {/* Tabs */}
      <View style={{ flexDirection: 'row', paddingHorizontal: 22, gap: 14, borderBottomWidth: 1, borderBottomColor: Colors.hairline }}>
        {['Episodes', 'Cast', 'Reviews'].map((t, i) => (
          <Pressable key={t} onPress={() => setActiveTab(i)} style={{ paddingBottom: 10 }}>
            <Text
              style={{
                fontFamily: i === activeTab ? Fonts.sans600 : Fonts.sans500,
                fontSize: 12,
                color: i === activeTab ? Colors.accent : Colors.ink3,
                letterSpacing: 0.4,
              }}
            >
              {t}
            </Text>
          </Pressable>
        ))}
      </View>

      {/* Slide-to-unlock prompt */}
      {nextLockedEp && (
        <Pressable onPress={() => handleUnlockEpisode(nextLockedEp)} style={{ paddingHorizontal: 22, paddingTop: 14, paddingBottom: 8 }}>
          <View
            style={{
              padding: 12,
              borderRadius: Radius.lg,
              borderWidth: 1,
              borderColor: 'rgba(232,197,112,0.25)',
              overflow: 'hidden',
            }}
          >
            <LinearGradient
              colors={['rgba(232,197,112,0.10)', 'rgba(232,197,112,0.02)']}
              style={{ position: 'absolute', width: '100%', height: '100%', left: 0, top: 0 }}
            />
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <View style={{ gap: 2 }}>
                <Eyebrow color={Colors.accent}>UP NEXT · EP {String(nextLockedEp.order).padStart(2, '0')}</Eyebrow>
                <Text style={{ fontFamily: Fonts.sans600, fontSize: 13, color: Colors.ink }}>{nextLockedEp.title}</Text>
              </View>
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 4,
                  paddingVertical: 4,
                  paddingHorizontal: 8,
                  borderRadius: 100,
                  backgroundColor: 'rgba(0,0,0,0.4)',
                }}
              >
                <CoinIcon size={11} />
                <Text style={{ fontFamily: Fonts.sans600, fontSize: 11, color: Colors.coin }}>{nextLockedEp.coin_cost}</Text>
              </View>
            </View>
            {/* Slider rail */}
            <View
              style={{
                height: 44,
                borderRadius: 22,
                backgroundColor: 'rgba(0,0,0,0.5)',
                borderWidth: 1,
                borderColor: 'rgba(232,197,112,0.20)',
                overflow: 'hidden',
                justifyContent: 'center',
              }}
            >
              <LinearGradient
                colors={['rgba(232,197,112,0.18)', 'rgba(232,197,112,0.0)']}
                start={{ x: 0, y: 0 }}
                end={{ x: 0.6, y: 0 }}
                style={{ position: 'absolute', width: '100%', height: '100%', borderRadius: 22 }}
              />
              <View
                style={{
                  position: 'absolute',
                  top: 3,
                  left: 3,
                  width: 38,
                  height: 38,
                  borderRadius: 38,
                  backgroundColor: Colors.accent,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <ChevronIcon size={16} color={Colors.black} direction="right" />
              </View>
              <Text
                style={{
                  fontFamily: Fonts.sans500,
                  fontSize: 12,
                  color: Colors.accent,
                  letterSpacing: 0.8,
                  textAlign: 'center',
                  paddingLeft: 24,
                }}
              >
                Slide to unlock with coins
              </Text>
            </View>
          </View>
        </Pressable>
      )}

      {/* Season selector + Episode grid */}
      <View style={{ paddingHorizontal: 22, paddingTop: 10, paddingBottom: 14 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 10 }}>
          <Eyebrow>
            Season {String(activeSeason?.number ?? 1).padStart(2, '0')} · {episodes.length} of {totalEpisodes} shown
          </Eyebrow>
          {seasons.length > 1 && (
            <Pressable
              onPress={() => setSelectedSeasonIndex((i) => (i + 1) % seasons.length)}
            >
              <Eyebrow color={Colors.accent}>Seasons ▾</Eyebrow>
            </Pressable>
          )}
        </View>

        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: GRID_GAP }}>
          {episodes.map((ep: Episode) => {
            const isPlayable = ep.mux_playback_id && ep.mux_asset_status === 'ready';
            const locked = isLocked(ep);
            return (
              <Pressable
                key={ep.id}
                onPress={() => locked ? handleUnlockEpisode(ep) : isPlayable && handlePlayEpisode(ep.id)}
                style={{ width: GRID_ITEM_W, aspectRatio: 9 / 14, borderRadius: 6, overflow: 'hidden', position: 'relative' }}
              >
                <Poster
                  playbackId={ep.mux_playback_id ?? undefined}
                  width={GRID_ITEM_W}
                  height={GRID_ITEM_W * (14 / 9)}
                  borderRadius={6}
                  showTitle={false}
                  style={{ width: '100%', height: '100%' }}
                />
                <View style={{ position: 'absolute', width: '100%', height: '100%', backgroundColor: locked ? 'rgba(0,0,0,0.55)' : 'rgba(0,0,0,0.15)' }} />
                <Text
                  style={{
                    position: 'absolute',
                    top: 4,
                    left: 5,
                    fontFamily: Fonts.mono,
                    fontSize: 9,
                    fontWeight: '600',
                    color: '#fff',
                    letterSpacing: 0.4,
                  }}
                >
                  EP{String(ep.order).padStart(2, '0')}
                </Text>
                {locked && (
                  <View style={{ position: 'absolute', bottom: 6, right: 6 }}>
                    <LockIcon size={10} color={Colors.coin} />
                  </View>
                )}
                {!locked && isPlayable && (
                  <View
                    style={{
                      position: 'absolute',
                      bottom: 6,
                      right: 6,
                      width: 16,
                      height: 16,
                      borderRadius: 16,
                      backgroundColor: Colors.accent,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <PlayIcon size={8} color={Colors.black} />
                  </View>
                )}
              </Pressable>
            );
          })}
        </View>
      </View>

      <View style={{ height: 40 }} />
    </ScrollView>
    </View>
  );
}
