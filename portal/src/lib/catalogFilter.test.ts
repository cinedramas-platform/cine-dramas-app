import { describe, expect, it } from 'vitest';
import { filterCatalog } from './catalogFilter';
import type { Episode, Season, Series } from './types';

let nextId = 0;
function makeEpisode(overrides: Partial<Episode> = {}): Episode {
  return {
    id: `ep-${nextId++}`,
    season_id: 's',
    title: 'Episode',
    description: null,
    order: 1,
    is_free: false,
    coin_cost: 80,
    mux_asset_id: 'asset',
    mux_playback_id: 'playback',
    mux_asset_status: 'ready',
    duration_seconds: 120,
    ...overrides,
  };
}

function makeSeries(title: string, episodes: Episode[], seasons: Season[] = []): Series {
  return {
    id: `series-${nextId++}`,
    title,
    description: null,
    category: 'drama',
    is_featured: false,
    status: 'published',
    thumbnail_playback_id: null,
    seasons: seasons.length
      ? seasons
      : [{ id: `season-${nextId++}`, series_id: 's', number: 1, title: null, episodes }],
  };
}

describe('filterCatalog', () => {
  const paris = makeSeries('A Paris Proposal', [
    makeEpisode({ title: 'The Encounter' }),
    makeEpisode({ title: 'City of Light', mux_asset_status: 'pending' }),
  ]);
  const heiress = makeSeries('The Heiress Returns', [
    makeEpisode({ title: 'The Reading of the Will', mux_asset_status: 'errored' }),
  ]);
  const empty = makeSeries('Midnight in Sofia', []);
  const all = [paris, heiress, empty];

  it('returns everything, including episode-less series, with no filters', () => {
    const visible = filterCatalog(all, '', 'all');
    expect(visible.map((s) => s.title)).toEqual([
      'A Paris Proposal',
      'The Heiress Returns',
      'Midnight in Sofia',
    ]);
  });

  it('matches series titles and keeps all their episodes', () => {
    const visible = filterCatalog(all, 'paris', 'all');
    expect(visible).toHaveLength(1);
    expect(visible[0].seasons[0].episodes).toHaveLength(2);
  });

  it('matches episode titles within non-matching series', () => {
    const visible = filterCatalog(all, 'reading', 'all');
    expect(visible).toHaveLength(1);
    expect(visible[0].title).toBe('The Heiress Returns');
    expect(visible[0].seasons[0].episodes).toHaveLength(1);
  });

  it('keeps an episode-less series visible when its own title matches the search', () => {
    const visible = filterCatalog(all, 'midnight', 'all');
    expect(visible.map((s) => s.title)).toEqual(['Midnight in Sofia']);
  });

  it('hides episode-less series under a status filter', () => {
    const visible = filterCatalog(all, '', 'errored');
    expect(visible.map((s) => s.title)).toEqual(['The Heiress Returns']);
  });

  it('treats pending and preparing as processing', () => {
    const withPreparing = makeSeries('Prep', [makeEpisode({ mux_asset_status: 'preparing' })]);
    const visible = filterCatalog([...all, withPreparing], '', 'processing');
    expect(visible.map((s) => s.title)).toEqual(['A Paris Proposal', 'Prep']);
    expect(visible[0].seasons[0].episodes.map((e) => e.title)).toEqual(['City of Light']);
  });

  it('combines search and status filter (empty series hidden despite title match)', () => {
    const visible = filterCatalog(all, 'midnight', 'ready');
    expect(visible).toHaveLength(0);
  });

  it('does not mutate the input', () => {
    filterCatalog(all, 'paris', 'ready');
    expect(paris.seasons[0].episodes).toHaveLength(2);
  });
});
