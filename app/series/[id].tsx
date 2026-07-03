import { useState, useCallback, useMemo } from 'react';
import { View, Text, Pressable, ScrollView } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from '@/components/ui/LinearGradient';
import { Colors, Fonts, Radius, displayType } from '@/constants/theme';
import { Eyebrow } from '@/components/ui/Eyebrow';
import { Poster } from '@/components/ui/Poster';
import { CineStill } from '@/components/ui/CineStill';
import { Button } from '@/components/ui/Button';
import { ChevronIcon, ShareIcon, PlayIcon, LockIcon, CoinIcon } from '@/components/ui/Icon';
import { episodeCode } from '@/lib/format';
import { Skeleton, SkeletonEpisodeRow } from '@/components/ui/Skeleton';
import { useSeriesDetail } from '@/hooks/useCatalog';
import { useWallet } from '@/hooks/useWallet';
import { useContinueWatching } from '@/hooks/useWatchProgress';
import type { Episode } from '@/types/catalog';
import {
  WebContent,
  useContentWidth,
  useIsDesktopWeb,
  useIsWideWeb,
  useWebGutter,
} from '@/lib/layout';

const GRID_GAP = 8;
const GRID_PAD = 20;

// Hoisted to module scope (a component declared inside the screen body gets a
// fresh type each render → React remounts the whole grid). Shared by the mobile
// single-column layout and the desktop two-column layout.
function EpisodeGrid({
  episodes,
  itemW,
  gap,
  isLocked,
  onPlay,
  onUnlock,
}: {
  episodes: Episode[];
  itemW: number;
  gap: number;
  isLocked: (ep: Episode) => boolean;
  onPlay: (id: string) => void;
  onUnlock: (ep: Episode) => void;
}) {
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap }}>
      {episodes.map((ep) => {
        const isPlayable = ep.mux_playback_id && ep.mux_asset_status === 'ready';
        const locked = isLocked(ep);
        return (
          <Pressable
            key={ep.id}
            onPress={() => (locked ? onUnlock(ep) : isPlayable && onPlay(ep.id))}
            style={{
              width: itemW,
              aspectRatio: 9 / 14,
              borderRadius: 6,
              overflow: 'hidden',
              position: 'relative',
            }}
          >
            <Poster
              playbackId={ep.mux_playback_id ?? undefined}
              width={itemW}
              height={itemW * (14 / 9)}
              borderRadius={6}
              showTitle={false}
              style={{ width: '100%', height: '100%' }}
            />
            <View
              style={{
                position: 'absolute',
                width: '100%',
                height: '100%',
                backgroundColor: locked ? 'rgba(0,0,0,0.55)' : 'rgba(0,0,0,0.15)',
              }}
            />
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
              {episodeCode(ep.order)}
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
                  backgroundColor: Colors.accent2,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <PlayIcon size={8} color={Colors.onAccent} />
              </View>
            )}
          </Pressable>
        );
      })}
    </View>
  );
}

function SlideToUnlock({ ep, onPress }: { ep: Episode; onPress: () => void }) {
  return (
    <Pressable onPress={onPress}>
      <View
        style={{
          padding: 12,
          borderRadius: Radius.lg,
          borderWidth: 1,
          borderColor: 'rgba(183,164,255,0.25)',
          overflow: 'hidden',
        }}
      >
        <LinearGradient
          colors={['rgba(183,164,255,0.10)', 'rgba(183,164,255,0.02)']}
          style={{ position: 'absolute', width: '100%', height: '100%', left: 0, top: 0 }}
        />
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 10,
          }}
        >
          <View style={{ gap: 2 }}>
            <Eyebrow color={Colors.accent}>
              UP NEXT · EP {String(ep.order).padStart(2, '0')}
            </Eyebrow>
            <Text style={{ fontFamily: Fonts.sans600, fontSize: 13, color: Colors.ink }}>
              {ep.title}
            </Text>
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
            <Text style={{ fontFamily: Fonts.sans600, fontSize: 11, color: Colors.coin }}>
              {ep.coin_cost}
            </Text>
          </View>
        </View>
        <View
          style={{
            height: 44,
            borderRadius: 22,
            backgroundColor: 'rgba(0,0,0,0.5)',
            borderWidth: 1,
            borderColor: 'rgba(183,164,255,0.20)',
            overflow: 'hidden',
            justifyContent: 'center',
          }}
        >
          <LinearGradient
            colors={['rgba(183,164,255,0.18)', 'rgba(183,164,255,0.0)']}
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
              backgroundColor: Colors.accent2,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <ChevronIcon size={16} color={Colors.onAccent} direction="right" />
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
  );
}

