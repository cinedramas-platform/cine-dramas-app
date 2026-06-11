import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from '@/components/ui/LinearGradient';
import { Colors, Fonts, Radius } from '@/constants/theme';
import { Eyebrow } from '@/components/ui/Eyebrow';
import { Poster } from '@/components/ui/Poster';
import { CineStill } from '@/components/ui/CineStill';
import { SearchIcon, ChevronIcon, CloseIcon } from '@/components/ui/Icon';
import { useSearch, useFeatured } from '@/hooks/useCatalog';
import type { Series } from '@/types/catalog';

const { width: SCREEN_W } = Dimensions.get('window');
const MOOD_GAP = 10;
const MOOD_W = (SCREEN_W - 40 - MOOD_GAP) / 2;

const MOODS = [
  {
    id: 'romance',
    label: 'Forbidden',
    count: 124,
    palette: ['#1A0612', '#6B1B3E', '#E59FB8'] as [string, string, string],
    glyph: 'F',
  },
  {
    id: 'thriller',
    label: 'Twisty',
    count: 88,
    palette: ['#070A0B', '#1A2A33', '#7FB5C9'] as [string, string, string],
    glyph: 'T',
  },
  {
    id: 'drama',
    label: 'Steamy',
    count: 156,
    palette: ['#3A0A14', '#9E1B2F', '#FFC9AE'] as [string, string, string],
    glyph: 'S',
  },
  {
    id: 'comedy',
    label: 'Funny',
    count: 64,
    palette: ['#150810', '#7E1F4A', '#FFD06B'] as [string, string, string],
    glyph: 'F',
  },
  {
    id: 'mystery',
    label: 'Heartbreak',
    count: 92,
    palette: ['#0B0810', '#4A1B5F', '#E9B4F0'] as [string, string, string],
    glyph: 'H',
  },
  {
    id: 'revenge',
    label: 'Revenge',
    count: 78,
    palette: ['#10060A', '#4B0B17', '#F47A6B'] as [string, string, string],
    glyph: 'R',
  },
];

