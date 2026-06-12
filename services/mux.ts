const MUX_IMAGE_BASE = 'https://image.mux.com';

// Snap requested dimensions up to 128px buckets so layout tweaks and device-width
// variety resolve to shared, already-cached Mux renditions instead of busting
// every client's image cache on an 8px padding change.
const bucket = (px: number) => Math.ceil(px / 128) * 128;

export function getMuxThumbnailUrl(
  playbackId: string,
  opts?: {
    width?: number;
    height?: number;
    time?: number;
    fitMode?: 'smartcrop' | 'preserve' | 'crop';
  },
): string {
  const params = new URLSearchParams();
  if (opts?.width) params.set('width', String(bucket(opts.width)));
  if (opts?.height) params.set('height', String(bucket(opts.height)));
  if (opts?.time != null) params.set('time', String(opts.time));
  if (opts?.fitMode) params.set('fit_mode', opts.fitMode);
  const qs = params.toString();
  return `${MUX_IMAGE_BASE}/${playbackId}/thumbnail.png${qs ? `?${qs}` : ''}`;
}
