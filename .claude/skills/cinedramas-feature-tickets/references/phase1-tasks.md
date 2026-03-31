# Phase 1 — Foundation Infrastructure Tasks (Weeks 1-2)

Source: Master Architecture Blueprint, Section 12

## T1.01: Initialize Expo Project
**Owner:** Frontend | **Dependencies:** None
1. `npx create-expo-app@latest cinedramas-app --template blank-typescript`
2. Install all dependencies (Section 10.2, Steps 3-4)
3. Configure tsconfig.json, ESLint, Prettier
4. Create directory structure: `app/(tabs)`, `app/series`, `app/player`, `app/auth`, `components/video`, `components/series`, `components/home`, `components/paywall`, `components/ui`, `hooks`, `stores`, `services`, `brands/default`, `theme`, `utils`, `supabase/migrations`, `supabase/functions`, `scripts`
5. Create .gitignore
6. Verify app runs on emulator with `npx expo start`

## T1.02: Create Supabase Development Project
**Owner:** Backend | **Dependencies:** None
1. Create account, org, project `cinedramas-dev`
2. Record Project URL, anon key, service role key, JWT secret
3. `supabase init` and `supabase link`
4. Create migration with all tables (Section 7), RLS (Section 8.3), indexes (Section 8.4)
5. Add `custom_access_token_hook` function
6. Add user creation trigger (auth.users INSERT -> public.users INSERT)
7. `supabase db reset`
8. Create seed.sql with test tenant + content

## T1.03: Configure Supabase Authentication
**Owner:** Backend | **Dependencies:** T1.02
1. Enable Email provider (confirm email OFF for dev)
2. Create Google Cloud OAuth client, enable Google provider
3. Create Apple Sign-In service ID, enable Apple provider
4. Register `custom_access_token_hook` in Auth settings > Hooks
5. Test: register user, verify JWT contains tenant_id

## T1.04: Create Mux Account and Test Asset
**Owner:** Backend | **Dependencies:** None
1. Create Mux account, generate API access token
2. Generate signing key pair (Key ID + Private Key)
3. Upload test video, set playback to `public`
4. Note Playback ID and Mux Data Environment Key
5. Verify: `https://stream.mux.com/{playbackId}.m3u8` plays in browser

## T1.05: Create RevenueCat Project
**Owner:** Backend | **Dependencies:** None
1. Create project `cinedramas-dev`
2. Add iOS (com.cinedramas.dev) and Android apps
3. Create `premium` entitlement
4. Create Monthly/Yearly products, default offering
5. Note Public SDK Keys

## T1.06: Create Sentry Project
**Owner:** DevOps | **Dependencies:** None
1. Create React Native project `cinedramas-dev`
2. Note DSN

## T1.07: Configure GitHub Repository and CI
**Owner:** DevOps | **Dependencies:** T1.01
1. Create private repo, push code, enable branch protection
2. Add secrets: SUPABASE_ACCESS_TOKEN, EXPO_TOKEN, project refs
3. Create `.github/workflows/ci.yml`
4. Verify CI runs on test PR

## T1.08: Configure EAS Build System
**Owner:** DevOps | **Dependencies:** T1.01
1. `eas login` and `eas init`
2. Create eas.json with dev/preview/production profiles
3. Create app.config.js with dynamic brand loading
4. Create brands/default/manifest.json + placeholder assets
5. Test: `eas build --platform android --profile development`

## T1.09: Verify End-to-End Connectivity
**Owner:** Fullstack | **Dependencies:** T1.01, T1.02, T1.04
1. Create .env.local with Supabase + Mux credentials
2. Create minimal screen with Supabase client
3. Create minimal Video component with Mux HLS URL
4. Run on emulator: verify Supabase connects + video plays
