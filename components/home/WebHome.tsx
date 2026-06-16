// Desktop-web home — a real streaming-site landing (ReelShort/DramaBox feel):
// a cinematic hero, an optional continue-watching row, a genre-filtered poster
// library grid with hover-to-preview. Rendered only on desktop web; phones use
// the existing mobile home untouched.
import { useMemo, useRef, useState } from 'react';
import { Animated, Pressable, ScrollView, Text, View, useWindowDimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from '@/components/ui/LinearGradient';
import { CineStill } from '@/components/ui/CineStill';
import { Poster } from '@/components/ui/Poster';
import { PosterCard } from '@/components/ui/PosterCard';
import { Button } from '@/components/ui/Button';
import { Eyebrow } from '@/components/ui/Eyebrow';
import { PlayIcon } from '@/components/ui/Icon';
import { Colors, Fonts, Radius, displayType } from '@/constants/theme';
import { CONTENT_MAX } from '@/lib/layout';
import { useSeriesDetail } from '@/hooks/useCatalog';
import type { Series } from '@/types/catalog';
import type { WatchProgress } from '@/types/progress';

type Props = {
  featured: Series[];
  categories: Record<string, Series[]>;
  continueWatching?: WatchProgress[];
};

// Hoisted (NOT defined inside WebHome) — a component declared in render gets a
// new type each render and React remounts its whole subtree (scroll reset,
// image reflash). Module-scope keeps the tree stable.
function Centered({ children }: { children: React.ReactNode }) {
  return (
    <View style={{ width: '100%', alignItems: 'center' }}>
      <View style={{ width: '100%', maxWidth: CONTENT_MAX, paddingHorizontal: 48 }}>
        {children}
      </View>
    </View>
  );
}

export function WebHome({ featured, categories, continueWatching }: Props) {
  const router = useRouter();
  const { width: winW } = useWindowDimensions();
  const [activeGenre, setActiveGenre] = useState<string>('All');

  const contentW = Math.min(winW - 96, CONTENT_MAX);
  const goSeries = (id: string) => router.push(`/series/${id}`);
  const goPlayer = (episodeId: string) => router.push(`/player/${episodeId}`);

  const hero = featured[0];
  // Featured payload carries no episodes (Series, not SeriesDetail), so we fetch
  // the hero's detail to enable a real "play episode 1" deep-link. The query is
  // cached/persisted, so opening the detail page later is instant.
  const { data: heroDetail } = useSeriesDetail(hero?.id ?? '');
  // Hero "Play" jumps straight into the first ready episode; falls back to the
  // detail page until the detail query resolves (or if nothing is playable).
  const heroPlay = () => {
    if (!hero) return;
    const ep = (heroDetail?.seasons ?? [])
      .flatMap((s) => s.episodes ?? [])
      .find((e) => e.mux_playback_id && e.mux_asset_status === 'ready');
    if (ep) router.push({ pathname: `/player/${ep.id}`, params: { seriesId: hero.id } });
    else goSeries(hero.id);
  };

  // Full catalog, de-duped, from the category buckets (every published series).
  const allSeries = useMemo(() => {
    const seen = new Set<string>();
    const out: Series[] = [];
    for (const list of Object.values(categories)) {
      for (const s of list) {
        if (!seen.has(s.id)) {
          seen.add(s.id);
          out.push(s);
        }
      }
    }
    return out;
  }, [categories]);

  const genres = useMemo(() => ['All', ...Object.keys(categories)], [categories]);
  const grid = activeGenre === 'All' ? allSeries : (categories[activeGenre] ?? []);

  // Netflix-portal density: up to 6 columns on wide screens.
  const cols = winW >= 1600 ? 6 : winW >= 1280 ? 5 : 4;
  const gap = 16;
  const cardW = Math.floor((contentW - gap * (cols - 1)) / cols);

  return (
    <View style={{ paddingBottom: 64 }}>
      {/* Cinematic hero */}
      {hero && (
        <View style={{ width: '100%', alignItems: 'center', paddingTop: 24, paddingBottom: 40 }}>
          {/* Plain View, not a Pressable — the explicit Play / More info buttons
              own navigation (a wrapping Pressable would bubble + override them). */}
          <View style={{ width: '100%', maxWidth: CONTENT_MAX, paddingHorizontal: 48 }}>
            <View style={{ borderRadius: Radius.xl, overflow: 'hidden' }}>
              <CineStill
                imageUrl={hero.poster_url ?? undefined}
                playbackId={hero.thumbnail_playback_id ?? undefined}
                width={contentW}
                height={Math.min(620, Math.round(winW * 0.42))}
                noFade
                style={{ width: '100%' }}
              >
                <LinearGradient
                  colors={['rgba(10,10,15,0.10)', 'rgba(10,10,15,0.55)', 'rgba(10,10,15,0.96)']}
                  locations={[0, 0.55, 1]}
                  style={{ position: 'absolute', width: '100%', height: '100%' }}
                />
                {/* left-anchored cinematic gradient for text legibility */}
                <LinearGradient
                  colors={['rgba(10,10,15,0.85)', 'transparent']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={{ position: 'absolute', width: '70%', height: '100%' }}
                />
                <View
                  style={{
                    position: 'absolute',
                    left: 48,
                    right: 48,
                    bottom: 44,
                    maxWidth: 600,
                    gap: 16,
                  }}
                >
                  <Eyebrow color={Colors.accent}>The Cover · {hero.category}</Eyebrow>
                  <Text
                    style={{ ...displayType(56), color: '#fff', letterSpacing: -1 }}
                    numberOfLines={2}
                  >
                    {hero.title}
                  </Text>
                  {hero.description && (
                    <Text
                      style={{
                        fontFamily: Fonts.sans,
                        fontSize: 15,
                        lineHeight: 23,
                        color: 'rgba(255,255,255,0.82)',
                        maxWidth: 520,
                      }}
                      numberOfLines={3}
                    >
                      {hero.description}
                    </Text>
                  )}
                  <View style={{ flexDirection: 'row', gap: 10, marginTop: 6 }}>
                    <Button
                      label="Play"
                      variant="accent"
                      height={48}
                      icon={<PlayIcon size={15} color={Colors.onAccent} />}
                      onPress={heroPlay}
                    />
                    <Button
                      label="More info"
                      variant="ghost"
                      height={48}
                      onPress={() => goSeries(hero.id)}
                    />
                  </View>
                </View>
              </CineStill>
            </View>
          </View>
        </View>
      )}

      {/* Continue watching */}
      {continueWatching && continueWatching.length > 0 && (
        <Centered>
          <View style={{ marginBottom: 40 }}>
            <Text style={{ ...displayType(26), color: Colors.ink, marginBottom: 16 }}>
              Continue watching
            </Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 16 }}>
              {continueWatching.slice(0, 4).map((item) => {
                const duration = item.episode_duration_seconds ?? 3000;
                const prog = item.completed ? 1 : Math.min(item.position_seconds / duration, 0.95);
                const w = Math.floor((contentW - gap * 3) / 4);
                return (
                  <ContinueCard
                    key={item.episode_id}
                    item={item}
                    width={w}
                    progress={prog}
                    onPress={() => goPlayer(item.episode_id)}
                  />
                );
              })}
            </View>
          </View>
        </Centered>
      )}

      {/* Library with genre filter */}
      <Centered>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 18,
          }}
        >
          <Text style={{ ...displayType(26), color: Colors.ink }}>Browse the library</Text>
          <Text style={{ fontFamily: Fonts.sans, fontSize: 12, color: Colors.ink3 }}>
            {grid.length} {grid.length === 1 ? 'title' : 'titles'}
          </Text>
        </View>

        {/* Genre filter chips */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 8, paddingBottom: 22 }}
        >
          {genres.map((g) => {
            const active = g === activeGenre;
            const label = g === 'All' ? 'All' : g.charAt(0).toUpperCase() + g.slice(1);
            return (
              <Pressable
                key={g}
                onPress={() => setActiveGenre(g)}
                style={{
                  paddingVertical: 8,
                  paddingHorizontal: 16,
                  borderRadius: Radius.pill,
                  backgroundColor: active ? Colors.accent2 : 'rgba(255,255,255,0.05)',
                  borderWidth: 1,
                  borderColor: active ? Colors.accent : Colors.hairline,
                }}
              >
                <Text
                  style={{
                    fontFamily: active ? Fonts.sans600 : Fonts.sans500,
                    fontSize: 12.5,
                    letterSpacing: 0.3,
                    color: active ? Colors.onAccent : Colors.ink2,
                  }}
                >
                  {label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {/* Poster grid */}
        {grid.length > 0 ? (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap }}>
            {grid.map((s) => (
              <PosterCard key={s.id} series={s} width={cardW} onPress={() => goSeries(s.id)} />
            ))}
          </View>
        ) : (
          <View style={{ paddingVertical: 64, alignItems: 'center', gap: 6 }}>
            <Text style={{ ...displayType(22), color: Colors.ink }}>Nothing here yet</Text>
            <Text style={{ fontFamily: Fonts.sans, fontSize: 13, color: Colors.ink3 }}>
              No {activeGenre.toLowerCase()} titles — try another genre.
            </Text>
          </View>
        )}
      </Centered>
    </View>
  );
}

// Landscape continue-watching card with hover lift + progress bar.
function ContinueCard({
  item,
  width,
  progress,
  onPress,
}: {
  item: WatchProgress;
  width: number;
  progress: number;
  onPress: () => void;
}) {
  const [hovered, setHovered] = useState(false);
  const scale = useRef(new Animated.Value(1)).current;
  const set = (to: number) => {
    setHovered(to === 1);
    Animated.timing(scale, {
      toValue: to === 1 ? 1.03 : 1,
      duration: 180,
      useNativeDriver: true,
    }).start();
  };
  return (
    <Pressable
      onPress={onPress}
      onHoverIn={() => set(1)}
      onHoverOut={() => set(0)}
      style={{ width }}
    >
      <Animated.View
        style={{
          transform: [{ scale }],
          borderRadius: Radius.lg,
          overflow: 'hidden',
          borderWidth: 1,
          borderColor: hovered ? Colors.accent : 'transparent',
        }}
      >
        <Poster
          playbackId={item.episode_mux_playback_id ?? undefined}
          width={width}
          height={Math.round(width * 0.58)}
          borderRadius={Radius.lg}
          showTitle={false}
          progress={progress}
          overlay={
            <View
              style={{
                position: 'absolute',
                width: '100%',
                height: '100%',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <View
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 44,
                  backgroundColor: hovered ? Colors.accent2 : 'rgba(10,10,15,0.6)',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <PlayIcon size={16} color={hovered ? Colors.onAccent : '#fff'} />
              </View>
            </View>
          }
        />
      </Animated.View>
      <View style={{ paddingTop: 10 }}>
        <Text
          style={{ fontFamily: Fonts.sans600, fontSize: 13, color: Colors.ink }}
          numberOfLines={1}
        >
          {item.episode_title ?? 'Episode'}
        </Text>
        <Text style={{ fontFamily: Fonts.sans, fontSize: 11, color: Colors.ink3, marginTop: 2 }}>
          {item.completed ? 'Completed' : `${Math.floor(item.position_seconds / 60)}m watched`}
        </Text>
      </View>
    </Pressable>
  );
}
