import { useQuery } from '@tanstack/react-query';
import { useRoute, Link } from 'wouter';
import { Card } from '@repo/ui';
import { Button } from '@repo/ui';
import { PageHeader } from '@repo/ui';
import type { Pitch } from '@repo/types';
import { ArrowLeft } from 'lucide-react';

export function PitchDetailPage() {
  const [, params] = useRoute('/pitches/:id');
  const pitchId = params?.id;

  const { data: pitch, isLoading } = useQuery<Pitch>({
    queryKey: ['/api/pitches', pitchId],
    enabled: !!pitchId,
  });

  const statusColors = {
    PENDING: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
    ACCEPTED: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
    REJECTED: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  };

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
              <span
                className={`text-sm px-3 py-1 rounded-md ${statusColors[pitch.status]}`}
                data-testid="text-status"
              >
                {pitch.status}
              </span>
            </div>

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
    </div>
  );
}
