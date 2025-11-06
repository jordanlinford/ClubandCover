import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useRoute, Link } from 'wouter';
import { Card } from '@repo/ui';
import { Button } from '@repo/ui';
import { PageHeader } from '@repo/ui';
import type { Pitch } from '@repo/types';
import { ArrowLeft, TrendingUp, Zap } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { PitchBoostModal } from '../../components/PitchBoostModal';

export function PitchDetailPage() {
  const [, params] = useRoute('/pitches/:id');
  const pitchId = params?.id;
  const { user } = useAuth();
  const [showBoostModal, setShowBoostModal] = useState(false);

  const { data: pitch, isLoading } = useQuery<Pitch>({
    queryKey: ['/api/pitches', pitchId],
    enabled: !!pitchId,
  });

  const { data: userData } = useQuery({
    queryKey: ['/api/user/me'],
    enabled: !!user,
  });

  const statusColors = {
    PENDING: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
    ACCEPTED: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
    REJECTED: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  };

  const creditBalance = (userData as any)?.creditBalance || 0;
  const isAuthor = pitch && user && (pitch as any).authorId === (user as any).id;
  const isBoosted = pitch && (pitch as any).isBoosted && (pitch as any).boostEndsAt && new Date((pitch as any).boostEndsAt) > new Date();

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-4xl mx-auto p-6">
        <Link href="/pitches">
          <Button variant="outline" size="sm" className="mb-4" data-testid="button-back">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Pitches
          </Button>
        </Link>

        {isLoading ? (
          <Card className="p-6 animate-pulse">
            <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-2/3 mb-4"></div>
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-full mb-2"></div>
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-full mb-2"></div>
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
          </Card>
        ) : pitch ? (
          <>
            <div className="flex justify-between items-start mb-6">
              <PageHeader
                title={pitch.title}
                description={`Submitted ${new Date(pitch.createdAt).toLocaleDateString()}`}
              />
              <div className="flex items-center gap-2">
                {isBoosted && (
                  <span className="text-sm px-3 py-1 rounded-md bg-primary/10 text-primary border border-primary/20 flex items-center gap-1" data-testid="badge-boosted">
                    <Zap className="h-3 w-3" />
                    Boosted
                  </span>
                )}
                <span
                  className={`text-sm px-3 py-1 rounded-md ${statusColors[pitch.status]}`}
                  data-testid="text-status"
                >
                  {pitch.status}
                </span>
              </div>
            </div>

            {isAuthor && (
              <Card className="p-4 mb-4 bg-gradient-to-r from-primary/10 to-primary/5">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold flex items-center gap-2">
                      <TrendingUp className="h-4 w-4 text-primary" />
                      Boost Your Pitch
                    </h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      {isBoosted
                        ? `Active until ${new Date((pitch as any).boostEndsAt).toLocaleDateString()}`
                        : 'Increase visibility in discovery and search results'}
                    </p>
                  </div>
                  <Button
                    onClick={() => setShowBoostModal(true)}
                    data-testid="button-boost-pitch"
                  >
                    {isBoosted ? 'Extend Boost' : 'Boost Pitch'}
                  </Button>
                </div>
              </Card>
            )}

            <Card className="p-6">
              <h3 className="font-semibold mb-3">Pitch Description</h3>
              <p
                className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap"
                data-testid="text-blurb"
              >
                {pitch.blurb}
              </p>
            </Card>
          </>
        ) : (
          <Card className="p-12 text-center">
            <p className="text-gray-600 dark:text-gray-400">Pitch not found</p>
          </Card>
        )}
      </div>

      {pitch && (
        <PitchBoostModal
          isOpen={showBoostModal}
          onClose={() => setShowBoostModal(false)}
          pitchId={pitchId || ''}
          pitchTitle={pitch.title}
          currentBalance={creditBalance}
          currentBoostEndsAt={(pitch as any).boostEndsAt}
        />
      )}
    </div>
  );
}
