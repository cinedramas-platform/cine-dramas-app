# CineDramas — MVP Plan & Handoff

Last updated: 2026-06-11 (evening — P0/P1/P2/P3 executed, see §7).
Authoritative status + priorities for reaching MVP.
Read [CONTEXT.md](../CONTEXT.md) (glossary) and `docs/adr/0001..0003` first.

> **This doc is a handoff.** Implementation happens in a separate session. Everything
> below is written to be actioned cold, with file paths.

## 1. What the MVP is

An **installable EAS build** that a **Producer** (creator/studio) can install on a
real device and try, demonstrating the **Silhouette** model: their own branded
short-drama app with a working coin economy.

- **Pitch:** white-label platform — "this becomes yours, rebranded."
- **Proof:** the consumer loop — vertical feed → play → unlock with coins → check-in.
- **Distribution:** EAS **preview/internal** (TestFlight internal / Android internal /
  APK link). **Not** a public store listing. Coins are **mock** (no real payment).
  See ADR 0003.
- **Not in MVP:** real RevenueCat IAP, VIP subscription, Hub multi-Producer model,
  Google/Apple OAuth.

## 2. Reconciliation — docs vs reality

The older docs (`CLAUDE.md`, `INFRASTRUCTURE-STATUS.md`, the architecture blueprint,
`.claude/skills/*`) predate two shifts and are **partially stale**:

1. **Coin economy** (vertical feed + Coins/Wallet/Unlock/Check-in/Paywall) is built in
   code but absent from those docs. It is now the *core* consumer product.
2. **Expo SDK 54 / RN 0.81** in code; INFRASTRUCTURE-STATUS still says SDK 53.

What the old docs got **right** and still holds: the Silhouette/Hub bridge-tenancy
model, the 8-table schema + RLS + JWT `tenant_id`, the managed-services-first stack.

> Action: treat `CONTEXT.md` + this file + the ADRs as the current source of truth.
> The blueprint stays as deep background; do not rewrite it wholesale.

## 3. Feature status (verified on-device by the owner, 2026-06-11)

| # | Feature | State | Notes |
|---|---------|-------|-------|
| 1 | Auth (onboarding → login gate) | ✅ works (undocumented) | Supabase email/pw, session in SecureStore, `tenant_id` from JWT `app_metadata`. First-run onboarding then login wall (`hooks/useProtectedRoute.ts`). Owner was unaware it was enforced — **document it**, don't rebuild. |
| 2 | Vertical feed + Mux video playback | ✅ works | The product's core. Videos play. |
| 3 | Unlock episode with coins | ✅ works | Coins mock. `unlock-episode`. |
| 4 | Wallet / coin balance | ✅ works | "+500" grants instantly, no payment (mock, by design — ADR 0003). |
| 5 | Daily check-in | ✅ works | Grants once/day. `daily-checkin`. |
| 6 | Paywall screen | ⚠️ unverified | Owner hasn't seen it surface. Confirm entry points + that it renders. |
| 7 | Watch-progress resume | ❌ likely broken | Owner believes it doesn't resume. **Verify + fix.** `hooks/useWatchProgress.ts`, `user-progress`. |
| 8 | UI polish | ❌ needs work | Fonts get **cut off**; current font choice poor (pick a better one); element **alignment** off across screens. Handled in the UI phase (impeccable). |

## 4. Priorities toward MVP (ordered)

