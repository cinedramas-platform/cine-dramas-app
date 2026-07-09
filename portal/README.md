# Producer Portal

The standalone back-office CRM for producers — served at **cinedramas.com/admin**
(the `/admin/` base path is baked in via `vite.config.ts`). Completely separate
from the consumer apps: no portal code ships in any app bundle. It shares only
the backend (Supabase + RLS + edge functions + Mux).

## What it does (MVP)

- **Content** — the tenant's catalog: series, seasons, episodes with Mux asset
  status, duration, and coin pricing. Read-only for now.
- **Upload** — drag-and-drop episode upload via Mux Direct Upload. Creates a
  draft episode, uploads straight from the browser to Mux, and the episode goes
  live in the consumer app automatically when Mux finishes encoding
  (`webhooks-mux` handles `video.asset.created` → `video.asset.ready`).
- **Analytics** — catalog counts today; Mux Data API metrics are the next step.

White-label: after login the portal fetches the tenant's config (same `config`
edge function the apps use) and brands itself — tenant name + accent color.

## Development

```bash
cd portal
npm install
npm run dev        # http://localhost:5173/admin/
```

By default it points at the `cinedramas-dev` Supabase project (anon keys are
public by design). Override with `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY`
in `portal/.env` for another environment.

## Backend requirements

The upload flow needs the `mux-direct-upload` edge function deployed and three
secrets set on the Supabase project:

```bash
supabase secrets set MUX_TOKEN_ID=... MUX_TOKEN_SECRET=...       # Mux API access token
supabase secrets set PORTAL_PRODUCER_EMAILS=you@example.com      # comma-separated allowlist
supabase functions deploy mux-direct-upload
supabase functions deploy webhooks-mux                           # picks up video.asset.created
```

Also make sure the Mux webhook (Mux dashboard → Settings → Webhooks) is
subscribed to `video.asset.created`, `video.asset.ready`, and
`video.asset.errored`.

**Access model:** any authenticated user of the tenant can *view* the portal
(reads go through the same RLS as the apps), but uploads are rejected
server-side unless the account email is in `PORTAL_PRODUCER_EMAILS` (fails
closed if unset). A proper `role` column on `users` is the planned replacement
— coordinate as a migration.

## Deploying the portal

`npm run build` produces static files in `portal/dist/` with all URLs under
`/admin/`. Host them anywhere static (Vercel, Netlify, Cloudflare Pages, EAS
Hosting) and route `cinedramas.com/admin/*` to it via a rewrite/proxy on
whatever serves the apex domain.
