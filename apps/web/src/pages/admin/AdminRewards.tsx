import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button, Card } from '@repo/ui';
import { Plus, Edit, Clock, Check, X, Gift } from 'lucide-react';
import { api } from '../../lib/api';

// Simple Badge component
const Badge = ({ children, className = '' }: { children: React.ReactNode; className?: string }) => (
  <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${className || 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200'}`}>
    {children}
  </span>
);

type RewardType = 'PLATFORM' | 'AUTHOR_CONTRIBUTED' | 'FEATURE' | 'DIGITAL';
type RedemptionStatus = 'PENDING' | 'APPROVED' | 'DECLINED' | 'FULFILLED' | 'CANCELLED';

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
  contributor: {
    id: string;
    name: string;
    email: string;
  } | null;
  _count: {
    redemptions: number;
  };
}

interface RedemptionRequest {
  id: string;
  status: RedemptionStatus;
  pointsSpent: number;
  createdAt: string;
  reviewedAt: string | null;
  rejectionReason: string | null;
  notes: string | null;
  user: {
    id: string;
    name: string;
    email: string;
    points: number;
  };
  rewardItem: {
    id: string;
    name: string;
    description: string | null;
    pointsCost: number;
    rewardType: RewardType;
    imageUrl: string | null;
  };
  reviewer: {
    id: string;
    name: string;
  } | null;
}

