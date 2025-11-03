import { useQuery } from '@tanstack/react-query';
import { Link } from 'wouter';
import { Card } from '@repo/ui';
import { Button } from '@repo/ui';
import { PageHeader } from '@repo/ui';
import type { Club } from '@repo/types';

export function ClubsListPage() {
  const { data: clubs, isLoading } = useQuery<Club[]>({
    queryKey: ['/api/clubs'],
  });

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto p-6">
        <div className="flex justify-between items-center mb-6">
          <PageHeader
            title="Book Clubs"
            description="Join or create book clubs"
          />
          <Link href="/clubs/new">
            <Button data-testid="button-create-club">Create Club</Button>
          </Link>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[...Array(4)].map((_, i) => (
              <Card key={i} className="p-6 animate-pulse">
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-2"></div>
                <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
              </Card>
            ))}
          </div>
        ) : clubs && clubs.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {clubs.map((club) => (
              <Link key={club.id} href={`/clubs/${club.id}`}>
                <Card
                  className="p-6 hover:shadow-lg transition-shadow cursor-pointer"
                  data-testid={`card-club-${club.id}`}
                >
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-semibold text-lg" data-testid={`text-name-${club.id}`}>
                      {club.name}
                    </h3>
                    <span className={`text-xs px-2 py-1 rounded ${
                      club.isPublic
                        ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                        : 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200'
                    }`}>
                      {club.isPublic ? 'Public' : 'Private'}
                    </span>
                  </div>
                  {club.description && (
                    <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
                      {club.description}
                    </p>
                  )}
                  <div className="mt-4 text-xs text-gray-500">
                    Max {club.maxMembers} members
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        ) : (
          <Card className="p-12 text-center">
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              No clubs yet. Create your first book club!
            </p>
            <Link href="/clubs/new">
              <Button data-testid="button-create-first-club">Create Your First Club</Button>
            </Link>
          </Card>
        )}
      </div>
    </div>
  );
}