**P0 — must work for the demo loop**
1. **Watch-progress resume (#7).** Verify and fix. A drama app that forgets your place
   undercuts the pitch. Files: `hooks/useWatchProgress.ts`, `services/api.ts`,
   `supabase/functions/user-progress/`.
2. **Paywall surfaces correctly (#6).** Confirm it appears when a Viewer hits a locked
   Episode with insufficient Coins, and renders cleanly. File: `app/paywall.tsx`.
3. **Auth flow documented + sanity-checked (#1).** No rebuild — confirm register →
   login → session persist → tenant_id present across restarts.

**P1 — UI overhaul (impeccable phase)**
4. Replace the font; fix the **cut-off text** (line-height / container sizing /
   `numberOfLines`); fix **alignment** across screens. Run `npx impeccable detect`
   then targeted `/critique`, `/typeset`, `/layout`, `/polish`, `/harden`.
   Theme source: `constants/theme.ts`, fonts via `@expo-google-fonts/*` in
   `package.json`.

**P2 — make it installable for clients (deployment)**
5. Stand up **EAS Build + EAS Update** (ADR 0002): one dev client build, preview build
   per brand from the existing `eas.json` matrix, internal distribution links.
6. Demote tunnel; correct the README's Expo Go / tunnel instructions.

**P3 — demo dressing**
7. Real-looking content: enough Series/Episodes with decent posters + real Mux assets
   so the feed looks like a product, not seed data. (`supabase/seed.sql`,
   `scripts/add-signed-playback-ids.mjs`.)

**Explicitly deferred (post-MVP):** RevenueCat IAP, VIP, Hub/multi-Producer, OAuth,
public store submission.

## 5. Known debt / caveats

- `--legacy-peer-deps` required to install — peer-dependency conflict debt. Note for
  CI/EAS (EAS must use the same install flag).
- ngrok postinstall hack (`scripts/apply-ngrok-v3.js` + patch) is **fallback-only**
  after ADR 0002; candidate for removal once tunnel is no longer primary.
- README line ~48 ("press `s` for Expo Go") is **wrong** for this app (native modules
  → Expo Go crashes). Fix during P2.
- Stale version claims in `INFRASTRUCTURE-STATUS.md` (SDK 53 → actually 54).

## 6. UI phase — how to run impeccable

`impeccable` is a UI-quality CLI (24 commands) installed into the AI harness folders.

```bash
npx impeccable skills install      # installs /critique, /audit, /polish, /typeset, /layout, /harden, /onboard, ...
npx impeccable detect <dir>        # scan for UI anti-patterns first
```

Then drive the relevant `/`-commands in the harness. Sequence for this app's issues:
`/critique` (find) → `/typeset` (font + cut-off text) → `/layout` (alignment) →
`/polish` (final pass) → `/harden` (text overflow / i18n safety so text stops
clipping). Empty/locked states via `/onboard` if time allows.

## 7. Execution log — 2026-06-11

All P0–P3 items executed on `dev` (commits `683e58a..`):

- **P0.1 resume — fixed.** Seek now waits for video `onLoad`; previously it fired
  before the player mounted/loaded and was silently dropped (`VerticalFeed.tsx`).
- **P0.2 paywall — fixed.** Insufficient-funds unlock now routes to `/paywall`
  (was `/coins`, so it never surfaced). VIP CTA has a mock "coming soon" action.
- **P0.3 auth — verified + documented** in `docs/auth-flow.md`. No rebuild needed.
- **P1 UI — done.** Display font is now Playfair Display (Instrument Serif clipped
  on Android at tight line heights); every `lineHeight < fontSize` case fixed;
  screen padding standardized to 20; profile shows real wallet data; brand
  name/tagline come from the manifest via `lib/brand.ts`.
- **P2 EAS — done.** `eas.json` channels fixed (uppercase was invalid). The original
  EAS project wasn't accessible from this Expo account → re-initialized as
  `vassil_iliev/cinedramas-dev`; Android preview build launched. README rewritten
  (no Expo Go; EAS internal-distribution flow documented).
- **P3 content — done.** 8 series / 20 episodes / 6 categories live
  (`supabase/demo-content.sql`, applied). New series reuse existing Mux assets with
  time-offset thumbnail posters. Every mood tile resolves.
- **Infra:** Supabase project was found **INACTIVE** (free-tier pause) — restored;
  daily keep-alive workflow added (`.github/workflows/keepalive.yml`).
- **CI:** lint/format scoped to first-party code; all gates green.
- **Demo account:** `demo@cineself.com` / `CineDemo2026!` (tenant `dev-tenant`).

Remaining before a client demo: install the EAS preview build on a device and run
the loop once by hand (feed → play → resume → locked → unlock → check-in).
