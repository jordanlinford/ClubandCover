import { useState } from 'react';
import { TrendingGrid } from '@/components/TrendingGrid';
import { SearchBar } from '@/components/SearchBar';
import { useLocation } from 'wouter';
import { TrendingUp, BookOpen, Users, Lightbulb } from 'lucide-react';

export default function Discover() {
  const [, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState<'books' | 'clubs' | 'pitches'>('books');

  const handleItemClick = (id: string) => {
    if (activeTab === 'books') {
      setLocation(`/books/${id}`);
    } else if (activeTab === 'clubs') {
      setLocation(`/clubs/${id}`);
    } else {
      setLocation(`/pitches/${id}`);
    }
  };

  const handleSearchResultClick = (result: any, type: 'book' | 'club' | 'pitch') => {
    if (type === 'book') {
      setLocation(`/books/${result.id}`);
    } else if (type === 'club') {
      setLocation(`/clubs/${result.id}`);
    } else {
      setLocation(`/pitches/${result.id}`);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8 py-8" data-testid="page-discover">
      {/* Page Header */}
      <div className="pb-8 border-b border-gray-200 dark:border-gray-700 mb-8">
        <div className="flex items-center gap-3 mb-4">
          <TrendingUp className="h-8 w-8 text-blue-600 dark:text-blue-400" />
          <h1 className="text-3xl md:text-4xl font-semibold tracking-tight text-gray-900 dark:text-gray-100">
            Discover
          </h1>
        </div>
        <p className="text-lg text-gray-600 dark:text-gray-400 mb-6">
          Explore trending books, clubs, and pitches in the community
        </p>

        {/* Search Bar */}
        <div className="max-w-2xl">
          <SearchBar
            onResultClick={handleSearchResultClick}
            placeholder="Search books, clubs, or pitches..."
          />
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="mb-8">
        <div className="flex gap-2 border-b border-gray-200 dark:border-gray-700" data-testid="tabs-discover">
          <button
            onClick={() => setActiveTab('books')}
            className={`flex items-center gap-2 px-4 py-2 border-b-2 transition-colors ${
              activeTab === 'books'
                ? 'border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400 font-semibold'
                : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100'
            }`}
            data-testid="tab-books"
          >
            <BookOpen className="h-4 w-4" />
            <span>Books</span>
          </button>
          <button
            onClick={() => setActiveTab('clubs')}
            className={`flex items-center gap-2 px-4 py-2 border-b-2 transition-colors ${
              activeTab === 'clubs'
                ? 'border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400 font-semibold'
                : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100'
            }`}
            data-testid="tab-clubs"
          >
            <Users className="h-4 w-4" />
            <span>Clubs</span>
          </button>
          <button
            onClick={() => setActiveTab('pitches')}
            className={`flex items-center gap-2 px-4 py-2 border-b-2 transition-colors ${
              activeTab === 'pitches'
                ? 'border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400 font-semibold'
                : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100'
            }`}
            data-testid="tab-pitches"
          >
            <Lightbulb className="h-4 w-4" />
            <span>Pitches</span>
          </button>
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === 'books' && (
        <div className="space-y-8">
          <div>
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
              Trending Books
            </h2>
            <TrendingGrid type="book" limit={12} onItemClick={handleItemClick} />
          </div>
        </div>
      )}

      {activeTab === 'clubs' && (
        <div className="space-y-8">
          <div>
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
              Trending Clubs
            </h2>
            <TrendingGrid type="club" limit={12} onItemClick={handleItemClick} />
          </div>
        </div>
      )}

      {activeTab === 'pitches' && (
        <div className="space-y-8">
          <div>
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
              Trending Pitches
            </h2>
            <TrendingGrid type="pitch" limit={12} onItemClick={handleItemClick} />
          </div>
        </div>
      )}
    </div>
  );
}
