import { useState } from 'react';
import { Button } from '@repo/ui';
import { X, Filter } from 'lucide-react';

type ClubFiltersProps = {
  onFilterChange: (filters: {
    genres: string[];
    frequency: number | null;
    minPoints: number | null;
  }) => void;
  onReset: () => void;
};

const GENRE_OPTIONS = [
  'Fiction',
  'Non-Fiction',
  'Mystery',
  'Thriller',
  'Romance',
  'Science Fiction',
  'Fantasy',
  'Biography',
  'History',
  'Self-Help',
];

export function ClubFilters({ onFilterChange, onReset }: ClubFiltersProps) {
  const [selectedGenres, setSelectedGenres] = useState<string[]>([]);
  const [maxFrequency, setMaxFrequency] = useState<number | null>(null);
  const [maxPoints, setMaxPoints] = useState<number | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  const toggleGenre = (genre: string) => {
    const newGenres = selectedGenres.includes(genre)
      ? selectedGenres.filter((g) => g !== genre)
      : [...selectedGenres, genre];
    
    setSelectedGenres(newGenres);
    onFilterChange({
      genres: newGenres,
      frequency: maxFrequency,
      minPoints: maxPoints,
    });
  };

  const handleFrequencyChange = (value: string) => {
    const freq = value === '' ? null : parseInt(value);
    setMaxFrequency(freq);
    onFilterChange({
      genres: selectedGenres,
      frequency: freq,
      minPoints: maxPoints,
    });
  };

  const handlePointsChange = (value: string) => {
    const points = value === '' ? null : parseInt(value);
    setMaxPoints(points);
    onFilterChange({
      genres: selectedGenres,
      frequency: maxFrequency,
      minPoints: points,
    });
  };

  const handleReset = () => {
    setSelectedGenres([]);
    setMaxFrequency(null);
    setMaxPoints(null);
    onReset();
  };

  const hasActiveFilters = selectedGenres.length > 0 || maxFrequency !== null || maxPoints !== null;

  return (
    <div className="mb-6">
      <div className="flex items-center justify-between mb-4">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowFilters(!showFilters)}
          className="flex items-center gap-2"
          data-testid="button-toggle-filters"
        >
          <Filter className="h-4 w-4" />
          <span>{showFilters ? 'Hide' : 'Show'} Filters</span>
        </Button>

        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleReset}
            className="flex items-center gap-2"
            data-testid="button-reset-filters"
          >
            <X className="h-4 w-4" />
            <span>Clear Filters</span>
          </Button>
        )}
      </div>

      {showFilters && (
        <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg space-y-4">
          {/* Genres */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Genres
            </label>
            <div className="flex flex-wrap gap-2">
              {GENRE_OPTIONS.map((genre) => (
                <button
                  key={genre}
                  onClick={() => toggleGenre(genre)}
                  className={`px-3 py-1 rounded-full text-sm transition-colors ${
                    selectedGenres.includes(genre)
                      ? 'bg-blue-600 text-white'
                      : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 hover:border-blue-600 dark:hover:border-blue-400'
                  }`}
                  data-testid={`genre-${genre.toLowerCase().replace(/\s+/g, '-')}`}
                >
                  {genre}
                </button>
              ))}
            </div>
          </div>

          {/* Reading Frequency */}
          <div>
            <label htmlFor="frequency" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Max Reading Frequency (books/year)
            </label>
            <input
              id="frequency"
              type="number"
              min="1"
              max="12"
              value={maxFrequency || ''}
              onChange={(e) => handleFrequencyChange(e.target.value)}
              placeholder="Any frequency"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              data-testid="input-frequency"
            />
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Find clubs that read up to this many books per year
            </p>
          </div>

          {/* Points to Join */}
          <div>
            <label htmlFor="points" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Max Points Required to Join
            </label>
            <input
              id="points"
              type="number"
              min="0"
              value={maxPoints || ''}
              onChange={(e) => handlePointsChange(e.target.value)}
              placeholder="Any points requirement"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              data-testid="input-points"
            />
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Find clubs you can join with your current points
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
