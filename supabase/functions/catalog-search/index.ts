import { createClient } from '@supabase/supabase-js';
import { handleCorsPreflightRequest } from '../_shared/cors.ts';
import { jsonResponse, errorResponse } from '../_shared/response.ts';

Deno.serve(async (req) => {
  const corsResponse = handleCorsPreflightRequest(req);
  if (corsResponse) return corsResponse;

  if (req.method !== 'GET') {
    return errorResponse('Method not allowed', 405);
  }

  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    return errorResponse('Missing authorization header', 401);
  }

  const url = new URL(req.url);
  const query = url.searchParams.get('q')?.trim();
  if (!query || query.length < 2) {
    return errorResponse('Query parameter "q" must be at least 2 characters');
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: authHeader } } },
  );

  const { data, error } = await supabase.rpc('search_series', {
    search_query: query,
  });

  if (error) {
    return errorResponse(error.message, 500);
  }

  return jsonResponse(data ?? [], { cacheTtl: 60 });
});
