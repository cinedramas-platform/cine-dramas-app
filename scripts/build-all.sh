#!/usr/bin/env bash
# T3.03 — Build every brand variant through EAS.
#
# Reads the brand registry (brands/index.js) so the matrix stays in sync with
# the brands that actually exist, maps each variant to its eas.json profile,
# and kicks off an EAS build per variant. The `default` brand uses the bare
# profile name (e.g. `production`); every other brand uses `<variant>-<kind>`
# (e.g. `clientA-production`), matching the profiles defined in eas.json.
#
# Usage:
#   scripts/build-all.sh [kind] [platform]
#     kind      production | preview   (default: production)
#     platform  all | ios | android    (default: all)
#
# Requires: eas-cli logged in (EXPO_TOKEN in CI), profiles present in eas.json.
set -euo pipefail

KIND="${1:-production}"
PLATFORM="${2:-all}"

case "$KIND" in
  production | preview) ;;
  *)
    echo "Error: kind must be 'production' or 'preview' (got '$KIND')" >&2
    exit 1
    ;;
esac

# Pull variant keys straight from the registry — single source of truth.
VARIANTS=$(node -e "console.log(Object.keys(require('./brands/index.js')).join(' '))")

echo "Building [$KIND / $PLATFORM] for variants: $VARIANTS"

for VARIANT in $VARIANTS; do
  if [ "$VARIANT" = "default" ]; then
    PROFILE="$KIND"
  else
    PROFILE="$VARIANT-$KIND"
  fi

  echo ""
  echo "==> $VARIANT  (profile: $PROFILE)"
  eas build \
    --non-interactive \
    --no-wait \
    --platform "$PLATFORM" \
    --profile "$PROFILE"
done

echo ""
echo "All variant builds queued."
