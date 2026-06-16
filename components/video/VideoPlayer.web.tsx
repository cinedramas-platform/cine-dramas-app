// Web implementation of VideoPlayer. Renders the official Mux <mux-player> web
// component — full web control bar (scrub, volume, fullscreen, PiP, keyboard) +
// built-in HLS + Mux Data. The element is loaded at runtime from CDN in
// lib/webShell.ts (NOT bundled), which sidesteps the class-field transpilation
// that crashes @mux/mux-player-react under Metro. Same props/ref contract as the
// native player.
import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef } from 'react';
import { View } from 'react-native';
import Constants from 'expo-constants';
import type { OnLoadData, OnProgressData } from 'react-native-video';

// React 19's automatic JSX runtime resolves intrinsics from React.JSX.
declare module 'react' {
  namespace JSX {
    interface IntrinsicElements {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      'mux-player': any;
    }
  }
}

type MuxEl = HTMLElement & {
  play: () => Promise<void> | void;
  pause: () => void;
  currentTime: number;
  muted: boolean;
  playbackRate: number;
  duration: number;
};

// mux-player nests the real <video> several shadow roots deep. Walk light +
// shadow children to find it so we can read its true dimensions (drives the
// aspect-aware stage on desktop web).
function findVideo(node: Element | null): HTMLVideoElement | null {
  if (!node) return null;
  if ((node as HTMLElement).tagName === 'VIDEO') return node as HTMLVideoElement;
  const roots: Element[] = [];
  const sr = (node as HTMLElement).shadowRoot;
  if (sr) roots.push(...(Array.from(sr.children) as Element[]));
  roots.push(...(Array.from(node.children) as Element[]));
  for (const child of roots) {
    const found = findVideo(child);
    if (found) return found;
  }
  return null;
}

export type VideoPlayerRef = {
  play: () => void;
  pause: () => void;
  seek: (time: number) => void;
  getCurrentPosition: () => Promise<number>;
};

export type VideoPlayerProps = {
  playbackId: string;
  token?: string;
  /** Full signed stream URL (from playback-token). Overrides playbackId/token when set. */
  streamUrl?: string;
  paused?: boolean;
  muted?: boolean;
  rate?: number;
  onProgress?: (data: OnProgressData) => void;
  onEnd?: () => void;
  onLoad?: (data: OnLoadData) => void;
  onReady?: () => void;
  videoTitle?: string;
  videoId?: string;
};

const muxEnvKey = (Constants.expoConfig?.extra?.muxEnvKey as string) || '';

export const VideoPlayer = forwardRef<VideoPlayerRef, VideoPlayerProps>(function VideoPlayer(
  {
    playbackId,
    token,
    streamUrl,
    paused = false,
    muted = false,
    rate = 1,
    onProgress,
    onEnd,
    onLoad,
    onReady,
    videoTitle,
    videoId,
  },
  ref,
) {
  const elRef = useRef<MuxEl | null>(null);

  useImperativeHandle(ref, () => ({
    play: () => void elRef.current?.play(),
    pause: () => elRef.current?.pause(),
    seek: (time: number) => {
      if (elRef.current) elRef.current.currentTime = time;
    },
    getCurrentPosition: () => Promise.resolve(elRef.current?.currentTime ?? 0),
  }));

  const src = useMemo(() => {
    if (streamUrl) return streamUrl;
    const base = `https://stream.mux.com/${playbackId}.m3u8`;
    return token ? `${base}?token=${token}` : base;
  }, [streamUrl, playbackId, token]);

  // Declarative attributes (setAttribute survives the custom-element upgrade, so
  // this works whether or not the CDN module has loaded yet).
  useEffect(() => {
    const el = elRef.current;
    if (!el) return;
    el.setAttribute('src', src);
    el.setAttribute('stream-type', 'on-demand');
    el.setAttribute('playsinline', '');
    if (videoTitle) el.setAttribute('metadata-video-title', videoTitle);
    if (videoId || playbackId) el.setAttribute('metadata-video-id', videoId || playbackId);
    if (muxEnvKey) el.setAttribute('env-key', muxEnvKey);
  }, [src, videoTitle, videoId, playbackId]);

  // Media events → the same callbacks the native player fires.
  useEffect(() => {
    const el = elRef.current;
    if (!el) return;
    const onTime = () =>
      onProgress?.({
        currentTime: el.currentTime,
        playableDuration: el.duration || 0,
        seekableDuration: el.duration || 0,
      });
    // Report the real frame size so the desktop stage can fit the format
    // (landscape episodes get a wide stage instead of the portrait reel).
    const reportLoad = () => {
      const v = findVideo(el);
      onLoad?.({
        currentTime: el.currentTime,
        duration: el.duration || 0,
        naturalSize: {
          width: v?.videoWidth ?? 0,
          height: v?.videoHeight ?? 0,
          orientation: (v?.videoWidth ?? 0) > (v?.videoHeight ?? 0) ? 'landscape' : 'portrait',
        },
        audioTracks: [],
        textTracks: [],
      } as unknown as OnLoadData);
      onReady?.();
    };
    const onEnded = () => onEnd?.();
    el.addEventListener('timeupdate', onTime);
    el.addEventListener('loadedmetadata', reportLoad);
    // 'resize' fires when dimensions become known (often after loadedmetadata
    // for HLS) — re-report so a late-resolved aspect still reaches the stage.
    el.addEventListener('resize', reportLoad);
    el.addEventListener('ended', onEnded);
    return () => {
      el.removeEventListener('timeupdate', onTime);
      el.removeEventListener('loadedmetadata', reportLoad);
      el.removeEventListener('resize', reportLoad);
      el.removeEventListener('ended', onEnded);
    };
  }, [onProgress, onLoad, onReady, onEnd]);

  // Drive play/pause once the element has upgraded (methods exist after the CDN
  // module defines the custom element). Autoplay policy → retry muted.
  useEffect(() => {
    let cancelled = false;
    const run = () => {
      const el = elRef.current;
      if (!el || cancelled) return;
      if (paused) {
        el.pause();
      } else {
        const p = el.play();
        if (p && typeof (p as Promise<void>).catch === 'function') {
          (p as Promise<void>).catch(() => {
            el.muted = true;
            void el.play();
          });
        }
      }
    };
    const wd = (globalThis as { customElements?: CustomElementRegistry }).customElements;
    if (wd?.whenDefined) wd.whenDefined('mux-player').then(run);
    else run();
    return () => {
      cancelled = true;
    };
  }, [paused, src]);

  useEffect(() => {
    const el = elRef.current;
    if (el) el.muted = muted;
  }, [muted]);

  useEffect(() => {
    const el = elRef.current;
    if (el && !paused) el.playbackRate = rate;
  }, [rate, paused]);

  return (
    <View style={{ flex: 1, backgroundColor: '#000' }} pointerEvents="box-none">
      <mux-player ref={elRef} style={{ width: '100%', height: '100%', display: 'block' }} />
    </View>
  );
});
