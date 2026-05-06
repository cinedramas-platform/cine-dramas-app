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
  const id = url.searchParams.get('id');
  if (!id) {
    return errorResponse('Missing required parameter: id');
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: authHeader } } },
  );

  const { data, error } = await supabase
    .from('series')
    .select(`
      id, title, description, thumbnail_playback_id, category, tags,
      is_featured, sort_order, created_at,
      seasons (
        id, number, title, created_at,
        episodes (
          id, title, description, mux_playback_id, mux_asset_status,
          duration_seconds, order, is_free, thumbnail_time, created_at
        )
      )
    `)
    .eq('id', id)
    .eq('status', 'published')
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return errorResponse('Series not found', 404);
    }
    return errorResponse(error.message, 500);
  }

  if (data?.seasons) {
    data.seasons.sort(
      (a: { number: number }, b: { number: number }) => a.number - b.number,
    );
    for (const season of data.seasons) {
      season.episodes?.sort(
        (a: { order: number }, b: { order: number }) => a.order - b.order,
      );
    }
  }

  return jsonResponse(data, { cacheTtl: 300 });
});
