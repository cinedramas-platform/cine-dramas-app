import { jsonResponse, errorResponse } from '../_shared/response.ts';
import { serve } from '../_shared/logger.ts';
import { requireProducer } from '../_shared/producer.ts';

// POST /mux-direct-upload  body: { seasonId, title, description?, isFree?, coinCost? }
//
// Producer-only. Creates a draft episode row and a Mux direct upload whose
// passthrough carries the episode id. webhooks-mux picks it up from there:
// video.asset.created attaches the asset to the episode, video.asset.ready
// publishes it (playback ids + duration + signed playback id).
//
// Required secrets: MUX_TOKEN_ID, MUX_TOKEN_SECRET, PORTAL_PRODUCER_EMAILS
// (comma-separated allowlist; uploads are denied if unset — fail closed).

serve('mux-direct-upload', async (req, log) => {
  const gate = await requireProducer(req, log);
  if (!gate.ok) return gate.response;
  const { tenantId, supabase, service } = gate;

  const muxTokenId = Deno.env.get('MUX_TOKEN_ID');
  const muxTokenSecret = Deno.env.get('MUX_TOKEN_SECRET');
  if (!muxTokenId || !muxTokenSecret) {
    log.error('MUX_TOKEN_ID / MUX_TOKEN_SECRET not configured');
    return errorResponse('Upload service unavailable', 500);
  }

  let body: {
    seasonId?: unknown;
    title?: unknown;
    description?: unknown;
    isFree?: unknown;
    coinCost?: unknown;
  };
  try {
    body = await req.json();
  } catch {
    return errorResponse('Invalid JSON body');
  }

  const { seasonId, title } = body;
  if (typeof seasonId !== 'string' || !seasonId) {
    return errorResponse('seasonId is required');
  }
  if (typeof title !== 'string' || !title.trim()) {
    return errorResponse('title is required');
  }
  const description = typeof body.description === 'string' ? body.description : null;
  const isFree = body.isFree === true;
  // Reject bad prices instead of silently substituting the default — a
  // producer must never discover their typed price was discarded.
  let coinCost = 80;
  if (body.coinCost !== undefined) {
    if (
      typeof body.coinCost !== 'number' ||
      !Number.isInteger(body.coinCost) ||
      body.coinCost < 0
    ) {
      return errorResponse('coinCost must be a non-negative whole number');
    }
    coinCost = body.coinCost;
  }

  // Season lookup through the RLS-scoped client: cross-tenant ids come back
  // as not-found, so tenant isolation is enforced by the database.
  const { data: season, error: seasonError } = await supabase
    .from('seasons')
    .select('id, series_id')
    .eq('id', seasonId)
    .maybeSingle();
  if (seasonError) {
    log.error('season lookup failed', { error: seasonError.message });
    return errorResponse('Internal error', 500);
  }
  if (!season) {
    return errorResponse('Season not found', 404);
  }

  const { data: lastEpisode } = await service
    .from('episodes')
    .select('"order"')
    .eq('season_id', seasonId)
    .order('order', { ascending: false })
    .limit(1)
    .maybeSingle();
  const nextOrder = ((lastEpisode?.order as number) ?? 0) + 1;

  const { data: episode, error: insertError } = await service
    .from('episodes')
    .insert({
      tenant_id: tenantId,
      season_id: seasonId,
      title: title.trim(),
      description,
      order: nextOrder,
      is_free: isFree,
      coin_cost: coinCost,
      mux_asset_status: 'pending',
    })
    .select('id')
    .single();
  if (insertError || !episode) {
    log.error('episode insert failed', { error: insertError?.message });
    return errorResponse('Could not create episode', 500);
  }

  const uploadRes = await fetch('https://api.mux.com/video/v1/uploads', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Basic ${btoa(`${muxTokenId}:${muxTokenSecret}`)}`,
    },
    body: JSON.stringify({
      cors_origin: Deno.env.get('PORTAL_CORS_ORIGIN') ?? '*',
      new_asset_settings: {
        playback_policy: ['public', 'signed'],
        passthrough: episode.id,
      },
    }),
  });

  if (!uploadRes.ok) {
    const detail = await uploadRes.text();
    log.error('mux upload creation failed', { status: uploadRes.status, detail });
    // Roll back the draft row so failed attempts don't litter the catalog.
    await service.from('episodes').delete().eq('id', episode.id);
    return errorResponse('Could not create Mux upload', 502);
  }

  const upload = (await uploadRes.json()) as { data: { id: string; url: string } };
  log.info('direct upload created', { episode_id: episode.id, upload_id: upload.data.id });

  return jsonResponse({
    episodeId: episode.id,
    uploadId: upload.data.id,
    uploadUrl: upload.data.url,
  });
});
