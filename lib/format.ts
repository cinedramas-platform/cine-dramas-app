// Shared display formatting. One implementation per convention — screens must
// not hand-roll padStart clocks or episode labels (see docs/review-backlog.md).

/** Seconds → "HH:MM:SS" (zero-padded). For countdowns and long durations. */
export function formatClock(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return [h, m, sec].map((n) => String(n).padStart(2, '0')).join(':');
}

/** Episode number → "EP 04" label segment used across player/unlock/series. */
export function episodeCode(order: number | string): string {
  return `EP ${String(order).padStart(2, '0')}`;
}

/** Join present label segments with the house " · " separator. */
export function joinDots(...parts: Array<string | null | undefined | false>): string {
  return parts.filter(Boolean).join(' · ');
}
