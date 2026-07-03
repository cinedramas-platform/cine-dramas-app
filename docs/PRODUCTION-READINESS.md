# Production Readiness — Client Onboarding Guide

> **Status (2026-07-03): DEMO / MVP.** This app is built to *pitch and sell* to
> Producers, not to serve real paying end-users yet. It is a solid demo rig and a
> good architectural skeleton — but it is **not production-safe** as-is.
>
> **Purpose of this doc:** when a real client signs, we have ~1 month to turn the
> demo into a real app for that client. This is the punch-list of what must be
> fixed, in priority order, derived from a full 4-axis audit (white-label pipeline,
> backend/tenancy security, app robustness, infra/ops).
>
> **Do not sell self-serve variants yet.** First client = one hand-held Silhouette
> on a paid, isolated Supabase project. See [MVP-PLAN.md](MVP-PLAN.md), the ADRs in
> `docs/adr/`, and `CONTEXT.md` for product framing.

---

## TL;DR verdict

The engine block is well-machined, but the fuel line leaks, there's one shared
tank with no gauge, and every car off the line is painted the same color.

- **Money integrity: broken.** Any user can mint unlimited coins; no real IAP.
- **Infra: single point of collapse.** One free-tier Supabase for all brands, no
  backups, dead OTA.
- **White-label: not actually delivered.** Runtime theming is dead code; client
  apps ship CineDramas's look with a different name.
- **Blind in prod.** Sentry off, no alerting, money + playback paths untested.

3 of 4 audit axes returned NO or PARTIAL independently.

---

## ✅ What is genuinely solid (do NOT rebuild)

- RLS enabled on all 11 tables; every tenant table gates on
  `tenant_id = auth.jwt()->>'tenant_id'`; user tables also gate on `user_id`.
- Coin ledger is atomic: `unlock_episode` / `claim_daily_checkin` run under
  `lock_caller_wallet()` `FOR UPDATE`; `episode_unlocks` has
  `UNIQUE(tenant,user,episode)` → idempotent, no double-spend; balance `CHECK >= 0`.
- Playback token service: episode fetched via RLS-scoped client (cross-tenant →
  not found); locked episodes require an `episode_unlocks` grant or active VIP;
  signs the signed Mux playback id; 6h expiry; per-user cache key.
- Mux webhook: HMAC-SHA256 verify, 300s tolerance, `timingSafeEqual`, idempotency
  via `webhook_events.idempotency_key`.
- Build matrix: `build-all.sh` is registry-driven (`brands/index.js`), CI runs
  `validate:brands`, EAS profiles use `extends`.
- Secrets hygiene: `.env.local` gitignored, only `.env.example`/`.template`
  committed; anon keys in manifests are fine (public by design).
- Client resilience skeleton: 401→refresh→retry (`services/api.ts`),
  `persistQueryClient`, offline write queue, root `ErrorBoundary`, Sentry code path
  (DSN-guarded, just needs an org).

---

## 🔴 TIER 1 — Blocks ANY paid production (money integrity)

Must be done before a single real coin/dollar moves.

| # | Issue | Evidence | Fix |
|---|-------|----------|-----|
| 1 | **Free-money RPC.** `grant_coins` is `SECURITY DEFINER` **and** `GRANT EXECUTE … TO authenticated`. Any user calls `supabase.rpc('grant_coins',{p_amount:999999})` directly, bypassing the `coins-grant` edge fn whitelist → unlimited coins. | `supabase/migrations/20260602000000_create_coin_economy.sql` (grant at end) | `REVOKE EXECUTE ON FUNCTION grant_coins FROM authenticated, anon`. Credits only via service-role inside a verified webhook. |
| 2 | **No receipt verification.** `coins-grant` `kind:'purchase'` grants pack coins on the client's word. No store/RevenueCat receipt. `react-native-purchases` is in deps but has **zero imports** — no real IAP exists. | `supabase/functions/coins-grant/index.ts:66-74`; `app/paywall.tsx:354` TODO | Wire RevenueCat SDK; grant coins only from a verified RevenueCat webhook (idempotent via `webhook_events`). |
| 3 | **Rate limiting fails OPEN.** `rateLimitCheck` returns `true` (allowed) on any Redis error; `redisCommand` returns null if `UPSTASH_*` unset. Redis down/misconfigured → all limits silently vanish. | `supabase/functions/_shared/redis.ts` | Fail closed (deny on error) for money endpoints, or hard-require Redis env at boot. |
| 4 | **Open self-registration into any tenant.** `auth-register` is unauth'd (`Deno.serve`, no `serve()` wrapper → no logging/rate limit); caller supplies any `tenant_id`; creates confirmed user. Account-stuffing / cross-tenant pollution. | `supabase/functions/auth-register/index.ts` | Rate-limit + captcha; validate tenant allow-list; wrap in `serve()` for logging. |

