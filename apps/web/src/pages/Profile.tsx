import { useQuery } from '@tanstack/react-query';
import { Card } from '@repo/ui';
import { Button } from '@repo/ui';
import { PageHeader } from '@repo/ui';
import { DataTable } from '@repo/ui';
import type { UserPoints, PointLedger } from '@repo/types';
import { useAuth } from '../contexts/AuthContext';
import { PointsBadge } from '../components/PointsBadge';

export function ProfilePage() {
  const { user } = useAuth();

  const { data: pointsData } = useQuery<UserPoints>({
    queryKey: ['/api/users', user?.id, 'points'],
    enabled: !!user?.id,
  });

  const { data: ledger = [] } = useQuery<PointLedger[]>({
    queryKey: ['/api/users', user?.id, 'ledger'],
    enabled: !!user?.id,
  });

  // Display user data - use Supabase user if available, otherwise mock
  const displayName = user?.email?.split('@')[0] || 'Demo User';
  const displayEmail = user?.email || 'demo@bookclub.com';

  const ledgerColumns = [
    {
      key: 'createdAt',
      header: 'Date',
      accessorKey: 'createdAt',
      cell: (row: PointLedger) => new Date(row.createdAt).toLocaleDateString(),
    },
    {
      key: 'eventType',
      header: 'Event',
      accessorKey: 'eventType',
      cell: (row: PointLedger) => row.eventType.replace(/_/g, ' '),
    },
    {
      key: 'amount',
      header: 'Points',
      accessorKey: 'amount',
      cell: (row: PointLedger) => (
        <span className={row.amount > 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}>
          {row.amount > 0 ? '+' : ''}{row.amount}
        </span>
      ),
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-4xl mx-auto p-6">
        <PageHeader
          title="Profile"
          description="Manage your account settings"
        />
        
        <div className="mt-6 space-y-6">
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4">Profile Information</h2>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="w-16 h-16 bg-gray-200 dark:bg-gray-700 rounded-full flex items-center justify-center text-2xl">
                    {displayName.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg" data-testid="text-username">
                      {displayName}
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400" data-testid="text-email">
                      {displayEmail}
                    </p>
                  </div>
                </div>
                {pointsData && (
                  <PointsBadge
                    points={pointsData.points}
                    reputation={pointsData.reputation}
                    showLabel
                  />
                )}
              </div>
            </div>
            
            <div className="mt-6 flex space-x-3">
              <Button data-testid="button-edit-profile">Edit Profile</Button>
              <Button variant="outline" data-testid="button-change-password">
                Change Password
              </Button>
            </div>
          </Card>

          {pointsData && (
            <Card className="p-6">
              <h2 className="text-xl font-semibold mb-4">Points & Reputation</h2>
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div>
                  <label className="block text-sm font-medium mb-1">Total Points</label>
                  <p className="text-3xl font-bold" data-testid="text-total-points">
                    {pointsData.points}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Reputation</label>
                  <p className="text-3xl font-bold" data-testid="text-reputation">
                    {pointsData.reputation}
                  </p>
                </div>
              </div>

              {ledger.length > 0 && (
                <div>
                  <h3 className="font-semibold mb-3">Recent Activity</h3>
                  <DataTable
                    columns={ledgerColumns}
                    data={ledger.slice(0, 10)}
                  />
                </div>
              )}
            </Card>
          )}
          
          {!user && (
            <Card className="p-6 border-yellow-200 dark:border-yellow-800 bg-yellow-50 dark:bg-yellow-950">
              <h3 className="font-semibold mb-2">Mock Data Notice</h3>
              <p className="text-sm text-gray-700 dark:text-gray-300">
                This is mock profile data. Configure Supabase to enable real authentication and user profiles.
              </p>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
