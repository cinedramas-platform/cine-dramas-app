// T3.06 — Network monitoring + offline recovery.
//
// Bridges NetInfo into React Query's onlineManager so paused queries/mutations
// resume automatically on reconnect, and replays the offline progress queue the
// moment connectivity returns. Call setupNetworkMonitor() once at app start.
import NetInfo from '@react-native-community/netinfo';
import { onlineManager } from '@tanstack/react-query';
import { flushProgressQueue } from '@/lib/progressQueue';
import { logger } from '@/lib/logger';

let initialized = false;

/** Wire NetInfo → React Query and flush queued writes on reconnect. Idempotent. */
export function setupNetworkMonitor(): () => void {
  if (initialized) return () => {};
  initialized = true;

  let wasOnline = true;

  const unsubscribe = NetInfo.addEventListener((state) => {
    // reachable can be null while unknown — treat null as "assume online".
    const online = Boolean(state.isConnected && state.isInternetReachable !== false);

    onlineManager.setOnline(online);

    if (online && !wasOnline) {
      logger.info('network reconnected — flushing offline queue');
      void flushProgressQueue();
    }
    wasOnline = online;
  });

  // Attempt a flush on cold start in case writes were queued in a prior session.
  void flushProgressQueue();

  return () => {
    unsubscribe();
    initialized = false;
  };
}
