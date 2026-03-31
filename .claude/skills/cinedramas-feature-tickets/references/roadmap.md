# Implementation Roadmap

Source: Master Architecture Blueprint, Section 11

## Phase 1 — Foundation Infrastructure (Weeks 1-2)

**Goals:** Set up all service accounts, initialize repo, verify connectivity, play test video.

**Deliverables:**
- Initialized Expo project with all dependencies
- Supabase dev project with schema, RLS, seed data
- Mux account with test video verified
- RevenueCat with test products
- Sentry with DSN
- GitHub repo with CI
- Brand config scaffolded
- Test video playing in simple Video component

## Phase 2 — Silhouette Platform Core (Weeks 3-8)

**Goals:** Complete single-tenant platform. End-to-end: register -> browse -> play -> progress -> subscribe.

**Week 3-4: Player + Feed**
- VideoPlayer, VerticalFeed, PreloadManager, gestures, overlay, Mux Data
- Milestone: Swipe through 10+ videos at 60 FPS

**Week 4-5: Navigation + Catalog + Search**
- Expo Router tabs, home screen rails, series detail, catalog edge functions, TanStack Query hooks, search
- Milestone: Full navigation home -> series -> player with real data

**Week 5-6: Auth + Profile**
- Supabase Auth (email + Google + Apple), JWT tenant_id, authStore, protected routes, onboarding
- Milestone: Register, login, see tenant-scoped personalized home

**Week 6-7: Progress + Continue Watching**
- useWatchProgress, edge function with UPSERT + rate limit, continue watching rail, resume
- Milestone: Full continue-watching flow with rate-controlled writes

**Week 7-8: Subscriptions + Paywall**
- RevenueCat SDK, paywall, entitlements (client + server), signed playback tokens, webhook handler
- Milestone: Purchase, unlock premium, restore on new device

## Phase 3 — Silhouette Stabilization (Weeks 9-12)

**Goals:** Production hardening, white-label builds, first store submissions.

**Week 9-10:** Brand manifests, CI validation, ThemeProvider, EAS matrix, store submissions
**Week 11-12:** Sentry integration, error boundaries, skeletons, offline mode, structured logging, Cloudflare, security audit

**Milestone:** V1 production-ready, two Silhouette clients live

## Phase 4 — Hub Architecture (Weeks 13-18)

**Goals:** Multi-tenant Hub with control plane, validated isolation.

**Week 13-14:** Tenant registry, resolution middleware, Hub Supabase project
**Week 15-16:** Edge functions with tenant resolution, Hub app variant, shared storage + Mux + RevenueCat
**Week 17-18:** Isolation test suite, performance testing, bridge model validation, admin dashboard MVP

**Milestone:** Hub live with 3+ tenants, Silhouette unaffected

## Phase 5 — Production Scaling (Weeks 19-26)

**Goals:** 100,000+ concurrent, V2 features, compliance.

**Week 19-20:** Load testing (k6), bottleneck resolution, read replicas if needed
**Week 21-22:** Signed playback, content CMS, subtitles, advanced search
**Week 23-24:** DRM, deep linking, push notifications, recommendations
**Week 25-26:** GDPR, data export/deletion, runbooks, SLO dashboards, A/B testing

**Milestone:** V2 shipped, 100k concurrent validated, compliance ready

## Critical Path

```
Supabase Setup -> Schema + RLS -> Auth + JWT -> Catalog Edge Functions
-> VideoPlayer -> Full Integration -> White-Label -> Store Submission
-> Hub Architecture -> Scale Testing
```

**Duration:** 18-20 weeks minimum.

**Parallelizable:** Mux setup, RevenueCat, Sentry, Cloudflare, admin dashboard, UI components.
