import { useQuery } from '@tanstack/react-query';
import { invokeFunction } from '@/services/api';
import { useDebounce } from '@/hooks/useDebounce';
import type { Series, SeriesDetail, FeaturedResponse, PaginatedResponse } from '@/types/catalog';

export function useFeatured() {
  return useQuery({
    queryKey: ['catalog', 'featured'],
    queryFn: () => invokeFunction<FeaturedResponse>('catalog-featured'),
    staleTime: 1000 * 60 * 5,
  });
}

export function useSeriesList(params?: { category?: string; page?: number; limit?: number }) {
  return useQuery({
    queryKey: ['catalog', 'series', params],
    queryFn: () =>
      invokeFunction<PaginatedResponse<Series>>('catalog-series', {
        category: params?.category,
        page: String(params?.page ?? 1),
        limit: String(params?.limit ?? 20),
      }),
  });
}

export function useSeriesDetail(id: string) {
  return useQuery({
    queryKey: ['catalog', 'series', id],
    queryFn: () => invokeFunction<SeriesDetail>('catalog-series-detail', { id }),
    enabled: !!id,
  });
}

export function useSearch(query: string) {
  const debouncedQuery = useDebounce(query, 300);

  return useQuery({
    queryKey: ['catalog', 'search', debouncedQuery],
    queryFn: () => invokeFunction<Series[]>('catalog-search', { q: debouncedQuery }),
    staleTime: 1000 * 60,
    enabled: debouncedQuery.length > 2,
  });
}
