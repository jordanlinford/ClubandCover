import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search, Users, BookOpen, Award } from 'lucide-react';
import { Card, Button } from '@repo/ui';
import { AppHeader } from '@/components/AppHeader';
import { Link } from 'wouter';
import { api } from '@/lib/api';

interface AuthorProfile {
  id: string;
  name: string;
  avatarUrl: string | null;
  bio: string | null;
  tier: string;
  createdAt: string;
  profile: {
    genres: string[];
    openToSwaps: boolean;
    booksPerMonth: number | null;
  } | null;
  _count: {
    books: number;
    swapsRequested: number;
  };
}

export default function AuthorDirectory() {
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [onlyOpenToSwaps, setOnlyOpenToSwaps] = useState(false);

  // Proper debouncing with cleanup
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const { data: authors = [], isLoading } = useQuery({
    queryKey: ['/api/users/authors/search', debouncedQuery, onlyOpenToSwaps],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (debouncedQuery) params.append('q', debouncedQuery);
      if (onlyOpenToSwaps) params.append('openToSwaps', 'true');
      
      const queryString = params.toString();
      const endpoint = `/users/authors/search${queryString ? `?${queryString}` : ''}`;
      
      return api.get<AuthorProfile[]>(endpoint);
    },
  });

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <div className="container mx-auto p-6 max-w-6xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Author Directory</h1>
          <p className="text-muted-foreground">
            Find authors to connect with for book swaps and reviews
          </p>
        </div>

        <div className="mb-6 space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <input
              type="text"
              placeholder="Search by name or bio..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
              data-testid="input-author-search"
            />
          </div>

          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="openToSwaps"
              checked={onlyOpenToSwaps}
              onChange={(e) => setOnlyOpenToSwaps(e.target.checked)}
              className="rounded"
              data-testid="checkbox-open-to-swaps"
            />
            <label htmlFor="openToSwaps" className="text-sm font-medium">
              Show only authors open to swaps
            </label>
          </div>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <Card key={i} className="p-6 animate-pulse">
                <div className="h-4 bg-muted rounded w-3/4 mb-4" />
                <div className="h-3 bg-muted rounded w-full mb-2" />
                <div className="h-3 bg-muted rounded w-2/3" />
              </Card>
            ))}
          </div>
        ) : authors.length === 0 ? (
          <Card className="p-12">
            <div className="flex flex-col items-center justify-center">
              <Users className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-lg font-medium text-center">No authors found</p>
              <p className="text-muted-foreground text-center">
                Try adjusting your search filters
              </p>
            </div>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {authors.map((author) => (
              <Card key={author.id} className="p-6" data-testid={`card-author-${author.id}`}>
                <div className="flex items-start gap-4 mb-4">
                  <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-lg">
                    {author.name[0]?.toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <h3 className="text-lg font-semibold">{author.name}</h3>
                      {author.profile?.openToSwaps && (
                        <span className="inline-flex items-center px-2 py-1 text-xs font-medium rounded-md bg-green-100 text-green-800">
                          Open to Swaps
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground capitalize">
                      {author.tier.replace('_', ' ').toLowerCase()}
                    </p>
                  </div>
                </div>

                {author.bio && (
                  <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                    {author.bio}
                  </p>
                )}

                {author.profile?.genres && author.profile.genres.length > 0 && (
                  <div className="flex gap-1 flex-wrap mb-4">
                    {author.profile.genres.slice(0, 3).map((genre) => (
                      <span
                        key={genre}
                        className="inline-flex items-center px-2 py-1 text-xs rounded-md border"
                      >
                        {genre}
                      </span>
                    ))}
                    {author.profile.genres.length > 3 && (
                      <span className="inline-flex items-center px-2 py-1 text-xs rounded-md border">
                        +{author.profile.genres.length - 3}
                      </span>
                    )}
                  </div>
                )}

                <div className="flex gap-4 text-sm text-muted-foreground mb-4">
                  <div className="flex items-center gap-1">
                    <BookOpen className="h-3 w-3" />
                    <span>{author._count.books} books</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Award className="h-3 w-3" />
                    <span>{author._count.swapsRequested} swaps</span>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Link href={`/swaps?new=true&recipient=${author.id}&recipientName=${encodeURIComponent(author.name)}`} className="flex-1">
                    <div className="w-full">
                      <Button 
                        variant="default" 
                        size="sm" 
                        className="w-full" 
                        data-testid={`button-request-swap-${author.id}`}
                      >
                        Request Swap
                      </Button>
                    </div>
                  </Link>
                  <Link href={`/profile/${author.id}`}>
                    <div>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        data-testid={`button-view-profile-${author.id}`}
                      >
                        View Profile
                      </Button>
                    </div>
                  </Link>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
