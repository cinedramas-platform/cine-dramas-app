import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import type { Series } from '../lib/types';

const STATUS_STYLES: Record<string, string> = {
  ready: 'bg-emerald-950 text-emerald-400',
  preparing: 'bg-amber-950 text-amber-400',
  pending: 'bg-neutral-800 text-neutral-400',
  errored: 'bg-red-950 text-red-400',
};

function formatDuration(seconds: number | null): string {
  if (seconds == null) return '—';
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

export default function Catalog() {
  const [series, setSeries] = useState<Series[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
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

  if (error) return <div className="p-8 text-red-400 text-sm">Failed to load catalog: {error}</div>;
  if (!series) return <div className="p-8 text-neutral-500 text-sm">Loading catalog…</div>;

  const episodeCount = series.reduce(
    (n, s) => n + s.seasons.reduce((m, se) => m + se.episodes.length, 0),
    0,
  );

  return (
    <div className="p-8 max-w-5xl">
      <div className="flex items-baseline justify-between mb-6">
        <h2 className="text-xl font-semibold">Content</h2>
        <span className="text-sm text-neutral-500">
          {series.length} series · {episodeCount} episodes
        </span>
      </div>
      <div className="space-y-6">
        {series.map((s) => (
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
                  {s.is_featured && (
                    <span className="text-xs px-1.5 py-0.5 rounded bg-neutral-800 text-amber-400">
                      featured
                    </span>
                  )}
                  <span className="text-xs px-1.5 py-0.5 rounded bg-neutral-800 text-neutral-400">
                    {s.status}
                  </span>
                </div>
                <p className="text-xs text-neutral-500 truncate mt-0.5">
                  {s.category}
                  {s.description ? ` — ${s.description}` : ''}
                </p>
              </div>
            </div>
            {s.seasons
              .slice()
              .sort((a, b) => a.number - b.number)
              .map((season) => (
                <table key={season.id} className="w-full text-sm">
                  <tbody>
                    {season.episodes
                      .slice()
                      .sort((a, b) => a.order - b.order)
                      .map((ep) => (
                        <tr key={ep.id} className="border-t border-neutral-800/60">
                          <td className="pl-5 pr-2 py-2 text-neutral-500 w-10 text-right">
                            {ep.order}
                          </td>
                          <td className="px-2 py-2">{ep.title}</td>
                          <td className="px-2 py-2 w-24 text-neutral-400">
                            {formatDuration(ep.duration_seconds)}
                          </td>
                          <td className="px-2 py-2 w-28">
                            {ep.is_free ? (
                              <span className="text-neutral-400">free</span>
                            ) : (
                              <span className="text-neutral-300">{ep.coin_cost} coins</span>
                            )}
                          </td>
                          <td className="px-2 py-2 w-28">
                            <span
                              className={`text-xs px-2 py-0.5 rounded-full ${STATUS_STYLES[ep.mux_asset_status] ?? STATUS_STYLES.pending}`}
                            >
                              {ep.mux_asset_status}
                            </span>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              ))}
          </div>
        ))}
      </div>
    </div>
  );
}
