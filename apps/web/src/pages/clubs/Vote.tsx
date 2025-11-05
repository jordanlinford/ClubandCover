import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRoute, Link } from 'wouter';
import { Card } from '@repo/ui';
import { Button } from '@repo/ui';
import { PageHeader } from '@repo/ui';
import type { PollResults, CreateVote } from '@repo/types';
import { api, ApiError } from '../../lib/api';
import { VotePanel } from '../../components/VotePanel';
import { ArrowLeft } from 'lucide-react';
import { useState } from 'react';

export function VotePage() {
  const [, params] = useRoute('/clubs/:clubId/polls/:pollId');
  const clubId = params?.clubId;
  const pollId = params?.pollId;
  const queryClient = useQueryClient();
  const [error, setError] = useState<string>('');

  const { data: results, isLoading } = useQuery<PollResults>({
    queryKey: ['/api/polls', pollId, 'results'],
    enabled: !!pollId,
  });

  const voteMutation = useMutation({
    mutationFn: (data: CreateVote) => api.vote(pollId!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/polls', pollId] });
      setError('');
    },
    onError: (err) => {
      if (err instanceof ApiError) {
        if (err.status === 409) {
          setError('You have already voted in this poll');
        } else if (err.status === 400) {
          setError('Poll is not currently open for voting');
        } else {
          setError(err.message);
        }
      } else {
        setError('Failed to submit vote');
      }
    },
  });

  const handleVote = (pollOptionId: string) => {
    voteMutation.mutate({ pollOptionId });
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-4xl mx-auto p-6">
        <Link href={`/clubs/${clubId}`}>
          <Button variant="outline" size="sm" className="mb-4" data-testid="button-back">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Club
          </Button>
        </Link>

        {isLoading ? (
          <Card className="p-6 animate-pulse">
            <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-2/3 mb-4"></div>
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-full mb-2"></div>
          </Card>
        ) : results ? (
          <>
            <PageHeader
              title={results.poll.title}
              description={results.poll.description || ''}
            />

            <Card className="p-6 mt-6">
              <div className="mb-4 text-sm text-gray-600 dark:text-gray-400">
                <div>Opens: {new Date(results.poll.opensAt).toLocaleString()}</div>
                <div>Closes: {new Date(results.poll.closesAt).toLocaleString()}</div>
              </div>

              {error && (
                <div
                  className="mb-4 p-4 bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200 rounded-md"
                  data-testid="text-error"
                >
                  {error}
                </div>
              )}

              <VotePanel
                options={results.options}
                userVote={results.userVote}
                onVote={handleVote}
                isPending={voteMutation.isPending}
                pollStatus={results.poll.status}
              />
            </Card>
          </>
        ) : (
          <Card className="p-12 text-center">
            <p className="text-gray-600 dark:text-gray-400">Poll not found</p>
          </Card>
        )}
      </div>
    </div>
  );
}