export function AdminRewardsPage() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'rewards' | 'redemptions'>('rewards');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingReward, setEditingReward] = useState<RewardItem | null>(null);
  const [reviewingRedemption, setReviewingRedemption] = useState<RedemptionRequest | null>(null);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const { data: rewardsResponse, isLoading: rewardsLoading } = useQuery<any>({
    queryKey: ['/api/admin/rewards'],
  });

  const { data: redemptionsResponse, isLoading: redemptionsLoading } = useQuery<any>({
    queryKey: ['/api/admin/redemptions'],
  });

  const createRewardMutation = useMutation({
    mutationFn: async (data: any) => api.post('/admin/rewards', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/rewards'] });
      setErrorMessage('');
      setSuccessMessage('Reward created successfully');
      setTimeout(() => setSuccessMessage(''), 3000);
      setIsCreateDialogOpen(false);
    },
    onError: (error: Error) => {
      setSuccessMessage('');
      setErrorMessage(error.message || 'Failed to create reward');
    },
  });

  const updateRewardMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => api.patch(`/admin/rewards/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/rewards'] });
      setErrorMessage('');
      setSuccessMessage('Reward updated successfully');
      setTimeout(() => setSuccessMessage(''), 3000);
      setEditingReward(null);
    },
    onError: (error: Error) => {
      setSuccessMessage('');
      setErrorMessage(error.message || 'Failed to update reward');
    },
  });

  const updateRedemptionMutation = useMutation({
    mutationFn: async ({
      id,
      status,
      rejectionReason,
      notes,
    }: {
      id: string;
      status: RedemptionStatus;
      rejectionReason?: string;
      notes?: string;
    }) => api.patch(`/admin/redemptions/${id}`, { status, rejectionReason, notes }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/redemptions'] });
      setErrorMessage('');
      setSuccessMessage('Redemption updated successfully');
      setTimeout(() => setSuccessMessage(''), 3000);
      setReviewingRedemption(null);
    },
    onError: (error: Error) => {
      setSuccessMessage('');
      setErrorMessage(error.message || 'Failed to update redemption');
    },
  });

  const rewards: RewardItem[] = rewardsResponse?.data || [];
  const redemptions: RedemptionRequest[] = redemptionsResponse?.data || [];
  const pendingRedemptions = redemptions.filter((r) => r.status === 'PENDING');

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8 py-8">
      <div className="pb-8 border-b border-border mb-8">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-3xl md:text-4xl font-semibold tracking-tight mb-2">Rewards Management</h1>
            <p className="text-base text-muted-foreground">Manage rewards catalog and redemption requests</p>
          </div>
          <Button onClick={() => setIsCreateDialogOpen(true)} data-testid="button-create-reward">
            <Plus className="w-4 h-4 mr-2" />
            Create Reward
          </Button>
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

      <div className="mb-6 flex gap-2">
        <Button
          variant={activeTab === 'rewards' ? 'default' : 'outline'}
          onClick={() => setActiveTab('rewards')}
          data-testid="tab-rewards"
        >
          Rewards Catalog
        </Button>
        <Button
          variant={activeTab === 'redemptions' ? 'default' : 'outline'}
          onClick={() => setActiveTab('redemptions')}
          data-testid="tab-redemptions"
        >
          Redemption Requests
          {pendingRedemptions.length > 0 && (
            <Badge className="ml-2 bg-red-500 text-white">{pendingRedemptions.length}</Badge>
          )}
        </Button>
      </div>

      {activeTab === 'rewards' && (
        <div className="space-y-6">
          {rewardsLoading ? (
            <div>Loading...</div>
          ) : (
            <div className="space-y-4">
              {rewards.map((reward) => (
                <Card key={reward.id} className="p-6" data-testid={`card-reward-${reward.id}`}>
                  <div className="flex items-start justify-between gap-4 mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge
                          className={
                            reward.isActive
                              ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                              : 'bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
                          }
                        >
                          {reward.isActive ? 'Active' : 'Inactive'}
                        </Badge>
                        <Badge>{reward.rewardType}</Badge>
                      </div>
                      <h3 className="text-xl font-semibold">{reward.name}</h3>
                      <p className="text-sm text-muted-foreground mt-1">{reward.description}</p>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setEditingReward(reward)}
                      data-testid={`button-edit-${reward.id}`}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <div className="text-muted-foreground">Points Cost</div>
                      <div className="font-semibold">{reward.pointsCost}</div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">Total Redemptions</div>
                      <div className="font-semibold">{reward._count.redemptions}</div>
                    </div>
                    {reward.copiesAvailable && (
                      <>
                        <div>
                          <div className="text-muted-foreground">Available</div>
                          <div className="font-semibold">{reward.copiesAvailable - reward.copiesRedeemed}</div>
                        </div>
                        <div>
                          <div className="text-muted-foreground">Redeemed</div>
                          <div className="font-semibold">
                            {reward.copiesRedeemed} / {reward.copiesAvailable}
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                </Card>
              ))}

              {rewards.length === 0 && (
                <Card className="p-12 text-center">
                  <Gift className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-xl font-semibold mb-2">No rewards yet</h3>
                  <p className="text-muted-foreground mb-4">Create your first reward to get started</p>
                  <Button onClick={() => setIsCreateDialogOpen(true)}>
                    <Plus className="w-4 h-4 mr-2" />
                    Create Reward
                  </Button>
                </Card>
              )}
            </div>
          )}
        </div>
      )}

      {activeTab === 'redemptions' && (
        <div className="space-y-6">
          {redemptionsLoading ? (
            <div>Loading...</div>
          ) : (
            <div className="space-y-4">
              {redemptions.map((redemption) => (
                <Card key={redemption.id} className="p-6" data-testid={`card-redemption-${redemption.id}`}>
                  <div className="flex items-start justify-between gap-4 mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge
                          className={
                            redemption.status === 'FULFILLED'
                              ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                              : redemption.status === 'DECLINED'
                                ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                                : ''
                          }
                        >
                          {redemption.status}
                        </Badge>
                      </div>
                      <h3 className="text-xl font-semibold">{redemption.rewardItem.name}</h3>
                      <p className="text-sm text-muted-foreground">
                        Requested by {redemption.user.name} ({redemption.user.email}) on{' '}
                        {new Date(redemption.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    {redemption.status === 'PENDING' && (
                      <Button
                        size="sm"
                        onClick={() => setReviewingRedemption(redemption)}
                        data-testid={`button-review-${redemption.id}`}
                      >
                        Review
                      </Button>
                    )}
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <div className="text-muted-foreground">Points Spent</div>
                      <div className="font-semibold">{redemption.pointsSpent}</div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">User Current Points</div>
                      <div className="font-semibold">{redemption.user.points}</div>
                    </div>
                    {redemption.reviewer && (
                      <div>
                        <div className="text-muted-foreground">Reviewed By</div>
                        <div className="font-semibold">{redemption.reviewer.name}</div>
                      </div>
                    )}
                    {redemption.notes && (
                      <div className="col-span-2">
                        <div className="text-muted-foreground">Notes</div>
                        <div className="text-sm">{redemption.notes}</div>
                      </div>
                    )}
                  </div>
                </Card>
              ))}

              {redemptions.length === 0 && (
                <Card className="p-12 text-center">
                  <Clock className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-xl font-semibold mb-2">No redemption requests</h3>
                  <p className="text-muted-foreground">Redemption requests will appear here</p>
                </Card>
              )}
            </div>
          )}
        </div>
      )}

      {(isCreateDialogOpen || editingReward) && (
        <RewardFormDialog
          reward={editingReward}
          onClose={() => {
            setIsCreateDialogOpen(false);
            setEditingReward(null);
          }}
          onSubmit={(data) => {
            if (editingReward) {
              updateRewardMutation.mutate({ id: editingReward.id, data });
            } else {
              createRewardMutation.mutate(data);
            }
          }}
          isPending={createRewardMutation.isPending || updateRewardMutation.isPending}
        />
      )}

      {reviewingRedemption && (
        <RedemptionReviewDialog
          redemption={reviewingRedemption}
          onUpdate={(status, rejectionReason, notes) => {
            updateRedemptionMutation.mutate({
              id: reviewingRedemption.id,
              status,
              rejectionReason,
              notes,
            });
          }}
          isPending={updateRedemptionMutation.isPending}
        />
      )}
    </div>
  );
}

function RewardFormDialog({
  reward,
  onClose,
  onSubmit,
  isPending,
}: {
  reward: RewardItem | null;
  onClose: () => void;
  onSubmit: (data: any) => void;
  isPending: boolean;
}) {
  const [formData, setFormData] = useState({
    name: reward?.name || '',
    description: reward?.description || '',
    pointsCost: reward?.pointsCost || 100,
    rewardType: reward?.rewardType || 'PLATFORM',
    copiesAvailable: reward?.copiesAvailable || null,
    imageUrl: reward?.imageUrl || '',
    isActive: reward?.isActive ?? true,
    sortOrder: reward?.sortOrder || 0,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      ...formData,
      copiesAvailable: formData.copiesAvailable || undefined,
      imageUrl: formData.imageUrl || undefined,
    });
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="max-w-2xl w-full p-6">
        <h2 className="text-2xl font-semibold mb-2">{reward ? 'Edit Reward' : 'Create Reward'}</h2>
        <p className="text-muted-foreground mb-6">
          {reward ? 'Update reward details' : 'Add a new reward to the catalog'}
        </p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="name" className="text-sm font-medium">
              Reward Name
            </label>
            <input
              id="name"
              type="text"
              className="w-full px-4 py-2 rounded-md border border-input bg-background"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
              data-testid="input-reward-name"
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="description" className="text-sm font-medium">
              Description
            </label>
            <textarea
              id="description"
              className="w-full px-4 py-2 rounded-md border border-input bg-background"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
              data-testid="input-reward-description"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label htmlFor="pointsCost" className="text-sm font-medium">
                Points Cost
              </label>
              <input
                id="pointsCost"
                type="number"
                className="w-full px-4 py-2 rounded-md border border-input bg-background"
                value={formData.pointsCost}
                onChange={(e) => setFormData({ ...formData, pointsCost: parseInt(e.target.value) })}
                required
                min="1"
                data-testid="input-points-cost"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="rewardType" className="text-sm font-medium">
                Reward Type
              </label>
              <select
                id="rewardType"
                className="w-full px-4 py-2 rounded-md border border-input bg-background"
                value={formData.rewardType}
                onChange={(e) => setFormData({ ...formData, rewardType: e.target.value as RewardType })}
                data-testid="select-reward-type"
              >
                <option value="PLATFORM">Platform</option>
                <option value="AUTHOR_CONTRIBUTED">Author Contributed</option>
                <option value="FEATURE">Feature</option>
                <option value="DIGITAL">Digital</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label htmlFor="copiesAvailable" className="text-sm font-medium">
                Copies Available (Optional)
              </label>
              <input
                id="copiesAvailable"
                type="number"
                className="w-full px-4 py-2 rounded-md border border-input bg-background"
                value={formData.copiesAvailable || ''}
                onChange={(e) =>
                  setFormData({ ...formData, copiesAvailable: e.target.value ? parseInt(e.target.value) : null })
                }
                min="1"
                data-testid="input-copies-available"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="sortOrder" className="text-sm font-medium">
                Sort Order
              </label>
              <input
                id="sortOrder"
                type="number"
                className="w-full px-4 py-2 rounded-md border border-input bg-background"
                value={formData.sortOrder}
                onChange={(e) => setFormData({ ...formData, sortOrder: parseInt(e.target.value) })}
                data-testid="input-sort-order"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label htmlFor="imageUrl" className="text-sm font-medium">
              Image URL (Optional)
            </label>
            <input
              id="imageUrl"
              type="url"
              className="w-full px-4 py-2 rounded-md border border-input bg-background"
              value={formData.imageUrl}
              onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
              data-testid="input-image-url"
            />
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="isActive"
              checked={formData.isActive}
              onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
              className="h-4 w-4"
              data-testid="checkbox-is-active"
            />
            <label htmlFor="isActive" className="text-sm cursor-pointer">
              Active (visible to users)
            </label>
          </div>

          <div className="flex gap-2 justify-end pt-4">
            <Button type="button" variant="outline" onClick={onClose} disabled={isPending}>
              Cancel
            </Button>
            <Button type="submit" disabled={isPending} data-testid="button-submit-reward">
              {reward ? 'Update' : 'Create'} Reward
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}

function RedemptionReviewDialog({
  redemption,
  onUpdate,
  isPending,
}: {
  redemption: RedemptionRequest;
  onUpdate: (status: RedemptionStatus, rejectionReason?: string, notes?: string) => void;
  isPending: boolean;
}) {
  const [rejectionReason, setRejectionReason] = useState('');
  const [notes, setNotes] = useState('');

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="max-w-2xl w-full p-6">
        <h2 className="text-2xl font-semibold mb-2">Review Redemption Request</h2>
        <p className="text-muted-foreground mb-6">
          {redemption.user.name} wants to redeem {redemption.rewardItem.name}
        </p>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <div className="text-muted-foreground">User</div>
              <div className="font-semibold">{redemption.user.name}</div>
              <div className="text-xs text-muted-foreground">{redemption.user.email}</div>
            </div>
            <div>
              <div className="text-muted-foreground">Points Spent</div>
              <div className="font-semibold">{redemption.pointsSpent}</div>
            </div>
            <div>
              <div className="text-muted-foreground">User Current Points</div>
              <div className="font-semibold">{redemption.user.points}</div>
            </div>
            <div>
              <div className="text-muted-foreground">Requested</div>
              <div className="text-sm">{new Date(redemption.createdAt).toLocaleDateString()}</div>
            </div>
          </div>

          <div className="space-y-2">
            <label htmlFor="notes" className="text-sm font-medium">
              Admin Notes (Optional)
            </label>
            <textarea
              id="notes"
              className="w-full px-4 py-2 rounded-md border border-input bg-background"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Internal notes about this redemption"
              rows={3}
              data-testid="input-admin-notes"
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="rejectionReason" className="text-sm font-medium">
              Rejection Reason (if declining)
            </label>
            <textarea
              id="rejectionReason"
              className="w-full px-4 py-2 rounded-md border border-input bg-background"
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="Explain why this request is being declined"
              rows={2}
              data-testid="input-rejection-reason"
            />
          </div>
        </div>

        <div className="flex gap-2 justify-end pt-6">
          <Button
            variant="destructive"
            onClick={() => onUpdate('DECLINED', rejectionReason || 'No reason provided', notes)}
            disabled={isPending}
            data-testid="button-decline"
          >
            <X className="w-4 h-4 mr-2" />
            Decline
          </Button>
          <Button
            variant="secondary"
            onClick={() => onUpdate('APPROVED', undefined, notes)}
            disabled={isPending}
            data-testid="button-approve"
          >
            <Check className="w-4 h-4 mr-2" />
            Approve
          </Button>
          <Button
            onClick={() => onUpdate('FULFILLED', undefined, notes)}
            disabled={isPending}
            data-testid="button-fulfill"
          >
            <Check className="w-4 h-4 mr-2" />
            Fulfill
          </Button>
        </div>
      </Card>
    </div>
  );
}
