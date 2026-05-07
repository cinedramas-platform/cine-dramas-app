import { createClient } from '@supabase/supabase-js';
import { jsonResponse, errorResponse } from '../_shared/response.ts';

const GRANT_EVENTS = new Set([
  'INITIAL_PURCHASE',
  'RENEWAL',
  'PRODUCT_CHANGE',
  'UNCANCELLATION',
]);
const REVOKE_EVENTS = new Set([
  'CANCELLATION',
  'EXPIRATION',
  'BILLING_ISSUE',
]);

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return errorResponse('Method not allowed', 405);
  }

  const authHeader = req.headers.get('Authorization');
  const webhookSecret = Deno.env.get('REVENUECAT_WEBHOOK_SECRET');
  if (!webhookSecret || authHeader !== `Bearer ${webhookSecret}`) {
    return errorResponse('Unauthorized', 401);
  }

  let payload: RevenueCatWebhook;
  try {
    payload = await req.json();
  } catch {
    return errorResponse('Invalid JSON payload', 400);
  }

  const event = payload.event;
  if (!event?.id || !event?.type) {
    return errorResponse('Missing event id or type', 400);
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  const { data: existing } = await supabase
    .from('webhook_events')
    .select('id')
    .eq('idempotency_key', event.id)
    .maybeSingle();

  if (existing) {
    return jsonResponse({ status: 'already_processed' });
  }

  const appUserId = event.app_user_id;
  const productId = event.product_id ?? null;
  const expiresAtMs = event.expiration_at_ms;

  const { data: userRow } = await supabase
    .from('users')
    .select('id, tenant_id')
    .eq('auth_id', appUserId)
    .maybeSingle();

  const tenantId = userRow?.tenant_id ?? 'unknown';
  let errorMessage: string | null = null;

  if (!userRow) {
    errorMessage = `No user found for app_user_id: ${appUserId}`;
  } else if (GRANT_EVENTS.has(event.type)) {
    try {
      await grantEntitlement(supabase, {
        userId: userRow.id,
        tenantId: userRow.tenant_id,
        subscriberId: appUserId,
        productId,
        expiresAt: expiresAtMs
          ? new Date(expiresAtMs).toISOString()
          : null,
      });
    } catch (err) {
      errorMessage =
        err instanceof Error ? err.message : 'Unknown error granting entitlement';
    }
  } else if (REVOKE_EVENTS.has(event.type)) {
    try {
      await revokeEntitlement(supabase, userRow.id, userRow.tenant_id);
    } catch (err) {
      errorMessage =
        err instanceof Error ? err.message : 'Unknown error revoking entitlement';
    }
  }

  await supabase.from('webhook_events').insert({
    tenant_id: tenantId,
    source: 'revenuecat',
    event_type: event.type,
    payload,
    idempotency_key: event.id,
    processed_at: new Date().toISOString(),
    error_message: errorMessage,
  });

  return jsonResponse({ status: errorMessage ? 'error' : 'processed' });
});

// --- Types ---

interface RevenueCatWebhook {
  api_version: string;
  event: {
    id: string;
    type: string;
    app_user_id: string;
    product_id?: string;
    entitlement_ids?: string[];
    store?: string;
    environment?: string;
    expiration_at_ms?: number | null;
    original_app_user_id?: string;
    [key: string]: unknown;
  };
}

// --- Entitlement operations ---

async function grantEntitlement(
  supabase: ReturnType<typeof createClient>,
  opts: {
    userId: string;
    tenantId: string;
    subscriberId: string;
    productId: string | null;
    expiresAt: string | null;
  },
): Promise<void> {
  const { error } = await supabase
    .from('entitlements')
    .upsert(
      {
        tenant_id: opts.tenantId,
        user_id: opts.userId,
        tier: 'premium',
        revenuecat_subscriber_id: opts.subscriberId,
        store_product_id: opts.productId,
        expires_at: opts.expiresAt,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'tenant_id,user_id' },
    );

  if (error) throw new Error(`Failed to grant entitlement: ${error.message}`);
}

async function revokeEntitlement(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  tenantId: string,
): Promise<void> {
  const { error } = await supabase
    .from('entitlements')
    .upsert(
      {
        tenant_id: tenantId,
        user_id: userId,
        tier: 'free',
        expires_at: null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'tenant_id,user_id' },
    );

  if (error) throw new Error(`Failed to revoke entitlement: ${error.message}`);
}
