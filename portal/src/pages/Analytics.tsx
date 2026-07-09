import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

interface Stats {
  series: number;
  episodes: number;
  ready: number;
}

export default function Analytics() {
  const [stats, setStats] = useState<Stats | null>(null);

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

  return (
    <div className="p-8 max-w-5xl">
      <h2 className="text-xl font-semibold mb-6">Analytics</h2>
      <div className="grid grid-cols-3 gap-4 mb-8">
        {(
          [
            ['Series', stats?.series],
            ['Episodes', stats?.episodes],
            ['Live episodes', stats?.ready],
          ] as const
        ).map(([label, value]) => (
          <div key={label} className="rounded-lg border border-neutral-800 p-5">
            <div className="text-3xl font-semibold" style={{ color: 'var(--accent)' }}>
              {value ?? '—'}
            </div>
            <div className="text-sm text-neutral-500 mt-1">{label}</div>
          </div>
        ))}
      </div>
      <div className="rounded-lg border border-dashed border-neutral-800 p-8 text-center text-sm text-neutral-500">
        Audience metrics (views, watch time, quality of experience) will come from the Mux
        Data API in a next iteration.
      </div>
    </div>
  );
}
