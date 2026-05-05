import { forwardRef, useCallback, useImperativeHandle, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import Video from 'react-native-video';
import type { OnLoadData, OnProgressData, OnVideoErrorData, VideoRef } from 'react-native-video';
import muxReactNativeVideo from '@mux/mux-data-react-native-video';
import Constants from 'expo-constants';

const MuxVideo = muxReactNativeVideo(Video);

export type VideoPlayerRef = {
  play: () => void;
  pause: () => void;
  seek: (time: number) => void;
  getCurrentPosition: () => Promise<number>;
};

export type VideoPlayerProps = {
  playbackId: string;
  token?: string;
  paused?: boolean;
  onProgress?: (data: OnProgressData) => void;
  onEnd?: () => void;
  onLoad?: (data: OnLoadData) => void;
  onReady?: () => void;
  videoTitle?: string;
  videoId?: string;
};

type PlayerState = 'loading' | 'ready' | 'error' | 'buffering';

const muxEnvKey = Constants.expoConfig?.extra?.muxEnvKey || '';

export const VideoPlayer = forwardRef<VideoPlayerRef, VideoPlayerProps>(function VideoPlayer(
  { playbackId, token, paused = false, onProgress, onEnd, onLoad, onReady, videoTitle, videoId },
  ref,
) {
  const videoRef = useRef<VideoRef>(null);
  const [state, setState] = useState<PlayerState>('loading');
  const [errorMessage, setErrorMessage] = useState('');

  useImperativeHandle(ref, () => ({
    play: () => videoRef.current?.resume(),
    pause: () => videoRef.current?.pause(),
    seek: (time: number) => videoRef.current?.seek(time),
    getCurrentPosition: () => videoRef.current?.getCurrentPosition() ?? Promise.resolve(0),
  }));

  const uri = useMemo(() => {
    const base = `https://stream.mux.com/${playbackId}.m3u8`;
    return token ? `${base}?token=${token}` : base;
  }, [playbackId, token]);

  const muxOptions = useMemo(
    () => ({
      application_name: 'CineDramas',
      data: {
        env_key: muxEnvKey,
        player_name: 'main-player',
        video_id: videoId || playbackId,
        video_title: videoTitle || '',
      },
    }),
    [playbackId, videoId, videoTitle],
  );

  const handleLoad = useCallback(
    (data: OnLoadData) => {
      setState('ready');
      onLoad?.(data);
    },
    [onLoad],
  );

  const handleReadyForDisplay = useCallback(() => {
    onReady?.();
  }, [onReady]);

  const handleBuffer = useCallback(({ isBuffering }: { isBuffering: boolean }) => {
    setState((prev) => (isBuffering ? 'buffering' : prev === 'buffering' ? 'ready' : prev));
  }, []);

  const handleError = useCallback((error: OnVideoErrorData) => {
    setState('error');
    setErrorMessage(error.error?.errorString || 'Playback failed');
  }, []);

  const handleProgress = useCallback(
    (data: OnProgressData) => {
      onProgress?.(data);
    },
    [onProgress],
  );

  const handleEnd = useCallback(() => {
    onEnd?.();
  }, [onEnd]);

  if (state === 'error') {
    return (
      <View style={styles.overlay}>
        <Text style={styles.errorText}>{errorMessage}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <MuxVideo
        ref={videoRef}
        source={{ uri }}
        style={styles.video}
        resizeMode="contain"
        paused={paused}
        onLoad={handleLoad}
        onReadyForDisplay={handleReadyForDisplay}
        onBuffer={handleBuffer}
        onError={handleError}
        onProgress={handleProgress}
        onEnd={handleEnd}
        progressUpdateInterval={250}
        muxOptions={muxOptions}
      />
      {(state === 'loading' || state === 'buffering') && (
        <View style={styles.overlay}>
          <ActivityIndicator size="large" color="#fff" />
        </View>
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  video: {
    flex: 1,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  errorText: {
    color: '#ff4444',
    fontSize: 14,
    textAlign: 'center',
    paddingHorizontal: 24,
  },
});
