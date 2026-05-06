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

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: authHeader } } },
  );

  const seriesFields =
    'id, title, description, thumbnail_playback_id, category, tags, is_featured, sort_order';

  const [tenantResult, featuredResult, allSeriesResult] = await Promise.all([
    supabase.from('tenants').select('home_rails_order').single(),
    supabase
      .from('series')
      .select(seriesFields)
      .eq('status', 'published')
      .eq('is_featured', true)
      .order('sort_order', { ascending: true }),
    supabase
      .from('series')
      .select(seriesFields)
      .eq('status', 'published')
      .order('sort_order', { ascending: true }),
  ]);

  if (featuredResult.error || allSeriesResult.error) {
    const msg = featuredResult.error?.message ?? allSeriesResult.error?.message;
    return errorResponse(msg ?? 'Failed to load catalog', 500);
  }

  const categories: Record<string, unknown[]> = {};
  for (const series of allSeriesResult.data ?? []) {
    const cat = series.category;
    if (!categories[cat]) categories[cat] = [];
    categories[cat].push(series);
  }

  return jsonResponse(
    {
      featured: featuredResult.data ?? [],
      categories,
      rails_order: tenantResult.data?.home_rails_order ?? [
        'featured',
        'categories',
      ],
    },
    { cacheTtl: 300 },
  );
});
