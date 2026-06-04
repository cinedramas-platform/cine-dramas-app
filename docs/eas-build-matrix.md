# EAS Build Matrix (T3.03)

How CineDramas builds one app per brand from a single codebase.

## How it works

`APP_VARIANT` selects the active brand at build time (see `app.config.js`,
which reads `brands/index.js`). Each `eas.json` build profile pins an
`APP_VARIANT` in its `env`, so a profile == a brand + a release channel.

| Brand | Development | Preview | Production |
|-------|-------------|---------|------------|
| default | `development` | `preview` | `production` |
| clientA | `clientA-development` | `clientA-preview` | `clientA-production` |

Non-default profiles `extends` the matching default profile and only override
`APP_VARIANT` + `channel`, so shared settings live in one place.

## Building

```bash
# All variants, production, both platforms (reads variants from brands/index.js):
scripts/build-all.sh production all

# All variants, preview:
scripts/build-all.sh preview all

# A single variant:
eas build --profile clientA-production --platform all
```

CI (`.github/workflows/release.yml`) runs `build-all.sh` on every `v*` tag,
behind the protected `production` environment, then submits each production
build to the stores.

## Secrets

Per-brand **public** config (Supabase URL/anon key, Mux env key, Sentry project,
bundle IDs) lives in each `brands/<variant>/manifest.json` and is baked into the
build — not secret.

Build-time **secrets** are provided by the CI environment, not committed:

| Secret | Where | Used for |
|--------|-------|----------|
| `EXPO_TOKEN` | GitHub Actions secret | Authenticates `eas build` / `eas submit` |
| `SENTRY_AUTH_TOKEN` | GitHub Actions secret | Source-map upload (Sentry Expo plugin) |
| `SENTRY_ORG` | GitHub Actions secret / env | Source-map upload target org |

If a brand needs a build-time secret that differs per variant, create it scoped
in EAS (`eas secret:create --scope project --name <NAME>`) and reference it from
that brand's profile.
