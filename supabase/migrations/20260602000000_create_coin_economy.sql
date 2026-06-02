-- T2.xx: Coin economy (ReelShort-style token payments)
-- Two balances per user: paid coin_balance + earned bonus_balance (spent bonus-first).
-- Permanent unlocks via episode_unlocks. All writes go through SECURITY DEFINER RPCs
-- so balance check + deduct + unlock + ledger happen atomically under a row lock.

-- ============================================================
-- episodes: per-episode price
-- Episode is free when is_free = true OR coin_cost = 0.
-- ============================================================
ALTER TABLE public.episodes
  ADD COLUMN IF NOT EXISTS coin_cost INTEGER NOT NULL DEFAULT 80;

-- ============================================================
-- wallets: one per user per tenant
-- ============================================================
CREATE TABLE IF NOT EXISTS public.wallets (
  id                 UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id          TEXT        NOT NULL REFERENCES public.tenants(id),
  user_id            UUID        NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  coin_balance       INTEGER     NOT NULL DEFAULT 0 CHECK (coin_balance >= 0),
  bonus_balance      INTEGER     NOT NULL DEFAULT 0 CHECK (bonus_balance >= 0),
  checkin_streak     INTEGER     NOT NULL DEFAULT 0,
  last_checkin_date  DATE,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE (tenant_id, user_id)
);

