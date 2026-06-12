import { useEffect, useRef, useState } from 'react';
import { Alert, View, Text, Pressable, ScrollView, Dimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from '@/components/ui/LinearGradient';
import { Colors, Fonts, displayType } from '@/constants/theme';
import { formatClock } from '@/lib/format';
import { Eyebrow } from '@/components/ui/Eyebrow';
import { CineStill } from '@/components/ui/CineStill';
import { Button } from '@/components/ui/Button';
import {
  VipIcon,
  CloseIcon,
  SparkleIcon,
  CoinIcon,
  CheckIcon,
  PlayIcon,
} from '@/components/ui/Icon';
import { useFeatured } from '@/hooks/useCatalog';
import { useGrantCoins } from '@/hooks/useWallet';

const { width: SCREEN_W } = Dimensions.get('window');

const OFFER_SECONDS = 4 * 3600 + 12 * 60 + 38;

/**
 * Owns its own 1 Hz tick so the rest of the paywall tree doesn't re-render
 * every second. Deadline-derived (no drift) and the interval stops at zero.
 */
function OfferCountdown() {
  const deadlineRef = useRef(Date.now() + OFFER_SECONDS * 1000);
  const remaining = () => Math.max(0, Math.round((deadlineRef.current - Date.now()) / 1000));
  const [left, setLeft] = useState(remaining);

  useEffect(() => {
    const t = setInterval(() => {
      const next = remaining();
      setLeft(next);
      if (next === 0) clearInterval(t);
    }, 1000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <Text style={{ fontFamily: Fonts.mono, color: Colors.ink2 }}>{formatClock(left)}</Text>;
}

export default function PaywallScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { data: featured } = useFeatured();
  const heroSeries = featured?.featured?.[0];
  const grantCoins = useGrantCoins();

  return (
    <ScrollView style={{ flex: 1, backgroundColor: Colors.bg }} bounces={false}>
      {/* Hero */}
      <View style={{ height: 360, overflow: 'hidden' }}>
        <CineStill
          playbackId={heroSeries?.thumbnail_playback_id ?? undefined}
          width={SCREEN_W}
          height={360}
          noFade
          style={{ width: '100%' }}
        >
          <LinearGradient
            colors={['rgba(0,0,0,0.3)', 'transparent', 'rgba(8,7,10,0.95)']}
            locations={[0, 0.4, 0.95]}
            style={{ position: 'absolute', width: '100%', height: '100%' }}
          />

          {/* Close */}
          <Pressable
            onPress={() => router.back()}
            style={{
              position: 'absolute',
              top: insets.top + 10,
              right: 14,
              width: 34,
              height: 34,
              borderRadius: 34,
              backgroundColor: 'rgba(0,0,0,0.5)',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 5,
            }}
          >
            <CloseIcon size={16} color="#fff" />
          </Pressable>

          {/* VIP crown */}
          <View
            style={{
              position: 'absolute',
              top: insets.top + 14,
              left: 20,
              zIndex: 4,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <VipIcon size={18} color={Colors.accent} />
            <Text
              style={{
                fontFamily: Fonts.sans700,
                fontSize: 11,
                color: Colors.accent,
                letterSpacing: 2.4,
              }}
            >
              VIP MEMBERSHIP
            </Text>
          </View>

          {/* Headline */}
          <View
            style={{ position: 'absolute', left: 20, right: 20, bottom: 20, zIndex: 4, gap: 8 }}
          >
            <Text
              style={{
                fontFamily: Fonts.display,
                fontSize: 38,
                lineHeight: 46,
                color: '#fff',
                letterSpacing: -0.5,
              }}
            >
              The whole catalog,{'\n'}
              <Text style={{ fontFamily: Fonts.displayItalic, color: Colors.accent }}>
                without the wait.
              </Text>
            </Text>
            <Text
              style={{
                fontFamily: Fonts.sans,
                fontSize: 13,
                color: 'rgba(255,255,255,0.78)',
                maxWidth: 320,
                lineHeight: 19,
              }}
            >
              Every series. Every episode. Zero ads. Watch like a critic.
            </Text>
          </View>
        </CineStill>
      </View>

      {/* Scarcity strip */}
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          paddingVertical: 10,
          paddingHorizontal: 20,
          borderTopWidth: 1,
          borderBottomWidth: 1,
          borderColor: Colors.hairline,
          backgroundColor: 'rgba(232,197,112,0.04)',
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <SparkleIcon size={13} color={Colors.accent} />
          <View style={{ gap: 1 }}>
            <Text
              style={{
                fontFamily: Fonts.sans600,
                fontSize: 11,
                color: Colors.accent,
                letterSpacing: 0.6,
              }}
            >
              SUMMER OFFER · 60% OFF
            </Text>
            <Text style={{ fontFamily: Fonts.sans, fontSize: 10, color: Colors.ink3 }}>
              Ends in <OfferCountdown />
            </Text>
          </View>
        </View>
        <View style={{ alignItems: 'flex-end', gap: 1 }}>
          <Text
            style={{ fontFamily: Fonts.display, fontSize: 16, color: Colors.ink, lineHeight: 18 }}
          >
            $1.99
          </Text>
          <Text
            style={{
              fontFamily: Fonts.sans,
              fontSize: 10,
              color: Colors.ink3,
              textDecorationLine: 'line-through',
            }}
          >
            $4.99/wk
          </Text>
        </View>
      </View>

      {/* Comparison cards */}
      <View style={{ paddingHorizontal: 20, paddingTop: 18, paddingBottom: 12 }}>
        <View style={{ flexDirection: 'row', gap: 10 }}>
          {/* VIP card */}
          <View
            style={{
              flex: 1,
              padding: 14,
              borderRadius: 14,
              borderWidth: 1.5,
              borderColor: Colors.accent,
              overflow: 'hidden',
            }}
          >
            <LinearGradient
              colors={['rgba(232,197,112,0.14)', 'rgba(232,197,112,0.04)']}
              style={{
                position: 'absolute',
                width: '100%',
                height: '100%',
                left: 0,
                top: 0,
                borderRadius: 14,
              }}
            />
            <Eyebrow color={Colors.accent} style={{ marginBottom: 8 }}>
              VIP · PICKED
            </Eyebrow>
            <Text style={{ ...displayType(28), color: Colors.ink }}>
              $29<Text style={{ fontSize: 14, color: Colors.ink3 }}>/yr</Text>
            </Text>
            <Text
              style={{ fontFamily: Fonts.sans, fontSize: 10, color: Colors.ink3, marginBottom: 12 }}
            >
              = $0.08 per episode
            </Text>
            {['Unlimited unlocks', 'No ads, ever', '48-hr early access', 'Offline downloads'].map(
              (f) => (
                <View
                  key={f}
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 }}
                >
                  <CheckIcon size={11} color={Colors.accent} />
                  <Text style={{ fontFamily: Fonts.sans, fontSize: 11, color: Colors.ink }}>
                    {f}
                  </Text>
                </View>
              ),
            )}
          </View>

          {/* Coins card — mock purchase until RevenueCat IAP lands */}
          <Pressable
            disabled={grantCoins.isPending}
            onPress={() =>
              grantCoins.mutate(
                { kind: 'purchase', pack: 'pack_500' },
                { onSuccess: () => router.back() },
              )
            }
            style={{
              flex: 1,
              padding: 14,
              borderRadius: 14,
              backgroundColor: Colors.surface,
              borderWidth: 1,
              borderColor: Colors.hairline,
            }}
          >
            <Eyebrow style={{ marginBottom: 8 }}>
              {grantCoins.isPending ? 'ADDING…' : 'PAY AS YOU GO'}
            </Eyebrow>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 6 }}>
              <CoinIcon size={20} />
              <Text style={{ fontFamily: Fonts.display, fontSize: 28, color: Colors.ink }}>
                500
              </Text>
            </View>
            <Text
              style={{ fontFamily: Fonts.sans, fontSize: 10, color: Colors.ink3, marginBottom: 12 }}
            >
              = ~6 episodes
            </Text>
            {['$4.99 one-time', 'Earn coins free', 'Ads remain', "Coins don't expire"].map((f) => (
              <View
                key={f}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 }}
              >
                <Text style={{ color: Colors.ink4, fontSize: 11 }}>·</Text>
                <Text style={{ fontFamily: Fonts.sans, fontSize: 11, color: Colors.ink2 }}>
                  {f}
                </Text>
              </View>
            ))}
          </Pressable>
        </View>
      </View>

      {/* Social proof */}
      <View style={{ paddingHorizontal: 20, paddingTop: 8, paddingBottom: 14 }}>
        <View
          style={{
            padding: 12,
            borderRadius: 10,
            backgroundColor: 'rgba(255,255,255,0.02)',
            borderWidth: 1,
            borderColor: Colors.hairline,
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 }}>
            {[1, 2, 3, 4, 5].map((i) => (
              <Text key={i} style={{ color: Colors.accent, fontSize: 11 }}>
                ★
              </Text>
            ))}
            <Text
              style={{ fontFamily: Fonts.sans, fontSize: 10, color: Colors.ink3, marginLeft: 4 }}
            >
              4.8 · 38,420 reviews
            </Text>
          </View>
          <Text
            style={{
              fontFamily: Fonts.displayItalic,
              fontSize: 14,
              color: Colors.ink,
              lineHeight: 20,
            }}
          >
            “I watched Contracted to the CEO in one sitting. Now I have a problem.”
          </Text>
          <Text style={{ fontFamily: Fonts.sans, fontSize: 10, color: Colors.ink3, marginTop: 4 }}>
            — @maddiereads · App Store review
          </Text>
        </View>
      </View>

      {/* CTA */}
      <View style={{ paddingHorizontal: 20, paddingTop: 4, paddingBottom: 20, gap: 8 }}>
        {/* TODO(revenuecat): wire VIP subscription to RevenueCat IAP (deferred post-MVP). */}
        <Button
          label="Start VIP — $1.99 first week"
          variant="accent"
          block
          height={52}
          icon={<PlayIcon size={14} color={Colors.black} />}
          onPress={() =>
            Alert.alert(
              'VIP is almost here',
              'VIP subscriptions launch with the store release. Until then, grab the coin pack — on the house.',
            )
          }
        />
        <Text
          style={{
            fontFamily: Fonts.sans,
            fontSize: 10,
            color: Colors.ink4,
            textAlign: 'center',
            lineHeight: 15,
          }}
        >
          $29.99/yr after first week. Cancel anytime.
        </Text>
      </View>

      <View style={{ height: insets.bottom + 10 }} />
    </ScrollView>
  );
}
