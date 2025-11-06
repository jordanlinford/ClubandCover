import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Users, BookOpen, Award, Shield, TrendingUp } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState('overview');
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: users } = useQuery({
    queryKey: ['/api/admin/users'],
    enabled: activeTab === 'users',
  });

  const { data: clubs } = useQuery({
    queryKey: ['/api/admin/clubs'],
    enabled: activeTab === 'clubs',
  });

  const { data: pitches } = useQuery({
    queryKey: ['/api/admin/pitches'],
    enabled: activeTab === 'pitches',
  });

  const { data: stats } = useQuery({
    queryKey: ['/api/admin/stats'],
  });

  const changeRoleMutation = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: string }) => {
      return apiRequest('/api/admin/users/:userId/role', {
        method: 'PATCH',
        body: { role },
        params: { userId },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users'] });
      toast({ title: 'Success', description: 'User role updated' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  const changeTierMutation = useMutation({
    mutationFn: async ({ userId, tier }: { userId: string; tier: string }) => {
      return apiRequest('/api/admin/users/:userId/tier', {
        method: 'PATCH',
        body: { tier },
        params: { userId },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users'] });
      toast({ title: 'Success', description: 'User tier updated' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  const closePollMutation = useMutation({
    mutationFn: async ({ pollId }: { pollId: string }) => {
      return apiRequest('/api/admin/polls/:pollId/close', {
        method: 'POST',
        params: { pollId },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/clubs'] });
      toast({ title: 'Success', description: 'Poll closed' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  const revokeBadgeMutation = useMutation({
    mutationFn: async ({ userId, badgeCode }: { userId: string; badgeCode: string }) => {
      return apiRequest('/api/admin/badges/revoke', {
        method: 'POST',
        body: { userId, badgeCode },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users'] });
      toast({ title: 'Success', description: 'Badge revoked' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  return (
    <div className="container mx-auto px-4 py-8" data-testid="page-admin-dashboard">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <Shield className="h-8 w-8 text-red-600" />
          <h1 className="text-3xl font-bold">Admin Dashboard</h1>
        </div>
        <p className="text-muted-foreground">Manage users, clubs, pitches, and platform settings</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-5 mb-8">
          <TabsTrigger value="overview" data-testid="tab-overview">
            <TrendingUp className="h-4 w-4 mr-2" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="users" data-testid="tab-users">
            <Users className="h-4 w-4 mr-2" />
            Users
          </TabsTrigger>
          <TabsTrigger value="clubs" data-testid="tab-clubs">
            <Users className="h-4 w-4 mr-2" />
            Clubs
          </TabsTrigger>
          <TabsTrigger value="pitches" data-testid="tab-pitches">
            <BookOpen className="h-4 w-4 mr-2" />
            Pitches
          </TabsTrigger>
          <TabsTrigger value="badges" data-testid="tab-badges">
            <Award className="h-4 w-4 mr-2" />
            Badges
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Users</p>
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
                  <p className="text-sm text-muted-foreground">Total Clubs</p>
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
                  <p className="text-sm text-muted-foreground">Total Pitches</p>
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
                  <p className="text-sm text-muted-foreground">Active Swaps</p>
                  <p className="text-3xl font-bold" data-testid="stat-active-swaps">
                    {stats?.data?.activeSwaps || 0}
                  </p>
                </div>
                <TrendingUp className="h-8 w-8 text-orange-600" />
              </div>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="users" className="space-y-4">
          <Card>
            <div className="p-6">
              <h2 className="text-xl font-semibold mb-4">User Management</h2>
              <div className="space-y-4">
                {users?.data?.map((user: any) => (
                  <div
                    key={user.id}
                    className="flex items-center justify-between p-4 border rounded-lg"
                    data-testid={`user-${user.id}`}
                  >
                    <div className="flex-1">
                      <p className="font-medium">{user.name || user.email}</p>
                      <p className="text-sm text-muted-foreground">{user.email}</p>
                      <div className="flex gap-2 mt-2">
                        <Badge variant="outline">{user.role}</Badge>
                        <Badge variant="secondary">{user.tier}</Badge>
                        <Badge>
                          {user.points || 0} points
                        </Badge>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <select
                        className="border rounded px-2 py-1 text-sm"
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
                        className="border rounded px-2 py-1 text-sm"
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
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="clubs" className="space-y-4">
          <Card>
            <div className="p-6">
              <h2 className="text-xl font-semibold mb-4">Club Management</h2>
              <div className="space-y-4">
                {clubs?.data?.map((club: any) => (
                  <div
                    key={club.id}
                    className="p-4 border rounded-lg"
                    data-testid={`club-${club.id}`}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h3 className="font-semibold">{club.name}</h3>
                        <p className="text-sm text-muted-foreground">{club.description}</p>
                      </div>
                      <Badge>{club.memberCount || 0} members</Badge>
                    </div>
                    {club.activePolls?.map((poll: any) => (
                      <div key={poll.id} className="mt-3 p-3 bg-muted rounded">
                        <div className="flex justify-between items-center">
                          <p className="text-sm">
                            Poll: {poll.title} ({poll.voteCount} votes)
                          </p>
                          <Button
                            size="sm"
                            variant="outline"
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
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="pitches" className="space-y-4">
          <Card>
            <div className="p-6">
              <h2 className="text-xl font-semibold mb-4">Pitch Management</h2>
              <div className="space-y-4">
                {pitches?.data?.map((pitch: any) => (
                  <div
                    key={pitch.id}
                    className="p-4 border rounded-lg"
                    data-testid={`pitch-${pitch.id}`}
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <h3 className="font-semibold">{pitch.title}</h3>
                        <p className="text-sm text-muted-foreground">
                          by {pitch.author?.name} • {pitch.impressions || 0} impressions
                        </p>
                        <div className="flex gap-2 mt-2">
                          <Badge>{pitch.status}</Badge>
                          {pitch.isBoosted && <Badge variant="secondary">Boosted</Badge>}
                          {pitch.isSponsored && <Badge variant="secondary">Sponsored</Badge>}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="badges" className="space-y-4">
          <Card>
            <div className="p-6">
              <h2 className="text-xl font-semibold mb-4">Badge Management</h2>
              <p className="text-sm text-muted-foreground mb-4">
                Revoke badges from users when necessary
              </p>
              <div className="space-y-4">
                {users?.data?.map((user: any) => {
                  if (!user.badges?.length) return null;
                  return (
                    <div key={user.id} className="p-4 border rounded-lg">
                      <p className="font-medium mb-2">{user.name || user.email}</p>
                      <div className="flex flex-wrap gap-2">
                        {user.badges.map((badge: any) => (
                          <div key={badge.code} className="flex items-center gap-1">
                            <Badge>{badge.code}</Badge>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() =>
                                revokeBadgeMutation.mutate({ userId: user.id, badgeCode: badge.code })
                              }
                              data-testid="button-revoke-badge"
                            >
                              ×
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
