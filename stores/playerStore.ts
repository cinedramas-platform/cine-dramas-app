import { create } from 'zustand';

type PlayerState = {
  currentEpisodeId: string | null;
  positionSeconds: number;
  durationSeconds: number;
  isPlaying: boolean;
  setEpisode: (episodeId: string) => void;
  setPosition: (seconds: number) => void;
  setDuration: (seconds: number) => void;
  setIsPlaying: (playing: boolean) => void;
  reset: () => void;
};

const initialState = {
  currentEpisodeId: null as string | null,
  positionSeconds: 0,
  durationSeconds: 0,
  isPlaying: false,
};

export const usePlayerStore = create<PlayerState>((set) => ({
  ...initialState,
  setEpisode: (currentEpisodeId) =>
    set({ currentEpisodeId, positionSeconds: 0, durationSeconds: 0 }),
  setPosition: (positionSeconds) => set({ positionSeconds }),
  setDuration: (durationSeconds) => set({ durationSeconds }),
  setIsPlaying: (isPlaying) => set({ isPlaying }),
  reset: () => set(initialState),
}));
