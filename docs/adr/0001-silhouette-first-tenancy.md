# 0001 — Silhouette-first tenancy for MVP

- Status: Accepted
- Date: 2026-06-11

## Context

CineDramas supports two tenancy models (see [CONTEXT.md](../../CONTEXT.md)):

- **Silhouette** — a dedicated, single-Producer branded Tenant (one Producer, one
  Tenant, one Brand, its own app).
- **Hub** — one shared Tenant hosting multiple Producers, logically separated by
  content ownership within the same DB.

The current schema is Silhouette-shaped: `series` hangs off `tenant_id` only, with
no content-owner / publisher column. There is no "Producer" entity in code.

The first sales conversations target a single Producer (creator/studio) who wants
*their own* branded short-drama app. The pitch is "this becomes yours, rebranded";
the consumer coin-economy app is the proof.

## Decision

The MVP is **Silhouette only**. Demo one Producer = one Tenant = one Brand. The Hub
model (multiple Producers under one Tenant, logical content separation) is
documented as the growth path and shown as roadmap, **not built for MVP**.

White-label is demonstrated via the existing 2-brand setup (`default`, `clientA`),
proving "same codebase, different branded app" without needing the Hub content-owner
layer.

## Consequences

- No schema change for MVP. No `producer_id` / content-owner column, no per-Producer
  RLS, no Producer admin UI.
- When Hub work begins, expect: a Producer/content-owner entity, an owner column on
  `series` (+ down the tree), RLS extension, and catalog/rights/revenue-share
  separation. Tracked as post-MVP.
- "Producer" stays a glossary term, not a code entity, until then.

## Alternatives considered

- **Build Hub now** — rejected. Adds weeks (schema, RLS, admin) for a capability the
  first demo (single Producer) does not need.
