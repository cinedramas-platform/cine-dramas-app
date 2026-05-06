import { corsHeaders } from './cors.ts';

export function jsonResponse(
  data: unknown,
  { status = 200, cacheTtl }: { status?: number; cacheTtl?: number } = {},
): Response {
  const headers: Record<string, string> = {
    ...corsHeaders,
    'Content-Type': 'application/json',
  };

  if (cacheTtl && cacheTtl > 0) {
    const swr = Math.round(cacheTtl / 5);
    headers['Cache-Control'] =
      `public, max-age=${cacheTtl}, stale-while-revalidate=${swr}`;
  }

  return new Response(JSON.stringify(data), { status, headers });
}

export function errorResponse(
  message: string,
  status = 400,
): Response {
  return jsonResponse({ error: message }, { status });
}
