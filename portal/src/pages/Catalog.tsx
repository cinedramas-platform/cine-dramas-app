import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { catalogAdmin } from '../lib/adminApi';
import type { Episode, Series } from '../lib/types';
import PreviewModal from '../components/PreviewModal';
import EditEpisodeModal from '../components/EditEpisodeModal';
import NewSeriesModal from '../components/NewSeriesModal';
import EditSeriesModal from '../components/EditSeriesModal';

const STATUS_STYLES: Record<string, string> = {
  ready: 'bg-emerald-950 text-emerald-400',
  preparing: 'bg-amber-950 text-amber-400',
  pending: 'bg-neutral-800 text-neutral-400',
  errored: 'bg-red-950 text-red-400',
};

type StatusFilter = 'all' | 'ready' | 'processing' | 'errored';

const FILTERS: { key: StatusFilter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'ready', label: 'Live' },
  { key: 'processing', label: 'Processing' },
  { key: 'errored', label: 'Errored' },
];

function matchesFilter(ep: Episode, filter: StatusFilter): boolean {
  if (filter === 'all') return true;
  if (filter === 'processing')
    return ep.mux_asset_status === 'pending' || ep.mux_asset_status === 'preparing';
  return ep.mux_asset_status === filter;
}

function formatDuration(seconds: number | null): string {
  if (seconds == null) return '—';
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

export default function Catalog() {
  const [series, setSeries] = useState<Series[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<StatusFilter>('all');
  const [previewEp, setPreviewEp] = useState<Episode | null>(null);
  const [editEp, setEditEp] = useState<Episode | null>(null);
  const [newSeriesOpen, setNewSeriesOpen] = useState(false);
  const [editSeries, setEditSeries] = useState<Series | null>(null);
  const [seasonBusy, setSeasonBusy] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const load = useCallback(() => {
    supabase
      .from('series')
      .select(
        'id, title, description, category, is_featured, status, thumbnail_playback_id, seasons(id, series_id, number, title, episodes(id, season_id, title, description, "order", is_free, coin_cost, mux_asset_id, mux_playback_id, mux_asset_status, duration_seconds))',
      )
      .order('title')
      .then(({ data, error }) => {
        if (error) setError(error.message);
        else setSeries(data as unknown as Series[]);
      });
  }, []);

  useEffect(load, [load]);

  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(() => setNotice(null), 5000);
    return () => clearTimeout(t);
  }, [notice]);

  async function toggleSeries(s: Series, fields: { status?: Series['status']; is_featured?: boolean }) {
    try {
      await catalogAdmin({ action: 'update-series', seriesId: s.id, fields });
      load();
    } catch (err) {
      setNotice(err instanceof Error ? err.message : 'Save failed.');
    }
  }

  async function addSeason(s: Series) {
    if (seasonBusy) return;
    setSeasonBusy(s.id);
    try {
      await catalogAdmin({ action: 'create-season', seriesId: s.id });
      load();
    } catch (err) {
      setNotice(err instanceof Error ? err.message : 'Save failed.');
    } finally {
      setSeasonBusy(null);
    }
  }

  if (error) return <div className="p-8 text-red-400 text-sm">Failed to load catalog: {error}</div>;
  if (!series) return <div className="p-8 text-neutral-500 text-sm">Loading catalog…</div>;

  const q = search.trim().toLowerCase();
  const filtering = q !== '' || filter !== 'all';
  const visible = series
    .map((s) => {
      const seriesMatches = !q || s.title.toLowerCase().includes(q);
      const seasons = s.seasons.map((season) => ({
        ...season,
        episodes: season.episodes.filter(
          (ep) =>
            matchesFilter(ep, filter) && (seriesMatches || ep.title.toLowerCase().includes(q)),
        ),
      }));
      return { ...s, seasons, seriesMatches };
    })
    // Episode-less series stay visible when nothing filters them out: always
    // with no active filters (a freshly created series must show up so the
    // producer can continue to Upload), and under search when the series
    // title itself matches and no status filter applies.
    .filter(
      (s) =>
        s.seasons.some((season) => season.episodes.length > 0) ||
        !filtering ||
        (s.seriesMatches && filter === 'all'),
    );

  const episodeCount = visible.reduce(
    (n, s) => n + s.seasons.reduce((m, se) => m + se.episodes.length, 0),
    0,
  );
  const categories = [...new Set(series.map((s) => s.category))].sort();

  return (
    <div className="p-8 max-w-5xl">
      <div className="flex items-baseline justify-between mb-4">
        <h2 className="text-xl font-semibold">Content</h2>
        <div className="flex items-center gap-4">
          <span className="text-sm text-neutral-500">
            {visible.length} series · {episodeCount} episodes
          </span>
          <button
            onClick={() => setNewSeriesOpen(true)}
            className="rounded-md px-3 py-1.5 text-sm font-medium text-white"
            style={{ backgroundColor: 'var(--accent)' }}
          >
            + New series
          </button>
        </div>
      </div>

      <div className="flex items-center gap-3 mb-6">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search series or episodes…"
          className="w-64 rounded-md bg-neutral-900 border border-neutral-800 px-3 py-1.5 text-sm focus:outline-none focus:border-neutral-600"
        />
        <div className="flex gap-1">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`px-3 py-1.5 rounded-md text-xs transition-colors ${
                filter === f.key
                  ? 'bg-neutral-800 text-white'
                  : 'text-neutral-400 hover:bg-neutral-900'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {notice && (
        <div className="mb-4 rounded-md border border-amber-900 bg-amber-950/40 px-4 py-3 text-sm text-amber-300">
          {notice}
        </div>
      )}

      {visible.length === 0 && (
        <div className="rounded-lg border border-dashed border-neutral-800 p-10 text-center text-sm text-neutral-500">
          Nothing matches your search.
        </div>
      )}

      <div className="space-y-6">
        {visible.map((s) => (
          <div key={s.id} className="rounded-lg border border-neutral-800 overflow-hidden">
            <div className="px-5 py-4 flex items-center gap-3 bg-neutral-900/50">
              {s.thumbnail_playback_id && (
                <img
                  src={`https://image.mux.com/${s.thumbnail_playback_id}/thumbnail.jpg?width=80&height=120&fit_mode=crop`}
                  alt=""
                  className="w-10 h-14 rounded object-cover shrink-0"
                  loading="lazy"
                />
              )}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-medium truncate">{s.title}</h3>
                  <span className="text-xs px-1.5 py-0.5 rounded bg-neutral-800 text-neutral-400">
                    {s.status}
                  </span>
                </div>
                <p className="text-xs text-neutral-500 truncate mt-0.5">
                  {s.category}
                  {s.description ? ` — ${s.description}` : ''}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => setEditSeries(s)}
                  className="text-xs px-2.5 py-1.5 rounded-md border border-neutral-800 text-neutral-400 hover:bg-neutral-900 hover:text-neutral-200"
                >
                  Edit
                </button>
                <button
                  onClick={() => addSeason(s)}
                  disabled={seasonBusy !== null}
                  title="Add the next season"
                  className="text-xs px-2.5 py-1.5 rounded-md border border-neutral-800 text-neutral-400 hover:bg-neutral-900 hover:text-neutral-200 disabled:opacity-40"
                >
                  {seasonBusy === s.id ? 'Adding…' : '+ Season'}
                </button>
                <button
                  onClick={() => toggleSeries(s, { is_featured: !s.is_featured })}
                  title={s.is_featured ? 'Remove from featured' : 'Add to featured'}
                  className={`text-sm px-2 py-1 rounded-md border border-neutral-800 hover:bg-neutral-900 ${
                    s.is_featured ? 'text-amber-400' : 'text-neutral-500'
                  }`}
                >
                  ★
                </button>
                <button
                  onClick={() =>
                    toggleSeries(s, {
                      status: s.status === 'published' ? 'draft' : 'published',
                    })
                  }
                  className="text-xs px-2.5 py-1.5 rounded-md border border-neutral-800 text-neutral-300 hover:bg-neutral-900"
                >
                  {s.status === 'published' ? 'Unpublish' : 'Publish'}
                </button>
              </div>
            </div>
            {s.seasons.every((se) => se.episodes.length === 0) && (
              <div className="px-5 py-4 text-sm text-neutral-500 border-t border-neutral-800/60">
                No episodes yet — upload the first one from the Upload tab.
              </div>
            )}
            {s.seasons
              .slice()
              .sort((a, b) => a.number - b.number)
              .map((season) => (
                <div key={season.id}>
                  {s.seasons.length > 1 && (
                    <div className="px-5 pt-3 pb-1 text-xs font-medium text-neutral-500 border-t border-neutral-800/60">
                      {season.title ?? `Season ${season.number}`}
                      {season.episodes.length === 0 && ' — no episodes yet'}
                    </div>
                  )}
                  <table className="w-full text-sm">
                  <tbody>
                    {season.episodes
                      .slice()
                      .sort((a, b) => a.order - b.order)
                      .map((ep) => {
                        const playable = ep.mux_asset_status === 'ready' && ep.mux_playback_id;
                        return (
                          <tr
                            key={ep.id}
                            onClick={() => playable && setPreviewEp(ep)}
                            className={`border-t border-neutral-800/60 ${
                              playable ? 'cursor-pointer hover:bg-neutral-900/60' : ''
                            }`}
                          >
                            <td className="pl-5 pr-2 py-2 w-14">
                              {ep.mux_playback_id ? (
                                <div className="relative w-9 h-14 shrink-0">
                                  <img
                                    src={`https://image.mux.com/${ep.mux_playback_id}/thumbnail.jpg?width=72&height=112&fit_mode=crop`}
                                    alt=""
                                    className="w-9 h-14 rounded object-cover"
                                    loading="lazy"
                                  />
                                  {playable && (
                                    <span className="absolute inset-0 flex items-center justify-center text-white/80 text-xs">
                                      ▶
                                    </span>
                                  )}
                                </div>
                              ) : (
                                <div className="w-9 h-14 rounded bg-neutral-900" />
                              )}
                            </td>
                            <td className="px-2 py-2 text-neutral-500 w-8 text-right">
                              {ep.order}
                            </td>
                            <td className="px-2 py-2">{ep.title}</td>
                            <td className="px-2 py-2 w-20 text-neutral-400">
                              {formatDuration(ep.duration_seconds)}
                            </td>
                            <td className="px-2 py-2 w-24">
                              {ep.is_free ? (
                                <span className="text-neutral-400">free</span>
                              ) : (
                                <span className="text-neutral-300">{ep.coin_cost} coins</span>
                              )}
                            </td>
                            <td className="px-2 py-2 w-24">
                              <span
                                className={`text-xs px-2 py-0.5 rounded-full ${STATUS_STYLES[ep.mux_asset_status] ?? STATUS_STYLES.pending}`}
                              >
                                {ep.mux_asset_status}
                              </span>
                            </td>
                            <td className="px-2 py-2 w-16 text-right pr-4">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setEditEp(ep);
                                }}
                                className="text-xs px-2 py-1 rounded-md border border-neutral-800 text-neutral-400 hover:bg-neutral-900 hover:text-neutral-200"
                              >
                                Edit
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ))}
          </div>
        ))}
      </div>

      {previewEp && <PreviewModal episode={previewEp} onClose={() => setPreviewEp(null)} />}
      {editSeries && (
        <EditSeriesModal
          series={editSeries}
          categories={categories}
          onClose={() => setEditSeries(null)}
          onSaved={() => {
            setEditSeries(null);
            setNotice(null);
            load();
          }}
        />
      )}
      {newSeriesOpen && (
        <NewSeriesModal
          categories={categories}
          onClose={() => setNewSeriesOpen(false)}
          onSaved={() => {
            setNewSeriesOpen(false);
            setNotice(null);
            load();
          }}
        />
      )}
      {editEp && (
        <EditEpisodeModal
          episode={editEp}
          onClose={() => setEditEp(null)}
          onSaved={() => {
            setEditEp(null);
            setNotice(null);
            load();
          }}
        />
      )}
    </div>
  );
}
