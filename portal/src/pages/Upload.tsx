import { useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { supabase } from '../lib/supabase';

interface SeriesOption {
  id: string;
  title: string;
  seasons: { id: string; number: number; title: string | null }[];
}

type Phase =
  | { step: 'form' }
  | { step: 'uploading'; percent: number }
  | { step: 'processing'; episodeId: string }
  | { step: 'done' }
  | { step: 'error'; message: string };

const inputCls =
  'w-full rounded-md bg-neutral-900 border border-neutral-800 px-3 py-2 text-sm focus:outline-none focus:border-neutral-600';

export default function Upload({ onDone }: { onDone: () => void }) {
  const [seriesOptions, setSeriesOptions] = useState<SeriesOption[]>([]);
  const [seriesId, setSeriesId] = useState('');
  const [seasonId, setSeasonId] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [isFree, setIsFree] = useState(false);
  const [coinCost, setCoinCost] = useState(80);
  const [file, setFile] = useState<File | null>(null);
  const [phase, setPhase] = useState<Phase>({ step: 'form' });
  const [dragOver, setDragOver] = useState(false);
  const pollTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    supabase
      .from('series')
      .select('id, title, seasons(id, number, title)')
      .order('title')
      .then(({ data }) => {
        const options = (data as unknown as SeriesOption[]) ?? [];
        setSeriesOptions(options);
        if (options[0]) {
          setSeriesId(options[0].id);
          setSeasonId(options[0].seasons[0]?.id ?? '');
        }
      });
    return () => {
      if (pollTimer.current) clearInterval(pollTimer.current);
    };
  }, []);

  const seasons = seriesOptions.find((s) => s.id === seriesId)?.seasons ?? [];

  function pollUntilReady(episodeId: string) {
    setPhase({ step: 'processing', episodeId });
    pollTimer.current = setInterval(async () => {
      const { data } = await supabase
        .from('episodes')
        .select('mux_asset_status')
        .eq('id', episodeId)
        .single();
      if (data?.mux_asset_status === 'ready') {
        if (pollTimer.current) clearInterval(pollTimer.current);
        setPhase({ step: 'done' });
      } else if (data?.mux_asset_status === 'errored') {
        if (pollTimer.current) clearInterval(pollTimer.current);
        setPhase({ step: 'error', message: 'Mux failed to process the video.' });
      }
    }, 5000);
  }

  function putFile(uploadUrl: string, episodeId: string, body: File) {
    const xhr = new XMLHttpRequest();
    xhr.open('PUT', uploadUrl);
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) {
        setPhase({ step: 'uploading', percent: Math.round((e.loaded / e.total) * 100) });
      }
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) pollUntilReady(episodeId);
      else setPhase({ step: 'error', message: `Upload failed (HTTP ${xhr.status}).` });
    };
    xhr.onerror = () => setPhase({ step: 'error', message: 'Upload failed (network error).' });
    xhr.send(body);
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!file || !seasonId || !title.trim()) return;
    setPhase({ step: 'uploading', percent: 0 });

    const { data, error } = await supabase.functions.invoke('mux-direct-upload', {
      body: {
        seasonId,
        title: title.trim(),
        description: description.trim() || null,
        isFree,
        coinCost,
      },
    });

    if (error || !data?.uploadUrl || !data?.episodeId) {
      const message =
        error?.message === 'Failed to send a request to the Edge Function' ||
        (error && 'status' in error && (error as { status?: number }).status === 404)
          ? 'Upload service is not deployed yet (supabase functions deploy mux-direct-upload).'
          : (data?.error ?? error?.message ?? 'Could not create upload.');
      setPhase({ step: 'error', message });
      return;
    }

    putFile(data.uploadUrl, data.episodeId, file);
  }

  if (phase.step === 'done') {
    return (
      <div className="p-8 max-w-xl">
        <div className="rounded-lg border border-emerald-900 bg-emerald-950/40 p-8 text-center">
          <div className="text-3xl mb-3">✓</div>
          <h2 className="text-lg font-medium mb-2">Episode is live</h2>
          <p className="text-sm text-neutral-400 mb-6">
            “{title}” finished processing and is now available in your app.
          </p>
          <button
            onClick={onDone}
            className="rounded-md px-4 py-2 text-sm font-medium text-white"
            style={{ backgroundColor: 'var(--accent)' }}
          >
            View in catalog
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-xl">
      <h2 className="text-xl font-semibold mb-6">Upload episode</h2>
      <form onSubmit={onSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <label className="block text-sm">
            <span className="text-neutral-400">Series</span>
            <select
              value={seriesId}
              onChange={(e) => {
                setSeriesId(e.target.value);
                const first = seriesOptions.find((s) => s.id === e.target.value)?.seasons[0];
                setSeasonId(first?.id ?? '');
              }}
              className={`${inputCls} mt-1`}
            >
              {seriesOptions.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.title}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm">
            <span className="text-neutral-400">Season</span>
            <select
              value={seasonId}
              onChange={(e) => setSeasonId(e.target.value)}
              className={`${inputCls} mt-1`}
            >
              {seasons.map((se) => (
                <option key={se.id} value={se.id}>
                  {se.title ?? `Season ${se.number}`}
                </option>
              ))}
            </select>
          </label>
        </div>
        <label className="block text-sm">
          <span className="text-neutral-400">Episode title</span>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            className={`${inputCls} mt-1`}
            placeholder="e.g. The Midnight Call"
          />
        </label>
        <label className="block text-sm">
          <span className="text-neutral-400">Description (optional)</span>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            className={`${inputCls} mt-1`}
          />
        </label>
        <div className="flex items-center gap-6">
          <label className="flex items-center gap-2 text-sm text-neutral-300">
            <input
              type="checkbox"
              checked={isFree}
              onChange={(e) => setIsFree(e.target.checked)}
            />
            Free episode
          </label>
          {!isFree && (
            <label className="flex items-center gap-2 text-sm text-neutral-300">
              Coin cost
              <input
                type="number"
                min={0}
                value={coinCost}
                onChange={(e) => setCoinCost(Number(e.target.value))}
                className="w-24 rounded-md bg-neutral-900 border border-neutral-800 px-2 py-1 text-sm"
              />
            </label>
          )}
        </div>
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            const dropped = e.dataTransfer.files[0];
            if (dropped) setFile(dropped);
          }}
          className={`rounded-lg border-2 border-dashed p-8 text-center text-sm transition-colors ${
            dragOver ? 'border-neutral-400 bg-neutral-900' : 'border-neutral-800'
          }`}
        >
          {file ? (
            <span className="text-neutral-200">
              {file.name} ({(file.size / 1024 / 1024).toFixed(1)} MB)
            </span>
          ) : (
            <span className="text-neutral-500">Drag a video file here, or</span>
          )}
          <div className="mt-3">
            <label
              className="inline-block cursor-pointer rounded-md border border-neutral-700 px-3 py-1.5 text-neutral-300 hover:bg-neutral-900"
              data-testid="file-picker"
            >
              Choose file
              <input
                type="file"
                accept="video/*"
                className="hidden"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              />
            </label>
          </div>
        </div>

        {phase.step === 'error' && (
          <div className="rounded-md border border-red-900 bg-red-950/40 px-4 py-3 text-sm text-red-300">
            {phase.message}
          </div>
        )}
        {phase.step === 'uploading' && (
          <div className="space-y-2">
            <div className="h-2 rounded bg-neutral-800 overflow-hidden">
              <div
                className="h-full transition-all"
                style={{ width: `${phase.percent}%`, backgroundColor: 'var(--accent)' }}
              />
            </div>
            <p className="text-xs text-neutral-500">Uploading… {phase.percent}%</p>
          </div>
        )}
        {phase.step === 'processing' && (
          <p className="text-sm text-amber-400">
            Upload complete — Mux is processing the video. This page will update automatically.
          </p>
        )}

        <button
          type="submit"
          disabled={
            !file || !title.trim() || phase.step === 'uploading' || phase.step === 'processing'
          }
          className="rounded-md px-4 py-2 text-sm font-medium text-white disabled:opacity-40"
          style={{ backgroundColor: 'var(--accent)' }}
        >
          Upload episode
        </button>
      </form>
    </div>
  );
}
