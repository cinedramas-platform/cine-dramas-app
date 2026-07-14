import { useState } from 'react';
import type { FormEvent } from 'react';
import Modal from './Modal';
import { catalogAdmin } from '../lib/adminApi';
import { inputCls } from '../lib/ui';
import type { Series } from '../lib/types';

/** Create (no `series` prop) or edit (with it) a series — same form. */
export default function SeriesFormModal({
  series,
  categories,
  onClose,
  onSaved,
}: {
  series?: Series;
  categories: string[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [title, setTitle] = useState(series?.title ?? '');
  const [category, setCategory] = useState(series?.category ?? '');
  const [description, setDescription] = useState(series?.description ?? '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!title.trim() || !category.trim()) return;
    setBusy(true);
    setError(null);
    const fields = {
      title: title.trim(),
      category: category.trim(),
      description: description.trim() || null,
    };
    try {
      await catalogAdmin(
        series
          ? { action: 'update-series', seriesId: series.id, fields }
          : { action: 'create-series', fields },
      );
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed.');
      setBusy(false);
    }
  }

  return (
    <Modal onClose={onClose}>
      <form onSubmit={onSubmit} className="space-y-4">
        <h3 className="text-lg font-medium">{series ? 'Edit series' : 'New series'}</h3>
        {!series && (
          <p className="text-xs text-neutral-500">
            Created as a draft with Season 1, ready for uploads. Publish it when the first
            episodes are live.
          </p>
        )}
        <label className="block text-sm">
          <span className="text-neutral-400">Title</span>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            autoFocus={!series}
            className={`${inputCls} mt-1`}
            placeholder="e.g. Midnight in Sofia"
          />
        </label>
        <label className="block text-sm">
          <span className="text-neutral-400">Category</span>
          <input
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            required
            list="series-categories"
            className={`${inputCls} mt-1`}
            placeholder="drama, romance, thriller…"
          />
          <datalist id="series-categories">
            {categories.map((c) => (
              <option key={c} value={c} />
            ))}
          </datalist>
        </label>
        <label className="block text-sm">
          <span className="text-neutral-400">Description (optional)</span>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            className={`${inputCls} mt-1`}
          />
        </label>
        {error && (
          <div className="rounded-md border border-red-900 bg-red-950/40 px-4 py-3 text-sm text-red-300">
            {error}
          </div>
        )}
        <div className="flex justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-neutral-700 px-4 py-2 text-sm text-neutral-300 hover:bg-neutral-900"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={busy || !title.trim() || !category.trim()}
            className="rounded-md px-4 py-2 text-sm font-medium text-white disabled:opacity-40"
            style={{ backgroundColor: 'var(--accent)' }}
          >
            {busy ? 'Saving…' : series ? 'Save changes' : 'Create series'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
