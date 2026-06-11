export interface Wallet {
  coin_balance: number;
  bonus_balance: number;
  total: number;
  is_vip: boolean;
  streak: number;
  checked_in_today: boolean;
  unlocked_count: number;
  unlocked_episode_ids: string[];
}

export type CoinTransactionKind =
  | 'purchase'
  | 'unlock'
  | 'checkin'
  | 'ad_reward'
  | 'streak_bonus'
  | 'refund'
  | 'grant';

export interface CoinTransaction {
  id: string;
  amount: number;
  bonus_amount: number;
  kind: CoinTransactionKind;
  balance_after: number;
  bonus_after: number;
  episode_id: string | null;
  note: string | null;
  created_at: string;
}

export interface LedgerResponse {
  transactions: CoinTransaction[];
}

export type UnlockStatus = 'unlocked' | 'already_unlocked' | 'vip' | 'free';

export interface UnlockResult {
  status: UnlockStatus;
  coin_balance: number;
  bonus_balance: number;
  cost: number;
}

export interface GrantResult {
  status: string;
  coin_balance: number;
  bonus_balance: number;
}

export interface CheckinResult {
  status: 'claimed';
  streak: number;
  awarded: number;
  coin_balance: number;
  bonus_balance: number;
}

/** Coin pack ids accepted by the coins-grant endpoint. */
export type CoinPack = 'pack_100' | 'pack_500' | 'pack_1200' | 'pack_3000';
