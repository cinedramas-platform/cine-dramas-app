import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { fetchAnalytics, exportCsv } from '../lib/adminApi';
import type { AnalyticsReport } from '../lib/adminApi';
import TrendChart from '../components/TrendChart';

interface CatalogStats {
  series: number;
  episodes: number;
  ready: number;
}

const RANGES = [7, 30, 90] as const;

function formatWatchTime(ms: number | null): string {
  if (ms == null) return '—';
  const minutes = Math.round(ms / 60000);
  if (minutes < 60) return `${minutes} min`;
  return `${(minutes / 60).toFixed(1)} h`;
}

function BarList({ rows }: { rows: { title: string; value: number; label: string }[] }) {
  const max = rows.length ? Math.max(...rows.map((r) => r.value)) : 0;
  return (
    <div className="rounded-lg border border-neutral-800 divide-y divide-neutral-800/60">
      {rows.map((row) => (
        <div
          key={row.title}
          className="px-5 py-3 grid grid-cols-[1fr_auto] gap-x-6 gap-y-1.5 items-center"
        >
          <div className="text-sm truncate">{row.title}</div>
          <div className="text-sm text-neutral-400 tabular-nums text-right">{row.label}</div>
          <div className="col-span-2 h-1.5 rounded-full bg-neutral-900 overflow-hidden">
            <div
              className="h-full rounded-full"
              style={{
                width: `${max ? Math.max((row.value / max) * 100, 2) : 0}%`,
                backgroundColor: 'var(--accent)',
              }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

function SectionHeader({
  title,
  onExport,
}: {
  title: string;
  onExport?: () => void;
}) {
  return (
    <div className="flex items-center justify-between mb-3">
      <h3 className="text-sm font-medium text-neutral-300">{title}</h3>
      {onExport && (
        <button
          onClick={onExport}
          className="text-xs px-2.5 py-1 rounded-md border border-neutral-800 text-neutral-400 hover:bg-neutral-900 hover:text-neutral-200"
        >
          Export CSV
        </button>
      )}
    </div>
  );
}

function EmptyNote({ children }: { children: string }) {
  return (
    <div className="rounded-lg border border-dashed border-neutral-800 p-8 text-center text-sm text-neutral-500">
      {children}
    </div>
  );
}

function Skeleton({ className }: { className: string }) {
  return <div className={`animate-pulse rounded-lg bg-neutral-900 ${className}`} />;
}

export default function Analytics() {
  const [stats, setStats] = useState<CatalogStats | null>(null);
  const [days, setDays] = useState<number>(30);
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
  }, []);

  useEffect(() => {
    let stale = false;
    setReport(null);
    setReportError(null);
    fetchAnalytics(days)
      .then((r) => {
        if (!stale) setReport(r);
      })
      .catch((err) => {
        if (!stale) setReportError(err instanceof Error ? err.message : 'Failed to load.');
      });
    return () => {
      stale = true;
    };
  }, [days]);

  const loading = !report && !reportError;
  const daily = report?.coins.daily ?? [];

  return (
    <div className="p-8 max-w-5xl">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold">Analytics</h2>
        <div className="flex gap-1">
          {RANGES.map((r) => (
            <button
              key={r}
              onClick={() => setDays(r)}
              className={`px-3 py-1.5 rounded-md text-xs transition-colors ${
                days === r ? 'bg-neutral-800 text-white' : 'text-neutral-400 hover:bg-neutral-900'
              }`}
            >
              {r}d
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4 mb-10">
        {(
          [
            ['Series', stats?.series],
            ['Episodes', stats?.episodes],
            ['Live episodes', stats?.ready],
            [`Views · ${days}d`, report?.mux?.totals.views?.toLocaleString()],
            [`Watch time · ${days}d`, formatWatchTime(report?.mux?.totals.watchTimeMs ?? null)],
            [`Unlocks · ${days}d`, report?.coins.totals.unlocks?.toLocaleString()],
            [`Coins earned · ${days}d`, report?.coins.totals.coins?.toLocaleString()],
          ] as const
        ).map(([label, value]) => (
          <div key={label} className="rounded-lg border border-neutral-800 p-5">
            <div className="text-2xl font-semibold text-neutral-100">
              {loading && value == null ? (
                <span className="inline-block w-12 h-6 rounded bg-neutral-900 animate-pulse" />
              ) : (
                (value ?? '—')
              )}
            </div>
            <div className="text-xs text-neutral-500 mt-1">{label}</div>
          </div>
        ))}
      </div>

      {reportError && (
        <div className="mb-8 rounded-md border border-amber-900 bg-amber-950/40 px-4 py-3 text-sm text-amber-300">
          {reportError}
        </div>
      )}

      {loading && (
        <div className="space-y-10">
          <Skeleton className="h-40" />
          <Skeleton className="h-64" />
        </div>
      )}

      {report && (
        <>
          {daily.length > 0 && (
            <section className="mb-10">
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <SectionHeader
                    title={`Unlocks per day — last ${report.days} days`}
                    onExport={() =>
                      exportCsv(
                        `unlocks-daily-${report.days}d.csv`,
                        ['date', 'unlocks', 'coins'],
                        daily.map((d) => [d.date, d.unlocks, d.coins]),
                      )
                    }
                  />
                  <TrendChart points={daily.map((d) => ({ date: d.date, value: d.unlocks }))} />
                </div>
                <div>
                  <SectionHeader title={`Coins earned per day — last ${report.days} days`} />
                  <TrendChart points={daily.map((d) => ({ date: d.date, value: d.coins }))} />
                </div>
              </div>
            </section>
          )}

          <section className="mb-10">
            <SectionHeader
              title={`Top episodes by views — last ${report.days} days`}
              onExport={
                report.mux && report.mux.rows.length > 0
                  ? () =>
                      exportCsv(
                        `views-by-episode-${report.days}d.csv`,
                        ['episode', 'views', 'watch_time_minutes'],
                        report.mux!.rows.map((r) => [
                          r.title,
                          r.views,
                          Math.round(r.watchTimeMs / 60000),
                        ]),
                      )
                  : undefined
              }
            />
            {report.muxError && (
              <div className="rounded-md border border-amber-900 bg-amber-950/40 px-4 py-3 text-sm text-amber-300">
                Audience metrics unavailable: {report.muxError}
              </div>
            )}
            {report.mux && report.mux.rows.length === 0 && (
              <EmptyNote>
                No views recorded in this window yet. Metrics appear once the apps start
                reporting playback to Mux Data.
              </EmptyNote>
            )}
            {report.mux && report.mux.rows.length > 0 && (
              <BarList
                rows={report.mux.rows.map((r) => ({
                  title: r.title,
                  value: r.views,
                  label: `${r.views.toLocaleString()} views · ${formatWatchTime(r.watchTimeMs)}`,
                }))}
              />
            )}
          </section>

          <section>
            <SectionHeader
              title={`Top earners by unlocks — last ${report.days} days`}
              onExport={
                report.coins.rows.length > 0
                  ? () =>
                      exportCsv(
                        `earnings-by-episode-${report.days}d.csv`,
                        ['episode', 'unlocks', 'coins'],
                        report.coins.rows.map((r) => [r.title, r.unlocks, r.coins]),
                      )
                  : undefined
              }
            />
            {report.coins.rows.length === 0 ? (
              <EmptyNote>
                No episodes unlocked in this window yet. This fills in as viewers spend coins.
              </EmptyNote>
            ) : (
              <BarList
                rows={report.coins.rows.map((r) => ({
                  title: r.title,
                  value: r.unlocks,
                  label: `${r.unlocks.toLocaleString()} unlocks · ${r.coins.toLocaleString()} coins`,
                }))}
              />
            )}
          </section>
        </>
      )}
    </div>
  );
}
