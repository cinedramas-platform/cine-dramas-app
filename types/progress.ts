export interface WatchProgress {
  id: string;
  episode_id: string;
  position_seconds: number;
  completed: boolean;
  updated_at: string;
  episode_title?: string | null;
  episode_mux_playback_id?: string | null;
  episode_thumbnail_time?: number;
  episode_duration_seconds?: number | null;
}

export interface WatchProgressResponse {
  progress: WatchProgress | null;
}

export interface ContinueWatchingResponse {
  progress: WatchProgress[];
}

export interface UpdateProgressPayload {
  position_seconds: number;
  completed: boolean;
}

export interface UpdateProgressResponse {
  position_seconds: number;
  completed: boolean;
  updated_at: string;
}
