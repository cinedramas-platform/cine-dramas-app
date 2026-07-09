# Producer Portal

The standalone back-office web CRM for producers, served from its own URL.
Completely separate from the consumer apps: no portal code ships in any app
bundle. It shares only the backend (Supabase + RLS + edge functions + Mux).

## What it does (MVP)

- **Content** — the tenant's catalog: series, seasons, episodes with
  thumbnails, Mux asset status, duration, and coin pricing. Search and status
  filters; click an episode to watch it in-portal (public playback id via
  hls.js). Edit episode metadata/pricing and publish/feature series through
  the `catalog-admin` edge function.
- **Upload** — drag-and-drop episode upload via Mux Direct Upload. Creates a
  draft episode, uploads straight from the browser to Mux, and the episode goes
  live in the consumer app automatically when Mux finishes encoding
  (`webhooks-mux` handles `video.asset.created` → `video.asset.ready`).
- **Analytics** — catalog counts plus audience metrics (views and watch time,
  overall and per episode) proxied from the Mux Data API by the
  `mux-analytics` edge function.
- **New series** — create a draft series (with Season 1) from the Content
  page, so an empty client catalog can be onboarded entirely from the portal:
  create series → upload episodes → publish.

White-label: after login the portal fetches the tenant's config (same `config`
edge function the apps use) and brands itself — tenant name + accent color.

## Development

```bash
cd portal
npm install
npm run dev        # http://localhost:5173/
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
supabase functions deploy catalog-admin                          # portal edit/publish/create actions
supabase functions deploy mux-analytics                          # audience metrics (Mux Data)
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

`npm run build` produces static files in `portal/dist/`. Host them anywhere
static (Vercel, Netlify, Cloudflare Pages, EAS Hosting) on their own domain or
subdomain. If it ever needs to live under a sub-path (e.g. `example.com/admin`),
build with `PORTAL_BASE=/admin/`.
