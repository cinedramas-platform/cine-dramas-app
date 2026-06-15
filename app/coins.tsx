import { useCallback } from 'react';
import { View, Text, Pressable, ScrollView } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, Fonts, Radius } from '@/constants/theme';
import { Eyebrow } from '@/components/ui/Eyebrow';
import { Button } from '@/components/ui/Button';
import { ChevronIcon, PlusIcon, SparkleIcon } from '@/components/ui/Icon';
import { useWallet, useCoinLedger, useGrantCoins, useDailyCheckin } from '@/hooks/useWallet';
import type { CoinTransaction } from '@/types/wallet';
import { WebContent, useIsDesktopWeb } from '@/lib/layout';

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
  const desktop = useIsDesktopWeb();
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

  const stats = (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 22,
        marginTop: 18,
      }}
    >
      {[
        { v: String(wallet?.unlocked_count ?? 0), l: 'EPISODES', gold: false },
        { v: `${wallet?.streak ?? 0}d`, l: 'STREAK', gold: false },
        { v: wallet?.is_vip ? 'VIP' : '—', l: 'TIER', gold: !!wallet?.is_vip },
      ].map((s, i) => (
        <View key={s.l} style={{ flexDirection: 'row', alignItems: 'center', gap: 22 }}>
          {i > 0 && <View style={{ width: 1, height: 34, backgroundColor: Colors.hairline }} />}
          <View style={{ alignItems: 'center', gap: 1 }}>
            <Text
              style={{
                fontFamily: Fonts.displayItalic,
                fontSize: 22,
                color: s.gold ? Colors.accent : Colors.ink,
              }}
            >
              {s.v}
            </Text>
            <Eyebrow>{s.l}</Eyebrow>
          </View>
        </View>
      ))}
    </View>
  );

  const ctas = (
    <View
      style={{
        flexDirection: desktop ? 'column' : 'row',
        gap: 10,
        marginTop: desktop ? 24 : 0,
        width: '100%',
      }}
    >
      <Button
        label={grantCoins.isPending ? 'Adding…' : 'Buy 500'}
        variant="accent"
        height={48}
        icon={<PlusIcon size={16} color={Colors.onAccent} />}
        style={desktop ? { width: '100%' } : { flex: 1 }}
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
        style={desktop ? { width: '100%' } : { flex: 1 }}
        onPress={() => !wallet?.checked_in_today && dailyCheckin.mutate()}
      />
    </View>
  );

  // Balance "card" — the radial glow lives inside a clipped container so it can
  // never bleed onto the stats row or the buttons (the desktop overlap bug).
  const balanceCard = (
    <View
      style={{
        borderRadius: Radius.xl,
        overflow: 'hidden',
        paddingHorizontal: 24,
        paddingVertical: 32,
        alignItems: 'center',
        backgroundColor: desktop ? Colors.surface : 'transparent',
        borderWidth: desktop ? 1 : 0,
        borderColor: Colors.hairline,
      }}
    >
      <View
        pointerEvents="none"
        style={{
          position: 'absolute',
          top: 20,
          alignSelf: 'center',
          width: 300,
          height: 300,
          borderRadius: 150,
          backgroundColor: 'rgba(124,92,255,0.16)',
        }}
      />
      <Eyebrow color={Colors.accent}>YOUR BALANCE</Eyebrow>
      <Text
        style={{
          fontFamily: Fonts.display,
          fontSize: 84,
          lineHeight: 96,
          color: Colors.accent,
          letterSpacing: -3,
          marginTop: 8,
        }}
      >
        {(wallet?.total ?? 0).toLocaleString()}
      </Text>
      <Text
        style={{ fontFamily: Fonts.displayItalic, fontSize: 13, color: Colors.ink2, marginTop: 6 }}
      >
        {wallet?.bonus_balance
          ? `${wallet.coin_balance.toLocaleString()} coins + ${wallet.bonus_balance.toLocaleString()} bonus`
          : 'coins to spend'}
      </Text>
      {stats}
      {ctas}
    </View>
  );

  const ledgerBlock = (
    <View>
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
  );

  return (
    <View style={{ flex: 1, backgroundColor: Colors.bg, paddingTop: insets.top }}>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: insets.bottom + 20 }}>
        <WebContent max={desktop ? 1040 : 560}>
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

          {desktop ? (
            // Two-panel desktop: balance card (left) + ledger (right).
            <View style={{ flexDirection: 'row', gap: 28, paddingHorizontal: 20, paddingTop: 24 }}>
              <View style={{ width: 420 }}>{balanceCard}</View>
              <View style={{ flex: 1, paddingTop: 8 }}>{ledgerBlock}</View>
            </View>
          ) : (
            <>
              <View style={{ paddingHorizontal: 20, paddingTop: 24, paddingBottom: 20 }}>
                {balanceCard}
              </View>
              <View style={{ paddingHorizontal: 20, paddingTop: 4 }}>{ledgerBlock}</View>
            </>
          )}
        </WebContent>
      </ScrollView>
    </View>
  );
}
