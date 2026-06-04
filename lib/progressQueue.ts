// T3.06 — Offline queue for watch-progress writes.
//
// When a progress PUT fails (offline / server error) we stash it here instead of
// dropping it. Entries are keyed by episodeId so only the latest position per
// episode is kept (progress is last-write-wins). flushProgressQueue() replays
// the queue — called on reconnect (see lib/network.ts) and on app start.
import AsyncStorage from '@react-native-async-storage/async-storage';
import { invokeFunctionMutation } from '@/services/api';
import { logger } from '@/lib/logger';
import type { UpdateProgressPayload, UpdateProgressResponse } from '@/types/progress';

const KEY = 'CINEDRAMAS_PROGRESS_QUEUE';

type QueueEntry = { episodeId: string; payload: UpdateProgressPayload; updatedAt: number };
type QueueMap = Record<string, QueueEntry>;

let flushing = false;

async function read(): Promise<QueueMap> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as QueueMap) : {};
  } catch {
    return {};
  }
}

async function write(map: QueueMap): Promise<void> {
  try {
    await AsyncStorage.setItem(KEY, JSON.stringify(map));
  } catch (e) {
    logger.warn('progress queue write failed', { error: String(e) });
  }
}

/** Stash a failed progress write; latest position per episode wins. */
export async function enqueueProgress(
  episodeId: string,
  payload: UpdateProgressPayload,
): Promise<void> {
  const map = await read();
  map[episodeId] = { episodeId, payload, updatedAt: Date.now() };
  await write(map);
  logger.info('progress write queued offline', { episodeId, queued: Object.keys(map).length });
}

/**
 * Replay every queued write. Successful entries are removed; entries that fail
 * again are kept for the next flush. Re-entrant calls are ignored.
 */
export async function flushProgressQueue(): Promise<void> {
  if (flushing) return;
  flushing = true;
  try {
    const map = await read();
    const entries = Object.values(map);
    if (entries.length === 0) return;

    let changed = false;
    for (const entry of entries) {
      try {
        await invokeFunctionMutation<UpdateProgressResponse>('user-progress', {
          method: 'PUT',
          params: { episodeId: entry.episodeId },
          body: entry.payload,
        });
        delete map[entry.episodeId];
        changed = true;
      } catch {
        // Still unreachable — leave it queued for the next flush.
      }
    }

    if (changed) {
      await write(map);
      logger.info('progress queue flushed', { remaining: Object.keys(map).length });
    }
  } finally {
    flushing = false;
  }
}
