const MUX_IMAGE_BASE = 'https://image.mux.com';

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
  if (opts?.width) params.set('width', String(opts.width));
  if (opts?.height) params.set('height', String(opts.height));
  if (opts?.time != null) params.set('time', String(opts.time));
  if (opts?.fitMode) params.set('fit_mode', opts.fitMode);
  const qs = params.toString();
  return `${MUX_IMAGE_BASE}/${playbackId}/thumbnail.png${qs ? `?${qs}` : ''}`;
}
