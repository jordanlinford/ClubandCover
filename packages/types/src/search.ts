export interface SearchFilters {
  genres?: string[];
  minRating?: number;
  isAvailable?: boolean;
}

export interface SearchResult<T> {
  items: T[];
  total: number;
  hasMore: boolean;
}

export interface SearchParams {
  q?: string;
  genres?: string;
  isAvailable?: string;
  status?: string;
  authorId?: string;
  limit?: string;
  offset?: string;
}

export interface TrendingItem {
  id: string;
  title?: string;
  name?: string;
  imageUrl?: string;
  createdAt: Date;
}

export interface TrendingQuery {
  type: 'book' | 'club' | 'pitch';
  limit?: number;
}
