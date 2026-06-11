# CineDramas — Context & Glossary

The canonical glossary for this project. Terms here are binding: code, docs, and
conversation should use them with these exact meanings. No implementation detail
lives here — this is a dictionary, not a spec.

## Product framing

CineDramas is a **white-label short-drama platform**. We sell studios/creators the
ability to launch their _own_ branded short-drama mobile app from one shared
codebase. The consumer-facing app (vertical feed + coin economy) is the _proof_;
the white-label capability ("this becomes yours, rebranded") is the _pitch_.

It is **not** positioned as generic "streaming infrastructure." Earlier docs
(architecture blueprint, INFRASTRUCTURE-STATUS) framed it as "Shopify for
streaming"; that framing predates the short-drama + coin-economy direction and is
being reconciled.

## Glossary

### Producer

A creator/studio that owns short-drama content. The _buyer_ in the Silhouette
model, a _content supplier_ in the Hub model. Replaces "producer house" and loose
use of "client"/"customer" in prose.

### Operator

Whoever runs a Tenant instance. In **Silhouette** the Operator _is_ the Producer
(1:1, their own app). In **Hub** the Operator is CineDramas/a distributor running
one shared instance for many Producers.

### Silhouette _(MVP target)_

A dedicated, single-Producer branded Tenant — one Producer, one Tenant, one Brand,
its own app. The premium offering and the MVP demo model. Matches current code
(`series.tenant_id`, no publisher layer).

### Hub _(post-MVP)_

One shared Tenant instance hosting **multiple Producers**, logically separated by
content within the same DB. The offering for smaller Producers. Requires a
content-owner layer not yet in schema.

### Tenant

The isolated runtime instance for one Operator. Carried as `tenant_id` on every
table; RLS isolates by it. Term kept as-is in code. (One logical Tenant may host
multiple **Producer Houses** — see below.)

### Brand

The build-time identity/look of an app (name, icon, splash, theme), selected by
`APP_VARIANT` and defined in `brands/{variant}/manifest.json`. `clientA` is a
throwaway _sample_ brand id, not a real Operator.

### Viewer

A person who watches dramas in the consumer app. Replaces consumer-side use of
"user". (Code keeps the `users` table; "Viewer" is the prose term.)

### Tenant — note on Producer separation

A Hub Tenant carries multiple Producers, logically separated by content ownership.
This separation **does not exist in code yet** (`series` hangs off `tenant_id`
only, no owner/publisher column). It is a Hub (post-MVP) concern.

## Catalog terms

### Series

A short-drama title. Owned by a Tenant (`series.tenant_id`). Has Seasons.

### Season

A grouping of Episodes within a Series.

### Episode

A single short-form video unit. References a Mux asset; playback is via a signed
Mux playback id. An Episode is either free or locked behind Coins.

## Monetization terms (coin economy)

### Coin

The in-app soft currency. Spent to **Unlock** locked Episodes. Earned via Daily
Check-in / ad-reward, or topped up via Coin Packs. **For MVP all Coins are mock**
— no real money (`coins-grant` is an explicit mock endpoint; RevenueCat unwired).

### Wallet

A Viewer's Coin balance and ledger. Backed by the coin-economy migration +
`wallet` / `coin-ledger` edge functions.

### Unlock

Spending Coins to gain permanent access to a locked Episode (`unlock-episode`).

### Daily Check-in

A once-per-day Coin grant to drive retention (`daily-checkin`). Confirmed working,
grants once per day.

### Coin Pack

A bundle of Coins (`pack_100` … `pack_3000`). **Mock purchase** for MVP — clicking
grants Coins with no payment. Real purchase deferred to RevenueCat (post-MVP).

### Paywall

The screen pitching Coin Packs and VIP. VIP subscription is **post-MVP** (deferred
to RevenueCat).

### VIP

A subscription tier (ad-free / bundled unlocks). Post-MVP; not wired.
