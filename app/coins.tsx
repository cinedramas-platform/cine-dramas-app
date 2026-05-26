import { View, Text, Pressable, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, Fonts } from '@/constants/theme';
import { Eyebrow } from '@/components/ui/Eyebrow';
import { Button } from '@/components/ui/Button';
import { ChevronIcon, CoinIcon, PlusIcon, SparkleIcon } from '@/components/ui/Icon';

const LEDGER = [
  { date: 'Today', what: 'Unlocked · The Estate EP 04', amt: -80 },
  { date: 'Today', what: 'Daily check-in', amt: 10 },
  { date: 'Yest.', what: 'Sponsored ad reward', amt: 30 },
  { date: 'Yest.', what: 'Unlocked · Contracted EP 11', amt: -80 },
  { date: 'Mon', what: 'Pack purchased · 1,200 coins', amt: 1400 },
  { date: 'Sun', what: 'Streak bonus — Week 2', amt: 100 },
];

export default function CoinsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    <View style={{ flex: 1, backgroundColor: Colors.bg, paddingTop: insets.top }}>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: insets.bottom + 20 }}>
        {/* Header */}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 22, paddingTop: 18, paddingBottom: 8 }}>
          <Pressable
            onPress={() => router.back()}
            style={{
              width: 34, height: 34, borderRadius: 34,
              backgroundColor: 'rgba(255,255,255,0.06)',
              alignItems: 'center', justifyContent: 'center',
            }}
          >
            <ChevronIcon size={14} color="#fff" direction="left" />
          </Pressable>
          <Eyebrow>THE VAULT</Eyebrow>
          <View style={{ width: 34 }} />
        </View>

        {/* Editorial balance */}
        <View style={{ paddingHorizontal: 22, paddingTop: 40, paddingBottom: 26, alignItems: 'center', position: 'relative' }}>
          {/* Radial glow */}
          <View style={{
            position: 'absolute', top: 30, alignSelf: 'center', width: 280, height: 280,
            borderRadius: 140, backgroundColor: 'rgba(232,197,112,0.12)',
          }} />

          <Eyebrow color={Colors.accent}>YOUR BALANCE</Eyebrow>
          <Text style={{
            fontFamily: Fonts.display, fontSize: 110, lineHeight: 100, color: Colors.accent,
            letterSpacing: -4, marginTop: 10,
          }}>
            1,240
          </Text>
          <Text style={{
            fontFamily: Fonts.displayItalic, fontSize: 13, color: Colors.ink2, marginTop: 8,
          }}>
            one thousand two hundred and forty coins
          </Text>

          {/* Stats row */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 22, marginTop: 18 }}>
            <View style={{ alignItems: 'center', gap: 1 }}>
              <Text style={{ fontFamily: Fonts.displayItalic, fontSize: 22, color: Colors.ink }}>15</Text>
              <Eyebrow>EPISODES</Eyebrow>
            </View>
            <View style={{ width: 1, height: 34, backgroundColor: Colors.hairline }} />
            <View style={{ alignItems: 'center', gap: 1 }}>
              <Text style={{ fontFamily: Fonts.displayItalic, fontSize: 22, color: Colors.ink }}>14d</Text>
              <Eyebrow>STREAK</Eyebrow>
            </View>
            <View style={{ width: 1, height: 34, backgroundColor: Colors.hairline }} />
            <View style={{ alignItems: 'center', gap: 1 }}>
              <Text style={{ fontFamily: Fonts.displayItalic, fontSize: 22, color: Colors.ink }}>2×</Text>
              <Eyebrow>EARN RATE</Eyebrow>
            </View>
          </View>
        </View>

        {/* CTAs */}
        <View style={{ flexDirection: 'row', paddingHorizontal: 22, paddingBottom: 20, gap: 10 }}>
          <Button
            label="Buy coins"
            variant="accent"
            height={48}
            icon={<PlusIcon size={16} color={Colors.black} />}
            style={{ flex: 1 }}
          />
          <Button
            label="Earn free"
            variant="ghost"
            height={48}
            icon={<SparkleIcon size={14} color="#fff" />}
            style={{ flex: 1 }}
          />
        </View>

        {/* The Ledger */}
        <View style={{ paddingHorizontal: 22, paddingTop: 10 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 14 }}>
            <Text style={{ fontFamily: Fonts.display, fontSize: 22, color: Colors.ink }}>The Ledger</Text>
            <Eyebrow>Last 30 days</Eyebrow>
          </View>

          <View style={{ borderTopWidth: 1, borderTopColor: Colors.hairline }}>
            {LEDGER.map((row, i) => (
              <View key={i} style={{
                paddingVertical: 13,
                borderBottomWidth: 1, borderBottomColor: Colors.hairline2,
                flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
              }}>
                <View style={{ gap: 2, flex: 1 }}>
                  <Eyebrow color={Colors.ink3}>{row.date}</Eyebrow>
                  <Text style={{ fontFamily: Fonts.sans, fontSize: 13, color: Colors.ink }}>{row.what}</Text>
                </View>
                <Text style={{
                  fontFamily: Fonts.mono, fontSize: 13, fontWeight: '600',
                  color: row.amt > 0 ? Colors.success : Colors.ink2,
                }}>
                  {row.amt > 0 ? '+' : ''}{row.amt}
                </Text>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
