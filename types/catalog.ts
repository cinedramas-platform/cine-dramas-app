export interface Series {
  id: string;
  title: string;
  description: string | null;
  thumbnail_playback_id: string | null;
  category: string;
  tags: string[];
  is_featured: boolean;
  sort_order: number;
  created_at: string;
}

export interface Season {
  id: string;
  number: number;
  title: string | null;
  created_at: string;
  episodes: Episode[];
}

export interface Episode {
  id: string;
  title: string;
  description: string | null;
  mux_playback_id: string | null;
  mux_asset_status: 'pending' | 'preparing' | 'ready' | 'errored';
  duration_seconds: number | null;
  order: number;
  is_free: boolean;
  thumbnail_time: number;
  created_at: string;
}

export interface SeriesDetail extends Series {
  seasons: Season[];
}

export interface FeaturedResponse {
  featured: Series[];
  categories: Record<string, Series[]>;
  rails_order: string[];
}

export interface PaginatedResponse<T> {
  data: T[];
  page: number;
  limit: number;
  total: number;
}
