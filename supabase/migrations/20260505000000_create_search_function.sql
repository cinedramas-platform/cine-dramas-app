-- CD-24: Full-text search function for catalog-search edge function.
-- Uses the existing series_search_vector() immutable wrapper and GIN index.
-- Returns SETOF series so RLS tenant isolation applies automatically.

CREATE OR REPLACE FUNCTION public.search_series(search_query text)
RETURNS SETOF public.series
LANGUAGE sql STABLE
AS $$
  SELECT s.*
  FROM public.series s
  WHERE s.status = 'published'
    AND public.series_search_vector(s.title, COALESCE(s.description, ''), s.tags)
        @@ websearch_to_tsquery('english', search_query)
  ORDER BY ts_rank(
    public.series_search_vector(s.title, COALESCE(s.description, ''), s.tags),
    websearch_to_tsquery('english', search_query)
  ) DESC
  LIMIT 50;
$$;
