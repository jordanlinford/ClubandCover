import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card } from '@repo/ui';
import { Button } from '@repo/ui';
import { RefreshCw, Sparkles } from 'lucide-react';
import { api } from '../../lib/api';
import type { MatchResult } from '@repo/types';
import { Link } from 'wouter';

interface RecommendedMatchesProps {
  entityType: 'BOOK' | 'CLUB';
  id: string;
}

export function RecommendedMatches({ entityType, id }: RecommendedMatchesProps) {
  const [debounceId, setDebounceId] = useState(id);

  // Debounce ID changes (300ms)
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebounceId(id);
    }, 300);
    return () => clearTimeout(timer);
  }, [id]);

  const {
    data: matches,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['/api/ai/match', entityType, debounceId],
    queryFn: async () => {
      const request = entityType === 'BOOK' 
        ? { bookId: debounceId }
        : { clubId: debounceId };
      return api.getMatches(request);
    },
    enabled: !!debounceId,
    retry: false,
  });

  if (isLoading) {
    return (
      <Card className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <Sparkles className="w-5 h-5 text-primary" />
          <h3 className="text-lg font-semibold">
            Recommended {entityType === 'BOOK' ? 'Clubs' : 'Books'}
          </h3>
        </div>
        <div className="flex items-center justify-center py-8 text-sm text-muted-foreground">
          Finding matches...
        </div>
      </Card>
    );
  }

  if (error) {
    const errorMessage = (error as Error).message || 'Failed to load recommendations';
    const is501 = errorMessage.includes('501') || errorMessage.includes('not available');
    const is429 = errorMessage.includes('429') || errorMessage.includes('rate limit');

    if (is501 || is429) {
      return null; // Hide panel when AI is disabled or rate limited
    }

    return (
      <Card className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <Sparkles className="w-5 h-5 text-primary" />
          <h3 className="text-lg font-semibold">
            Recommended {entityType === 'BOOK' ? 'Clubs' : 'Books'}
          </h3>
        </div>
        <div className="text-center py-8">
          <p className="text-sm text-muted-foreground mb-4">
            Failed to load recommendations
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            data-testid="button-retry-matches"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Retry
          </Button>
        </div>
      </Card>
    );
  }

  if (!matches || matches.length === 0) {
    return (
      <Card className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <Sparkles className="w-5 h-5 text-primary" />
          <h3 className="text-lg font-semibold">
            Recommended {entityType === 'BOOK' ? 'Clubs' : 'Books'}
          </h3>
        </div>
        <p className="text-sm text-muted-foreground text-center py-8">
          No recommendations yet. Try adding genres or a blurb.
        </p>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <div className="flex items-center gap-2 mb-4">
        <Sparkles className="w-5 h-5 text-primary" />
        <h3 className="text-lg font-semibold">
          Recommended {entityType === 'BOOK' ? 'Clubs' : 'Books'}
        </h3>
      </div>
      
      <div className="space-y-3">
        {matches.map((match: MatchResult) => (
          <Link
            key={match.id}
            href={match.type === 'BOOK' ? `/books/${match.id}` : `/clubs/${match.id}`}
          >
            <div
              className="p-3 border rounded-md hover-elevate active-elevate-2 cursor-pointer transition-colors"
              data-testid={`match-${match.type.toLowerCase()}-${match.id}`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <h4 className="font-medium text-sm truncate" data-testid={`text-match-name-${match.id}`}>
                    {match.name}
                  </h4>
                  <p className="text-xs text-muted-foreground mt-1" data-testid={`text-match-why-${match.id}`}>
                    {match.why}
                  </p>
                </div>
                <div className="flex-shrink-0">
                  <span 
                    className="inline-flex items-center px-2 py-1 rounded-md bg-primary/10 text-primary text-xs font-medium"
                    data-testid={`text-match-score-${match.id}`}
                  >
                    {Math.round(match.score * 100)}%
                  </span>
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </Card>
  );
}
