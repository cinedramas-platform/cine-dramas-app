// Web implementation of VideoPlayer. Same props + ref contract as the native
// version (react-native-video has no web support). Playback = plain <video>
// driven by hls.js (Safari plays HLS natively). Deliberately NOT mux-player:
// its custom-element base class breaks under Metro's class-field transpilation
// ("Cannot set property observedAttributes ... which has only a getter").
import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef } from 'react';
import { View } from 'react-native';
import Hls from 'hls.js';
import type { OnLoadData, OnProgressData } from 'react-native-video';

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
  },
  ref,
) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);

  useImperativeHandle(ref, () => ({
    play: () => void videoRef.current?.play().catch(() => {}),
    pause: () => videoRef.current?.pause(),
    seek: (time: number) => {
      if (videoRef.current) videoRef.current.currentTime = time;
    },
    getCurrentPosition: () => Promise.resolve(videoRef.current?.currentTime ?? 0),
  }));

  const src = useMemo(() => {
    if (streamUrl) return streamUrl;
    const base = `https://stream.mux.com/${playbackId}.m3u8`;
    return token ? `${base}?token=${token}` : base;
  }, [streamUrl, playbackId, token]);

  // Attach the HLS source. Safari plays HLS natively; everywhere else hls.js
  // feeds MediaSource.
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !src) return;

    if (video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = src;
    } else if (Hls.isSupported()) {
      const hls = new Hls();
      hlsRef.current = hls;
      hls.loadSource(src);
      hls.attachMedia(video);
    }

    return () => {
      hlsRef.current?.destroy();
      hlsRef.current = null;
    };
  }, [src]);

  // Browsers gate play() behind autoplay policy — fall back to muted playback;
  // the user's first tap (play toggle) is a gesture and unblocks sound.
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    if (paused) {
      video.pause();
    } else {
      void video.play().catch(() => {
        video.muted = true;
        void video.play().catch(() => {});
      });
    }
  }, [paused, src]);

  useEffect(() => {
    const video = videoRef.current;
    if (video) video.muted = muted;
  }, [muted]);

  useEffect(() => {
    const video = videoRef.current;
    if (video && !paused) video.playbackRate = rate;
  }, [rate, paused]);

  return (
    <View style={{ flex: 1, backgroundColor: '#000' }} pointerEvents="box-none">
      <video
        ref={videoRef}
        playsInline
        style={{ width: '100%', height: '100%', objectFit: 'contain', backgroundColor: '#000' }}
        onTimeUpdate={(e) => {
          const el = e.currentTarget;
          onProgress?.({
            currentTime: el.currentTime,
            playableDuration: el.duration || 0,
            seekableDuration: el.duration || 0,
          });
        }}
        onLoadedMetadata={(e) => {
          const el = e.currentTarget;
          onLoad?.({
            currentTime: el.currentTime,
            duration: el.duration || 0,
            naturalSize: { width: el.videoWidth, height: el.videoHeight, orientation: 'portrait' },
            audioTracks: [],
            textTracks: [],
          } as unknown as OnLoadData);
          onReady?.();
        }}
        onEnded={() => onEnd?.()}
      />
    </View>
  );
});
