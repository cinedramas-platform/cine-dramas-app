export type EntitlementTier = 'free' | 'premium' | 'vip';

export interface Entitlement {
  id: string;
  tenant_id: string;
  user_id: string;
  tier: EntitlementTier;
  expires_at: string | null;
  revenuecat_subscriber_id: string | null;
  store_product_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface EntitlementResponse {
  tier: EntitlementTier;
  expires_at: string | null;
  is_active: boolean;
}

export interface RevenueCatWebhookEvent {
  api_version: string;
  event: {
    id: string;
    type: string;
    app_user_id: string;
    product_id: string;
    entitlement_ids: string[];
    store: string;
    environment: string;
    expiration_at_ms: number | null;
    original_app_user_id: string;
    [key: string]: unknown;
  };
}
