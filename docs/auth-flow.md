# Auth Flow (MVP)

Status: **works, verified by code audit 2026-06-11**. Supabase email/password. No OAuth in MVP.

## The flow

```
first launch ──► /onboarding ──(markOnboarded)──► /auth/login ──► (tabs)
                                      ▲                │
relaunch, no session ─────────────────┘                ▼
relaunch, valid session ──────────────────────► (tabs) directly
```

1. **Gate** — `hooks/useProtectedRoute.ts`, mounted in `app/_layout.tsx` (`NavigationLayout`).
   - `cinedramas_has_onboarded` flag in AsyncStorage decides onboarding vs login wall.
   - Unauthenticated + onboarded → `router.replace('/auth/login')`. Every route except
     `auth/*` and `onboarding` is behind the wall.
2. **Register** — `services/auth.ts#signUp` → edge function `auth-register` with
   `tenant_id` from `app.config.js` `extra.tenantId` (brand manifest). The function
   creates the auth user with `tenant_id` in `app_metadata` + a row in `users`.
   Then signs in immediately.
3. **Login** — `supabase.auth.signInWithPassword`. Session JWT carries
   `app_metadata.tenant_id` — that's what RLS policies key on (`auth.jwt()->>'tenant_id'`).
4. **Persistence** — `services/supabase.ts` configures the client with an
   **expo-secure-store** adapter, `persistSession: true`, `autoRefreshToken: true`.
   Session survives app restarts; tokens never touch AsyncStorage.
5. **Hydration** — `stores/authStore.ts#hydrate` runs once on app start: restores the
   session, then subscribes to `onAuthStateChange` (covers refresh, sign-out, expiry).
6. **API calls** — `services/api.ts` attaches `Authorization: Bearer <access_token>`
   per request and retries once after `refreshSession()` on a 401.
7. **Observability** — user id + tenant id propagate to Sentry and the structured
   logger on every auth change (`app/_layout.tsx`).

## Invariants

- `tenant_id` lives in **`app_metadata`** (server-set, user can't forge it), never `user_metadata`.
- Registration goes through the `auth-register` edge function — **never**
  `supabase.auth.signUp` client-side — so the `users` row + tenant binding happen atomically.
- Sign-out clears SecureStore via the supabase client; the gate bounces to login on next frame.

## Known caveats

- Android SecureStore warns when values exceed 2048 bytes (Supabase session JSON can).
  Harmless warning today; if it ever truncates, swap to a chunked adapter.
- No password reset flow in MVP (deferred with OAuth).
