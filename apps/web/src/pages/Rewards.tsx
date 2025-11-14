import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button, Card } from '@repo/ui';
import { Gift, Sparkles, Trophy, BookOpen, Clock, Check } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../lib/api';
import { useState } from 'react';

// Simple Badge component
const Badge = ({ children, className = '' }: { children: React.ReactNode; className?: string }) => (
  <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${className || 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200'}`}>
    {children}
  </span>
);

type RewardType = 'PLATFORM' | 'AUTHOR_CONTRIBUTED' | 'FEATURE' | 'DIGITAL';

interface RewardItem {
  id: string;
  name: string;
  description: string | null;
  pointsCost: number;
  rewardType: RewardType;
  copiesAvailable: number | null;
  copiesRedeemed: number;
  imageUrl: string | null;
  contributorId: string | null;
  isActive: boolean;
  sortOrder: number;
  isAvailable: boolean;
  remainingCopies: number | null;
  contributor: {
    id: string;
    name: string;
    avatarUrl: string | null;
  } | null;
}

interface RedemptionHistory {
  id: string;
  status: 'PENDING' | 'APPROVED' | 'DECLINED' | 'FULFILLED' | 'CANCELLED';
  pointsSpent: number;
  createdAt: string;
  rewardItem: {
    id: string;
    name: string;
    description: string | null;
    imageUrl: string | null;
    rewardType: RewardType;
  };
}

const rewardTypeIcons: Record<RewardType, any> = {
  PLATFORM: Gift,
  AUTHOR_CONTRIBUTED: BookOpen,
  FEATURE: Sparkles,
  DIGITAL: Trophy,
};

const rewardTypeLabels: Record<RewardType, string> = {
  PLATFORM: 'Platform',
  AUTHOR_CONTRIBUTED: 'Author Gift',
  FEATURE: 'Feature',
  DIGITAL: 'Digital',
};

export function RewardsPage() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const { data: rewardsResponse, isLoading: rewardsLoading } = useQuery<any>({
    queryKey: ['/api/rewards'],
  });

  const { data: pointsResponse } = useQuery<any>({
    queryKey: ['/api/points/me'],
    enabled: !!user,
  });

  const { data: historyResponse } = useQuery<any>({
    queryKey: ['/api/rewards/redemptions/me'],
    enabled: !!user,
  });

  const redeemMutation = useMutation({
    mutationFn: async (rewardItemId: string) => {
      return api.post('/rewards/redemptions', { rewardItemId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/rewards'] });
      queryClient.invalidateQueries({ queryKey: ['/api/rewards/redemptions/me'] });
      queryClient.invalidateQueries({ queryKey: ['/api/users/me'] });
      setErrorMessage('');
      setSuccessMessage('Redemption successful! Your request has been submitted and points deducted.');
      setTimeout(() => setSuccessMessage(''), 3000);
    },
    onError: (error: Error) => {
      setSuccessMessage('');
      setErrorMessage(error.message || 'Failed to redeem reward');
    },
  });

  const handleRedeem = (reward: RewardItem) => {
    if (!user) {
      setErrorMessage('Please sign in to redeem rewards');
      return;
    }

    if (userPoints < reward.pointsCost) {
      setErrorMessage(`You need ${reward.pointsCost} points but only have ${userPoints}`);
      return;
    }

    if (!reward.isAvailable) {
      setErrorMessage('This reward is currently unavailable');
      return;
    }

    redeemMutation.mutate(reward.id);
  };

  const rewards: RewardItem[] = rewardsResponse?.data || [];
  const history: RedemptionHistory[] = historyResponse?.data || [];
  const userPoints = pointsResponse?.data?.points || 0;

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8 py-8">
      <div className="pb-8 border-b border-border mb-8">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-3xl md:text-4xl font-semibold tracking-tight mb-2">Rewards Catalog</h1>
            <p className="text-base text-muted-foreground">
              Redeem your points for exclusive rewards and benefits
            </p>
          </div>
          {user && (
            <Card className="px-6 py-3">
              <div className="flex items-center gap-3">
                <Trophy className="w-5 h-5 text-primary" />
                <div>
                  <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Your Points</div>
                  <div className="text-2xl font-semibold">{userPoints}</div>
                </div>
              </div>
            </Card>
          )}
        </div>
      </div>

      {successMessage && (
        <div className="mb-6 p-4 bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 rounded-md">
          {successMessage}
        </div>
      )}

      {errorMessage && (
        <div className="mb-6 p-4 bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200 rounded-md">
          {errorMessage}
        </div>
      )}

      {rewardsLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <Card key={i} className="p-6 animate-pulse">
              <div className="h-4 bg-muted rounded w-2/3 mb-2" />
              <div className="h-3 bg-muted rounded w-full mb-4" />
              <div className="h-20 bg-muted rounded mb-4" />
              <div className="h-9 bg-muted rounded w-full" />
            </Card>
          ))}
        </div>
      ) : (
        <div className="space-y-12">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {rewards.map((reward) => {
              const Icon = rewardTypeIcons[reward.rewardType];
              const canAfford = userPoints >= reward.pointsCost;

              return (
                <Card key={reward.id} className="p-6 flex flex-col" data-testid={`card-reward-${reward.id}`}>
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Icon className="w-4 h-4 text-muted-foreground" />
                        <Badge className="text-xs">
                          {rewardTypeLabels[reward.rewardType]}
                        </Badge>
                      </div>
                      <h3 className="text-xl font-semibold">{reward.name}</h3>
                    </div>
                  </div>

                  <div className="flex-1 mb-4">
                    <p className="text-sm text-muted-foreground leading-relaxed mb-4">
                      {reward.description || 'No description available'}
                    </p>
                    {reward.contributor && (
                      <div className="text-xs text-muted-foreground flex items-center gap-1.5">
                        <BookOpen className="w-3 h-3" />
                        <span>Contributed by {reward.contributor.name}</span>
                      </div>
                    )}
                    {reward.copiesAvailable && (
                      <div className="text-xs text-muted-foreground mt-2 flex items-center gap-1.5">
                        <Clock className="w-3 h-3" />
                        <span>
                          {reward.remainingCopies} of {reward.copiesAvailable} remaining
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-2xl font-semibold">{reward.pointsCost}</span>
                      <span className="text-sm text-muted-foreground">points</span>
                    </div>
                    <Button
                      className="w-full"
                      onClick={() => handleRedeem(reward)}
                      disabled={!canAfford || !reward.isAvailable || redeemMutation.isPending}
                      data-testid={`button-redeem-${reward.id}`}
                    >
                      {!reward.isAvailable ? 'Out of Stock' : !canAfford ? 'Insufficient Points' : 'Redeem'}
                    </Button>
                  </div>
                </Card>
              );
            })}
          </div>

          {rewards.length === 0 && !rewardsLoading && (
            <Card className="p-12 text-center">
              <Gift className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2">No rewards available</h3>
              <p className="text-muted-foreground">Check back soon for new rewards!</p>
            </Card>
          )}

          {user && history.length > 0 && (
            <div>
              <h2 className="text-2xl font-semibold mb-6">Your Redemption History</h2>
              <div className="space-y-4">
                {history.map((redemption) => (
                  <Card key={redemption.id} className="p-6" data-testid={`card-redemption-${redemption.id}`}>
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex-1">
                        <h3 className="text-base font-semibold mb-1">{redemption.rewardItem.name}</h3>
                        <p className="text-sm text-muted-foreground">
                          {new Date(redemption.createdAt).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                          })}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge
                          className={
                            redemption.status === 'FULFILLED'
                              ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                              : redemption.status === 'DECLINED'
                                ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                                : ''
                          }
                          data-testid={`badge-status-${redemption.id}`}
                        >
                          {redemption.status === 'FULFILLED' && <Check className="w-3 h-3 mr-1" />}
                          {redemption.status}
                        </Badge>
                        <div className="text-right">
                          <div className="text-sm text-muted-foreground">Points Spent</div>
                          <div className="text-lg font-semibold">{redemption.pointsSpent}</div>
                        </div>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
