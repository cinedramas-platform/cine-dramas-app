# Risks and Architectural Trade-offs

Source: Master Architecture Blueprint, Section 14

## Technical Risks

| Risk | Prob | Impact | Mitigation |
|------|------|--------|------------|
| react-native-video v7 instability | Medium | High | Pin stable version, wrap in abstraction, consider expo-video fallback |
| EAS Build queue delays | Medium | Medium | Use --local for dev, reserve cloud for staging/prod, consider Priority Plan |
| Mux DRM in beta | Medium | Low | Start with signed URLs, add DRM in Phase 5 when GA |
| App Store paywall rejection | Medium | High | Study Apple HIG, include all disclosures, submit to TestFlight early (Week 8) |
| Edge Function cold starts (100-500ms) | Low | Medium | Use warm functions, design for 500ms tolerance, token caching reduces frequency |
| Reanimated/Hermes edge cases | Low | Medium | Keep animations simple for critical paths, test on low-end devices |

## Scaling Risks

| Risk | Prob | Impact | Mitigation |
|------|------|--------|------------|
| Watch progress write storms | Medium | High | 3-layer: client debounce (10s) + server rate limit (6/min) + UPSERT. Fallback: Redis write-behind buffer |
| Playback token burst at content launch | Medium | High | Token cache per (user, episode) TTL 5h. Edge function geo-distributed. Pre-warm hot content. |
| Cold-start catalog burst | Medium | Medium | CDN absorbs 99%+. TanStack persisted cache. stale-while-revalidate. |
| DB connection pool exhaustion | Medium | High | PgBouncer transaction mode. Alert at 80%. Upgrade plan or add read replica. |
| CDN cache key collision (data leakage) | Low | Critical | Cache key must include tenant_id. Automated cross-tenant cache tests. |

## Complexity Risks

| Risk | Prob | Impact | Mitigation |
|------|------|--------|------------|
| White-label asset management | High | Medium | Strict manifest convention, JSON Schema validation, CI blocks invalid manifests |
| Cross-tenant data leakage in Hub | Low | Critical | Defense-in-depth (RLS + JWT + no client params). Automated isolation tests on every PR. Pen testing. |
| Webhook idempotency failures | Medium | Medium | Unique idempotency_key constraint. Check before processing. Return 200 for duplicates. |
| JWT tenant_id staleness | Low | Medium | Silhouette: immutable. Hub: set at registration. Force re-auth if migration needed. 1h TTL. |
| Multi-tenant RevenueCat config | Medium | Medium | Per-tenant API keys in tenants table. SDK init reads from tenant config. |
| Migration drift across environments | Medium | High | Versioned SQL in repo. CI applies to staging. Manual approval for prod. Script for all Silo projects. |

## Architectural Trade-offs

| Decision | Trade-off | Rationale |
|----------|-----------|-----------|
| Single DB | Less service isolation | Simpler at current scale. Service boundaries at edge function level. |
| Supabase Edge Functions | Deno runtime limitations | Geo-distributed, auto-scaling, no server management. API surface is thin enough. |
| RLS for isolation | ~1-5% query overhead | Enforced by DB engine. Eliminates forgotten WHERE clause bugs. |
| RevenueCat | Vendor dependency + revenue % | Saves 3-6 months of custom billing work. |
| Mux | Vendor dependency + per-minute cost | Eliminates multi-million-dollar video infra. |
| Redis for rate limiting | Extra component | Atomic INCR+TTL at low latency. Upstash is serverless, no ops. |
| Bridge tenancy | Operational complexity of both models | Serves both enterprise (silo) and long-tail (pool) without two platforms. |