ALTER TABLE public.wallets ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER set_updated_at_wallets
  BEFORE UPDATE ON public.wallets
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ============================================================
-- coin_transactions: append-only ledger (feeds The Vault)
-- amount = signed paid-coin delta, bonus_amount = signed bonus delta.
-- ============================================================
CREATE TABLE IF NOT EXISTS public.coin_transactions (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     TEXT        NOT NULL REFERENCES public.tenants(id),
  user_id       UUID        NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  amount        INTEGER     NOT NULL DEFAULT 0,
  bonus_amount  INTEGER     NOT NULL DEFAULT 0,
  kind          TEXT        NOT NULL CHECK (kind IN (
                              'purchase', 'unlock', 'checkin',
                              'ad_reward', 'streak_bonus', 'refund', 'grant')),
  balance_after INTEGER     NOT NULL,
  bonus_after   INTEGER     NOT NULL,
  episode_id    UUID        REFERENCES public.episodes(id) ON DELETE SET NULL,
  note          TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.coin_transactions ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_coin_transactions_user
  ON public.coin_transactions (tenant_id, user_id, created_at DESC);

-- ============================================================
-- episode_unlocks: permanent grant (one row = forever playable)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.episode_unlocks (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id    TEXT        NOT NULL REFERENCES public.tenants(id),
  user_id      UUID        NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  episode_id   UUID        NOT NULL REFERENCES public.episodes(id) ON DELETE CASCADE,
  coins_spent  INTEGER     NOT NULL DEFAULT 0,
  bonus_spent  INTEGER     NOT NULL DEFAULT 0,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE (tenant_id, user_id, episode_id)
);

ALTER TABLE public.episode_unlocks ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- RLS: select-own only. All writes via SECURITY DEFINER RPCs.
-- Mirrors entitlements_user_select.
-- ============================================================
CREATE POLICY "wallets_user_select" ON public.wallets
  FOR SELECT
  USING (
    tenant_id = (auth.jwt()->>'tenant_id')
    AND user_id = (SELECT id FROM public.users WHERE auth_id = auth.uid())
  );

CREATE POLICY "coin_transactions_user_select" ON public.coin_transactions
  FOR SELECT
  USING (
    tenant_id = (auth.jwt()->>'tenant_id')
    AND user_id = (SELECT id FROM public.users WHERE auth_id = auth.uid())
  );

CREATE POLICY "episode_unlocks_user_select" ON public.episode_unlocks
  FOR SELECT
  USING (
    tenant_id = (auth.jwt()->>'tenant_id')
    AND user_id = (SELECT id FROM public.users WHERE auth_id = auth.uid())
  );

-- ============================================================
-- Helper: resolve + lock the caller's wallet row, lazy-creating it.
-- Returns the locked wallet row. Caller must be inside a transaction
-- (RPC bodies are). Raises if the caller has no public.users row.
-- ============================================================
CREATE OR REPLACE FUNCTION public.lock_caller_wallet()
RETURNS public.wallets AS $$
DECLARE
  v_user_id   UUID;
  v_tenant_id TEXT;
  v_wallet    public.wallets;
BEGIN
  SELECT id, tenant_id INTO v_user_id, v_tenant_id
  FROM public.users
  WHERE auth_id = auth.uid();

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'USER_NOT_FOUND';
  END IF;

  INSERT INTO public.wallets (tenant_id, user_id)
  VALUES (v_tenant_id, v_user_id)
  ON CONFLICT (tenant_id, user_id) DO NOTHING;

  SELECT * INTO v_wallet
  FROM public.wallets
  WHERE tenant_id = v_tenant_id AND user_id = v_user_id
  FOR UPDATE;

  RETURN v_wallet;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- unlock_episode: atomic spend (bonus-first) + permanent unlock.
-- Returns { status, coin_balance, bonus_balance, cost }.
-- status: 'already_unlocked' | 'vip' | 'free' | 'unlocked'.
-- Raises INSUFFICIENT_FUNDS / EPISODE_NOT_FOUND.
-- ============================================================
CREATE OR REPLACE FUNCTION public.unlock_episode(p_episode_id UUID)
RETURNS jsonb AS $$
DECLARE
  v_wallet      public.wallets;
  v_cost        INTEGER;
  v_is_free     BOOLEAN;
  v_is_vip      BOOLEAN;
  v_bonus_spent INTEGER;
  v_coins_spent INTEGER;
BEGIN
  v_wallet := public.lock_caller_wallet();

  -- Idempotent: already unlocked.
  IF EXISTS (
    SELECT 1 FROM public.episode_unlocks
    WHERE tenant_id = v_wallet.tenant_id
      AND user_id = v_wallet.user_id
      AND episode_id = p_episode_id
  ) THEN
    RETURN jsonb_build_object(
      'status', 'already_unlocked',
      'coin_balance', v_wallet.coin_balance,
      'bonus_balance', v_wallet.bonus_balance,
      'cost', 0);
  END IF;

  SELECT coin_cost, is_free INTO v_cost, v_is_free
  FROM public.episodes
  WHERE id = p_episode_id AND tenant_id = v_wallet.tenant_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'EPISODE_NOT_FOUND';
  END IF;

  -- Active VIP/premium bypasses coin cost.
  SELECT EXISTS (
    SELECT 1 FROM public.entitlements
    WHERE tenant_id = v_wallet.tenant_id
      AND user_id = v_wallet.user_id
      AND tier IN ('premium', 'vip')
      AND (expires_at IS NULL OR expires_at > NOW())
  ) INTO v_is_vip;

  IF v_is_vip OR v_is_free OR v_cost = 0 THEN
    INSERT INTO public.episode_unlocks (tenant_id, user_id, episode_id, coins_spent, bonus_spent)
    VALUES (v_wallet.tenant_id, v_wallet.user_id, p_episode_id, 0, 0);

    INSERT INTO public.coin_transactions
      (tenant_id, user_id, amount, bonus_amount, kind, balance_after, bonus_after, episode_id, note)
    VALUES (v_wallet.tenant_id, v_wallet.user_id, 0, 0, 'unlock',
            v_wallet.coin_balance, v_wallet.bonus_balance, p_episode_id,
            CASE WHEN v_is_vip THEN 'vip' ELSE 'free' END);

    RETURN jsonb_build_object(
      'status', CASE WHEN v_is_vip THEN 'vip' ELSE 'free' END,
      'coin_balance', v_wallet.coin_balance,
      'bonus_balance', v_wallet.bonus_balance,
      'cost', 0);
  END IF;

  -- Spend bonus first, then paid coins.
  v_bonus_spent := LEAST(v_wallet.bonus_balance, v_cost);
  v_coins_spent := v_cost - v_bonus_spent;

  IF v_coins_spent > v_wallet.coin_balance THEN
    RAISE EXCEPTION 'INSUFFICIENT_FUNDS';
  END IF;

  UPDATE public.wallets
  SET coin_balance = coin_balance - v_coins_spent,
      bonus_balance = bonus_balance - v_bonus_spent
  WHERE id = v_wallet.id
  RETURNING * INTO v_wallet;

  INSERT INTO public.episode_unlocks (tenant_id, user_id, episode_id, coins_spent, bonus_spent)
  VALUES (v_wallet.tenant_id, v_wallet.user_id, p_episode_id, v_coins_spent, v_bonus_spent);

  INSERT INTO public.coin_transactions
    (tenant_id, user_id, amount, bonus_amount, kind, balance_after, bonus_after, episode_id, note)
  VALUES (v_wallet.tenant_id, v_wallet.user_id, -v_coins_spent, -v_bonus_spent, 'unlock',
          v_wallet.coin_balance, v_wallet.bonus_balance, p_episode_id, NULL);

  RETURN jsonb_build_object(
    'status', 'unlocked',
    'coin_balance', v_wallet.coin_balance,
    'bonus_balance', v_wallet.bonus_balance,
    'cost', v_cost);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- grant_coins: add to balances + ledger row. Backs mock purchase,
-- ad reward, manual grant. p_amount -> paid coins, p_bonus -> bonus.
-- ============================================================
CREATE OR REPLACE FUNCTION public.grant_coins(
  p_amount INTEGER,
  p_bonus  INTEGER,
  p_kind   TEXT,
  p_note   TEXT
)
RETURNS jsonb AS $$
DECLARE
  v_wallet public.wallets;
BEGIN
  IF p_amount < 0 OR p_bonus < 0 THEN
    RAISE EXCEPTION 'INVALID_AMOUNT';
  END IF;

  v_wallet := public.lock_caller_wallet();

  UPDATE public.wallets
  SET coin_balance = coin_balance + p_amount,
      bonus_balance = bonus_balance + p_bonus
  WHERE id = v_wallet.id
  RETURNING * INTO v_wallet;

  INSERT INTO public.coin_transactions
    (tenant_id, user_id, amount, bonus_amount, kind, balance_after, bonus_after, note)
  VALUES (v_wallet.tenant_id, v_wallet.user_id, p_amount, p_bonus, p_kind,
          v_wallet.coin_balance, v_wallet.bonus_balance, p_note);

  RETURN jsonb_build_object(
    'status', 'granted',
    'coin_balance', v_wallet.coin_balance,
    'bonus_balance', v_wallet.bonus_balance);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- claim_daily_checkin: award bonus coins, track streak.
-- Raises ALREADY_CLAIMED if claimed today.
-- ============================================================
CREATE OR REPLACE FUNCTION public.claim_daily_checkin()
RETURNS jsonb AS $$
DECLARE
  v_wallet    public.wallets;
  v_streak    INTEGER;
  v_award     INTEGER := 10;
  v_milestone INTEGER := 0;
BEGIN
  v_wallet := public.lock_caller_wallet();

  IF v_wallet.last_checkin_date = CURRENT_DATE THEN
    RAISE EXCEPTION 'ALREADY_CLAIMED';
  END IF;

  IF v_wallet.last_checkin_date = CURRENT_DATE - 1 THEN
    v_streak := v_wallet.checkin_streak + 1;
  ELSE
    v_streak := 1;
  END IF;

  -- Weekly milestone bonus.
  IF v_streak % 7 = 0 THEN
    v_milestone := 100;
  END IF;

  UPDATE public.wallets
  SET bonus_balance = bonus_balance + v_award + v_milestone,
      checkin_streak = v_streak,
      last_checkin_date = CURRENT_DATE
  WHERE id = v_wallet.id
  RETURNING * INTO v_wallet;

  INSERT INTO public.coin_transactions
    (tenant_id, user_id, amount, bonus_amount, kind, balance_after, bonus_after, note)
  VALUES (v_wallet.tenant_id, v_wallet.user_id, 0, v_award, 'checkin',
          v_wallet.coin_balance, v_wallet.bonus_balance,
          'Daily check-in · day ' || v_streak);

  IF v_milestone > 0 THEN
    INSERT INTO public.coin_transactions
      (tenant_id, user_id, amount, bonus_amount, kind, balance_after, bonus_after, note)
    VALUES (v_wallet.tenant_id, v_wallet.user_id, 0, v_milestone, 'streak_bonus',
            v_wallet.coin_balance, v_wallet.bonus_balance,
            'Streak milestone · ' || v_streak || ' days');
  END IF;

  RETURN jsonb_build_object(
    'status', 'claimed',
    'streak', v_streak,
    'awarded', v_award + v_milestone,
    'coin_balance', v_wallet.coin_balance,
    'bonus_balance', v_wallet.bonus_balance);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Authenticated users invoke these RPCs (definer enforces ownership via auth.uid()).
GRANT EXECUTE ON FUNCTION public.unlock_episode(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.grant_coins(INTEGER, INTEGER, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.claim_daily_checkin() TO authenticated;
