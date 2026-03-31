# Data Flows — Step-by-Step

Source: Master Architecture Blueprint, Section 4

## App Launch to Content Browsing (Flow 4.1)

1. App starts, Expo splash screen displayed
2. ThemeProvider reads brand config from AsyncStorage (last-known-good)
3. Zustand authStore hydrates from expo-secure-store, checks for JWT
4. If JWT valid: skip to step 7. If absent/expired: navigate to login
5. User completes login/register
6. Supabase Auth returns JWT with `{ sub, email, tenant_id, role }`
7. Parallel requests: (a) GET /config/:tenantId, (b) GET /catalog/featured, (c) GET /user/progress
8. (a) and (b) are CDN cache hits (< 50ms). (c) passes to origin.
9. Edge function for (c): validate JWT, extract tenant_id, query watch_progress (RLS-scoped)
10. TanStack Query caches all responses. Offline: serves from persisted AsyncStorage
11. Home screen renders: Continue Watching + Featured + Category Rails. Splash dismissed < 2s.

**Failure Handling:**
- Config fails: use last-known-good from AsyncStorage, log to Sentry
- Catalog fails: render from persisted cache, show offline banner
- Progress fails: hide continue-watching rail, other rails render normally

## Authentication Flow (Flow 4.2)

1. User enters email/password or selects social provider
2. App calls `supabase.auth.signInWithPassword()` or `signInWithOAuth()`
3. Supabase Auth validates credentials
4. Generates JWT with tenant_id via `custom_access_token_hook`
5. Returns `{ access_token, refresh_token, expires_in: 3600, user }`
6. App stores tokens in expo-secure-store, updates authStore
7. Sets Authorization header for all subsequent requests
8. Auto-refresh when token within 5 min of expiry

**JWT Structure:** `{ sub, email, role: "authenticated", tenant_id, aud, exp, iat }`

## Video Playback — Premium Content (Flow 4.4)

1. User taps premium episode. Check local entitlement cache.
2. If no cache: GET /user/entitlements. If no entitlement: show paywall.
3. GET /playback/token/:episodeId
4. Edge function: validate JWT, check entitlements table, get mux_playback_id
5. Check Redis token cache: `token:{user_id}:{episode_id}`
6. If not cached: generate signed Mux JWT (RS256, exp: 6h, kid: signing_key_id)
7. Cache in Redis (TTL: 5h)
8. Return: `{ stream_url, thumbnail_url, expires_at }`
9. VideoPlayer loads HLS stream. Mux CDN validates JWT.
10. Mux Data SDK reports QoE metrics.

## Watch Progress (Flow 4.5)

1. Player fires onProgress with current position
2. useWatchProgress debounces: every 10s, on pause, on app background
3. PUT /user/progress/:episodeId `{ position_seconds, completed }`
4. Edge function: validate JWT, rate limit (6/min/user via Redis)
5. UPSERT: `INSERT INTO watch_progress ... ON CONFLICT (tenant_id, user_id, episode_id) DO UPDATE SET position_seconds, completed, updated_at = NOW()`
6. When position >= 90% duration: set completed = true

## Mux Webhook — video.asset.ready (Flow 4.6.1)

1. Mux POST to /webhooks/mux with `Mux-Signature: t=<timestamp>,v1=<hmac>`
2. Verify HMAC-SHA256, check timestamp < 5 min tolerance
3. Extract idempotency key, check webhook_events for duplicate
4. Insert into webhook_events
5. Update episodes: `SET mux_asset_status='ready', mux_playback_id, duration_seconds`
6. Return 200 OK

## RevenueCat Webhook (Flow 4.6.2)

1. RevenueCat POST to /webhooks/revenuecat with Authorization header
2. Verify shared secret
3. Check idempotency, insert webhook_events
4. Map event: initial_purchase/renewal -> tier='premium', cancellation -> tier='free' at period end, expiration -> tier='free' now
5. Return 200 OK
