---
name: cinedramas-testing-strategy
description: CineDramas testing strategy — RLS isolation tests, security audit procedures, monitoring/alerting setup, and risk mitigations. Use when writing tests, setting up monitoring, or auditing security.
user-invocable: true
disable-model-invocation: false
---

# CineDramas Testing & Security Reference

Use this skill when writing tests, setting up monitoring, performing security audits, or evaluating risks.

## Testing Layers

### RLS Isolation Tests (Critical — T3.10)
Automated tests that run on every PR. Two test users in different tenants:
- User A queries series -> receives only tenant-a series
- User A queries with explicit tenant_id=tenant-b -> still gets only tenant-a (RLS overrides)
- User A inserts with tenant_id=tenant-b -> rejected
- User A reads User B's progress -> empty result
- User A updates User B's entitlement -> rejected

### Unit Tests
- Framework: Vitest
- Scope: Utility functions, store logic, data transformations
- Location: Co-located with source files or in `__tests__/` directories

### Component Tests
- Framework: @testing-library/react-native
- Scope: Screen rendering, user interaction, state changes
- Verify: Loading states, error states, data display

### Edge Function Tests
- Scope: JWT validation, rate limiting logic, webhook signature verification
- Test idempotency: duplicate webhook -> return 200 without re-processing
- Test auth: missing JWT -> 401, expired JWT -> 401, wrong tenant -> empty results

## Security Audit Checklist

1. **RLS enabled on all tables:** `SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public'`
2. **No tenant_id from client params:** tenant always from `auth.jwt()->>'tenant_id'`
3. **Webhook signature verification:** HMAC-SHA256 for Mux, shared secret for RevenueCat
4. **Secrets not in code:** `.env` in `.gitignore`, no secrets in commits
5. **Service role key server-side only:** never in mobile builds or client-accessible storage
6. **Mux signing key server-side only:** Edge Function env vars only
7. **Cache key includes tenant_id:** prevents cross-tenant cache pollution

## Monitoring & Alerting

| Alert | Condition | Severity |
|-------|-----------|----------|
| High API Error Rate | 5xx > 1% for 5min | Critical |
| Elevated Latency | p95 > 2s for 10min | Warning |
| DB Connection Saturation | Pool > 80% for 5min | Critical |
| Webhook Processing Failure | > 10 failed/hour | Warning |
| Mux Playback Failure Rate | > 0.5% | Warning |
| Sentry Error Spike | > 50 new errors/15min | Warning |
| Cache Hit Ratio Drop | CDN < 80% | Info |

## Risk Mitigations

See `references/risks-and-tradeoffs.md` for the full risk register with probability, impact, and mitigation strategies.

## Key Architectural Trade-offs

- Single DB over microservice DBs: simpler at current scale, table ownership documented
- RLS over app-level filtering: ~1-5% overhead, but eliminates forgotten WHERE clause bugs
- RevenueCat over custom billing: vendor dependency, but saves 3-6 months of work
- Mux over custom video: vendor dependency, but eliminates multi-million-dollar infra
- Redis for rate limiting: additional component, but atomic INCR+TTL at low latency
