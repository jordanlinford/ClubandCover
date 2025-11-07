import { useQuery } from '@tanstack/react-query';
import { Link } from 'wouter';
import { Card } from '@repo/ui';
import { Button } from '@repo/ui';
import { PageHeader } from '@repo/ui';
import type { Pitch } from '@repo/types';
import { PitchCard } from '../../components/PitchCard';
import { useAuth } from '../../contexts/AuthContext';
import { TrendingUp, Sparkles } from 'lucide-react';

interface UserData {
  user: {
    id: string;
    tier: string;
  };
}

export function PitchesListPage() {
  const { user } = useAuth();
  const { data, isLoading } = useQuery<{ pitches: Pitch[]; total: number }>({
    queryKey: ['/api/pitches'],
  });

  const { data: userData } = useQuery<UserData>({
    queryKey: ['/api/user/me'],
    enabled: !!user,
  });

  const pitches = data?.pitches || [];
  const myPitches = pitches.filter(p => p.authorId === user?.id);
  const otherPitches = pitches.filter(p => p.authorId !== user?.id);

  // Calculate active pitch count and limit
  const activePitches = myPitches.filter(p => 
    ['SUBMITTED', 'ACCEPTED', 'REJECTED'].includes(p.status)
  );
  
  const tierLimits: Record<string, number> = {
    FREE: 3,
    PRO_AUTHOR: 10,
    PRO_CLUB: 10,
    PUBLISHER: 999,
  };
  
  const userTier = userData?.user?.tier || 'FREE';
  const pitchLimit = tierLimits[userTier] || 3;
  const isNearLimit = activePitches.length >= pitchLimit * 0.8;
  const isAtLimit = activePitches.length >= pitchLimit;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto p-6">
        <div className="flex justify-between items-center mb-6">
          <PageHeader
            title="Book Pitches"
            description="Browse and submit book pitches to clubs"
          />
          {user && (
            <Link href="/pitches/new">
              <Button data-testid="button-add-pitch">Submit Pitch</Button>
            </Link>
          )}
        </div>

        {user && (
          <Card className="p-4 mb-6" data-testid="card-pitch-stats">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <TrendingUp className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">
                    Active Pitches: {activePitches.length} / {pitchLimit === 999 ? '∞' : pitchLimit}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {userTier === 'FREE' ? 'Free Tier' : userTier === 'PRO_AUTHOR' ? 'Pro Author' : userTier === 'PUBLISHER' ? 'Publisher' : userTier}
                  </p>
                </div>
              </div>
              {isNearLimit && userTier !== 'PUBLISHER' && (
                <Link href="/billing">
                  <Button variant={isAtLimit ? 'default' : 'outline'} size="sm" data-testid="button-upgrade-pitches">
                    <Sparkles className="h-4 w-4 mr-2" />
                    {isAtLimit ? 'Upgrade for More' : 'Upgrade'}
                  </Button>
                </Link>
              )}
            </div>
            {isNearLimit && userTier !== 'PUBLISHER' && (
              <div className="mt-3 pt-3 border-t border-border">
                <p className="text-xs text-muted-foreground">
                  {isAtLimit 
                    ? `You've reached your pitch limit. Upgrade to ${userTier === 'FREE' ? 'Pro Author for 10 pitches' : 'Publisher for unlimited pitches'}.`
                    : `You're using ${Math.round((activePitches.length / pitchLimit) * 100)}% of your pitch limit.`
                  }
                </p>
              </div>
            )}
          </Card>
        )}

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => (
              <Card key={i} className="p-6 animate-pulse">
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-2"></div>
                <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
              </Card>
            ))}
          </div>
        ) : (
          <>
            {user && myPitches.length > 0 && (
              <div className="mb-8">
                <h2 className="text-xl font-semibold mb-4">My Pitches</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {myPitches.map((pitch) => (
                    <PitchCard key={pitch.id} pitch={pitch} />
                  ))}
                </div>
              </div>
            )}

            {otherPitches.length > 0 && (
              <div>
                <h2 className="text-xl font-semibold mb-4">All Pitches</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {otherPitches.map((pitch) => (
                    <PitchCard key={pitch.id} pitch={pitch} />
                  ))}
                </div>
              </div>
            )}

            {pitches && pitches.length === 0 && (
              <Card className="p-12 text-center">
                <p className="text-gray-600 dark:text-gray-400 mb-4">
                  No pitches yet. Be the first to pitch a book!
                </p>
                {user && (
                  <Link href="/pitches/new">
                    <Button data-testid="button-add-first-pitch">Submit Your First Pitch</Button>
                  </Link>
                )}
              </Card>
            )}
          </>
        )}
      </div>
    </div>
  );
}
