import { Search, X, Book as BookIcon, Users, Lightbulb } from 'lucide-react';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { Book, Club, Pitch, SearchParams } from '@repo/types';

export interface SearchBarProps {
  onResultClick?: (result: Book | Club | Pitch, type: 'book' | 'club' | 'pitch') => void;
  placeholder?: string;
}

export function SearchBar({ onResultClick, placeholder = 'Search books, clubs, and pitches...' }: SearchBarProps) {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);

  const searchParams: SearchParams = {
    q: query,
    limit: '10',
  };

  const { data: results, isLoading } = useQuery({
    queryKey: ['/api/discover/search', query],
    queryFn: () => api.search(searchParams),
    enabled: query.length >= 2,
  });

  const handleResultClick = (item: Book | Club | Pitch, type: 'book' | 'club' | 'pitch') => {
    onResultClick?.(item, type);
    setQuery('');
    setIsOpen(false);
  };

  const handleClear = () => {
    setQuery('');
    setIsOpen(false);
  };

  return (
    <div className="relative w-full max-w-lg">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
        <input
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          placeholder={placeholder}
          className="w-full pl-10 pr-10 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
          data-testid="input-search"
        />
        {query && (
          <button
            onClick={handleClear}
            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
            data-testid="button-clear-search"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {isOpen && query.length >= 2 && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
            data-testid="overlay-search"
          />
          <div className="absolute top-full mt-2 w-full bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 max-h-96 overflow-y-auto z-20">
            {isLoading ? (
              <div className="flex items-center justify-center py-8 text-gray-500 dark:text-gray-400">
                Searching...
              </div>
            ) : !results || results.items.length === 0 ? (
              <div className="flex items-center justify-center py-8 text-gray-500 dark:text-gray-400">
                No results found for "{query}"
              </div>
            ) : (
              <div className="py-2" data-testid="list-search-results">
                {results.items.map((item) => {
                  const isBook = 'isbn' in item;
                  const isClub = 'memberCount' in item;
                  const type = isBook ? 'book' : isClub ? 'club' : 'pitch';
                  const title = 'title' in item ? item.title : 'name' in item ? item.name : 'Unknown';
                  
                  const Icon = type === 'book' ? BookIcon : type === 'club' ? Users : Lightbulb;

                  return (
                    <button
                      key={item.id}
                      onClick={() => handleResultClick(item as Book | Club | Pitch, type)}
                      className="w-full px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors border-b border-gray-100 dark:border-gray-700 last:border-b-0"
                      data-testid={`result-${type}-${item.id}`}
                    >
                      <div className="flex items-start gap-3">
                        <div className="flex-shrink-0 w-8 h-8 rounded bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-gray-600 dark:text-gray-300">
                          <Icon className="h-4 w-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                            {title}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400 capitalize">
                            {type}
                          </p>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
