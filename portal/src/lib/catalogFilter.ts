import type { Episode, Series } from './types';

export type StatusFilter = 'all' | 'ready' | 'processing' | 'errored';

export function matchesFilter(ep: Episode, filter: StatusFilter): boolean {
  if (filter === 'all') return true;
  if (filter === 'processing')
    return ep.mux_asset_status === 'pending' || ep.mux_asset_status === 'preparing';
  return ep.mux_asset_status === filter;
}

/**
 * Applies text search (series or episode titles) and the status filter.
 * Episode-less series stay visible when nothing filters them out: always with
 * no active filters (a freshly created series must show up so the producer
 * can continue to Upload), and under search when the series title itself
 * matches and no status filter applies.
 */
export function filterCatalog(series: Series[], search: string, filter: StatusFilter): Series[] {
  const q = search.trim().toLowerCase();
  const filtering = q !== '' || filter !== 'all';
  return series
    .map((s) => {
      const seriesMatches = !q || s.title.toLowerCase().includes(q);
      const seasons = s.seasons.map((season) => ({
        ...season,
        episodes: season.episodes.filter(
          (ep) =>
            matchesFilter(ep, filter) && (seriesMatches || ep.title.toLowerCase().includes(q)),
        ),
      }));
      return { series: { ...s, seasons }, seriesMatches };
    })
    .filter(
      ({ series: s, seriesMatches }) =>
        s.seasons.some((season) => season.episodes.length > 0) ||
        !filtering ||
        (seriesMatches && filter === 'all'),
    )
    .map(({ series: s }) => s);
}
