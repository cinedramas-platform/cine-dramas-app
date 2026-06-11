# 0003 — Mock coin economy for MVP (RevenueCat deferred)

- Status: Accepted
- Date: 2026-06-11

## Context

The product monetizes via a coin economy: Viewers spend Coins to Unlock Episodes and
earn/buy Coins (Daily Check-in, ad-reward, Coin Packs). `react-native-purchases`
(RevenueCat) is a dependency but **not wired** — `coins-grant` is an explicit mock
top-up endpoint, and the paywall has `TODO(revenuecat)` markers. VIP subscription is
not implemented.

The MVP goal is an **installable build for Producers to try** (internal distribution,
not a public store listing). The pitch is the *mechanic and retention loop*, not a
live transaction.

## Decision

For MVP, Coins are **mock**. Clicking a Coin Pack grants Coins with no payment;
Daily Check-in and ad-reward grant Coins for free. Distribution is **EAS preview /
internal**, not an App Store / Play Store submission. Real RevenueCat IAP + VIP are
post-MVP and become the "phase 2 plugs in here" talking point to the Producer.

## Consequences

- The full loop (earn → spend → unlock → watch) is demoable now without store setup,
  receipts, or review.
- The build **must not** be submitted to the App Store with mock purchase buttons —
  Apple rejects fake IAP. MVP stays on internal/ad-hoc distribution.
- When RevenueCat lands: real purchases must be driven by a verified store receipt /
  RevenueCat webhook, never a client call (see the TODO in `coins-grant`).

## Alternatives considered

- **Wire real RevenueCat for MVP** — rejected. Weeks of store/product/sandbox/review
  work that blocks a quick installable demo and isn't needed to prove the loop.
