---
name: cinedramas-api-conventions
description: CineDramas API conventions — endpoint contracts, request lifecycle, auth flow, caching headers, rate limiting, webhook processing, and error handling. Use before implementing or modifying edge functions.
user-invocable: true
disable-model-invocation: false
---

# CineDramas API Conventions Reference

Use this skill when implementing edge functions, designing new endpoints, or debugging API behavior.

## API Endpoint Summary

| Method | Endpoint | Auth | Cached | Rate Limited | Service |
|--------|----------|------|--------|-------------|---------|
| POST | /auth/login | No | No | 20/min/IP | Auth |
| POST | /auth/register | No | No | 20/min/IP | Auth |
| POST | /auth/refresh | Yes | No | No | Auth |
| POST | /auth/logout | Yes | No | No | Auth |
| GET | /catalog/series | Yes | CDN 5min | No | Catalog |
| GET | /catalog/series/:id | Yes | CDN 5min | No | Catalog |
| GET | /catalog/featured | Yes | CDN 5min | No | Catalog |
| GET | /catalog/search?q= | Yes | CDN 1min | No | Catalog |
| GET | /user/progress | Yes | No | No | Progress |
| PUT | /user/progress/:episodeId | Yes | No | 6/min/user | Progress |
| GET | /user/entitlements | Yes | No | No | Entitlements |
| GET | /playback/token/:episodeId | Yes | No | 30/min/user | Playback Token |
| GET | /config/:tenantId | No | CDN 10min | No | Config |
| POST | /webhooks/mux | Signature | No | No | Mux Webhook |
| POST | /webhooks/revenuecat | Secret | No | No | RC Webhook |

## Request Pipeline (Every API Call)

1. Client sends HTTPS with `Authorization: Bearer <JWT>` + `X-Request-ID: <uuid>`
2. Cloudflare: TLS termination -> WAF -> rate limit check -> cache check
3. Edge Function: extract JWT -> verify signature -> extract tenant_id + user_id
4. Edge Function: rate limit check (write endpoints, via Redis)
5. Edge Function: business logic (Supabase client query, RLS auto-scopes by tenant)
6. Edge Function: set Cache-Control headers, log structured JSON, return response
7. Cloudflare: cache response (if cacheable), return to client

## Auth Conventions

- JWT contains: `sub` (user ID), `email`, `role`, `tenant_id`, `aud`, `exp`, `iat`
- tenant_id is injected via `custom_access_token_hook` database function
- Tenant comes from JWT claims, NEVER from client parameters
- Access token TTL: 1 hour. Refresh token TTL: 30 days (single-use, rotated).

## Caching Headers

- Catalog endpoints: `Cache-Control: public, max-age=300, stale-while-revalidate=60`
- Config endpoint: `Cache-Control: public, max-age=600, stale-while-revalidate=120`
- Cache key includes tenant_id to prevent cross-tenant cache pollution

## Webhook Processing Rules

1. Verify cryptographic signature (HMAC-SHA256 for Mux, shared secret for RevenueCat)
2. Check timestamp tolerance (< 5 min for Mux replay protection)
3. Extract idempotency key (event ID)
4. Check webhook_events table for duplicate -> return 200 if already processed
5. Process event and insert into webhook_events
6. Return 200 OK

## Structured Logging

Every log entry must include: timestamp, level, tenant_id, user_id, request_id, endpoint, method, status_code, latency_ms, cache_status

## For Full Details

- Detailed request flow diagrams: `references/request-flows.md`
- Webhook processing flows: `references/webhook-flows.md`