export default function SeriesDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const desktop = useIsDesktopWeb();
  const wide = useIsWideWeb();
  const gutter = useWebGutter();
  const SCREEN_W = useContentWidth(1100);
  const GRID_COLS = desktop ? 6 : 4;
  const GRID_ITEM_W = (SCREEN_W - GRID_PAD * 2 - GRID_GAP * (GRID_COLS - 1)) / GRID_COLS;
  const { data: series, isLoading, error } = useSeriesDetail(id);
  const { data: wallet } = useWallet();
  const { data: continueWatching } = useContinueWatching();
  const [selectedSeasonIndex, setSelectedSeasonIndex] = useState(0);

  const unlockedIds = wallet?.unlocked_episode_ids ?? [];
  const isVip = wallet?.is_vip ?? false;
  const isLocked = useCallback(
    (ep: Episode) => !ep.is_free && ep.coin_cost > 0 && !isVip && !unlockedIds.includes(ep.id),
    [isVip, unlockedIds],
  );

  const handlePlayEpisode = useCallback(
    (episodeId: string) =>
      router.push({ pathname: `/player/${episodeId}`, params: { seriesId: id } }),
    [router, id],
  );

  const handleUnlockEpisode = useCallback(
    (ep: Episode) =>
      router.push({
        pathname: '/unlock',
        params: {
          episodeId: ep.id,
          seriesId: series?.id ?? '',
          seriesTitle: series?.title ?? '',
          episodeNumber: String(ep.order),
          episodeTitle: ep.title ?? 'Untitled',
          coinCost: String(ep.coin_cost),
          playbackId: series?.thumbnail_playback_id ?? '',
          origin: 'series',
        },
      }),
    [router, series],
  );

  // CTA target. Resume = the viewer's most recent in-progress episode in this
  // series — but only if it's still playable AND not (re-)locked; otherwise the
  // label would lie about what actually plays. Fallback is the first playable
  // episode of the whole series (not the selected season), so the CTA doesn't
  // change when the season selector is cycled.
  const { ctaEp, ctaLabel } = useMemo(() => {
    const all = (series?.seasons ?? []).flatMap((s) => s.episodes ?? []);
    const playable = (e: Episode) => Boolean(e.mux_playback_id && e.mux_asset_status === 'ready');
    const byId = new Map(all.map((e) => [e.id, e]));
    const resume = (continueWatching ?? [])
      .map((p) => byId.get(p.episode_id))
      .find((e) => e && playable(e) && !isLocked(e));
    const first = all.find(playable);
    const target = resume ?? first;
    const label = resume
      ? `Continue — Episode ${resume.order}`
      : first
        ? `Start — Episode ${first.order}`
        : 'No episodes available';
    return { ctaEp: target, ctaLabel: label };
  }, [series, continueWatching, isLocked]);

  if (isLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: Colors.bg, paddingTop: insets.top }}>
        <Skeleton width="100%" height={SCREEN_W * 0.62} radius={0} />
        <View style={{ padding: GRID_PAD, gap: 12 }}>
          <Skeleton width="60%" height={24} />
          <Skeleton width="90%" height={12} />
          <Skeleton width="80%" height={12} />
        </View>
        {Array.from({ length: 5 }).map((_, i) => (
          <SkeletonEpisodeRow key={i} />
        ))}
      </View>
    );
  }

  if (error || !series) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: Colors.bg,
          justifyContent: 'center',
          alignItems: 'center',
          paddingHorizontal: 32,
          gap: 8,
        }}
      >
        <Text style={{ ...displayType(26), color: Colors.ink, textAlign: 'center' }}>
          We couldn’t load this title
        </Text>
        <Text
          style={{
            fontFamily: Fonts.sans,
            fontSize: 13,
            color: Colors.ink3,
            textAlign: 'center',
            lineHeight: 20,
            maxWidth: 320,
          }}
        >
          Check your connection and try again.
        </Text>
        <View style={{ height: 12 }} />
        <Button label="Go back" variant="accent" height={46} onPress={() => router.back()} />
      </View>
    );
  }

  const seasons = series.seasons ?? [];
  const activeSeason = seasons[selectedSeasonIndex];
  const episodes = activeSeason?.episodes ?? [];
  const totalEpisodes = seasons.reduce((sum, s) => sum + (s.episodes?.length ?? 0), 0);
  const nextLockedEp = episodes.find((e) => isLocked(e));

  // Desktop web: a true two-column detail page (Netflix/ReelShort feel) — a tall
  // poster + meta + CTA pinned left, the synopsis and episode grid right. The
  // phone layout (single scroll column) is left untouched below.
  if (desktop) {
    const POSTER_W = wide ? 360 : 300;
    const COL_GAP = wide ? 56 : 36;
    const RIGHT_GAP = 12;
    const RIGHT_COLS = wide ? 5 : 4;
    const rightW = SCREEN_W - POSTER_W - COL_GAP;
    const itemW = (rightW - RIGHT_GAP * (RIGHT_COLS - 1)) / RIGHT_COLS;
    return (
      <View style={{ flex: 1, backgroundColor: Colors.bg }}>
        <ScrollView style={{ flex: 1 }}>
          <WebContent max={1180}>
            <View
              style={{
                flexDirection: 'row',
                gap: COL_GAP,
                paddingHorizontal: gutter,
                paddingTop: 36,
                paddingBottom: 72,
              }}
            >
              {/* LEFT — poster, meta, CTA (sticky) */}
              <View
                style={
                  {
                    width: POSTER_W,
                    gap: 18,
                    position: 'sticky' as never,
                    top: 88,
                    alignSelf: 'flex-start',
                  } as never
                }
              >
                <View style={{ borderRadius: Radius.xl, overflow: 'hidden' }}>
                  <CineStill
                    imageUrl={series.poster_url ?? undefined}
                    playbackId={series.thumbnail_playback_id ?? undefined}
                    width={POSTER_W}
                    height={Math.round(POSTER_W * 1.4)}
                    borderRadius={Radius.xl}
                    style={{ width: '100%' }}
                  />
                </View>
                <Button
                  label={ctaLabel}
                  variant="accent"
                  block
                  height={52}
                  icon={<PlayIcon size={15} color={Colors.onAccent} />}
                  onPress={() => ctaEp && handlePlayEpisode(ctaEp.id)}
                />
                <View
                  style={{
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    paddingVertical: 14,
                    borderTopWidth: 1,
                    borderBottomWidth: 1,
                    borderColor: Colors.hairline,
                  }}
                >
                  {[
                    { label: 'Episodes', value: String(totalEpisodes) },
                    { label: 'Seasons', value: String(seasons.length) },
                    { label: 'Category', value: series.category },
                  ].map((m) => (
                    <View key={m.label} style={{ gap: 3 }}>
                      <Text
                        style={{
                          fontFamily: Fonts.sans500,
                          fontSize: 9,
                          letterSpacing: 1.6,
                          textTransform: 'uppercase',
                          color: Colors.ink3,
                        }}
                      >
                        {m.label}
                      </Text>
                      <Text style={{ fontFamily: Fonts.display, fontSize: 18, color: Colors.ink }}>
                        {m.value}
                      </Text>
                    </View>
                  ))}
                </View>
                {nextLockedEp && (
                  <SlideToUnlock
                    ep={nextLockedEp}
                    onPress={() => handleUnlockEpisode(nextLockedEp)}
                  />
                )}
              </View>

              {/* RIGHT — title, synopsis, episode grid */}
              <View style={{ flex: 1, gap: 4 }}>
                <Pressable
                  onPress={() => router.back()}
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 }}
                >
                  <ChevronIcon size={14} color={Colors.ink3} direction="left" />
                  <Text style={{ fontFamily: Fonts.sans500, fontSize: 12.5, color: Colors.ink3 }}>
                    Back
                  </Text>
                </Pressable>
                <Eyebrow color={Colors.accent}>
                  {series.tags?.length
                    ? series.tags.join(' · ').toUpperCase()
                    : series.category?.toUpperCase()}
                </Eyebrow>
                <Text
                  style={{ ...displayType(48), color: Colors.ink, letterSpacing: -1 }}
                  numberOfLines={3}
                >
                  {series.title}
                </Text>
                {series.description && (
                  <Text
                    style={{
                      fontFamily: Fonts.sans,
                      fontSize: 15,
                      lineHeight: 24,
                      color: Colors.ink2,
                      maxWidth: 620,
                      marginTop: 10,
                    }}
                  >
                    {series.description}
                  </Text>
                )}

                <View
                  style={{
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    alignItems: 'baseline',
                    marginTop: 28,
                    marginBottom: 14,
                    borderBottomWidth: 1,
                    borderBottomColor: Colors.hairline,
                    paddingBottom: 12,
                  }}
                >
                  <Text style={{ ...displayType(22), color: Colors.ink }}>Episodes</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
                    <Eyebrow>
                      Season {String(activeSeason?.number ?? 1).padStart(2, '0')} ·{' '}
                      {episodes.length} of {totalEpisodes}
                    </Eyebrow>
                    {seasons.length > 1 && (
                      <Pressable
                        onPress={() => setSelectedSeasonIndex((i) => (i + 1) % seasons.length)}
                      >
                        <Eyebrow color={Colors.accent}>Seasons ▾</Eyebrow>
                      </Pressable>
                    )}
                  </View>
                </View>

                <EpisodeGrid
                  episodes={episodes}
                  itemW={itemW}
                  gap={RIGHT_GAP}
                  isLocked={isLocked}
                  onPlay={handlePlayEpisode}
                  onUnlock={handleUnlockEpisode}
                />
              </View>
            </View>
          </WebContent>
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: Colors.bg, paddingTop: insets.top }}>
      <ScrollView style={{ flex: 1 }}>
        <WebContent max={1100}>
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
              <View style={{ position: 'absolute', left: 20, right: 20, bottom: 22, gap: 8 }}>
                <Eyebrow color={Colors.accent}>
                  {series.tags?.length
                    ? series.tags.join(' · ').toUpperCase()
                    : series.category?.toUpperCase()}
                </Eyebrow>
                <Text
                  style={{
                    fontFamily: Fonts.display,
                    fontSize: 46,
                    lineHeight: 54,
                    color: '#fff',
                    letterSpacing: -0.6,
                  }}
                  numberOfLines={3}
                >
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
              paddingHorizontal: 20,
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
                <Text
                  style={{
                    fontFamily: Fonts.sans500,
                    fontSize: 9,
                    letterSpacing: 1.6,
                    textTransform: 'uppercase',
                    color: Colors.ink3,
                  }}
                >
                  {m.label}
                </Text>
                <Text style={{ fontFamily: Fonts.display, fontSize: 18, color: Colors.ink }}>
                  {m.value}
                </Text>
              </View>
            ))}
          </View>

          {/* Logline */}
          {series.description && (
            <View style={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8 }}>
              <Text
                style={{
                  fontFamily: Fonts.displayItalic,
                  fontSize: 18,
                  color: Colors.ink,
                  lineHeight: 24,
                }}
              >
                &ldquo;{series.description}&rdquo;
              </Text>
            </View>
          )}

          {/* CTA */}
          <View style={{ paddingHorizontal: 20, paddingTop: 14, paddingBottom: 18 }}>
            <Button
              label={ctaLabel}
              variant="accent"
              block
              height={52}
              icon={<PlayIcon size={15} color={Colors.onAccent} />}
              onPress={() => ctaEp && handlePlayEpisode(ctaEp.id)}
            />
          </View>

          {/* Section label */}
          <View
            style={{
              flexDirection: 'row',
              paddingHorizontal: 20,
              gap: 14,
              borderBottomWidth: 1,
              borderBottomColor: Colors.hairline,
            }}
          >
            <View style={{ paddingBottom: 10 }}>
              <Text
                style={{
                  fontFamily: Fonts.sans600,
                  fontSize: 12,
                  color: Colors.accent,
                  letterSpacing: 0.4,
                }}
              >
                Episodes
              </Text>
            </View>
          </View>

          {/* Slide-to-unlock prompt */}
          {nextLockedEp && (
            <View style={{ paddingHorizontal: 20, paddingTop: 14, paddingBottom: 8 }}>
              <SlideToUnlock ep={nextLockedEp} onPress={() => handleUnlockEpisode(nextLockedEp)} />
            </View>
          )}

          {/* Season selector + Episode grid */}
          <View style={{ paddingHorizontal: 20, paddingTop: 10, paddingBottom: 14 }}>
            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'baseline',
                marginBottom: 10,
              }}
            >
              <Eyebrow>
                Season {String(activeSeason?.number ?? 1).padStart(2, '0')} · {episodes.length} of{' '}
                {totalEpisodes} shown
              </Eyebrow>
              {seasons.length > 1 && (
                <Pressable onPress={() => setSelectedSeasonIndex((i) => (i + 1) % seasons.length)}>
                  <Eyebrow color={Colors.accent}>Seasons ▾</Eyebrow>
                </Pressable>
              )}
            </View>

            <EpisodeGrid
              episodes={episodes}
              itemW={GRID_ITEM_W}
              gap={GRID_GAP}
              isLocked={isLocked}
              onPlay={handlePlayEpisode}
              onUnlock={handleUnlockEpisode}
            />
          </View>

          <View style={{ height: 40 }} />
        </WebContent>
      </ScrollView>
    </View>
  );
}
