import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { TrendingUp, Book as BookIcon, Users, Lightbulb } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface TrendingGridProps {
  type: 'book' | 'club' | 'pitch';
  limit?: number;
  onItemClick?: (id: string) => void;
}

export function TrendingGrid({ type, limit = 6, onItemClick }: TrendingGridProps) {
  const { data: items = [], isLoading } = useQuery({
    queryKey: ['/api/discover/trending', type, limit],
    queryFn: () => api.getTrending({ type, limit }),
  });

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: limit }).map((_, i) => (
          <div
            key={i}
            className="h-48 bg-gray-100 dark:bg-gray-800 rounded-lg animate-pulse"
            data-testid={`skeleton-trending-${i}`}
          />
        ))}
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-gray-500 dark:text-gray-400">
        <TrendingUp className="h-12 w-12 mb-4 opacity-50" />
        <p className="text-sm">No trending {type}s yet</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4" data-testid={`grid-trending-${type}`}>
      {items.map((item, index) => {
        const title = item.title || item.name || 'Untitled';
        const imageUrl = item.imageUrl;
        const Icon = type === 'book' ? BookIcon : type === 'club' ? Users : Lightbulb;

        return (
          <button
            key={item.id}
            onClick={() => onItemClick?.(item.id)}
            className="group relative overflow-hidden rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:shadow-lg transition-all duration-200"
            data-testid={`card-trending-${type}-${item.id}`}
          >
            {/* Rank Badge */}
            <div className="absolute top-2 left-2 z-10 flex items-center justify-center w-8 h-8 bg-yellow-500 text-white font-bold text-sm rounded-full shadow-md">
              {index + 1}
            </div>

            {/* Image or Placeholder */}
            <div className="relative h-40 bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20">
              {imageUrl ? (
                <img
                  src={imageUrl}
                  alt={title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                />
              ) : (
                <div className="flex items-center justify-center h-full text-gray-400 dark:text-gray-600">
                  <Icon className="h-16 w-16" />
                </div>
              )}
              
              {/* Trending Badge */}
              <div className="absolute bottom-2 right-2 flex items-center gap-1 px-2 py-1 bg-red-500 text-white text-xs font-semibold rounded-full shadow-md">
                <TrendingUp className="h-3 w-3" />
                <span>Trending</span>
              </div>
            </div>

            {/* Content */}
            <div className="p-4">
              <h3 className="font-semibold text-gray-900 dark:text-gray-100 text-sm line-clamp-2 mb-2">
                {title}
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Added {formatDistanceToNow(new Date(item.createdAt), { addSuffix: true })}
              </p>
            </div>
          </button>
        );
      })}
    </div>
  );
}
