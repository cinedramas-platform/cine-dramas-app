import { useRef, useCallback } from 'react';
import { Alert, View, Text, Pressable, Animated, Dimensions } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from '@/components/ui/LinearGradient';
import { Colors, Fonts, displayType } from '@/constants/theme';
import { episodeCode, joinDots } from '@/lib/format';
import { Eyebrow } from '@/components/ui/Eyebrow';
import { CineStill } from '@/components/ui/CineStill';
import { CloseIcon, CoinIcon, TargetIcon } from '@/components/ui/Icon';
import { useWallet, useUnlockEpisode, useGrantCoins } from '@/hooks/useWallet';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');
const HOLD_DURATION = 1500;

export default function UnlockScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const {
    episodeId,
    seriesId,
    seriesTitle = '',
    episodeNumber = '',
    episodeTitle = 'Locked episode',
    coinCost,
    playbackId,
    origin,
  } = useLocalSearchParams<{
    episodeId?: string;
    seriesId?: string;
    seriesTitle?: string;
    episodeNumber?: string;
    episodeTitle?: string;
    coinCost?: string;
    playbackId?: string;
    origin?: string;
  }>();

  const { data: wallet } = useWallet();
  const unlock = useUnlockEpisode();
  const grantCoins = useGrantCoins();

  // null = price unknown (deep links without catalog context) — never claim 0
  // for an episode the server will charge for.
  const cost = coinCost != null && coinCost !== '' ? Number(coinCost) || 0 : null;
  const balance = wallet?.total ?? 0;

  const fillAnim = useRef(new Animated.Value(0)).current;
  const animRef = useRef<Animated.CompositeAnimation | null>(null);

  const handlePressIn = useCallback(() => {
    animRef.current = Animated.timing(fillAnim, {
      toValue: 1,
      duration: HOLD_DURATION,
      useNativeDriver: false,
    });
    animRef.current.start(({ finished }) => {
      if (!finished) return;
      if (!episodeId) {
        router.back();
        return;
      }
      unlock.mutate(
        { episodeId, seriesId },
        {
          onSuccess: () => {
            // Coming from a player screen: go back to it instead of stacking a
            // second player — its playback-token query refetches and plays in
            // place (useUnlockEpisode invalidates it).
            if (origin === 'player') {
              router.back();
            } else {
              router.replace({
                pathname: `/player/${episodeId}`,
                params: { seriesId: seriesId ?? '' },
              });
            }
          },
          onError: (err) => {
            // 402 insufficient funds -> paywall (VIP + coin pack offers).
            if (err.message === 'insufficient_funds') {
              router.replace('/paywall');
            } else {
              Alert.alert(
                'Unlock failed',
                err.message === 'Too many requests'
                  ? 'Slow down a moment, then try again.'
                  : 'Something went wrong — check your connection and try again.',
              );
            }
            fillAnim.setValue(0);
          },
        },
      );
    });
  }, [fillAnim, router, episodeId, seriesId, unlock, origin]);

  const handlePressOut = useCallback(() => {
    animRef.current?.stop();
    Animated.timing(fillAnim, {
      toValue: 0,
      duration: 200,
      useNativeDriver: false,
    }).start();
  }, [fillAnim]);

  const fillWidth = fillAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  return (
    <View style={{ flex: 1, backgroundColor: '#000' }}>
      {/* Full-bleed background */}
      <CineStill
        playbackId={playbackId ?? undefined}
        width={SCREEN_W}
        height={SCREEN_H}
        noFade
        style={{ position: 'absolute', width: '100%', height: '100%' }}
      />
      <LinearGradient
        colors={['rgba(0,0,0,0.55)', 'rgba(0,0,0,0.2)', 'rgba(8,7,10,0.95)', '#08070A']}
        locations={[0, 0.3, 0.8, 1]}
        style={{ position: 'absolute', width: '100%', height: '100%' }}
      />

      {/* Close button */}
      <Pressable
        onPress={() => router.back()}
        style={{
          position: 'absolute',
          top: insets.top + 18,
          right: 18,
          zIndex: 5,
          width: 36,
          height: 36,
          borderRadius: 36,
          backgroundColor: 'rgba(0,0,0,0.5)',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <CloseIcon size={16} color="#fff" />
      </Pressable>

      {/* Episode header */}
      <View style={{ position: 'absolute', top: insets.top + 60, left: 20, right: 20, zIndex: 5 }}>
        <Eyebrow color={Colors.accent}>
          {joinDots(
            seriesTitle ? seriesTitle.toUpperCase() : null,
            episodeNumber ? episodeCode(episodeNumber) : null,
            'LOCKED',
          )}
        </Eyebrow>
        <Text style={{ ...displayType(36), color: '#fff', letterSpacing: -0.5, marginTop: 6 }}>
          <Text style={{ fontFamily: Fonts.displayItalic }}>{episodeTitle}</Text>
        </Text>
      </View>

      {/* Teaser quote */}
      <View style={{ position: 'absolute', top: insets.top + 200, left: 20, right: 20, zIndex: 5 }}>
        <Text
          style={{
            fontFamily: Fonts.displayItalic,
            fontSize: 18,
            lineHeight: 25,
            color: 'rgba(255,255,255,0.85)',
          }}
        >
          “She knew before the second bottle was poured. She just didn’t know which one of them had
          done it.”
        </Text>
        <Eyebrow color={Colors.ink3} style={{ marginTop: 8 }}>
          FROM THE SCRIPT
        </Eyebrow>
      </View>

      {/* Bottom unlock cluster */}
      <View
        style={{
          position: 'absolute',
          left: 20,
          right: 20,
          bottom: insets.bottom + 28,
          zIndex: 5,
          gap: 14,
        }}
      >
        {/* Cost row */}
        <View
          style={{
            padding: 16,
            borderRadius: 14,
            backgroundColor: 'rgba(255,255,255,0.04)',
            borderWidth: 1,
            borderColor: Colors.hairline,
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <View style={{ gap: 2 }}>
            <Eyebrow color={Colors.accent}>UNLOCK</Eyebrow>
            <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 8 }}>
              <CoinIcon size={18} />
              <Text style={{ fontFamily: Fonts.display, fontSize: 26, color: Colors.ink }}>
                {cost ?? '—'}
              </Text>
            </View>
          </View>
          <View style={{ alignItems: 'flex-end', gap: 2 }}>
            <Eyebrow color={Colors.ink3}>BALANCE</Eyebrow>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <CoinIcon size={12} />
              <Text
                style={{
                  fontFamily: Fonts.display,
                  fontSize: 18,
                  color: cost != null && balance < cost ? Colors.coin : Colors.ink,
                }}
              >
                {balance.toLocaleString()}
              </Text>
            </View>
          </View>
        </View>

        {/* Hold to unlock button */}
        <Pressable onPressIn={handlePressIn} onPressOut={handlePressOut}>
          <View
            style={{
              height: 64,
              borderRadius: 64,
              overflow: 'hidden',
              position: 'relative',
            }}
          >
            <LinearGradient
              colors={['#C9A857', '#E8C570', '#C9A857']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={{ position: 'absolute', width: '100%', height: '100%', borderRadius: 64 }}
            />
            {/* Fill animation */}
            <Animated.View
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                bottom: 0,
                width: fillWidth,
                backgroundColor: 'rgba(255,255,255,0.22)',
                borderRadius: 64,
              }}
            />
            <View
              style={{
                position: 'relative',
                height: '100%',
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 10,
              }}
            >
              <TargetIcon size={18} color={Colors.black} />
              <Text
                style={{
                  fontFamily: Fonts.sans700,
                  fontSize: 14,
                  color: Colors.black,
                  letterSpacing: 0.6,
                }}
              >
                {unlock.isPending ? 'UNLOCKING…' : 'HOLD TO UNLOCK'}
              </Text>
            </View>
          </View>
        </Pressable>

        {/* Alternative paths */}
        <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 14 }}>
          <Pressable
            onPress={() => grantCoins.mutate({ kind: 'ad_reward' })}
            disabled={grantCoins.isPending}
          >
            <Text style={{ fontFamily: Fonts.sans500, fontSize: 11, color: Colors.accent }}>
              Watch ad +10
            </Text>
          </Pressable>
          <Text style={{ fontSize: 11, color: Colors.ink4 }}>·</Text>
          <Pressable onPress={() => router.push('/coins')}>
            <Text style={{ fontFamily: Fonts.sans500, fontSize: 11, color: Colors.accent }}>
              Buy more coins
            </Text>
          </Pressable>
          <Text style={{ fontSize: 11, color: Colors.ink4 }}>·</Text>
          <Pressable onPress={() => router.push('/paywall')}>
            <Text style={{ fontFamily: Fonts.sans500, fontSize: 11, color: Colors.accent }}>
              Go VIP
            </Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}
