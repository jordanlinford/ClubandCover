import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card } from '@repo/ui';
import { Button } from '@repo/ui';
import { PageHeader } from '@repo/ui';
import { DataTable } from '@repo/ui';
import type { PointLedger, User } from '@repo/types';
import { useAuth } from '../contexts/AuthContext';
import { PointsBadge } from '../components/PointsBadge';
import { BadgesDisplay } from '../components/BadgesDisplay';
import { Users, BookOpen, Star, Check, Pen } from 'lucide-react';
import { useLocation } from 'wouter';
import { hasRole } from '../lib/hasRole';
import { api } from '../lib/api';
import { useState } from 'react';

export function ProfilePage() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const [successMessage, setSuccessMessage] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string>('');

  const { data: userData } = useQuery<User>({
    queryKey: ['/api/users/me'],
    enabled: !!user?.id,
  });

  const { data: pointsResponse } = useQuery<any>({
    queryKey: ['/api/points/me'],
    enabled: !!user?.id,
  });

  const { data: badgesResponse } = useQuery<any>({
    queryKey: ['/api/badges/me'],
    enabled: !!user?.id,
  });

  const { data: clubsResponse } = useQuery<any>({
    queryKey: ['/api/users/me/clubs'],
    enabled: !!user?.id,
  });

  const { data: reviewedBooksResponse } = useQuery<any>({
    queryKey: ['/api/users/me/reviewed-books'],
    enabled: !!user?.id,
  });

  const { data: profileResponse } = useQuery<any>({
    queryKey: ['/api/users/me/profile'],
    enabled: !!user?.id && hasRole(userData, 'AUTHOR'),
  });

  const updateProfileMutation = useMutation({
    mutationFn: (data: { openToSwaps: boolean }) =>
      api.patch('/users/me/profile', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/users/me/profile'] });
      setErrorMessage('');
      setSuccessMessage('Preference updated successfully!');
      setTimeout(() => setSuccessMessage(''), 3000);
    },
    onError: (error: Error) => {
      setSuccessMessage('');
      setErrorMessage(error.message || 'Failed to update preference');
    },
  });

  const addRoleMutation = useMutation({
    mutationFn: (role: string) =>
      api.post('/users/me/roles', { role }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/users/me'] });
      setErrorMessage('');
      setSuccessMessage('Role added successfully!');
      setTimeout(() => setSuccessMessage(''), 3000);
    },
    onError: (error: Error) => {
      setSuccessMessage('');
      setErrorMessage(error.message || 'Failed to add role. Please try again.');
    },
  });

  const pointsData = pointsResponse?.data;
  const ledger = pointsResponse?.data?.ledger || [];
  const badges = badgesResponse?.data?.badges || [];
  const myClubs = clubsResponse?.data || [];
  const reviewedBooks = reviewedBooksResponse?.data || [];

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

          {/* Manage Roles Section */}
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4">Manage Roles</h2>
            <p className="text-sm text-muted-foreground mb-4">
              Add roles to unlock new features and capabilities on the platform
            </p>

            {successMessage && (
              <div
                className="mb-4 p-4 bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 rounded-md"
                data-testid="text-success"
              >
                {successMessage}
              </div>
            )}

            {errorMessage && (
              <div
                className="mb-4 p-4 bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200 rounded-md"
                data-testid="text-error"
              >
                {errorMessage}
              </div>
            )}
            
            <div className="space-y-4">
              {/* Current Roles */}
              {userData?.roles && userData.roles.length > 0 && (
                <div>
                  <label className="block text-sm font-medium mb-2">Current Roles</label>
                  <div className="flex flex-wrap gap-2">
                    {userData.roles.map((role) => (
                      <div
                        key={role}
                        className="flex items-center gap-2 px-3 py-1.5 bg-primary/10 text-primary rounded-md border border-primary/20"
                        data-testid={`badge-role-${role.toLowerCase()}`}
                      >
                        <Check className="h-4 w-4" />
                        <span className="text-sm font-medium">
                          {role === 'CLUB_ADMIN' ? 'Club Host' : role.charAt(0) + role.slice(1).toLowerCase()}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Add Roles */}
              <div>
                <label className="block text-sm font-medium mb-2">Available Roles</label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Author Role */}
                  {!hasRole(userData, 'AUTHOR') && (
                    <div className="p-4 border rounded-md">
                      <div className="flex items-start gap-3 mb-3">
                        <div className="p-2 rounded-md bg-purple-100 dark:bg-purple-900/20">
                          <Pen className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                        </div>
                        <div className="flex-1">
                          <h3 className="font-semibold">Author</h3>
                          <p className="text-sm text-muted-foreground mt-1">
                            Pitch your books to clubs and access the AuthorSwap network
                          </p>
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full"
                        onClick={() => addRoleMutation.mutate('AUTHOR')}
                        disabled={addRoleMutation.isPending}
                        data-testid="button-add-author-role"
                      >
                        {addRoleMutation.isPending ? 'Adding...' : 'Add Author Role'}
                      </Button>
                    </div>
                  )}

                  {/* Club Host Role */}
                  {!hasRole(userData, 'CLUB_ADMIN') && (
                    <div className="p-4 border rounded-md">
                      <div className="flex items-start gap-3 mb-3">
                        <div className="p-2 rounded-md bg-green-100 dark:bg-green-900/20">
                          <Users className="h-5 w-5 text-green-600 dark:text-green-400" />
                        </div>
                        <div className="flex-1">
                          <h3 className="font-semibold">Club Host</h3>
                          <p className="text-sm text-muted-foreground mt-1">
                            Create and manage book clubs, run polls, and build community
                          </p>
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full"
                        onClick={() => addRoleMutation.mutate('CLUB_ADMIN')}
                        disabled={addRoleMutation.isPending}
                        data-testid="button-add-club-host-role"
                      >
                        {addRoleMutation.isPending ? 'Adding...' : 'Add Club Host Role'}
                      </Button>
                    </div>
                  )}
                </div>

                {hasRole(userData, 'AUTHOR') && hasRole(userData, 'CLUB_ADMIN') && (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    You have all available roles!
                  </p>
                )}
              </div>
            </div>
          </Card>

          {/* Author Preferences */}
          {hasRole(userData, 'AUTHOR') && (
            <Card className="p-6">
              <h2 className="text-xl font-semibold mb-4">Author Preferences</h2>
              <p className="text-sm text-muted-foreground mb-4">
                Manage your author profile and swap availability
              </p>

              {successMessage && (
                <div
                  className="mb-4 p-4 bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 rounded-md"
                  data-testid="text-success-author"
                >
                  {successMessage}
                </div>
              )}

              {errorMessage && (
                <div
                  className="mb-4 p-4 bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200 rounded-md"
                  data-testid="text-error-author"
                >
                  {errorMessage}
                </div>
              )}

              <div className="flex items-center justify-between p-4 border rounded-md">
                <div className="flex-1">
                  <h3 className="font-semibold">Open to Book Swaps</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    Allow other authors to find you in the Author Directory for swap requests
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    className="sr-only peer"
                    checked={profileResponse?.data?.openToSwaps || false}
                    onChange={(e) => updateProfileMutation.mutate({ openToSwaps: e.target.checked })}
                    disabled={updateProfileMutation.isPending}
                    data-testid="toggle-open-to-swaps"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/20 dark:peer-focus:ring-primary/30 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-primary"></div>
                </label>
              </div>
            </Card>
          )}

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

          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4">Badges</h2>
            <BadgesDisplay badges={badges} />
          </Card>

          {/* My Clubs Section */}
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" />
                <h2 className="text-xl font-semibold">My Clubs</h2>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setLocation('/discover?tab=clubs')}
                data-testid="button-browse-clubs"
              >
                Browse Clubs
              </Button>
            </div>

            {myClubs.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {myClubs.map((club: any) => (
                  <div
                    key={club.id}
                    className="p-4 border rounded-md cursor-pointer hover-elevate active-elevate-2 transition-all"
                    onClick={() => setLocation(`/clubs/${club.id}`)}
                    data-testid={`club-card-${club.id}`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="font-semibold text-lg">{club.name}</h3>
                      <span className="text-xs px-2 py-1 rounded-full bg-primary/10 text-primary">
                        {club.myRole}
                      </span>
                    </div>
                    {club.description && (
                      <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                        {club.description}
                      </p>
                    )}
                    <div className="flex items-center justify-between text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Users className="h-4 w-4" />
                        <span>{club._count?.memberships || 0} members</span>
                      </div>
                      <span>Joined {new Date(club.joinedAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Users className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>You haven't joined any clubs yet.</p>
                <Button
                  variant="outline"
                  className="mt-4"
                  onClick={() => setLocation('/discover?tab=clubs')}
                  data-testid="button-discover-clubs"
                >
                  Discover Clubs
                </Button>
              </div>
            )}
          </Card>

          {/* Reviewed Books Section */}
          <Card className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <BookOpen className="h-5 w-5 text-primary" />
              <h2 className="text-xl font-semibold">Books I've Read & Rated</h2>
            </div>

            {reviewedBooks.length > 0 ? (
              <div className="space-y-4">
                {reviewedBooks.map((book: any) => (
                  <div
                    key={book.id}
                    className="p-4 border rounded-md cursor-pointer hover-elevate active-elevate-2 transition-all"
                    onClick={() => setLocation(`/books/${book.id}`)}
                    data-testid={`book-card-${book.id}`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h3 className="font-semibold">{book.title}</h3>
                        <p className="text-sm text-muted-foreground">{book.author}</p>
                      </div>
                      <div className="flex items-center gap-1 text-sm">
                        <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                        <span className="font-medium">{book.rating}/5</span>
                      </div>
                    </div>
                    {book.reviewText && (
                      <p className="text-sm text-muted-foreground line-clamp-2 mt-2">
                        {book.reviewText}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground mt-2">
                      Reviewed {new Date(book.reviewedAt).toLocaleDateString()}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <BookOpen className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>You haven't reviewed any books yet.</p>
              </div>
            )}
          </Card>
          
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
