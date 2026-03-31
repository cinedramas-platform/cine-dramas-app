# Request Flows — Detailed

Source: Master Architecture Blueprint, Sections 4.3, 4.4, 4.5

## Generic API Request Pipeline

```
Step  Layer                Action
1     Mobile App           Construct request: URL + Authorization: Bearer <jwt> + X-Request-ID: <uuid>
2     Cloudflare CDN       DNS -> nearest PoP -> TLS terminated -> WAF rules -> rate limit check
3     Cloudflare Cache     GET cacheable? HIT -> return cached. MISS -> forward to origin.
                           Cache key: {tenant_id}:{endpoint}:{query_params}
4     Edge Function        Cold-start < 100ms. Extract JWT from Authorization header.
5     Edge Function        JWT validation: verify signature (Supabase JWT secret), check exp,
                           extract tenant_id and user_id (sub claim)
6     Edge Function        Rate limiting (write endpoints): INCR Redis counter rate:{user_id}:{endpoint}
                           If exceeded -> 429 Too Many Requests
7     Edge Function        Business logic: construct SQL, execute via Supabase client,
                           RLS auto-filters: WHERE tenant_id = auth.jwt()->>'tenant_id'
8     PostgreSQL           Query executes with RLS enforcement. Returns tenant-scoped results.
9     Edge Function        Response: set Cache-Control headers, set X-Request-ID,
                           log: { tenant_id, user_id, endpoint, latency_ms, status_code, request_id }
10    Cloudflare CDN       Cache if cacheable. Return to client.
11    Mobile App           TanStack Query: cache, update state, persist to AsyncStorage
```

## Playback Token Request (Premium Content)

```
1  App: GET /playback/token/:episodeId (Bearer JWT)
2  Edge: Validate JWT -> extract tenant_id, user_id
3  Edge: Query entitlements WHERE tenant_id AND user_id -> confirm active sub
4  Edge: Query episodes WHERE id = :episodeId -> get mux_playback_id
5  Edge: Check Redis cache key: token:{user_id}:{episode_id}
   - If cached and valid -> return cached token (skip to step 8)
6  Edge: Generate Mux JWT:
   {
     sub: mux_playback_id,
     aud: "v",
     exp: now + 6 hours,
     kid: mux_signing_key_id
   }
   Sign with RS256 using Mux private key (env var)
7  Edge: Cache in Redis: token:{user_id}:{episode_id} TTL=5h
8  Edge: Return { stream_url, thumbnail_url, expires_at }
9  App: VideoPlayer loads stream_url. Mux CDN validates JWT.
```

## Watch Progress Write

```
1  App: Video onProgress fires with current position (seconds)
2  App: useWatchProgress debounces: batch, send every 10s / on pause / on background
3  App: PUT /user/progress/:episodeId { position_seconds, completed }
4  Edge: Validate JWT -> tenant_id, user_id
5  Edge: Rate limit: Redis INCR rate:{user_id}:progress, max 6/min
   - Exceeded -> 429 (client silently skips, retries next interval)
6  Edge: UPSERT:
   INSERT INTO watch_progress (tenant_id, user_id, episode_id, position_seconds, completed, updated_at)
   VALUES ($1, $2, $3, $4, $5, NOW())
   ON CONFLICT (tenant_id, user_id, episode_id)
   DO UPDATE SET position_seconds = EXCLUDED.position_seconds,
                 completed = EXCLUDED.completed,
                 updated_at = NOW();
7  App: When position >= 90% duration -> set completed = true
```

## Webhook Processing (Mux)

```
1  Mux: POST /webhooks/mux
   Headers: Mux-Signature: t=<timestamp>,v1=<hmac>
   Body: { type: "video.asset.ready", data: { id, playback_ids, duration } }
2  Edge: Extract Mux-Signature. Compute HMAC-SHA256(body, webhook_secret).
   Compare with provided signature. Check timestamp < 5 min.
3  Edge: Extract idempotency_key (event ID). Check webhook_events.
   If exists -> return 200 (already processed).
4  Edge: INSERT INTO webhook_events { source: 'mux', event_type, payload, idempotency_key }
5  Edge: UPDATE episodes SET mux_asset_status='ready', mux_playback_id, duration_seconds
   WHERE mux_asset_id = <from payload> AND tenant_id = <from mapping>
6  Edge: Return 200 OK
```

## Webhook Processing (RevenueCat)

```
1  RevenueCat: POST /webhooks/revenuecat
   Headers: Authorization: Bearer <shared_secret>
   Body: { event: { type, subscriber_id, entitlements } }
2  Edge: Verify Authorization header matches stored secret.
3  Edge: Idempotency check. INSERT webhook_events.
4  Edge: Map event:
   - initial_purchase / renewal -> UPSERT entitlements: tier='premium', expires_at
   - cancellation -> UPDATE: tier='free', expires_at=end_of_period
   - expiration -> UPDATE: tier='free', expires_at=NOW()
5  Edge: Return 200 OK
```
