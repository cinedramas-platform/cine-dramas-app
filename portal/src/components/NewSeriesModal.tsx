import { useState } from 'react';
import type { FormEvent } from 'react';
import { catalogAdmin } from '../lib/adminApi';

const inputCls =
  'w-full rounded-md bg-neutral-900 border border-neutral-800 px-3 py-2 text-sm focus:outline-none focus:border-neutral-600';

export default function NewSeriesModal({
  categories,
  onClose,
  onSaved,
}: {
  categories: string[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!title.trim() || !category.trim()) return;
    setBusy(true);
    setError(null);
    try {
      await catalogAdmin({
        action: 'create-series',
        fields: {
          title: title.trim(),
          category: category.trim(),
          description: description.trim() || null,
        },
      });
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed.');
      setBusy(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-6"
      onClick={onClose}
    >
      <form
        onSubmit={onSubmit}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-lg border border-neutral-800 bg-neutral-950 p-6 space-y-4"
      >
        <h3 className="text-lg font-medium">New series</h3>
        <p className="text-xs text-neutral-500">
          Created as a draft with Season 1, ready for uploads. Publish it when the first
          episodes are live.
        </p>
        <label className="block text-sm">
          <span className="text-neutral-400">Title</span>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            autoFocus
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
            {busy ? 'Creating…' : 'Create series'}
          </button>
        </div>
      </form>
    </div>
  );
}
