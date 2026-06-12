import { create } from 'zustand';

type PlayerState = {
  currentEpisodeId: string | null;
  positionSeconds: number;
  durationSeconds: number;
  isPlaying: boolean;
  /** width/height of the ACTIVE episode's video, from load metadata. null until known. */
  videoAspect: number | null;
  setEpisode: (episodeId: string) => void;
  setPosition: (seconds: number) => void;
  setDuration: (seconds: number) => void;
  setIsPlaying: (playing: boolean) => void;
  setVideoAspect: (aspect: number | null) => void;
  reset: () => void;
};

const initialState = {
  currentEpisodeId: null as string | null,
  positionSeconds: 0,
  durationSeconds: 0,
  isPlaying: false,
  videoAspect: null as number | null,
};

export const usePlayerStore = create<PlayerState>((set) => ({
  ...initialState,
  setEpisode: (currentEpisodeId) =>
    set({ currentEpisodeId, positionSeconds: 0, durationSeconds: 0, videoAspect: null }),
  setPosition: (positionSeconds) => set({ positionSeconds }),
  setDuration: (durationSeconds) => set({ durationSeconds }),
  setIsPlaying: (isPlaying) => set({ isPlaying }),
  setVideoAspect: (videoAspect) => set({ videoAspect }),
  reset: () => set(initialState),
}));
