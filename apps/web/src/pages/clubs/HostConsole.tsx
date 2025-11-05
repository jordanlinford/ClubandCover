import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRoute, Link } from 'wouter';
import { Card } from '@repo/ui';
import { Button } from '@repo/ui';
import { PageHeader } from '@repo/ui';
import type { Pitch, CreatePoll, CreatePollOption } from '@repo/types';
import { api } from '../../lib/api';
import { PollBuilderModal } from '../../components/PollBuilderModal';
import { ArrowLeft, Plus } from 'lucide-react';

export function HostConsolePage() {
  const [, params] = useRoute('/clubs/:id/host-console');
  const clubId = params?.id;
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);

  const { data: pitches = [] } = useQuery<Pitch[]>({
    queryKey: ['/api/pitches', { clubId }],
    enabled: !!clubId,
  });

  const createPollMutation = useMutation({
    mutationFn: async ({ poll, options }: { poll: CreatePoll; options: CreatePollOption[] }) => {
      // Create poll
      const createdPoll = await api.createPoll(clubId!, poll);
      
      // Add options
      for (const option of options) {
        await api.addPollOption(createdPoll.id, option);
      }
      
      return createdPoll;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/polls'] });
      setIsModalOpen(false);
    },
  });

  const updatePitchMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: 'PENDING' | 'ACCEPTED' | 'REJECTED' }) =>
      api.updatePitch(id, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/pitches'] });
    },
  });

  const chooseBookMutation = useMutation({
    mutationFn: (pitchId: string) => api.chooseBook(clubId!, { pitchId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/pitches'] });
    },
  });

  const pendingPitches = pitches.filter(p => p.status === 'PENDING');
  const acceptedPitches = pitches.filter(p => p.status === 'ACCEPTED');

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto p-6">
        <Link href={`/clubs/${clubId}`}>
          <Button variant="outline" size="sm" className="mb-4" data-testid="button-back">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Club
          </Button>
        </Link>

        <div className="flex justify-between items-center mb-6">
          <PageHeader
            title="Host Console"
            description="Manage book pitches and create polls"
          />
          <Button
            onClick={() => setIsModalOpen(true)}
            data-testid="button-create-poll"
          >
            <Plus className="h-4 w-4 mr-2" />
            Create Poll
          </Button>
        </div>

        <div className="space-y-6">
          <div>
            <h2 className="text-xl font-semibold mb-4">Pending Pitches</h2>
            {pendingPitches.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {pendingPitches.map((pitch) => (
                  <Card key={pitch.id} className="p-6" data-testid={`card-pitch-${pitch.id}`}>
                    <h3 className="font-semibold text-lg mb-2">{pitch.title}</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 line-clamp-3">
                      {pitch.blurb}
                    </p>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => updatePitchMutation.mutate({ id: pitch.id, status: 'ACCEPTED' })}
                        disabled={updatePitchMutation.isPending}
                        data-testid={`button-accept-${pitch.id}`}
                      >
                        Accept
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => updatePitchMutation.mutate({ id: pitch.id, status: 'REJECTED' })}
                        disabled={updatePitchMutation.isPending}
                        data-testid={`button-reject-${pitch.id}`}
                      >
                        Reject
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
            ) : (
              <Card className="p-12 text-center">
                <p className="text-gray-600 dark:text-gray-400">
                  No pending pitches
                </p>
              </Card>
            )}
          </div>

          <div>
            <h2 className="text-xl font-semibold mb-4">Accepted Pitches</h2>
            {acceptedPitches.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {acceptedPitches.map((pitch) => (
                  <Card key={pitch.id} className="p-6" data-testid={`card-pitch-${pitch.id}`}>
                    <h3 className="font-semibold text-lg mb-2">{pitch.title}</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 line-clamp-3">
                      {pitch.blurb}
                    </p>
                    <Button
                      size="sm"
                      onClick={() => chooseBookMutation.mutate(pitch.id)}
                      disabled={chooseBookMutation.isPending}
                      data-testid={`button-choose-book-${pitch.id}`}
                    >
                      Choose as Book
                    </Button>
                  </Card>
                ))}
              </div>
            ) : (
              <Card className="p-12 text-center">
                <p className="text-gray-600 dark:text-gray-400">
                  No accepted pitches yet
                </p>
              </Card>
            )}
          </div>
        </div>

        <PollBuilderModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onCreatePoll={(poll, options) =>
            createPollMutation.mutate({ poll, options })
          }
          isPending={createPollMutation.isPending}
        />
      </div>
    </div>
  );
}
