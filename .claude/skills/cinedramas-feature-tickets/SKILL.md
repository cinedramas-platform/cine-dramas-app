---
name: cinedramas-feature-tickets
description: CineDramas implementation roadmap and micro-level task breakdown — 5 phases, 30+ tasks with IDs, dependencies, and detailed steps. Use to find the current task, understand dependencies, or plan next work.
user-invocable: true
disable-model-invocation: false
---

# CineDramas Feature Tickets Reference

Use this skill to find the right task ID, understand task dependencies, and see detailed implementation steps.

## Phase Overview

| Phase | Name | Weeks | Goal |
|-------|------|-------|------|
| 1 | Foundation Infrastructure | 1-2 | Accounts, scaffolding, connectivity |
| 2 | Silhouette Platform Core | 3-8 | All core features for one tenant |
| 3 | Silhouette Stabilization | 9-12 | White-label, monitoring, store submission |
| 4 | Hub Expansion | 13-18 | Multi-tenant control plane |
| 5 | Production Scaling | 19-26 | 100k+ users, DRM, GDPR |

## Task ID Quick Reference

### Phase 1 — Foundation
- T1.01: Initialize Expo Project
- T1.02: Create Supabase Dev Project (schema + RLS + seed)
- T1.03: Configure Supabase Auth
- T1.04: Create Mux Account + Test Asset
- T1.05: Create RevenueCat Project
- T1.06: Create Sentry Project
- T1.07: Configure GitHub + CI
- T1.08: Configure EAS Build System
- T1.09: Verify End-to-End Connectivity

### Phase 2 — Core Platform
- T2.01: Build VideoPlayer Component
- T2.02: Build PreloadManager
- T2.03: Build VerticalFeed (FlashList)
- T2.04: Build PlayerOverlay
- T2.05: Implement Gesture Controls
- T2.06: Set Up Expo Router Navigation
- T2.07: Build Home Screen (rails)
- T2.08: Build Series Detail Screen
- T2.09: Build Catalog Edge Functions
- T2.10: Build Catalog TanStack Query Hooks
- T2.11: Build Search Screen
- T2.12: Implement Supabase Auth Integration
- T2.13: Build Profile Screen
- T2.14: Build Onboarding Screen
- T2.15: Build Watch Progress System
- T2.16: Build Playback Token Service
- T2.17: Build Entitlements System
- T2.18: Build Paywall Screen
- T2.19: Build Mux Webhook Handler
- T2.20: Build Config Service

### Phase 3 — Stabilization
- T3.01: Create Brand Manifest System
- T3.02: Build ThemeProvider
- T3.03: Configure EAS Build Matrix
- T3.04: Implement Error Boundaries
- T3.05: Build Skeleton Loading States
- T3.06: Implement Offline Degradation
- T3.07: Integrate Sentry with Tenant Tags
- T3.08: Implement Structured Logging
- T3.09: Configure Cloudflare Cache Rules
- T3.10: Security Audit — RLS Isolation Tests
- T3.11: Prepare Store Submissions

### Phase 4 — Hub
- T4.01: Create Hub Supabase Project
- T4.02: Implement Tenant Resolution Middleware
- T4.03: Configure Hub Mobile App Variant
- T4.04: Configure Shared Storage
- T4.05: Build Admin Dashboard MVP
- T4.06: Validate Bridge Model

### Phase 5 — Scaling
- T5.01: Build Load Testing Framework
- T5.02: Implement DRM Protected Playback
- T5.03: Implement GDPR Compliance

## For Full Details

- Complete task descriptions with steps: `references/phase1-tasks.md`, `references/phase2-tasks.md`, etc.
- Implementation roadmap with milestones: `references/roadmap.md`
