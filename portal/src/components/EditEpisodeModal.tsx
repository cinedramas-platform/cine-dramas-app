import { useState } from 'react';
import type { FormEvent } from 'react';
import Modal from './Modal';
import { catalogAdmin } from '../lib/adminApi';
import { inputCls } from '../lib/ui';
import type { Episode } from '../lib/types';

export default function EditEpisodeModal({
  episode,
  onClose,
  onSaved,
}: {
  episode: Episode;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [title, setTitle] = useState(episode.title);
  const [description, setDescription] = useState(episode.description ?? '');
  const [isFree, setIsFree] = useState(episode.is_free);
  const [coinCost, setCoinCost] = useState(episode.coin_cost);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  // Episodes that never went live (failed or stuck uploads) can be removed;
  // anything 'ready' may have been purchased and stays.
  const deletable =
    episode.mux_asset_status === 'pending' || episode.mux_asset_status === 'errored';

  async function onDelete() {
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await catalogAdmin({ action: 'delete-episode', episodeId: episode.id });
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Delete failed.');
      setBusy(false);
      setConfirmDelete(false);
    }
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    setBusy(true);
    setError(null);
    try {
      await catalogAdmin({
        action: 'update-episode',
        episodeId: episode.id,
        fields: {
          title: title.trim(),
          description: description.trim() || null,
          is_free: isFree,
          coin_cost: coinCost,
        },
      });
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed.');
      setBusy(false);
    }
  }

  return (
    <Modal onClose={onClose}>
      <form onSubmit={onSubmit} className="space-y-4">
        <h3 className="text-lg font-medium">Edit episode</h3>
        <label className="block text-sm">
          <span className="text-neutral-400">Title</span>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            className={`${inputCls} mt-1`}
          />
        </label>
        <label className="block text-sm">
          <span className="text-neutral-400">Description</span>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
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
                step={1}
                value={coinCost}
                onChange={(e) => setCoinCost(Math.max(0, Math.floor(Number(e.target.value) || 0)))}
                className="w-24 rounded-md bg-neutral-900 border border-neutral-800 px-2 py-1 text-sm"
              />
            </label>
          )}
        </div>
        {error && (
          <div className="rounded-md border border-red-900 bg-red-950/40 px-4 py-3 text-sm text-red-300">
            {error}
          </div>
        )}
        <div className="flex justify-end gap-3 pt-2">
          {deletable && (
            <button
              type="button"
              onClick={onDelete}
              disabled={busy}
              className={`mr-auto rounded-md px-4 py-2 text-sm disabled:opacity-40 ${
                confirmDelete
                  ? 'bg-red-900 text-white'
                  : 'border border-red-900/60 text-red-400 hover:bg-red-950/40'
              }`}
            >
              {confirmDelete ? 'Confirm delete' : 'Delete draft'}
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-neutral-700 px-4 py-2 text-sm text-neutral-300 hover:bg-neutral-900"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={busy || !title.trim()}
            className="rounded-md px-4 py-2 text-sm font-medium text-white disabled:opacity-40"
            style={{ backgroundColor: 'var(--accent)' }}
          >
            {busy ? 'Saving…' : 'Save changes'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
