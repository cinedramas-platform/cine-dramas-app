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
supabase secrets set "${secrets[@]}" --project-ref "$PROJECT_REF"

echo "==> Deploying portal edge functions"
for fn in mux-direct-upload catalog-admin mux-analytics webhooks-mux; do
  supabase functions deploy "$fn" --project-ref "$PROJECT_REF"
done

echo "==> Done. Remaining manual steps:"
echo "    - Subscribe Mux webhook to video.asset.created"
echo "    - supabase db push (role migration), then promote producer accounts:"
echo "      UPDATE public.users SET role = 'producer' WHERE email = '…';"
