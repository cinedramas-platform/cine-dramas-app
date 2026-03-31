---
name: cinedramas-architecture
description: CineDramas system architecture — component boundaries, Silhouette vs Hub models, data flows, and design principles. Use when making architectural decisions, understanding component relationships, or planning how features fit into the system.
user-invocable: true
disable-model-invocation: false
---

# CineDramas Architecture Reference

Use this skill when you need to understand the system design, make architectural decisions, or verify that a feature aligns with the platform's design principles.

## Quick Reference

### Architecture Principles
1. **Managed-Services-First** — Delegate video (Mux), billing (RevenueCat), backend (Supabase)
2. **Two-Plane SaaS** — Control plane (tenant mgmt) + Application plane (runtime APIs)
3. **Defense-in-Depth Isolation** — RLS + JWT tenant claim + build-time tenant identity
4. **Edge-First Performance** — CDN-cached reads, edge functions for latency-critical ops
5. **Progressive Evolution** — tenant_id everywhere from day one, same code for both models

### Component Boundaries

**Client Layer:**
- Silhouette Apps — branded per-client mobile apps (React Native + Expo)
- Hub App — single multi-tenant app with runtime tenant resolution
- Admin Dashboard — React web app for content/tenant management

**Application Plane (Supabase Edge Functions):**
- Auth, Catalog, Progress, Playback Token, Config, Entitlements services
- Mux Webhook Handler, RevenueCat Webhook Handler

**Data Layer:**
- PostgreSQL (Supabase) — system of record, RLS-enforced
- Object Storage (Supabase Storage) — brand assets, thumbnails
- Redis (Upstash) — rate limiting, token cache (ephemeral only)

**External Platforms:**
- Mux — video pipeline (encode, store, stream, analytics)
- RevenueCat — subscription lifecycle, receipt validation
- Cloudflare — CDN, WAF, DDoS protection

### Silhouette vs Hub

| Aspect | Silhouette (Stage 1) | Hub (Stage 2) |
|--------|---------------------|---------------|
| Database | Dedicated per tenant | Shared, RLS-isolated |
| Mux | Dedicated environment | Shared environment |
| Mobile App | Branded per tenant | Single or branded, shared backend |
| Tenant Resolution | Build-time (APP_VARIANT) | Runtime (JWT tenant_id) |
| Onboarding | Days (provision infra) | Hours (add tenant record) |

**Critical invariant:** Same code, same schema, same API contracts for both models.

### Key Data Flows
For detailed request flows (app launch, auth, playback, progress, webhooks), see:
`references/data-flows.md`

### Design Constraints
- Single codebase for all apps
- No custom video infrastructure
- No custom billing logic
- PostgreSQL is sole source of truth
- Server-side token generation only
