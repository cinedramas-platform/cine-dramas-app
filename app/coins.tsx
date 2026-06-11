import { useCallback } from 'react';
import { View, Text, Pressable, ScrollView } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, Fonts } from '@/constants/theme';
import { Eyebrow } from '@/components/ui/Eyebrow';
import { Button } from '@/components/ui/Button';
import { ChevronIcon, CoinIcon, PlusIcon, SparkleIcon } from '@/components/ui/Icon';
import { useWallet, useCoinLedger, useGrantCoins, useDailyCheckin } from '@/hooks/useWallet';
import type { CoinTransaction } from '@/types/wallet';

const KIND_LABELS: Record<CoinTransaction['kind'], string> = {
  purchase: 'Pack purchased',
  unlock: 'Episode unlocked',
  checkin: 'Daily check-in',
  ad_reward: 'Sponsored ad reward',
  streak_bonus: 'Streak bonus',
  refund: 'Refund',
  grant: 'Coins granted',
};

function formatDate(iso: string): string {
  const d = new Date(iso);
  const today = new Date();
  const diffDays = Math.floor(
    (today.setHours(0, 0, 0, 0) - new Date(iso).setHours(0, 0, 0, 0)) / 86400000,
  );
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yest.';
  return d.toLocaleDateString(undefined, { weekday: 'short' });
}

export default function CoinsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { data: wallet, refetch: refetchWallet } = useWallet();
  const { data: ledger, refetch: refetchLedger } = useCoinLedger();
  const grantCoins = useGrantCoins();
  const dailyCheckin = useDailyCheckin();

  useFocusEffect(
    useCallback(() => {
      refetchWallet();
      refetchLedger();
    }, [refetchWallet, refetchLedger]),
  );

  const transactions = ledger?.transactions ?? [];

  return (
    <View style={{ flex: 1, backgroundColor: Colors.bg, paddingTop: insets.top }}>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: insets.bottom + 20 }}>
        {/* Header */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingHorizontal: 20,
            paddingTop: 18,
            paddingBottom: 8,
          }}
        >
          <Pressable
            onPress={() => router.back()}
            style={{
              width: 34,
              height: 34,
              borderRadius: 34,
              backgroundColor: 'rgba(255,255,255,0.06)',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <ChevronIcon size={14} color="#fff" direction="left" />
          </Pressable>
          <Eyebrow>THE VAULT</Eyebrow>
          <View style={{ width: 34 }} />
        </View>

        {/* Editorial balance */}
        <View
          style={{
            paddingHorizontal: 20,
            paddingTop: 40,
            paddingBottom: 26,
            alignItems: 'center',
            position: 'relative',
          }}
        >
          {/* Radial glow */}
          <View
            style={{
              position: 'absolute',
              top: 30,
              alignSelf: 'center',
              width: 280,
              height: 280,
              borderRadius: 140,
              backgroundColor: 'rgba(232,197,112,0.12)',
            }}
          />

          <Eyebrow color={Colors.accent}>YOUR BALANCE</Eyebrow>
          <Text
            style={{
              fontFamily: Fonts.display,
              fontSize: 96,
              lineHeight: 110,
              color: Colors.accent,
              letterSpacing: -3,
              marginTop: 10,
            }}
          >
            {(wallet?.total ?? 0).toLocaleString()}
          </Text>
          <Text
            style={{
              fontFamily: Fonts.displayItalic,
              fontSize: 13,
              color: Colors.ink2,
              marginTop: 8,
            }}
          >
            {wallet?.bonus_balance
              ? `${wallet.coin_balance.toLocaleString()} coins + ${wallet.bonus_balance.toLocaleString()} bonus`
              : 'coins to spend'}
          </Text>

          {/* Stats row */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 22, marginTop: 18 }}>
            <View style={{ alignItems: 'center', gap: 1 }}>
              <Text style={{ fontFamily: Fonts.displayItalic, fontSize: 22, color: Colors.ink }}>
                {wallet?.unlocked_count ?? 0}
              </Text>
              <Eyebrow>EPISODES</Eyebrow>
            </View>
            <View style={{ width: 1, height: 34, backgroundColor: Colors.hairline }} />
            <View style={{ alignItems: 'center', gap: 1 }}>
              <Text style={{ fontFamily: Fonts.displayItalic, fontSize: 22, color: Colors.ink }}>
                {wallet?.streak ?? 0}d
              </Text>
              <Eyebrow>STREAK</Eyebrow>
            </View>
            <View style={{ width: 1, height: 34, backgroundColor: Colors.hairline }} />
            <View style={{ alignItems: 'center', gap: 1 }}>
              <Text
                style={{
                  fontFamily: Fonts.displayItalic,
                  fontSize: 22,
                  color: wallet?.is_vip ? Colors.accent : Colors.ink,
                }}
              >
                {wallet?.is_vip ? 'VIP' : '—'}
              </Text>
              <Eyebrow>TIER</Eyebrow>
            </View>
          </View>
        </View>

        {/* CTAs */}
        <View style={{ flexDirection: 'row', paddingHorizontal: 20, paddingBottom: 20, gap: 10 }}>
          <Button
            label={grantCoins.isPending ? 'Adding…' : 'Buy 500'}
            variant="accent"
            height={48}
            icon={<PlusIcon size={16} color={Colors.black} />}
            style={{ flex: 1 }}
            onPress={() => grantCoins.mutate({ kind: 'purchase', pack: 'pack_500' })}
          />
          <Button
            label={
              wallet?.checked_in_today
                ? 'Checked in'
                : dailyCheckin.isPending
                  ? 'Claiming…'
                  : 'Daily +10'
            }
            variant="ghost"
            height={48}
            icon={<SparkleIcon size={14} color="#fff" />}
            style={{ flex: 1 }}
            onPress={() => !wallet?.checked_in_today && dailyCheckin.mutate()}
          />
        </View>

        {/* The Ledger */}
        <View style={{ paddingHorizontal: 20, paddingTop: 10 }}>
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'baseline',
              marginBottom: 14,
            }}
          >
            <Text style={{ fontFamily: Fonts.display, fontSize: 22, color: Colors.ink }}>
              The Ledger
            </Text>
            <Eyebrow>Last 30 days</Eyebrow>
          </View>

          <View style={{ borderTopWidth: 1, borderTopColor: Colors.hairline }}>
            {transactions.length === 0 && (
              <View style={{ paddingVertical: 24, alignItems: 'center' }}>
                <Text style={{ fontFamily: Fonts.sans, fontSize: 13, color: Colors.ink3 }}>
                  No transactions yet.
                </Text>
              </View>
            )}
            {transactions.map((row) => {
              const net = row.amount + row.bonus_amount;
              return (
                <View
                  key={row.id}
                  style={{
                    paddingVertical: 13,
                    borderBottomWidth: 1,
                    borderBottomColor: Colors.hairline2,
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <View style={{ gap: 2, flex: 1 }}>
                    <Eyebrow color={Colors.ink3}>{formatDate(row.created_at)}</Eyebrow>
                    <Text style={{ fontFamily: Fonts.sans, fontSize: 13, color: Colors.ink }}>
                      {row.note ?? KIND_LABELS[row.kind]}
                    </Text>
                  </View>
                  <Text
                    style={{
                      fontFamily: Fonts.mono,
                      fontSize: 13,
                      fontWeight: '600',
                      color: net > 0 ? Colors.success : Colors.ink2,
                    }}
                  >
                    {net > 0 ? '+' : ''}
                    {net}
                  </Text>
                </View>
              );
            })}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
