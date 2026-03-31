---
name: cinedramas-infrastructure
description: CineDramas infrastructure — hosting architecture, environments, deployment pipelines, secrets management, CI/CD setup, and development environment setup. Use when configuring deployments, managing secrets, or setting up dev environments.
user-invocable: true
disable-model-invocation: false
---

# CineDramas Infrastructure Reference

Use this skill when setting up environments, configuring deployments, managing secrets, or working with CI/CD.

## Hosting Architecture

| Component | Provider | Purpose |
|-----------|----------|---------|
| DB + Auth + Edge Functions + Storage | Supabase | Integrated BaaS with RLS |
| CDN + WAF + DNS | Cloudflare | Edge caching, DDoS protection |
| Mobile Builds | EAS Build (Expo) | Cloud iOS/Android compilation per brand |
| OTA Updates | EAS Update | JS bundle updates without store review |
| Rate Limiting + Token Cache | Upstash Redis | Serverless edge-compatible Redis |
| Crash Reporting | Sentry | Source-mapped crashes with tenant tags |
| Video | Mux | End-to-end video pipeline |
| Billing | RevenueCat | Cross-platform subscriptions |
| Source Control + CI | GitHub + GitHub Actions | Repo, branch protection, workflows |

## Environments

| Env | Supabase Project | Mux | Data |
|-----|-----------------|-----|------|
| Development | cinedramas-dev | Test env | Seed data |
| Staging | cinedramas-staging | Test env | Synthetic |
| Production | cinedramas-prod (Hub) + per-tenant (Silo) | Prod envs | Real |

## Deployment Pipelines

### Backend (Edge Functions)
```
Push to GitHub -> CI (typecheck + test + RLS tests + validate brands)
  -> merge to main: deploy to STAGING (supabase functions deploy)
  -> release tag v*: deploy to PRODUCTION (manual approval)
```

### Mobile
```
Push to GitHub -> CI (typecheck + test)
  -> merge to main: EAS Update OTA to staging channel
  -> release tag v*: EAS Build matrix (all variants) -> EAS Submit to stores
```

### Database
```
Create migration SQL -> PR review -> merge to main: supabase db push (staging)
  -> release tag: supabase db push (prod, manual approval)
```

## Secrets

| Secret | Storage | Never In |
|--------|---------|----------|
| Supabase JWT Secret | Supabase project settings | Code, client |
| Supabase Service Role Key | Supabase + GitHub Actions | Client, mobile builds |
| Mux API Token | Edge Function env vars | Code, client |
| Mux Signing Private Key | Edge Function env vars | Code, client, mobile |
| Mux Webhook Secret | Edge Function env vars | Code, client |
| RevenueCat Webhook Secret | Edge Function env vars | Code, client |
| Sentry DSN | Mobile build config | (Public, but project-protected) |

**Rules:** No secrets in repo. `.env` in `.gitignore`. Mux signing key server-side only. Service role key server-side only.

## Dev Environment Setup

For the complete step-by-step setup guide (prerequisites, repo init, Supabase, Mux, RevenueCat, Expo/EAS, Cloudflare, Sentry, CI/CD), see `references/dev-setup.md`.

## Key Configuration Files

- `app.config.js` — Dynamic Expo config reading `APP_VARIANT` for brand switching
- `eas.json` — EAS Build profiles per brand variant
- `brands/{variant}/manifest.json` — Per-brand config (IDs, keys, theme)
- `brands/index.ts` — Brand config registry
- `.env.example` — Environment variable template
- `supabase/migrations/` — Versioned SQL migration files
- `.github/workflows/ci.yml` — CI pipeline
- `.github/workflows/release.yml` — Release pipeline
