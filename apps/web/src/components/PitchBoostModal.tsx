import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Card } from '@repo/ui';
import { Button } from '@repo/ui';
import { X, TrendingUp, Clock, Zap } from 'lucide-react';

const BOOST_PACKAGES = [
  {
    days: 7,
    credits: 50,
    label: '1 Week',
    icon: Clock,
    popular: false,
  },
  {
    days: 14,
    credits: 90,
    label: '2 Weeks',
    icon: TrendingUp,
    popular: true,
    savings: 10, // 10 credits saved
  },
  {
    days: 30,
    credits: 150,
    label: '1 Month',
    icon: Zap,
    popular: false,
    savings: 60, // 60 credits saved
  },
];

type PitchBoostModalProps = {
  isOpen: boolean;
  onClose: () => void;
  pitchId: string;
  pitchTitle: string;
  currentBalance?: number;
  currentBoostEndsAt?: string | null;
};

export function PitchBoostModal({
  isOpen,
  onClose,
  pitchId,
  pitchTitle,
  currentBalance = 0,
  currentBoostEndsAt,
}: PitchBoostModalProps) {
  const [selectedPackage, setSelectedPackage] = useState(BOOST_PACKAGES[1]);
  const [error, setError] = useState('');
  const queryClient = useQueryClient();

  const isCurrentlyBoosted = currentBoostEndsAt && new Date(currentBoostEndsAt) > new Date();

  const boostMutation = useMutation({
    mutationFn: async (pkg: typeof BOOST_PACKAGES[0]) => {
      const response = await fetch('/api/credits/spend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          pitchId,
          amount: pkg.credits,
          durationDays: pkg.days,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        if (errorData.code === 'INSUFFICIENT_CREDITS') {
          throw new Error(
            `Insufficient credits. You have ${errorData.currentBalance} credits but need ${errorData.required} credits.`
          );
        }
        throw new Error(errorData.error || 'Boost failed');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/pitches', pitchId] });
      queryClient.invalidateQueries({ queryKey: ['/api/user/me'] });
      queryClient.invalidateQueries({ queryKey: ['/api/credits/balance'] });
      setError('');
      onClose();
    },
    onError: (err: any) => {
      setError(err.message || 'Failed to boost pitch');
    },
  });

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" data-testid="modal-pitch-boost">
      <Card className="max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold" data-testid="text-modal-title">Boost Visibility</h2>
              <p className="text-sm text-muted-foreground mt-1">
                "{pitchTitle}"
              </p>
              <p className="text-sm font-medium mt-2">
                Available: <span className="text-primary" data-testid="text-current-balance">{currentBalance} credits</span>
              </p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              data-testid="button-close-modal"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          {isCurrentlyBoosted && (
            <div className="mb-4 p-3 bg-primary/10 border border-primary/20 rounded text-sm" data-testid="text-currently-boosted">
              <p className="font-medium">Currently Boosted</p>
              <p className="text-muted-foreground">
                Active until {new Date(currentBoostEndsAt).toLocaleDateString()}. Additional boosts extend the duration.
              </p>
            </div>
          )}

          {error && (
            <div className="mb-4 p-3 bg-destructive/10 border border-destructive/20 rounded text-sm text-destructive" data-testid="text-error">
              {error}
            </div>
          )}

          <div className="grid md:grid-cols-3 gap-4 mb-6">
            {BOOST_PACKAGES.map((pkg) => {
              const Icon = pkg.icon;
              const isSelected = selectedPackage.days === pkg.days;
              const canAfford = currentBalance >= pkg.credits;

              return (
                <Card
                  key={pkg.days}
                  className={`p-4 cursor-pointer transition-all ${
                    isSelected ? 'ring-2 ring-primary' : ''
                  } ${pkg.popular ? 'border-primary' : ''} ${
                    !canAfford ? 'opacity-50' : ''
                  }`}
                  onClick={() => canAfford && setSelectedPackage(pkg)}
                  data-testid={`card-package-${pkg.days}`}
                >
                  {pkg.popular && (
                    <div className="text-xs font-semibold text-primary mb-2" data-testid="text-popular">
                      BEST VALUE
                    </div>
                  )}
                  <div className="flex items-center gap-2 mb-3">
                    <Icon className="h-5 w-5 text-primary" />
                    <h3 className="font-semibold">{pkg.label}</h3>
                  </div>
                  <div className="mb-2">
                    <div className="text-2xl font-bold" data-testid={`text-credits-${pkg.days}`}>
                      {pkg.credits} <span className="text-sm font-normal text-muted-foreground">credits</span>
                    </div>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    <div>{pkg.days} days of boosted visibility</div>
                    {pkg.savings && (
                      <div className="text-primary font-semibold mt-1" data-testid={`text-savings-${pkg.days}`}>
                        Save {pkg.savings} credits!
                      </div>
                    )}
                    {!canAfford && (
                      <div className="text-destructive font-medium mt-1" data-testid={`text-insufficient-${pkg.days}`}>
                        Insufficient credits
                      </div>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>

          <div className="bg-muted/50 rounded-lg p-4 mb-6">
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" />
              Boost Benefits
            </h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex items-start gap-2">
                <span className="text-primary">•</span>
                <span><strong>Higher placement:</strong> Appear at the top of discovery and search results</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary">•</span>
                <span><strong>Increased exposure:</strong> Reach more readers and book clubs actively looking for new books</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary">•</span>
                <span><strong>Track performance:</strong> See detailed analytics on impressions and engagement</span>
              </li>
            </ul>
          </div>

          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={onClose}
              className="flex-1"
              data-testid="button-cancel"
            >
              Cancel
            </Button>
            <Button
              onClick={() => boostMutation.mutate(selectedPackage)}
              disabled={boostMutation.isPending || currentBalance < selectedPackage.credits}
              className="flex-1"
              data-testid="button-boost"
            >
              {boostMutation.isPending
                ? 'Processing...'
                : `Boost for ${selectedPackage.days} Days (${selectedPackage.credits} credits)`}
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
