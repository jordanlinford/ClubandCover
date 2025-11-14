import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRoute, Link } from 'wouter';
import { Card } from '@repo/ui';
import { Button } from '@repo/ui';
import { PageHeader } from '@repo/ui';
import { api } from '../../lib/api';
import { ThumbsUp, BookOpen, ExternalLink, User, Search, Filter, Sparkles } from 'lucide-react';

type Pitch = {
  id: string;
  title: string;
  synopsis: string | null;
  sampleUrl: string | null;
  status: string;
  genres: string[];
  createdAt: string;
  author: {
    id: string;
    name: string;
    avatarUrl: string | null;
  };
  book: {
    id: string;
    title: string;
    author: string;
    imageUrl: string | null;
    genres: string[];
  };
};

type NominationData = {
  count: number;
  userNominated: boolean;
};

export function PitchBrowserPage() {
  const [, params] = useRoute('/clubs/:id/pitches');
  const clubId = params?.id || '';
  const queryClient = useQueryClient();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [genreFilter, setGenreFilter] = useState<string>('');
  const [sortBy, setSortBy] = useState<'nominations' | 'recent' | 'boosted'>('nominations');

  const { data: club } = useQuery<{ name: string }>({
    queryKey: ['/api/clubs', clubId],
    enabled: !!clubId,
  });

  const { data: pitchesData, isLoading } = useQuery({
    queryKey: ['/api/pitches', { targetClubId: clubId, search: searchQuery, genre: genreFilter }],
    queryFn: async () => {
      const params = new URLSearchParams({
        targetClubId: clubId,
        status: 'SUBMITTED',
        limit: '50',
      });
      
      if (searchQuery) params.append('search', searchQuery);
      if (genreFilter) params.append('genre', genreFilter);
      
      const result = await api.get<{
        pitches: Pitch[];
        total: number;
      }>(`/pitches?${params.toString()}`);
      
      // Load nomination data for each pitch
      const pitchesWithNominations = await Promise.all(
        result.pitches.map(async (pitch) => {
          const nominationData = await api.get<NominationData>(
            `/pitches/${pitch.id}/nominations`
          );
          return {
            ...pitch,
            nominationCount: nominationData.count,
            userNominated: nominationData.userNominated,
          };
        })
      );
      
      // Client-side sorting
      const sortedPitches = [...pitchesWithNominations].sort((a, b) => {
        if (sortBy === 'nominations') {
          return b.nominationCount - a.nominationCount;
        } else if (sortBy === 'recent') {
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        }
        // 'boosted' is already handled by API ordering
        return 0;
      });
      
      return {
        ...result,
        pitches: sortedPitches,
      };
    },
    enabled: !!clubId,
  });

  const nominateMutation = useMutation({
    mutationFn: (pitchId: string) =>
      api.post<{ nominated: boolean; nominationCount: number }>(
        `/pitches/${pitchId}/nominate`,
        {}
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ 
        queryKey: ['/api/pitches', { targetClubId: clubId }] 
      });
    },
  });

  const handleNominate = (pitchId: string) => {
    nominateMutation.mutate(pitchId);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
        <div className="max-w-5xl mx-auto">
          <p className="text-gray-600 dark:text-gray-400">Loading pitches...</p>
        </div>
      </div>
    );
  }

  // Get unique genres from all pitches for filter dropdown
  const availableGenres = Array.from(
    new Set(
      (pitchesData?.pitches || []).flatMap(p => p.book.genres || p.genres || [])
    )
  ).sort();
  
  const topNominated = pitchesData?.pitches
    .filter(p => (p as any).nominationCount > 0)
    .slice(0, 5) || [];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-5xl mx-auto p-6">
        <PageHeader
          title={`Browse Pitches - ${club?.name || 'Club'}`}
          description="Discover and nominate books for the club to read"
        />

        {/* Filters and Actions */}
        <Card className="p-4 mt-6">
          <div className="flex flex-col gap-4">
            <div className="flex gap-4 items-center flex-wrap">
              {/* Search */}
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <input
                  type="text"
                  placeholder="Search by title or author..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border rounded-md"
                  data-testid="input-search-pitches"
                />
              </div>

              {/* Genre Filter */}
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-muted-foreground" />
                <select
                  value={genreFilter}
                  onChange={(e) => setGenreFilter(e.target.value)}
                  className="px-3 py-2 border rounded-md"
                  data-testid="select-genre-filter"
                >
                  <option value="">All Genres</option>
                  {availableGenres.map(genre => (
                    <option key={genre} value={genre}>{genre}</option>
                  ))}
                </select>
              </div>

              {/* Sort */}
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Sort:</span>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="px-3 py-2 border rounded-md"
                  data-testid="select-sort-by"
                >
                  <option value="nominations">Most Nominated</option>
                  <option value="recent">Most Recent</option>
                  <option value="boosted">Boosted First</option>
                </select>
              </div>
            </div>

            {/* Create Poll from Nominations */}
            {topNominated.length >= 2 && (
              <Link href={`/clubs/${clubId}/create-poll?fromNominations=true`}>
                <Button
                  variant="default"
                  className="flex items-center gap-2"
                  data-testid="button-create-poll-from-nominations"
                >
                  <Sparkles className="h-4 w-4" />
                  Create Poll from Top {Math.min(topNominated.length, 5)} Nominations
                </Button>
              </Link>
            )}
          </div>
        </Card>

        {pitchesData && pitchesData.pitches.length === 0 && (
          <Card className="p-8 text-center mt-6">
            <BookOpen className="h-12 w-12 mx-auto mb-4 text-gray-400" />
            <p className="text-gray-600 dark:text-gray-400">
              {searchQuery || genreFilter ? 'No pitches match your filters' : 'No pitches submitted to this club yet'}
            </p>
          </Card>
        )}

        <div className="mt-6 space-y-4">
          {pitchesData?.pitches.map((pitch) => {
            const nominationCount = (pitch as any).nominationCount || 0;
            const userNominated = (pitch as any).userNominated || false;
            
            return (
              <Card key={pitch.id} className="p-6">
                <div className="flex gap-6">
                  {/* Book Cover */}
                  {pitch.book.imageUrl && (
                    <div className="w-24 h-36 flex-shrink-0">
                      <img
                        src={pitch.book.imageUrl}
                        alt={pitch.book.title}
                        className="w-full h-full object-cover rounded-md"
                      />
                    </div>
                  )}

                  {/* Pitch Details */}
                  <div className="flex-1">
                    <h3 className="text-xl font-semibold mb-2 text-gray-900 dark:text-gray-100">
                      {pitch.title}
                    </h3>

                    <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400 mb-2">
                      <div className="flex items-center gap-2">
                        <BookOpen className="h-4 w-4" />
                        <span>{pitch.book.title}</span>
                      </div>
                      <span>by {pitch.book.author}</span>
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4" />
                        <span>Pitched by {pitch.author.name}</span>
                      </div>
                    </div>
                    
                    {/* Genres */}
                    {(pitch.book.genres || pitch.genres)?.length > 0 && (
                      <div className="flex gap-1 mb-3 flex-wrap">
                        {(pitch.book.genres || pitch.genres).slice(0, 3).map((genre) => (
                          <span
                            key={genre}
                            className="px-2 py-0.5 rounded-md text-xs border"
                          >
                            {genre}
                          </span>
                        ))}
                      </div>
                    )}

                    {pitch.synopsis && (
                      <p className="text-gray-700 dark:text-gray-300 mb-4 line-clamp-3">
                        {pitch.synopsis}
                      </p>
                    )}

                    <div className="flex items-center gap-3">
                      <Button
                        onClick={() => handleNominate(pitch.id)}
                        variant={userNominated ? 'default' : 'outline'}
                        className="flex items-center gap-2"
                        disabled={nominateMutation.isPending}
                        data-testid={`button-nominate-${pitch.id}`}
                      >
                        <ThumbsUp className="h-4 w-4" />
                        <span>{userNominated ? 'Nominated' : 'Nominate'}</span>
                        {nominationCount > 0 && (
                          <span className="ml-1 px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-xs">
                            {nominationCount}
                          </span>
                        )}
                      </Button>

                      {pitch.sampleUrl && (
                        <a
                          href={pitch.sampleUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 text-blue-600 dark:text-blue-400 hover:underline text-sm"
                        >
                          <ExternalLink className="h-4 w-4" />
                          <span>Read Sample</span>
                        </a>
                      )}

                      <span className="ml-auto text-sm text-gray-500 dark:text-gray-400">
                        {new Date(pitch.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}
