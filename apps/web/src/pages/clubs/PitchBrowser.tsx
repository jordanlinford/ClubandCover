import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRoute } from 'wouter';
import { Card } from '@repo/ui';
import { Button } from '@repo/ui';
import { PageHeader } from '@repo/ui';
import { api } from '../../lib/api';
import { ThumbsUp, BookOpen, ExternalLink, User } from 'lucide-react';

type Pitch = {
  id: string;
  title: string;
  synopsis: string | null;
  sampleUrl: string | null;
  status: string;
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

  const { data: club } = useQuery<{ name: string }>({
    queryKey: ['/api/clubs', clubId],
    enabled: !!clubId,
  });

  const { data: pitchesData, isLoading } = useQuery({
    queryKey: ['/api/pitches', { targetClubId: clubId }],
    queryFn: async () => {
      const result = await api.get<{
        pitches: Pitch[];
        total: number;
      }>(`/pitches?targetClubId=${clubId}&status=SUBMITTED&limit=50`);
      
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
      
      return {
        ...result,
        pitches: pitchesWithNominations,
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

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-5xl mx-auto p-6">
        <PageHeader
          title={`Browse Pitches - ${club?.name || 'Club'}`}
          description="Discover and nominate books for the club to read"
        />

        {pitchesData && pitchesData.pitches.length === 0 && (
          <Card className="p-8 text-center mt-6">
            <BookOpen className="h-12 w-12 mx-auto mb-4 text-gray-400" />
            <p className="text-gray-600 dark:text-gray-400">
              No pitches submitted to this club yet
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

                    <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400 mb-3">
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
