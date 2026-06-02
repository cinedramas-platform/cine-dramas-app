import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { invokeFunction, invokeFunctionMutation } from '@/services/api';
import type {
  Wallet,
  LedgerResponse,
  UnlockResult,
  GrantResult,
  CheckinResult,
  CoinPack,
} from '@/types/wallet';

export function useWallet() {
  return useQuery({
    queryKey: ['wallet'],
    queryFn: () => invokeFunction<Wallet>('wallet'),
    staleTime: 1000 * 30,
  });
}

export function useCoinLedger() {
  return useQuery({
    queryKey: ['coin-ledger'],
    queryFn: () => invokeFunction<LedgerResponse>('coin-ledger'),
  });
}

export function useUnlockEpisode() {
  const queryClient = useQueryClient();

  return useMutation<UnlockResult, Error, { episodeId: string; seriesId?: string }>({
    mutationFn: ({ episodeId }) =>
      invokeFunctionMutation<UnlockResult>('unlock-episode', {
        body: { episodeId },
      }),
    onSuccess: (_data, { seriesId }) => {
      queryClient.invalidateQueries({ queryKey: ['wallet'] });
      queryClient.invalidateQueries({ queryKey: ['coin-ledger'] });
      if (seriesId) {
        queryClient.invalidateQueries({ queryKey: ['catalog', 'series', seriesId] });
      }
    },
  });
}

export function useGrantCoins() {
  const queryClient = useQueryClient();

  return useMutation<GrantResult, Error, { kind: 'purchase' | 'ad_reward'; pack?: CoinPack }>({
    mutationFn: (body) => invokeFunctionMutation<GrantResult>('coins-grant', { body }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wallet'] });
      queryClient.invalidateQueries({ queryKey: ['coin-ledger'] });
    },
  });
}

export function useDailyCheckin() {
  const queryClient = useQueryClient();

  return useMutation<CheckinResult, Error, void>({
    mutationFn: () => invokeFunctionMutation<CheckinResult>('daily-checkin'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wallet'] });
      queryClient.invalidateQueries({ queryKey: ['coin-ledger'] });
    },
  });
}
