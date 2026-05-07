import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useRef } from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import { invokeFunction, invokeFunctionMutation } from '@/services/api';
import type {
  WatchProgressResponse,
  ContinueWatchingResponse,
  UpdateProgressPayload,
  UpdateProgressResponse,
} from '@/types/progress';

const DEBOUNCE_MS = 10_000;

export function useWatchProgress(episodeId: string | null) {
  return useQuery({
    queryKey: ['progress', episodeId],
    queryFn: () =>
      invokeFunction<WatchProgressResponse>('user-progress', {
        episodeId: episodeId!,
      }),
    enabled: !!episodeId,
    staleTime: 0,
    select: (data) => data.progress,
  });
}

export function useContinueWatching() {
  return useQuery({
    queryKey: ['progress', 'continue-watching'],
    queryFn: () => invokeFunction<ContinueWatchingResponse>('user-progress'),
    staleTime: 1000 * 60 * 2,
    select: (data) => data.progress,
  });
}

export function useSaveProgress(episodeId: string | null) {
  const queryClient = useQueryClient();
  const pendingRef = useRef<UpdateProgressPayload | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const episodeIdRef = useRef(episodeId);
  episodeIdRef.current = episodeId;

  const send = useCallback(
    async (eId: string, payload: UpdateProgressPayload) => {
      try {
        const data = await invokeFunctionMutation<UpdateProgressResponse>(
          'user-progress',
          { method: 'PUT', params: { episodeId: eId }, body: payload },
        );
        queryClient.setQueryData(['progress', eId], {
          progress: { episode_id: eId, ...data },
        });
      } catch {
        // Silent — next debounce interval will retry
      }
    },
    [queryClient],
  );

  const flush = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = undefined;
    }
    const eId = episodeIdRef.current;
    if (pendingRef.current && eId) {
      send(eId, pendingRef.current);
      pendingRef.current = null;
    }
  }, [send]);

  const saveProgress = useCallback(
    (positionSeconds: number, durationSeconds: number) => {
      const completed =
        durationSeconds > 0 && positionSeconds >= durationSeconds * 0.9;

      pendingRef.current = {
        position_seconds: Math.round(positionSeconds),
        completed,
      };

      if (completed) {
        flush();
        return;
      }

      if (!timerRef.current) {
        timerRef.current = setTimeout(flush, DEBOUNCE_MS);
      }
    },
    [flush],
  );

  useEffect(() => {
    const handleAppState = (state: AppStateStatus) => {
      if (state === 'background' || state === 'inactive') flush();
    };
    const sub = AppState.addEventListener('change', handleAppState);
    return () => {
      sub.remove();
      flush();
    };
  }, [flush]);

  return { saveProgress, flush };
}
