# 0002 — EAS Build + EAS Update as the deployment spine

- Status: Accepted
- Date: 2026-06-11

## Context

The app is a **managed-workflow** Expo project (no `android/` or `ios/` dirs) that
uses native modules incompatible with Expo Go: `react-native-video` v6,
`@mux/mux-data-react-native-video`, `react-native-reanimated`, `expo-secure-store`,
Sentry native. Therefore Expo Go **cannot run this app** — it loads then crashes on
the video player. (The README previously instructed "press `s` for Expo Go", which
is wrong for this app.)

Day-to-day serving was done via `npx expo start --tunnel`, which depends on
`@expo/ngrok`. That package ships ngrok v2, which ngrok's service now rejects
(`ERR_NGROK_121`). To keep tunnel working, the repo carries a postinstall hack
(`scripts/apply-ngrok-v3.js` + `patches/@expo+ngrok+4.1.3.patch` + a vendored ngrok
binary). This is ongoing maintenance burden for a *dev-serving* mechanism.

Two needs were conflated: (1) clients installing the app, (2) the developer
iterating. They have different right tools.

## Decision

Adopt **EAS Build + EAS Update** as the primary spine:

1. **Client distribution** → EAS **preview** build per brand (matrix already in
   `eas.json`), distributed internally (TestFlight internal testers / Android
   internal track / direct APK link). Self-contained; connects to nothing local.
2. **Developer iteration** → build a **dev client** once, then ship JS-only changes
   **over-the-air via `eas update`**. No Metro server, no QR, no tunnel, no ngrok.
3. **Native dep changes** → occasional dev-client rebuild.
4. **Local Metro + LAN / tunnel** → demoted to *fallback* for the fast inner loop on
   a friendly network. The ngrok hack is kept only as a last resort, no longer the
   primary path.

## Consequences

- The "can't serve on my phone" pain is removed for normal (JS) work — OTA updates
  bypass the network/tunnel problem entirely.
- README and INFRASTRUCTURE-STATUS must stop recommending Expo Go and tunnel as the
  primary path.
- Requires an Expo/EAS account with Build + Update enabled; updates must target the
  matching runtime/channel as the installed build.
- The ngrok postinstall hack becomes optional/removable once the team stops relying
  on tunnel; leaving it in is harmless but should be labelled "fallback only".

## Alternatives considered

- **Keep tunnel as primary** — rejected. Fragile (ngrok v2/v3 churn), blocked on
  corporate networks, and irrelevant to how clients receive the app.
- **Eject to bare workflow** — rejected. Loses managed-workflow + EAS convenience for
  no MVP benefit.