export default function SearchScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState('');
  const { data: results, isLoading: searching } = useSearch(query);
  const { data: featured } = useFeatured();
  const editorPick = featured?.featured?.[0];
  const isSearching = query.length > 2;

  return (
    <View style={{ flex: 1, backgroundColor: Colors.bg, paddingTop: insets.top }}>
      {/* Search field */}
      <View style={{ paddingHorizontal: 20, paddingTop: 12, paddingBottom: 6 }}>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            height: 44,
            paddingHorizontal: 14,
            borderRadius: Radius.pill,
            backgroundColor: 'rgba(255,255,255,0.04)',
            borderWidth: 1,
            borderColor: Colors.hairline,
            gap: 10,
          }}
        >
          <SearchIcon size={16} color={Colors.ink3} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="What are you in the mood for?"
            placeholderTextColor={Colors.ink3}
            style={{
              flex: 1,
              fontFamily: Fonts.sans,
              fontSize: 13,
              color: Colors.ink,
              padding: 0,
            }}
            returnKeyType="search"
            autoCapitalize="none"
            autoCorrect={false}
          />
          {query.length > 0 && (
            <Pressable onPress={() => setQuery('')}>
              <CloseIcon size={16} color={Colors.ink3} />
            </Pressable>
          )}
        </View>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 20 }}>
        {isSearching ? (
          <View style={{ paddingHorizontal: 20, paddingTop: 14 }}>
            {searching ? (
              <ActivityIndicator size="small" color={Colors.accent} style={{ marginTop: 40 }} />
            ) : results && results.length > 0 ? (
              results.map((s: Series) => (
                <Pressable
                  key={s.id}
                  onPress={() => router.push(`/series/${s.id}`)}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 12,
                    paddingVertical: 12,
                    borderBottomWidth: 1,
                    borderBottomColor: Colors.hairline2,
                  }}
                >
                  <Poster
                    playbackId={s.thumbnail_playback_id ?? undefined}
                    width={48}
                    height={66}
                    borderRadius={4}
                    showTitle={false}
                  />
                  <View style={{ flex: 1, gap: 2 }}>
                    <Text
                      style={{ fontFamily: Fonts.sans600, fontSize: 14, color: Colors.ink }}
                      numberOfLines={1}
                    >
                      {s.title}
                    </Text>
                    <Text style={{ fontFamily: Fonts.sans, fontSize: 10, color: Colors.ink3 }}>
                      {s.category}
                    </Text>
                  </View>
                  <ChevronIcon size={14} color={Colors.ink3} direction="right" />
                </Pressable>
              ))
            ) : (
              <View style={{ alignItems: 'center', paddingTop: 60, gap: 8 }}>
                <Text style={{ fontFamily: Fonts.display, fontSize: 22, color: Colors.ink }}>
                  Nothing found
                </Text>
                <Text
                  style={{
                    fontFamily: Fonts.sans,
                    fontSize: 13,
                    color: Colors.ink3,
                    textAlign: 'center',
                    lineHeight: 20,
                  }}
                >
                  Try a different mood, genre, or title.
                </Text>
              </View>
            )}
          </View>
        ) : (
          <>
            {/* Mood grid */}
            <View style={{ paddingHorizontal: 20, paddingTop: 14 }}>
              <View
                style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'baseline',
                  marginBottom: 14,
                }}
              >
                <Text
                  style={{
                    fontFamily: Fonts.display,
                    fontSize: 24,
                    color: Colors.ink,
                    letterSpacing: -0.5,
                  }}
                >
                  What’s the <Text style={{ fontFamily: Fonts.displayItalic }}>mood?</Text>
                </Text>
              </View>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: MOOD_GAP }}>
                {MOODS.map((m) => (
                  <Pressable
                    key={m.id}
                    onPress={() => setQuery(m.label.toLowerCase())}
                    style={{
                      width: MOOD_W,
                      aspectRatio: 7 / 5,
                      borderRadius: Radius.lg,
                      overflow: 'hidden',
                      position: 'relative',
                    }}
                  >
                    <LinearGradient
                      colors={[m.palette[0], m.palette[1]]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={{ position: 'absolute', width: '100%', height: '100%' }}
                    />
                    <LinearGradient
                      colors={['transparent', 'rgba(0,0,0,0.55)']}
                      locations={[0.4, 1]}
                      style={{ position: 'absolute', width: '100%', height: '100%' }}
                    />
                    <Text
                      style={{
                        position: 'absolute',
                        top: 10,
                        left: 12,
                        fontFamily: Fonts.displayItalic,
                        fontSize: 60,
                        lineHeight: 68,
                        color: 'rgba(255,255,255,0.18)',
                      }}
                    >
                      {m.glyph}
                    </Text>
                    <View style={{ position: 'absolute', bottom: 10, left: 12, right: 12, gap: 1 }}>
                      <Text
                        style={{
                          fontFamily: Fonts.display,
                          fontSize: 20,
                          color: '#fff',
                          letterSpacing: -0.1,
                        }}
                      >
                        {m.label}
                      </Text>
                      <Text
                        style={{
                          fontFamily: Fonts.sans,
                          fontSize: 10,
                          color: 'rgba(255,255,255,0.65)',
                          letterSpacing: 0.6,
                        }}
                      >
                        {m.count} dramas
                      </Text>
                    </View>
                  </Pressable>
                ))}
              </View>
            </View>

            {/* Editor's Pick */}
            {editorPick && (
              <View style={{ paddingHorizontal: 20, paddingTop: 20, paddingBottom: 20 }}>
                <View
                  style={{
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    alignItems: 'baseline',
                    marginBottom: 12,
                  }}
                >
                  <Text style={{ fontFamily: Fonts.display, fontSize: 20, color: Colors.ink }}>
                    The Editor’s Pick
                  </Text>
                  <Eyebrow color={Colors.accent}>This week</Eyebrow>
                </View>
                <Pressable
                  onPress={() => router.push(`/series/${editorPick.id}`)}
                  style={{ borderRadius: Radius.lg, overflow: 'hidden', height: 160 }}
                >
                  <CineStill
                    playbackId={editorPick.thumbnail_playback_id ?? undefined}
                    width={SCREEN_W - 40}
                    height={160}
                    style={{ width: '100%' }}
                  >
                    <LinearGradient
                      colors={['rgba(0,0,0,0.85)', 'rgba(0,0,0,0.4)', 'transparent']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={{ position: 'absolute', width: '100%', height: '100%' }}
                    />
                    <View
                      style={{
                        position: 'absolute',
                        left: 16,
                        top: 16,
                        bottom: 16,
                        maxWidth: '60%',
                        justifyContent: 'space-between',
                      }}
                    >
                      <Eyebrow color={Colors.accent}>FROM THE LETTER</Eyebrow>
                      <View style={{ gap: 4 }}>
                        <Text
                          style={{
                            fontFamily: Fonts.display,
                            fontSize: 22,
                            color: '#fff',
                            lineHeight: 26,
                            letterSpacing: -0.5,
                          }}
                          numberOfLines={2}
                        >
                          {editorPick.title}
                        </Text>
                        {editorPick.description && (
                          <Text
                            style={{
                              fontFamily: Fonts.sans,
                              fontSize: 11,
                              color: 'rgba(255,255,255,0.75)',
                              lineHeight: 16,
                            }}
                            numberOfLines={2}
                          >
                            {editorPick.description}
                          </Text>
                        )}
                      </View>
                    </View>
                  </CineStill>
                </Pressable>
              </View>
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
}
