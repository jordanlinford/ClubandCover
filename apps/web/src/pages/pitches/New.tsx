import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocation, Link } from 'wouter';
import { Card } from '@repo/ui';
import { PageHeader } from '@repo/ui';
import { Button } from '@repo/ui';
import { api, ApiError } from '../../lib/api';
import type { Club, CreatePitch } from '@repo/types';
import { PitchForm } from '../../components/PitchForm';
import { useAuth } from '../../contexts/AuthContext';
import { AlertCircle, Sparkles } from 'lucide-react';

export function NewPitchPage() {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [error, setError] = useState<string>('');
  const [tierLimitError, setTierLimitError] = useState<{
    limit: number;
    currentCount: number;
  } | null>(null);

  const { data: clubs = [], isLoading: clubsLoading } = useQuery<Club[]>({
    queryKey: ['/api/clubs'],
  });

  const createMutation = useMutation({
    mutationFn: (data: CreatePitch) => api.createPitch(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/pitches'] });
      setError('');
      setTierLimitError(null);
      setLocation('/pitches');
    },
    onError: (error: Error) => {
      // Check if this is a tier limit error
      if (error instanceof ApiError && error.code === 'PITCH_LIMIT_REACHED') {
        setTierLimitError({
          limit: error.details?.limit || 1,
          currentCount: error.details?.currentCount || 0,
        });
        setError('');
      } else {
        setError(error.message || 'Failed to create pitch');
        setTierLimitError(null);
      }
    },
  });

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="max-w-2xl mx-auto p-6">
          <Card className="p-12 text-center">
            <p className="text-gray-600 dark:text-gray-400">
              Please sign in to submit a pitch.
            </p>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-2xl mx-auto p-6">
        <PageHeader
          title="Submit Book Pitch"
          description="Pitch a book to a club for their next reading selection"
        />

        <Card className="p-6 mt-6">
          {tierLimitError && (
            <div
              className="mb-6 p-6 border-2 border-primary bg-primary/5 rounded-lg"
              data-testid="alert-tier-limit"
            >
              <div className="flex items-start gap-3">
                <Sparkles className="h-6 w-6 text-primary mt-0.5 flex-shrink-0" data-testid="icon-upgrade" />
                <div className="flex-1">
                  <h3 className="font-semibold text-lg mb-2">
                    Pitch Limit Reached
                  </h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    You've reached your limit of {tierLimitError.limit} active pitch{tierLimitError.limit === 1 ? '' : 'es'}. 
                    Upgrade to Pro Author for up to 5 pitches, or Publisher for unlimited pitches.
                  </p>
                  <div className="flex gap-3">
                    <Link href="/billing">
                      <Button variant="default" data-testid="button-upgrade-tier">
                        <Sparkles className="h-4 w-4 mr-2" />
                        Upgrade Now
                      </Button>
                    </Link>
                    <Link href="/pitches">
                      <Button variant="outline" data-testid="button-view-pitches">
                        View My Pitches
                      </Button>
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          {error && (
            <div
              className="mb-4 p-4 border border-destructive/50 bg-destructive/10 text-destructive rounded-md flex items-start gap-2"
              data-testid="text-error"
            >
              <AlertCircle className="h-5 w-5 mt-0.5 flex-shrink-0" />
              <p>{error}</p>
            </div>
          )}
          
          {clubsLoading ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">Loading clubs...</p>
            </div>
          ) : (
            <PitchForm
              onSubmit={(data) => createMutation.mutate(data)}
              isPending={createMutation.isPending}
              clubs={clubs.map(c => ({ id: c.id, name: c.name }))}
            />
          )}
        </Card>
      </div>
    </div>
  );
}
