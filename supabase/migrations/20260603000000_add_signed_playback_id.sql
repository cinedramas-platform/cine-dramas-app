-- Add a separate SIGNED Mux playback ID for gated video streaming.
-- The existing mux_playback_id stays PUBLIC and continues to serve thumbnails/posters
-- (image.mux.com). Video playback uses this signed ID + a JWT from the playback-token
-- edge function, so locked episodes cannot be streamed without an unlock/VIP.
ALTER TABLE public.episodes
  ADD COLUMN IF NOT EXISTS mux_signed_playback_id TEXT;
