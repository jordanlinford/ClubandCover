import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { TrendingGrid } from '@/components/TrendingGrid';
import { SearchBar } from '@/components/SearchBar';
import { ClubFilters } from '@/components/ClubFilters';
import { AppHeader } from '@/components/AppHeader';
import { useLocation } from 'wouter';
import { TrendingUp, BookOpen, Users, Lightbulb, Plus } from 'lucide-react';
import { Card, Button } from '@repo/ui';
import { api } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';

type ClubFilters = {
  genres: string[];
  frequency: number | null;
  minPoints: number | null;
};

export default function Discover() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'books' | 'clubs' | 'pitches'>('books');
  const [clubFilters, setClubFilters] = useState<ClubFilters>({
    genres: [],
    frequency: null,
    minPoints: null,
  });

  // Search clubs with filters
  const { data: filteredClubs, isLoading: clubsLoading, error: clubsError } = useQuery({
    queryKey: ['/api/clubs/search', clubFilters],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (clubFilters.genres.length > 0) {
        clubFilters.genres.forEach((genre) => params.append('genres', genre));
      }
      if (clubFilters.frequency) {
        params.set('frequency', clubFilters.frequency.toString());
      }
      if (clubFilters.minPoints !== null) {
        params.set('minPoints', clubFilters.minPoints.toString());
      }
      
      const url = `/clubs/search${params.toString() ? `?${params.toString()}` : ''}`;
      const response = await api.get<{
        success: boolean;
        data: {
          clubs: Array<{
            id: string;
            name: string;
            description: string | null;
            preferredGenres: string[];
            frequency: number | null;
            minPointsToJoin: number;
            coverImageUrl: string | null;
            _count: { memberships: number };
          }>;
          pagination: {
            page: number;
            limit: number;
            total: number;
            totalPages: number;
          };
        };
        error?: string;
      }>(url);
      
      if (!response.success) {
        throw new Error(response.error || 'Failed to search clubs');
      }
      
      return response.data;
    },
    enabled: activeTab === 'clubs',
  });

  const hasActiveFilters = clubFilters.genres.length > 0 || clubFilters.frequency !== null || clubFilters.minPoints !== null;

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
    <div className="min-h-screen bg-background">
      <AppHeader />
      <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8 py-8" data-testid="page-discover">
        {/* Page Header */}
        <div className="pb-8 border-b mb-8">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <TrendingUp className="h-8 w-8 text-primary" />
              <h1 className="text-3xl md:text-4xl font-semibold tracking-tight">
                Discover
              </h1>
            </div>
            {user && (
              <Button
                onClick={() => setLocation('/clubs/new')}
                className="gap-2"
                data-testid="button-create-club"
              >
                <Plus className="h-4 w-4" />
                Create Club
              </Button>
            )}
          </div>
          <p className="text-lg text-muted-foreground mb-6">
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
          <div className="flex gap-2 border-b" data-testid="tabs-discover">
          <button
            onClick={() => setActiveTab('books')}
            className={`flex items-center gap-2 px-4 py-2 border-b-2 transition-colors ${
              activeTab === 'books'
                ? 'border-primary text-primary font-semibold'
                : 'border-transparent text-muted-foreground hover:text-foreground'
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
                ? 'border-primary text-primary font-semibold'
                : 'border-transparent text-muted-foreground hover:text-foreground'
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
                ? 'border-primary text-primary font-semibold'
                : 'border-transparent text-muted-foreground hover:text-foreground'
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
              <h2 className="text-2xl font-semibold mb-4">
                Trending Books
              </h2>
              <TrendingGrid type="book" limit={12} onItemClick={handleItemClick} />
            </div>
          </div>
        )}

        {activeTab === 'clubs' && (
          <div className="space-y-8">
            <ClubFilters
              onFilterChange={setClubFilters}
              onReset={() => setClubFilters({ genres: [], frequency: null, minPoints: null })}
            />

            {hasActiveFilters ? (
              <div>
                <h2 className="text-2xl font-semibold mb-4">
                  {clubsLoading ? 'Searching...' : `${filteredClubs?.pagination.total || 0} Clubs Found`}
                </h2>
                {clubsError ? (
                  <Card className="p-8 text-center">
                    <p className="text-destructive">
                      Failed to search clubs. Please try again.
                    </p>
                  </Card>
                ) : clubsLoading ? (
                  <p className="text-muted-foreground">Loading clubs...</p>
                ) : filteredClubs && filteredClubs.clubs.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredClubs.clubs.map((club) => (
                      <Card
                        key={club.id}
                        className="p-6 cursor-pointer hover-elevate active-elevate-2 transition-all"
                        onClick={() => handleItemClick(club.id)}
                        data-testid={`club-card-${club.id}`}
                      >
                        {club.coverImageUrl && (
                          <div className="w-full h-40 mb-4 rounded-md overflow-hidden">
                            <img
                              src={club.coverImageUrl}
                              alt={club.name}
                              className="w-full h-full object-cover"
                            />
                          </div>
                        )}
                        <h3 className="text-lg font-semibold mb-2">
                          {club.name}
                        </h3>
                        {club.description && (
                          <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                            {club.description}
                          </p>
                        )}
                        <div className="flex flex-wrap gap-2 mb-3">
                          {club.preferredGenres.slice(0, 3).map((genre) => (
                            <span
                              key={genre}
                              className="px-2 py-1 rounded-full bg-primary/10 text-primary text-xs"
                            >
                              {genre}
                            </span>
                          ))}
                        </div>
                        <div className="flex items-center justify-between text-sm text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Users className="h-4 w-4" />
                            <span>{club._count.memberships} members</span>
                          </div>
                          {club.frequency && (
                            <span>{club.frequency} books/year</span>
                          )}
                        </div>
                        {club.minPointsToJoin > 0 && (
                          <div className="mt-2 text-xs text-muted-foreground">
                            Requires {club.minPointsToJoin} points to join
                          </div>
                        )}
                      </Card>
                    ))}
                  </div>
                ) : (
                  <Card className="p-8 text-center">
                    <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                    <p className="text-muted-foreground">
                      No clubs found matching your filters. Try adjusting your search criteria.
                    </p>
                  </Card>
                )}
              </div>
            ) : (
              <div>
                <h2 className="text-2xl font-semibold mb-4">
                  Trending Clubs
                </h2>
                <TrendingGrid type="club" limit={12} onItemClick={handleItemClick} />
              </div>
            )}
          </div>
        )}

        {activeTab === 'pitches' && (
          <div className="space-y-8">
            <div>
              <h2 className="text-2xl font-semibold mb-4">
                Trending Pitches
              </h2>
              <TrendingGrid type="pitch" limit={12} onItemClick={handleItemClick} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
