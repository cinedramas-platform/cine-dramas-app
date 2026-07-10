import { useEffect, useRef } from 'react';
import type { Episode } from '../lib/types';

export default function PreviewModal({
  episode,
  onClose,
}: {
  episode: Episode;
  onClose: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !episode.mux_playback_id) return;
    const src = `https://stream.mux.com/${episode.mux_playback_id}.m3u8`;

    // Safari plays HLS natively; everyone else gets hls.js, loaded lazily so
    // its ~500kB never lands in the initial portal bundle.
    if (video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = src;
      return;
    }
    let cancelled = false;
    let destroy: (() => void) | null = null;
    import('hls.js').then(({ default: Hls }) => {
      if (cancelled || !Hls.isSupported()) return;
      const hls = new Hls();
      hls.loadSource(src);
      hls.attachMedia(video);
      destroy = () => hls.destroy();
    });
    return () => {
      cancelled = true;
      destroy?.();
    };
  }, [episode.mux_playback_id]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-6"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm rounded-lg overflow-hidden border border-neutral-800 bg-neutral-950"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-800">
          <div className="text-sm font-medium truncate pr-4">{episode.title}</div>
          <button
            onClick={onClose}
            aria-label="Close preview"
            className="text-neutral-400 hover:text-white text-lg leading-none"
          >
            ×
          </button>
        </div>
        <video
          ref={videoRef}
          controls
          autoPlay
          playsInline
          className="w-full aspect-[9/16] max-h-[70vh] bg-black"
        />
      </div>
    </div>
  );
}