---

## 🔴 TIER 2 — Blocks multi-client operation (infra)

Must be done before the first client's app is live for their users.

| # | Issue | Evidence | Fix |
|---|-------|----------|-----|
| 5 | **One free-tier Supabase for all brands.** Both manifests point at the same project + anon key + Mux env. Free tier auto-pauses after ~1wk idle (was found INACTIVE once; kept alive by a cron hack). No backups. One idle week or one client = outage for everyone. | `brands/default/manifest.json:11`, `brands/clientA/manifest.json:11-13`, `.github/workflows/keepalive.yml`, `INFRASTRUCTURE-STATUS.md:17-18` | Dedicated **paid** Supabase project per Silhouette client (or paid shared + Hub RLS). Provisioning script/IaC. Enable PITR/backups. |
| 6 | **OTA updates dead.** `expo-updates` not in `package.json` despite every `eas.json` channel + ADR 0002 naming EAS Update the "deployment spine." JS hotfix to a shipped app = full store rebuild. | `package.json` (absent), `eas.json` channels, `docs/adr/0002` | `npx expo install expo-updates` + `eas update:configure`; verify channel wiring. |
| 7 | **Sentry off everywhere.** All brand `sentryDsn: ""`, no Sentry org, `SENTRY_DISABLE_AUTO_UPLOAD=true` in all base profiles. Zero crash visibility. | `brands/*/manifest.json:15`, `lib/sentry.ts:12-17`, `eas.json:13,21,29` | Create Sentry org/project, set DSN per brand + `SENTRY_ORG`/`SENTRY_AUTH_TOKEN` EAS secrets, re-enable source-map upload. |
| 8 | **No alerting/uptime monitoring.** Keepalive fails silently; nothing pages anyone if config 500s, Supabase dies, or webhooks back up. | `.github/workflows/keepalive.yml:12-24` | Uptime monitor on config/health endpoint + Supabase; alert channel (email/Slack/PagerDuty). |
| 9 | **Personal-account SPOF + click-ops infra.** EAS project under `vassil_iliev`; Supabase auth hook & providers configured by hand (unreproducible); Cloudflare CDN/WAF is doc-fiction (no config in repo). | `INFRASTRUCTURE-STATUS.md:11-13,108`; grep: no wrangler/CF config | Move to org-owned EAS/Supabase; script/IaC the Supabase setup (auth hook registration, providers); add Cloudflare config if the CDN/WAF claim is real. |
| 10 | **release.yml submit not registry-driven.** Submit step is copy-pasted per profile; `eas.json` submit profiles are empty `{}` (no ASC/Play credentials). Forget a line = client never submitted; `eas submit` fails without creds. | `.github/workflows/release.yml:63-66`, `eas.json:54-57` | Drive submit from `brands/index.js`; fill submit profiles with per-brand store credentials. |

---

## 🟠 TIER 3 — Delivers the white-label pitch

Without these, "branded variant" is false — client B gets CineDramas's face.

