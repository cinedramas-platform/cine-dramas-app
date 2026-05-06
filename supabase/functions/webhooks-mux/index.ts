import { createClient } from '@supabase/supabase-js';
import { jsonResponse, errorResponse } from '../_shared/response.ts';

const TIMESTAMP_TOLERANCE_SEC = 300;

Deno.serve(async (req) => {
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

  const signatureValid = await verifyMuxSignature(
    rawBody,
    signatureHeader,
    webhookSecret,
  );
  if (!signatureValid) {
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
    return jsonResponse({ status: 'already_processed' });
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

  const { data: episode, error: episodeError } = await supabase
    .from('episodes')
    .select('id, tenant_id')
    .eq('mux_asset_id', assetId)
    .maybeSingle();

  if (episodeError) {
    return errorResponse('Internal error', 500);
  }

  const tenantId = episode?.tenant_id ?? 'unknown';
  let errorMessage: string | null = null;

  if (!episode) {
    errorMessage = `No episode found for mux_asset_id: ${assetId}`;
  } else {
    try {
      if (eventType === 'video.asset.ready') {
        await processAssetReady(supabase, episode.id, event.data);
      } else if (eventType === 'video.asset.errored') {
        await processAssetErrored(supabase, episode.id);
      }
    } catch (err) {
      errorMessage =
        err instanceof Error ? err.message : 'Unknown processing error';
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
  const mac = await crypto.subtle.sign(
    'HMAC',
    key,
    encoder.encode(signedPayload),
  );
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
  const playbackId = data.playback_ids?.[0]?.id;
  const duration =
    typeof data.duration === 'number' ? Math.round(data.duration) : null;

  const update: Record<string, unknown> = {
    mux_asset_status: 'ready',
    updated_at: new Date().toISOString(),
  };
  if (playbackId) update.mux_playback_id = playbackId;
  if (duration !== null) update.duration_seconds = duration;

  const { error } = await supabase
    .from('episodes')
    .update(update)
    .eq('id', episodeId);

  if (error) throw new Error(`Failed to update episode: ${error.message}`);
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
