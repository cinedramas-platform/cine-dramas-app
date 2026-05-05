import { useCallback, useMemo, useRef, useSyncExternalStore } from 'react';
import {
  PreloadManager,
  type PreloadWindow,
} from '@/components/video/PreloadManager';

export function usePreloadManager(totalItems: number, windowSize = 1) {
  const managerRef = useRef<PreloadManager | null>(null);
  if (!managerRef.current) {
    managerRef.current = new PreloadManager({ totalItems, windowSize });
  }
  const manager = managerRef.current;

  manager.updateTotalItems(totalItems);

  const snapshotRef = useRef<PreloadWindow>(manager.getWindow());

  const subscribe = useCallback(
    (onUpdate: () => void) =>
      manager.subscribe((w) => {
        snapshotRef.current = w;
        onUpdate();
      }),
    [manager],
  );

  const getSnapshot = useCallback(() => snapshotRef.current, []);

  const window = useSyncExternalStore<PreloadWindow>(subscribe, getSnapshot);

  const updateCurrentIndex = useCallback(
    (index: number) => manager.updateCurrentIndex(index),
    [manager],
  );

  const shouldBeLoaded = useCallback(
    (index: number) => manager.shouldBeLoaded(index),
    [manager],
  );

  return useMemo(
    () => ({ window, updateCurrentIndex, shouldBeLoaded }),
    [window, updateCurrentIndex, shouldBeLoaded],
  );
}
