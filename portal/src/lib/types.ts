export interface Episode {
  id: string;
  season_id: string;
  title: string;
  description: string | null;
  order: number;
  is_free: boolean;
  coin_cost: number;
  mux_asset_id: string | null;
  mux_playback_id: string | null;
  mux_asset_status: 'pending' | 'preparing' | 'ready' | 'errored';
  duration_seconds: number | null;
}

export interface Season {
  id: string;
  series_id: string;
  number: number;
  title: string | null;
  episodes: Episode[];
}

export interface Series {
  id: string;
  title: string;
  description: string | null;
  category: string;
  is_featured: boolean;
  status: 'draft' | 'published' | 'archived';
  thumbnail_playback_id: string | null;
  seasons: Season[];
}

export interface TenantConfig {
  tenant_id: string;
  name: string;
  theme: {
    accent?: string;
    primary?: string;
    background?: string;
  };
}
