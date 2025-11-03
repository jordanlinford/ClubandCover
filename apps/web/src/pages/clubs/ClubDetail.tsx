import { useQuery } from '@tanstack/react-query';
import { useRoute, Link } from 'wouter';
import { Card } from '@repo/ui';
import { Button } from '@repo/ui';
import { PageHeader } from '@repo/ui';
import type { Club } from '@repo/types';

export function ClubDetailPage() {
  const [match, params] = useRoute('/clubs/:id');
  const clubId = params?.id;

  const { data: club, isLoading } = useQuery<Club>({
    queryKey: ['/api/clubs', clubId],
    enabled: !!clubId,
  });

  if (!match || !clubId) {
    return <div>Club not found</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-4xl mx-auto p-6">
        <Link href="/clubs">
          <Button variant="outline" className="mb-4" data-testid="button-back">
            ← Back to Clubs
          </Button>
        </Link>

        {isLoading ? (
          <Card className="p-8 animate-pulse">
            <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-2/3 mb-4"></div>
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/3 mb-6"></div>
            <div className="space-y-2">
              <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded"></div>
              <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded"></div>
            </div>
          </Card>
        ) : club ? (
          <>
            <PageHeader
              title={club.name}
              description={club.isPublic ? 'Public Club' : 'Private Club'}
            />

            <div className="mt-6 space-y-6">
              <Card className="p-6">
                <h2 className="text-lg font-semibold mb-4">Club Information</h2>
                <dl className="space-y-3">
                  {club.description && (
                    <div>
                      <dt className="text-sm font-medium text-gray-600 dark:text-gray-400">
                        Description
                      </dt>
                      <dd className="text-base mt-1" data-testid="text-description">
                        {club.description}
                      </dd>
                    </div>
                  )}
                  <div>
                    <dt className="text-sm font-medium text-gray-600 dark:text-gray-400">
                      Maximum Members
                    </dt>
                    <dd className="text-base">{club.maxMembers}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-600 dark:text-gray-400">
                      Visibility
                    </dt>
                    <dd>
                      <span className={`inline-block px-2 py-1 rounded text-sm ${
                        club.isPublic
                          ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                          : 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200'
                      }`}>
                        {club.isPublic ? 'Public' : 'Private'}
                      </span>
                    </dd>
                  </div>
                </dl>

                <div className="mt-6 flex space-x-3">
                  <Button data-testid="button-join">Join Club</Button>
                  <Button variant="outline" data-testid="button-view-members">
                    View Members
                  </Button>
                </div>
              </Card>

              <Card className="p-6">
                <h2 className="text-lg font-semibold mb-4">Recent Activity</h2>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  No recent activity yet. Be the first to join!
                </p>
              </Card>
            </div>
          </>
        ) : (
          <Card className="p-12 text-center">
            <p className="text-gray-600 dark:text-gray-400">Club not found</p>
            <Link href="/clubs">
              <Button className="mt-4" data-testid="button-back-to-list">
                Back to Clubs
              </Button>
            </Link>
          </Card>
        )}
      </div>
    </div>
  );
}
