# Phase 3-5 Tasks

Source: Master Architecture Blueprint, Section 12

## Phase 3 — Silhouette Stabilization (Weeks 9-12)

### T3.01: Create Brand Manifest System
- JSON Schema for manifest.json (appName, slug, tenantId, bundleIds, keys)
- Create brands/clientA/ and brands/clientB/ with manifests + assets
- `scripts/validate-brands.ts`: validate schema, check assets exist, verify dimensions
- Add to CI

### T3.02: Build ThemeProvider
- `theme/tokens.ts` (defaults), `theme/global.css` (CSS variables)
- `components/ui/ThemeProvider.tsx`: reads configStore + brand theme fallback
- Sets CSS variables via NativeWind

### T3.03: Configure EAS Build Matrix
- eas.json profiles per brand. EAS secrets per variant.
- `scripts/build-all.sh` for all variants. Integrate in release CI.

### T3.04: Implement Error Boundaries
- `components/ui/ErrorBoundary.tsx`. Log to Sentry with screen context.
- Wrap every screen. "Something went wrong" + retry UI.

### T3.05: Build Skeleton Loading States
- `components/ui/Skeleton.tsx` (Reanimated shimmer)
- Variants: SkeletonCard, SkeletonRail, SkeletonEpisodeRow, SkeletonPlayer

### T3.06: Implement Offline Graceful Degradation
- persistQueryClient to AsyncStorage. Hydrate on cold start.
- Queue failed progress writes. Use last-known-good config.
- Monitor network with @react-native-community/netinfo

### T3.07: Integrate Sentry with Tenant Tags
- Init in root layout. setTag('tenant_id') + setUser() after login.
- Navigation breadcrumbs. Verify source maps upload.

### T3.08: Implement Structured Logging
- Shared logger utility. JSON: timestamp, level, tenant_id, user_id, request_id, endpoint, method, status_code, latency_ms

### T3.09: Configure Cloudflare Cache Rules
- CNAME for api domain. Cache /catalog/* (300s), /config/* (600s).
- Rate limit /user/progress/* PUT (10/min/IP), /auth/* POST (20/min/IP)

### T3.10: Security Audit — RLS Isolation Tests
- Two test users in different tenants. Automated test suite.
- Verify: cross-tenant reads return empty, cross-tenant writes rejected.
- Run in CI on every PR. Block merge on failure.

### T3.11: Prepare Store Submissions
- Screenshots per brand. App descriptions. Age ratings, privacy labels.
- TestFlight + Google Play internal testing. Submit first variant.

## Phase 4 — Hub Expansion (Weeks 13-18)

### T4.01: Create Hub Supabase Project
- Apply same migrations. Insert Hub tenant records. Run isolation tests.
- Configure connection pooling.

### T4.02: Implement Tenant Resolution Middleware
- `supabase/functions/_shared/tenant.ts`
- Extract JWT -> tenant_id -> query tenants table (cached 5min) -> TenantContext
- Hub: shared client (RLS scopes). Silo: create client with tenant's URL.

### T4.03: Configure Hub Mobile App Variant
- brands/hub/manifest.json pointing to shared Supabase
- Tenant selection at login (or deep link). JWT carries selected tenant_id.

### T4.04: Configure Shared Storage
- Shared bucket with `tenant/{tenant_id}/` prefixes
- Storage RLS: read only own tenant's prefix. Service role writes any.

### T4.05: Build Admin Dashboard MVP
- React web. Tenant CRUD, series/episode management, Mux asset linking.
- Supabase Auth (admin role) + service_role key.

### T4.06: Validate Bridge Model
- Silhouette + Hub tenants coexist. No cross-contamination. Document playbook.

## Phase 5 — Production Scaling (Weeks 19-26)

### T5.01: Build Load Testing Framework
- k6 or Artillery. Behavior models: cold start, steady viewing, browse, token issuance.
- Target: 100,000 concurrent. Identify bottlenecks.

### T5.02: Implement DRM Protected Playback
- Mux DRM (Widevine/FairPlay). Update token service. Configure RN Video DRM props.

### T5.03: Implement GDPR Compliance
- Consent banner (EU). GET /user/data export. DELETE /user. Respect consent in analytics.
