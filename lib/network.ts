// T3.06 — Network monitoring + offline recovery.
//
// Bridges NetInfo into React Query's onlineManager so paused queries/mutations
// resume automatically on reconnect, and replays the offline progress queue the
// moment connectivity returns. Call setupNetworkMonitor() once at app start.
//
// NetInfo is a NATIVE module. Dev clients built before T3.06 don't bundle it,
// and a top-level import crashes the whole app there ("RNCNetInfo is null").
// Loaded lazily + guarded so the app degrades to assume-online instead.
import { onlineManager } from '@tanstack/react-query';
import { flushProgressQueue } from '@/lib/progressQueue';
import { logger } from '@/lib/logger';

let initialized = false;

/** Wire NetInfo → React Query and flush queued writes on reconnect. Idempotent. */
export function setupNetworkMonitor(): () => void {
  if (initialized) return () => {};
  initialized = true;

  let wasOnline = true;
  let unsubscribe: () => void = () => {};

  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const NetInfo = require('@react-native-community/netinfo')
      .default as typeof import('@react-native-community/netinfo').default;

    unsubscribe = NetInfo.addEventListener((state) => {
      // reachable can be null while unknown — treat null as "assume online".
      const online = Boolean(state.isConnected && state.isInternetReachable !== false);

      onlineManager.setOnline(online);

      if (online && !wasOnline) {
        logger.info('network reconnected — flushing offline queue');
        void flushProgressQueue();
      }
      wasOnline = online;
    });
  } catch (e) {
    // Native module absent (old dev client) — stay in assume-online mode.
    logger.warn('NetInfo unavailable; offline detection disabled', { error: String(e) });
    onlineManager.setOnline(true);
  }

  // Attempt a flush on cold start in case writes were queued in a prior session.
  void flushProgressQueue();

  return () => {
    unsubscribe();
    initialized = false;
  };
}
