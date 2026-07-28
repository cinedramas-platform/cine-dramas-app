#!/usr/bin/env bash
# One-shot deploy of everything the Producer Portal needs on the Supabase side.
# Run from the repo root, on the dev branch (per team workflow: deploys only
# from dev after merge).
#
# Required env:
#   SUPABASE_ACCESS_TOKEN   personal access token (sbp_…)
#   MUX_TOKEN_ID            Mux API access token id (UUID)
#   MUX_TOKEN_SECRET        Mux API access token secret
# Optional env:
#   PORTAL_PRODUCER_EMAILS  fallback producer allowlist (comma-separated);
#                           prefer UPDATE public.users SET role='producer'
#   PROJECT_REF             Supabase project ref (default: cinedramas-dev)
#
# Manual follow-ups this script cannot do:
#   1. Mux Dashboard → Settings → Webhooks: subscribe the existing endpoint to
#      video.asset.created (alongside video.asset.ready / errored).
#   2. Apply the role migration if db push is skipped:
#      supabase db push   (or run 20260709150000_add_user_role.sql in SQL editor)

set -euo pipefail

PROJECT_REF="${PROJECT_REF:-kkjjbjrebeoekindsihw}"

: "${SUPABASE_ACCESS_TOKEN:?Set SUPABASE_ACCESS_TOKEN (sbp_…)}"
: "${MUX_TOKEN_ID:?Set MUX_TOKEN_ID}"
: "${MUX_TOKEN_SECRET:?Set MUX_TOKEN_SECRET}"

echo "==> Setting function secrets on ${PROJECT_REF}"
secrets=(
  "MUX_TOKEN_ID=${MUX_TOKEN_ID}"
  "MUX_TOKEN_SECRET=${MUX_TOKEN_SECRET}"
)
if [[ -n "${PORTAL_PRODUCER_EMAILS:-}" ]]; then
  secrets+=("PORTAL_PRODUCER_EMAILS=${PORTAL_PRODUCER_EMAILS}")
fi
if [[ -n "${MUX_WEBHOOK_SECRET:-}" ]]; then
  secrets+=("MUX_WEBHOOK_SECRET=${MUX_WEBHOOK_SECRET}")
else
  echo "    ! MUX_WEBHOOK_SECRET not provided — webhooks-mux will answer 500"
  echo "      until it is set (Mux dashboard → Settings → Webhooks → signing secret)."
fi
supabase secrets set "${secrets[@]}" --project-ref "$PROJECT_REF"

echo "==> Deploying producer-gated portal functions"
for fn in mux-direct-upload catalog-admin mux-analytics; do
  supabase functions deploy "$fn" --project-ref "$PROJECT_REF"
done

# Mux cannot send a Supabase JWT, so the gateway check must be off for this one
# (see [functions.webhooks-mux] in supabase/config.toml). Without the flag the
# gateway answers 401 before the handler runs and no upload ever goes live.
echo "==> Deploying webhooks-mux (JWT verification disabled — HMAC-verified inside)"
supabase functions deploy webhooks-mux --project-ref "$PROJECT_REF" --no-verify-jwt

echo "==> Verifying webhook endpoint is reachable without a JWT"
code=$(curl -s -o /dev/null -w "%{http_code}" -X POST \
  "https://${PROJECT_REF}.supabase.co/functions/v1/webhooks-mux" \
  -H "Content-Type: application/json" -d '{}')
case "$code" in
  401) echo "    FAIL: still 401 — the gateway is rejecting Mux. Check --no-verify-jwt." ;;
  500) echo "    Reachable, but MUX_WEBHOOK_SECRET is unset (500)." ;;
  *)   echo "    Reachable (HTTP $code — signature rejection is expected for this probe)." ;;
esac

echo "==> Done. Remaining manual steps:"
echo "    - Mux dashboard → Settings → Webhooks → create a webhook pointing at:"
echo "      https://${PROJECT_REF}.supabase.co/functions/v1/webhooks-mux"
echo "      (Mux sends ALL event types; the handler filters. Copy its signing"
echo "       secret into MUX_WEBHOOK_SECRET and re-run this script.)"
echo "    - supabase db push (role migration), then promote producer accounts:"
echo "      UPDATE public.users SET role = 'producer' WHERE email = '…';"
