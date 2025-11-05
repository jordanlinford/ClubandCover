import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocation } from 'wouter';
import { Card } from '@repo/ui';
import { PageHeader } from '@repo/ui';
import { api } from '../../lib/api';
import type { Club, CreatePitch } from '@repo/types';
import { PitchForm } from '../../components/PitchForm';
import { useAuth } from '../../contexts/AuthContext';

export function NewPitchPage() {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [error, setError] = useState<string>('');

  const { data: clubs = [], isLoading: clubsLoading } = useQuery<Club[]>({
    queryKey: ['/api/clubs'],
  });

  const createMutation = useMutation({
    mutationFn: (data: CreatePitch) => api.createPitch(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/pitches'] });
      setError('');
      setLocation('/pitches');
    },
    onError: (error: Error) => {
      setError(error.message || 'Failed to create pitch');
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
          {error && (
            <div
              className="mb-4 p-4 bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200 rounded-md"
              data-testid="text-error"
            >
              {error}
            </div>
          )}
          {clubsLoading ? (
            <div className="text-center py-8">
              <p className="text-gray-600 dark:text-gray-400">Loading clubs...</p>
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
