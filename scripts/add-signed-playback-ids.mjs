// One-off: give each Mux asset a SIGNED playback id (for gated video) and store it
// in episodes.mux_signed_playback_id. The existing public id is left untouched for
// thumbnails. Idempotent: reuses an existing signed id, skips episodes already set.
//
// Run with env sourced from .env.local:
//   set -a && . ./.env.local && set +a && node scripts/add-signed-playback-ids.mjs
//
// Requires: SUPABASE service-role key + Mux token id/secret.
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const MUX_ID = process.env.MUX_TOKEN_ID;
const MUX_SECRET = process.env.MUX_TOKEN_SECRET;

if (!SUPABASE_URL || !SERVICE_KEY || !MUX_ID || !MUX_SECRET) {
  console.error(
    'Missing env: need EXPO_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, MUX_TOKEN_ID, MUX_TOKEN_SECRET',
  );
  process.exit(1);
}

const muxAuth = 'Basic ' + Buffer.from(`${MUX_ID}:${MUX_SECRET}`).toString('base64');
const supabase = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });

async function muxGet(path) {
  const res = await fetch(`https://api.mux.com${path}`, { headers: { Authorization: muxAuth } });
  if (!res.ok) throw new Error(`Mux GET ${path} -> ${res.status} ${await res.text()}`);
  return (await res.json()).data;
}

async function muxCreateSignedPlaybackId(assetId) {
  const res = await fetch(`https://api.mux.com/video/v1/assets/${assetId}/playback-ids`, {
    method: 'POST',
    headers: { Authorization: muxAuth, 'Content-Type': 'application/json' },
    body: JSON.stringify({ policy: 'signed' }),
  });
  if (!res.ok)
    throw new Error(`Mux POST playback-ids ${assetId} -> ${res.status} ${await res.text()}`);
  return (await res.json()).data.id;
}

async function signedPlaybackIdFor(assetId) {
  const asset = await muxGet(`/video/v1/assets/${assetId}`);
  const existing = (asset.playback_ids || []).find((p) => p.policy === 'signed');
  if (existing) return existing.id;
  return muxCreateSignedPlaybackId(assetId);
}

async function main() {
  const { data: episodes, error } = await supabase
    .from('episodes')
    .select('id, title, mux_asset_id, mux_signed_playback_id')
    .not('mux_asset_id', 'is', null);

  if (error) throw error;

  let created = 0,
    skipped = 0;
  for (const ep of episodes) {
    if (ep.mux_signed_playback_id) {
      skipped++;
      console.log(`skip   ${ep.title} (already has signed id)`);
      continue;
    }
    const signedId = await signedPlaybackIdFor(ep.mux_asset_id);
    const { error: upErr } = await supabase
      .from('episodes')
      .update({ mux_signed_playback_id: signedId })
      .eq('id', ep.id);
    if (upErr) throw upErr;
    created++;
    console.log(`set    ${ep.title} -> ${signedId}`);
  }

  console.log(`\nDone. ${created} set, ${skipped} skipped, ${episodes.length} total.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
