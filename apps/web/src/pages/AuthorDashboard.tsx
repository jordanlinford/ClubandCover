import { useQuery } from '@tanstack/react-query';
import { useLocation } from 'wouter';
import { Card } from '@repo/ui';
import { Button } from '@repo/ui';
import {
  Lightbulb,
  TrendingUp,
  Award,
  Users,
  BookOpen,
  Coins,
  Crown,
  ArrowRight,
  Plus,
  ExternalLink,
  Zap,
  Target,
  RefreshCcw,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Clock,
  CheckCircle,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export default function AuthorDashboard() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();

  const { data: analyticsData, isLoading: analyticsLoading } = useQuery<any>({
    queryKey: ['/api/analytics/author'],
    enabled: !!user?.id,
  });

  const { data: pitchesData, isLoading: pitchesLoading } = useQuery<any>({
    queryKey: ['/api/pitches/me'],
    enabled: !!user?.id,
  });

  const { data: swapsData, isLoading: swapsLoading } = useQuery<any>({
    queryKey: ['/api/swaps'],
    enabled: !!user?.id,
  });

  const { data: userData } = useQuery<any>({
    queryKey: ['/api/user/me'],
    enabled: !!user?.id,
  });

  const { data: badgesData } = useQuery<any>({
    queryKey: ['/api/badges/my'],
    enabled: !!user?.id,
  });

  const { data: authorProfileData } = useQuery<any>({
    queryKey: ['/api/author-profiles'],
    enabled: !!user?.id,
    retry: false,
  });

  // Server-side filtered data (already scoped to current user)
  const analytics = analyticsData?.data || {};
  const authorProfile = authorProfileData?.data;
  const myPitches = pitchesData?.data || [];
  
  // Swaps endpoint already filters by user (requester or responder)
  const allSwaps = swapsData?.data || [];
  
  // Active swaps (filter out declined and verified statuses)
  const mySwaps = allSwaps.filter(
    (s: any) => s.status !== 'DECLINED' && s.status !== 'VERIFIED'
  );
  
  // Swap history statistics
  const swapsRequested = allSwaps.filter((s: any) => s.requesterId === user?.id).length;
  const swapsCompleted = allSwaps.filter((s: any) => s.status === 'VERIFIED').length;
  const swapsAbandoned = allSwaps.filter((s: any) => s.status === 'DECLINED' || s.status === 'EXPIRED').length;
  // Success rate: only count completed swaps where user was the requester
  const swapsRequestedAndCompleted = allSwaps.filter((s: any) => s.requesterId === user?.id && s.status === 'VERIFIED').length;
  const swapSuccessRate = swapsRequested > 0 ? Math.round((swapsRequestedAndCompleted / swapsRequested) * 100) : 0;
  
  // Access user data from API response
  const currentUser = (userData as any)?.data;
  const currentTier = currentUser?.tier || 'FREE';
  const creditBalance = currentUser?.creditBalance || 0;
  const badges = badgesData?.data || [];

  // Redirect non-authors
  const userRole = currentUser?.role || user?.user_metadata?.role;
  if (user && userData && userRole !== 'AUTHOR') {
    setLocation('/profile');
    return null;
  }

  // Loading state
  if (!user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Please sign in to view your dashboard</p>
      </div>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'SUBMITTED':
        return 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300';
      case 'NOMINATED':
        return 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300';
      case 'ACCEPTED':
        return 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300';
      case 'REJECTED':
        return 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300';
      default:
        return 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300';
    }
  };

  const getTierBadge = () => {
    switch (currentTier) {
      case 'PUBLISHER':
        return (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-purple-600 text-white">
            <Crown className="h-3 w-3 mr-1" />
            Publisher
          </span>
        );
      case 'PRO':
        return (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-600 text-white">
            <Zap className="h-3 w-3 mr-1" />
            Pro
          </span>
        );
      default:
        return <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border border-gray-300 dark:border-gray-600">Free</span>;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold mb-2" data-testid="heading-author-dashboard">
                Author Dashboard
              </h1>
              <p className="text-muted-foreground">
                Manage your pitches, swaps, and grow your audience
              </p>
            </div>
            {getTierBadge()}
          </div>
        </div>

        {/* Author Verification Alert */}
        {authorProfile && authorProfile.verificationStatus !== 'VERIFIED' && (
          <Card className="mb-8 p-6 border-2 border-yellow-500 dark:border-yellow-600 bg-yellow-50 dark:bg-yellow-900/20">
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-3">
                {authorProfile.verificationStatus === 'UNVERIFIED' && (
                  <AlertCircle className="w-6 h-6 text-yellow-600 dark:text-yellow-500 flex-shrink-0 mt-0.5" />
                )}
                {authorProfile.verificationStatus === 'PENDING' && (
                  <Clock className="w-6 h-6 text-yellow-600 dark:text-yellow-500 flex-shrink-0 mt-0.5" />
                )}
                {authorProfile.verificationStatus === 'REJECTED' && (
                  <XCircle className="w-6 h-6 text-red-600 dark:text-red-500 flex-shrink-0 mt-0.5" />
                )}
                <div className="flex-1">
                  <h3 className="text-lg font-semibold mb-1 text-yellow-900 dark:text-yellow-100">
                    {authorProfile.verificationStatus === 'UNVERIFIED' && 'Complete Author Verification'}
                    {authorProfile.verificationStatus === 'PENDING' && 'Verification Under Review'}
                    {authorProfile.verificationStatus === 'REJECTED' && 'Verification Rejected'}
                  </h3>
                  <p className="text-sm text-yellow-800 dark:text-yellow-200 mb-3">
                    {authorProfile.verificationStatus === 'UNVERIFIED' && 
                      'Verify your author status to publish pitches and participate in author swaps. This helps build trust with readers and clubs.'
                    }
                    {authorProfile.verificationStatus === 'PENDING' && 
                      'Our team is reviewing your verification submission. You\'ll receive an update within 24-48 hours.'
                    }
                    {authorProfile.verificationStatus === 'REJECTED' && 
                      `Your verification was not approved. ${authorProfile.rejectionReason || 'Please submit additional proof of your published works.'}`
                    }
                  </p>
                  {(authorProfile.verificationStatus === 'UNVERIFIED' || authorProfile.verificationStatus === 'REJECTED') && (
                    <Button
                      onClick={() => setLocation('/author-verification')}
                      data-testid="button-goto-verification"
                    >
                      {authorProfile.verificationStatus === 'UNVERIFIED' ? 'Get Verified' : 'Resubmit Verification'}
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </Card>
        )}
        {authorProfile && authorProfile.verificationStatus === 'VERIFIED' && (
          <Card className="mb-8 p-6 border-2 border-green-500 dark:border-green-600 bg-green-50 dark:bg-green-900/20">
            <div className="flex items-center gap-3">
              <CheckCircle className="w-6 h-6 text-green-600 dark:text-green-500" />
              <div>
                <h3 className="text-lg font-semibold text-green-900 dark:text-green-100">
                  Verified Author
                </h3>
                <p className="text-sm text-green-800 dark:text-green-200">
                  You're verified and can now publish pitches and participate in all author features.
                </p>
              </div>
            </div>
          </Card>
        )}

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card className="p-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                <Lightbulb className="h-5 w-5 text-purple-600 dark:text-purple-400" />
              </div>
              <div className="flex-1">
                <p className="text-sm text-muted-foreground">Total Pitches</p>
                <p className="text-2xl font-bold" data-testid="stat-total-pitches">
                  {analyticsLoading ? '...' : analytics.totalPitches || 0}
                </p>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                <Award className="h-5 w-5 text-green-600 dark:text-green-400" />
              </div>
              <div className="flex-1">
                <p className="text-sm text-muted-foreground">Accepted</p>
                <p className="text-2xl font-bold" data-testid="stat-accepted-pitches">
                  {analyticsLoading ? '...' : analytics.acceptedPitches || 0}
                </p>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                <Users className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div className="flex-1">
                <p className="text-sm text-muted-foreground">Total Votes</p>
                <p className="text-2xl font-bold" data-testid="stat-total-votes">
                  {analyticsLoading ? '...' : analytics.totalVotes || 0}
                </p>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
                <Coins className="h-5 w-5 text-orange-600 dark:text-orange-400" />
              </div>
              <div className="flex-1">
                <p className="text-sm text-muted-foreground">Credits</p>
                <p className="text-2xl font-bold" data-testid="stat-credits">
                  {creditBalance}
                </p>
              </div>
            </div>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* My Pitches */}
            <Card className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Lightbulb className="h-5 w-5 text-primary" />
                  <h2 className="text-xl font-semibold">My Pitches</h2>
                </div>
                <Button
                  size="sm"
                  onClick={() => setLocation('/pitches/new')}
                  data-testid="button-create-pitch"
                >
                  <Plus className="h-4 w-4 mr-1" />
                  New Pitch
                </Button>
              </div>

              {pitchesLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-20 bg-muted animate-pulse rounded-md" />
                  ))}
                </div>
              ) : myPitches.length > 0 ? (
                <div className="space-y-3">
                  {myPitches.slice(0, 5).map((pitch: any) => (
                    <div
                      key={pitch.id}
                      className="p-4 border rounded-md cursor-pointer hover-elevate active-elevate-2 transition-all"
                      onClick={() => setLocation(`/pitches/${pitch.id}`)}
                      data-testid={`pitch-card-${pitch.id}`}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <h3 className="font-semibold">{pitch.book?.title || 'Untitled'}</h3>
                        <span className={`px-2 py-1 rounded-md text-xs font-medium ${getStatusColor(pitch.status)}`}>
                          {pitch.status}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                        {pitch.blurb}
                      </p>
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>{pitch._count?.pollOptions || 0} votes</span>
                        <span>{new Date(pitch.createdAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                  ))}
                  {myPitches.length > 5 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full"
                      onClick={() => setLocation('/pitches')}
                      data-testid="button-view-all-pitches"
                    >
                      View All Pitches
                      <ArrowRight className="h-4 w-4 ml-1" />
                    </Button>
                  )}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Lightbulb className="h-12 w-12 mx-auto mb-3 opacity-50 text-muted-foreground" />
                  <p className="text-muted-foreground mb-4">No pitches yet</p>
                  <Button onClick={() => setLocation('/pitches/new')} data-testid="button-create-first-pitch">
                    Create Your First Pitch
                  </Button>
                </div>
              )}
            </Card>

            {/* Swap History Statistics */}
            <Card className="p-6">
              <div className="flex items-center gap-2 mb-4">
                <RefreshCcw className="h-5 w-5 text-primary" />
                <h2 className="text-xl font-semibold">Swap History</h2>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="p-4 bg-muted rounded-md">
                  <div className="flex items-center gap-2 mb-1">
                    <BookOpen className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                    <p className="text-sm text-muted-foreground">Requested</p>
                  </div>
                  <p className="text-2xl font-bold" data-testid="stat-swaps-requested">
                    {swapsLoading ? '...' : swapsRequested}
                  </p>
                </div>

                <div className="p-4 bg-muted rounded-md">
                  <div className="flex items-center gap-2 mb-1">
                    <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
                    <p className="text-sm text-muted-foreground">Completed</p>
                  </div>
                  <p className="text-2xl font-bold" data-testid="stat-swaps-completed">
                    {swapsLoading ? '...' : swapsCompleted}
                  </p>
                </div>

                <div className="p-4 bg-muted rounded-md">
                  <div className="flex items-center gap-2 mb-1">
                    <XCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
                    <p className="text-sm text-muted-foreground">Abandoned</p>
                  </div>
                  <p className="text-2xl font-bold" data-testid="stat-swaps-abandoned">
                    {swapsLoading ? '...' : swapsAbandoned}
                  </p>
                </div>

                <div className="p-4 bg-muted rounded-md">
                  <div className="flex items-center gap-2 mb-1">
                    <TrendingUp className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                    <p className="text-sm text-muted-foreground">Success Rate</p>
                  </div>
                  <p className="text-2xl font-bold" data-testid="stat-swap-success-rate">
                    {swapsLoading ? '...' : `${swapSuccessRate}%`}
                  </p>
                </div>
              </div>

              <Button
                variant="outline"
                size="sm"
                className="w-full"
                onClick={() => setLocation('/swaps')}
                data-testid="button-view-all-swaps"
              >
                View All Swaps
                <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            </Card>

            {/* Active Swaps */}
            <Card className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <BookOpen className="h-5 w-5 text-primary" />
                  <h2 className="text-xl font-semibold">Active Swaps</h2>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setLocation('/swaps')}
                  data-testid="button-view-active-swaps"
                >
                  View All
                </Button>
              </div>

              {swapsLoading ? (
                <div className="space-y-3">
                  {[1, 2].map((i) => (
                    <div key={i} className="h-16 bg-muted animate-pulse rounded-md" />
                  ))}
                </div>
              ) : mySwaps.length > 0 ? (
                <div className="space-y-3">
                  {mySwaps.slice(0, 3).map((swap: any) => (
                    <div
                      key={swap.id}
                      className="p-4 border rounded-md"
                      data-testid={`swap-card-${swap.id}`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium text-sm">
                          {swap.requesterId === user?.id ? 'Sent' : 'Received'}
                        </span>
                        <span className="px-2 py-1 rounded-md text-xs font-medium border border-gray-300 dark:border-gray-600">
                          {swap.status}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {swap.message || 'Book swap request'}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6">
                  <BookOpen className="h-10 w-10 mx-auto mb-2 opacity-50 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">No active swaps</p>
                </div>
              )}
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Upgrade Card */}
            {currentTier === 'FREE' && (
              <Card className="p-6 bg-gradient-to-br from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 border-2 border-purple-200 dark:border-purple-800">
                <div className="flex items-start gap-3 mb-4">
                  <div className="p-2 bg-purple-600 rounded-lg">
                    <Crown className="h-5 w-5 text-white" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold mb-1">Upgrade to Pro</h3>
                    <p className="text-sm text-muted-foreground">
                      Get more pitches, priority matching, and advanced analytics
                    </p>
                  </div>
                </div>
                <Button
                  className="w-full"
                  onClick={() => setLocation('/billing')}
                  data-testid="button-upgrade-account"
                >
                  Upgrade Now
                  <ExternalLink className="h-4 w-4 ml-1" />
                </Button>
              </Card>
            )}

            {/* Quick Actions */}
            <Card className="p-6">
              <h3 className="font-semibold mb-4">Quick Actions</h3>
              <div className="space-y-2">
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => setLocation('/pitches/new')}
                  data-testid="button-quick-create-pitch"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Create Pitch
                </Button>
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => setLocation('/analytics/author')}
                  data-testid="button-view-analytics"
                >
                  <TrendingUp className="h-4 w-4 mr-2" />
                  View Analytics
                </Button>
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => setLocation('/billing')}
                  data-testid="button-buy-credits"
                >
                  <Coins className="h-4 w-4 mr-2" />
                  Buy Credits
                </Button>
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => setLocation('/discover?tab=clubs')}
                  data-testid="button-discover-clubs"
                >
                  <Target className="h-4 w-4 mr-2" />
                  Discover Clubs
                </Button>
              </div>
            </Card>

            {/* Badges */}
            <Card className="p-6">
              <div className="flex items-center gap-2 mb-4">
                <Award className="h-5 w-5 text-primary" />
                <h3 className="font-semibold">My Badges</h3>
              </div>
              {badges.length > 0 ? (
                <div className="grid grid-cols-3 gap-3">
                  {badges.slice(0, 6).map((badge: any) => (
                    <div
                      key={badge.id}
                      className="flex flex-col items-center p-2 rounded-md hover-elevate cursor-pointer"
                      title={badge.badge.description}
                      data-testid={`badge-${badge.id}`}
                    >
                      <div className="text-3xl mb-1">{badge.badge.icon}</div>
                      <p className="text-xs text-center text-muted-foreground line-clamp-2">
                        {badge.badge.name}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-4">
                  <Award className="h-8 w-8 mx-auto mb-2 opacity-50 text-muted-foreground" />
                  <p className="text-xs text-muted-foreground">No badges yet</p>
                </div>
              )}
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
