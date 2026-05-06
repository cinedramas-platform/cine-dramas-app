import { createClient } from '@supabase/supabase-js';
import { handleCorsPreflightRequest } from '../_shared/cors.ts';
import { jsonResponse, errorResponse } from '../_shared/response.ts';

const CACHE_TTL = 600;

Deno.serve(async (req) => {
  const corsResponse = handleCorsPreflightRequest(req);
  if (corsResponse) return corsResponse;

  if (req.method !== 'GET') {
    return errorResponse('Method not allowed', 405);
  }

  const url = new URL(req.url);
  const tenantId = url.searchParams.get('tenantId');
  if (!tenantId) {
    return errorResponse('Missing required parameter: tenantId');
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  const { data: tenant, error } = await supabase
    .from('tenants')
    .select('name, theme_config, feature_flags, legal_urls, home_rails_order')
    .eq('id', tenantId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return errorResponse('Tenant not found', 404);
    }
    return errorResponse('Internal error', 500);
  }

  return jsonResponse(
    {
      tenant_id: tenantId,
      name: tenant.name,
      theme: tenant.theme_config,
      features: tenant.feature_flags,
      legal_urls: tenant.legal_urls,
      home_rails_order: tenant.home_rails_order,
    },
    { cacheTtl: CACHE_TTL },
  );
});
