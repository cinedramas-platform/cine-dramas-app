import { View, Text, Pressable, ScrollView, Dimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { Colors, Fonts } from '@/constants/theme';
import { Eyebrow } from '@/components/ui/Eyebrow';
import { Poster } from '@/components/ui/Poster';
import { PlayIcon } from '@/components/ui/Icon';
import { useFeatured } from '@/hooks/useCatalog';

const { width: SCREEN_W } = Dimensions.get('window');

export default function FeedScreen() {
  const router = useRouter();
  const { data: featured } = useFeatured();
  const series = featured?.featured ?? [];

  return (
    <View style={{ flex: 1, backgroundColor: Colors.bg }}>
      <ScrollView contentContainerStyle={{ paddingTop: 60, paddingBottom: 40 }}>
        <View style={{ paddingHorizontal: 20, marginBottom: 24 }}>
          <Eyebrow color={Colors.accent}>FOR YOU</Eyebrow>
          <Text style={{ fontFamily: Fonts.display, fontSize: 28, color: Colors.ink, marginTop: 4 }}>
            Your Feed
          </Text>
          <Text style={{ fontFamily: Fonts.sans, fontSize: 13, color: Colors.ink3, marginTop: 8, lineHeight: 20 }}>
            Swipe through episodes from series you follow, trending content, and editor picks.
          </Text>
        </View>

        {series.slice(0, 6).map((s: any, i: number) => (
          <Pressable
            key={s.id ?? i}
            onPress={() => {
              const firstEp = s.seasons?.[0]?.episodes?.[0];
              if (firstEp) router.push(`/player/${firstEp.id}`);
            }}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 14,
              paddingHorizontal: 20,
              paddingVertical: 12,
              borderBottomWidth: 1,
              borderBottomColor: Colors.hairline2,
            }}
          >
            <View style={{ position: 'relative' }}>
              <Poster
                title={s.title}
                playbackId={s.seasons?.[0]?.episodes?.[0]?.mux_playback_id}
                width={80}
                height={112}
                borderRadius={8}
                showTitle={false}
              />
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
                    width: 32,
                    height: 32,
                    borderRadius: 32,
                    backgroundColor: 'rgba(0,0,0,0.55)',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <PlayIcon size={14} color="#fff" />
                </View>
              </View>
            </View>
            <View style={{ flex: 1, gap: 4 }}>
              <Eyebrow color={Colors.accent}>
                {s.category ?? 'DRAMA'} · {s.episode_count ?? '?'} EP
              </Eyebrow>
              <Text style={{ fontFamily: Fonts.sans600, fontSize: 15, color: Colors.ink }} numberOfLines={2}>
                {s.title}
              </Text>
              <Text style={{ fontFamily: Fonts.sans, fontSize: 12, color: Colors.ink3, lineHeight: 18 }} numberOfLines={2}>
                {s.description}
              </Text>
            </View>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}