| # | Issue | Evidence | Fix |
|---|-------|----------|-----|
| 11 | **Runtime theming is dead code.** `useTheme()` has zero consumers; all 25+ UI files import hardcoded `constants/theme.ts` (fixed violet/pink). Manifest carries no theme colors except splash bg. | `providers/ThemeProvider.tsx` (self-only), `constants/theme.ts:18-42` | Add theme colors to manifest schema; feed them through `useTheme`/CSS vars; delete/neuter hardcoded palette. |
| 12 | **No per-brand assets.** clientA `iconPath`/`splashPath` point at the SAME shared files; `app.config.js` adaptive-icon + favicon hardcoded, bypass manifest. Client B icon = CineDramas icon. | `brands/index.js:14-17`, `app.config.js:32,42` | Per-brand asset folders; wire adaptive-icon + favicon through the manifest. |
| 13 | **Silhouette isolation unproven.** Mechanism reads per-brand url/key (`services/supabase.ts:6-7`) but clientA reuses default's project. Never exercised with a real 2nd project. | `brands/clientA/manifest.json:11-13` | Stand up a real second Supabase project for a test brand; verify full isolation end-to-end. |
| 14 | **Mux Data mislabeled.** `application_name: 'CineDramas'` hardcoded → every client's QoE data tagged CineDramas. | `components/video/VideoPlayer.tsx:90` | Read app name from brand/manifest. |
| — | Client bundle IDs under `com.cinedramas.*` namespace | `brands/clientA/manifest.json:6,9` | Business decision — confirm per-client namespace/ownership. |

---

## 🟠 TIER 4 — Confidence (tests, error UX)

| # | Issue | Evidence | Fix |
|---|-------|----------|-----|
| 15 | **Zero tests on money + playback paths.** Untested: unlock/coin-spend, wallet hooks, auth store, `useProtectedRoute`, `progressQueue`, both video players, config store, all screens. `PreloadManager` tests cover code VerticalFeed doesn't even use. | `__tests__/` | Add tests for unlock flow, auth, progress queue, player mount/unmount. |
| 16 | **RLS isolation tests skip in CI.** Suite skips without a local DB; `ci.yml` has no `supabase start` step. Core security guarantee never enforced by a gate. | `__tests__/rls.test.ts:9-11`, `.github/workflows/ci.yml` | Add `supabase start` to CI; block merge on RLS failure. |
| 17 | **Video errors = dead end.** Token expiry mid-play → stuck black screen, no retry/re-fetch. Web player (`VideoPlayer.web.tsx`) has no error handling at all. | `components/video/VideoPlayer.tsx:133`, `VideoPlayer.web.tsx` | Error state with retry + token re-fetch; add web `error` listener. |
| 18 | **Silent web failures.** `app/unlock.tsx:86`, `app/paywall.tsx:362` use `Alert.alert` — no-op on react-native-web. Web unlock failure = silent nothing. | as cited | Cross-platform toast/dialog. |
| 19 | **`progressQueue` stale-overwrite.** Flush replays queued entry even if newer progress written online later; `updatedAt` stored but never compared. | `lib/progressQueue.ts:51-72`, `hooks/useWatchProgress.ts:47` | Compare timestamps on flush; drop stale entries; clear matching queued entry on direct success. |
| 20 | **Double-unlock.** Hold-to-unlock has no `isPending` guard → re-hold can double-fire `unlock.mutate` (safe only if server idempotent — it currently is via UNIQUE). | `app/unlock.tsx:54-99` | Guard on `unlock.isPending`. |
| — | Misc | — | `expo-updates` warning; `--legacy-peer-deps` debt; remove ngrok postinstall hack (ADR 0002); rotate demo password in `MVP-PLAN.md:130`; per-screen ErrorBoundaries. |

---

## Suggested ~1-month sequence when a client signs

1. **Week 1 — money + isolation foundation:** Tier 1 (all 4) + #5 (paid isolated Supabase) + #13 (prove isolation). Nothing paid ships until Tier 1 is closed.
2. **Week 2 — real branding:** Tier 3 (#11–14) so the client app actually looks like theirs. Fill store submission (#10).
3. **Week 3 — operability:** #6 OTA, #7 Sentry, #8 alerting, #9 org accounts/IaC.
4. **Week 4 — confidence + polish:** Tier 4 tests (#15, #16) + error UX (#17–20), device/store submission dry-run, load sanity check.

Adjust to the specific client's needs (their content volume, platforms, monetization model, region/compliance).

---

*Generated from a 4-axis production-readiness audit, 2026-07-03. Re-run the audit
after Tier 1–2 land to confirm blockers cleared.*
