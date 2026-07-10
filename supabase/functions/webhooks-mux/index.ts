import { createClient } from '@supabase/supabase-js';
import { jsonResponse, errorResponse } from '../_shared/response.ts';
import { serve } from '../_shared/logger.ts';

const TIMESTAMP_TOLERANCE_SEC = 300;

serve('webhooks-mux', async (req, log) => {
  if (req.method !== 'POST') {
    return errorResponse('Method not allowed', 405);
  }

  const webhookSecret = Deno.env.get('MUX_WEBHOOK_SECRET');
  if (!webhookSecret) {
    return errorResponse('Webhook processing unavailable', 500);
  }

  const rawBody = await req.text();

  const signatureHeader = req.headers.get('mux-signature');
  if (!signatureHeader) {
    return errorResponse('Missing mux-signature header', 401);
  }

  const signatureValid = await verifyMuxSignature(rawBody, signatureHeader, webhookSecret);
  if (!signatureValid) {
    log.warn('mux webhook signature verification failed');
    return errorResponse('Invalid signature', 401);
  }

  let event: MuxWebhookEvent;
  try {
    event = JSON.parse(rawBody);
  } catch {
    return errorResponse('Invalid JSON payload', 400);
  }

  const eventId = event.id;
  const eventType = event.type;
  if (!eventId || !eventType) {
    return errorResponse('Missing event id or type', 400);
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  const { data: existing } = await supabase
    .from('webhook_events')
    .select('id')
    .eq('idempotency_key', eventId)
    .maybeSingle();

  if (existing) {
    log.info('mux webhook duplicate event ignored', { event_type: eventType });
    return jsonResponse({ status: 'already_processed' });
  }

  // Portal direct uploads: the asset's passthrough carries the episode id the
  // upload was created for. Attach the asset here so the ready/errored events
  // below can find the episode by mux_asset_id.
  if (eventType === 'video.asset.created') {
    const passthrough = typeof event.data?.passthrough === 'string' ? event.data.passthrough : null;
    let tenantId = 'unknown';
    let errorMessage: string | null = null;

    if (passthrough) {
      const { data: episode, error: updateError } = await supabase
        .from('episodes')
        .update({
          mux_asset_id: event.data.id,
          mux_asset_status: 'preparing',
          updated_at: new Date().toISOString(),
        })
        .eq('id', passthrough)
        .select('tenant_id')
        .maybeSingle();
      if (updateError) {
        errorMessage = updateError.message;
      } else if (episode) {
        tenantId = episode.tenant_id as string;
      }
      // No matching episode is fine — assets can be created outside the portal.
    }

    await insertWebhookEvent(supabase, {
      tenant_id: tenantId,
      source: 'mux',
      event_type: eventType,
      payload: event,
      idempotency_key: eventId,
      processed_at: new Date().toISOString(),
      error_message: errorMessage,
    });
    log.info('mux asset created', { attached: tenantId !== 'unknown' });
    return jsonResponse({ status: errorMessage ? 'error' : 'processed' });
  }

  const supportedEvents = ['video.asset.ready', 'video.asset.errored'];
  if (!supportedEvents.includes(eventType)) {
    await insertWebhookEvent(supabase, {
      tenant_id: 'unknown',
      source: 'mux',
      event_type: eventType,
      payload: event,
      idempotency_key: eventId,
      processed_at: new Date().toISOString(),
    });
    return jsonResponse({ status: 'ignored', event_type: eventType });
  }

  const assetId = event.data?.id;
  if (!assetId) {
    return errorResponse('Missing asset ID in event data', 400);
  }

  // Multiple episodes can legitimately share a Mux asset (the demo catalog
  // reuses assets across series), so this must not assume a single row.
  let { data: episodes, error: episodeError } = await supabase
    .from('episodes')
    .select('id, tenant_id')
    .eq('mux_asset_id', assetId);

  if (episodeError) {
    return errorResponse('Internal error', 500);
  }

  // Mux does not guarantee event ordering: ready can arrive before the
  // asset.created handler above has attached mux_asset_id. The asset's
  // passthrough carries the episode id (portal uploads), so recover through
  // it — otherwise this event would be marked processed and never retried,
  // leaving the episode stuck in 'pending'.
  if ((!episodes || episodes.length === 0) && typeof event.data?.passthrough === 'string') {
    const { data: byPassthrough } = await supabase
      .from('episodes')
      .select('id, tenant_id')
      .eq('id', event.data.passthrough)
      .maybeSingle();
    if (byPassthrough) {
      await supabase
        .from('episodes')
        .update({ mux_asset_id: assetId, updated_at: new Date().toISOString() })
        .eq('id', byPassthrough.id);
      episodes = [byPassthrough];
    }
  }

  const tenantId = episodes?.[0]?.tenant_id ?? 'unknown';
  let errorMessage: string | null = null;

  if (!episodes || episodes.length === 0) {
    errorMessage = `No episode found for mux_asset_id: ${assetId}`;
  } else {
    try {
      for (const episode of episodes) {
        if (eventType === 'video.asset.ready') {
          await processAssetReady(supabase, episode.id, event.data);
        } else if (eventType === 'video.asset.errored') {
          await processAssetErrored(supabase, episode.id);
        }
      }
    } catch (err) {
      errorMessage = err instanceof Error ? err.message : 'Unknown processing error';
    }
  }

  await insertWebhookEvent(supabase, {
    tenant_id: tenantId,
    source: 'mux',
    event_type: eventType,
    payload: event,
    idempotency_key: eventId,
    processed_at: new Date().toISOString(),
    error_message: errorMessage,
  });

  if (errorMessage) {
    log.error('mux webhook processing failed', {
      event_type: eventType,
      error: errorMessage,
    });
  } else {
    log.info('mux webhook processed', { event_type: eventType });
  }

  return jsonResponse({ status: errorMessage ? 'error' : 'processed' });
});

// --- Types ---

interface MuxWebhookEvent {
  id: string;
  type: string;
  created_at: string;
  data: {
    id: string;
    status: string;
    playback_ids?: { id: string; policy: string }[];
    duration?: number;
    errors?: { type: string; message: string }[];
    [key: string]: unknown;
  };
}

// --- Signature verification ---

async function verifyMuxSignature(
  rawBody: string,
  signatureHeader: string,
  secret: string,
): Promise<boolean> {
  const parts = signatureHeader.split(',');
  let timestamp: string | undefined;
  const signatures: string[] = [];

  for (const part of parts) {
    const [key, ...rest] = part.split('=');
    const value = rest.join('=');
    if (key.trim() === 't') timestamp = value.trim();
    if (key.trim() === 'v1') signatures.push(value.trim());
  }

  if (!timestamp || signatures.length === 0) return false;

  const timestampSec = parseInt(timestamp, 10);
  if (isNaN(timestampSec)) return false;

  const nowSec = Math.floor(Date.now() / 1000);
  if (Math.abs(nowSec - timestampSec) > TIMESTAMP_TOLERANCE_SEC) return false;

  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );

  const signedPayload = `${timestamp}.${rawBody}`;
  const mac = await crypto.subtle.sign('HMAC', key, encoder.encode(signedPayload));
  const computedHex = Array.from(new Uint8Array(mac))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');

  return signatures.some((sig) => timingSafeEqual(computedHex, sig));
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

// --- Event processors ---

async function processAssetReady(
  supabase: ReturnType<typeof createClient>,
  episodeId: string,
  data: MuxWebhookEvent['data'],
): Promise<void> {
  const playbackIds = data.playback_ids ?? [];
  // Public id → thumbnails/images. Signed id → gated video streaming.
  const publicId = playbackIds.find((p) => p.policy === 'public')?.id ?? playbackIds[0]?.id;
  let signedId = playbackIds.find((p) => p.policy === 'signed')?.id;

  // No signed playback id yet — create one so the episode can be gated
  // (playback-token signs this id; without it new content would stream freely).
  if (!signedId) {
    signedId = await createSignedPlaybackId(data.id);
  }

  const duration = typeof data.duration === 'number' ? Math.round(data.duration) : null;

  const update: Record<string, unknown> = {
    mux_asset_status: 'ready',
    updated_at: new Date().toISOString(),
  };
  if (publicId) update.mux_playback_id = publicId;
  if (signedId) update.mux_signed_playback_id = signedId;
  if (duration !== null) update.duration_seconds = duration;

  const { error } = await supabase.from('episodes').update(update).eq('id', episodeId);

  if (error) throw new Error(`Failed to update episode: ${error.message}`);
}

// Creates a signed playback id on the Mux asset via the Mux API.
async function createSignedPlaybackId(assetId: string): Promise<string> {
  const tokenId = Deno.env.get('MUX_TOKEN_ID');
  const tokenSecret = Deno.env.get('MUX_TOKEN_SECRET');
  if (!tokenId || !tokenSecret) {
    throw new Error('Mux API credentials not configured (MUX_TOKEN_ID/SECRET)');
  }

  const auth = btoa(`${tokenId}:${tokenSecret}`);
  const res = await fetch(`https://api.mux.com/video/v1/assets/${assetId}/playback-ids`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${auth}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ policy: 'signed' }),
  });

  if (!res.ok) {
    throw new Error(`Mux create signed playback id failed: ${res.status} ${await res.text()}`);
  }

  return (await res.json()).data.id as string;
}

async function processAssetErrored(
  supabase: ReturnType<typeof createClient>,
  episodeId: string,
): Promise<void> {
  const { error } = await supabase
    .from('episodes')
    .update({
      mux_asset_status: 'errored',
      updated_at: new Date().toISOString(),
    })
    .eq('id', episodeId);

  if (error) throw new Error(`Failed to update episode: ${error.message}`);
}

// --- Helpers ---

async function insertWebhookEvent(
  supabase: ReturnType<typeof createClient>,
  event: {
    tenant_id: string;
    source: string;
    event_type: string;
    payload: unknown;
    idempotency_key: string;
    processed_at: string;
    error_message?: string | null;
  },
): Promise<void> {
  await supabase.from('webhook_events').insert(event);
}
