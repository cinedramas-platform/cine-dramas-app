import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { fetchAnalytics } from '../lib/adminApi';
import type { AnalyticsReport } from '../lib/adminApi';

interface CatalogStats {
  series: number;
  episodes: number;
  ready: number;
}

function formatWatchTime(ms: number | null): string {
  if (ms == null) return '—';
  const minutes = Math.round(ms / 60000);
  if (minutes < 60) return `${minutes} min`;
  return `${(minutes / 60).toFixed(1)} h`;
}

export default function Analytics() {
  const [stats, setStats] = useState<CatalogStats | null>(null);
  const [report, setReport] = useState<AnalyticsReport | null>(null);
  const [reportError, setReportError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      supabase.from('series').select('id', { count: 'exact', head: true }),
      supabase.from('episodes').select('id', { count: 'exact', head: true }),
      supabase
        .from('episodes')
        .select('id', { count: 'exact', head: true })
        .eq('mux_asset_status', 'ready'),
    ]).then(([series, episodes, ready]) => {
      setStats({
        series: series.count ?? 0,
        episodes: episodes.count ?? 0,
        ready: ready.count ?? 0,
      });
    });

    fetchAnalytics(30)
      .then(setReport)
      .catch((err) => setReportError(err instanceof Error ? err.message : 'Failed to load.'));
  }, []);

  const maxViews = report?.rows.length ? Math.max(...report.rows.map((r) => r.views)) : 0;

  return (
    <div className="p-8 max-w-5xl">
      <h2 className="text-xl font-semibold mb-6">Analytics</h2>

      <div className="grid grid-cols-5 gap-4 mb-10">
        {(
          [
            ['Series', stats?.series],
            ['Episodes', stats?.episodes],
            ['Live episodes', stats?.ready],
            [`Views · ${report?.days ?? 30}d`, report?.totals.views],
            [`Watch time · ${report?.days ?? 30}d`, formatWatchTime(report?.totals.watchTimeMs ?? null)],
          ] as const
        ).map(([label, value]) => (
          <div key={label} className="rounded-lg border border-neutral-800 p-5">
            <div className="text-2xl font-semibold text-neutral-100">{value ?? '—'}</div>
            <div className="text-xs text-neutral-500 mt-1">{label}</div>
          </div>
        ))}
      </div>

      <h3 className="text-sm font-medium text-neutral-300 mb-3">
        Top episodes by views — last {report?.days ?? 30} days
      </h3>

      {reportError && (
        <div className="rounded-md border border-amber-900 bg-amber-950/40 px-4 py-3 text-sm text-amber-300">
          {reportError}
        </div>
      )}

      {report && report.rows.length === 0 && (
        <div className="rounded-lg border border-dashed border-neutral-800 p-8 text-center text-sm text-neutral-500">
          No views recorded in this window yet. Metrics appear once the apps start
          reporting playback to Mux Data.
        </div>
      )}

      {report && report.rows.length > 0 && (
        <div className="rounded-lg border border-neutral-800 divide-y divide-neutral-800/60">
          {report.rows.map((row) => (
            <div key={row.title} className="px-5 py-3 grid grid-cols-[1fr_auto] gap-x-6 gap-y-1.5 items-center">
              <div className="text-sm truncate">{row.title}</div>
              <div className="text-sm text-neutral-400 tabular-nums text-right">
                {row.views.toLocaleString()} views · {formatWatchTime(row.watchTimeMs)}
              </div>
              <div className="col-span-2 h-1.5 rounded-full bg-neutral-900 overflow-hidden">
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${maxViews ? Math.max((row.views / maxViews) * 100, 2) : 0}%`,
                    backgroundColor: 'var(--accent)',
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
