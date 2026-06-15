import { useState, useCallback } from 'react';
import { View, Text, Pressable, ScrollView, useWindowDimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from '@/components/ui/LinearGradient';
import { Colors, Fonts, Radius, displayType } from '@/constants/theme';
import { Eyebrow } from '@/components/ui/Eyebrow';
import { Poster } from '@/components/ui/Poster';
import { Button } from '@/components/ui/Button';
import { CheckIcon, ChevronIcon, NotificationIcon } from '@/components/ui/Icon';
import { CineStill } from '@/components/ui/CineStill';
import { markOnboarded } from '@/hooks/useProtectedRoute';
import { APP_NAME, TAGLINE, wordmarkLines } from '@/lib/brand';

const MOOD_GAP = 10;
// Onboarding is always a single, centered, phone-width column — even on desktop
// web (a full-bleed 3-step flow on a 1440px screen looks broken). This cap is
// the column the content lives in everywhere.
const COLUMN_MAX = 460;

const MOODS = [
  { id: 'forbidden', label: 'Forbidden', palette: ['#1A0612', '#6B1B3E'] as [string, string] },
  { id: 'twisty', label: 'Twisty', palette: ['#070A0B', '#1A2A33'] as [string, string] },
  { id: 'steamy', label: 'Steamy', palette: ['#3A0A14', '#9E1B2F'] as [string, string] },
  { id: 'funny', label: 'Funny', palette: ['#150810', '#7E1F4A'] as [string, string] },
  { id: 'heart', label: 'Heartbreak', palette: ['#0B0810', '#4A1B5F'] as [string, string] },
  { id: 'revenge', label: 'Revenge', palette: ['#10060A', '#4B0B17'] as [string, string] },
];

/** Slim 3-segment progress bar for the taste/notifications steps. */
function Progress({ step }: { step: number }) {
  return (
    <View style={{ flexDirection: 'row', gap: 5 }}>
      {[0, 1, 2].map((i) => (
        <View
          key={i}
          style={{
            width: 22,
            height: 3,
            borderRadius: 3,
            backgroundColor: i <= step ? Colors.accent : 'rgba(255,255,255,0.16)',
          }}
        />
      ))}
    </View>
  );
}

export default function OnboardingScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width: winW } = useWindowDimensions();
  const [step, setStep] = useState(0);
  const [selectedMoods, setSelectedMoods] = useState<Set<string>>(new Set());

  // Content column width (capped), and mood-card math derived from it.
  const colW = Math.min(winW, COLUMN_MAX);
  const moodCols = colW >= 420 ? 3 : 2;
  const moodW = Math.floor((colW - 40 - MOOD_GAP * (moodCols - 1)) / moodCols);
  const moodH = Math.round(moodW * (moodCols === 3 ? 1.3 : 0.72));

  const advance = useCallback(async () => {
    if (step < 2) {
      setStep(step + 1);
    } else {
      await markOnboarded();
      router.replace('/(tabs)');
    }
  }, [step, router]);

  const toggleMood = useCallback((id: string) => {
    setSelectedMoods((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  // Shared scroll shell: content centers in COLUMN_MAX, fills tall screens (so
  // the footer pins to the bottom), and scrolls on short ones (mobile browser
  // address bar, small windows) instead of clipping — the core a11y fix.
  const Shell = ({ children }: { children: React.ReactNode }) => (
    <ScrollView
      style={{ flex: 1, backgroundColor: Colors.bg }}
      contentContainerStyle={{
        flexGrow: 1,
        paddingTop: insets.top,
        paddingBottom: insets.bottom + 16,
        alignItems: 'center',
      }}
      showsVerticalScrollIndicator={false}
    >
      <View style={{ flex: 1, width: '100%', maxWidth: COLUMN_MAX }}>{children}</View>
    </ScrollView>
  );

  // ---- Step 0: cinematic welcome ----
  if (step === 0) {
    const wordSize = Math.min(72, Math.floor(colW * 0.19));
    return (
      <View style={{ flex: 1, backgroundColor: Colors.bg }}>
        {/* Full-bleed backdrop */}
        <CineStill
          playbackId={undefined}
          width={winW}
          height={Math.max(winW * 2.2, 900)}
          noFade
          style={{ position: 'absolute', width: '100%', height: '100%' }}
        />
        <LinearGradient
          colors={['rgba(8,7,10,0.25)', 'rgba(8,7,10,0.05)', 'rgba(8,7,10,0.92)', '#08070A']}
          locations={[0, 0.4, 0.85, 1]}
          style={{ position: 'absolute', width: '100%', height: '100%' }}
        />
        <ScrollView
          contentContainerStyle={{
            flexGrow: 1,
            paddingTop: insets.top + 40,
            paddingBottom: insets.bottom + 36,
            paddingHorizontal: 24,
            alignItems: 'center',
          }}
          showsVerticalScrollIndicator={false}
        >
          <View style={{ flex: 1, width: '100%', maxWidth: COLUMN_MAX }}>
            <View style={{ alignItems: 'center' }}>
              <Eyebrow color={Colors.accent} style={{ letterSpacing: 4 }}>
                VOL. 12 — JUN MMXXVI
              </Eyebrow>
            </View>

            {/* Wordmark — vertically centered in the available space */}
            <View
              style={{
                flex: 1,
                justifyContent: 'center',
                alignItems: 'center',
                paddingVertical: 48,
              }}
            >
              {wordmarkLines().map((line, i) => (
                <Text
                  key={i}
                  style={{
                    fontFamily: i === 0 ? Fonts.display : Fonts.displayItalic,
                    fontSize: wordSize,
                    lineHeight: Math.ceil(wordSize * 1.14),
                    color: i === 0 ? '#fff' : Colors.accent,
                    textAlign: 'center',
                    letterSpacing: -1.5,
                  }}
                >
                  {line}
                </Text>
              ))}
              <Text
                style={{
                  fontFamily: Fonts.displayItalic,
                  fontSize: 13,
                  lineHeight: 18,
                  color: 'rgba(255,255,255,0.7)',
                  letterSpacing: 1,
                  marginTop: 16,
                  textAlign: 'center',
                }}
              >
                — {TAGLINE} —
              </Text>
            </View>

            {/* CTA */}
            <View style={{ gap: 12 }}>
              <Button label="Begin Reading" variant="accent" block height={52} onPress={advance} />
              <Pressable
                onPress={async () => {
                  await markOnboarded();
                  router.replace('/auth/login');
                }}
                style={{ alignItems: 'center', paddingTop: 4 }}
              >
                <Text style={{ fontSize: 11, color: 'rgba(250,246,238,0.6)', letterSpacing: 0.6 }}>
                  ALREADY A SUBSCRIBER?{' '}
                  <Text style={{ color: Colors.accent, fontFamily: Fonts.sans600 }}>SIGN IN</Text>
                </Text>
              </Pressable>
            </View>
          </View>
        </ScrollView>
      </View>
    );
  }

  // ---- Step 1: taste / mood grid ----
  if (step === 1) {
    return (
      <Shell>
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
          <Eyebrow>CHAPTER 01 — TASTE</Eyebrow>
          <Progress step={1} />
        </View>

        <View style={{ paddingHorizontal: 20, paddingTop: 14, paddingBottom: 6 }}>
          <Text style={{ ...displayType(34), color: Colors.ink, letterSpacing: -0.5 }}>
            Tell us how you{'\n'}
            <Text style={{ fontFamily: Fonts.displayItalic }}>like to be undone.</Text>
          </Text>
          <Text
            style={{
              fontFamily: Fonts.sans,
              fontSize: 12.5,
              color: Colors.ink3,
              marginTop: 8,
              lineHeight: 18,
            }}
          >
            Pick three. We’ll edit the catalog around them.
          </Text>
        </View>

        <View style={{ paddingHorizontal: 20, paddingTop: 16 }}>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: MOOD_GAP }}>
            {MOODS.map((m) => {
              const selected = selectedMoods.has(m.id);
              return (
                <Pressable
                  key={m.id}
                  onPress={() => toggleMood(m.id)}
                  style={{
                    width: moodW,
                    height: moodH,
                    borderRadius: Radius.lg,
                    overflow: 'hidden',
                    position: 'relative',
                    borderWidth: selected ? 2 : 1,
                    borderColor: selected ? Colors.accent : Colors.hairline,
                  }}
                >
                  <LinearGradient
                    colors={[m.palette[0], m.palette[1]]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={{ position: 'absolute', width: '100%', height: '100%' }}
                  />
                  <LinearGradient
                    colors={['transparent', 'rgba(0,0,0,0.6)']}
                    locations={[0.4, 1]}
                    style={{ position: 'absolute', width: '100%', height: '100%' }}
                  />
                  <View style={{ position: 'absolute', bottom: 10, left: 12, right: 12 }}>
                    <Text style={{ fontFamily: Fonts.display, fontSize: 19, color: '#fff' }}>
                      {m.label}
                    </Text>
                  </View>
                  {selected && (
                    <View
                      style={{
                        position: 'absolute',
                        top: 8,
                        right: 8,
                        width: 22,
                        height: 22,
                        borderRadius: 22,
                        backgroundColor: Colors.accent,
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <CheckIcon size={13} color={Colors.black} />
                    </View>
                  )}
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* Spacer pins the footer down on tall screens; scrolls on short ones */}
        <View style={{ flex: 1, minHeight: 24 }} />

        <View style={{ paddingHorizontal: 20, gap: 12 }}>
          <View
            style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}
          >
            <Text style={{ fontFamily: Fonts.sans, fontSize: 11, color: Colors.ink3 }}>
              <Text style={{ color: Colors.accent, fontFamily: Fonts.sans600 }}>
                {selectedMoods.size} of 3
              </Text>{' '}
              selected
            </Text>
            <Pressable onPress={advance} hitSlop={10}>
              <Eyebrow>SKIP</Eyebrow>
            </Pressable>
          </View>
          <Button
            label="Continue"
            variant="accent"
            block
            height={52}
            icon={<ChevronIcon size={14} color={Colors.black} direction="right" />}
            onPress={advance}
          />
        </View>
      </Shell>
    );
  }

  // ---- Step 2: notifications ----
  return (
    <Shell>
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
        <Eyebrow>CHAPTER 02 — ALERTS</Eyebrow>
        <Progress step={2} />
      </View>

      <View style={{ paddingHorizontal: 20, paddingTop: 30 }}>
        <View
          style={{
            width: 80,
            height: 80,
            borderRadius: 80,
            marginBottom: 24,
            backgroundColor: 'rgba(232,197,112,0.12)',
            borderWidth: 1,
            borderColor: 'rgba(232,197,112,0.3)',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <NotificationIcon size={38} color={Colors.accent} />
        </View>

        <Text style={{ ...displayType(32), color: Colors.ink, letterSpacing: -0.5 }}>
          New episode?{'\n'}
          <Text style={{ fontFamily: Fonts.displayItalic }}>We’ll tell you.</Text>
        </Text>
        <Text
          style={{
            fontFamily: Fonts.sans,
            fontSize: 13,
            color: Colors.ink2,
            marginTop: 12,
            lineHeight: 20,
          }}
        >
          Get notified the moment new episodes of your saved series drop. Two pings a week. Never
          more.
        </Text>
      </View>

      <View style={{ paddingHorizontal: 20, paddingTop: 20 }}>
        <View
          style={{
            padding: 14,
            borderRadius: 14,
            backgroundColor: Colors.surface,
            borderWidth: 1,
            borderColor: Colors.hairline,
            flexDirection: 'row',
            gap: 12,
            alignItems: 'flex-start',
          }}
        >
          <Poster
            playbackId={undefined}
            width={42}
            height={42}
            borderRadius={8}
            showTitle={false}
          />
          <View style={{ flex: 1, gap: 2 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text style={{ fontFamily: Fonts.sans600, fontSize: 11, color: Colors.ink }}>
                {APP_NAME}
              </Text>
              <Text style={{ fontFamily: Fonts.mono, fontSize: 10, color: Colors.ink3 }}>now</Text>
            </View>
            <Text
              style={{ fontFamily: Fonts.sans, fontSize: 12, color: Colors.ink2, lineHeight: 17 }}
            >
              <Text style={{ fontFamily: Fonts.sans600, color: Colors.ink }}>
                Contracted to the CEO
              </Text>{' '}
              · EP 47 just dropped. The press conference is going to ruin them.
            </Text>
          </View>
        </View>
      </View>

      <View style={{ flex: 1, minHeight: 24 }} />

      <View style={{ paddingHorizontal: 20, gap: 10 }}>
        <Button
          label="Turn on notifications"
          variant="accent"
          block
          height={52}
          onPress={advance}
        />
        <Button label="Not now" variant="ghost" block height={48} onPress={advance} />
      </View>
    </Shell>
  );
}
