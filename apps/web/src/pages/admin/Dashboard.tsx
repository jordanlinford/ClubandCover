import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, Button } from '@repo/ui';
import { Users, BookOpen, Award, Shield, TrendingUp, AlertTriangle } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

interface AdminResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

interface UserData {
  success: boolean;
  user?: {
    id: string;
    email: string;
    name: string;
    role: string;
    tier: string;
  };
}

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState('overview');
  const queryClient = useQueryClient();
  const { user, loading: authLoading } = useAuth();

  const { data: userData, isLoading: userDataLoading } = useQuery<UserData>({
    queryKey: ['/api/user/me'],
    enabled: !!user,
  });

  const { data: users } = useQuery<AdminResponse<any[]>>({
    queryKey: ['/api/admin/users'],
    enabled: activeTab === 'users',
  });

  const { data: clubs } = useQuery<AdminResponse<any[]>>({
    queryKey: ['/api/admin/clubs'],
    enabled: activeTab === 'clubs',
  });

  const { data: pitches } = useQuery<AdminResponse<any[]>>({
    queryKey: ['/api/admin/pitches'],
    enabled: activeTab === 'pitches',
  });

  const { data: stats } = useQuery<AdminResponse<{
    totalUsers: number;
    totalClubs: number;
    totalPitches: number;
    activeSwaps: number;
  }>>({
    queryKey: ['/api/admin/stats'],
  });

  const changeRoleMutation = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: string }) => {
      const res = await fetch(`/api/admin/users/${userId}/role`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role }),
        credentials: 'include',
      });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users'] });
    },
  });

  const changeTierMutation = useMutation({
    mutationFn: async ({ userId, tier }: { userId: string; tier: string }) => {
      const res = await fetch(`/api/admin/users/${userId}/tier`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tier }),
        credentials: 'include',
      });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users'] });
    },
  });

  const closePollMutation = useMutation({
    mutationFn: async ({ pollId }: { pollId: string }) => {
      const res = await fetch(`/api/admin/polls/${pollId}/close`, {
        method: 'POST',
        credentials: 'include',
      });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/clubs'] });
    },
  });

  const revokeBadgeMutation = useMutation({
    mutationFn: async ({ userId, badgeCode }: { userId: string; badgeCode: string }) => {
      const res = await fetch('/api/admin/badges/revoke', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, badgeCode }),
        credentials: 'include',
      });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users'] });
    },
  });

  // Show loading state while checking auth
  if (authLoading || userDataLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 dark:border-gray-100 mx-auto mb-4"></div>
            <p className="text-gray-600 dark:text-gray-400">Loading...</p>
          </div>
        </div>
      </div>
    );
  }

  // Check if user is not authenticated
  if (!user) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <Card className="p-8 text-center">
          <AlertTriangle className="h-12 w-12 text-orange-600 mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-2">Authentication Required</h2>
          <p className="text-gray-600 dark:text-gray-400">You must be logged in to access the admin dashboard.</p>
        </Card>
      </div>
    );
  }

  // Check if user is STAFF
  if (userData?.user?.role !== 'STAFF') {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8" data-testid="page-admin-unauthorized">
        <Card className="p-8 text-center">
          <Shield className="h-12 w-12 text-red-600 mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-2">Access Denied</h2>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            This area is restricted to STAFF members only.
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-500">
            Your current role: {userData?.user?.role || 'Unknown'}
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8" data-testid="page-admin-dashboard">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <Shield className="h-8 w-8 text-red-600" />
          <h1 className="text-3xl font-bold">Admin Dashboard</h1>
        </div>
        <p className="text-gray-600 dark:text-gray-400">Manage users, clubs, pitches, and platform settings</p>
      </div>

      <div className="border-b border-gray-200 dark:border-gray-700 mb-8">
        <nav className="flex gap-4">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-4 py-2 border-b-2 ${
              activeTab === 'overview' ? 'border-blue-600 text-blue-600' : 'border-transparent'
            }`}
            data-testid="tab-overview"
          >
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              <span>Overview</span>
            </div>
          </button>
          <button
            onClick={() => setActiveTab('users')}
            className={`px-4 py-2 border-b-2 ${
              activeTab === 'users' ? 'border-blue-600 text-blue-600' : 'border-transparent'
            }`}
            data-testid="tab-users"
          >
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              <span>Users</span>
            </div>
          </button>
          <button
            onClick={() => setActiveTab('clubs')}
            className={`px-4 py-2 border-b-2 ${
              activeTab === 'clubs' ? 'border-blue-600 text-blue-600' : 'border-transparent'
            }`}
            data-testid="tab-clubs"
          >
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              <span>Clubs</span>
            </div>
          </button>
          <button
            onClick={() => setActiveTab('pitches')}
            className={`px-4 py-2 border-b-2 ${
              activeTab === 'pitches' ? 'border-blue-600 text-blue-600' : 'border-transparent'
            }`}
            data-testid="tab-pitches"
          >
            <div className="flex items-center gap-2">
              <BookOpen className="h-4 w-4" />
              <span>Pitches</span>
            </div>
          </button>
          <button
            onClick={() => setActiveTab('badges')}
            className={`px-4 py-2 border-b-2 ${
              activeTab === 'badges' ? 'border-blue-600 text-blue-600' : 'border-transparent'
            }`}
            data-testid="tab-badges"
          >
            <div className="flex items-center gap-2">
              <Award className="h-4 w-4" />
              <span>Badges</span>
            </div>
          </button>
        </nav>
      </div>

      {activeTab === 'overview' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Total Users</p>
                  <p className="text-3xl font-bold" data-testid="stat-total-users">
                    {stats?.data?.totalUsers || 0}
                  </p>
                </div>
                <Users className="h-8 w-8 text-blue-600" />
              </div>
            </Card>
            <Card className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Total Clubs</p>
                  <p className="text-3xl font-bold" data-testid="stat-total-clubs">
                    {stats?.data?.totalClubs || 0}
                  </p>
                </div>
                <Users className="h-8 w-8 text-purple-600" />
              </div>
            </Card>
            <Card className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Total Pitches</p>
                  <p className="text-3xl font-bold" data-testid="stat-total-pitches">
                    {stats?.data?.totalPitches || 0}
                  </p>
                </div>
                <BookOpen className="h-8 w-8 text-green-600" />
              </div>
            </Card>
            <Card className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Active Swaps</p>
                  <p className="text-3xl font-bold" data-testid="stat-active-swaps">
                    {stats?.data?.activeSwaps || 0}
                  </p>
                </div>
                <TrendingUp className="h-8 w-8 text-orange-600" />
              </div>
            </Card>
          </div>
        </div>
      )}

      {activeTab === 'users' && (
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">User Management</h2>
          <div className="space-y-4">
            {users?.data?.map((user: any) => (
              <div
                key={user.id}
                className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-700 rounded-lg"
                data-testid={`user-${user.id}`}
              >
                <div className="flex-1">
                  <p className="font-medium">{user.name || user.email}</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">{user.email}</p>
                  <div className="flex gap-2 mt-2">
                    <span className="px-2 py-1 bg-gray-100 dark:bg-gray-800 text-xs rounded">{user.role}</span>
                    <span className="px-2 py-1 bg-gray-100 dark:bg-gray-800 text-xs rounded">{user.tier}</span>
                    <span className="px-2 py-1 bg-gray-100 dark:bg-gray-800 text-xs rounded">{user.points || 0} points</span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <select
                    className="border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 rounded px-2 py-1 text-sm"
                    value={user.role}
                    onChange={(e) => changeRoleMutation.mutate({ userId: user.id, role: e.target.value })}
                    data-testid="select-role"
                  >
                    <option value="READER">Reader</option>
                    <option value="AUTHOR">Author</option>
                    <option value="CLUB_ADMIN">Club Admin</option>
                    <option value="STAFF">Staff</option>
                  </select>
                  <select
                    className="border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 rounded px-2 py-1 text-sm"
                    value={user.tier}
                    onChange={(e) => changeTierMutation.mutate({ userId: user.id, tier: e.target.value })}
                    data-testid="select-tier"
                  >
                    <option value="FREE">Free</option>
                    <option value="PRO_AUTHOR">Pro Author</option>
                    <option value="PRO_CLUB">Pro Club</option>
                    <option value="PUBLISHER">Publisher</option>
                  </select>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {activeTab === 'clubs' && (
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">Club Management</h2>
          <div className="space-y-4">
            {clubs?.data?.map((club: any) => (
              <div
                key={club.id}
                className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg"
                data-testid={`club-${club.id}`}
              >
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h3 className="font-semibold">{club.name}</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">{club.description}</p>
                  </div>
                  <span className="px-2 py-1 bg-gray-100 dark:bg-gray-800 text-xs rounded">
                    {club.memberCount || 0} members
                  </span>
                </div>
                {club.activePolls?.map((poll: any) => (
                  <div key={poll.id} className="mt-3 p-3 bg-gray-100 dark:bg-gray-800 rounded">
                    <div className="flex justify-between items-center">
                      <p className="text-sm">
                        Poll: {poll.title} ({poll.voteCount} votes)
                      </p>
                      <Button
                        size="sm"
                        onClick={() => closePollMutation.mutate({ pollId: poll.id })}
                        data-testid="button-close-poll"
                      >
                        Close Poll
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </Card>
      )}

      {activeTab === 'pitches' && (
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">Pitch Management</h2>
          <div className="space-y-4">
            {pitches?.data?.map((pitch: any) => (
              <div
                key={pitch.id}
                className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg"
                data-testid={`pitch-${pitch.id}`}
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <h3 className="font-semibold">{pitch.title}</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      by {pitch.author?.name} • {pitch.impressions || 0} impressions
                    </p>
                    <div className="flex gap-2 mt-2">
                      <span className="px-2 py-1 bg-gray-100 dark:bg-gray-800 text-xs rounded">{pitch.status}</span>
                      {pitch.isBoosted && <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900 text-xs rounded">Boosted</span>}
                      {pitch.isSponsored && <span className="px-2 py-1 bg-purple-100 dark:bg-purple-900 text-xs rounded">Sponsored</span>}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {activeTab === 'badges' && (
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">Badge Management</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            Revoke badges from users when necessary
          </p>
          <div className="space-y-4">
            {users?.data?.map((user: any) => {
              if (!user.badges?.length) return null;
              return (
                <div key={user.id} className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
                  <p className="font-medium mb-2">{user.name || user.email}</p>
                  <div className="flex flex-wrap gap-2">
                    {user.badges.map((badge: any) => (
                      <div key={badge.code} className="flex items-center gap-1 bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">
                        <span className="text-xs">{badge.code}</span>
                        <button
                          className="text-red-600 hover:text-red-800 font-bold ml-1"
                          onClick={() =>
                            revokeBadgeMutation.mutate({ userId: user.id, badgeCode: badge.code })
                          }
                          data-testid="button-revoke-badge"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}
    </div>
  );
}
